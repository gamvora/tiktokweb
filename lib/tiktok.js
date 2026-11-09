// ═══════════════════════════════════════════════════════════════
// أدوات TikTok المشتركة لدوال Vercel
// تعمل بدون أي مفاتيح API — تستخدم خدمة التوقيع المجانية في
// tiktok-live-connector.
// ═══════════════════════════════════════════════════════════════

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 64);
}

function friendlyError(error) {
  const message = String(error?.message || error || 'تعذر الاتصال');
  const lower = message.toLowerCase();

  if (lower.includes('offline') || lower.includes('not live') || lower.includes('is not live')) {
    return 'الحساب ليس على الهواء حالياً. تأكد من فتح البث المباشر ثم حاول مرة أخرى.';
  }
  if (lower.includes('not found') || lower.includes('user_not_found') || lower.includes('could not find')) {
    return 'لم يتم العثور على هذا الحساب. تأكد من كتابة اسم المستخدم بشكل صحيح.';
  }
  if (lower.includes('ended')) {
    return 'انتهى البث المباشر. افتح بثاً جديداً ثم أعد المحاولة.';
  }
  if (lower.includes('rate') || lower.includes('too many') || lower.includes('429')) {
    return 'خدمة تيك توك مشغولة حالياً. انتظر قليلاً ثم حاول مرة أخرى.';
  }
  if (lower.includes('sign') || lower.includes('euler') || lower.includes('unauthorized')) {
    return 'تعذر الاتصال بخدمة تيك توك. حاول مرة أخرى بعد لحظات.';
  }
  return message;
}

let connectorPromise = null;
function loadConnector() {
  if (!connectorPromise) {
    connectorPromise = import('tiktok-live-connector').then((mod) => mod.TikTokLiveConnection);
  }
  return connectorPromise;
}

function createConnection(TikTokLiveConnection, username) {
  return new TikTokLiveConnection(username, {
    processInitialData: false,
    enableExtendedGiftInfo: false
  });
}

function normalizeChat(data) {
  const user = data?.user || {};
  const uniqueId =
    user.displayId || user.uniqueId || data?.uniqueId || `user_${user.id || 'anon'}`;
  return {
    userId: user.id || data?.userId || uniqueId,
    uniqueId,
    nickname: user.nickname || data?.nickname || uniqueId,
    commentText: data?.content || data?.comment || '',
    profilePictureUrl: user.avatarThumb?.urlList?.[0] || data?.profilePictureUrl || ''
  };
}

function normalizeGift(data) {
  const user = data?.user || {};
  const uniqueId =
    user.displayId || user.uniqueId || data?.uniqueId || `user_${user.id || 'anon'}`;
  const gift = data?.gift || {};
  return {
    userId: user.id || data?.userId || uniqueId,
    uniqueId,
    nickname: user.nickname || data?.nickname || uniqueId,
    profilePictureUrl: user.avatarThumb?.urlList?.[0] || data?.profilePictureUrl || '',
    giftId: data?.giftId || gift.id || gift.giftId || null,
    giftName: gift.name || data?.giftName || data?.describe || 'هدية',
    diamonds: gift.diamondCount || data?.diamondCount || 1,
    repeatCount: data?.repeatCount || data?.groupCount || 1,
    eventId: `gift_${data?.common?.msgId || data?.msgId || Date.now()}_${uniqueId}`
  };
}

function isCompletedGift(data) {
  const isCombo = data?.giftType === 1 || data?.gift?.type === 1;
  const repeatEnd = data?.repeatEnd !== undefined ? data.repeatEnd : true;
  return !isCombo || repeatEnd;
}

async function withTimeout(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label || 'انتهت مهلة الاتصال')), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function readUsername(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    return normalizeUsername(url.searchParams.get('username') || url.searchParams.get('user') || '');
  } catch (e) {
    return '';
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(body);
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = {
  normalizeUsername,
  friendlyError,
  loadConnector,
  createConnection,
  normalizeChat,
  normalizeGift,
  isCompletedGift,
  withTimeout,
  readUsername,
  sendJson,
  applyCors
};
