const EventEmitter = require('events');

// Load modern tiktok-live-connector v2.5.0
let TikTokLiveConnection = null;
let SignConfig = null;

try {
  const mod = require('tiktok-live-connector');
  TikTokLiveConnection = mod.TikTokLiveConnection;
  SignConfig = mod.SignConfig;
  if (SignConfig) {
    SignConfig.basePath = 'https://api.eulerstream.com';
  }
  console.log('[TikTokConnector] ✅ tiktok-live-connector v2.5.0 initialized');
} catch (err) {
  console.error('[TikTokConnector] ❌ Failed to load connector:', err.message);
}

class TikTokConnector extends EventEmitter {
  constructor(gameState) {
    super();
    this.gameState = gameState;
    this.connection = null;
    this.currentUsername = '';
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
    this.connectionMode = 'none'; // 'direct' | 'tikfinity' | 'simulator'
    this.roomInfo = {
      roomId: null,
      viewerCount: 0,
      title: ''
    };
    this.lastError = null;
  }

  getStatus() {
    return {
      status: this.status,
      username: this.currentUsername,
      roomInfo: this.roomInfo,
      lastError: this.lastError,
      connectionMode: this.connectionMode
    };
  }

  setApiKey(key) {
    if (SignConfig && key) {
      SignConfig.apiKey = key.trim();
      console.log('[TikTokConnector] EulerStream API Key set');
    }
  }

