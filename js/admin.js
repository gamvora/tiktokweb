// ═══════════════════════════════════════════════════════════════
// روليت تيك توك لايف - لوحة تحكم المشرف (Admin Dashboard)
// يتصل تلقائياً بالـ backend على Railway أو يعمل في وضع Demo
// ═══════════════════════════════════════════════════════════════

// ── تحديد عنوان الـ backend (من js/backend.js المشترك) ─────
const BACKEND_URL = window.BACKEND_URL || '';

// ── Socket.IO متغيرات عامة ──────────────────────────────────
let socket = null;
let socketConnected = false;

document.addEventListener('DOMContentLoaded', () => {
  let stateSnapshot = null;
  let allPlayers = [];
  let settings = null;

  // BroadcastChannel لمزامنة شاشة البث (overlay) مع لوحة التحكم
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tiktok_roulette_sync') : null;

  // ── DOM References ──────────────────────────────────────────
  const tiktokUsernameInput  = document.getElementById('tiktokUsernameInput');
  const btnConnectTikTok     = document.getElementById('btnConnectTikTok');
  const btnDisconnectTikTok  = document.getElementById('btnDisconnectTikTok');
  const tiktokStatusText     = document.getElementById('tiktokStatusText');

  const btnStartRoulette     = document.getElementById('btnStartRoulette');
  const btnToggleJoin        = document.getElementById('btnToggleJoin');
  const btnNextRound         = document.getElementById('btnNextRound');
  const btnFinalRound        = document.getElementById('btnFinalRound');
  const btnCancelElimination = document.getElementById('btnCancelElimination');
  const btnPauseTimer        = document.getElementById('btnPauseTimer');
  const btnResumeTimer       = document.getElementById('btnResumeTimer');
  const btnExtendTimer       = document.getElementById('btnExtendTimer');
  const btnResetGame         = document.getElementById('btnResetGame');

  const btnMockTenPlayers    = document.getElementById('btnMockTenPlayers');
  const simJoinUsername      = document.getElementById('simJoinUsername');
  const simJoinNickname      = document.getElementById('simJoinNickname');
  const btnSimJoin           = document.getElementById('btnSimJoin');
  const simCommentUser       = document.getElementById('simCommentUser');
  const simCommentText       = document.getElementById('simCommentText');
  const btnSimComment        = document.getElementById('btnSimComment');
  const btnSimQuickTarget    = document.getElementById('btnSimQuickTarget');

  const settingsForm          = document.getElementById('settingsForm');
  const settingJoinKeyword    = document.getElementById('settingJoinKeyword');
  const settingMaxPlayers     = document.getElementById('settingMaxPlayers');
  const settingTargetDuration = document.getElementById('settingTargetDuration');
  const settingDefenseDuration= document.getElementById('settingDefenseDuration');
  const settingTimeoutBehavior= document.getElementById('settingTimeoutBehavior');
  const settingDefMinCoins    = document.getElementById('settingDefMinCoins');
  const settingRejoinMinCoins = document.getElementById('settingRejoinMinCoins');
  const settingHelpMinCoins   = document.getElementById('settingHelpMinCoins');
  const settingShieldMinCoins = document.getElementById('settingShieldMinCoins');

  const playersTableBody = document.getElementById('playersTableBody');
  const addPlayerForm    = document.getElementById('addPlayerForm');
  const addNickname      = document.getElementById('addNickname');
  const addUniqueId      = document.getElementById('addUniqueId');
  const addPlayerNumber  = document.getElementById('addPlayerNumber');

  const logsContainer = document.getElementById('logsContainer');
  const btnClearLogs  = document.getElementById('btnClearLogs');

  // ─────────────────────────────────────────────────────────────
  // Helper: API Call مع دعم BACKEND_URL والـ Fallback
  // ─────────────────────────────────────────────────────────────
  async function apiPost(path, body = {}) {
    if (!BACKEND_URL) return { success: false, error: 'لا يوجد اتصال بالخادم' };
    try {
      const res = await fetch(`${BACKEND_URL}/api${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        let detail = '';
        try { detail = (await res.json()).error || ''; } catch (e) {}
        return { success: false, error: detail || `HTTP ${res.status}` };
      }
      return await res.json();
    } catch (err) {
      console.error('[Admin] apiPost failed:', path, err);
      return { success: false, error: err.message || 'فشل الاتصال بالخادم' };
    }
  }

  async function apiGet(path) {
    if (!BACKEND_URL) return null;
    try {
      const res = await fetch(`${BACKEND_URL}/api${path}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  async function apiDelete(path) {
    if (!BACKEND_URL) return;
    try {
      await fetch(`${BACKEND_URL}/api${path}`, { method: 'DELETE' });
    } catch (e) {
      console.error('[Admin] apiDelete failed:', path, e);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Socket.IO Initialization
  // ─────────────────────────────────────────────────────────────
  function initSocket() {
    if (!BACKEND_URL || typeof io === 'undefined') {
      console.log('[Admin] Socket.IO غير متاح - وضع Demo');
      startDemoFallback();
      return;
    }

    try {
      socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        timeout: 8000,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });

      socket.on('connect', () => {
        console.log('[Admin] ✅ متصل بالخادم:', BACKEND_URL);
        socketConnected = true;
        if (tiktokStatusText) {
          tiktokStatusText.innerHTML = `<span style="color:#10b981;">✅ متصل بخادم Railway</span>`;
        }
        // جلب السجلات عند الاتصال
        loadInitialLogs();
        // جلب كتالوج الهدايا
        loadGiftCatalog();
      });

      socket.on('connect_error', (err) => {
        console.warn('[Admin] خطأ في الاتصال:', err.message);
      });

      socket.on('disconnect', () => {
        socketConnected = false;
      });

      // إذا لم يتصل في 5 ثوان → وضع Demo
      setTimeout(() => {
        if (!socketConnected && !stateSnapshot) {
          startDemoFallback();
        }
      }, 5000);

      setupSocketEvents();

    } catch (e) {
      console.error('[Admin] خطأ في تهيئة Socket.IO:', e);
      startDemoFallback();
    }
  }

  function setupSocketEvents() {
    if (!socket) return;

    socket.on('init_sync', (data) => {
      stateSnapshot = data.snapshot;
      allPlayers = data.players || [];
      settings = data.snapshot?.settings || {};
      updateUI();
      if (data.tiktokStatus) updateTikTokStatus(data.tiktokStatus);
    });

    socket.on('state_updated', (snapshot) => {
      stateSnapshot = snapshot;
      if (snapshot?.settings) settings = snapshot.settings;
      updateUI();
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

    socket.on('activity_log', (entry) => {
      appendLogEntry(entry);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Demo Fallback (عند غياب الخادم)
  // ─────────────────────────────────────────────────────────────
  function startDemoFallback() {
    stateSnapshot = {
      roundNumber: 1,
      state: 'WAITING_FOR_PLAYERS',
      chosenPlayer: null,
      targetPlayer: null,
      winner: null,
      activeCount: 0,
      eliminatedCount: 0,
      settings: {
        joinKeyword: 'تم',
        isJoinOpen: true,
        maxPlayers: 50,
        timers: { targetSelectDuration: 20, defenseDuration: 30 },
        timeoutBehavior: 'skip',
        gifts: {
          defense:        { giftName: 'وردة',          giftId: 'rose',       minCoins: 1    },
          shield:         { giftName: 'نظارات شمسية',  giftId: 'sunglasses', minCoins: 30   },
          rejoin:         { giftName: 'قلب الحب',       giftId: 'heart',      minCoins: 5    },
          help:           { giftName: 'كاب تيك توك',   giftId: 'cap',        minCoins: 16   },
          finalRound:     { giftName: 'طائرة نفاثة / صاروخ', giftId: 'rocket', minCoins: 100 },
          winnerChallenge:{ giftName: 'تاج ذهبي',      giftId: 'crown',      minCoins: 100  }
        },
        wheelConfig: { theme: 'casino', spinDuration: 6500, showPlayerAvatars: true, showPlayerNames: true }
      }
    };
    settings = stateSnapshot.settings;
    allPlayers = [];

    updateUI();
    if (tiktokStatusText) {
      tiktokStatusText.innerHTML = `<span style="color:#00f2fe;">🌐 وضع المعاينة (Demo Mode) — الخادم غير متصل</span>`;
    }

    appendLogEntry({
      timestamp: new Date().toISOString(),
      type: 'DEMO_MODE',
      message: '🌐 يعمل بوضع Demo — الخادم غير متوفر. استخدم المحاكي لتجربة الميزات.'
    });
  }

  function saveDemoState() {
    try {
      localStorage.setItem('tiktok_demo_players', JSON.stringify(allPlayers));
      localStorage.setItem('tiktok_demo_snapshot', JSON.stringify(stateSnapshot));
    } catch (e) {}
  }

  // ─────────────────────────────────────────────────────────────
  // TikTok Connection Actions
  // ─────────────────────────────────────────────────────────────
  if (btnConnectTikTok) {
    btnConnectTikTok.addEventListener('click', async () => {
      const username = tiktokUsernameInput.value.trim().replace(/^@/, '');
      if (!username) {
        alert('يرجى كتابة اسم حساب تيك توك صاحب البث');
        return;
      }

      tiktokStatusText.innerHTML = `<span style="color:#f59e0b;">⏳ جاري محاولة الاتصال بـ @${username}...</span>`;

      if (BACKEND_URL) {
        try {
          const data = await apiPost('/tiktok/connect', { username });
          if (!data.success) {
            alert('خطأ في الاتصال: ' + (data.error || 'تأكد من فتح البث المباشر واسم المستخدم'));
          }
        } catch (err) {
          alert('فشل الاتصال: ' + err.message);
        }
        return;
      }

      // وضع Demo: محاكاة الاتصال
      setTimeout(() => {
        const mockStatus = {
          status: 'connected',
          username: username,
          roomInfo: { title: `بث تيك توك - @${username}`, viewerCount: Math.floor(Math.random() * 200) + 50 }
        };
        updateTikTokStatus(mockStatus);
        if (bc) bc.postMessage({ type: 'tiktok_status', status: mockStatus });
        appendLogEntry({
          timestamp: new Date().toISOString(),
          type: 'TIKTOK_CONNECTED',
          message: `🟢 تم ربط حساب تيك توك بوضع المحاكاة: @${username}`
        });
        alert(`✅ تم ربط @${username} في وضع المحاكاة!\n(استخدم المحاكي لإرسال اللاعبين والهدايا والتعليقات)`);
      }, 600);
    });
  }

  if (btnDisconnectTikTok) {
    btnDisconnectTikTok.addEventListener('click', async () => {
      if (BACKEND_URL) {
        await apiPost('/tiktok/disconnect');
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
  }

  function updateTikTokStatus(status) {
    if (!tiktokStatusText || !status || typeof status !== 'object') return;

    if (status.username && tiktokUsernameInput && !tiktokUsernameInput.value) {
      tiktokUsernameInput.value = status.username;
    }

    if (status.status === 'connected') {
      const viewers = status.roomInfo?.viewerCount ? ` | المشاهدين: ${status.roomInfo.viewerCount} 👁️` : '';
      tiktokStatusText.innerHTML = `<span style="color:#10b981;">✅ متصل بالبث (@${status.username})${viewers}</span>`;
      if (btnConnectTikTok) btnConnectTikTok.style.display = 'none';
      if (btnDisconnectTikTok) btnDisconnectTikTok.style.display = 'inline-flex';
    } else if (status.status === 'connecting') {
      tiktokStatusText.innerHTML = `<span style="color:#f59e0b;">⏳ جاري الاتصال بـ @${status.username}...</span>`;
    } else if (status.status === 'error') {
      tiktokStatusText.innerHTML = `<span style="color:#ef4444;">❌ خطأ: ${status.lastError || 'تعذر الاتصال'}</span>`;
      if (btnConnectTikTok) btnConnectTikTok.style.display = 'inline-flex';
      if (btnDisconnectTikTok) btnDisconnectTikTok.style.display = 'none';
    } else {
      tiktokStatusText.innerHTML = `<span style="color:#9ca3af;">⚪ غير متصل بالبث</span>`;
      if (btnConnectTikTok) btnConnectTikTok.style.display = 'inline-flex';
      if (btnDisconnectTikTok) btnDisconnectTikTok.style.display = 'none';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Game Control Actions
  // ─────────────────────────────────────────────────────────────
  if (btnStartRoulette) {
    btnStartRoulette.addEventListener('click', async () => {
      if (BACKEND_URL) {
        const data = await apiPost('/control/roulette/start');
        if (!data.success) alert(data.reason || 'تعذر بدء الروليت');
        return;
      }
      const active = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
      if (active.length < 2) { alert('يجب وجود لاعبان نشطان على الأقل!'); return; }
      const chosen = active[Math.floor(Math.random() * active.length)];
      if (stateSnapshot) { stateSnapshot.chosenPlayer = chosen; stateSnapshot.state = 'SELECTED_PLAYER'; }
      updateStatusSummary();
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'ROULETTE_START', message: `🎡 تم اختيار ${chosen.nickname} (#${chosen.playerNumber})` });
      if (bc) bc.postMessage({ type: 'start_spin', chosenPlayer: chosen });
      alert(`🎡 تم إرسال أمر الروليت! تم اختيار: ${chosen.nickname}`);
    });
  }

  if (btnToggleJoin) {
    btnToggleJoin.addEventListener('click', async () => {
      if (BACKEND_URL) {
        const data = await apiPost('/control/join', {});
        btnToggleJoin.textContent = data.isJoinOpen ? '🔒 إغلاق باب الانضمام' : '🔓 فتح باب الانضمام';
        return;
      }
      if (settings) {
        settings.isJoinOpen = !settings.isJoinOpen;
        btnToggleJoin.textContent = settings.isJoinOpen ? '🔒 إغلاق باب الانضمام' : '🔓 فتح باب الانضمام';
        saveDemoState();
        if (bc) bc.postMessage({ type: 'settings_updated', settings });
        appendLogEntry({ timestamp: new Date().toISOString(), type: 'JOIN_TOGGLED', message: settings.isJoinOpen ? '🔓 تم فتح باب الانضمام' : '🔒 تم إغلاق باب الانضمام' });
      }
    });
  }

  if (btnNextRound) {
    btnNextRound.addEventListener('click', async () => {
      if (BACKEND_URL) { await apiPost('/control/round/next'); return; }
      if (stateSnapshot) {
        stateSnapshot.roundNumber = (stateSnapshot.roundNumber || 1) + 1;
        stateSnapshot.chosenPlayer = null; stateSnapshot.targetPlayer = null; stateSnapshot.state = 'READY';
        updateStatusSummary(); saveDemoState();
        if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
        appendLogEntry({ timestamp: new Date().toISOString(), type: 'ROUND_NEXT', message: `🔄 بدأت الجولة #${stateSnapshot.roundNumber}` });
        alert(`🔄 بدأت الجولة #${stateSnapshot.roundNumber}`);
      }
    });
  }

  if (btnFinalRound) {
    btnFinalRound.addEventListener('click', async () => {
      if (!confirm('هل تريد بدء مرحلة الحسم النهائي الآن؟')) return;
      if (BACKEND_URL) { await apiPost('/control/round/final'); return; }
      if (stateSnapshot) {
        stateSnapshot.state = 'FINAL_ROUND'; updateStatusSummary(); saveDemoState();
        if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
        appendLogEntry({ timestamp: new Date().toISOString(), type: 'FINAL_ROUND', message: '🚀 بدأت مرحلة الحسم النهائي!' });
      }
    });
  }

  if (btnCancelElimination) {
    btnCancelElimination.addEventListener('click', async () => {
      if (BACKEND_URL) { await apiPost('/control/elimination/cancel'); return; }
      if (stateSnapshot) {
        stateSnapshot.state = 'READY'; stateSnapshot.targetPlayer = null;
        updateStatusSummary(); saveDemoState();
        if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot });
        appendLogEntry({ timestamp: new Date().toISOString(), type: 'ELIM_CANCEL', message: '🛡️ تم إلغاء الإقصاء' });
      }
    });
  }

  if (btnPauseTimer) btnPauseTimer.addEventListener('click', async () => { if (BACKEND_URL) await apiPost('/control/timer/pause'); });
  if (btnResumeTimer) btnResumeTimer.addEventListener('click', async () => { if (BACKEND_URL) await apiPost('/control/timer/resume'); });

  if (btnExtendTimer) {
    btnExtendTimer.addEventListener('click', async () => {
      if (BACKEND_URL) { await apiPost('/control/timer/extend', { seconds: 15 }); return; }
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'TIMER_EXTEND', message: '⏳ تمديد المؤقت +15 ثانية (محاكاة)' });
    });
  }

  if (btnResetGame) {
    btnResetGame.addEventListener('click', async () => {
      if (!confirm('تحذير: إعادة تعيين اللعبة ومسح جميع اللاعبين؟')) return;
      if (BACKEND_URL) { await apiPost('/control/game/reset'); return; }
      allPlayers = [];
      if (stateSnapshot) { stateSnapshot.state = 'WAITING_FOR_PLAYERS'; stateSnapshot.roundNumber = 1; stateSnapshot.chosenPlayer = null; stateSnapshot.targetPlayer = null; stateSnapshot.winner = null; }
      updateUI(); saveDemoState();
      if (bc) { bc.postMessage({ type: 'players_updated', players: [] }); bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot }); bc.postMessage({ type: 'game_reset' }); }
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'GAME_RESET', message: '🧹 تمت إعادة تعيين اللعبة' });
      alert('🧹 تمت إعادة تعيين اللعبة بنجاح');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Simulator Toolbar
  // ─────────────────────────────────────────────────────────────
  const mockNames = [
    { name: 'محمد 👑', user: 'mohammed_king', gift: 'lion'   },
    { name: 'سارة ✨', user: 'queen_sara',    gift: 'heart'  },
    { name: 'أحمد ⚡', user: 'ahmed_hawk',    gift: 'cap'    },
    { name: 'فهد 🏎️', user: 'fahad_hero',    gift: 'car'    },
    { name: 'نورة 🌟', user: 'noura_live',    gift: 'pearl'  },
    { name: 'خالد 🚀', user: 'khaled_star',   gift: 'rocket' },
    { name: 'مريم 🌸', user: 'mariam_rose',   gift: 'rose'   },
    { name: 'علي 🔥',  user: 'ali_chief',     gift: 'trophy' },
    { name: 'يوسف 🏆', user: 'yousef_leo',    gift: 'crown'  },
    { name: 'ليلى 💎', user: 'laila_pearl',   gift: 'perfume'}
  ];

  if (btnMockTenPlayers) {
    btnMockTenPlayers.addEventListener('click', async () => {
      if (BACKEND_URL) {
        btnMockTenPlayers.disabled = true;
        btnMockTenPlayers.textContent = 'جاري الإضافة... ⏳';
        try {
          for (const m of mockNames) {
            await apiPost('/simulate/join', {
              nickname: m.name,
              uniqueId: m.user,
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user}`
            });
          }
          alert('✅ تمت إضافة 10 لاعبين بنجاح على الخادم!');
        } catch (e) { alert('خطأ: ' + e.message); }
        finally {
          btnMockTenPlayers.disabled = false;
          btnMockTenPlayers.textContent = 'إضافة 10 لاعبين تجريبيين 👥';
        }
        return;
      }
      // وضع Demo
      allPlayers = mockNames.map((m, idx) => ({
        id: `sim_${Date.now()}_${idx + 1}`,
        playerNumber: idx + 1,
        nickname: m.name,
        uniqueId: m.user,
        status: idx === 1 ? 'immune' : 'active',
        hasShield: idx === 1,
        coins: Math.floor(Math.random() * 50),
        killsCount: 0,
        profilePictureUrl: `assets/gifts/${m.gift}.png`
      }));
      if (stateSnapshot) { stateSnapshot.state = 'READY'; stateSnapshot.roundNumber = 1; stateSnapshot.activeCount = 10; stateSnapshot.eliminatedCount = 0; }
      updateUI(); saveDemoState();
      if (bc) { bc.postMessage({ type: 'players_updated', players: allPlayers }); if (stateSnapshot) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot }); }
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'SIM_MOCK_TEN', message: '👥 تمت إضافة 10 لاعبين تجريبيين بنجاح!' });
      alert('✅ تمت إضافة 10 لاعبين بنجاح! افتح شاشة البث لترى العجلة.');
    });
  }

  if (btnSimJoin) {
    btnSimJoin.addEventListener('click', async () => {
      const u = (simJoinUsername?.value || '').trim().replace(/^@/, '') || `user_${Date.now() % 1000}`;
      const n = (simJoinNickname?.value || '').trim() || u;

      if (BACKEND_URL) {
        await apiPost('/simulate/join', { nickname: n, uniqueId: u, avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${u}` });
        if (simJoinUsername) simJoinUsername.value = '';
        if (simJoinNickname) simJoinNickname.value = '';
        return;
      }
      const nextNum = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.playerNumber || 0)) + 1 : 1;
      const giftList = ['lion', 'heart', 'cap', 'rocket', 'rose', 'trophy', 'pearl', 'car'];
      const newP = { id: `p_${Date.now()}`, playerNumber: nextNum, nickname: n, uniqueId: u, status: 'active', hasShield: false, coins: 0, killsCount: 0, profilePictureUrl: `assets/gifts/${giftList[nextNum % giftList.length]}.png` };
      allPlayers.push(newP);
      if (stateSnapshot && stateSnapshot.state === 'WAITING_FOR_PLAYERS' && allPlayers.length >= 2) stateSnapshot.state = 'READY';
      updateUI(); saveDemoState();
      if (bc) { bc.postMessage({ type: 'players_updated', players: allPlayers }); if (stateSnapshot) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot }); }
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'PLAYER_JOINED', message: `➕ انضم ${n} برقم #${nextNum}` });
      if (simJoinUsername) simJoinUsername.value = '';
      if (simJoinNickname) simJoinNickname.value = '';
      alert(`✅ انضم: ${n} (#${nextNum})`);
    });
  }

  if (btnSimComment) {
    btnSimComment.addEventListener('click', async () => {
      const uniqueId = simCommentUser?.value;
      const commentText = (simCommentText?.value || '').trim();
      if (!commentText) return;
      if (BACKEND_URL) {
        await apiPost('/simulate/comment', { uniqueId, commentText });
        if (simCommentText) simCommentText.value = '';
        return;
      }
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'COMMENT', message: `💬 @${uniqueId}: ${commentText}` });
      if (bc) bc.postMessage({ type: 'sim_comment', uniqueId, commentText });
      if (simCommentText) simCommentText.value = '';
      alert(`💬 تم إرسال: "${commentText}" من @${uniqueId}`);
    });
  }

  if (btnSimQuickTarget) {
    btnSimQuickTarget.addEventListener('click', () => {
      if (!stateSnapshot?.chosenPlayer) { alert('شغّل الروليت أولاً!'); return; }
      if (simCommentUser) simCommentUser.value = stateSnapshot.chosenPlayer.uniqueId;
      const eligible = allPlayers.filter(p => (p.status === 'active') && p.id !== stateSnapshot.chosenPlayer.id && !p.hasShield);
      if (simCommentText) simCommentText.value = eligible.length > 0 ? `${eligible[0].playerNumber}` : '2';
    });
  }

  // هدايا المحاكي (data-sim-gift)
  document.querySelectorAll('[data-sim-gift]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const giftType = btn.dataset.simGift;
      let uniqueId = simCommentUser?.value || (allPlayers[0] && allPlayers[0].uniqueId) || 'user_1';
      let giftName = 'وردة', coins = 1;

      if (giftType === 'defense') {
        if (stateSnapshot?.targetPlayer) uniqueId = stateSnapshot.targetPlayer.uniqueId;
        giftName = settings?.gifts?.defense?.giftName || 'وردة'; coins = settings?.gifts?.defense?.minCoins || 1;
      } else if (giftType === 'rejoin') {
        const elim = allPlayers.filter(p => p.status === 'eliminated');
        if (elim.length > 0) uniqueId = elim[0].uniqueId;
        giftName = settings?.gifts?.rejoin?.giftName || 'قلب'; coins = settings?.gifts?.rejoin?.minCoins || 5;
      } else if (giftType === 'help') {
        giftName = settings?.gifts?.help?.giftName || 'كاب'; coins = settings?.gifts?.help?.minCoins || 16;
      } else if (giftType === 'shield') {
        giftName = settings?.gifts?.shield?.giftName || 'نظارات'; coins = settings?.gifts?.shield?.minCoins || 30;
      } else if (giftType === 'final') {
        giftName = settings?.gifts?.finalRound?.giftName || 'صاروخ'; coins = settings?.gifts?.finalRound?.minCoins || 100;
      }

      if (BACKEND_URL) {
        await apiPost('/simulate/gift', { uniqueId, giftName, coins, repeatCount: 1 });
        return;
      }
      const p = allPlayers.find(x => x.uniqueId === uniqueId);
      if (p) {
        p.coins = (p.coins || 0) + coins;
        if (giftType === 'shield') { p.hasShield = true; p.status = 'immune'; }
        else if (giftType === 'rejoin' && p.status === 'eliminated') p.status = 'active';
      }
      updateUI(); saveDemoState();
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'GIFT', message: `🎁 @${uniqueId} أرسل [${giftName}] - ${coins} عملة` });
      if (bc) { bc.postMessage({ type: 'players_updated', players: allPlayers }); bc.postMessage({ type: 'sim_gift', uniqueId, giftName, coins }); }
      alert(`🎁 تم إرسال [${giftName}] من @${uniqueId}`);
    });
  });

  // هدايا قسم الدرور (data-drawer-gift) في الـ Drawer
  document.querySelectorAll('[data-drawer-gift]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const giftType = btn.dataset.drawerGift;
      let uniqueId = (document.getElementById('simDrawerCommentUser')?.value) || (allPlayers[0] && allPlayers[0].uniqueId) || 'user_1';
      let giftName = 'وردة', coins = 1;

      if (giftType === 'defense') {
        if (stateSnapshot?.targetPlayer) uniqueId = stateSnapshot.targetPlayer.uniqueId;
        giftName = settings?.gifts?.defense?.giftName || 'وردة'; coins = settings?.gifts?.defense?.minCoins || 1;
      } else if (giftType === 'rejoin') {
        const elim = allPlayers.filter(p => p.status === 'eliminated');
        if (elim.length > 0) uniqueId = elim[0].uniqueId;
        giftName = settings?.gifts?.rejoin?.giftName || 'قلب'; coins = settings?.gifts?.rejoin?.minCoins || 5;
      } else if (giftType === 'help') {
        giftName = settings?.gifts?.help?.giftName || 'كاب'; coins = settings?.gifts?.help?.minCoins || 16;
      } else if (giftType === 'shield') {
        giftName = settings?.gifts?.shield?.giftName || 'نظارات'; coins = settings?.gifts?.shield?.minCoins || 30;
      } else if (giftType === 'final') {
        giftName = settings?.gifts?.finalRound?.giftName || 'صاروخ'; coins = settings?.gifts?.finalRound?.minCoins || 100;
      }

      if (BACKEND_URL) {
        await apiPost('/simulate/gift', { uniqueId, giftName, coins, repeatCount: 1 });
        return;
      }
      const p = allPlayers.find(x => x.uniqueId === uniqueId);
      if (p) {
        p.coins = (p.coins || 0) + coins;
        if (giftType === 'shield') { p.hasShield = true; p.status = 'immune'; }
        else if (giftType === 'rejoin' && p.status === 'eliminated') p.status = 'active';
      }
      updateUI(); saveDemoState();
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'GIFT', message: `🎁 @${uniqueId} أرسل [${giftName}] - ${coins} عملة` });
      if (bc) { bc.postMessage({ type: 'players_updated', players: allPlayers }); bc.postMessage({ type: 'sim_gift', uniqueId, giftName, coins }); }
      alert(`🎁 تم إرسال [${giftName}] من @${uniqueId}`);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Drawer Simulator Buttons (Overlay Drawer)
  // ─────────────────────────────────────────────────────────────

  // Drawer Mock Ten
  const btnDrawerMockTen = document.getElementById('btnDrawerMockTen');
  if (btnDrawerMockTen) {
    btnDrawerMockTen.addEventListener('click', async () => {
      if (BACKEND_URL) {
        try {
          for (const m of mockNames) {
            await apiPost('/simulate/join', { nickname: m.name, uniqueId: m.user, avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user}` });
          }
          alert('✅ تمت إضافة 10 لاعبين!');
        } catch (e) { alert('خطأ: ' + e.message); }
        return;
      }
      allPlayers = mockNames.map((m, idx) => ({
        id: `sim_${Date.now()}_${idx + 1}`, playerNumber: idx + 1, nickname: m.name, uniqueId: m.user,
        status: idx === 1 ? 'immune' : 'active', hasShield: idx === 1, coins: 0, killsCount: 0,
        profilePictureUrl: `assets/gifts/${m.gift}.png`
      }));
      if (stateSnapshot) { stateSnapshot.state = 'READY'; stateSnapshot.activeCount = 10; }
      updateUI(); saveDemoState();
      if (bc) { bc.postMessage({ type: 'players_updated', players: allPlayers }); if (stateSnapshot) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot }); }
      alert('✅ تمت إضافة 10 لاعبين تجريبيين!');
    });
  }

  // Drawer Sim Join
  const btnSimDrawerJoin = document.getElementById('btnSimDrawerJoin');
  if (btnSimDrawerJoin) {
    btnSimDrawerJoin.addEventListener('click', async () => {
      const nickEl = document.getElementById('simDrawerJoinNick');
      const userEl = document.getElementById('simDrawerJoinUser');
      const n = (nickEl?.value || '').trim() || `لاعب_${Date.now() % 100}`;
      const u = (userEl?.value || '').trim().replace(/^@/, '') || `user_${Date.now() % 1000}`;
      if (BACKEND_URL) {
        await apiPost('/simulate/join', { nickname: n, uniqueId: u, avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${u}` });
        if (nickEl) nickEl.value = ''; if (userEl) userEl.value = '';
        return;
      }
      const nextNum = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.playerNumber || 0)) + 1 : 1;
      const giftList = ['lion', 'heart', 'cap', 'rocket', 'rose', 'trophy', 'pearl', 'car'];
      allPlayers.push({ id: `p_${Date.now()}`, playerNumber: nextNum, nickname: n, uniqueId: u, status: 'active', hasShield: false, coins: 0, killsCount: 0, profilePictureUrl: `assets/gifts/${giftList[nextNum % giftList.length]}.png` });
      if (stateSnapshot && stateSnapshot.state === 'WAITING_FOR_PLAYERS' && allPlayers.length >= 2) stateSnapshot.state = 'READY';
      updateUI(); saveDemoState();
      if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'PLAYER_JOINED', message: `➕ انضم ${n} (#${nextNum})` });
      if (nickEl) nickEl.value = ''; if (userEl) userEl.value = '';
    });
  }

  // Drawer Sim Comment
  const btnSimDrawerComment = document.getElementById('btnSimDrawerComment');
  if (btnSimDrawerComment) {
    btnSimDrawerComment.addEventListener('click', async () => {
      const userEl = document.getElementById('simDrawerCommentUser');
      const textEl = document.getElementById('simDrawerCommentText');
      const uniqueId = userEl?.value;
      const commentText = (textEl?.value || '').trim();
      if (!commentText) return;
      if (BACKEND_URL) {
        await apiPost('/simulate/comment', { uniqueId, commentText });
        if (textEl) textEl.value = '';
        return;
      }
      appendLogEntry({ timestamp: new Date().toISOString(), type: 'COMMENT', message: `💬 @${uniqueId}: ${commentText}` });
      if (bc) bc.postMessage({ type: 'sim_comment', uniqueId, commentText });
      if (textEl) textEl.value = '';
    });
  }

  // Drawer Auto Target
  const btnSimDrawerAutoTarget = document.getElementById('btnSimDrawerAutoTarget');
  if (btnSimDrawerAutoTarget) {
    btnSimDrawerAutoTarget.addEventListener('click', () => {
      if (!stateSnapshot?.chosenPlayer) { alert('شغّل الروليت أولاً!'); return; }
      const userEl = document.getElementById('simDrawerCommentUser');
      const textEl = document.getElementById('simDrawerCommentText');
      if (userEl) userEl.value = stateSnapshot.chosenPlayer.uniqueId;
      const eligible = allPlayers.filter(p => p.status === 'active' && p.id !== stateSnapshot.chosenPlayer.id && !p.hasShield);
      if (textEl) textEl.value = eligible.length > 0 ? `${eligible[0].playerNumber}` : '2';
    });
  }

  // Drawer Game Controls
  const btnDrawerToggleJoin = document.getElementById('btnDrawerToggleJoin');
  if (btnDrawerToggleJoin) btnDrawerToggleJoin.addEventListener('click', async () => {
    if (BACKEND_URL) { const d = await apiPost('/control/join', {}); btnDrawerToggleJoin.textContent = d.isJoinOpen ? '🔒 إغلاق الانضمام' : '🔓 فتح الانضمام'; return; }
    if (settings) { settings.isJoinOpen = !settings.isJoinOpen; saveDemoState(); if (bc) bc.postMessage({ type: 'settings_updated', settings }); }
  });

  const btnDrawerNextRound = document.getElementById('btnDrawerNextRound');
  if (btnDrawerNextRound) btnDrawerNextRound.addEventListener('click', async () => {
    if (BACKEND_URL) { await apiPost('/control/round/next'); return; }
    if (stateSnapshot) { stateSnapshot.roundNumber = (stateSnapshot.roundNumber || 1) + 1; stateSnapshot.state = 'READY'; updateStatusSummary(); saveDemoState(); if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot }); }
  });

  const btnDrawerFinalRound = document.getElementById('btnDrawerFinalRound');
  if (btnDrawerFinalRound) btnDrawerFinalRound.addEventListener('click', async () => {
    if (!confirm('بدء الحسم النهائي؟')) return;
    if (BACKEND_URL) { await apiPost('/control/round/final'); return; }
    if (stateSnapshot) { stateSnapshot.state = 'FINAL_ROUND'; saveDemoState(); if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot }); }
  });

  const btnDrawerCancelElim = document.getElementById('btnDrawerCancelElim');
  if (btnDrawerCancelElim) btnDrawerCancelElim.addEventListener('click', async () => {
    if (BACKEND_URL) { await apiPost('/control/elimination/cancel'); return; }
    if (stateSnapshot) { stateSnapshot.state = 'READY'; stateSnapshot.targetPlayer = null; saveDemoState(); if (bc) bc.postMessage({ type: 'state_updated', snapshot: stateSnapshot }); }
  });

  const btnDrawerPauseTimer = document.getElementById('btnDrawerPauseTimer');
  if (btnDrawerPauseTimer) btnDrawerPauseTimer.addEventListener('click', async () => { if (BACKEND_URL) await apiPost('/control/timer/pause'); });

  const btnDrawerResumeTimer = document.getElementById('btnDrawerResumeTimer');
  if (btnDrawerResumeTimer) btnDrawerResumeTimer.addEventListener('click', async () => { if (BACKEND_URL) await apiPost('/control/timer/resume'); });

  const btnDrawerExtendTimer = document.getElementById('btnDrawerExtendTimer');
  if (btnDrawerExtendTimer) btnDrawerExtendTimer.addEventListener('click', async () => {
    if (BACKEND_URL) { await apiPost('/control/timer/extend', { seconds: 15 }); return; }
    appendLogEntry({ timestamp: new Date().toISOString(), type: 'TIMER_EXTEND', message: '⏳ تمديد +15 ثانية (محاكاة)' });
  });

  const btnDrawerResetGame = document.getElementById('btnDrawerResetGame');
  if (btnDrawerResetGame) btnDrawerResetGame.addEventListener('click', async () => {
    if (!confirm('إعادة تعيين اللعبة؟')) return;
    if (BACKEND_URL) { await apiPost('/control/game/reset'); return; }
    allPlayers = []; if (stateSnapshot) { stateSnapshot.state = 'WAITING_FOR_PLAYERS'; stateSnapshot.roundNumber = 1; stateSnapshot.chosenPlayer = null; stateSnapshot.targetPlayer = null; }
    updateUI(); saveDemoState(); if (bc) bc.postMessage({ type: 'players_updated', players: [] });
    alert('🧹 تمت إعادة تعيين اللعبة');
  });

  // Drawer Connect TikTok (direct connect from drawer)
  const btnDrawerConnect = document.getElementById('btnDrawerConnect');
  if (btnDrawerConnect) {
    btnDrawerConnect.addEventListener('click', async () => {
      const userInput = document.getElementById('drawerTiktokUser');
      const username = (userInput?.value || '').trim().replace(/^@/, '');
      if (!username) { alert('أدخل اسم الحساب'); return; }
      const statusEl = document.getElementById('drawerTiktokStatusText');
      if (statusEl) statusEl.innerHTML = `<span style="color:#f59e0b;">⏳ جاري الاتصال بـ @${username}...</span>`;
      if (BACKEND_URL) {
        const data = await apiPost('/tiktok/connect', { username });
        if (!data.success && statusEl) statusEl.innerHTML = `<span style="color:#ef4444;">❌ ${data.error || 'فشل الاتصال'}</span>`;
        return;
      }
      setTimeout(() => {
        if (statusEl) statusEl.innerHTML = `<span style="color:#10b981;">✅ تم الاتصال بوضع المحاكاة: @${username}</span>`;
        const st = { status: 'connected', username, roomInfo: { viewerCount: Math.floor(Math.random() * 300) + 50 } };
        if (bc) bc.postMessage({ type: 'tiktok_status', status: st });
        appendLogEntry({ timestamp: new Date().toISOString(), type: 'TIKTOK_CONNECTED', message: `🟢 ربط @${username} (محاكاة)` });
      }, 600);
    });
  }

  const btnDrawerDisconnect = document.getElementById('btnDrawerDisconnect');
  if (btnDrawerDisconnect) {
    btnDrawerDisconnect.addEventListener('click', async () => {
      if (BACKEND_URL) await apiPost('/tiktok/disconnect');
      const statusEl = document.getElementById('drawerTiktokStatusText');
      if (statusEl) statusEl.innerHTML = `<span style="color:#9ca3af;">⚪ تم قطع الاتصال</span>`;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Settings Form
  // ─────────────────────────────────────────────────────────────
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updated = {
        joinKeyword: settingJoinKeyword?.value.trim() || 'تم',
        maxPlayers: parseInt(settingMaxPlayers?.value, 10) || 30,
        timeoutBehavior: settingTimeoutBehavior?.value || 'skip',
        timers: {
          targetSelectDuration: parseInt(settingTargetDuration?.value, 10) || 20,
          defenseDuration: parseInt(settingDefenseDuration?.value, 10) || 30
        },
        gifts: {
          defense:  { ...(settings?.gifts?.defense),  minCoins: parseInt(settingDefMinCoins?.value, 10)   || 1   },
          rejoin:   { ...(settings?.gifts?.rejoin),   minCoins: parseInt(settingRejoinMinCoins?.value, 10) || 5  },
          help:     { ...(settings?.gifts?.help),     minCoins: parseInt(settingHelpMinCoins?.value, 10)   || 16  },
          shield:   { ...(settings?.gifts?.shield),   minCoins: parseInt(settingShieldMinCoins?.value, 10) || 30 },
          finalRound:      { ...(settings?.gifts?.finalRound)      },
          winnerChallenge: { ...(settings?.gifts?.winnerChallenge) }
        }
      };
      if (BACKEND_URL) {
        await apiPost('/settings', updated);
      } else {
        settings = { ...settings, ...updated };
        if (stateSnapshot) stateSnapshot.settings = settings;
        saveDemoState();
        if (bc) bc.postMessage({ type: 'settings_updated', settings });
      }
      alert('✅ تم حفظ الإعدادات بنجاح!');
    });
  }

  // Drawer Settings Form
  const drawerSettingsForm = document.getElementById('drawerSettingsForm');
  if (drawerSettingsForm) {
    drawerSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updated = {
        joinKeyword: document.getElementById('setDrawerJoinKw')?.value.trim() || 'تم',
        maxPlayers: parseInt(document.getElementById('setDrawerMaxPlayers')?.value, 10) || 30,
        timeoutBehavior: document.getElementById('setDrawerTimeout')?.value || 'skip',
        timers: {
          targetSelectDuration: parseInt(document.getElementById('setDrawerTargetSec')?.value, 10) || 20,
          defenseDuration: parseInt(document.getElementById('setDrawerDefSec')?.value, 10) || 30
        }
      };
      if (BACKEND_URL) {
        await apiPost('/settings', updated);
      } else {
        if (settings) { settings = { ...settings, ...updated }; if (stateSnapshot) stateSnapshot.settings = settings; saveDemoState(); if (bc) bc.postMessage({ type: 'settings_updated', settings }); }
      }
      alert('✅ تم حفظ الإعدادات!');
    });
  }

  function populateSettingsForm() {
    if (!settings) return;
    if (settingJoinKeyword)     settingJoinKeyword.value     = settings.joinKeyword || 'تم';
    if (settingMaxPlayers)      settingMaxPlayers.value      = settings.maxPlayers  || 30;
    if (settingTimeoutBehavior) settingTimeoutBehavior.value = settings.timeoutBehavior || 'skip';
    if (settingTargetDuration)  settingTargetDuration.value  = settings.timers?.targetSelectDuration || 20;
    if (settingDefenseDuration) settingDefenseDuration.value = settings.timers?.defenseDuration || 30;
    if (settingDefMinCoins)     settingDefMinCoins.value     = settings.gifts?.defense?.minCoins  || 1;
    if (settingRejoinMinCoins)  settingRejoinMinCoins.value  = settings.gifts?.rejoin?.minCoins   || 5;
    if (settingHelpMinCoins)    settingHelpMinCoins.value    = settings.gifts?.help?.minCoins     || 16;
    if (settingShieldMinCoins)  settingShieldMinCoins.value  = settings.gifts?.shield?.minCoins   || 30;

    // Drawer settings
    const setDrawerJoinKw = document.getElementById('setDrawerJoinKw');
    if (setDrawerJoinKw) setDrawerJoinKw.value = settings.joinKeyword || 'تم';
    const setDrawerMaxPlayers = document.getElementById('setDrawerMaxPlayers');
    if (setDrawerMaxPlayers) setDrawerMaxPlayers.value = settings.maxPlayers || 30;
    const setDrawerTimeout = document.getElementById('setDrawerTimeout');
    if (setDrawerTimeout) setDrawerTimeout.value = settings.timeoutBehavior || 'skip';
    const setDrawerTargetSec = document.getElementById('setDrawerTargetSec');
    if (setDrawerTargetSec) setDrawerTargetSec.value = settings.timers?.targetSelectDuration || 20;
    const setDrawerDefSec = document.getElementById('setDrawerDefSec');
    if (setDrawerDefSec) setDrawerDefSec.value = settings.timers?.defenseDuration || 30;
  }

  // ─────────────────────────────────────────────────────────────
  // Player Management
  // ─────────────────────────────────────────────────────────────
  if (addPlayerForm) {
    addPlayerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickname = addNickname?.value.trim();
      const uniqueId = (addUniqueId?.value || '').trim().replace(/^@/, '');
      const playerNumber = addPlayerNumber?.value ? parseInt(addPlayerNumber.value, 10) : null;
      if (!nickname) return;
      if (BACKEND_URL) {
        await apiPost('/players/add', { nickname, uniqueId, playerNumber });
      } else {
        const assigned = playerNumber || (allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.playerNumber || 0)) + 1 : 1);
        const giftList = ['lion', 'heart', 'cap', 'rocket', 'rose', 'trophy', 'pearl', 'car'];
        allPlayers.push({ id: `p_${Date.now()}`, playerNumber: assigned, nickname, uniqueId: uniqueId || `user_${assigned}`, status: 'active', hasShield: false, coins: 0, killsCount: 0, profilePictureUrl: `assets/gifts/${giftList[assigned % giftList.length]}.png` });
        updateUI(); saveDemoState();
        if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
        alert(`✅ تمت إضافة ${nickname} (#${assigned})`);
      }
      if (addNickname) addNickname.value = '';
      if (addUniqueId) addUniqueId.value = '';
      if (addPlayerNumber) addPlayerNumber.value = '';
    });
  }

  // Drawer Add Player Form
  const drawerAddPlayerForm = document.getElementById('drawerAddPlayerForm');
  if (drawerAddPlayerForm) {
    drawerAddPlayerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickEl = document.getElementById('drawerAddNick');
      const userEl = document.getElementById('drawerAddUser');
      const nickname = (nickEl?.value || '').trim();
      const uniqueId = (userEl?.value || '').trim().replace(/^@/, '');
      if (!nickname) return;
      if (BACKEND_URL) {
        await apiPost('/players/add', { nickname, uniqueId });
      } else {
        const assigned = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.playerNumber || 0)) + 1 : 1;
        const giftList = ['lion', 'heart', 'cap', 'rocket', 'rose'];
        allPlayers.push({ id: `p_${Date.now()}`, playerNumber: assigned, nickname, uniqueId: uniqueId || `user_${assigned}`, status: 'active', hasShield: false, coins: 0, killsCount: 0, profilePictureUrl: `assets/gifts/${giftList[assigned % giftList.length]}.png` });
        updateUI(); saveDemoState();
        if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
      }
      if (nickEl) nickEl.value = '';
      if (userEl) userEl.value = '';
    });
  }

  function renderPlayersTable() {
    if (playersTableBody) {
      playersTableBody.innerHTML = allPlayers.map(p => {
        const statusText = p.status === 'eliminated' ? 'مستبعد ☠️' : (p.hasShield || p.status === 'immune') ? 'محصن 🛡️' : 'نشط 🟢';
        return `<tr>
          <td><strong>#${p.playerNumber}</strong> <button class="btn btn-secondary" style="padding:2px 6px;font-size:11px;" onclick="promptChangeNum('${p.id}')">تعديل</button></td>
          <td><img class="table-avatar" src="${p.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.playerNumber}" alt=""> <strong>${escapeHtml(p.nickname)}</strong></td>
          <td style="color:var(--text-muted);">@${escapeHtml(p.uniqueId)}</td>
          <td><span>${statusText}</span></td>
          <td>
            ${p.status === 'eliminated' ? `<button class="btn btn-success" style="padding:4px 10px;font-size:12px;" onclick="revivePlayer('${p.id}')">إعادة 🔄</button>` : `<button class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="toggleShield('${p.id}', ${!p.hasShield})">${p.hasShield ? 'إلغاء الحصانة 🔓' : 'منح حصانة 🛡️'}</button>`}
            <button class="btn btn-danger" style="padding:4px 8px;font-size:12px;" onclick="deletePlayer('${p.id}')">حذف 🗑️</button>
          </td>
        </tr>`;
      }).join('');
    }

    // Drawer players table
    const drawerTbl = document.getElementById('drawerPlayersTableBody');
    if (drawerTbl) {
      drawerTbl.innerHTML = allPlayers.map(p => {
        const st = p.status === 'eliminated' ? 'مستبعد ☠️' : (p.hasShield || p.status === 'immune') ? 'محصن 🛡️' : 'نشط 🟢';
        return `<tr>
          <td><strong>#${p.playerNumber}</strong></td>
          <td>${escapeHtml(p.nickname)}</td>
          <td>${st}</td>
          <td>${p.status === 'eliminated' ? `<button onclick="revivePlayer('${p.id}')" style="font-size:11px;padding:2px 6px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;">إعادة</button>` : ''}
            <button onclick="deletePlayer('${p.id}')" style="font-size:11px;padding:2px 6px;background:#ef4444;color:#fff;border:none;border-radius:6px;cursor:pointer;">حذف</button></td>
        </tr>`;
      }).join('');
    }

    const drawerCount = document.getElementById('drawerPlayerCount');
    if (drawerCount) drawerCount.textContent = allPlayers.filter(p => p.status !== 'eliminated').length;
  }

  window.deletePlayer = async (id) => {
    if (!confirm('حذف هذا اللاعب؟')) return;
    if (BACKEND_URL) { await apiDelete(`/players/${id}`); return; }
    allPlayers = allPlayers.filter(p => p.id !== id);
    updateUI(); saveDemoState();
    if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
  };

  window.revivePlayer = async (id) => {
    if (BACKEND_URL) { await apiPost(`/players/${id}/revive`); return; }
    const p = allPlayers.find(x => x.id === id);
    if (p) { p.status = 'active'; updateUI(); saveDemoState(); if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers }); }
  };

  window.toggleShield = async (id, hasShield) => {
    if (BACKEND_URL) { await apiPost(`/players/${id}/shield`, { hasShield, rounds: 1 }); return; }
    const p = allPlayers.find(x => x.id === id);
    if (p) { p.hasShield = hasShield; p.status = hasShield ? 'immune' : 'active'; updateUI(); saveDemoState(); if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers }); }
  };

  window.promptChangeNum = async (id) => {
    const newNum = prompt('أدخل رقم اللاعب الجديد:');
    if (!newNum || isNaN(newNum)) return;
    const num = parseInt(newNum, 10);
    if (BACKEND_URL) { const d = await apiPost(`/players/${id}/number`, { playerNumber: num }); if (!d.success) alert(d.reason); return; }
    const p = allPlayers.find(x => x.id === id);
    if (p) { p.playerNumber = num; updateUI(); saveDemoState(); if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers }); }
  };

  function updateCommentUserDropdown() {
    [simCommentUser, document.getElementById('simDrawerCommentUser')].forEach(sel => {
      if (!sel) return;
      const cur = sel.value;
      sel.innerHTML = allPlayers.map(p => `<option value="${p.uniqueId}">#${p.playerNumber} - ${escapeHtml(p.nickname)} (@${p.uniqueId})</option>`).join('');
      if (cur) sel.value = cur;
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Logs
  // ─────────────────────────────────────────────────────────────
  function appendLogEntry(entry) {
    [logsContainer, document.getElementById('drawerLogsContainer')].forEach(el => {
      if (!el) return;
      const row = document.createElement('div');
      row.className = 'log-entry';
      const timeStr = new Date(entry.timestamp).toLocaleTimeString('ar-SA');
      row.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-msg">${escapeHtml(entry.message)}</span>`;
      el.prepend(row);
      // حفاظاً على الذاكرة
      while (el.children.length > 200) el.removeChild(el.lastChild);
    });
  }

  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', async () => {
      if (BACKEND_URL) await apiDelete('/logs');
      if (logsContainer) logsContainer.innerHTML = '';
      const drawerLogs = document.getElementById('drawerLogsContainer');
      if (drawerLogs) drawerLogs.innerHTML = '';
    });
  }

  const btnDrawerClearLogs = document.getElementById('btnDrawerClearLogs');
  if (btnDrawerClearLogs) {
    btnDrawerClearLogs.addEventListener('click', async () => {
      if (BACKEND_URL) await apiDelete('/logs');
      if (logsContainer) logsContainer.innerHTML = '';
      const drawerLogs = document.getElementById('drawerLogsContainer');
      if (drawerLogs) drawerLogs.innerHTML = '';
    });
  }

  async function loadInitialLogs() {
    const data = await apiGet('/logs?limit=50');
    if (data?.logs) {
      if (logsContainer) logsContainer.innerHTML = '';
      data.logs.reverse().forEach(appendLogEntry);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Gift Configuration & Wheel Appearance
  // ─────────────────────────────────────────────────────────────
  const adminGiftConfigContainer = document.getElementById('adminGiftConfigContainer');
  const adminWheelThemeSelect    = document.getElementById('adminWheelThemeSelect');
  const adminWheelSpinDuration   = document.getElementById('adminWheelSpinDuration');
  const adminWheelShowAvatars    = document.getElementById('adminWheelShowAvatars');
  const adminWheelShowNames      = document.getElementById('adminWheelShowNames');
  const btnAdminApplyWheel       = document.getElementById('btnAdminApplyWheel');

  // Also check drawer wheel controls
  const wheelThemeSelect   = document.getElementById('wheelThemeSelect');
  const wheelSpinDuration  = document.getElementById('wheelSpinDuration');
  const wheelShowAvatars   = document.getElementById('wheelShowAvatars');
  const wheelShowNames     = document.getElementById('wheelShowNames');
  const btnApplyWheelConfig = document.getElementById('btnApplyWheelConfig');

  let adminGiftCatalog = [
    { id: 'rose',         nameAr: 'وردة',              emoji: '🌹', coins: 1,     image: 'assets/gifts/rose.png'         },
    { id: 'heart',        nameAr: 'قلب الحب',          emoji: '💖', coins: 49,    image: 'assets/gifts/heart.png'        },
    { id: 'finger_heart', nameAr: 'قلب بالأصابع',      emoji: '🫰', coins: 5,     image: 'assets/gifts/finger_heart.png' },
    { id: 'hand_heart',   nameAr: 'قلب باليدين',       emoji: '💗', coins: 100,   image: 'assets/gifts/hand_heart.png'   },
    { id: 'sunglasses',   nameAr: 'نظارات شمسية',     emoji: '🕶️', coins: 199,   image: 'assets/gifts/sunglasses.png'   },
    { id: 'cap',          nameAr: 'كاب تيك توك',       emoji: '🧢', coins: 99,    image: 'assets/gifts/cap.png'          },
    { id: 'perfume',      nameAr: 'عطر فاخر',          emoji: '🧴', coins: 20,    image: 'assets/gifts/perfume.png'      },
    { id: 'car',          nameAr: 'سيارة رياضية',      emoji: '🏎️', coins: 10000, image: 'assets/gifts/car.png'          },
    { id: 'lion',         nameAr: 'أسد تيك توك',       emoji: '🦁', coins: 29999, image: 'assets/gifts/lion.png'         },
    { id: 'crown',        nameAr: 'تاج ذهبي',          emoji: '👑', coins: 1000,  image: 'assets/gifts/crown.png'        },
    { id: 'rocket',       nameAr: 'صاروخ',             emoji: '🚀', coins: 4888,  image: 'assets/gifts/rocket.png'       },
    { id: 'galaxy',       nameAr: 'مجرة كونية',        emoji: '🌌', coins: 10000, image: 'assets/gifts/galaxy.png'       },
    { id: 'trophy',       nameAr: 'كأس البطولة',       emoji: '🏆', coins: 7000,  image: 'assets/gifts/trophy.png'       },
    { id: 'pearl',        nameAr: 'لؤلؤة البحر',       emoji: '🦪', coins: 800,   image: 'assets/gifts/pearl.png'        },
    { id: 'gold_mine',    nameAr: 'كنز الذهب',         emoji: '🪙', coins: 1000,  image: 'assets/gifts/gold_mine.png'    },
    { id: 'ferris_wheel', nameAr: 'عجلة الملاهي',      emoji: '🎡', coins: 3000,  image: 'assets/gifts/ferris_wheel.png' },
    { id: 'motorcycle',   nameAr: 'دراجة نارية',       emoji: '🏍️', coins: 2988,  image: 'assets/gifts/motorcycle.png'   },
    { id: 'speedboat',    nameAr: 'يخت سريع',          emoji: '🚤', coins: 1888,  image: 'assets/gifts/speedboat.png'    },
    { id: 'confetti',     nameAr: 'احتفال ملون',       emoji: '🎉', coins: 100,   image: 'assets/gifts/confetti.png'     },
    { id: 'tiktok',       nameAr: 'شعار تيك توك',      emoji: '🎵', coins: 1,     image: 'assets/gifts/tiktok.png'       }
  ];

  async function loadGiftCatalog() {
    const data = await apiGet('/gifts/catalog');
    if (data?.gifts && data.gifts.length > 0) { adminGiftCatalog = data.gifts; renderAdminGiftConfig(); }
  }
  // Load catalog immediately if possible
  if (BACKEND_URL) loadGiftCatalog().catch(() => renderAdminGiftConfig());
  else renderAdminGiftConfig();

  function getGiftInfo(idOrName) {
    if (!idOrName) return adminGiftCatalog[0];
    return adminGiftCatalog.find(g => g.id === idOrName || g.nameAr?.toLowerCase() === String(idOrName).toLowerCase()) || { id: idOrName, nameAr: idOrName, emoji: '🎁', coins: 1, image: `assets/gifts/${idOrName}.png` };
  }

  function renderAdminGiftConfig() {
    const container = adminGiftConfigContainer || document.getElementById('giftConfigContainer');
    if (!container || !settings) return;
    const gifts = settings.gifts || {};
    const categories = [
      { key: 'defense',        label: '🛡️ هدية الدفاع عن النفس',    desc: 'يرسلها اللاعب لإنقاذ نفسه من الإقصاء'      },
      { key: 'shield',         label: '🕶️ هدية الحصانة',             desc: 'تمنح درعاً يحمي اللاعب من الاستهداف'        },
      { key: 'rejoin',         label: '🔄 هدية العودة إلى اللعبة',   desc: 'يرسلها اللاعب المستبعد للعودة'               },
      { key: 'help',           label: '❤️ هدية المساعدة / الإنقاذ', desc: 'يرسلها مشاهد لإنقاذ لاعب مستبعد'            },
      { key: 'finalRound',     label: '🚀 هدية حسم الجولة',          desc: 'حسم المواجهة النهائية فوراً'                  },
      { key: 'winnerChallenge',label: '👑 هدية تحدي الفائز',         desc: 'تحدي بطل الروليت في مواجهة جديدة'            }
    ];

    container.innerHTML = categories.map(cat => {
      const cur = gifts[cat.key] || {};
      const giftInfo = getGiftInfo(cur.giftId || cur.giftName || 'rose');
      return `
        <div class="gift-config-card">
          <div class="gift-config-header"><span class="gift-config-title">${cat.label}</span></div>
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
              const isSelected = cur.giftId === g.id || (!cur.giftId && cur.giftName === g.nameAr);
              return `<button type="button" class="gift-item-btn ${isSelected ? 'selected' : ''}" onclick="window.adminSelectGift('${cat.key}', '${g.id}', '${g.nameAr}', ${g.coins})">
                <img src="${g.image}" alt="${g.nameAr}"><span>${g.nameAr}</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.admin-cat-coins').forEach(inp => {
      inp.addEventListener('change', async (e) => {
        const catKey = e.target.dataset.cat;
        const newCoins = parseInt(e.target.value, 10) || 1;
        if (!settings.gifts) settings.gifts = {};
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
    if (BACKEND_URL) {
      await apiPost('/settings', { gifts: settings.gifts });
    } else {
      if (stateSnapshot) stateSnapshot.settings = settings;
      saveDemoState();
      if (bc) bc.postMessage({ type: 'settings_updated', settings });
    }
  }

  function populateWheelConfig() {
    const wc = settings?.wheelConfig;
    if (!wc) return;
    if (adminWheelThemeSelect)  adminWheelThemeSelect.value  = wc.theme           || 'casino';
    if (adminWheelSpinDuration) adminWheelSpinDuration.value = wc.spinDuration    || 6500;
    if (adminWheelShowAvatars)  adminWheelShowAvatars.checked = wc.showPlayerAvatars !== false;
    if (adminWheelShowNames)    adminWheelShowNames.checked   = wc.showPlayerNames  !== false;
    // Drawer wheel selectors
    if (wheelThemeSelect)   wheelThemeSelect.value   = wc.theme        || 'casino';
    if (wheelSpinDuration)  wheelSpinDuration.value  = wc.spinDuration || 6500;
    if (wheelShowAvatars)   wheelShowAvatars.checked = wc.showPlayerAvatars !== false;
    if (wheelShowNames)     wheelShowNames.checked   = wc.showPlayerNames   !== false;
  }

  async function applyWheelConfig(selTheme, selDur, selAv, selNames) {
    const wheelConfig = {
      theme: selTheme?.value || 'casino',
      spinDuration: parseInt(selDur?.value, 10) || 6500,
      showPlayerAvatars: selAv ? selAv.checked : true,
      showPlayerNames:   selNames ? selNames.checked : true
    };
    if (BACKEND_URL) {
      await apiPost('/settings', { wheelConfig });
    } else {
      if (settings) settings.wheelConfig = wheelConfig;
      if (stateSnapshot) stateSnapshot.settings = settings;
      saveDemoState();
      if (bc) bc.postMessage({ type: 'settings_updated', settings });
    }
    alert('✅ تم تحديث شكل العجلة! 🎡');
  }

  if (btnAdminApplyWheel) btnAdminApplyWheel.addEventListener('click', () => applyWheelConfig(adminWheelThemeSelect, adminWheelSpinDuration, adminWheelShowAvatars, adminWheelShowNames));
  if (btnApplyWheelConfig) btnApplyWheelConfig.addEventListener('click', () => applyWheelConfig(wheelThemeSelect, wheelSpinDuration, wheelShowAvatars, wheelShowNames));

  // ─────────────────────────────────────────────────────────────
  // Status Summary
  // ─────────────────────────────────────────────────────────────
  function updateStatusSummary() {
    const statusBox = document.getElementById('stateSummaryText');
    if (statusBox && stateSnapshot) {
      const active = allPlayers.filter(p => p.status === 'active' || p.status === 'immune').length;
      const elim   = allPlayers.filter(p => p.status === 'eliminated').length;
      statusBox.textContent = `الحالة: ${stateSnapshot.state || '-'} | الجولة: #${stateSnapshot.roundNumber || 1} | نشط: ${active} | مستبعد: ${elim}`;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // General UI Update
  // ─────────────────────────────────────────────────────────────
  function updateUI() {
    populateSettingsForm();
    renderPlayersTable();
    updateCommentUserDropdown();
    updateStatusSummary();
    renderAdminGiftConfig();
    populateWheelConfig();
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
  }

  // ─────────────────────────────────────────────────────────────
  // Start!
  // ─────────────────────────────────────────────────────────────
  initSocket();
});
