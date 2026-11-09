// اختبار شامل لنقاط HTTP والملفات الثابتة
// يشغّل الخادم على منفذ مؤقت ومجلد بيانات مؤقت حتى لا يلمس بياناتك الحقيقية.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = parseInt(process.env.TEST_PORT, 10) || (3200 + Math.floor(Math.random() * 500));
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-roulette-http-'));

function request(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}${urlPath}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('request timeout')));
  });
}

async function waitForHealth(maxMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await request('/api/health');
      if (res.statusCode === 200) return res;
    } catch (e) {
      // الخادم لم يجهز بعد
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('انتهت مهلة انتظار جاهزية الخادم');
}

async function check(urlPath, validate) {
  const res = await request(urlPath);
  console.log(`📡 GET ${urlPath} -> ${res.statusCode} (${res.body.length} bytes)`);
  if (res.statusCode !== 200) {
    throw new Error(`${urlPath} أعاد الحالة ${res.statusCode}`);
  }
  if (validate) validate(res);
  return res;
}

async function testHttpEndpoints() {
  console.log(`Testing HTTP Endpoints on ${BASE} ...`);

  const serverProcess = spawn(process.execPath, ['server/index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(PORT), DATA_DIR }
  });

  let exitCode = 0;

  try {
    await waitForHealth();

    // صفحة البث
    await check('/', (res) => {
      if (!/روليت|Roulette/i.test(res.body)) throw new Error('الصفحة الرئيسية لا تحتوي على محتوى اللعبة');
    });
    await check('/overlay');
    await check('/admin', (res) => {
      if (!/لوحة تحكم|Admin/i.test(res.body)) throw new Error('لوحة التحكم لا تحتوي على المحتوى المتوقع');
    });

    // الملفات الثابتة
    await check('/css/overlay.css', (res) => {
      if (!/text\/css/.test(res.headers['content-type'] || '')) throw new Error('نوع محتوى CSS غير صحيح');
    });
    await check('/css/admin.css');
    await check('/js/overlay.js', (res) => {
      if (!/javascript/.test(res.headers['content-type'] || '')) throw new Error('نوع محتوى JS غير صحيح');
    });
    await check('/js/admin.js');
    await check('/js/backend.js');
    await check('/js/roulette.js');
    await check('/js/audio.js');

    // واجهات API
    await check('/api/health', (res) => {
      const json = JSON.parse(res.body);
      if (json.ok !== true) throw new Error('health لا يعيد ok=true');
    });
    await check('/api/state', (res) => {
      const json = JSON.parse(res.body);
      if (!json.snapshot || !Array.isArray(json.players)) throw new Error('state لا يعيد snapshot/players');
    });
    await check('/api/gifts/catalog', (res) => {
      const json = JSON.parse(res.body);
      if (!Array.isArray(json.gifts) || json.gifts.length === 0) throw new Error('كتالوج الهدايا فارغ');
    });
    await check('/api/tikfinity/status', (res) => {
      const json = JSON.parse(res.body);
      if (json.status !== 'active') throw new Error('TikFinity status غير نشط');
    });

    // إعدادات لا تُسرّب مفاتيح API
    await check('/api/state', (res) => {
      const json = JSON.parse(res.body);
      const settings = json.snapshot.settings || {};
      if ('eulerApiKey' in settings || 'tiktokApiKey' in settings) {
        throw new Error('تم تسريب مفاتيح API في snapshot');
      }
    });

    console.log('✅ ALL HTTP ENDPOINTS AND STATIC ASSETS ARE OK (200)!');
  } catch (err) {
    console.error('❌ Endpoint test failed:', err.message);
    exitCode = 1;
  } finally {
    try { serverProcess.kill('SIGTERM'); } catch (e) {}
    await new Promise((r) => setTimeout(r, 800));
    try { serverProcess.kill(); } catch (e) {}
    try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (e) {}
    process.exit(exitCode);
  }
}

testHttpEndpoints();
