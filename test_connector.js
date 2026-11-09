// فحص توافق مكتبة tiktok-live-connector (الإصدار v2)
// لا يقوم بأي اتصال شبكي — يتحقق فقط من وجود الواجهة الصحيحة.
const mod = require('tiktok-live-connector');

const { TikTokLiveConnection, SignConfig } = mod;

console.log('tiktok-live-connector version:', mod.VERSION || '(unknown)');
console.log('TikTokLiveConnection:', typeof TikTokLiveConnection);
console.log('SignConfig:', typeof SignConfig);

let failed = false;

if (typeof TikTokLiveConnection !== 'function') {
  console.error('❌ TikTokLiveConnection غير متوفر — الإصدار المثبت لا يطابق v2');
  failed = true;
}

if (!failed) {
  const conn = new TikTokLiveConnection('testuser', {
    processInitialData: false,
    enableExtendedGiftInfo: false
  });

  console.log('✅ تم إنشاء الاتصال بنجاح');
  console.log('connect:', typeof conn.connect);
  console.log('disconnect:', typeof conn.disconnect);
  console.log('on:', typeof conn.on);

  if (typeof conn.connect !== 'function' || typeof conn.disconnect !== 'function') {
    console.error('❌ واجهة الاتصال غير مكتملة');
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('✅ Connector API v2 OK');
process.exit(0);
