const express = require('express');

function createTikFinityRouter(gameState, tiktokConnector) {
  const router = express.Router();

  // POST /api/tikfinity/webhook
  router.post('/webhook', (req, res) => {
    try {
      const payload = req.body || {};
      const data = payload.data || {};
      const eventType = (payload.event || payload.type || payload.action || data.event || '').toLowerCase();

      // Extract user info from top-level or data object or nested user
      const user = payload.user || data.user || {};
      const uniqueId = data.uniqueId || data.user_name || data.username || payload.uniqueId || payload.user_name || payload.username || user.uniqueId || user.username || 'unknown';
      const userId = data.userId || data.user_id || payload.userId || payload.user_id || user.userId || user.id || uniqueId;
      const nickname = data.nickname || data.user_nickname || payload.nickname || payload.user_nickname || user.nickname || uniqueId;
      const profilePictureUrl = data.profilePictureUrl || data.avatar || payload.profilePictureUrl || payload.avatar || user.profilePictureUrl || user.avatar;

      // Extract comment
      const commentText = data.comment || data.message || data.text || payload.comment || payload.message || payload.text || '';

      // Extract gift
      const gift = payload.gift || data.gift || {};
      const giftName = data.giftName || data.gift_name || payload.giftName || payload.gift_name || gift.name || gift.giftName;
      const diamonds = parseInt(data.diamonds || data.coins || data.coinValue || payload.diamonds || payload.coins || payload.coinValue || gift.diamondCount || gift.coins || 1, 10);
      const repeatCount = parseInt(data.repeatCount || data.count || payload.repeatCount || payload.count || gift.repeatCount || 1, 10);
      const eventId = data.eventId || payload.eventId || payload.id || `tf_${Date.now()}_${Math.random()}`;

      // Handle comment events
      if (commentText || eventType.includes('chat') || eventType.includes('comment')) {
        gameState.handleChatComment({
          userId,
          uniqueId,
          nickname,
          commentText,
          profilePictureUrl
        });
      }

      // Handle gift events
      if (giftName || eventType.includes('gift')) {
        tiktokConnector.dispatchGift({
          userId,
          uniqueId,
          nickname,
          profilePictureUrl,
          giftName: giftName || 'Gift',
          diamonds,
          repeatCount,
          eventId
        });
      }

      res.json({ success: true, processed: true, event: eventType || 'action' });
    } catch (err) {
      console.error('[TikFinityWebhook] Error handling webhook:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // GET /api/tikfinity/status
  router.get('/status', (req, res) => {
    res.json({
      status: 'active',
      webhookUrl: '/api/tikfinity/webhook',
      supportedEvents: ['comment', 'gift', 'join']
    });
  });

  return router;
}

module.exports = createTikFinityRouter;