  async connect(username) {
    if (!username || typeof username !== 'string') {
      throw new Error('يرجى إدخال اسم مستخدم تيك توك صحيح');
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    if (!cleanUsername) {
      throw new Error('اسم المستخدم فارغ');
    }

    // If already connected with the same username
    if (this.connection && this.currentUsername === cleanUsername && this.status === 'connected') {
      return this.getStatus();
    }

    await this.disconnect();

    this.currentUsername = cleanUsername;
    this.status = 'connecting';
    this.lastError = null;
    this.emit('status_change', this.getStatus());
    this.gameState.logActivity('TIKTOK_CONNECTING', `جاري محاولة الاتصال ببث @${cleanUsername}...`);

    if (!TikTokLiveConnection) {
      this.status = 'error';
      this.lastError = 'محرك الاتصال بتيك توك غير متوفر.';
      this.emit('status_change', this.getStatus());
      throw new Error(this.lastError);
    }

    // Auto-retry up to 3 times
    let lastErr = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (SignConfig) {
          SignConfig.basePath = 'https://api.eulerstream.com';
        }

        // NOTE: enableExtendedGiftInfo must be false for the free tier (avoids EulerStream Business Plan error)
        this.connection = new TikTokLiveConnection(cleanUsername, {
          processInitialData: false,
          enableExtendedGiftInfo: false,
          enableWebsocketUpgrade: true,
          requestPollingIntervalMs: 1000
        });

        this.setupListeners();

        const state = await this.connection.connect();
        this.status = 'connected';
        this.connectionMode = 'direct';

        const rId = state?.roomId || state?.room_id || 'مباشر';
        this.roomInfo = {
          roomId: rId,
          viewerCount: state?.roomInfo?.data?.user_count || 0,
          title: state?.roomInfo?.data?.title || ''
        };

        this.gameState.logActivity('TIKTOK_CONNECTED', `✅ تم الاتصال بنجاح ببث تيك توك @${cleanUsername} (غرفة: ${rId})`);
        this.emit('status_change', this.getStatus());
        return this.getStatus();
      } catch (err) {
        lastErr = err;
        console.warn(`[TikTokConnector] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    // If all retries failed
    this.status = 'error';
    this.connectionMode = 'none';
    let friendlyMsg = lastErr?.message || 'فشل الاتصال ببث تيك توك';
    const lower = (friendlyMsg || '').toLowerCase();

    if (lower.includes('offline') || lower.includes('not live') || lower.includes('ended') || lower.includes('not found')) {
      friendlyMsg = `حساب @${cleanUsername} غير متواجد في بث مباشر حالياً. افتح البث المباشر أولاً ثم اضغط اتصال!`;
    }

    this.lastError = friendlyMsg;
    this.gameState.logActivity('TIKTOK_ERROR', `❌ فشل الاتصال ببث @${cleanUsername}: ${this.lastError}`);
    this.emit('status_change', this.getStatus());
    throw new Error(this.lastError);
  }

  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.disconnect();
      } catch (e) {}
      this.connection = null;
    }
    const wasConnected = this.status === 'connected';
    this.status = 'disconnected';
    this.connectionMode = 'none';
    this.roomInfo = { roomId: null, viewerCount: 0, title: '' };
    if (wasConnected) {
      this.gameState.logActivity('TIKTOK_DISCONNECTED', `تم قطع الاتصال ببث تيك توك @${this.currentUsername}`);
    }
    this.emit('status_change', this.getStatus());
  }

  setupListeners() {
    if (!this.connection) return;

    // Chat comments
    this.connection.on('chat', (data) => {
      try {
        const u = data.user || {};
        const uniqueId = u.displayId || u.uniqueId || data.uniqueId || 'user_' + (u.id || 'anon');
        const nickname = u.nickname || data.nickname || uniqueId;
        const commentText = data.content || data.comment || '';
        const avatar = u.avatarThumb?.urlList?.[0] || data.profilePictureUrl || '';

        const commentData = {
          userId: u.id || data.userId || uniqueId,
          uniqueId: uniqueId,
          nickname: nickname,
          commentText: commentText,
          profilePictureUrl: avatar
        };

        this.emit('chat', commentData);
        this.gameState.handleChatComment(commentData);
      } catch (err) {
        console.error('[TikTokConnector] Chat handling error:', err);
      }
    });

    // Gift Events
    this.connection.on('gift', (data) => {
      try {
        const isCombo = data.giftType === 1 || data.gift?.type === 1;
        const repeatEnd = data.repeatEnd !== undefined ? data.repeatEnd : true;
        if (isCombo && !repeatEnd) {
          return;
        }

        const u = data.user || {};
        const uniqueId = u.displayId || u.uniqueId || data.uniqueId || 'user_' + (u.id || 'anon');
        const nickname = u.nickname || data.nickname || uniqueId;
        const avatar = u.avatarThumb?.urlList?.[0] || data.profilePictureUrl || '';

        const g = data.gift || {};
        const giftName = g.name || data.giftName || data.describe || 'هدية';
        const diamonds = g.diamondCount || data.diamondCount || 1;
        const repeatCount = data.repeatCount || data.groupCount || 1;

        const giftEvent = {
          userId: u.id || data.userId || uniqueId,
          uniqueId: uniqueId,
          nickname: nickname,
          profilePictureUrl: avatar,
          giftId: data.giftId || g.id,
          giftName: giftName,
          diamonds: diamonds,
          repeatCount: repeatCount,
          eventId: `gift_${data.common?.msgId || data.msgId || Date.now()}_${uniqueId}`
        };

        this.emit('gift', giftEvent);
        this.dispatchGift(giftEvent);
      } catch (err) {
        console.error('[TikTokConnector] Gift handling error:', err);
      }
    });

    // Room User / Viewer count update
    this.connection.on('roomUser', (data) => {
      try {
        const count = data.viewerCount ?? data.total ?? data.userCount;
        if (count !== undefined) {
          this.roomInfo.viewerCount = count;
          this.emit('room_info', this.roomInfo);
        }
      } catch (e) {}
    });

    // Disconnected
    this.connection.on('disconnected', () => {
      this.status = 'disconnected';
      this.connectionMode = 'none';
      this.gameState.logActivity('TIKTOK_DISCONNECTED', `انقطع الاتصال ببث @${this.currentUsername}`);
      this.emit('status_change', this.getStatus());
    });

    // Stream ended
    this.connection.on('streamEnd', () => {
      this.status = 'disconnected';
      this.connectionMode = 'none';
      this.gameState.logActivity('TIKTOK_STREAM_END', `انتهى بث @${this.currentUsername}`);
      this.emit('status_change', this.getStatus());
    });
  }

  dispatchGift(giftEvent) {
    const totalDiamonds = (giftEvent.diamonds || 1) * (giftEvent.repeatCount || 1);
    const gifts = this.gameState.settings.gifts;

    this.gameState.logActivity('GIFT_RECEIVED', `🎁 ${giftEvent.nickname} أرسل [${giftEvent.giftName}] (${totalDiamonds} عملة)`, {
      gift: giftEvent
    });

    // 1. If currently in DEFENDING state, check if this is the target defending themselves
    if (this.gameState.state === 'DEFENDING') {
      const handled = this.gameState.handleDefenseGift({
        userId: giftEvent.userId,
        uniqueId: giftEvent.uniqueId,
        giftName: giftEvent.giftName,
        diamonds: giftEvent.diamonds,
        repeatCount: giftEvent.repeatCount,
        eventId: giftEvent.eventId
      });
      if (handled) return;
    }

    // 2. If in FINAL_ROUND state
    if (this.gameState.state === 'FINAL_ROUND') {
      const handled = this.gameState.handleFinalRoundGift({
        userId: giftEvent.userId,
        uniqueId: giftEvent.uniqueId,
        nickname: giftEvent.nickname,
        coins: totalDiamonds
      });
      if (handled) return;
    }

    // 3. Rejoin check: if sender is eliminated and sent rejoin gift or equivalent coins
    const player = this.gameState.getPlayerById(giftEvent.userId || giftEvent.uniqueId);
    if (player && player.status === 'eliminated') {
      if (totalDiamonds >= (gifts.rejoin.minCoins || 5)) {
        this.gameState.handleRejoin({
          userId: giftEvent.userId,
          uniqueId: giftEvent.uniqueId,
          nickname: giftEvent.nickname,
          profilePictureUrl: giftEvent.profilePictureUrl,
          coins: totalDiamonds,
          eventId: giftEvent.eventId
        });
        return;
      }
    }

    // 4. Help / Rescue check: if coins match help gift
    if (totalDiamonds >= (gifts.help.minCoins || 16)) {
      this.gameState.handleHelp({
        helperUserId: giftEvent.userId,
        helperName: giftEvent.nickname,
        coins: totalDiamonds,
        eventId: giftEvent.eventId
      });
      return;
    }

    // 5. Shield check: if coins match shield gift
    if (totalDiamonds >= (gifts.shield.minCoins || 30)) {
      this.gameState.handleShieldGift({
        userId: giftEvent.userId,
        uniqueId: giftEvent.uniqueId,
        coins: totalDiamonds,
        eventId: giftEvent.eventId
      });
      return;
    }

    // 6. Winner Challenge check: if in FINISHED state with a winner and someone sends challenge gift
    if (this.gameState.state === 'FINISHED' && this.gameState.winner) {
      if (totalDiamonds >= (gifts.winnerChallenge.minCoins || 100)) {
        const challenger = player || {
          id: giftEvent.userId,
          nickname: giftEvent.nickname,
          uniqueId: giftEvent.uniqueId,
          profilePictureUrl: giftEvent.profilePictureUrl,
          playerNumber: 999
        };
        this.gameState.startWinnerChallenge(challenger);
        return;
      }
    }
  }
}

module.exports = TikTokConnector;
