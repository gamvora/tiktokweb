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
    this.status = 'disconnected';
    this.connectionMode = 'none'; // 'direct' | 'tikfinity' | 'simulator'
    this.roomInfo = { roomId: null, viewerCount: 0, title: '' };
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

  // Also aliased as setEulerApiKey for API route compat
  setEulerApiKey(key) {
    this.setApiKey(key);
  }

  async connect(username, apiKey) {
    if (!username || typeof username !== 'string') {
      throw new Error('يرجى إدخال اسم مستخدم تيك توك صحيح');
    }

    const cleanUsername = username.replace(/^@/, '').trim();
    if (!cleanUsername) throw new Error('اسم المستخدم فارغ');

    // If already connected with the same username
    if (this.connection && this.currentUsername === cleanUsername && this.status === 'connected') {
      return this.getStatus();
    }

    await this.disconnect();

    if (apiKey) this.setApiKey(apiKey);

    this.currentUsername = cleanUsername;
    this.status = 'connecting';
    this.lastError = null;
    this.emit('status_change', this.getStatus());
    this.gameState.logActivity('TIKTOK_CONNECTING', `جاري محاولة الاتصال ببث @${cleanUsername}...`);

    if (!TikTokLiveConnection) {
      this.status = 'error';
      this.lastError = 'محرك الاتصال بتيك توك غير متوفر على هذا الخادم.';
      this.emit('status_change', this.getStatus());
      throw new Error(this.lastError);
    }

    let lastErr = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (SignConfig) {
          SignConfig.basePath = 'https://api.eulerstream.com';
        }

        this.connection = new TikTokLiveConnection(cleanUsername, {
          processInitialData: false,
          enableExtendedGiftInfo: false
        });

        this.setupListeners();

        const state = await this.connection.connect();
        this.status = 'connected';
        this.connectionMode = 'direct';

        const rId = state?.roomId || state?.room_id || 'مباشر';
        this.roomInfo = {
          roomId: rId,
          viewerCount: state?.roomInfo?.data?.user_count || 0,
          title: state?.roomInfo?.data?.title || `بث @${cleanUsername}`
        };

        this.gameState.logActivity('TIKTOK_CONNECTED', `✅ تم الاتصال بنجاح ببث تيك توك @${cleanUsername} (غرفة: ${rId})`);
        this.emit('status_change', this.getStatus());
        return this.getStatus();
      } catch (err) {
        lastErr = err;
        console.warn(`[TikTokConnector] Attempt ${attempt} failed: ${err.message}`);
        // تنظيف المحاولة الفاشلة حتى لا تبقى اتصالات معلّقة
        if (this.connection) {
          try { await this.connection.disconnect(); } catch (e) {}
          this.connection = null;
        }
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }

    this.status = 'error';
    this.connectionMode = 'none';
    let friendlyMsg = lastErr?.message || 'فشل الاتصال ببث تيك توك';
    const lower = (friendlyMsg || '').toLowerCase();

    if (lower.includes('offline') || lower.includes('not live') || lower.includes('ended') || lower.includes('not found')) {
      friendlyMsg = `حساب @${cleanUsername} غير متواجد في بث مباشر حالياً. افتح البث المباشر أولاً ثم اضغط اتصال!`;
    } else if (lower.includes('sign') || lower.includes('eulerstream') || lower.includes('api key') || lower.includes('unauthorized')) {
      friendlyMsg = `خطأ في مفتاح API. يمكنك استخدام وضع TikFinity بدلاً من الربط المباشر.`;
    }

    this.lastError = friendlyMsg;
    this.gameState.logActivity('TIKTOK_ERROR', `❌ فشل الاتصال ببث @${cleanUsername}: ${this.lastError}`);
    this.emit('status_change', this.getStatus());
    throw new Error(this.lastError);
  }

  // TikFinity mode: marks as "connected via webhook" - events arrive via HTTP webhook
  connectViaTikFinity(username) {
    this.currentUsername = username || 'tikfinity';
    this.status = 'connected';
    this.connectionMode = 'tikfinity';
    this.roomInfo = { roomId: 'tikfinity', viewerCount: 0, title: `ربط TikFinity لـ @${username}` };
    this.lastError = null;
    this.gameState.logActivity('TIKFINITY_CONNECTED', `✅ وضع TikFinity نشط - في انتظار أحداث الـ Webhook من @${username}`);
    this.emit('status_change', this.getStatus());
    return this.getStatus();
  }

  // Simulator mode
  connectSimulator() {
    this.currentUsername = 'simulator';
    this.status = 'connected';
    this.connectionMode = 'simulator';
    this.roomInfo = { roomId: 'sim', viewerCount: 999, title: 'وضع المحاكي التجريبي' };
    this.lastError = null;
    this.gameState.logActivity('SIMULATOR_CONNECTED', '✅ وضع المحاكي التجريبي نشط');
    this.emit('status_change', this.getStatus());
    return this.getStatus();
  }

  async disconnect() {
    if (this.connection) {
      try { await this.connection.disconnect(); } catch (e) {}
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

    this.connection.on('chat', (data) => {
      try {
        const u = data.user || {};
        const uniqueId = u.displayId || u.uniqueId || data.uniqueId || 'user_' + (u.id || 'anon');
        const nickname = u.nickname || data.nickname || uniqueId;
        const commentText = data.content || data.comment || '';
        const avatar = u.avatarThumb?.urlList?.[0] || data.profilePictureUrl || '';

        const commentData = {
          userId: u.id || data.userId || uniqueId,
          uniqueId,
          nickname,
          commentText,
          profilePictureUrl: avatar
        };

        this.emit('chat', commentData);
        this.gameState.handleChatComment(commentData);
      } catch (err) {
        console.error('[TikTokConnector] Chat handling error:', err);
      }
    });

    this.connection.on('gift', (data) => {
      try {
        const isCombo = data.giftType === 1 || data.gift?.type === 1;
        const repeatEnd = data.repeatEnd !== undefined ? data.repeatEnd : true;
        if (isCombo && !repeatEnd) return;

        const u = data.user || {};
        const uniqueId = u.displayId || u.uniqueId || data.uniqueId || 'user_' + (u.id || 'anon');
        const nickname = u.nickname || data.nickname || uniqueId;
        const avatar = u.avatarThumb?.urlList?.[0] || data.profilePictureUrl || '';

        const g = data.gift || {};
        const giftName = g.name || data.giftName || data.describe || 'هدية';
        const giftId = data.giftId || g.id || data.gift?.id || null;
        const diamonds = g.diamondCount || data.diamondCount || 1;
        const repeatCount = data.repeatCount || data.groupCount || 1;

        const giftEvent = {
          userId: u.id || data.userId || uniqueId,
          uniqueId,
          nickname,
          profilePictureUrl: avatar,
          giftId,
          giftName,
          diamonds,
          repeatCount,
          eventId: `gift_${data.common?.msgId || data.msgId || Date.now()}_${uniqueId}`
        };

        this.emit('gift', giftEvent);
        this.dispatchGift(giftEvent);
      } catch (err) {
        console.error('[TikTokConnector] Gift handling error:', err);
      }
    });

    this.connection.on('roomUser', (data) => {
      try {
        const count = data.viewerCount ?? data.total ?? data.userCount;
        if (count !== undefined) {
          this.roomInfo.viewerCount = count;
          this.emit('room_info', this.roomInfo);
        }
      } catch (e) {}
    });

    this.connection.on('disconnected', () => {
      this.status = 'disconnected';
      this.connectionMode = 'none';
      this.gameState.logActivity('TIKTOK_DISCONNECTED', `انقطع الاتصال ببث @${this.currentUsername}`);
      this.emit('status_change', this.getStatus());
    });

    this.connection.on('streamEnd', () => {
      this.status = 'disconnected';
      this.connectionMode = 'none';
      this.gameState.logActivity('TIKTOK_STREAM_END', `انتهى بث @${this.currentUsername}`);
      this.emit('status_change', this.getStatus());
    });
  }

  dispatchGift(giftEvent) {
    const totalDiamonds = (giftEvent.diamonds || 1) * (giftEvent.repeatCount || 1);
    const gifts = this.gameState.settings.gifts || {};
    const state = this.gameState.state;
    const player = this.gameState.getPlayerById(giftEvent.userId || giftEvent.uniqueId);

    const matches = (conf) => this.gameState.giftMatchesCategory(giftEvent, conf);
    const giftMeta = {
      giftId: giftEvent.giftId,
      giftName: giftEvent.giftName,
      eventId: giftEvent.eventId
    };

    this.gameState.logActivity('GIFT_RECEIVED', `🎁 ${giftEvent.nickname} أرسل [${giftEvent.giftName}] (${totalDiamonds} عملة)`, { gift: giftEvent });

    // 1) الدفاع عن النفس: فقط الهدية المحددة للدفاع ومن اللاعب المستهدف
    if (state === 'DEFENDING' && this.gameState.targetPlayer && matches(gifts.defense)) {
      const handled = this.gameState.handleDefenseGift({
        userId: giftEvent.userId,
        uniqueId: giftEvent.uniqueId,
        giftId: giftEvent.giftId,
        giftName: giftEvent.giftName,
        diamonds: giftEvent.diamonds,
        repeatCount: giftEvent.repeatCount,
        eventId: giftEvent.eventId
      });
      if (handled) return;
    }

    // 2) حسم الجولة النهائية
    if (state === 'FINAL_ROUND' && matches(gifts.finalRound)) {
      const handled = this.gameState.handleFinalRoundGift({
        userId: giftEvent.userId,
        uniqueId: giftEvent.uniqueId,
        nickname: giftEvent.nickname,
        giftId: giftEvent.giftId,
        giftName: giftEvent.giftName,
        coins: totalDiamonds,
        eventId: giftEvent.eventId
      });
      if (handled) return;
    }

    // 3) تحدي الفائز بعد انتهاء اللعبة
    if (state === 'FINISHED' && this.gameState.winner && matches(gifts.winnerChallenge)) {
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

    // 4) عودة اللاعب المستبعد
    if (player && player.status === 'eliminated' && matches(gifts.rejoin)) {
      const handled = this.gameState.handleRejoin({
        userId: giftEvent.userId,
        uniqueId: giftEvent.uniqueId,
        nickname: giftEvent.nickname,
        profilePictureUrl: giftEvent.profilePictureUrl,
        giftId: giftEvent.giftId,
        giftName: giftEvent.giftName,
        coins: totalDiamonds,
        eventId: giftEvent.eventId
      });
      if (handled) return;
    }

    // 5) الحصانة / الدرع
    if (matches(gifts.shield)) {
      const handled = this.gameState.handleShieldGift({
        userId: giftEvent.userId,
        uniqueId: giftEvent.uniqueId,
        giftId: giftEvent.giftId,
        giftName: giftEvent.giftName,
        coins: totalDiamonds,
        eventId: giftEvent.eventId
      });
      if (handled) return;
    }

    // 6) المساعدة / الإنقاذ
    if (matches(gifts.help)) {
      this.gameState.handleHelp({
        helperUserId: giftEvent.userId,
        helperName: giftEvent.nickname,
        giftId: giftEvent.giftId,
        giftName: giftEvent.giftName,
        coins: totalDiamonds,
        eventId: giftEvent.eventId
      });
    }
  }
}

module.exports = TikTokConnector;
