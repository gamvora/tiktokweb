// Streamer Admin Dashboard Logic
document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  let stateSnapshot = null;
  let allPlayers = [];
  let settings = null;

  // DOM Elements
  const tiktokUsernameInput = document.getElementById('tiktokUsernameInput');
  const btnConnectTikTok = document.getElementById('btnConnectTikTok');
  const btnDisconnectTikTok = document.getElementById('btnDisconnectTikTok');
  const tiktokStatusText = document.getElementById('tiktokStatusText');
  const copyWebhookBtn = document.getElementById('copyWebhookBtn');
  const webhookUrlInput = document.getElementById('webhookUrlInput');

  // Controls
  const btnStartRoulette = document.getElementById('btnStartRoulette');
  const btnToggleJoin = document.getElementById('btnToggleJoin');
  const btnNextRound = document.getElementById('btnNextRound');
  const btnFinalRound = document.getElementById('btnFinalRound');
  const btnCancelElimination = document.getElementById('btnCancelElimination');
  const btnPauseTimer = document.getElementById('btnPauseTimer');
  const btnResumeTimer = document.getElementById('btnResumeTimer');
  const btnExtendTimer = document.getElementById('btnExtendTimer');
  const btnResetGame = document.getElementById('btnResetGame');

  // Simulator
  const btnMockTenPlayers = document.getElementById('btnMockTenPlayers');
  const simJoinUsername = document.getElementById('simJoinUsername');
  const simJoinNickname = document.getElementById('simJoinNickname');
  const btnSimJoin = document.getElementById('btnSimJoin');
  const simCommentUser = document.getElementById('simCommentUser');
  const simCommentText = document.getElementById('simCommentText');
  const btnSimComment = document.getElementById('btnSimComment');
  const btnSimQuickTarget = document.getElementById('btnSimQuickTarget');

  // Settings
  const settingsForm = document.getElementById('settingsForm');
  const settingJoinKeyword = document.getElementById('settingJoinKeyword');
  const settingMaxPlayers = document.getElementById('settingMaxPlayers');
  const settingTargetDuration = document.getElementById('settingTargetDuration');
  const settingDefenseDuration = document.getElementById('settingDefenseDuration');
  const settingTimeoutBehavior = document.getElementById('settingTimeoutBehavior');
  const settingDefMinCoins = document.getElementById('settingDefMinCoins');
  const settingRejoinMinCoins = document.getElementById('settingRejoinMinCoins');
  const settingHelpMinCoins = document.getElementById('settingHelpMinCoins');
  const settingShieldMinCoins = document.getElementById('settingShieldMinCoins');

  // Player Management
  const playersTableBody = document.getElementById('playersTableBody');
  const addPlayerForm = document.getElementById('addPlayerForm');
  const addNickname = document.getElementById('addNickname');
  const addUniqueId = document.getElementById('addUniqueId');
  const addPlayerNumber = document.getElementById('addPlayerNumber');

  // Logs
  const logsContainer = document.getElementById('logsContainer');
  const btnClearLogs = document.getElementById('btnClearLogs');

  // Set Webhook URL
  if (webhookUrlInput) {
    webhookUrlInput.value = `http://localhost:3001/api/tikfinity/webhook`;
  }
  if (copyWebhookBtn) {
    copyWebhookBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(webhookUrlInput.value);
      alert('تم نسخ رابط TikFinity Webhook!');
    });
  }

  // -------------------------------------------------------------
  // Socket Synchronization
  // -------------------------------------------------------------

  socket.on('init_sync', (data) => {
    stateSnapshot = data.snapshot;
    allPlayers = data.players || [];
    settings = data.snapshot.settings;
    updateUI();
    if (data.tiktokStatus) updateTikTokStatus(data.tiktokStatus);
  });

  // Offline / GitHub Pages fallback for Admin Panel
  setTimeout(() => {
    if (!stateSnapshot) {
      stateSnapshot = {
        roundNumber: 1,
        state: 'WAITING_FOR_PLAYERS',
        chosenPlayer: null,
        targetPlayer: null,
        winner: null,
        settings: {
          joinKeyword: 'تم',
          isJoinOpen: true,
          maxPlayers: 50,
          timers: { targetSelectDuration: 20, defenseDuration: 30 },
          timeoutBehavior: 'eliminate_target',
          gifts: {
            defense: { giftName: 'وردة', giftId: 'rose', minCoins: 1 },
            shield: { giftName: 'نظارات شمسية', giftId: 'sunglasses', minCoins: 199 },
            rejoin: { giftName: 'قلب الحب', giftId: 'heart', minCoins: 49 },
            finalRound: { giftName: 'صاروخ', giftId: 'rocket', minCoins: 4888 }
          },
          wheelConfig: {
            theme: 'neon',
            spinDuration: 5000,
            showPlayerAvatars: true,
            showPlayerNames: true
          }
        }
      };
      allPlayers = [
        { id: '1', playerNumber: 1, nickname: 'محمد 👑', uniqueId: 'mohammed', status: 'active', hasShield: false, coins: 0, killsCount: 0, profilePictureUrl: 'assets/gifts/lion.png' },
        { id: '2', playerNumber: 2, nickname: 'سارة ✨', uniqueId: 'sara', status: 'immune', hasShield: true, coins: 200, killsCount: 0, profilePictureUrl: 'assets/gifts/heart.png' },
        { id: '3', playerNumber: 3, nickname: 'أحمد ⚡', uniqueId: 'ahmed', status: 'active', hasShield: false, coins: 50, killsCount: 1, profilePictureUrl: 'assets/gifts/cap.png' },
        { id: '4', playerNumber: 4, nickname: 'خالد 🚀', uniqueId: 'khaled', status: 'active', hasShield: false, coins: 0, killsCount: 0, profilePictureUrl: 'assets/gifts/rocket.png' }
      ];
      settings = stateSnapshot.settings;
      updateUI();
      if (tiktokStatusText) {
        tiktokStatusText.innerHTML = '<span style="color: #00f2fe;">🌐 وضع المعاينة (Demo Mode)</span>';
      }
    }
  }, 400);

  socket.on('state_updated', (snapshot) => {
    stateSnapshot = snapshot;
    settings = snapshot.settings;
    updateStatusSummary();
  });

  socket.on('players_updated', (players) => {
    allPlayers = players || [];
    renderPlayersTable();
    updateCommentUserDropdown();
  });

  socket.on('settings_updated', (newSettings) => {
    settings = newSettings;
    populateSettingsForm();
    renderAdminGiftConfig();
    populateWheelConfig();
  });

  socket.on('tiktok_status', (status) => {
    updateTikTokStatus(status);
  });

  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tiktok_roulette_sync') : null;

  function saveDemoState() {
    try {
      localStorage.setItem('tiktok_demo_players', JSON.stringify(allPlayers));
      localStorage.setItem('tiktok_demo_snapshot', JSON.stringify(stateSnapshot));
    } catch (e) {}
  }

  socket.on('activity_log', (entry) => {
    appendLogEntry(entry);
  });

  // -------------------------------------------------------------
  // TikTok Connection Actions
  // -------------------------------------------------------------

  btnConnectTikTok.addEventListener('click', async () => {
    const username = tiktokUsernameInput.value.trim().replace(/^@/, '');
    if (!username) {
      alert('يرجى كتابة اسم حساب تيك توك صاحب البث');
      return;
    }

    tiktokStatusText.innerHTML = `<span style="color: #f59e0b;">⏳ جاري محاولة الاتصال بـ @${username}...</span>`;

    if (socket && socket.connected) {
      try {
        const res = await fetch('/api/tiktok/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!data.success) {
          alert('خطأ في الاتصال: ' + (data.error || 'تأكد من فتح البث المباشر واسم المستخدم'));
        }
      } catch (err) {
        alert('فشل الاتصال: ' + err.message);
      }
      return;
    }

    // Client-side / GitHub Pages Simulator Mode (Zero-Error)
    setTimeout(() => {
      const mockStatus = {
        status: 'connected',
        username: username,
        roomInfo: { title: `بث تيك توك التجريبي - @${username}`, viewerCount: Math.floor(Math.random() * 200) + 50 }
      };
      updateTikTokStatus(mockStatus);
      if (bc) bc.postMessage({ type: 'tiktok_status', status: mockStatus });
      appendLogEntry({
        timestamp: new Date().toISOString(),
        type: 'TIKTOK_CONNECTED',
        message: `🟢 تم ربط حساب تيك توك بنجاح في وضع المحاكاة: @${username}`
      });
      alert(`✅ تم ربط حساب تيك توك بنجاح في وضع المحاكاة: @${username}\n(يمكنك الآن تجربة إرسال التعليقات والهدايا واللاعبين من المحاكي بالأسفل!)`);
    }, 500);
  });

  btnDisconnectTikTok.addEventListener('click', async () => {
    if (socket && socket.connected) {
      await fetch('/api/tiktok/disconnect', { method: 'POST' });
    }
    const mockStatus = { status: 'disconnected', username: null };
    updateTikTokStatus(mockStatus);
    if (bc) bc.postMessage({ type: 'tiktok_status', status: mockStatus });
    appendLogEntry({
      timestamp: new Date().toISOString(),
      type: 'TIKTOK_DISCONNECTED',
      message: '⚪ تم قطع الاتصال بالبث'
    });
  });

  function updateTikTokStatus(status) {
    if (!status || typeof status !== 'object') {
      tiktokStatusText.innerHTML = `<span style="color: #9ca3af;">⚪ غير متصل بالبث</span>`;
      return;
    }

    if (status.username && !tiktokUsernameInput.value) {
      tiktokUsernameInput.value = status.username;
    }

    if (status.status === 'connected') {
      const viewers = status.roomInfo?.viewerCount ? ` | المشاهدين: ${status.roomInfo.viewerCount} 👁️` : '';
      tiktokStatusText.innerHTML = `<span style="color: #10b981;">✅ متصل بالبث المباشر (@${status.username})${viewers}</span>`;
      btnConnectTikTok.style.display = 'none';
      btnDisconnectTikTok.style.display = 'inline-flex';
    } else if (status.status === 'connecting') {
      tiktokStatusText.innerHTML = `<span style="color: #f59e0b;">⏳ جاري محاولة الاتصال بـ @${status.username}...</span>`;
    } else if (status.status === 'error') {
      tiktokStatusText.innerHTML = `<span style="color: #ef4444;">❌ خطأ: ${status.lastError || 'تعذر الاتصال'}</span>`;
      btnConnectTikTok.style.display = 'inline-flex';
      btnDisconnectTikTok.style.display = 'none';
    } else {
      tiktokStatusText.innerHTML = `<span style="color: #9ca3af;">⚪ غير متصل بالبث</span>`;
      btnConnectTikTok.style.display = 'inline-flex';
      btnDisconnectTikTok.style.display = 'none';
    }
  }

  // -------------------------------------------------------------
  // Game Control Actions
  // -------------------------------------------------------------

  btnStartRoulette.addEventListener('click', async () => {
    if (socket && socket.connected) {
      try {
        const res = await fetch('/api/control/roulette/start', { method: 'POST' });
        const data = await res.json();
        if (!data.success) {
          alert(data.reason || 'تعذر بدء الروليت');
        }
      } catch (e) {
        alert(e.message);
      }
      return;
    }

    // Client-side execution
    const active = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
    if (active.length < 2) {
      alert('يجب أن يكون هناك لاعبان نشطان على الأقل لبدء الروليت!');
      return;
    }
    const chosen = active[Math.floor(Math.random() * active.length)];
    if (stateSnapshot) {
      stateSnapshot.chosenPlayer = chosen;
      stateSnapshot.state = 'SELECTED_PLAYER';
    }
    updateStatusSummary();
    appendLogEntry({
      timestamp: new Date().toISOString(),
      type: 'ROULETTE_START',
      message: `🎡 بدأ تدوير الروليت واختيار ${chosen.nickname} (#${chosen.playerNumber})`
    });
    if (bc) bc.postMessage({ type: 'start_spin', chosenPlayer: chosen });
    alert(`🎡 تم إرسال أمر بدء الروليت لشاشة البث! تم اختيار: ${chosen.nickname}`);
  });

  btnToggleJoin.addEventListener('click', async () => {
    if (socket && socket.connected) {
      const res = await fetch('/api/control/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      btnToggleJoin.textContent = data.isJoinOpen ? '🔒 إغلاق باب الانضمام' : '🔓 فتح باب الانضمام';
      return;
    }
    if (settings) {
      settings.isJoinOpen = !settings.isJoinOpen;
      btnToggleJoin.textContent = settings.isJoinOpen ? '🔒 إغلاق باب الانضمام' : '🔓 فتح باب الانضمام';
      saveDemoState();
      if (bc) bc.postMessage({ type: 'settings_updated', settings });
      appendLogEntry({
        timestamp: new Date().toISOString(),
        type: 'JOIN_TOGGLED',
        message: settings.isJoinOpen ? '🔓 تم فتح باب الانضمام' : '🔒 تم إغلاق باب الانضمام'
      });
    }
  });

  btnNextRound.addEventListener('click', async () => {
    if (socket && socket.connected) {
      await fetch('/api/control/round/next', { method: 'POST' });
      return;
    }
    if (stateSnapshot) {
      stateSnapshot.roundNumber = (stateSnapshot.roundNumber || 1) + 1;
      stateSnapshot.chosenPlayer = null;
      stateSnapshot.targetPlayer = null;
      stateSnapshot.state = 'READY';
      updateStatusSummary();
      saveDemoState();
      if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
      appendLogEntry({
        timestamp: new Date().toISOString(),
        type: 'ROUND_NEXT',
        message: `🔄 بدأت الجولة #${stateSnapshot.roundNumber}`
      });
      alert(`🔄 بدأت الجولة #${stateSnapshot.roundNumber}`);
    }
  });

  btnFinalRound.addEventListener('click', async () => {
    if (confirm('هل تريد بدء مرحلة الحسم النهائي (Final Round) الآن؟')) {
      if (socket && socket.connected) {
        await fetch('/api/control/round/final', { method: 'POST' });
        return;
      }
      if (stateSnapshot) {
        stateSnapshot.state = 'FINAL_ROUND';
        updateStatusSummary();
        saveDemoState();
        if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
        appendLogEntry({
          timestamp: new Date().toISOString(),
          type: 'FINAL_ROUND',
          message: '🚀 بدأت مرحلة الحسم النهائي!'
        });
      }
    }
  });

  btnCancelElimination.addEventListener('click', async () => {
    if (socket && socket.connected) {
      await fetch('/api/control/elimination/cancel', { method: 'POST' });
      return;
    }
    if (stateSnapshot) {
      stateSnapshot.state = 'READY';
      stateSnapshot.targetPlayer = null;
      updateStatusSummary();
      saveDemoState();
      if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
      appendLogEntry({
        timestamp: new Date().toISOString(),
        type: 'ELIM_CANCEL',
        message: '🛡️ تم إلغاء الإقصاء'
      });
    }
  });

  btnPauseTimer.addEventListener('click', async () => {
    if (socket && socket.connected) {
      await fetch('/api/control/timer/pause', { method: 'POST' });
    }
  });

  btnResumeTimer.addEventListener('click', async () => {
    if (socket && socket.connected) {
      await fetch('/api/control/timer/resume', { method: 'POST' });
    }
  });

  btnExtendTimer.addEventListener('click', async () => {
    if (socket && socket.connected) {
      await fetch('/api/control/timer/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: 15 })
      });
    } else {
      appendLogEntry({
        timestamp: new Date().toISOString(),
        type: 'TIMER_EXTEND',
        message: '⏳ تم تمديد المؤقت بـ 15 ثانية'
      });
    }
  });

  btnResetGame.addEventListener('click', async () => {
    if (confirm('تحذير: هل أنت متأكد من رغبتك في إعادة تعيين اللعبة ومسح جميع اللاعبين؟')) {
      if (socket && socket.connected) {
        await fetch('/api/control/game/reset', { method: 'POST' });
        return;
      }
      allPlayers = [];
      if (stateSnapshot) {
        stateSnapshot.state = 'WAITING_FOR_PLAYERS';
        stateSnapshot.roundNumber = 1;
        stateSnapshot.chosenPlayer = null;
        stateSnapshot.targetPlayer = null;
        stateSnapshot.winner = null;
      }
      updateUI();
      saveDemoState();
      if (bc) {
        bc.postMessage({ type: 'players_updated', players: [] });
        bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
        bc.postMessage({ type: 'game_reset' });
      }
      appendLogEntry({
        timestamp: new Date().toISOString(),
        type: 'GAME_RESET',
        message: '🧹 تمت إعادة تعيين اللعبة ومسح جميع اللاعبين'
      });
      alert('🧹 تمت إعادة تعيين اللعبة بنجاح');
    }
  });

  // -------------------------------------------------------------
  // Simulator Toolbar
  // -------------------------------------------------------------

  btnMockTenPlayers.addEventListener('click', async () => {
    if (socket && socket.connected) {
      btnMockTenPlayers.disabled = true;
      btnMockTenPlayers.textContent = 'جاري الإضافة... ⏳';
      try {
        const mockNames = [
          { name: 'محمد 👑', user: 'mohammed_king' },
          { name: 'سارة ✨', user: 'queen_sara' },
          { name: 'أحمد ⚡', user: 'ahmed_hawk' },
          { name: 'فهد 🏎️', user: 'fahad_hero' },
          { name: 'نورة 🌟', user: 'noura_live' },
          { name: 'خالد 🚀', user: 'khaled_star' },
          { name: 'مريم 🌸', user: 'mariam_rose' },
          { name: 'علي 🔥', user: 'ali_chief' },
          { name: 'يوسف 🏆', user: 'yousef_leopard' },
          { name: 'ليلى 💎', user: 'laila_pearl' }
        ];

        for (const mock of mockNames) {
          await fetch('/api/simulate/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nickname: mock.name,
              uniqueId: mock.user,
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${mock.user}`
            })
          });
        }
      } catch (e) {
        alert('خطأ: ' + e.message);
      } finally {
        btnMockTenPlayers.disabled = false;
        btnMockTenPlayers.textContent = 'إضافة 10 لاعبين تجريبيين 👥';
      }
      return;
    }

    // Client-side 10 players simulation
    const mockList = [
      { name: 'محمد 👑', user: 'mohammed_king', gift: 'lion', shield: false },
      { name: 'سارة ✨', user: 'queen_sara', gift: 'heart', shield: true },
      { name: 'أحمد ⚡', user: 'ahmed_hawk', gift: 'cap', shield: false },
      { name: 'فهد 🏎️', user: 'fahad_hero', gift: 'car', shield: false },
      { name: 'نورة 🌟', user: 'noura_live', gift: 'pearl', shield: false },
      { name: 'خالد 🚀', user: 'khaled_star', gift: 'rocket', shield: false },
      { name: 'مريم 🌸', user: 'mariam_rose', gift: 'rose', shield: false },
      { name: 'علي 🔥', user: 'ali_chief', gift: 'trophy', shield: false },
      { name: 'يوسف 🏆', user: 'yousef_leopard', gift: 'crown', shield: false },
      { name: 'ليلى 💎', user: 'laila_pearl', gift: 'perfume', shield: false }
    ];

    allPlayers = mockList.map((m, idx) => ({
      id: `sim_${Date.now()}_${idx + 1}`,
      playerNumber: idx + 1,
      nickname: m.name,
      uniqueId: m.user,
      status: m.shield ? 'immune' : 'active',
      hasShield: m.shield,
      coins: Math.floor(Math.random() * 50),
      killsCount: 0,
      profilePictureUrl: `assets/gifts/${m.gift}.png`
    }));

    if (stateSnapshot) {
      stateSnapshot.state = 'READY';
      stateSnapshot.roundNumber = 1;
    }
    updateUI();
    saveDemoState();
    if (bc) {
      bc.postMessage({ type: 'players_updated', players: allPlayers });
      if (stateSnapshot) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
    }
    appendLogEntry({
      timestamp: new Date().toISOString(),
      type: 'SIM_MOCK_TEN',
      message: '👥 تمت إضافة 10 لاعبين تجريبيين بنجاح في المحاكي!'
    });
    alert('✅ تمت إضافة 10 لاعبين بنجاح! انتقل لشاشة العرض (Overlay) وستجدهم على العجلة فوراً.');
  });

  btnSimJoin.addEventListener('click', async () => {
    const u = simJoinUsername.value.trim().replace(/^@/, '') || `user_${Date.now() % 1000}`;
    const n = simJoinNickname.value.trim() || u;

    if (socket && socket.connected) {
      await fetch('/api/simulate/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: n,
          uniqueId: u,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${u}`
        })
      });
      simJoinUsername.value = '';
      simJoinNickname.value = '';
      return;
    }

    // Client-side Sim Join
    const nextNum = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.playerNumber || 0)) + 1 : 1;
    const gifts = ['lion', 'heart', 'cap', 'rocket', 'rose', 'trophy', 'pearl', 'car'];
    const randomGift = gifts[nextNum % gifts.length];

    const newP = {
      id: `p_${Date.now()}`,
      playerNumber: nextNum,
      nickname: n,
      uniqueId: u,
      status: 'active',
      hasShield: false,
      coins: 0,
      killsCount: 0,
      profilePictureUrl: `assets/gifts/${randomGift}.png`
    };

    allPlayers.push(newP);
    if (stateSnapshot && stateSnapshot.state === 'WAITING_FOR_PLAYERS' && allPlayers.length >= 2) {
      stateSnapshot.state = 'READY';
    }
    updateUI();
    saveDemoState();
    if (bc) {
      bc.postMessage({ type: 'players_updated', players: allPlayers });
      if (stateSnapshot) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
    }
    appendLogEntry({
      timestamp: new Date().toISOString(),
      type: 'PLAYER_JOINED',
      message: `➕ انضم اللاعب ${n} برقم #${nextNum}`
    });
    simJoinUsername.value = '';
    simJoinNickname.value = '';
    alert(`✅ انضم اللاعب: ${n} (#${nextNum})`);
  });

  btnSimComment.addEventListener('click', async () => {
    const uniqueId = simCommentUser.value;
    const commentText = simCommentText.value.trim();
    if (!commentText) return;

    if (socket && socket.connected) {
      await fetch('/api/simulate/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId, commentText })
      });
      simCommentText.value = '';
      return;
    }

    appendLogEntry({
      timestamp: new Date().toISOString(),
      type: 'COMMENT',
      message: `💬 تعليق من @${uniqueId}: ${commentText}`
    });
    if (bc) bc.postMessage({ type: 'sim_comment', uniqueId, commentText });
    simCommentText.value = '';
    alert(`💬 تم إرسال التعليق من @${uniqueId}: "${commentText}"`);
  });

  // Quick helper to write chosen player's target number
  btnSimQuickTarget.addEventListener('click', () => {
    if (!stateSnapshot?.chosenPlayer) {
      alert('يجب تشغيل الروليت واختيار لاعب أولاً!');
      return;
    }
    simCommentUser.value = stateSnapshot.chosenPlayer.uniqueId;

    const eligible = allPlayers.filter(p =>
      (p.status === 'active' || p.status === 'immune') &&
      p.id !== stateSnapshot.chosenPlayer.id &&
      !p.hasShield && p.status !== 'immune'
    );

    if (eligible.length > 0) {
      simCommentText.value = `${eligible[0].playerNumber}`;
    } else {
      simCommentText.value = '2';
    }
  });

  // Quick Gift Simulator buttons
  document.querySelectorAll('[data-sim-gift]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const giftType = btn.dataset.simGift;
      let uniqueId = simCommentUser.value || (allPlayers[0] && allPlayers[0].uniqueId) || 'user_1';
      let giftName = 'وردة';
      let coins = 1;

      if (giftType === 'defense') {
        if (stateSnapshot?.targetPlayer) {
          uniqueId = stateSnapshot.targetPlayer.uniqueId;
        }
        giftName = settings?.gifts?.defense?.giftName || 'وردة';
        coins = settings?.gifts?.defense?.minCoins || 1;
      } else if (giftType === 'rejoin') {
        const eliminated = allPlayers.filter(p => p.status === 'eliminated');
        if (eliminated.length > 0) uniqueId = eliminated[0].uniqueId;
        giftName = settings?.gifts?.rejoin?.giftName || 'قلب';
        coins = settings?.gifts?.rejoin?.minCoins || 5;
      } else if (giftType === 'help') {
        giftName = settings?.gifts?.help?.giftName || 'كاب';
        coins = settings?.gifts?.help?.minCoins || 16;
      } else if (giftType === 'shield') {
        giftName = settings?.gifts?.shield?.giftName || 'نظارات';
        coins = settings?.gifts?.shield?.minCoins || 30;
      } else if (giftType === 'final') {
        giftName = settings?.gifts?.finalRound?.giftName || 'صاروخ';
        coins = settings?.gifts?.finalRound?.minCoins || 100;
      }

      if (socket && socket.connected) {
        await fetch('/api/simulate/gift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uniqueId, giftName, coins, repeatCount: 1 })
        });
        return;
      }

      // Client-side Gift handling
      const p = allPlayers.find(x => x.uniqueId === uniqueId);
      if (p) {
        p.coins = (p.coins || 0) + coins;
        if (giftType === 'shield') {
          p.hasShield = true;
          p.status = 'immune';
        } else if (giftType === 'rejoin' && p.status === 'eliminated') {
          p.status = 'active';
        }
      }
      updateUI();
      saveDemoState();
      appendLogEntry({
        timestamp: new Date().toISOString(),
        type: 'GIFT',
        message: `🎁 أرسل @${uniqueId} هدية [${giftName}] بقيمة ${coins} عملة!`
      });
      if (bc) {
        bc.postMessage({ type: 'players_updated', players: allPlayers });
        bc.postMessage({ type: 'sim_gift', uniqueId, giftName, coins });
      }
      alert(`🎁 تم إرسال هدية [${giftName}] من @${uniqueId}`);
    });
  });

  // -------------------------------------------------------------
  // Settings Form
  // -------------------------------------------------------------

  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      joinKeyword: settingJoinKeyword.value.trim(),
      maxPlayers: parseInt(settingMaxPlayers.value, 10),
      timeoutBehavior: settingTimeoutBehavior.value,
      timers: {
        targetSelectDuration: parseInt(settingTargetDuration.value, 10),
        defenseDuration: parseInt(settingDefenseDuration.value, 10)
      },
      gifts: {
        defense: { ...settings.gifts.defense, minCoins: parseInt(settingDefMinCoins.value, 10) },
        rejoin: { ...settings.gifts.rejoin, minCoins: parseInt(settingRejoinMinCoins.value, 10) },
        help: { ...settings.gifts.help, minCoins: parseInt(settingHelpMinCoins.value, 10) },
        shield: { ...settings.gifts.shield, minCoins: parseInt(settingShieldMinCoins.value, 10) },
        finalRound: { ...settings.gifts.finalRound },
        winnerChallenge: { ...settings.gifts.winnerChallenge }
      }
    };

    if (socket && socket.connected) {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } else {
      settings = { ...settings, ...updated };
      if (stateSnapshot) stateSnapshot.settings = settings;
      saveDemoState();
      if (bc) bc.postMessage({ type: 'settings_updated', settings });
    }
    alert('✅ تم حفظ الإعدادات بنجاح!');
  });

  function populateSettingsForm() {
    if (!settings) return;
    settingJoinKeyword.value = settings.joinKeyword || 'تم';
    settingMaxPlayers.value = settings.maxPlayers || 30;
    settingTimeoutBehavior.value = settings.timeoutBehavior || 'skip';
    settingTargetDuration.value = settings.timers?.targetSelectDuration || 20;
    settingDefenseDuration.value = settings.timers?.defenseDuration || 30;
    settingDefMinCoins.value = settings.gifts?.defense?.minCoins || 1;
    settingRejoinMinCoins.value = settings.gifts?.rejoin?.minCoins || 5;
    settingHelpMinCoins.value = settings.gifts?.help?.minCoins || 16;
    settingShieldMinCoins.value = settings.gifts?.shield?.minCoins || 30;
  }

  // -------------------------------------------------------------
  // Player Management
  // -------------------------------------------------------------

  addPlayerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = addNickname.value.trim();
    const uniqueId = addUniqueId.value.trim().replace(/^@/, '');
    const playerNumber = addPlayerNumber.value ? parseInt(addPlayerNumber.value, 10) : null;

    if (!nickname) return;

    if (socket && socket.connected) {
      await fetch('/api/players/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, uniqueId, playerNumber })
      });
    } else {
      const assigned = playerNumber || (allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.playerNumber || 0)) + 1 : 1);
      const gifts = ['lion', 'heart', 'cap', 'rocket', 'rose', 'trophy', 'pearl', 'car'];
      const newP = {
        id: `p_${Date.now()}`,
        playerNumber: assigned,
        nickname: nickname,
        uniqueId: uniqueId || `user_${assigned}`,
        status: 'active',
        hasShield: false,
        coins: 0,
        killsCount: 0,
        profilePictureUrl: `assets/gifts/${gifts[assigned % gifts.length]}.png`
      };
      allPlayers.push(newP);
      updateUI();
      saveDemoState();
      if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
      alert(`✅ تمت إضافة اللاعب ${nickname} (#${assigned}) بنجاح!`);
    }

    addNickname.value = '';
    addUniqueId.value = '';
    addPlayerNumber.value = '';
  });

  function renderPlayersTable() {
    if (!playersTableBody) return;

    playersTableBody.innerHTML = allPlayers.map(p => {
      let statusClass = 'active';
      let statusText = 'نشط 🟢';
      if (p.status === 'eliminated') {
        statusClass = 'eliminated';
        statusText = 'مستبعد ☠️';
      } else if (p.hasShield || p.status === 'immune') {
        statusClass = 'immune';
        statusText = 'محصن 🛡️';
      }

      return `
        <tr>
          <td>
            <strong>#${p.playerNumber}</strong>
            <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 11px; margin-right: 4px;" onclick="promptChangeNum('${p.id}')">تعديل</button>
          </td>
          <td>
            <img class="table-avatar" src="${p.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.playerNumber}" alt="">
            <strong>${escapeHtml(p.nickname)}</strong>
          </td>
          <td style="color: var(--text-muted);">@${escapeHtml(p.uniqueId)}</td>
          <td><span class="badge-status ${statusClass}">${statusText}</span></td>
          <td>
            ${p.status === 'eliminated' ? `
              <button class="btn btn-success" style="padding: 4px 10px; font-size: 12px;" onclick="revivePlayer('${p.id}')">إعادة للعبة 🔄</button>
            ` : `
              <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="toggleShield('${p.id}', ${!p.hasShield})">
                ${p.hasShield ? 'إلغاء الحصانة 🔓' : 'منح حصانة 🛡️'}
              </button>
            `}
            <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="deletePlayer('${p.id}')">حذف 🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.deletePlayer = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا اللاعب؟')) return;
    if (socket && socket.connected) {
      await fetch(`/api/players/${id}`, { method: 'DELETE' });
      return;
    }
    allPlayers = allPlayers.filter(p => p.id !== id);
    updateUI();
    saveDemoState();
    if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
  };

  window.revivePlayer = async (id) => {
    if (socket && socket.connected) {
      await fetch(`/api/players/${id}/revive`, { method: 'POST' });
      return;
    }
    const p = allPlayers.find(x => x.id === id);
    if (p) {
      p.status = 'active';
      updateUI();
      saveDemoState();
      if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
    }
  };

  window.toggleShield = async (id, hasShield) => {
    if (socket && socket.connected) {
      await fetch(`/api/players/${id}/shield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasShield, rounds: 1 })
      });
      return;
    }
    const p = allPlayers.find(x => x.id === id);
    if (p) {
      p.hasShield = hasShield;
      p.status = hasShield ? 'immune' : 'active';
      updateUI();
      saveDemoState();
      if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
    }
  };

  window.promptChangeNum = async (id) => {
    const newNum = prompt('أدخل رقم اللاعب الجديد:');
    if (!newNum || isNaN(newNum)) return;
    const num = parseInt(newNum, 10);
    if (socket && socket.connected) {
      const res = await fetch(`/api/players/${id}/number`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerNumber: num })
      });
      const data = await res.json();
      if (!data.success) alert(data.reason);
      return;
    }
    const p = allPlayers.find(x => x.id === id);
    if (p) {
      p.playerNumber = num;
      updateUI();
      saveDemoState();
      if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
    }
  };

  function updateCommentUserDropdown() {
    if (!simCommentUser) return;
    const cur = simCommentUser.value;
    simCommentUser.innerHTML = allPlayers.map(p =>
      `<option value="${p.uniqueId}">#${p.playerNumber} - ${p.nickname} (@${p.uniqueId})</option>`
    ).join('');
    if (cur) simCommentUser.value = cur;
  }

  // -------------------------------------------------------------
  // Logs & UI Updates
  // -------------------------------------------------------------

  function appendLogEntry(entry) {
    if (!logsContainer) return;
    const row = document.createElement('div');
    row.className = 'log-entry';
    const timeStr = new Date(entry.timestamp).toLocaleTimeString();
    row.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-msg">${escapeHtml(entry.message)}</span>`;
    logsContainer.prepend(row);
  }

  btnClearLogs.addEventListener('click', async () => {
    await fetch('/api/logs', { method: 'DELETE' });
    logsContainer.innerHTML = '';
  });

  // Fetch initial logs
  fetch('/api/logs?limit=50')
    .then(r => r.json())
    .then(d => {
      if (d.logs) {
        logsContainer.innerHTML = '';
        d.logs.reverse().forEach(appendLogEntry);
      }
    });

  function updateUI() {
    populateSettingsForm();
    renderPlayersTable();
    updateCommentUserDropdown();
    updateStatusSummary();
    renderAdminGiftConfig();
    populateWheelConfig();
  }

  // -------------------------------------------------------------
  // Gift Configuration & Wheel Appearance
  // -------------------------------------------------------------
  const adminGiftConfigContainer = document.getElementById('adminGiftConfigContainer');
  const adminWheelThemeSelect = document.getElementById('adminWheelThemeSelect');
  const adminWheelSpinDuration = document.getElementById('adminWheelSpinDuration');
  const adminWheelShowAvatars = document.getElementById('adminWheelShowAvatars');
  const adminWheelShowNames = document.getElementById('adminWheelShowNames');
  const btnAdminApplyWheel = document.getElementById('btnAdminApplyWheel');

  let adminGiftCatalog = [
    { id: 'rose', nameAr: 'وردة', emoji: '🌹', coins: 1, image: 'assets/gifts/rose.png' },
    { id: 'heart', nameAr: 'قلب الحب', emoji: '💖', coins: 49, image: 'assets/gifts/heart.png' },
    { id: 'finger_heart', nameAr: 'قلب بالأصابع', emoji: '🫰', coins: 5, image: 'assets/gifts/finger_heart.png' },
    { id: 'hand_heart', nameAr: 'قلب باليدين', emoji: '💗', coins: 100, image: 'assets/gifts/hand_heart.png' },
    { id: 'sunglasses', nameAr: 'نظارات شمسية', emoji: '🕶️', coins: 199, image: 'assets/gifts/sunglasses.png' },
    { id: 'cap', nameAr: 'كاب تيك توك', emoji: '🧢', coins: 99, image: 'assets/gifts/cap.png' },
    { id: 'perfume', nameAr: 'عطر فاخر', emoji: '🧴', coins: 20, image: 'assets/gifts/perfume.png' },
    { id: 'car', nameAr: 'سيارة رياضية', emoji: '🏎️', coins: 10000, image: 'assets/gifts/car.png' },
    { id: 'lion', nameAr: 'أسد تيك توك', emoji: '🦁', coins: 29999, image: 'assets/gifts/lion.png' },
    { id: 'crown', nameAr: 'تاج ذهبي', emoji: '👑', coins: 1000, image: 'assets/gifts/crown.png' },
    { id: 'rocket', nameAr: 'طائرة نفاثة / صاروخ', emoji: '🚀', coins: 4888, image: 'assets/gifts/rocket.png' },
    { id: 'galaxy', nameAr: 'مجرة كونية', emoji: '🌌', coins: 10000, image: 'assets/gifts/galaxy.png' },
    { id: 'trophy', nameAr: 'كأس البطولة', emoji: '🏆', coins: 7000, image: 'assets/gifts/trophy.png' },
    { id: 'pearl', nameAr: 'لؤلؤة البحر', emoji: '🦪', coins: 800, image: 'assets/gifts/pearl.png' },
    { id: 'gold_mine', nameAr: 'كنز الذهب', emoji: '🪙', coins: 1000, image: 'assets/gifts/gold_mine.png' },
    { id: 'ferris_wheel', nameAr: 'عجلة الملاهي', emoji: '🎡', coins: 3000, image: 'assets/gifts/ferris_wheel.png' },
    { id: 'motorcycle', nameAr: 'دراجة نارية', emoji: '🏍️', coins: 2988, image: 'assets/gifts/motorcycle.png' },
    { id: 'speedboat', nameAr: 'يخت سريع', emoji: '🚤', coins: 1888, image: 'assets/gifts/speedboat.png' },
    { id: 'confetti', nameAr: 'احتفال ملون', emoji: '🎉', coins: 100, image: 'assets/gifts/confetti.png' },
    { id: 'tiktok', nameAr: 'شعار تيك توك', emoji: '🎵', coins: 1, image: 'assets/gifts/tiktok.png' }
  ];

  fetch('/api/gifts/catalog')
    .then(r => r.json())
    .then(d => {
      if (d.gifts && d.gifts.length > 0) adminGiftCatalog = d.gifts;
      renderAdminGiftConfig();
    })
    .catch(() => renderAdminGiftConfig());

  function getGiftInfo(idOrName) {
    if (!idOrName) return adminGiftCatalog[0];
    const match = adminGiftCatalog.find(g =>
      g.id === idOrName ||
      g.nameAr.toLowerCase() === String(idOrName).toLowerCase()
    );
    return match || {
      id: idOrName,
      nameAr: idOrName,
      emoji: '🎁',
      coins: 1,
      image: `assets/gifts/${idOrName}.png`
    };
  }

  function renderAdminGiftConfig() {
    if (!adminGiftConfigContainer || !settings) return;
    const gifts = settings.gifts || {};
    const categories = [
      { key: 'defense', label: '🛡️ هدية الدفاع عن النفس', desc: 'يرسلها اللاعب لإنقاذ نفسه من الإقصاء' },
      { key: 'shield', label: '🕶️ هدية الحصانة / الدرع', desc: 'تمنح اللاعب درعاً يحميه من أي استهداف' },
      { key: 'rejoin', label: '🔄 هدية العودة إلى اللعبة', desc: 'يرسلها اللاعب المستبعد للعودة' },
      { key: 'help', label: '❤️ هدية المساعدة / الإنقاذ', desc: 'يرسلها مشاهد لإنقاذ لاعب مستبعد' },
      { key: 'finalRound', label: '🚀 هدية حسم الجولة', desc: 'حسم المواجهة النهائية' },
      { key: 'winnerChallenge', label: '👑 هدية تحدي الفائز', desc: 'تحدي بطل الروليت' }
    ];

    adminGiftConfigContainer.innerHTML = categories.map(cat => {
      const cur = gifts[cat.key] || {};
      const giftInfo = getGiftInfo(cur.giftId || cur.giftName || 'rose');

      return `
        <div class="gift-config-card">
          <div class="gift-config-header">
            <span class="gift-config-title">${cat.label}</span>
          </div>
          <div style="font-size:11px;color:#9ca3af;">${cat.desc}</div>

          <div class="gift-current-preview">
            <img class="gift-preview-img" src="${giftInfo.image}" alt="">
            <div class="gift-preview-details">
              <div class="gift-preview-name">${cur.giftName || giftInfo.nameAr}</div>
              <div class="gift-preview-coins">${cur.minCoins || giftInfo.coins} عملة</div>
            </div>
          </div>

          <div class="gift-coins-input-row">
            <label>العملات المطلوبة:</label>
            <input type="number" class="form-control admin-cat-coins" value="${cur.minCoins || giftInfo.coins}" min="1" data-cat="${cat.key}" style="width:90px;">
          </div>

          <div style="font-size:12px;font-weight:700;color:#cbd5e1;margin-top:4px;">اختر من صور الهدايا:</div>
          <div class="gift-catalog-selector">
            ${adminGiftCatalog.map(g => {
              const isSelected = (cur.giftId === g.id) || (!cur.giftId && cur.giftName === g.nameAr);
              return `
                <button type="button" class="gift-item-btn ${isSelected ? 'selected' : ''}"
                  onclick="window.adminSelectGift('${cat.key}', '${g.id}', '${g.nameAr}', ${g.coins})">
                  <img src="${g.image}" alt="${g.nameAr}">
                  <span>${g.nameAr}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('.admin-cat-coins').forEach(inp => {
      inp.addEventListener('change', async (e) => {
        const catKey = e.target.dataset.cat;
        const newCoins = parseInt(e.target.value, 10) || 1;
        if (!settings.gifts[catKey]) settings.gifts[catKey] = {};
        settings.gifts[catKey].minCoins = newCoins;
        await saveAdminGifts();
      });
    });
  }

  window.adminSelectGift = async (catKey, giftId, giftName, defaultCoins) => {
    if (!settings) return;
    if (!settings.gifts) settings.gifts = {};
    if (!settings.gifts[catKey]) settings.gifts[catKey] = {};
    settings.gifts[catKey].giftId = giftId;
    settings.gifts[catKey].giftName = giftName;
    settings.gifts[catKey].minCoins = defaultCoins;

    await saveAdminGifts();
    renderAdminGiftConfig();
  };

  async function saveAdminGifts() {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gifts: settings.gifts })
    });
  }

  function populateWheelConfig() {
    const wc = settings?.wheelConfig;
    if (!wc) return;
    if (adminWheelThemeSelect) adminWheelThemeSelect.value = wc.theme || 'casino';
    if (adminWheelSpinDuration) adminWheelSpinDuration.value = wc.spinDuration || 6500;
    if (adminWheelShowAvatars) adminWheelShowAvatars.checked = wc.showPlayerAvatars !== false;
    if (adminWheelShowNames) adminWheelShowNames.checked = wc.showPlayerNames !== false;
  }

  if (btnAdminApplyWheel) {
    btnAdminApplyWheel.addEventListener('click', async () => {
      const theme = adminWheelThemeSelect ? adminWheelThemeSelect.value : 'casino';
      const spinDuration = parseInt(adminWheelSpinDuration.value, 10) || 6500;
      const showPlayerAvatars = adminWheelShowAvatars ? adminWheelShowAvatars.checked : true;
      const showPlayerNames = adminWheelShowNames ? adminWheelShowNames.checked : true;

      const wheelConfig = { theme, spinDuration, showPlayerAvatars, showPlayerNames };
      if (socket && socket.connected) {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wheelConfig })
        });
      } else {
        if (settings) settings.wheelConfig = wheelConfig;
        if (stateSnapshot) stateSnapshot.settings = settings;
        saveDemoState();
        if (bc) bc.postMessage({ type: 'settings_updated', settings });
      }
      alert('✅ تم تحديث وتطبيق شكل العجلة بنجاح! 🎡');
    });
  }

  function updateStatusSummary() {
    const statusBox = document.getElementById('stateSummaryText');
    if (statusBox && stateSnapshot) {
      statusBox.textContent = `الحالة الحالية: ${stateSnapshot.state} | الجولة: #${stateSnapshot.roundNumber} | اللاعبين: ${stateSnapshot.activeCount} نشط (${stateSnapshot.eliminatedCount} مستبعد)`;
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }
});
