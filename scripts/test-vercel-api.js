// اختبار يدوي لدوال Vercel: node scripts/test-vercel-api.js <username>
const http = require('http');
const checkHandler = require('../api/check');
const liveHandler = require('../api/live');

const username = process.argv[2] || 'therealadhamyy';
const port = 3900 + Math.floor(Math.random() * 90);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/api/check') return checkHandler(req, res);
  if (url.pathname === '/api/live') return liveHandler(req, res);
  res.statusCode = 404;
  res.end('not found');
});

server.listen(port, '127.0.0.1', async () => {
  console.log(`Test server on ${port}, username=${username}`);

  // 1) Live check
  await new Promise((resolve) => {
    http.get(`http://127.0.0.1:${port}/api/check?username=${encodeURIComponent(username)}`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        console.log('CHECK', res.statusCode, body);
        resolve();
      });
    }).on('error', (e) => { console.error('CHECK ERROR', e.message); resolve(); });
  });

  // 2) SSE stream — read until connected/error or 15s
  await new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/live?username=${encodeURIComponent(username)}`, (res) => {
      console.log('LIVE status', res.statusCode, res.headers['content-type']);
      let buffer = '';
      const timer = setTimeout(() => { req.destroy(); resolve(); }, 15000);
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        process.stdout.write(chunk.toString());
        if (buffer.includes('event: status') && (buffer.includes('"connected"') || buffer.includes('"error"'))) {
          clearTimeout(timer);
          req.destroy();
          resolve();
        }
      });
      res.on('end', () => { clearTimeout(timer); resolve(); });
    });
    req.on('error', () => {});
  });

  server.close();
  process.exit(0);
});
