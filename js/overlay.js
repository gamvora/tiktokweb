// ═══════════════════════════════════════════════════════════════
// روليت تيك توك لايف - شاشة البث الرئيسية
// يتصل تلقائياً بالـ backend على Railway أو يعمل في وضع Demo
// ═══════════════════════════════════════════════════════════════

// ── تحديد عنوان الـ backend (من js/backend.js المشترك) ─────
const BACKEND_URL = window.BACKEND_URL || '';

// في وضع Vercel (بدون خادم منفصل) يعمل محرّك اللعبة داخل المتصفح
// وتُجلب أحداث TikTok من دوال Vercel مباشرة.
const STANDALONE_MODE = !BACKEND_URL;

// ── متغيرات Socket.IO / المحرّك المحلي ─────────────────────
let socket = null;
let socketConnected = false;
let localEngine = null;
let liveClient = null;
let currentUsername = '';

document.addEventListener('DOMContentLoaded', () => {
  // إنشاء BroadcastChannel للتواصل مع نافذة Admin في نفس المتصفح
  const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tiktok_roulette_sync') : null;

  if (bc) {
    bc.onmessage = (e) => {
      const data = e.data;
      if (!data) return;
      if (data.type === 'players_updated') {
        allPlayers = data.players || [];
        wheel.setPlayers(allPlayers);
        renderPlayerLists();
        renderDrawerPlayersTable();
        updateSpinButtonState();
      } else if (data.type === 'state_updated') {
        currentSnapshot = data.snapshot;
        renderHeader();
        handleStateVisuals(data.snapshot);
      } else if (data.type === 'start_spin') {
        if (data.chosenPlayer) {
          hideAllModals();
          setBanner(`🎡 بدأ تدوير الروليت لاختيار: ${data.chosenPlayer.nickname}`);
          wheel.spinToPlayer(data.chosenPlayer, () => {
            currentSnapshot = currentSnapshot || {};
            currentSnapshot.chosenPlayer = data.chosenPlayer;
            showTurnModal(data.chosenPlayer);
            setTimeout(() => {
              if (turnModal) turnModal.classList.remove('active');
              currentSnapshot.state = 'SELECTING_TARGET';
              showTargetSelectionModal(data.chosenPlayer);
            }, 2400);
          });
        }
      } else if (data.type === 'sim_comment') {
        if (data.commentText) {
          const num = parseInt(data.commentText, 10);
          if (!isNaN(num)) window.selectTargetPlayer(num);
        }
      } else if (data.type === 'sim_gift') {
        renderAll();
      } else if (data.type === 'settings_updated') {
        if (currentSnapshot) currentSnapshot.settings = data.settings;
        applyWheelConfigFromSnapshot();
        renderHeader();
        updateGiftsLegend();
      } else if (data.type === 'tiktok_status') {
        updateTikTokBadge(data.status);
      } else if (data.type === 'game_reset') {
        hideAllModals();
        renderAll();
        setBanner('تمت إعادة تعيين اللعبة. في انتظار الانضمام...');
      }
    };
  }

  const wheel = new (window.__RouletteWheelClass || RouletteWheel)('rouletteCanvas');

  // ── DOM Elements ─────────────────────────────────────────
  const activePlayersList = document.getElementById('activePlayersList');
  const eliminatedPlayersList = document.getElementById('eliminatedPlayersList');
  const activeCountEl = document.getElementById('activeCount');
  const eliminatedCountEl = document.getElementById('eliminatedCount');
  const roundBadgeEl = document.getElementById('roundBadge');
  const joinBadgeEl = document.getElementById('joinBadge');
  const shieldGiftBadge = document.getElementById('shieldGiftBadge');
  const shieldGiftBadgeImg = document.getElementById('shieldGiftBadgeImg');
  const shieldGiftBadgeText = document.getElementById('shieldGiftBadgeText');
  const tiktokBadgeEl = document.getElementById('tiktokBadge');
  const actionBannerText = document.getElementById('actionBannerText');
  const btnToggleSound = document.getElementById('btnToggleSound');
  const btnOpenAdminDrawer = document.getElementById('btnOpenAdminDrawer');
  const btnMainSpinRoulette = document.getElementById('btnMainSpinRoulette');
  const joinInstructionsCard = document.getElementById('joinInstructionsCard');
  const joinKeywordHighlight = document.getElementById('joinKeywordHighlight');

  // Gifts Legend
  const legendDefImg = document.getElementById('legendDefImg');
  const legendDefText = document.getElementById('legendDefText');
  const legendShieldImg = document.getElementById('legendShieldImg');
  const legendShieldText = document.getElementById('legendShieldText');
  const legendRejoinImg = document.getElementById('legendRejoinImg');
  const legendRejoinText = document.getElementById('legendRejoinText');
  const legendFinalImg = document.getElementById('legendFinalImg');
  const legendFinalText = document.getElementById('legendFinalText');

  // Modals
  const turnModal = document.getElementById('turnModal');
  const turnAvatar = document.getElementById('turnAvatar');
  const turnPlayerNum = document.getElementById('turnPlayerNum');
  const turnPlayerName = document.getElementById('turnPlayerName');
  const targetSelectionModal = document.getElementById('targetSelectionModal');
  const tsChooserAvatar = document.getElementById('tsChooserAvatar');
  const tsChooserNum = document.getElementById('tsChooserNum');
  const tsChooserName = document.getElementById('tsChooserName');
  const tsTimerProgress = document.getElementById('tsTimerProgress');
  const tsTimerDigits = document.getElementById('tsTimerDigits');
  const tsPlayerGrid = document.getElementById('tsPlayerGrid');
  const confrontationModal = document.getElementById('confrontationModal');
  const selectorAvatar = document.getElementById('selectorAvatar');
  const selectorName = document.getElementById('selectorName');
  const selectorNum = document.getElementById('selectorNum');
  const targetAvatar = document.getElementById('targetAvatar');
  const targetName = document.getElementById('targetName');
  const targetNum = document.getElementById('targetNum');
  const defenseGiftText = document.getElementById('defenseGiftText');
  const defenseGiftImg = document.getElementById('defenseGiftImg');
  const eliminationModal = document.getElementById('eliminationModal');
  const elimPlayerAvatar = document.getElementById('elimPlayerAvatar');
  const elimPlayerNum = document.getElementById('elimPlayerNum');
  const elimPlayerName = document.getElementById('elimPlayerName');
  const elimPlayerUser = document.getElementById('elimPlayerUser');
  const elimByBox = document.getElementById('elimByBox');
  const elimByAvatar = document.getElementById('elimByAvatar');
  const elimByName = document.getElementById('elimByName');
  const elimByNum = document.getElementById('elimByNum');
  const elimRejoinImg = document.getElementById('elimRejoinImg');
  const elimRejoinDetail = document.getElementById('elimRejoinDetail');
  const winnerModal = document.getElementById('winnerModal');
  const winnerAvatar = document.getElementById('winnerAvatar');
  const winnerName = document.getElementById('winnerName');
  const winnerUser = document.getElementById('winnerUser');
  const winnerNum = document.getElementById('winnerNum');
  const resultModal = document.getElementById('resultModal');
  const resultTitle = document.getElementById('resultTitle');
  const resultSubtitle = document.getElementById('resultSubtitle');
  const resultIcon = document.getElementById('resultIcon');
  const timerCircleProgress = document.getElementById('timerCircleProgress');
  const timerDigits = document.getElementById('timerDigits');

  // Admin Drawer
  const adminDrawerModal = document.getElementById('adminDrawerModal');
  const btnCloseAdminDrawer = document.getElementById('btnCloseAdminDrawer');
  const drawerStateBadge = document.getElementById('drawerStateBadge');
  const drawerPlayerCount = document.getElementById('drawerPlayerCount');
  const drawerTiktokUser = document.getElementById('drawerTiktokUser');
  const btnDrawerConnect = document.getElementById('btnDrawerConnect');
  const btnDrawerDisconnect = document.getElementById('btnDrawerDisconnect');
  const drawerTiktokStatusText = document.getElementById('drawerTiktokStatusText');
  const btnDrawerToggleJoin = document.getElementById('btnDrawerToggleJoin');
  const btnDrawerNextRound = document.getElementById('btnDrawerNextRound');
  const btnDrawerFinalRound = document.getElementById('btnDrawerFinalRound');
  const btnDrawerCancelElim = document.getElementById('btnDrawerCancelElim');
  const btnDrawerPauseTimer = document.getElementById('btnDrawerPauseTimer');
  const btnDrawerResumeTimer = document.getElementById('btnDrawerResumeTimer');
  const btnDrawerExtendTimer = document.getElementById('btnDrawerExtendTimer');
  const btnDrawerResetGame = document.getElementById('btnDrawerResetGame');
  const giftConfigContainer = document.getElementById('giftConfigContainer');
  const wheelThemeSelect = document.getElementById('wheelThemeSelect');
  const wheelSpinDuration = document.getElementById('wheelSpinDuration');
  const wheelShowAvatars = document.getElementById('wheelShowAvatars');
  const wheelShowNames = document.getElementById('wheelShowNames');
  const btnApplyWheelConfig = document.getElementById('btnApplyWheelConfig');
  const btnDrawerMockTen = document.getElementById('btnDrawerMockTen');
  const simDrawerJoinNick = document.getElementById('simDrawerJoinNick');
  const simDrawerJoinUser = document.getElementById('simDrawerJoinUser');
  const btnSimDrawerJoin = document.getElementById('btnSimDrawerJoin');
  const simDrawerCommentUser = document.getElementById('simDrawerCommentUser');
  const simDrawerCommentText = document.getElementById('simDrawerCommentText');
  const btnSimDrawerComment = document.getElementById('btnSimDrawerComment');
  const btnSimDrawerAutoTarget = document.getElementById('btnSimDrawerAutoTarget');
  const drawerAddPlayerForm = document.getElementById('drawerAddPlayerForm');
  const drawerAddNick = document.getElementById('drawerAddNick');
  const drawerAddUser = document.getElementById('drawerAddUser');
  const drawerPlayersTableBody = document.getElementById('drawerPlayersTableBody');
  const drawerSettingsForm = document.getElementById('drawerSettingsForm');
  const setDrawerJoinKw = document.getElementById('setDrawerJoinKw');
  const setDrawerMaxPlayers = document.getElementById('setDrawerMaxPlayers');
  const setDrawerTimeout = document.getElementById('setDrawerTimeout');
  const setDrawerTargetSec = document.getElementById('setDrawerTargetSec');
  const setDrawerDefSec = document.getElementById('setDrawerDefSec');
  const setDrawerChallengeSec = document.getElementById('setDrawerChallengeSec');
  const setDrawerFinalSec = document.getElementById('setDrawerFinalSec');
  const setDrawerJoinSec = document.getElementById('setDrawerJoinSec');
  const setDrawerSceneSec = document.getElementById('setDrawerSceneSec');
  const drawerLogsContainer = document.getElementById('drawerLogsContainer');
  const btnDrawerClearLogs = document.getElementById('btnDrawerClearLogs');

  // Welcome / Connect modal
  const welcomeModal = document.getElementById('welcomeModal');
  const welcomeUsername = document.getElementById('welcomeUsername');
  const btnWelcomeConnect = document.getElementById('btnWelcomeConnect');
  const welcomeStatus = document.getElementById('welcomeStatus');
  const btnWelcomeDemo = document.getElementById('btnWelcomeDemo');
  const obsLinkBox = document.getElementById('obsLinkBox');
  const obsLinkInput = document.getElementById('obsLinkInput');
  const btnCopyObsLink = document.getElementById('btnCopyObsLink');
  const btnCopyObsLinkDrawer = document.getElementById('btnCopyObsLinkDrawer');
  const btnDrawerChangeAccount = document.getElementById('btnDrawerChangeAccount');
  const giftTickerTrack = document.getElementById('giftTickerTrack');
  const setDrawerStreamerAvatar = document.getElementById('setDrawerStreamerAvatar');
  const setDrawerStreamerName = document.getElementById('setDrawerStreamerName');
  const setDrawerBgType = document.getElementById('setDrawerBgType');
  const setDrawerBgColor1 = document.getElementById('setDrawerBgColor1');
  const setDrawerBgColor2 = document.getElementById('setDrawerBgColor2');
  const setDrawerBgPattern = document.getElementById('setDrawerBgPattern');

  // Live preview of background on change
  [setDrawerBgType, setDrawerBgColor1, setDrawerBgColor2, setDrawerBgPattern].forEach(el => {
    if (!el) return;
    el.addEventListener('change', () => {
      applyBackground({
        type: setDrawerBgType?.value || 'gradient',
        color1: setDrawerBgColor1?.value || '#0a0612',
        color2: setDrawerBgColor2?.value || '#1a1030',
        pattern: setDrawerBgPattern?.value || 'none'
      });
    });
  });

  // ── State ─────────────────────────────────────────────────
  let currentSnapshot = null;
  let lastVisualState = null;
  let allPlayers = [];
  let currentTimerTotal = 20;
  let currentTargetSelectTotal = 20;
  let soundMuted = false;

  // ── Gift Catalog ──────────────────────────────────────────
  let giftCatalog = [
    { id: 'rose', nameAr: 'وردة', emoji: '🌹', coins: 1, image: 'assets/gifts/rose.png' },
    { id: 'finger_heart', nameAr: 'قلب بالأصابع', emoji: '🫰', coins: 5, image: 'assets/gifts/finger_heart.png' },
    { id: 'perfume', nameAr: 'عطر فاخر', emoji: '🧴', coins: 20, image: 'assets/gifts/perfume.png' },
    { id: 'sunglasses', nameAr: 'نظارات شمسية', emoji: '🕶️', coins: 199, image: 'assets/gifts/sunglasses.png' },
    { id: 'cap', nameAr: 'كاب تيك توك', emoji: '🧢', coins: 99, image: 'assets/gifts/cap.png' },
    { id: 'hand_heart', nameAr: 'قلب باليدين', emoji: '💗', coins: 100, image: 'assets/gifts/hand_heart.png' },
    { id: 'heart', nameAr: 'قلب الحب', emoji: '💖', coins: 49, image: 'assets/gifts/heart.png' },
    { id: 'confetti', nameAr: 'احتفال ملون', emoji: '🎉', coins: 100, image: 'assets/gifts/confetti.png' },
    { id: 'pearl', nameAr: 'لؤلؤة البحر', emoji: '🦪', coins: 800, image: 'assets/gifts/pearl.png' },
    { id: 'crown', nameAr: 'تاج ذهبي', emoji: '👑', coins: 1000, image: 'assets/gifts/crown.png' },
    { id: 'gold_mine', nameAr: 'كنز الذهب', emoji: '🪙', coins: 1000, image: 'assets/gifts/gold_mine.png' },
    { id: 'speedboat', nameAr: 'يخت سريع', emoji: '🚤', coins: 1888, image: 'assets/gifts/speedboat.png' },
    { id: 'motorcycle', nameAr: 'دراجة نارية', emoji: '🏍️', coins: 2988, image: 'assets/gifts/motorcycle.png' },
    { id: 'ferris_wheel', nameAr: 'عجلة الملاهي', emoji: '🎡', coins: 3000, image: 'assets/gifts/ferris_wheel.png' },
    { id: 'rocket', nameAr: 'صاروخ / طائرة نفاثة', emoji: '🚀', coins: 4888, image: 'assets/gifts/rocket.png' },
    { id: 'trophy', nameAr: 'كأس البطولة', emoji: '🏆', coins: 7000, image: 'assets/gifts/trophy.png' },
    { id: 'car', nameAr: 'سيارة رياضية', emoji: '🏎️', coins: 10000, image: 'assets/gifts/car.png' },
    { id: 'galaxy', nameAr: 'مجرة كونية', emoji: '🌌', coins: 10000, image: 'assets/gifts/galaxy.png' },
    { id: 'lion', nameAr: 'أسد تيك توك', emoji: '🦁', coins: 29999, image: 'assets/gifts/lion.png' },
    { id: 'tiktok', nameAr: 'شعار تيك توك', emoji: '🎵', coins: 1, image: 'assets/gifts/tiktok.png' }
  ];

  // جلب كتالوج الهدايا من الخادم (إذا متصل)
  if (BACKEND_URL) {
    fetch(`${BACKEND_URL}/api/gifts/catalog`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.gifts?.length > 0) giftCatalog = d.gifts.map(g => ({
          ...g,
          image: g.image?.startsWith('/') ? `${BACKEND_URL}${g.image}` : (g.image || `assets/gifts/${g.id}.png`)
        }));
        renderGiftConfigTab();
        updateGiftsLegend();
      })
      .catch(() => { renderGiftConfigTab(); updateGiftsLegend(); });
  } else {
    setTimeout(() => { renderGiftConfigTab(); updateGiftsLegend(); }, 100);
  }

  function getGiftInfo(idOrName) {
    if (!idOrName) return giftCatalog[0];
    const match = giftCatalog.find(g =>
      g.id === idOrName ||
      g.nameAr?.toLowerCase() === String(idOrName).toLowerCase() ||
      (g.nameEn && g.nameEn.toLowerCase() === String(idOrName).toLowerCase())
    );
    return match || { id: idOrName, nameAr: idOrName, emoji: '🎁', coins: 1, image: `assets/gifts/${idOrName}.png` };
  }

  // ── Sound ─────────────────────────────────────────────────
  if (btnToggleSound) {
    btnToggleSound.addEventListener('click', () => {
      soundMuted = !soundMuted;
      btnToggleSound.textContent = soundMuted ? '🔇' : '🔊';
      if (window.soundEngine) window.soundEngine.toggleSound(!soundMuted);
    });
  }

  // ── API Helper ────────────────────────────────────────────
  // في وضع Vercel تُوجّه الأوامر إلى محرّك اللعبة المحلي مباشرة،
  // وفي وضع الخادم تُرسل إلى REST API كما كان سابقاً.
  async function apiPost(path, body = {}) {
    if (!BACKEND_URL) return localApi(path, body);
    try {
      const url = BACKEND_URL ? `${BACKEND_URL}/api${path}` : `/api${path}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return res.ok ? res.json() : null;
    } catch (e) {
      return null;
    }
  }

  // ── Local API dispatcher (Vercel / standalone) ─────────────
  function localApi(path, body = {}) {
    if (!localEngine) return null;
    const engine = localEngine;

    // Dynamic player management routes
    let m;
    if ((m = path.match(/^\/players\/(.+)\/revive$/))) {
      const id = decodeURIComponent(m[1]);
      const p = engine.players.find((x) => x.id === id);
      if (p) { p.status = 'active'; engine.persist(); engine.emit('players_updated', engine.players); engine.emit('state_updated', engine.getSnapshot()); }
      allPlayers = engine.players || allPlayers;
      wheel.setPlayers(allPlayers);
      renderAll();
      return { success: true };
    }
    if ((m = path.match(/^\/players\/(.+)\/shield$/))) {
      const id = decodeURIComponent(m[1]);
      const p = engine.players.find((x) => x.id === id);
      if (p) {
        const hasShield = body.hasShield !== undefined ? !!body.hasShield : !p.hasShield;
        p.hasShield = hasShield;
        p.status = hasShield ? 'immune' : 'active';
        if (hasShield) p.shieldRoundsRemaining = body.rounds || 1;
        engine.persist();
        engine.emit('players_updated', engine.players);
        engine.emit('state_updated', engine.getSnapshot());
      }
      allPlayers = engine.players || allPlayers;
      wheel.setPlayers(allPlayers);
      renderAll();
      return { success: true };
    }
    if ((m = path.match(/^\/players\/(.+)\/delete$/))) {
      const id = decodeURIComponent(m[1]);
      engine.players = engine.players.filter((p) => p.id !== id);
      engine.persist();
      engine.emit('players_updated', engine.players);
      engine.emit('state_updated', engine.getSnapshot());
      allPlayers = engine.players || allPlayers;
      wheel.setPlayers(allPlayers);
      renderAll();
      return { success: true };
    }

    switch (path) {
      case '/control/join': {
        const isOpen = body.isOpen !== undefined ? !!body.isOpen : !engine.settings.isJoinOpen;
        engine.settings.isJoinOpen = isOpen;
        engine.persist();
        engine.logActivity('JOIN_TOGGLE', isOpen ? 'تم فتح باب الانضمام للاعبين' : 'تم إغلاق باب الانضمام');
        engine.emit('settings_updated', engine.getPublicSettings());
        engine.emit('state_updated', engine.getSnapshot());
        return { success: true, isJoinOpen: isOpen };
      }
      case '/control/roulette/start': {
        const result = engine.startRoulette();
        if (!result.success) setTimeout(() => alert(result.reason || 'تعذر تشغيل الروليت'), 0);
        return result;
      }
      case '/control/roulette/land':
        engine.landRoulette();
        return { success: true, chosenPlayer: engine.chosenPlayer };
      case '/control/round/next':
        engine.nextRound();
        return { success: true, roundNumber: engine.roundNumber };
      case '/control/round/final':
        engine.startFinalRound();
        return { success: true };
      case '/control/elimination/cancel':
        engine.cancelElimination();
        return { success: true };
      case '/control/timer/pause':
        engine.pauseTimer();
        return { success: true, isPaused: engine.isPaused };
      case '/control/timer/resume':
        engine.resumeTimer();
        return { success: true, isPaused: engine.isPaused };
      case '/control/timer/extend':
        engine.extendTimer(parseInt(body.seconds || 10, 10));
        return { success: true };
      case '/control/game/reset':
        engine.resetGame();
        return { success: true };
      case '/settings':
        engine.updateSettings(body);
        return { success: true, settings: engine.getPublicSettings() };
      case '/players/add': {
        const result = engine.addPlayer({
          uniqueId: body.uniqueId || body.nickname,
          nickname: body.nickname || body.uniqueId || 'لاعب',
          profilePictureUrl: body.profilePictureUrl,
          manual: true
        });
        if (result.success && body.playerNumber) {
          engine.changePlayerNumber(result.player.id, body.playerNumber);
        }
        allPlayers = engine.players || allPlayers;
        wheel.setPlayers(allPlayers);
        renderAll();
        return result;
      }
      case '/simulate/join': {
        const uid = body.uniqueId || `user_${Math.floor(Math.random() * 1000)}`;
        const result = engine.handleChatComment({
          userId: 'sim_' + uid,
          uniqueId: uid,
          nickname: body.nickname || uid,
          commentText: engine.settings.joinKeyword || 'تم',
          profilePictureUrl: body.avatar
        });
        allPlayers = engine.players || allPlayers;
        wheel.setPlayers(allPlayers);
        renderAll();
        return { success: !!result, result };
      }
      case '/simulate/comment': {
        const player = engine.getPlayerById(body.uniqueId);
        const result = engine.handleChatComment({
          userId: player ? player.userId : 'sim_' + body.uniqueId,
          uniqueId: body.uniqueId || (player ? player.uniqueId : 'tester'),
          nickname: player ? player.nickname : body.uniqueId,
          commentText: body.commentText
        });
        return { success: !!result, result };
      }
      case '/simulate/gift': {
        const player = engine.getPlayerById(body.uniqueId);
        const giftEvent = {
          userId: player ? player.userId : 'sim_' + (body.uniqueId || 'viewer'),
          uniqueId: body.uniqueId || (player ? player.uniqueId : 'viewer'),
          nickname: player ? player.nickname : body.uniqueId,
          giftId: body.giftId || null,
          giftName: body.giftName || 'هدية تجريبية',
          diamonds: parseInt(body.coins || 1, 10),
          repeatCount: parseInt(body.repeatCount || 1, 10),
          eventId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        };
        engine.dispatchGift(giftEvent);
        return { success: true, giftEvent };
      }
      default:
        return null;
    }
  }

  // ── Main Spin Button ──────────────────────────────────────
  async function triggerRouletteSpin() {
    if (window.soundEngine) window.soundEngine.init();

    if (BACKEND_URL || STANDALONE_MODE) {
      const data = await apiPost('/control/roulette/start');
      if (data && !data.success) alert(data.reason || 'تعذر تشغيل الروليت');
      return;
    }

    // وضع Demo / offline
    const active = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
    if (active.length < 2) {
      alert('يجب أن يكون هناك لاعبان على الأقل نشطان لتدوير العجلة!');
      return;
    }

    const chosen = active[Math.floor(Math.random() * active.length)];
    btnMainSpinRoulette.disabled = true;

    setBanner('🎡 تدور العجلة الآن...');
    hideAllModals();

    wheel.spinToPlayer(chosen, () => {
      if (!currentSnapshot) currentSnapshot = { state: 'SELECTED_PLAYER', roundNumber: 1, settings: {} };
      currentSnapshot.chosenPlayer = chosen;
      currentSnapshot.state = 'SELECTED_PLAYER';
      setBanner(`👑 تم اختيار ${chosen.nickname} (#${chosen.playerNumber}) بالروليت!`);
      showTurnModal(chosen);
      setTimeout(() => {
        if (turnModal) turnModal.classList.remove('active');
        currentSnapshot.state = 'SELECTING_TARGET';
        showTargetSelectionModal(chosen);
      }, 2400);
    });
  }

  if (btnMainSpinRoulette) {
    btnMainSpinRoulette.addEventListener('click', triggerRouletteSpin);
  }

  // ── Admin Drawer ──────────────────────────────────────────
  if (btnOpenAdminDrawer) {
    btnOpenAdminDrawer.addEventListener('click', () => adminDrawerModal.classList.add('active'));
  }
  if (btnCloseAdminDrawer) {
    btnCloseAdminDrawer.addEventListener('click', () => adminDrawerModal.classList.remove('active'));
  }

  document.querySelectorAll('.drawer-tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.drawer-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      tabBtn.classList.add('active');
      const target = document.getElementById(tabBtn.dataset.target);
      if (target) target.classList.add('active');
    });
  });

  // ── Socket Events ─────────────────────────────────────────
  function setupSocketEvents() {
    if (!socket) return;

    socket.on('init_sync', (data) => {
      currentSnapshot = data.snapshot;
      allPlayers = data.players || [];
      applyWheelConfigFromSnapshot();
      renderAll();
      if (data.tiktokStatus) updateTikTokBadge(data.tiktokStatus);
    });

    socket.on('state_updated', (snapshot) => {
      currentSnapshot = snapshot;
      updateGiftTicker();
      applyBackground(snapshot?.settings?.background);
      applyWheelConfigFromSnapshot();
      renderHeader();
      handleStateVisuals(snapshot);
      updateDrawerUI();
      updateSpinButtonState();
    });

    socket.on('round_advanced', ({ roundNumber } = {}) => {
      hideAllModals();
      if (window.__fx3d) window.__fx3d('round_advanced', { roundNumber });
      if (currentSnapshot) {
        currentSnapshot.roundNumber = roundNumber || ((currentSnapshot.roundNumber || 1) + 1);
        currentSnapshot.chosenPlayer = null;
        currentSnapshot.targetPlayer = null;
        currentSnapshot.state = 'READY';
      }
      renderAll();
      setBanner(`🔄 بدأت الجولة #${roundNumber || currentSnapshot?.roundNumber || 1}`);
    });

    socket.on('target_timeout_action', (payload = {}) => {
      if (targetSelectionModal) targetSelectionModal.classList.remove('active');
      if (turnModal) turnModal.classList.remove('active');
      if (window.__fx3d) window.__fx3d('target_timeout_action', payload);
      if (payload.action === 'skip') {
        setBanner('⏭️ انتهى وقت اختيار الهدف — تخطي الدور');
      } else if (payload.action === 'respin') {
        setBanner('🎡 انتهى وقت اختيار الهدف — إعادة تدوير العجلة');
      } else if (payload.action === 'random') {
        setBanner(`🎯 انتهى وقت اختيار الهدف — تم اختيار ${payload.target?.nickname || 'هدف عشوائي'}`);
      }
    });

    socket.on('target_immune_blocked', ({ target } = {}) => {
      showResultModal('🛡️ الهدف محمي!',
        `${target?.nickname || 'اللاعب'} يمتلك درع الحصانة ولا يمكن استهدافه.`, '🛡️', '#60a5fa');
      setTimeout(() => hideAllModals(), 3000);
    });

    socket.on('player_shield_activated', ({ player, rounds } = {}) => {
      if (window.soundEngine) window.soundEngine.savedFanfare();
      hideAllModals();
      showShieldAura(player, rounds);
      if (window.__fx3d) window.__fx3d('player_shield_activated', { player, rounds });
    });

    socket.on('player_shield_consumed', ({ player } = {}) => {
      if (window.soundEngine) window.soundEngine.savedFanfare();
      hideAllModals();
      showShieldBreak(player);
      if (window.__fx3d) window.__fx3d('player_shield_consumed', { player });
    });

    socket.on('final_round_started', ({ duration } = {}) => {
      hideAllModals();
      if (window.celebration3D) window.celebration3D.start('quick'); // short 3D burst
      showFinalRoundAnnounce(duration || 20);
      if (window.__fx3d) window.__fx3d('final_round_started', { duration });
      const fConf = currentSnapshot?.settings?.gifts?.finalRound;
      const fInfo = getGiftInfo(fConf?.giftId || fConf?.giftName || 'rocket');
      setBanner(`🏆 بدأ الحسم النهائي! أرسل [${fConf?.giftName || fInfo.nameAr}] (${fConf?.minCoins || fInfo.coins || 100} عملة) خلال ${duration || 20} ثانية`);
    });

    socket.on('final_round_score_updated', ({ player, score } = {}) => {
      setBanner(`🏆 ${player?.nickname || 'لاعب'} في الصدارة برصيد ${score || 0} عملة!`);
      if (window.__fx3d) window.__fx3d('final_round_score_updated', { player, score });
    });

    socket.on('winner_challenge_started', ({ challenger, winner, duration } = {}) => {
      if (window.__winnerTimer) { clearInterval(window.__winnerTimer); window.__winnerTimer = null; }
      hideAllModals();
      if (window.soundEngine) window.soundEngine.siren();
      const wConf = currentSnapshot?.settings?.gifts?.winnerChallenge;
      const wInfo = getGiftInfo(wConf?.giftId || wConf?.giftName || 'crown');
      const secs = duration || 20;
      showResultModal('⚔️ تحدي الفائز!',
        `${challenger?.nickname || 'متحدٍ'} يتحدى ${winner?.nickname || 'الفائز'}! أرسل [${wConf?.giftName || wInfo.nameAr}] (${wConf?.minCoins || wInfo.coins || 100} عملة) خلال ${secs} ثانية.`, '⚔️', '#a855f7');
    });

    socket.on('challenge_ended', ({ winner } = {}) => {
      setBanner(`👑 انتهى التحدي — الفائز ${winner?.nickname || 'البطل'}!`);
    });

    socket.on('timer_stopped', () => {
      updateTimerVisual(0, currentTimerTotal);
      updateTargetSelectTimerVisual(0, currentTargetSelectTotal);
    });

    socket.on('players_updated', (players) => {
      allPlayers = players || [];
      wheel.setPlayers(allPlayers);
      renderPlayerLists();
      renderDrawerPlayersTable();
      updateSimCommentDropdown();
      updateSpinButtonState();
      if (targetSelectionModal?.classList.contains('active')) renderTargetPlayerGrid();
    });

    socket.on('tiktok_status', (status) => updateTikTokBadge(status));

    socket.on('settings_updated', (settings) => {
      if (currentSnapshot) currentSnapshot.settings = settings;
      applyWheelConfigFromSnapshot();
      populateDrawerSettings();
      renderGiftConfigTab();
      renderHeader();
      updateGiftsLegend();
    });

    socket.on('roulette_spin_started', (result) => {
      hideAllModals();
      setBanner('🎡 العجلة تدور الآن... من سيكون صاحب القرار؟');
      updateSpinButtonState();
      wheel.spinToPlayer(result.chosenPlayer, () => {
        apiPost('/control/roulette/land');
      });
    });

    socket.on('player_selected_turn', ({ chosenPlayer }) => showTurnModal(chosenPlayer));

    socket.on('target_selected', ({ selector, target }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.siren();
      showConfrontationModal(selector, target);
      if (window.__fx3d) window.__fx3d('target_selected', { selector, target });
    });

    socket.on('timer_tick', ({ remaining, type }) => {
      if (type === 'target_select') {
        updateTargetSelectTimerVisual(remaining, currentTargetSelectTotal);
        if (window.soundEngine) window.soundEngine.timerHeartbeat(false);
      } else {
        updateTimerVisual(remaining, currentTimerTotal);
        if (type === 'defense') {
          if (window.soundEngine) window.soundEngine.timerHeartbeat(remaining <= 5);
        }
      }
    });

    socket.on('timer_started', (timer) => {
      if (timer.type === 'target_select') {
        currentTargetSelectTotal = timer.duration || 20;
        updateTargetSelectTimerVisual(timer.duration, currentTargetSelectTotal);
      } else {
        currentTimerTotal = timer.duration || 30;
        updateTimerVisual(timer.duration, currentTimerTotal);
      }
    });

    socket.on('player_saved', ({ player, giftName, coins }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.savedFanfare();
      showDefenseTaunt(player, giftName, coins);
      if (window.__fx3d) window.__fx3d('player_saved', { player, giftName, coins });
    });

    socket.on('player_eliminated', ({ player, by }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.eliminatedGong();
      showKickAnimation(player, by);
      showEliminationModal(player, by);
      if (window.__fx3d) window.__fx3d('player_eliminated', { player, by });
    });

    socket.on('player_rejoined', ({ player, coins }) => {
      if (window.soundEngine) window.soundEngine.rejoin();
      hideAllModals();
      showRejoinAnimation(player, coins);
      if (window.__fx3d) window.__fx3d('player_rejoined', { player, coins });
    });

    socket.on('player_helped', ({ helperName, target, coins }) => {
      if (window.soundEngine) window.soundEngine.rejoin();
      hideAllModals();
      showRejoinAnimation(target, coins, helperName);
      if (window.__fx3d) window.__fx3d('player_helped', { helperName, target, coins });
    });

    socket.on('winner_declared', ({ winner }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.victory();
      if (window.celebration3D) window.celebration3D.start('win'); // Three.js 3D celebration
      showWinnerModal(winner);
      if (window.__fx3d) window.__fx3d('winner_declared', { winner });
      const timerEl = document.getElementById('winnerChallengeTimer');
      let remaining = 20;
      if (timerEl) timerEl.textContent = remaining;
      if (window.__winnerTimer) clearInterval(window.__winnerTimer);
      window.__winnerTimer = setInterval(() => {
        remaining--;
        if (timerEl) timerEl.textContent = Math.max(0, remaining);
        if (remaining <= 0) {
          clearInterval(window.__winnerTimer);
          window.__winnerTimer = null;
          if (winnerModal) winnerModal.classList.remove('active');
          setBanner('🏆 ' + (winner?.nickname || 'الفائز') + ' هو البطل! (انتهت مهلة التحدي)');
        }
      }, 1000);
    });

    socket.on('game_reset', () => {
      hideAllModals();
      setBanner('تمت إعادة تعيين اللعبة. في انتظار الانضمام...');
      updateSpinButtonState();
      if (window.__fx3d) window.__fx3d('game_reset', {});
    });

    socket.on('activity_log', (entry) => appendDrawerLog(entry));
  }

  // ── Demo Mode ─────────────────────────────────────────────
  function startDemoMode() {
    if (currentSnapshot) return; // Already initialized

    console.log('[Overlay] 🎮 تشغيل وضع Demo');

    currentSnapshot = {
      roundNumber: 1,
      state: 'WAITING_JOIN',
      chosenPlayer: null, targetPlayer: null, winner: null,
      settings: {
        joinKeyword: 'تم', isJoinOpen: true,
        timers: { defenseDuration: 20, targetSelectDuration: 20 },
        gifts: {
          defense: { giftName: 'وردة', giftId: 'rose', minCoins: 1 },
          shield: { giftName: 'نظارات شمسية', giftId: 'sunglasses', minCoins: 30 },
          rejoin: { giftName: 'قلب الحب', giftId: 'heart', minCoins: 5 },
          help: { giftName: 'كاب تيك توك', giftId: 'cap', minCoins: 16 },
          finalRound: { giftName: 'طائرة نفاثة / صاروخ', giftId: 'rocket', minCoins: 100 },
          winnerChallenge: { giftName: 'تاج ذهبي', giftId: 'crown', minCoins: 100 }
        },
        wheelConfig: { theme: 'neon', spinDuration: 5000, showPlayerAvatars: true, showPlayerNames: true }
      }
    };

    allPlayers = [
      { id:'1', playerNumber:1, nickname:'محمد 👑', uniqueId:'mohammed', profilePictureUrl:'assets/gifts/lion.png', status:'active', hasShield:false },
      { id:'2', playerNumber:2, nickname:'سارة ✨', uniqueId:'sara', profilePictureUrl:'assets/gifts/heart.png', status:'immune', hasShield:true },
      { id:'3', playerNumber:3, nickname:'أحمد ⚡', uniqueId:'ahmed', profilePictureUrl:'assets/gifts/cap.png', status:'active', hasShield:false },
      { id:'4', playerNumber:4, nickname:'خالد 🚀', uniqueId:'khaled', profilePictureUrl:'assets/gifts/rocket.png', status:'active', hasShield:false },
      { id:'5', playerNumber:5, nickname:'مريم 🌸', uniqueId:'mariam', profilePictureUrl:'assets/gifts/rose.png', status:'active', hasShield:false },
      { id:'6', playerNumber:6, nickname:'علي 🔥', uniqueId:'ali', profilePictureUrl:'assets/gifts/trophy.png', status:'active', hasShield:false },
      { id:'7', playerNumber:7, nickname:'نور 🌟', uniqueId:'nour', profilePictureUrl:'assets/gifts/pearl.png', status:'active', hasShield:false },
      { id:'8', playerNumber:8, nickname:'فهد 🏎️', uniqueId:'fahad', profilePictureUrl:'assets/gifts/car.png', status:'active', hasShield:false }
    ];

    applyWheelConfigFromSnapshot();
    renderAll();

    if (tiktokBadgeEl) {
      tiktokBadgeEl.textContent = '🌐 وضع Demo';
      tiktokBadgeEl.style.background = 'linear-gradient(45deg, #00f2fe, #4facfe)';
    }
    if (btnMainSpinRoulette) {
      btnMainSpinRoulette.disabled = false;
    }
  }

  // ══════════════════════════════════════════════════════════
  // وضع Vercel المستقل: محرّك لعبة محلي + أحداث TikTok عبر SSE
  // ══════════════════════════════════════════════════════════
  let browserStorage = null;

  function createBrowserStorage() {
    const STATE_KEY = 'tiktok_roulette_state_v1';
    const LOGS_KEY = 'tiktok_roulette_logs_v1';

    return {
      loadGameState() {
        try {
          const raw = localStorage.getItem(STATE_KEY);
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          return null;
        }
      },
      saveGameState(state) {
        try {
          localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (e) {}
      },
      appendLog(entry) {
        const item = {
          id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          timestamp: new Date().toISOString(),
          ...entry
        };
        try {
          const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
          logs.push(item);
          localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(-300)));
        } catch (e) {}
        return item;
      },
      loadLogs(limit = 200) {
        try {
          const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
          return logs.slice(-limit);
        } catch (e) {
          return [];
        }
      },
      clearLogs() {
        try {
          localStorage.removeItem(LOGS_KEY);
        } catch (e) {}
      }
    };
  }

  function setConnectStatus(kind, text) {
    const color = kind === 'error' ? '#ef4444' : kind === 'success' ? '#10b981' : '#f59e0b';
    const html = `<span style="color:${color};font-weight:700;">${escapeHtml(text)}</span>`;
    if (welcomeStatus) welcomeStatus.innerHTML = html;
    if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = html;
  }

  function showWelcomeModal() {
    if (welcomeModal) welcomeModal.classList.add('active');
  }

  function hideWelcomeModal() {
    if (welcomeModal) welcomeModal.classList.remove('active');
  }

  function updateObsLink(username) {
    if (!obsLinkInput) return;
    const page = window.__IS_3D ? 'game3d.html' : 'overlay';
    const url = `${location.origin}/${page}?user=${encodeURIComponent(username || '')}`;
    obsLinkInput.value = url;
    if (obsLinkBox) obsLinkBox.style.display = 'block';
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ تم النسخ!');
    } catch (e) {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); alert('✅ تم النسخ!'); } catch (err) { alert(text); }
      document.body.removeChild(el);
    }
  }

  async function connectTikTok(username, options = {}) {
    const clean = String(username || '').trim().replace(/^@+/, '');
    if (!clean) {
      setConnectStatus('error', 'اكتب اسم مستخدم تيك توك أولاً.');
      showWelcomeModal();
      return { success: false, error: 'missing username' };
    }

    currentUsername = clean;
    try { localStorage.setItem('tiktok_roulette_username', clean); } catch (e) {}
    if (drawerTiktokUser) drawerTiktokUser.value = clean;
    if (welcomeUsername) welcomeUsername.value = clean;

    setConnectStatus('checking', `⏳ جاري التحقق من بث @${clean}...`);
    updateTikTokBadge({ status: 'connecting', username: clean });

    try {
      const result = await liveClient.check(clean);
      if (!result.live) {
        const msg = result.error || 'الحساب ليس على الهواء حالياً.';
        setConnectStatus('error', msg);
        updateTikTokBadge({ status: 'error', username: clean, lastError: msg });
        showWelcomeModal();
        return { success: false, error: msg };
      }

      const viewers = result.viewerCount ? ` (${result.viewerCount} مشاهد 👁️)` : '';
      setConnectStatus('success', `✅ @${clean} على الهواء${viewers} — جاري ربط الأحداث...`);
      updateObsLink(clean);
      liveClient.connect(clean);
      return { success: true, ...result };
    } catch (error) {
      const msg = error?.message || 'تعذر التحقق من البث. تأكد من اتصال الإنترنت.';
      setConnectStatus('error', msg);
      updateTikTokBadge({ status: 'error', username: clean, lastError: msg });
      showWelcomeModal();
      return { success: false, error: msg };
    }
  }

  function startStandaloneMode() {
    const Engine = window.TikTokRouletteEngine;
    if (!Engine || !Engine.GameState || !window.TikTokLiveClient) {
      console.warn('[Overlay] محرّك اللعبة غير محمّل — الرجوع لوضع Demo');
      startDemoMode();
      return;
    }

    console.log('[Overlay] 🟢 وضع Vercel المستقل — محرّك اللعبة داخل المتصفح');

    browserStorage = createBrowserStorage();
    localEngine = new Engine.GameState({
      config: window.TikTokRouletteConfig || {},
      storage: browserStorage,
      persist: true
    });

    // نستخدم نفس معالجات Socket.IO لكن مع المحرّك المحلي
    socket = {
      on(event, handler) {
        localEngine.on(event, handler);
        return this;
      }
    };
    socketConnected = true;
    setupSocketEvents();

    currentSnapshot = localEngine.getSnapshot();
    allPlayers = localEngine.players || [];
    applyWheelConfigFromSnapshot();
    if (wheel && currentSnapshot?.settings?.streamerAvatar) wheel.setCenterImage(currentSnapshot.settings.streamerAvatar);
    renderAll();
    updateGiftTicker();
    applyBackground(currentSnapshot?.settings?.background);
    updateTikTokBadge({ status: 'disconnected' });

    // السجلات المحفوظة
    try {
      browserStorage.loadLogs(40).reverse().forEach(appendDrawerLog);
    } catch (e) {}

    // ── TikTok Live client ──────────────────────────────────
    liveClient = new window.TikTokLiveClient({ baseUrl: '' });

    liveClient.on('status', (status) => {
      updateTikTokBadge(status);
      if (status.status === 'connected') {
        hideWelcomeModal();
        currentUsername = status.username || currentUsername;
        updateObsLink(currentUsername);
        setConnectStatus('success', `✅ متصل بالبث (@${currentUsername})`);
      } else if (status.status === 'error' || status.status === 'ended') {
        const msg = status.error || status.lastError || 'تعذر الاتصال بالبث.';
        setConnectStatus('error', msg);
        showWelcomeModal();
      } else if (status.status === 'reconnecting') {
        setConnectStatus('checking', '🔄 جاري إعادة الاتصال بالبث...');
      } else if (status.status === 'connecting') {
        setConnectStatus('checking', `⏳ جاري ربط الأحداث بـ @${status.username}...`);
      }
    });

    liveClient.on('chat', (chat) => {
      try { localEngine.handleChatComment(chat); } catch (e) { console.error('[Overlay] chat:', e); }
    });

    liveClient.on('gift', (gift) => {
      try { localEngine.dispatchGift(gift); } catch (e) { console.error('[Overlay] gift:', e); }
      if (window.__fx3d) {
        const gPlayer = (localEngine.players || []).find(p =>
          (gift.uniqueId && p.uniqueId === gift.uniqueId) || (gift.userId && p.userId === gift.userId));
        window.__fx3d('gift', gPlayer || null);
      }
    });

    liveClient.on('room_info', (info) => {
      if (!tiktokBadgeEl || !currentUsername) return;
      const viewers = info?.viewerCount ? ` (${info.viewerCount} 👁️)` : '';
      tiktokBadgeEl.innerHTML = `<span class="pulse-dot"></span> ✅: @${currentUsername}${viewers}`;
    });

    // ── Welcome modal events ────────────────────────────────
    if (btnWelcomeConnect) {
      btnWelcomeConnect.addEventListener('click', () => connectTikTok(welcomeUsername?.value));
    }
    if (welcomeUsername) {
      welcomeUsername.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') connectTikTok(welcomeUsername.value);
      });
    }
    if (btnWelcomeDemo) {
      btnWelcomeDemo.addEventListener('click', () => {
        hideWelcomeModal();
        localEngine.resetGame();
        const demoPlayers = [
          ['محمد 👑', 'mohammed_king'], ['سارة ✨', 'queen_sara'],
          ['أحمد ⚡', 'ahmed_hawk'], ['فهد 🏎️', 'fahad_hero'],
          ['نورة 🌟', 'noura_live'], ['خالد 🚀', 'khaled_star'],
          ['مريم 🌸', 'mariam_rose'], ['علي 🔥', 'ali_chief']
        ];
        demoPlayers.forEach(([nickname, uniqueId], index) => {
          localEngine.addPlayer({
            userId: `demo_${index + 1}`,
            uniqueId,
            nickname,
            profilePictureUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${uniqueId}`,
            manual: true
          });
        });
        localEngine.logActivity('DEMO_MODE', 'تم تشغيل وضع التجربة بدون بث مباشر');
        localEngine.emit('state_updated', localEngine.getSnapshot());
      });
    }
    if (btnCopyObsLink) {
      btnCopyObsLink.addEventListener('click', () => copyText(obsLinkInput?.value));
    }
    if (btnCopyObsLinkDrawer) {
      btnCopyObsLinkDrawer.addEventListener('click', () => {
        if (!currentUsername) { alert('اتصل بالبث أولاً لنسخ رابط OBS'); return; }
        copyText(`${location.origin}/overlay?user=${encodeURIComponent(currentUsername)}`);
      });
    }
    if (btnDrawerChangeAccount) {
      btnDrawerChangeAccount.addEventListener('click', () => {
        if (liveClient) liveClient.disconnect();
        currentUsername = '';
        if (welcomeUsername) welcomeUsername.value = '';
        setConnectStatus('checking', 'اكتب اسم مستخدم جديد للاتصال ببث آخر.');
        showWelcomeModal();
      });
    }

    // ── Auto-connect from URL (?user=) or last saved username ──
    let urlUser = '';
    let savedUser = '';
    try {
      const params = new URLSearchParams(location.search);
      urlUser = (params.get('user') || params.get('username') || '').replace(/^@+/, '').trim();
    } catch (e) {}
    try { savedUser = localStorage.getItem('tiktok_roulette_username') || ''; } catch (e) {}

    const autoUser = urlUser || savedUser;
    if (autoUser) {
      if (welcomeUsername) welcomeUsername.value = autoUser;
      connectTikTok(autoUser, { auto: true });
    } else {
      showWelcomeModal();
    }
  }

  // Collapsible side panels
  document.querySelectorAll('.panel-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const panel = document.getElementById(target);
      if (!panel) return;
      panel.classList.toggle('collapsed');
      btn.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
    });
  });

  // بدء Socket.IO
  window.tiktokBadgeEl = tiktokBadgeEl;
  window.startDemoMode = startDemoMode;

  if (typeof io !== 'undefined' && BACKEND_URL) {
    try {
      socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        timeout: 8000,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000
      });

      socket.on('connect', () => {
        console.log('[Overlay] ✅ متصل بالـ backend');
        socketConnected = true;
        if (tiktokBadgeEl) {
          tiktokBadgeEl.textContent = '🔗 متصل بالخادم';
          tiktokBadgeEl.style.borderColor = 'rgba(16,185,129,0.4)';
        }
      });

      socket.on('connect_error', () => {
        socketConnected = false;
      });

      socket.on('disconnect', () => { socketConnected = false; });

      setupSocketEvents();

      setTimeout(() => {
        if (!socketConnected && !currentSnapshot) startDemoMode();
      }, 6000);

    } catch (e) {
      console.error('[Overlay] Socket init error:', e);
      startDemoMode();
    }
  } else {
    setTimeout(startStandaloneMode, 300);
  }

  // ── Render Functions ──────────────────────────────────────
  function renderAll() {
    renderHeader();
    renderPlayerLists();
    wheel.setPlayers(allPlayers);
    if (currentSnapshot) handleStateVisuals(currentSnapshot);
    updateDrawerUI();
    updateSpinButtonState();
    renderGiftConfigTab();
    updateGiftsLegend();
  }

  function renderHeader() {
    if (!currentSnapshot) return;

    if (roundBadgeEl) roundBadgeEl.textContent = `الجولة #${currentSnapshot.roundNumber || 1}`;

    if (joinBadgeEl) {
      const isOpen = currentSnapshot.settings?.isJoinOpen;
      const kw = currentSnapshot.settings?.joinKeyword || 'تم';
      if (isOpen) {
        joinBadgeEl.className = 'badge badge-join';
        joinBadgeEl.innerHTML = `<span class="pulse-dot"></span> الانضمام مفتوح: اكتب [${kw}]`;
      } else {
        joinBadgeEl.className = 'badge badge-join closed';
        joinBadgeEl.innerHTML = `<span class="pulse-dot red"></span> الانضمام مغلق`;
      }
    }

    if (shieldGiftBadge) {
      const shieldConf = currentSnapshot.settings?.gifts?.shield;
      if (shieldConf) {
        const giftInfo = getGiftInfo(shieldConf.giftId || 'sunglasses');
        shieldGiftBadge.style.display = 'inline-flex';
        if (shieldGiftBadgeImg) shieldGiftBadgeImg.src = giftInfo.image;
        if (shieldGiftBadgeText) shieldGiftBadgeText.textContent = `درع الحصانة: ${shieldConf.giftName || giftInfo.nameAr} (${shieldConf.minCoins || 30} عملة)`;
      } else {
        shieldGiftBadge.style.display = 'none';
      }
    }
  }

  function updateGiftsLegend() {
    const gifts = currentSnapshot?.settings?.gifts;
    if (!gifts) return;

    const updateLegendItem = (img, text, giftConf, fallbackId, fallbackDesc) => {
      if (!img || !text) return;
      const info = getGiftInfo(giftConf?.giftId || giftConf?.giftName || fallbackId);
      img.src = info.image;
      text.textContent = `${giftConf?.giftName || info.nameAr} (${giftConf?.minCoins || info.coins || 1} عملة) ${fallbackDesc}`;
    };

    updateLegendItem(legendDefImg, legendDefText, gifts.defense, 'rose', 'لإنقاذك من الإقصاء');
    updateLegendItem(legendShieldImg, legendShieldText, gifts.shield, 'sunglasses', 'حماية من الاستهداف');
    updateLegendItem(legendRejoinImg, legendRejoinText, gifts.rejoin, 'heart', 'للعودة للروليت');
    updateLegendItem(legendFinalImg, legendFinalText, gifts.finalRound, 'rocket', 'لحسم الفوز');
  }

  function applyBackground(bg) {
    if (!bg) return;
    const c1 = bg.color1 || '#0a0612';
    const c2 = bg.color2 || '#1a1030';
    let bgStyle = bg.type === 'solid' ? c1 : `linear-gradient(135deg, ${c1}, ${c2})`;
    let patternCss = 'none';
    if (bg.pattern === 'dots') patternCss = 'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)';
    else if (bg.pattern === 'grid') patternCss = 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)';
    document.body.style.backgroundImage = patternCss !== 'none' ? `${patternCss}, ${bgStyle}` : bgStyle;
    document.body.style.backgroundAttachment = 'fixed';
    if (bg.pattern === 'dots') document.body.style.backgroundSize = '22px 22px, auto';
    else if (bg.pattern === 'grid') document.body.style.backgroundSize = '36px 36px, 36px 36px, auto';
    else document.body.style.backgroundSize = 'auto';
  }

  function updateGiftTicker() {
    if (!giftTickerTrack) return;
    const gifts = currentSnapshot?.settings?.gifts || {};
    const cats = [
      { key: 'defense', label: '🛡️ دفاع عن النفس', desc: 'يلغي الإقصاء فوراً' },
      { key: 'shield', label: '🛡️ حصانة (قلب)', desc: 'قلب إضافي — يُستهلك عند الإقصاء' },
      { key: 'rejoin', label: '🔄 عودة للعبة', desc: 'إعادة لاعب مستبعد' },
      { key: 'help', label: '❤️ مساعدة/إنقاذ', desc: 'إنقاذ لاعب مستبعد' },
      { key: 'finalRound', label: '🚀 حسم الجولة', desc: 'حسم الجولة النهائية' },
      { key: 'winnerChallenge', label: '👑 تحدي الفائز', desc: 'تحدي البطل' }
    ];
    const oneSet = cats.map(c => {
      const conf = gifts[c.key];
      const info = getGiftInfo(conf?.giftId || conf?.giftName || 'rose');
      const img = info.image;
      const name = conf?.giftName || info.nameAr;
      const coins = conf?.minCoins || info.coins || 1;
      return `<div class="ticker-item"><img src="${img}" alt=""><span class="ticker-name">${name}</span><span class="ticker-coins">${coins} عملة</span><span class="ticker-desc">${c.label} — ${c.desc}</span></div>`;
    }).join('');
    // Build a set wide enough to fill the screen, then duplicate once for seamless loop
    let set = oneSet;
    for (let i = 0; i < 3; i++) set += oneSet;
    giftTickerTrack.innerHTML = set + set;
  }

  function updateSpinButtonState() {
    if (!btnMainSpinRoulette) return;
    const actives = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
    const isSpinning = currentSnapshot?.state === 'SPINNING';

    if (actives.length < 2) {
      btnMainSpinRoulette.disabled = true;
      const st = btnMainSpinRoulette.querySelector('.spin-text');
      if (st) st.textContent = `في انتظار لاعبين (${actives.length}/2)...`;
    } else if (isSpinning) {
      btnMainSpinRoulette.disabled = true;
      const st = btnMainSpinRoulette.querySelector('.spin-text');
      if (st) st.textContent = 'العجلة تدور الآن...';
    } else {
      btnMainSpinRoulette.disabled = false;
      const st = btnMainSpinRoulette.querySelector('.spin-text');
      if (st) st.textContent = 'تدوير الروليت الآن (Start Roulette)';
    }
  }

  function updateTikTokBadge(status) {
    if (!tiktokBadgeEl) return;
    if (!status || typeof status !== 'object') {
      tiktokBadgeEl.innerHTML = `تيك توك: غير متصل`;
      if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = `<span style="color:var(--text-muted);">⚪ غير متصل</span>`;
      return;
    }

    if (status.username && drawerTiktokUser && !drawerTiktokUser.value) drawerTiktokUser.value = status.username;

    if (status.status === 'connected') {
      const mode = status.connectionMode === 'tikfinity' ? '📡 TikFinity' : status.connectionMode === 'simulator' ? '⚡ محاكي' : '✅';
      const viewers = status.roomInfo?.viewerCount ? ` (${status.roomInfo.viewerCount} 👁️)` : '';
      tiktokBadgeEl.innerHTML = `<span class="pulse-dot"></span> ${mode}: @${status.username}${viewers}`;
      tiktokBadgeEl.style.borderColor = 'rgba(16, 185, 129, 0.5)';
      if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = `<span style="color:#10b981;font-weight:800;">✅ متصل بالبث (@${status.username})${viewers}</span>`;
      if (btnDrawerConnect) btnDrawerConnect.style.display = 'none';
      if (btnDrawerDisconnect) btnDrawerDisconnect.style.display = 'inline-flex';
    } else if (status.status === 'connecting') {
      tiktokBadgeEl.innerHTML = `جاري الاتصال بـ @${status.username}...`;
      if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = `<span style="color:#f59e0b;">⏳ جاري الاتصال...</span>`;
    } else if (status.status === 'reconnecting') {
      tiktokBadgeEl.innerHTML = `🔄 جاري إعادة الاتصال بـ @${status.username}...`;
      tiktokBadgeEl.style.borderColor = 'rgba(245,158,11,0.5)';
      if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = `<span style="color:#f59e0b;">🔄 جاري إعادة الاتصال...</span>`;
    } else if (status.status === 'ended' || status.error || status.lastError) {
      const msg = status.error || status.lastError || (status.status === 'ended' ? 'انتهى البث المباشر.' : 'تعذر الاتصال');
      tiktokBadgeEl.innerHTML = `❌ تيك توك: ${msg}`;
      tiktokBadgeEl.style.borderColor = 'rgba(239,68,68,0.4)';
      if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = `<span style="color:#ef4444;">❌ ${msg}</span>`;
      if (btnDrawerConnect) btnDrawerConnect.style.display = 'inline-flex';
      if (btnDrawerDisconnect) btnDrawerDisconnect.style.display = 'none';
    } else if (status.status === 'error') {
      tiktokBadgeEl.innerHTML = `❌ تيك توك: تعذر الاتصال`;
      tiktokBadgeEl.style.borderColor = 'rgba(239,68,68,0.4)';
      if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = `<span style="color:#ef4444;">❌ ${status.lastError || 'تعذر الاتصال'}</span>`;
      if (btnDrawerConnect) btnDrawerConnect.style.display = 'inline-flex';
      if (btnDrawerDisconnect) btnDrawerDisconnect.style.display = 'none';
    } else {
      tiktokBadgeEl.innerHTML = `تيك توك: غير متصل`;
      if (btnDrawerConnect) btnDrawerConnect.style.display = 'inline-flex';
      if (btnDrawerDisconnect) btnDrawerDisconnect.style.display = 'none';
    }
  }

  function renderPlayerLists() {
    const actives = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
    const eliminated = allPlayers.filter(p => p.status === 'eliminated');

    if (activeCountEl) activeCountEl.textContent = actives.length;
    if (eliminatedCountEl) eliminatedCountEl.textContent = eliminated.length;
    if (drawerPlayerCount) drawerPlayerCount.textContent = allPlayers.length;

    const shieldConf = currentSnapshot?.settings?.gifts?.shield;
    const shieldGift = getGiftInfo(shieldConf?.giftId || 'sunglasses');

    if (activePlayersList) {
      activePlayersList.innerHTML = actives.map(p => {
        const isChosen = currentSnapshot?.chosenPlayer?.id === p.id;
        const isTarget = currentSnapshot?.targetPlayer?.id === p.id;
        const isImmune = p.hasShield || p.status === 'immune';
        let cardClass = 'player-card';
        if (isChosen) cardClass += ' active-turn';
        if (isTarget) cardClass += ' under-attack';
        if (isImmune) cardClass += ' immune';

        return `
          <div class="${cardClass}">
            <div class="player-num-badge">#${p.playerNumber}</div>
            <img class="player-avatar" src="${p.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerNumber}`}" alt="" onerror="this.src='assets/gifts/rose.png'">
            <div class="player-info">
              <div class="player-name">${escapeHtml(p.nickname)}</div>
              <div class="player-sub">@${escapeHtml(p.uniqueId)}</div>
            </div>
            ${isImmune ? `<div style="display:flex;align-items:center;gap:4px;" title="محمي بدرع الحصانة">
              <img src="${shieldGift.image}" style="width:24px;height:24px;object-fit:contain;" alt="" onerror="this.style.display='none'">
              <span class="shield-badge-icon">🛡️</span>
            </div>` : ''}
          </div>`;
      }).join('');
    }

    if (eliminatedPlayersList) {
      eliminatedPlayersList.innerHTML = eliminated.map(p => `
        <div class="player-card eliminated">
          <div class="player-num-badge" style="background:#475569;">#${p.playerNumber}</div>
          <img class="player-avatar" src="${p.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerNumber}`}" alt="" onerror="this.src='assets/gifts/rose.png'">
          <div class="player-info">
            <div class="player-name">${escapeHtml(p.nickname)}</div>
            <div class="player-sub" style="color:#ef4444;">مستبعد ☠️ (أرسل هدية العودة)</div>
          </div>
        </div>`).join('');
    }
  }

  function handleStateVisuals(snapshot) {
    const state = snapshot.state;

    if (joinInstructionsCard) {
      const isJoinState = (state === 'WAITING_FOR_PLAYERS' || state === 'READY' || state === 'WAITING_JOIN') && snapshot.settings?.isJoinOpen !== false;
      joinInstructionsCard.classList.toggle('hidden', !isJoinState);
      if (isJoinState && joinKeywordHighlight) joinKeywordHighlight.textContent = snapshot.settings?.joinKeyword || 'تم';
    }

    // إخفاء النوافذ القديمة فقط عند الانتقال الفعلي إلى مرحلة جديدة
    // (state_updated يُبثّ كثيراً دون تغيير المرحلة، ولا يجب أن يخفي نتائج الأحداث)
    const stateChanged = state !== lastVisualState;
    lastVisualState = state;
    const statesToClearModals = [
      'WAITING_FOR_PLAYERS', 'WAITING_JOIN', 'READY', 'SPINNING',
      'NEXT_ROUND', 'FINAL_ROUND', 'FINISHED'
    ];
    if (stateChanged && statesToClearModals.includes(state)) hideAllModals();

    switch (state) {
      case 'WAITING_FOR_PLAYERS':
      case 'WAITING_JOIN':
        setBanner(`في انتظار اللاعبين... اكتب [${snapshot.settings?.joinKeyword || 'تم'}] في الشات للمشاركة!`);
        break;
      case 'READY':
        break;
      case 'SPINNING':
        setBanner('🎡 العجلة تدور الآن... من سيكون صاحب القرار؟');
        break;
      case 'SELECTED_PLAYER':
        if (snapshot.chosenPlayer) showTurnModal(snapshot.chosenPlayer);
        break;
      case 'SELECTING_TARGET':
        if (snapshot.chosenPlayer) {
          setBanner(`🎯 ${snapshot.chosenPlayer.nickname} يختار هدف الإقصاء!`);
          showTargetSelectionModal(snapshot.chosenPlayer);
        }
        break;
      case 'ELIMINATION_WARNING':
      case 'DEFENDING':
        if (snapshot.targetPlayer && snapshot.chosenPlayer) {
          if (targetSelectionModal) targetSelectionModal.classList.remove('active');
          if (turnModal) turnModal.classList.remove('active');
          showConfrontationModal(snapshot.chosenPlayer, snapshot.targetPlayer);
        }
        break;
      case 'SAVED':
        if (snapshot.targetPlayer) {
          setBanner(`🛡️ ${snapshot.targetPlayer.nickname} نجا من الإقصاء!`);
        }
        break;
      case 'NEXT_ROUND':
        setBanner('🔄 جاري تجهيز الجولة القادمة...');
        break;
      case 'CHALLENGE':
        if (snapshot.challenger && snapshot.winner) {
          setBanner(`⚔️ ${snapshot.challenger.nickname} يتحدى ${snapshot.winner.nickname}!`);
        } else {
          setBanner('⚔️ جاري تحدي الفائز...');
        }
        break;
      case 'FINAL_ROUND':
        setBanner('🏆 مرحلة الحسم النهائي! أرسل الهدية المطلوبة للفوز.');
        break;
      case 'FINISHED':
        if (snapshot.winner) {
          setBanner(`👑 البطل النهائي: ${snapshot.winner.nickname}!`);
          if (winnerModal && !winnerModal.classList.contains('active')) showWinnerModal(snapshot.winner);
        }
        break;
    }
  }

  // ── Modals ────────────────────────────────────────────────
  function showTurnModal(player) {
    if (!turnModal) return;
    turnAvatar.src = player.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.playerNumber}`;
    turnPlayerNum.textContent = `#${player.playerNumber}`;
    turnPlayerName.textContent = player.nickname;
    turnModal.classList.add('active');

    setTimeout(() => {
      if (currentSnapshot?.state === 'SELECTING_TARGET' || currentSnapshot?.state === 'SELECTED_PLAYER') {
        turnModal.classList.remove('active');
        showTargetSelectionModal(player);
      }
    }, 1800);
  }

  function showTargetSelectionModal(chooser) {
    if (!targetSelectionModal || !chooser) return;
    if (tsChooserAvatar) tsChooserAvatar.src = chooser.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${chooser.playerNumber}`;
    if (tsChooserNum) tsChooserNum.textContent = `#${chooser.playerNumber}`;
    if (tsChooserName) tsChooserName.textContent = chooser.nickname;

    renderTargetPlayerGrid();

    const totalSec = currentSnapshot?.settings?.timers?.targetSelectDuration || 20;
    currentTargetSelectTotal = totalSec;
    updateTargetSelectTimerVisual(totalSec, totalSec);
    targetSelectionModal.classList.add('active');
  }

  function renderTargetPlayerGrid() {
    if (!tsPlayerGrid) return;
    const chooser = currentSnapshot?.chosenPlayer;
    const actives = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');

    tsPlayerGrid.innerHTML = actives.map(p => {
      const isSelf = chooser && (p.id === chooser.id || p.playerNumber === chooser.playerNumber);
      const isImmune = p.hasShield || p.status === 'immune';
      let cardClass = 'ts-player-card';
      let badge = `<span class="ts-card-badge target-btn">🎯 اختر #${p.playerNumber}</span>`;

      if (isSelf) {
        cardClass += ' is-self';
        badge = `<span class="ts-card-badge" style="background:rgba(255,255,255,0.1);color:#cbd5e1;">صاحب القرار ⭐</span>`;
      } else if (isImmune) {
        cardClass += ' is-immune';
        badge = `<span class="ts-card-badge immune-badge">محمي بالدرع 🛡️</span>`;
      }

      return `
        <div class="${cardClass}" data-player-num="${p.playerNumber}" ${!isSelf && !isImmune ? `onclick="window.selectTargetPlayer(${p.playerNumber})"` : ''}>
          <div class="ts-card-avatar-wrap">
            <img class="ts-card-avatar" src="${p.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerNumber}`}" alt="" onerror="this.src='assets/gifts/rose.png'">
            <div class="ts-card-num">#${p.playerNumber}</div>
          </div>
          <div class="ts-card-name">${escapeHtml(p.nickname)}</div>
          <div class="ts-card-sub">@${escapeHtml(p.uniqueId)}</div>
          ${badge}
        </div>`;
    }).join('');
  }

  window.selectTargetPlayer = async (targetNumber) => {
    if (!currentSnapshot?.chosenPlayer) return;
    const chooser = currentSnapshot.chosenPlayer;

    if (BACKEND_URL || STANDALONE_MODE) {
      await apiPost('/simulate/comment', { uniqueId: chooser.uniqueId, commentText: `${targetNumber}` });
      return;
    }

    // Demo mode
    const target = allPlayers.find(p => p.playerNumber === targetNumber);
    if (!target) return;

    if (targetSelectionModal) targetSelectionModal.classList.remove('active');
    target.status = 'eliminated';
    currentSnapshot.targetPlayer = target;
    currentSnapshot.state = 'ELIMINATED';
    renderAll();
    if (window.soundEngine) window.soundEngine.eliminatedGong();
    showEliminationModal(target, chooser);
    setBanner(`💀 تم إقصاء ${target.nickname} (#${target.playerNumber}) بقرار من ${chooser.nickname}!`);

    setTimeout(() => {
      if (eliminationModal) eliminationModal.classList.remove('active');
      const remaining = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
      if (remaining.length === 1) {
        currentSnapshot.winner = remaining[0];
        currentSnapshot.state = 'FINISHED';
        if (window.soundEngine) window.soundEngine.victory();
        showWinnerModal(remaining[0]);
        setBanner(`🏆 فاز ${remaining[0].nickname}! ألف مبروك!`);
      } else {
        currentSnapshot.state = 'READY';
        currentSnapshot.chosenPlayer = null;
        currentSnapshot.targetPlayer = null;
        renderAll();
        setBanner(`🎡 تبقى ${remaining.length} لاعبين. جاهز للتدوير.`);
        if (btnMainSpinRoulette) btnMainSpinRoulette.disabled = false;
      }
    }, 6200);
  };

  function updateTargetSelectTimerVisual(remaining, total) {
    if (tsTimerDigits) tsTimerDigits.textContent = remaining;
    if (tsTimerProgress) {
      const frac = Math.max(0, remaining / (total || 20));
      tsTimerProgress.style.strokeDashoffset = 283 - (frac * 283);
      tsTimerProgress.style.stroke = remaining <= 5 ? '#ef4444' : '#fbbf24';
    }
  }

  function showConfrontationModal(selector, target) {
    if (!confrontationModal) return;
    selectorAvatar.src = selector.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selector.playerNumber}`;
    selectorName.textContent = selector.nickname;
    selectorNum.textContent = `#${selector.playerNumber}`;
    targetAvatar.src = target.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${target.playerNumber}`;
    targetName.textContent = target.nickname;
    targetNum.textContent = `#${target.playerNumber}`;

    const defGiftConf = currentSnapshot?.settings?.gifts?.defense;
    const defGiftInfo = getGiftInfo(defGiftConf?.giftId || defGiftConf?.giftName || 'rose');
    if (defenseGiftImg) { defenseGiftImg.src = defGiftInfo.image; defenseGiftImg.style.display = 'inline-block'; }
    if (defenseGiftText) defenseGiftText.textContent = `أرسل [${defGiftConf?.giftName || defGiftInfo.nameAr}] بقيمة (${defGiftConf?.minCoins || defGiftInfo.coins || 1} عملة) لإنقاذ نفسك!`;

    confrontationModal.classList.add('active');
  }

  function showResultModal(title, subtitle, icon, color) {
    if (!resultModal) return;
    resultTitle.textContent = title;
    resultTitle.style.color = color || '#fff';
    resultSubtitle.textContent = subtitle;
    resultIcon.textContent = icon || '🎯';
    resultModal.classList.add('active');
  }

  function showEliminationModal(player, by) {
    if (!eliminationModal || !player) return;
    if (elimPlayerAvatar) elimPlayerAvatar.src = player.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.playerNumber}`;
    if (elimPlayerNum) elimPlayerNum.textContent = `#${player.playerNumber}`;
    if (elimPlayerName) elimPlayerName.textContent = player.nickname;
    if (elimPlayerUser) elimPlayerUser.textContent = `@${player.uniqueId}`;

    if (by && elimByBox) {
      elimByBox.style.display = 'flex';
      if (elimByAvatar) elimByAvatar.src = by.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${by.playerNumber}`;
      if (elimByName) elimByName.textContent = by.nickname;
      if (elimByNum) elimByNum.textContent = `#${by.playerNumber}`;
    } else if (elimByBox) {
      elimByBox.style.display = 'none';
    }

    const rejoinConf = currentSnapshot?.settings?.gifts?.rejoin;
    const rejoinInfo = getGiftInfo(rejoinConf?.giftId || rejoinConf?.giftName || 'heart');
    if (elimRejoinImg) elimRejoinImg.src = rejoinInfo.image;
    if (elimRejoinDetail) elimRejoinDetail.textContent = `أرسل هدية [${rejoinConf?.giftName || rejoinInfo.nameAr}] بقيمة (${rejoinConf?.minCoins || rejoinInfo.coins || 5} عملات) للعودة!`;

    eliminationModal.classList.add('active');

    // يبقى ظاهراً 7 ثوان كاملة
    setTimeout(() => {
      if (eliminationModal.classList.contains('active')) eliminationModal.classList.remove('active');
    }, 7000);
  }

  // ══════════════════════════════════════════════════════════
  // مشاهد سينمائية 7 ثوانٍ (v4) — مشتركة لكل أحداث اللعبة
  // بناء DOM ديناميكي + CSS keyframes (transform/opacity فقط)
  // ══════════════════════════════════════════════════════════
  let SCENE_LIFETIME = 7000; // كل أنميشن يظهر 7 ثوانٍ كاملة
  const fxAvatar = (p) => (p && (p.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerNumber}`)) || '';
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function fxMount(el) {
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, SCENE_LIFETIME);
  }

  function showKickAnimation(player, by) {
    if (!player) return;
    const lines = [
      '🦵 رفسة طيارة... بالعكس، طيران مجاني!',
      '😂 طار من اللعبة بسرعة الضوء!',
      '💨 باي باي... نشوفك الجولة الجاية!',
      '🥁 آخر صورة له قبل الإقلاع...',
      '😬 هذا اللي يصير لما تختار الشخص الغلط!',
      '🛫 رحلة ذهاب بدون عودة — بوينغ!'
    ];
    const container = document.createElement('div');
    container.className = 'fx-overlay fx-kick shaking';
    container.innerHTML = `
      <div class="fx-scene kick-scene-v4">
        <div class="kick-warning-stripe"></div>
        ${by ? `<img class="kick-kicker" src="${fxAvatar(by)}" alt="">` : ''}
        <div class="kick-leg">🦵</div>
        <div class="kick-boot">👟</div>
        <img class="kick-victim" src="${fxAvatar(player)}" alt="">
        <div class="kick-impact">💥</div>
        <div class="kick-flash"></div>
        <div class="kick-stars"><span>⭐</span><span>💫</span><span>✨</span><span>⭐</span><span>💥</span><span>💫</span></div>
        <div class="kick-dust">💨</div>
        <div class="kick-dust d2">💨</div>
        <div class="kick-sub">🦵 ${by ? by.nickname : 'صاحب القرار'} ركل ${player.nickname} خارج اللعبة!</div>
        <div class="kick-text">${pick(lines)}</div>
      </div>`;
    fxMount(container);
  }

  function showDefenseTaunt(player, giftName, coins) {
    if (!player) return;
    const taunts = [
      '😂 الرفسة رجعت بالعكس!',
      '😜 حاول كمان... مستحيل توصل!',
      '😎 جدار حديدي، مو أي جدار!',
      '🤣 مشي يا حبيبي، مشي!',
      '😝 محمي من كل الاتجاهات!',
      '🙄 خلاص خلاص، ما ينفع هكذا!'
    ];
    const container = document.createElement('div');
    container.className = 'fx-overlay fx-taunt';
    container.innerHTML = `
      <div class="fx-scene dt-scene-v4">
        <img class="dt-defender" src="${fxAvatar(player)}" alt="">
        <div class="dt-shield">🛡️</div>
        <div class="dt-shoe">👟</div>
        <div class="dt-spark">✨</div>
        <div class="dt-bubble-tail">👇</div>
        <div class="dt-bubble">${pick(taunts)}</div>
        <div class="dt-info">🛡️ ${player.nickname} دافع عن نفسه بـ [${giftName || 'وردة'}] (${coins || 1} عملة)!</div>
      </div>`;
    fxMount(container);
  }

  // 🔄 العودة بعد الإقصاء — اللاعب يصعد من "مقبرته" وينفض الغبار
  function showRejoinAnimation(player, coins, helperName) {
    if (!player) return;
    const lines = helperName
      ? ['❤️ صديق وفّي ما نسيه!', '🤝 ساعدوه ورجع أقوى!', '💖 العملة الذكية رجعته للمعركة!']
      : ['🔄 عاد من الأموات!', '😎 لم تنته الحكاية بعد!', '🔥 العودة كانت لا بد أن تحدث!', '💰 اشترى تذكرته بجيب موفق!'];
    const container = document.createElement('div');
    container.className = 'fx-overlay fx-rejoin';
    container.innerHTML = `
      <div class="fx-scene rj-scene">
        <div class="rj-portal"></div>
        <div class="rj-portal-ring"></div>
        <img class="rj-player" src="${fxAvatar(player)}" alt="">
        <div class="rj-hand">🤚</div>
        <div class="rj-sparkles"><span>✨</span><span>💫</span><span>⭐</span><span>✨</span></div>
        <div class="rj-ghost">👻</div>
        <div class="rj-bubble">${pick(lines)}</div>
        <div class="rj-info">${helperName
          ? `❤️ ${helperName} أعاد ${player.nickname} إلى اللعبة!`
          : `🔄 ${player.nickname} دفع ${coins || 5} عملة وعاد رقمه #${player.playerNumber}!`}</div>
      </div>`;
    fxMount(container);
  }

  // 🛡️ تفعيل الحصانة — قبة درع تنزل على اللاعب + حلقة دوارة
  function showShieldAura(player, rounds) {
    if (!player) return;
    const container = document.createElement('div');
    container.className = 'fx-overlay fx-shield';
    container.innerHTML = `
      <div class="fx-scene sh-scene">
        <img class="sh-player" src="${fxAvatar(player)}" alt="">
        <div class="sh-num">#${player.playerNumber}</div>
        <div class="sh-dome"></div>
        <div class="sh-ring"></div>
        <div class="sh-ring r2"></div>
        <div class="sh-glyph">🛡️</div>
        <div class="sh-sparks"><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>
        <div class="sh-title">🛡️ حـصـانـة كـامـلـة!</div>
        <div class="sh-info">${player.nickname} أصبح منيعاً من الاستهداف (${rounds || 1} جولة)</div>
      </div>`;
    fxMount(container);
  }

  // 💔 استهلاك الدرع عند الإقصاء — الدرع يتشقق ويتحطم ويبقى اللاعب
  function showShieldBreak(player) {
    if (!player) return;
    const container = document.createElement('div');
    container.className = 'fx-overlay fx-shield-break';
    container.innerHTML = `
      <div class="fx-scene sb-scene">
        <img class="sb-player" src="${fxAvatar(player)}" alt="">
        <div class="sb-shield">🛡️</div>
        <div class="sb-crack c1">⚡</div>
        <div class="sb-crack c2">⚡</div>
        <div class="sb-crack c3">💥</div>
        <div class="sb-shards"><span>🔷</span><span>🔹</span><span>💠</span><span>🔷</span><span>🔹</span></div>
        <div class="sb-relief">😮‍💨</div>
        <div class="sb-title">💔 الدرع تحطّم... لكنه نجا!</div>
        <div class="sb-info">🛡️ ${player.nickname} استهلك درع الحصانة وبقي في اللعبة!</div>
      </div>`;
    fxMount(container);
  }

  // 🏆 إعلان الحسم النهائي — أضواء مسرحية + إعلان ضخم
  function showFinalRoundAnnounce(duration) {
    const fConf = currentSnapshot?.settings?.gifts?.finalRound;
    const fInfo = getGiftInfo(fConf?.giftId || fConf?.giftName || 'rocket');
    const container = document.createElement('div');
    container.className = 'fx-overlay fx-final';
    container.innerHTML = `
      <div class="fx-scene fin-scene">
        <div class="fin-spotlight sl1"></div>
        <div class="fin-spotlight sl2"></div>
        <div class="fin-rays"></div>
        <div class="fin-stamp">🏆</div>
        <div class="fin-title">حـسـم الـجـولـة!</div>
        <div class="fin-sub">آخر رحلة... من يجمع أكبر عدد هدائياً يفوز!</div>
        <div class="fin-gift-row">
          <img class="fin-gift-img" src="${fInfo.image}" alt="">
          <div class="fin-gift-pill">🎁 ${fConf?.giftName || fInfo.nameAr} — ${fConf?.minCoins || fInfo.coins || 100} عملة</div>
          <div class="fin-timer-pill">⏱️ ${duration || 20} ثانية</div>
        </div>
      </div>`;
    fxMount(container);
  }

  function showWinnerModal(winner) {
    if (!winnerModal || !winner) return;
    if (winnerAvatar) winnerAvatar.src = winner.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner.playerNumber}`;
    if (winnerName) winnerName.textContent = winner.nickname;
    if (winnerUser) winnerUser.textContent = `@${winner.uniqueId}`;
    if (winnerNum) winnerNum.textContent = `#${winner.playerNumber}`;
    const wConf = currentSnapshot?.settings?.gifts?.winnerChallenge;
    const wInfo = getGiftInfo(wConf?.giftId || wConf?.giftName || 'crown');
    const wBox = document.getElementById('winnerChallengeBox');
    const wImg = document.getElementById('winnerChallengeGiftImg');
    const wText = document.getElementById('winnerChallengeText');
    if (wImg) wImg.src = wInfo.image;
    if (wText) wText.textContent = `أرسل [${wConf?.giftName || wInfo.nameAr}] (${wConf?.minCoins || wInfo.coins || 100} عملة) لتحدي البطل`;
    if (wBox) wBox.style.display = 'flex';
    winnerModal.classList.add('active');
  }

  function hideAllModals() {
    [turnModal, targetSelectionModal, confrontationModal, eliminationModal, winnerModal, resultModal].forEach(m => {
      if (m) m.classList.remove('active');
    });
  }

  function updateTimerVisual(remaining, total) {
    if (timerDigits) timerDigits.textContent = remaining;
    if (timerCircleProgress) {
      const frac = Math.max(0, remaining / (total || 30));
      timerCircleProgress.style.strokeDashoffset = 283 - (frac * 283);
      timerCircleProgress.style.stroke = remaining <= 5 ? '#ef4444' : '#f59e0b';
    }
  }

  function setBanner(text) {
    if (actionBannerText) actionBannerText.textContent = text;
  }

  // ── Drawer Actions ────────────────────────────────────────
  function updateDrawerUI() {
    if (!currentSnapshot) return;
    if (drawerStateBadge) drawerStateBadge.textContent = `الجولة #${currentSnapshot.roundNumber} (${currentSnapshot.state})`;
    if (btnDrawerToggleJoin) btnDrawerToggleJoin.textContent = currentSnapshot.settings?.isJoinOpen ? '🔒 إغلاق الانضمام' : '🔓 فتح الانضمام';
    populateDrawerSettings();
  }

  function applyWheelConfigFromSnapshot() {
    const wc = currentSnapshot?.settings?.wheelConfig;
    if (wc) {
      wheel.updateConfig(wc);
      if (wheelThemeSelect) wheelThemeSelect.value = wc.theme || 'casino';
      if (wheelSpinDuration) wheelSpinDuration.value = wc.spinDuration || 6500;
      if (wheelShowAvatars) wheelShowAvatars.checked = wc.showPlayerAvatars !== false;
      if (wheelShowNames) wheelShowNames.checked = wc.showPlayerNames !== false;
    }
    const avatar = currentSnapshot?.settings?.streamerAvatar;
    if (avatar && wheel && wheel.setCenterImage) wheel.setCenterImage(avatar);
  }

  // TikTok Connect in Drawer
  if (btnDrawerConnect) {
    btnDrawerConnect.addEventListener('click', async () => {
      if (STANDALONE_MODE) {
        await connectTikTok(drawerTiktokUser?.value || welcomeUsername?.value);
        return;
      }
      const username = drawerTiktokUser.value.trim().replace(/^@/, '');
      if (!username) { alert('يرجى إدخال اسم حساب تيك توك صاحب البث'); return; }

      if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = `<span style="color:#f59e0b;">⏳ جاري محاولة الاتصال بـ @${username}...</span>`;

      if (BACKEND_URL || STANDALONE_MODE) {
        const data = await apiPost('/tiktok/connect', { username });
        if (data) {
          if (!data.success) {
            if (drawerTiktokStatusText) drawerTiktokStatusText.innerHTML = `<span style="color:#ef4444;">❌ ${data.error || 'فشل الاتصال'}</span><br><small style="color:#94a3b8;">💡 جرب وضع TikFinity بدلاً من الربط المباشر</small>`;
          }
        }
      } else {
        // Demo mode simulation
        setTimeout(() => {
          const mockStatus = { status: 'connected', username, connectionMode: 'simulator', roomInfo: { viewerCount: Math.floor(Math.random() * 200) + 50 } };
          updateTikTokBadge(mockStatus);
          if (bc) bc.postMessage({ type: 'tiktok_status', status: mockStatus });
          alert(`✅ تم ربط @${username} في وضع المحاكاة`);
        }, 500);
      }
    });
  }

  if (btnDrawerDisconnect) {
    btnDrawerDisconnect.addEventListener('click', async () => {
      if (STANDALONE_MODE) {
        if (liveClient) liveClient.disconnect();
        currentUsername = '';
        updateTikTokBadge({ status: 'disconnected' });
        setConnectStatus('checking', 'تم قطع الاتصال. أدخل اسم مستخدم جديداً.');
        showWelcomeModal();
        return;
      }
      if (BACKEND_URL) await apiPost('/tiktok/disconnect');
      const s = { status: 'disconnected', username: null };
      updateTikTokBadge(s);
      if (bc) bc.postMessage({ type: 'tiktok_status', status: s });
    });
  }

  // Game Control Buttons in Drawer (with socket guard)
  const drawerControlActions = [
    [btnDrawerToggleJoin, '/control/join', {}],
    [btnDrawerNextRound, '/control/round/next', {}],
    [btnDrawerCancelElim, '/control/elimination/cancel', {}],
    [btnDrawerPauseTimer, '/control/timer/pause', {}],
    [btnDrawerResumeTimer, '/control/timer/resume', {}],
    [btnDrawerExtendTimer, '/control/timer/extend', { seconds: 15 }]
  ];

  drawerControlActions.forEach(([btn, path, body]) => {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      await apiPost(path, body);
    });
  });

  if (btnDrawerFinalRound) {
    btnDrawerFinalRound.addEventListener('click', async () => {
      if (confirm('هل تريد بدء مرحلة الحسم النهائي الآن؟')) {
        await apiPost('/control/round/final');
        adminDrawerModal.classList.remove('active');
      }
    });
  }

  if (btnDrawerResetGame) {
    btnDrawerResetGame.addEventListener('click', async () => {
      if (confirm('تحذير: هل أنت متأكد من إعادة تعيين اللعبة؟')) {
        if (BACKEND_URL || STANDALONE_MODE) {
          await apiPost('/control/game/reset');
        } else {
          allPlayers = [];
          currentSnapshot = { ...currentSnapshot, state: 'WAITING_FOR_PLAYERS', roundNumber: 1, chosenPlayer: null, targetPlayer: null };
          hideAllModals();
          renderAll();
          if (bc) {
            bc.postMessage({ type: 'game_reset' });
            bc.postMessage({ type: 'players_updated', players: [] });
          }
        }
      }
    });
  }

  // Gift Config Tab
  function renderGiftConfigTab() {
    if (!giftConfigContainer) return;
    const gifts = currentSnapshot?.settings?.gifts || {
      defense: { giftName: 'وردة', giftId: 'rose', minCoins: 1 },
      shield: { giftName: 'نظارات شمسية', giftId: 'sunglasses', minCoins: 199 },
      rejoin: { giftName: 'قلب الحب', giftId: 'heart', minCoins: 49 },
      finalRound: { giftName: 'صاروخ', giftId: 'rocket', minCoins: 4888 }
    };

    const categories = [
      { key: 'defense', label: '🛡️ هدية الدفاع عن النفس' },
      { key: 'shield', label: '🕶️ هدية الحصانة / الدرع' },
      { key: 'rejoin', label: '🔄 هدية العودة إلى اللعبة' },
      { key: 'help', label: '❤️ هدية المساعدة / الإنقاذ' },
      { key: 'finalRound', label: '🚀 هدية حسم الجولة' },
      { key: 'winnerChallenge', label: '👑 هدية تحدي الفائز' }
    ];

    giftConfigContainer.innerHTML = categories.map(cat => {
      const cur = gifts[cat.key] || {};
      const giftInfo = getGiftInfo(cur.giftId || cur.giftName || 'rose');
      return `
        <div class="gift-config-card" data-cat-key="${cat.key}">
          <div class="gift-config-header"><span class="gift-config-title">${cat.label}</span></div>
          <div class="gift-current-preview">
            <img class="gift-preview-img" src="${giftInfo.image}" alt="" onerror="this.style.opacity='0.3'">
            <div class="gift-preview-details">
              <div class="gift-preview-name">${cur.giftName || giftInfo.nameAr}</div>
              <div class="gift-preview-coins">${cur.minCoins || giftInfo.coins} عملة</div>
            </div>
          </div>
          <div class="gift-coins-input-row">
            <label>قيمة العملات:</label>
            <input type="number" class="drawer-input cat-coins-input" value="${cur.minCoins || giftInfo.coins}" min="1" data-cat="${cat.key}">
          </div>
          <div style="font-size:12px;font-weight:700;color:#cbd5e1;margin-top:4px;">اختر من صور الهدايا:</div>
          <div class="gift-catalog-selector">
            ${giftCatalog.map(g => {
              const isSelected = cur.giftId === g.id;
              return `<button type="button" class="gift-item-btn ${isSelected ? 'selected' : ''}"
                onclick="window.selectGiftForCategory('${cat.key}', '${g.id}', '${g.nameAr}', ${g.coins})">
                <img src="${g.image}" alt="${g.nameAr}" onerror="this.style.opacity='0.3'">
                <span>${g.nameAr}</span>
              </button>`;
            }).join('')}
          </div>
        </div>`;
    }).join('');

    document.querySelectorAll('.cat-coins-input').forEach(inp => {
      inp.addEventListener('change', async (e) => {
        const catKey = e.target.dataset.cat;
        const newCoins = parseInt(e.target.value, 10) || 1;
        if (!currentSnapshot) return;
        if (!currentSnapshot.settings.gifts) currentSnapshot.settings.gifts = {};
        if (!currentSnapshot.settings.gifts[catKey]) currentSnapshot.settings.gifts[catKey] = {};
        currentSnapshot.settings.gifts[catKey].minCoins = newCoins;
        if (BACKEND_URL || STANDALONE_MODE) await apiPost('/settings', { gifts: currentSnapshot.settings.gifts });
        else if (bc) bc.postMessage({ type: 'settings_updated', settings: currentSnapshot.settings });
      });
    });
  }

  window.selectGiftForCategory = async (catKey, giftId, giftName, defaultCoins) => {
    if (!currentSnapshot) return;
    if (!currentSnapshot.settings.gifts) currentSnapshot.settings.gifts = {};
    if (!currentSnapshot.settings.gifts[catKey]) currentSnapshot.settings.gifts[catKey] = {};
    currentSnapshot.settings.gifts[catKey].giftId = giftId;
    currentSnapshot.settings.gifts[catKey].giftName = giftName;
    currentSnapshot.settings.gifts[catKey].minCoins = defaultCoins;

    if (BACKEND_URL) await apiPost('/settings', { gifts: currentSnapshot.settings.gifts });
    else if (bc) bc.postMessage({ type: 'settings_updated', settings: currentSnapshot.settings });
    renderGiftConfigTab();
    updateGiftsLegend();
    renderHeader();
  };

  // Wheel Config
  if (btnApplyWheelConfig) {
    btnApplyWheelConfig.addEventListener('click', async () => {
      const wc = {
        theme: wheelThemeSelect?.value || 'casino',
        spinDuration: parseInt(wheelSpinDuration?.value || '6500', 10),
        showPlayerAvatars: wheelShowAvatars?.checked !== false,
        showPlayerNames: wheelShowNames?.checked !== false
      };
      wheel.updateConfig(wc);
      if (BACKEND_URL || STANDALONE_MODE) await apiPost('/settings', { wheelConfig: wc });
      else if (bc) {
        if (currentSnapshot?.settings) currentSnapshot.settings.wheelConfig = wc;
        bc.postMessage({ type: 'settings_updated', settings: currentSnapshot?.settings });
      }
      alert('تم تطبيق شكل العجلة! 🎡');
    });
  }

  // Drawer Simulator
  if (btnDrawerMockTen) {
    btnDrawerMockTen.addEventListener('click', async () => {
      if (BACKEND_URL || STANDALONE_MODE) {
        const mockNames = [
          { name: 'محمد 👑', user: 'mohammed_king' }, { name: 'سارة ✨', user: 'queen_sara' },
          { name: 'أحمد ⚡', user: 'ahmed_hawk' }, { name: 'فهد 🏎️', user: 'fahad_hero' },
          { name: 'نورة 🌟', user: 'noura_live' }, { name: 'خالد 🚀', user: 'khaled_star' },
          { name: 'مريم 🌸', user: 'mariam_rose' }, { name: 'علي 🔥', user: 'ali_chief' },
          { name: 'يوسف 🏆', user: 'yousef_leo' }, { name: 'ليلى 💎', user: 'laila_pearl' }
        ];
        for (const m of mockNames) {
          await apiPost('/simulate/join', { nickname: m.name, uniqueId: m.user, avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user}` });
        }
      } else {
        // Demo mode
        const mockList = [
          { name:'محمد 👑', user:'mohammed_king', gift:'lion', shield:false },
          { name:'سارة ✨', user:'queen_sara', gift:'heart', shield:true },
          { name:'أحمد ⚡', user:'ahmed_hawk', gift:'cap', shield:false },
          { name:'فهد 🏎️', user:'fahad_hero', gift:'car', shield:false },
          { name:'نورة 🌟', user:'noura_live', gift:'pearl', shield:false },
          { name:'خالد 🚀', user:'khaled_star', gift:'rocket', shield:false },
          { name:'مريم 🌸', user:'mariam_rose', gift:'rose', shield:false },
          { name:'علي 🔥', user:'ali_chief', gift:'trophy', shield:false },
          { name:'يوسف 🏆', user:'yousef_leo', gift:'crown', shield:false },
          { name:'ليلى 💎', user:'laila_pearl', gift:'perfume', shield:false }
        ];
        allPlayers = mockList.map((m, i) => ({
          id: `sim_${i+1}`, playerNumber: i+1, nickname: m.name, uniqueId: m.user,
          status: m.shield ? 'immune' : 'active', hasShield: m.shield,
          coins: 0, killsCount: 0, profilePictureUrl: `assets/gifts/${m.gift}.png`
        }));
        if (currentSnapshot) { currentSnapshot.state = 'READY'; currentSnapshot.roundNumber = 1; }
        wheel.setPlayers(allPlayers);
        renderAll();
        if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
        alert('✅ تمت إضافة 10 لاعبين!');
      }
    });
  }

  if (btnSimDrawerJoin) {
    btnSimDrawerJoin.addEventListener('click', async () => {
      const u = simDrawerJoinUser?.value?.trim().replace(/^@/, '') || `user_${Date.now() % 1000}`;
      const n = simDrawerJoinNick?.value?.trim() || u;
      if (BACKEND_URL || STANDALONE_MODE) {
        await apiPost('/simulate/join', { nickname: n, uniqueId: u, avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${u}` });
      } else {
        const nextNum = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.playerNumber || 0)) + 1 : 1;
        const gifts = ['lion','heart','cap','rocket','rose','trophy','pearl','car'];
        allPlayers.push({ id:`p_${Date.now()}`, playerNumber:nextNum, nickname:n, uniqueId:u, status:'active', hasShield:false, coins:0, killsCount:0, profilePictureUrl:`assets/gifts/${gifts[nextNum % gifts.length]}.png` });
        wheel.setPlayers(allPlayers);
        renderAll();
        if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
        alert(`✅ انضم ${n} (#${nextNum})`);
      }
      if (simDrawerJoinNick) simDrawerJoinNick.value = '';
      if (simDrawerJoinUser) simDrawerJoinUser.value = '';
    });
  }

  if (btnSimDrawerComment) {
    btnSimDrawerComment.addEventListener('click', async () => {
      const uid = simDrawerCommentUser?.value;
      const txt = simDrawerCommentText?.value?.trim();
      if (!txt) return;
      if (BACKEND_URL || STANDALONE_MODE) {
        await apiPost('/simulate/comment', { uniqueId: uid, commentText: txt });
      } else {
        const num = parseInt(txt, 10);
        if (!isNaN(num)) window.selectTargetPlayer(num);
      }
      if (simDrawerCommentText) simDrawerCommentText.value = '';
      adminDrawerModal.classList.remove('active');
    });
  }

  if (btnSimDrawerAutoTarget) {
    btnSimDrawerAutoTarget.addEventListener('click', () => {
      if (!currentSnapshot?.chosenPlayer) { alert('يجب تشغيل الروليت أولاً!'); return; }
      if (simDrawerCommentUser) simDrawerCommentUser.value = currentSnapshot.chosenPlayer.uniqueId;
      const eligible = allPlayers.filter(p =>
        (p.status === 'active' || p.status === 'immune') &&
        p.id !== currentSnapshot.chosenPlayer.id && !p.hasShield && p.status !== 'immune'
      );
      if (simDrawerCommentText) simDrawerCommentText.value = eligible.length > 0 ? `${eligible[0].playerNumber}` : '2';
    });
  }

  document.querySelectorAll('[data-drawer-gift]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const giftType = btn.dataset.drawerGift;
      const gConf = currentSnapshot?.settings?.gifts;
      let uniqueId = simDrawerCommentUser?.value || (allPlayers[0]?.uniqueId) || 'user_1';
      let giftName = 'وردة', coins = 1;

      if (giftType === 'defense') {
        if (currentSnapshot?.targetPlayer) uniqueId = currentSnapshot.targetPlayer.uniqueId;
        giftName = gConf?.defense?.giftName || 'وردة'; coins = gConf?.defense?.minCoins || 1;
      } else if (giftType === 'rejoin') {
        const elim = allPlayers.filter(p => p.status === 'eliminated');
        if (elim.length > 0) uniqueId = elim[0].uniqueId;
        giftName = gConf?.rejoin?.giftName || 'قلب'; coins = gConf?.rejoin?.minCoins || 5;
      } else if (giftType === 'help') {
        giftName = gConf?.help?.giftName || 'كاب'; coins = gConf?.help?.minCoins || 16;
      } else if (giftType === 'shield') {
        giftName = gConf?.shield?.giftName || 'نظارات'; coins = gConf?.shield?.minCoins || 30;
      } else if (giftType === 'final') {
        giftName = gConf?.finalRound?.giftName || 'صاروخ'; coins = gConf?.finalRound?.minCoins || 100;
      }

      if (BACKEND_URL || STANDALONE_MODE) {
        await apiPost('/simulate/gift', { uniqueId, giftName, coins, repeatCount: 1 });
      } else {
        const p = allPlayers.find(x => x.uniqueId === uniqueId);
        if (p) {
          p.coins = (p.coins || 0) + coins;
          if (giftType === 'shield') { p.hasShield = true; p.status = 'immune'; }
          else if (giftType === 'rejoin' && p.status === 'eliminated') { p.status = 'active'; }
        }
        renderAll();
        if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
        alert(`🎁 هدية [${giftName}] من @${uniqueId}`);
      }
      adminDrawerModal.classList.remove('active');
    });
  });

  // Drawer Player Management
  if (drawerAddPlayerForm) {
    drawerAddPlayerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickname = drawerAddNick?.value?.trim();
      const uniqueId = drawerAddUser?.value?.trim();
      if (!nickname) return;

      if (BACKEND_URL || STANDALONE_MODE) {
        await apiPost('/players/add', { nickname, uniqueId });
      } else {
        const nextNum = allPlayers.length > 0 ? Math.max(...allPlayers.map(p => p.playerNumber || 0)) + 1 : 1;
        const gifts = ['lion','heart','cap','rocket','rose','trophy','pearl','car'];
        allPlayers.push({ id:`p_${Date.now()}`, playerNumber:nextNum, nickname, uniqueId: uniqueId || `user_${nextNum}`, status:'active', hasShield:false, coins:0, killsCount:0, profilePictureUrl:`assets/gifts/${gifts[nextNum % gifts.length]}.png` });
        wheel.setPlayers(allPlayers);
        renderAll();
        if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
        alert(`✅ تمت إضافة ${nickname}`);
      }
      if (drawerAddNick) drawerAddNick.value = '';
      if (drawerAddUser) drawerAddUser.value = '';
    });
  }

  function renderDrawerPlayersTable() {
    if (!drawerPlayersTableBody) return;
    drawerPlayersTableBody.innerHTML = allPlayers.map(p => {
      let stColor = '#34d399', stText = 'نشط 🟢';
      if (p.status === 'eliminated') { stColor = '#f87171'; stText = 'مستبعد ☠️'; }
      else if (p.hasShield || p.status === 'immune') { stColor = '#60a5fa'; stText = 'محصن 🛡️'; }

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="padding:6px 8px;"><strong>#${p.playerNumber}</strong></td>
          <td style="padding:6px 8px;">
            <img src="${p.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.playerNumber}`}" style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-left:6px;" alt="" onerror="this.style.display='none'">
            <span>${escapeHtml(p.nickname)}</span>
          </td>
          <td style="padding:6px 8px;color:${stColor};font-weight:700;">${stText}</td>
          <td style="padding:6px 8px;">
            ${p.status === 'eliminated'
              ? `<button class="drawer-btn" style="padding:2px 6px;font-size:11px;background:#16a34a;" onclick="window.drawerRevivePlayer('${p.id}')">إعادة 🔄</button>`
              : `<button class="drawer-btn" style="padding:2px 6px;font-size:11px;" onclick="window.drawerToggleShield('${p.id}', ${!p.hasShield})">${p.hasShield ? 'إلغاء الحصانة' : 'حصانة 🛡️'}</button>`
            }
            <button class="drawer-btn drawer-btn-danger" style="padding:2px 6px;font-size:11px;" onclick="window.drawerDeletePlayer('${p.id}')">حذف</button>
          </td>
        </tr>`;
    }).join('');
  }

  window.drawerRevivePlayer = async (id) => {
    if (STANDALONE_MODE) {
      await apiPost(`/players/${encodeURIComponent(id)}/revive`);
      return;
    }
    if (BACKEND_URL) { await apiPost(`/players/${id}/revive`.replace('/api', '')); }
    else {
      const p = allPlayers.find(x => x.id === id);
      if (p) { p.status = 'active'; renderAll(); if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers }); }
    }
  };
  window.drawerToggleShield = async (id, hasShield) => {
    if (STANDALONE_MODE) {
      await apiPost(`/players/${encodeURIComponent(id)}/shield`, { hasShield, rounds: 1 });
      return;
    }
    if (BACKEND_URL) {
      const url = BACKEND_URL ? `${BACKEND_URL}/api/players/${id}/shield` : `/api/players/${id}/shield`;
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hasShield, rounds: 1 }) });
    } else {
      const p = allPlayers.find(x => x.id === id);
      if (p) { p.hasShield = hasShield; p.status = hasShield ? 'immune' : 'active'; renderAll(); if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers }); }
    }
  };
  window.drawerDeletePlayer = async (id) => {
    if (!confirm('حذف هذا اللاعب؟')) return;
    if (STANDALONE_MODE) {
      await apiPost(`/players/${encodeURIComponent(id)}/delete`);
      return;
    }
    if (BACKEND_URL) {
      const url = BACKEND_URL ? `${BACKEND_URL}/api/players/${id}` : `/api/players/${id}`;
      await fetch(url, { method: 'DELETE' });
    } else {
      allPlayers = allPlayers.filter(p => p.id !== id);
      wheel.setPlayers(allPlayers); renderAll(); if (bc) bc.postMessage({ type: 'players_updated', players: allPlayers });
    }
  };

  function updateSimCommentDropdown() {
    if (!simDrawerCommentUser) return;
    const cur = simDrawerCommentUser.value;
    simDrawerCommentUser.innerHTML = allPlayers.map(p =>
      `<option value="${p.uniqueId}">#${p.playerNumber} - ${p.nickname} (@${p.uniqueId})</option>`
    ).join('');
    if (cur) simDrawerCommentUser.value = cur;
  }

  // Drawer Settings Form
  if (drawerSettingsForm) {
    drawerSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updated = {
        joinKeyword: setDrawerJoinKw?.value?.trim() || 'تم',
        maxPlayers: parseInt(setDrawerMaxPlayers?.value || '30', 10),
        timeoutBehavior: setDrawerTimeout?.value || 'skip',
        streamerAvatar: setDrawerStreamerAvatar?.value?.trim() || '',
        streamerName: setDrawerStreamerName?.value?.trim() || '',
        background: {
          type: setDrawerBgType?.value || 'gradient',
          color1: setDrawerBgColor1?.value || '#0a0612',
          color2: setDrawerBgColor2?.value || '#1a1030',
          pattern: setDrawerBgPattern?.value || 'none'
        },
        timers: {
          targetSelectDuration: parseInt(setDrawerTargetSec?.value || '20', 10),
          defenseDuration: parseInt(setDrawerDefSec?.value || '30', 10),
          challengeDuration: parseInt(setDrawerChallengeSec?.value || '20', 10),
          finalRoundDuration: parseInt(setDrawerFinalSec?.value || '20', 10),
          joinDuration: parseInt(setDrawerJoinSec?.value || '60', 10),
          sceneLifetime: parseInt(setDrawerSceneSec?.value || '7', 10) * 1000
        }
      };
      if (BACKEND_URL || STANDALONE_MODE) {
        await apiPost('/settings', updated);
        SCENE_LIFETIME = updated.timers?.sceneLifetime || SCENE_LIFETIME;
        if (wheel && updated.streamerAvatar) wheel.setCenterImage(updated.streamerAvatar);
        applyBackground(updated.background);
      } else {
        if (currentSnapshot?.settings) Object.assign(currentSnapshot.settings, updated);
        if (bc) bc.postMessage({ type: 'settings_updated', settings: currentSnapshot?.settings });
      }
      alert('تم حفظ الإعدادات! ✅');
    });
  }

  function populateDrawerSettings() {
    const s = currentSnapshot?.settings;
    if (!s) return;
    if (setDrawerJoinKw) setDrawerJoinKw.value = s.joinKeyword || 'تم';
    if (setDrawerMaxPlayers) setDrawerMaxPlayers.value = s.maxPlayers || 30;
    if (setDrawerTimeout) setDrawerTimeout.value = s.timeoutBehavior || 'skip';
    if (setDrawerTargetSec) setDrawerTargetSec.value = s.timers?.targetSelectDuration || 20;
    if (setDrawerDefSec) setDrawerDefSec.value = s.timers?.defenseDuration || 30;
    if (setDrawerChallengeSec) setDrawerChallengeSec.value = s.timers?.challengeDuration || 20;
    if (setDrawerFinalSec) setDrawerFinalSec.value = s.timers?.finalRoundDuration || 20;
    if (setDrawerJoinSec) setDrawerJoinSec.value = s.timers?.joinDuration || 60;
    if (setDrawerSceneSec) setDrawerSceneSec.value = Math.round((s.timers?.sceneLifetime || 7000) / 1000);
    SCENE_LIFETIME = s.timers?.sceneLifetime || SCENE_LIFETIME || 7000;
    if (setDrawerStreamerAvatar) setDrawerStreamerAvatar.value = s.streamerAvatar || '';
    if (setDrawerStreamerName) setDrawerStreamerName.value = s.streamerName || '';
    const bg = s.background || {};
    if (setDrawerBgType) setDrawerBgType.value = bg.type || 'gradient';
    if (setDrawerBgColor1) setDrawerBgColor1.value = bg.color1 || '#0a0612';
    if (setDrawerBgColor2) setDrawerBgColor2.value = bg.color2 || '#1a1030';
    if (setDrawerBgPattern) setDrawerBgPattern.value = bg.pattern || 'none';
  }

  // Drawer Logs
  function appendDrawerLog(entry) {
    if (!drawerLogsContainer) return;
    const row = document.createElement('div');
    row.style.cssText = 'padding:4px 8px;background:rgba(255,255,255,0.03);border-radius:6px;';
    const timeStr = new Date(entry.timestamp).toLocaleTimeString('ar');
    row.innerHTML = `<span style="color:var(--text-muted);">[${timeStr}]</span> <span style="color:#e2e8f0;">${escapeHtml(entry.message)}</span>`;
    drawerLogsContainer.prepend(row);
  }

  if (btnDrawerClearLogs) {
    btnDrawerClearLogs.addEventListener('click', async () => {
      if (STANDALONE_MODE && browserStorage) {
        browserStorage.clearLogs();
      } else if (BACKEND_URL) {
        const url = BACKEND_URL ? `${BACKEND_URL}/api/logs` : '/api/logs';
        await fetch(url, { method: 'DELETE' }).catch(() => {});
      }
      if (drawerLogsContainer) drawerLogsContainer.innerHTML = '';
    });
  }

  if (STANDALONE_MODE) {
    if (browserStorage) {
      try { browserStorage.loadLogs(40).reverse().forEach(appendDrawerLog); } catch (e) {}
    }
  } else if (BACKEND_URL) {
    fetch(`${BACKEND_URL}/api/logs?limit=40`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.logs) d.logs.reverse().forEach(appendDrawerLog); })
      .catch(() => {});
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>'"]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[tag] || tag));
  }
});
