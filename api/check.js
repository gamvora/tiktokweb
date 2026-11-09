// GET /api/check?username=... — يتحقق إن كان الحساب على الهواء الآن
const {
  loadConnector,
  createConnection,
  friendlyError,
  withTimeout,
  readUsername,
  sendJson,
  applyCors
} = require('../lib/tiktok');

module.exports = async function handler(req, res) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const username = readUsername(req);
  if (!username) {
    return sendJson(res, 400, { live: false, error: 'اكتب اسم مستخدم تيك توك أولاً.' });
  }

  let connection = null;
  try {
    const TikTokLiveConnection = await loadConnector();
    connection = createConnection(TikTokLiveConnection, username);

    const state = await withTimeout(connection.connect(), 25000, 'انتهت مهلة التحقق من البث');

    const roomId = state?.roomId || state?.room_id || null;
    const roomInfo = state?.roomInfo?.data || state?.roomInfo || {};
    const viewerCount = roomInfo.user_count ?? roomInfo.userCount ?? 0;
    const title = roomInfo.title || '';

    return sendJson(res, 200, {
      live: true,
      username,
      roomId,
      viewerCount,
      title
    });
  } catch (error) {
    return sendJson(res, 200, {
      live: false,
      username,
      error: friendlyError(error)
    });
  } finally {
    if (connection) {
      try {
        await connection.disconnect();
      } catch (e) {
        // ignore
      }
    }
  }
};
