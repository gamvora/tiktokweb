// GET /api/live?username=... — بث أحداث TikTok Live عبر Server-Sent Events
const {
  loadConnector,
  createConnection,
  normalizeChat,
  normalizeGift,
  isCompletedGift,
  friendlyError,
  readUsername,
  sendJson,
  applyCors
} = require('../lib/tiktok');

async function handler(req, res) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  const username = readUsername(req);
  if (!username) {
    return sendJson(res, 400, { error: 'اكتب اسم مستخدم تيك توك أولاً.' });
  }

  // ── Server-Sent Events headers ──────────────────────────────
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  let closed = false;
  let connection = null;

  const write = (chunk) => {
    if (closed) return;
    try {
      res.write(chunk);
    } catch (e) {
      closed = true;
    }
  };

  const send = (event, data) => {
    write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  write(': connected\n\n');

  const heartbeat = setInterval(() => write(': ping\n\n'), 15000);
  if (heartbeat.unref) heartbeat.unref();

  let finished = false;
  const cleanup = async (notify = false) => {
    if (finished) return;
    finished = true;
    clearInterval(heartbeat);
    if (notify) send('status', { status: 'disconnected', username });
    if (connection) {
      try {
        await connection.disconnect();
      } catch (e) {
        // ignore
      }
    }
    closed = true;
    try {
      res.end();
    } catch (e) {
      // ignore
    }
  };

  req.on('close', () => {
    cleanup(false);
  });
  req.on('aborted', () => {
    cleanup(false);
  });

  try {
    const TikTokLiveConnection = await loadConnector();
    if (closed) return;

    connection = createConnection(TikTokLiveConnection, username);

    connection.on('chat', (data) => {
      try {
        const chat = normalizeChat(data);
        if (chat.commentText) send('chat', chat);
      } catch (e) {
        // ignore malformed event
      }
    });

    connection.on('gift', (data) => {
      try {
        if (!isCompletedGift(data)) return;
        send('gift', normalizeGift(data));
      } catch (e) {
        // ignore malformed event
      }
    });

    connection.on('roomUser', (data) => {
      try {
        const viewerCount = data?.viewerCount ?? data?.total ?? data?.userCount;
        if (viewerCount !== undefined) send('room_info', { viewerCount });
      } catch (e) {
        // ignore
      }
    });

    connection.on('streamEnd', () => {
      send('status', { status: 'ended', username, error: 'انتهى البث المباشر.' });
      cleanup(false);
    });

    connection.on('disconnected', () => {
      send('status', { status: 'disconnected', username });
      cleanup(false);
    });

    const state = await connection.connect();
    if (closed) {
      cleanup(false);
      return;
    }

    const roomId = state?.roomId || state?.room_id || null;
    const roomInfo = state?.roomInfo?.data || state?.roomInfo || {};
    send('status', {
      status: 'connected',
      username,
      roomId,
      viewerCount: roomInfo.user_count ?? roomInfo.userCount ?? 0,
      title: roomInfo.title || ''
    });
  } catch (error) {
    send('status', {
      status: 'error',
      username,
      error: friendlyError(error)
    });
    cleanup(false);
  }
}

module.exports = handler;
module.exports.config = {
  maxDuration: 300,
  memory: 1024
};
