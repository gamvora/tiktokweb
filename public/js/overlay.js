// Broadcast Screen Overlay Engine with Built-in Admin Drawer & Direct Main Spin Button
document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  const wheel = new RouletteWheel('rouletteCanvas');

  // DOM Elements - Overlay
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

  // Join Instructions Card (قبل بدء اللعبة)
  const joinInstructionsCard = document.getElementById('joinInstructionsCard');
  const joinKeywordHighlight = document.getElementById('joinKeywordHighlight');

  // Gifts Legend Box Elements (مربع الهدايا على الجانب)
  const giftsLegendBox = document.getElementById('giftsLegendBox');
  const legendDefImg = document.getElementById('legendDefImg');
  const legendDefText = document.getElementById('legendDefText');
  const legendShieldImg = document.getElementById('legendShieldImg');
  const legendShieldText = document.getElementById('legendShieldText');
  const legendRejoinImg = document.getElementById('legendRejoinImg');
  const legendRejoinText = document.getElementById('legendRejoinText');
  const legendFinalImg = document.getElementById('legendFinalImg');
  const legendFinalText = document.getElementById('legendFinalText');

  // Modals - Overlay
  const turnModal = document.getElementById('turnModal');
  const turnAvatar = document.getElementById('turnAvatar');
  const turnPlayerNum = document.getElementById('turnPlayerNum');
  const turnPlayerName = document.getElementById('turnPlayerName');

  // ★ Target Selection Modal & Player Grid Elements ★
  const targetSelectionModal = document.getElementById('targetSelectionModal');
  const tsChooserAvatar = document.getElementById('tsChooserAvatar');
  const tsChooserNum = document.getElementById('tsChooserNum');
  const tsChooserName = document.getElementById('tsChooserName');
  const tsTimerProgress = document.getElementById('tsTimerProgress');
  const tsTimerDigits = document.getElementById('tsTimerDigits');
  const tsPlayerGrid = document.getElementById('tsPlayerGrid');

  // Confrontation Modal
  const confrontationModal = document.getElementById('confrontationModal');
  const selectorAvatar = document.getElementById('selectorAvatar');
  const selectorName = document.getElementById('selectorName');
  const selectorNum = document.getElementById('selectorNum');
  const targetAvatar = document.getElementById('targetAvatar');
  const targetName = document.getElementById('targetName');
  const targetNum = document.getElementById('targetNum');
  const defenseGiftText = document.getElementById('defenseGiftText');
  const defenseGiftImg = document.getElementById('defenseGiftImg');

  // ★ Dedicated Elimination Modal Elements ★
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

  // Winner Modal Elements
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

  // Admin Drawer Elements
  const adminDrawerModal = document.getElementById('adminDrawerModal');
  const btnCloseAdminDrawer = document.getElementById('btnCloseAdminDrawer');
  const drawerStateBadge = document.getElementById('drawerStateBadge');
  const drawerPlayerCount = document.getElementById('drawerPlayerCount');
  const drawerTiktokUser = document.getElementById('drawerTiktokUser');
  const btnDrawerConnect = document.getElementById('btnDrawerConnect');
  const btnDrawerDisconnect = document.getElementById('btnDrawerDisconnect');
  const drawerTiktokStatusText = document.getElementById('drawerTiktokStatusText');
  const drawerWebhookUrl = document.getElementById('drawerWebhookUrl');
  const btnCopyWebhook = document.getElementById('btnCopyWebhook');

  // Drawer Controls
  const btnDrawerToggleJoin = document.getElementById('btnDrawerToggleJoin');
  const btnDrawerNextRound = document.getElementById('btnDrawerNextRound');
  const btnDrawerFinalRound = document.getElementById('btnDrawerFinalRound');
  const btnDrawerCancelElim = document.getElementById('btnDrawerCancelElim');
  const btnDrawerPauseTimer = document.getElementById('btnDrawerPauseTimer');
  const btnDrawerResumeTimer = document.getElementById('btnDrawerResumeTimer');
  const btnDrawerExtendTimer = document.getElementById('btnDrawerExtendTimer');
  const btnDrawerResetGame = document.getElementById('btnDrawerResetGame');

  // Drawer Gift Configuration
  const giftConfigContainer = document.getElementById('giftConfigContainer');

  // Drawer Wheel Customization
  const wheelThemeSelect = document.getElementById('wheelThemeSelect');
  const wheelSpinDuration = document.getElementById('wheelSpinDuration');
  const wheelShowAvatars = document.getElementById('wheelShowAvatars');
  const wheelShowNames = document.getElementById('wheelShowNames');
  const btnApplyWheelConfig = document.getElementById('btnApplyWheelConfig');

  // Drawer Simulator
  const btnDrawerMockTen = document.getElementById('btnDrawerMockTen');
  const simDrawerJoinNick = document.getElementById('simDrawerJoinNick');
  const simDrawerJoinUser = document.getElementById('simDrawerJoinUser');
  const btnSimDrawerJoin = document.getElementById('btnSimDrawerJoin');
  const simDrawerCommentUser = document.getElementById('simDrawerCommentUser');
  const simDrawerCommentText = document.getElementById('simDrawerCommentText');
  const btnSimDrawerComment = document.getElementById('btnSimDrawerComment');
  const btnSimDrawerAutoTarget = document.getElementById('btnSimDrawerAutoTarget');

  // Drawer Players
  const drawerAddPlayerForm = document.getElementById('drawerAddPlayerForm');
  const drawerAddNick = document.getElementById('drawerAddNick');
  const drawerAddUser = document.getElementById('drawerAddUser');
  const drawerPlayersTableBody = document.getElementById('drawerPlayersTableBody');

  // Drawer Settings
  const drawerSettingsForm = document.getElementById('drawerSettingsForm');
  const setDrawerJoinKw = document.getElementById('setDrawerJoinKw');
  const setDrawerMaxPlayers = document.getElementById('setDrawerMaxPlayers');
  const setDrawerTimeout = document.getElementById('setDrawerTimeout');
  const setDrawerTargetSec = document.getElementById('setDrawerTargetSec');
  const setDrawerDefSec = document.getElementById('setDrawerDefSec');

  // Drawer Logs
  const drawerLogsContainer = document.getElementById('drawerLogsContainer');
  const btnDrawerClearLogs = document.getElementById('btnDrawerClearLogs');

  let currentSnapshot = null;
  let allPlayers = [];
  let currentTimerTotal = 30;
  let currentTargetSelectTotal = 20;
  let soundMuted = false;

  // Real Official TikTok Live Gift Catalog
  let giftCatalog = [
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

  // Fetch gifts catalog from server
  fetch('/api/gifts/catalog')
    .then(r => r.json())
    .then(d => {
      if (d.gifts && d.gifts.length > 0) {
        giftCatalog = d.gifts;
      }
      renderGiftConfigTab();
      updateGiftsLegend();
    })
    .catch(() => {
      renderGiftConfigTab();
      updateGiftsLegend();
    });

  function getGiftInfo(idOrName) {
    if (!idOrName) return giftCatalog[0];
    const match = giftCatalog.find(g =>
      g.id === idOrName ||
      g.nameAr.toLowerCase() === String(idOrName).toLowerCase() ||
      (g.nameEn && g.nameEn.toLowerCase() === String(idOrName).toLowerCase())
    );
    return match || {
      id: idOrName,
      nameAr: idOrName,
      emoji: '🎁',
      coins: 1,
      image: `assets/gifts/${idOrName}.png`
    };
  }

  // ★ Update Gifts Guide Legend on the Side ★
  function updateGiftsLegend() {
    const gifts = currentSnapshot?.settings?.gifts;
    if (!gifts) return;

    // 1. Defense
    if (legendDefImg && legendDefText) {
      const def = gifts.defense || {};
      const defInfo = getGiftInfo(def.giftId || def.giftName || 'rose');
      legendDefImg.src = defInfo.image;
      legendDefText.textContent = `${def.giftName || defInfo.nameAr} (${def.minCoins || defInfo.coins || 1} عملة) لإنقاذك من الإقصاء`;
    }

    // 2. Shield
    if (legendShieldImg && legendShieldText) {
      const shield = gifts.shield || {};
      const shieldInfo = getGiftInfo(shield.giftId || shield.giftName || 'sunglasses');
      legendShieldImg.src = shieldInfo.image;
      legendShieldText.textContent = `${shield.giftName || shieldInfo.nameAr} (${shield.minCoins || shieldInfo.coins || 30} عملة) حماية من الاستهداف`;
    }

    // 3. Rejoin
    if (legendRejoinImg && legendRejoinText) {
      const rejoin = gifts.rejoin || {};
      const rejoinInfo = getGiftInfo(rejoin.giftId || rejoin.giftName || 'heart');
      legendRejoinImg.src = rejoinInfo.image;
      legendRejoinText.textContent = `${rejoin.giftName || rejoinInfo.nameAr} (${rejoin.minCoins || rejoinInfo.coins || 5} عملات) للعودة للروليت`;
    }

    // 4. Final
    if (legendFinalImg && legendFinalText) {
      const final = gifts.finalRound || {};
      const finalInfo = getGiftInfo(final.giftId || final.giftName || 'rocket');
      legendFinalImg.src = finalInfo.image;
      legendFinalText.textContent = `${final.giftName || finalInfo.nameAr} (${final.minCoins || finalInfo.coins || 100} عملة) لحسم الفوز`;
    }
  }

  // Set Webhook URL in drawer
  if (drawerWebhookUrl) {
    drawerWebhookUrl.value = `${window.location.origin}/api/tikfinity/webhook`;
  }
  if (btnCopyWebhook) {
    btnCopyWebhook.addEventListener('click', () => {
      navigator.clipboard.writeText(drawerWebhookUrl.value);
      alert('تم نسخ رابط TikFinity Webhook!');
    });
  }

  // Sound Toggle
  if (btnToggleSound) {
    btnToggleSound.addEventListener('click', () => {
      soundMuted = !soundMuted;
      btnToggleSound.textContent = soundMuted ? '🔇' : '🔊';
      if (window.soundEngine) window.soundEngine.toggleSound(!soundMuted);
    });
  }

  // -------------------------------------------------------------
  // PROMINENT MAIN SPIN BUTTON ACTION (تحت الروليت بالواجهة الرئيسية)
  // -------------------------------------------------------------
  async function triggerRouletteSpin() {
    try {
      if (window.soundEngine) window.soundEngine.init();

      // If in demo mode (on GitHub Pages or backend disconnected)
      if (!socket.connected) {
        const active = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
        if (active.length < 2) {
          alert('يجب أن يكون هناك لاعبان على الأقل نشطان لتدوير العجلة!');
          return;
        }
        const chosen = active[Math.floor(Math.random() * active.length)];
        
        btnMainSpinRoulette.disabled = true;
        btnMainSpinRoulette.classList.add('disabled-pulse');
        btnMainSpinRoulette.textContent = '⏳ العجلة تدور الآن...';
        
        setBanner(`🎡 تدور العجلة الآن لاختيار صاحب الدور...`);
        hideAllModals();

        wheel.spinToPlayer(chosen, () => {
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
        return;
      }

      const res = await fetch('/api/control/roulette/start', { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        alert(data.reason || 'تعذر تشغيل الروليت');
      }
    } catch (e) {
      alert('خطأ: ' + e.message);
    }
  }

  if (btnMainSpinRoulette) {
    btnMainSpinRoulette.addEventListener('click', triggerRouletteSpin);
  }

  // -------------------------------------------------------------
  // Admin Drawer Toggle & Tabs
  // -------------------------------------------------------------
  if (btnOpenAdminDrawer) {
    btnOpenAdminDrawer.addEventListener('click', () => {
      adminDrawerModal.classList.add('active');
    });
  }

  if (btnCloseAdminDrawer) {
    btnCloseAdminDrawer.addEventListener('click', () => {
      adminDrawerModal.classList.remove('active');
    });
  }

  document.querySelectorAll('.drawer-tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('.drawer-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tabBtn.classList.add('active');
      const targetPane = document.getElementById(tabBtn.dataset.target);
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // -------------------------------------------------------------
  // Socket Synchronization
  // -------------------------------------------------------------
  socket.on('init_sync', (data) => {
    currentSnapshot = data.snapshot;
    allPlayers = data.players || [];
    applyWheelConfigFromSnapshot();
    renderAll();
    if (data.tiktokStatus) updateTikTokBadge(data.tiktokStatus);
  });

  socket.on('state_updated', (snapshot) => {
    currentSnapshot = snapshot;
    applyWheelConfigFromSnapshot();
    renderHeader();
    handleStateVisuals(snapshot);
    updateDrawerUI();
    updateSpinButtonState();
  });

  socket.on('players_updated', (players) => {
    allPlayers = players || [];
    wheel.setPlayers(allPlayers);
    renderPlayerLists();
    renderDrawerPlayersTable();
    updateSimCommentDropdown();
    updateSpinButtonState();
    // If target selection modal is open, refresh its grid
    if (targetSelectionModal && targetSelectionModal.classList.contains('active')) {
      renderTargetPlayerGrid();
    }
  });

  socket.on('tiktok_status', (status) => {
    updateTikTokBadge(status);
  });

  socket.on('settings_updated', (settings) => {
    if (currentSnapshot) currentSnapshot.settings = settings;
    applyWheelConfigFromSnapshot();
    populateDrawerSettings();
    renderGiftConfigTab();
    renderHeader();
    updateGiftsLegend();
  });

  // Roulette Spin Event
  socket.on('roulette_spin_started', (result) => {
    hideAllModals();
    setBanner('🎡 العجلة تدور الآن... من سيكون صاحب القرار؟');
    updateSpinButtonState();
    wheel.spinToPlayer(result.chosenPlayer, () => {
      fetch('/api/control/roulette/land', { method: 'POST' });
    });
  });

  // Chosen Player Turn
  socket.on('player_selected_turn', ({ chosenPlayer }) => {
    showTurnModal(chosenPlayer);
  });

  // Target Selected (Warning Face-Off)
  socket.on('target_selected', ({ selector, target }) => {
    hideAllModals();
    if (window.soundEngine) window.soundEngine.siren();
    showConfrontationModal(selector, target);
  });

  // Timer Tick
  socket.on('timer_tick', ({ remaining, type }) => {
    if (type === 'target_select') {
      updateTargetSelectTimerVisual(remaining, currentTargetSelectTotal);
      if (window.soundEngine) window.soundEngine.timerHeartbeat(false);
    } else {
      updateTimerVisual(remaining, currentTimerTotal);
      if (type === 'defense' && remaining <= 5) {
        if (window.soundEngine) window.soundEngine.timerHeartbeat(true);
      } else if (type === 'defense') {
        if (window.soundEngine) window.soundEngine.timerHeartbeat(false);
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

  // Player Saved by Gift
  socket.on('player_saved', ({ player, giftName, coins }) => {
    hideAllModals();
    if (window.soundEngine) window.soundEngine.savedFanfare();
    showResultModal('🛡️ تم إنقاذ اللاعب!', `نجح ${player.nickname} في الدفاع عن نفسه بإرسال [${giftName}] (${coins} عملة) وسيستمر في اللعبة!`, '🛡️', '#10b981');
    setTimeout(() => hideAllModals(), 4000);
  });

  // Player Eliminated
  socket.on('player_eliminated', ({ player, by }) => {
    hideAllModals();
    if (window.soundEngine) window.soundEngine.eliminatedGong();
    showEliminationModal(player, by);
  });

  // Player Rejoined
  socket.on('player_rejoined', ({ player, coins }) => {
    if (window.soundEngine) window.soundEngine.rejoin();
    showResultModal('🔄 عودة إلى اللعبة!', `اللاعب ${player.nickname} دفع ${coins} عملة وعاد إلى المنافسة برقم #${player.playerNumber}!`, '🔄', '#3b82f6');
    setTimeout(() => hideAllModals(), 3500);
  });

  // Player Helped / Rescued
  socket.on('player_helped', ({ helperName, target, coins }) => {
    if (window.soundEngine) window.soundEngine.rejoin();
    showResultModal('❤️ مساعدة نبيلة!', `قام المشاهد ${helperName} بمساعدة ${target.nickname} وإعادته إلى اللعبة!`, '❤️', '#ec4899');
    setTimeout(() => hideAllModals(), 3800);
  });

  // Winner Declared
  socket.on('winner_declared', ({ winner }) => {
    hideAllModals();
    if (window.soundEngine) window.soundEngine.victory();
    showWinnerModal(winner);
  });

  // Reset
  socket.on('game_reset', () => {
    hideAllModals();
    setBanner('تمت إعادة تعيين اللعبة. في انتظار الانضمام...');
    updateSpinButtonState();
  });

  socket.on('activity_log', (entry) => {
    appendDrawerLog(entry);
  });

  // -------------------------------------------------------------
  // GitHub Pages / Offline Interactive Demo Fallback
  // -------------------------------------------------------------
  setTimeout(() => {
    if (!currentSnapshot) {
      console.log('🎮 Initializing Interactive Demo Mode for GitHub Pages / Standalone Preview...');
      const demoSnapshot = {
        roundNumber: 1,
        state: 'WAITING_JOIN',
        chosenPlayer: null,
        targetPlayer: null,
        winner: null,
        settings: {
          joinKeyword: 'تم',
          isJoinOpen: true,
          eliminationMode: 'target_select',
          eliminationTimeoutSec: 20,
          timers: {
            defenseDuration: 30,
            targetSelectDuration: 20
          },
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

      const demoPlayers = [
        { id: '1', playerNumber: 1, nickname: 'محمد 👑', uniqueId: 'mohammed', profilePictureUrl: 'assets/gifts/lion.png', status: 'active', hasShield: false },
        { id: '2', playerNumber: 2, nickname: 'سارة ✨', uniqueId: 'sara', profilePictureUrl: 'assets/gifts/heart.png', status: 'immune', hasShield: true },
        { id: '3', playerNumber: 3, nickname: 'أحمد ⚡', uniqueId: 'ahmed', profilePictureUrl: 'assets/gifts/cap.png', status: 'active', hasShield: false },
        { id: '4', playerNumber: 4, nickname: 'خالد 🚀', uniqueId: 'khaled', profilePictureUrl: 'assets/gifts/rocket.png', status: 'active', hasShield: false },
        { id: '5', playerNumber: 5, nickname: 'مريم 🌸', uniqueId: 'mariam', profilePictureUrl: 'assets/gifts/rose.png', status: 'active', hasShield: false },
        { id: '6', playerNumber: 6, nickname: 'علي 🔥', uniqueId: 'ali', profilePictureUrl: 'assets/gifts/trophy.png', status: 'active', hasShield: false },
        { id: '7', playerNumber: 7, nickname: 'نور 🌟', uniqueId: 'nour', profilePictureUrl: 'assets/gifts/pearl.png', status: 'active', hasShield: false },
        { id: '8', playerNumber: 8, nickname: 'فهد 🏎️', uniqueId: 'fahad', profilePictureUrl: 'assets/gifts/car.png', status: 'active', hasShield: false }
      ];

      currentSnapshot = demoSnapshot;
      allPlayers = demoPlayers;
      applyWheelConfigFromSnapshot();
      renderAll();

      if (tiktokBadgeEl) {
        tiktokBadgeEl.textContent = '🌐 معاينة GitHub Live';
        tiktokBadgeEl.style.background = 'linear-gradient(45deg, #00f2fe, #4facfe)';
      }
      if (btnMainSpinRoulette) {
        btnMainSpinRoulette.disabled = false;
        btnMainSpinRoulette.classList.remove('disabled-pulse');
        btnMainSpinRoulette.textContent = 'تدوير العجلة 🎡';
      }
      setBanner('جاهز للبدء! اضغط على زر [تدوير العجلة 🎡] لتجربة اللعبة.');
    }
  }, 300);

  // -------------------------------------------------------------
  // Render Methods - Overlay
  // -------------------------------------------------------------
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

    if (roundBadgeEl) {
      roundBadgeEl.textContent = `الجولة #${currentSnapshot.roundNumber || 1}`;
    }

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

    // Shield Gift Badge in Header
    if (shieldGiftBadge) {
      const shieldConf = currentSnapshot.settings?.gifts?.shield;
      if (shieldConf) {
        const giftInfo = getGiftInfo(shieldConf.giftId || 'sunglasses');
        shieldGiftBadge.style.display = 'inline-flex';
        if (shieldGiftBadgeImg) shieldGiftBadgeImg.src = giftInfo.image;
        if (shieldGiftBadgeText) {
          shieldGiftBadgeText.textContent = `درع الحصانة: ${shieldConf.giftName || giftInfo.nameAr} (${shieldConf.minCoins || 30} عملة)`;
        }
      } else {
        shieldGiftBadge.style.display = 'none';
      }
    }
  }

  function updateSpinButtonState() {
    if (!btnMainSpinRoulette) return;
    const actives = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
    const isSpinning = currentSnapshot?.state === 'SPINNING';

    if (actives.length < 2) {
      btnMainSpinRoulette.classList.add('disabled');
      btnMainSpinRoulette.querySelector('.spin-text').textContent = `في انتظار لاعبين (${actives.length}/2)...`;
    } else if (isSpinning) {
      btnMainSpinRoulette.classList.add('disabled');
      btnMainSpinRoulette.querySelector('.spin-text').textContent = 'العجلة تدور الآن...';
    } else {
      btnMainSpinRoulette.classList.remove('disabled');
      btnMainSpinRoulette.querySelector('.spin-text').textContent = 'تدوير الروليت الآن (Start Roulette)';
    }
  }

  function updateTikTokBadge(status) {
    if (!tiktokBadgeEl) return;
    if (!status || typeof status !== 'object') {
      tiktokBadgeEl.innerHTML = `تيك توك: غير متصل`;
      tiktokBadgeEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
      if (drawerTiktokStatusText) {
        drawerTiktokStatusText.innerHTML = `<span style="color: var(--text-muted);">⚪ غير متصل بالبث المباشر</span>`;
      }
      return;
    }

    if (status.username && drawerTiktokUser && !drawerTiktokUser.value) {
      drawerTiktokUser.value = status.username;
    }

    if (status.status === 'connected') {
      const viewerStr = status.roomInfo?.viewerCount ? ` (${status.roomInfo.viewerCount} 👁️)` : '';
      tiktokBadgeEl.innerHTML = `<span class="pulse-dot"></span> متصل: @${status.username}${viewerStr}`;
      tiktokBadgeEl.style.borderColor = 'rgba(16, 185, 129, 0.5)';

      if (drawerTiktokStatusText) {
        drawerTiktokStatusText.innerHTML = `<span style="color: #10b981; font-weight: 800;">✅ متصل بالبث المباشر بنجاح (@${status.username})${viewerStr}</span>`;
      }
      if (btnDrawerConnect) btnDrawerConnect.style.display = 'none';
      if (btnDrawerDisconnect) btnDrawerDisconnect.style.display = 'inline-flex';
    } else if (status.status === 'connecting') {
      tiktokBadgeEl.innerHTML = `جاري الاتصال بـ @${status.username}...`;
      tiktokBadgeEl.style.borderColor = 'rgba(245, 158, 11, 0.5)';

      if (drawerTiktokStatusText) {
        drawerTiktokStatusText.innerHTML = `<span style="color: #f59e0b; font-weight: 800;">⏳ جاري محاولة الاتصال بالبث المباشر...</span>`;
      }
    } else if (status.status === 'error') {
      tiktokBadgeEl.innerHTML = `تيك توك: تعذر الاتصال`;
      tiktokBadgeEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';

      if (drawerTiktokStatusText) {
        drawerTiktokStatusText.innerHTML = `<span style="color: #ef4444; font-weight: 700;">❌ ${status.lastError || 'تعذر الاتصال'}</span>`;
      }
      if (btnDrawerConnect) btnDrawerConnect.style.display = 'inline-flex';
      if (btnDrawerDisconnect) btnDrawerDisconnect.style.display = 'none';
    } else {
      tiktokBadgeEl.innerHTML = `تيك توك: غير متصل`;
      tiktokBadgeEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';

      if (drawerTiktokStatusText) {
        drawerTiktokStatusText.innerHTML = `<span style="color: var(--text-muted);">⚪ غير متصل بالبث المباشر</span>`;
      }
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

    // Render Active
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
            <img class="player-avatar" src="${p.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.playerNumber}" alt="">
            <div class="player-info">
              <div class="player-name">${escapeHtml(p.nickname)}</div>
              <div class="player-sub">@${escapeHtml(p.uniqueId)}</div>
            </div>
            ${isImmune ? `
              <div style="display:flex;align-items:center;gap:4px;" title="محمي بدرع الحصانة (${shieldGift.nameAr})">
                <img src="${shieldGift.image}" style="width:24px;height:24px;object-fit:contain;" alt="">
                <span class="shield-badge-icon">🛡️</span>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    // Render Eliminated
    if (eliminatedPlayersList) {
      eliminatedPlayersList.innerHTML = eliminated.map(p => `
        <div class="player-card eliminated">
          <div class="player-num-badge" style="background: #475569;">#${p.playerNumber}</div>
          <img class="player-avatar" src="${p.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.playerNumber}" alt="">
          <div class="player-info">
            <div class="player-name">${escapeHtml(p.nickname)}</div>
            <div class="player-sub" style="color: #ef4444;">مستبعد ☠️ (أرسل هدية العودة)</div>
          </div>
        </div>
      `).join('');
    }
  }

  function handleStateVisuals(snapshot) {
    if (joinInstructionsCard) {
      const isJoinState = (snapshot.state === 'WAITING_FOR_PLAYERS' || snapshot.state === 'READY') && snapshot.settings?.isJoinOpen !== false;
      if (isJoinState) {
        joinInstructionsCard.classList.remove('hidden');
        if (joinKeywordHighlight) joinKeywordHighlight.textContent = snapshot.settings?.joinKeyword || 'تم';
      } else {
        joinInstructionsCard.classList.add('hidden');
      }
    }

    switch (snapshot.state) {
      case 'WAITING_FOR_PLAYERS':
        setBanner(`في انتظار اللاعبين... اكتب [${snapshot.settings?.joinKeyword || 'تم'}] في الشات للمشاركة!`);
        break;
      case 'READY':
        setBanner(`اللعبة جاهزة! (${snapshot.activeCount} لاعبين). اضغط على زر تدوير الروليت لبدء الجولة.`);
        break;
      case 'SPINNING':
        setBanner('🎡 العجلة تدور الآن... من سيكون صاحب القرار؟');
        break;
      case 'SELECTED_PLAYER':
        if (snapshot.chosenPlayer) {
          showTurnModal(snapshot.chosenPlayer);
        }
        break;
      case 'SELECTING_TARGET':
        if (snapshot.chosenPlayer) {
          setBanner(`🎯 اللاعب ${snapshot.chosenPlayer.nickname} (#${snapshot.chosenPlayer.playerNumber}) يختار هدف الإقصاء عبر الشات الآن!`);
          showTargetSelectionModal(snapshot.chosenPlayer);
        }
        break;
      case 'ELIMINATION_WARNING':
      case 'DEFENDING':
        if (snapshot.targetPlayer && snapshot.chosenPlayer) {
          if (snapshot.state === 'DEFENDING') {
            setBanner(`🛡️ مؤقت الدفاع جارٍ! اللاعب ${snapshot.targetPlayer.nickname} يدافع عن نفسه!`);
          }
          if (targetSelectionModal) targetSelectionModal.classList.remove('active');
          if (turnModal) turnModal.classList.remove('active');
          showConfrontationModal(snapshot.chosenPlayer, snapshot.targetPlayer);
        }
        break;
      case 'FINISHED':
        if (snapshot.winner) {
          setBanner(`👑 البطل النهائي: ${snapshot.winner.nickname}!`);
        }
        break;
    }
  }

  // -------------------------------------------------------------
  // Modals & Popups
  // -------------------------------------------------------------
  function showTurnModal(player) {
    if (!turnModal) return;
    turnAvatar.src = player.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + player.playerNumber;
    turnPlayerNum.textContent = `#${player.playerNumber}`;
    turnPlayerName.textContent = player.nickname;
    turnModal.classList.add('active');

    // Auto-transition to Target Selection modal after 1.8 seconds
    setTimeout(() => {
      if (currentSnapshot?.state === 'SELECTING_TARGET' || currentSnapshot?.state === 'SELECTED_PLAYER') {
        turnModal.classList.remove('active');
        showTargetSelectionModal(player);
      }
    }, 1800);
  }

  // ★ TARGET SELECTION MODAL: All players with numbers, avatars, and names ★
  function showTargetSelectionModal(chooser) {
    if (!targetSelectionModal || !chooser) return;

    if (tsChooserAvatar) {
      tsChooserAvatar.src = chooser.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + chooser.playerNumber;
    }
    if (tsChooserNum) tsChooserNum.textContent = `#${chooser.playerNumber}`;
    if (tsChooserName) tsChooserName.textContent = chooser.nickname;

    renderTargetPlayerGrid();

    // Reset timer visuals
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
      let badgeHtml = `<span class="ts-card-badge target-btn">🎯 اختر #${p.playerNumber}</span>`;

      if (isSelf) {
        cardClass += ' is-self';
        badgeHtml = `<span class="ts-card-badge" style="background:rgba(255,255,255,0.1);color:#cbd5e1;">صاحب القرار ⭐</span>`;
      } else if (isImmune) {
        cardClass += ' is-immune';
        badgeHtml = `<span class="ts-card-badge immune-badge">محمي بالدرع 🛡️</span>`;
      }

      return `
        <div class="${cardClass}" data-player-num="${p.playerNumber}" ${!isSelf && !isImmune ? `onclick="window.selectTargetPlayer(${p.playerNumber})"` : ''}>
          <div class="ts-card-avatar-wrap">
            <img class="ts-card-avatar" src="${p.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.playerNumber}" alt="">
            <div class="ts-card-num">#${p.playerNumber}</div>
          </div>
          <div class="ts-card-name">${escapeHtml(p.nickname)}</div>
          <div class="ts-card-sub">@${escapeHtml(p.uniqueId)}</div>
          ${badgeHtml}
        </div>
      `;
    }).join('');
  }

  // Click handler to select target (works for admin / testing / host convenience / demo)
  window.selectTargetPlayer = async (targetNumber) => {
    if (!currentSnapshot?.chosenPlayer) return;
    const chooser = currentSnapshot.chosenPlayer;

    if (!socket.connected) {
      // Demo mode execution
      const target = allPlayers.find(p => p.playerNumber === targetNumber);
      if (target) {
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
          const remainingActive = allPlayers.filter(p => p.status === 'active' || p.status === 'immune');
          if (remainingActive.length === 1) {
            currentSnapshot.winner = remainingActive[0];
            currentSnapshot.state = 'FINISHED';
            if (window.soundEngine) window.soundEngine.victory();
            showWinnerModal(remainingActive[0]);
            setBanner(`🏆 فاز بالبطولة اللاعب ${remainingActive[0].nickname}! ألف مبروك!`);
          } else {
            currentSnapshot.state = 'READY';
            currentSnapshot.chosenPlayer = null;
            currentSnapshot.targetPlayer = null;
            renderAll();
            setBanner(`🎡 الجولة مستمرة! تبقى ${remainingActive.length} لاعبين. جاهز للتدوير.`);
            if (btnMainSpinRoulette) {
              btnMainSpinRoulette.disabled = false;
              btnMainSpinRoulette.classList.remove('disabled-pulse');
              btnMainSpinRoulette.textContent = 'تدوير العجلة 🎡';
            }
          }
        }, 6200);
      }
      return;
    }

    await fetch('/api/simulate/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uniqueId: chooser.uniqueId,
        commentText: `${targetNumber}`
      })
    });
  };

  function updateTargetSelectTimerVisual(remaining, total) {
    if (tsTimerDigits) tsTimerDigits.textContent = remaining;
    if (tsTimerProgress) {
      const perimeter = 283;
      const fraction = Math.max(0, remaining / (total || 20));
      const offset = perimeter - (fraction * perimeter);
      tsTimerProgress.style.strokeDashoffset = offset;
      if (remaining <= 5) {
        tsTimerProgress.style.stroke = '#ef4444';
      } else {
        tsTimerProgress.style.stroke = '#fbbf24';
      }
    }
  }

  function showConfrontationModal(selector, target) {
    if (!confrontationModal) return;

    selectorAvatar.src = selector.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + selector.playerNumber;
    selectorName.textContent = selector.nickname;
    selectorNum.textContent = `#${selector.playerNumber}`;

    targetAvatar.src = target.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + target.playerNumber;
    targetName.textContent = target.nickname;
    targetNum.textContent = `#${target.playerNumber}`;

    const defGiftConf = currentSnapshot?.settings?.gifts?.defense;
    const defGiftInfo = getGiftInfo(defGiftConf?.giftId || defGiftConf?.giftName || 'rose');

    if (defenseGiftImg) {
      defenseGiftImg.src = defGiftInfo.image;
      defenseGiftImg.style.display = 'inline-block';
    }

    if (defenseGiftText) {
      defenseGiftText.textContent = `أرسل [${defGiftConf?.giftName || defGiftInfo.nameAr}] بقيمة (${defGiftConf?.minCoins || defGiftInfo.coins || 1} عملة) لإنقاذ نفسك وإلغاء الإقصاء فوراً!`;
    }

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

  // ★ Dedicated Elimination Modal (صورة اللاعب وصورة من أقصاه ولا تختفي بسرعة) ★
  function showEliminationModal(player, by) {
    if (!eliminationModal || !player) return;

    if (elimPlayerAvatar) {
      elimPlayerAvatar.src = player.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + player.playerNumber;
    }
    if (elimPlayerNum) elimPlayerNum.textContent = `#${player.playerNumber}`;
    if (elimPlayerName) elimPlayerName.textContent = player.nickname;
    if (elimPlayerUser) elimPlayerUser.textContent = `@${player.uniqueId}`;

    if (by && elimByBox) {
      elimByBox.style.display = 'flex';
      if (elimByAvatar) elimByAvatar.src = by.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + by.playerNumber;
      if (elimByName) elimByName.textContent = by.nickname;
      if (elimByNum) elimByNum.textContent = `#${by.playerNumber}`;
    } else if (elimByBox) {
      elimByBox.style.display = 'none';
    }

    const rejoinConf = currentSnapshot?.settings?.gifts?.rejoin;
    const rejoinInfo = getGiftInfo(rejoinConf?.giftId || rejoinConf?.giftName || 'heart');

    if (elimRejoinImg) elimRejoinImg.src = rejoinInfo.image;
    if (elimRejoinDetail) {
      elimRejoinDetail.textContent = `أرسل هدية [${rejoinConf?.giftName || rejoinInfo.nameAr}] بقيمة (${rejoinConf?.minCoins || rejoinInfo.coins || 5} عملات) لتعود فوراً إلى المنافسة!`;
    }

    eliminationModal.classList.add('active');

    // Keep visible for full 6 seconds as requested
    setTimeout(() => {
      if (eliminationModal.classList.contains('active')) {
        eliminationModal.classList.remove('active');
      }
    }, 6000);
  }

  // ★ Grand Winner Modal (صورة البطل واضحة واحتفالية) ★
  function showWinnerModal(winner) {
    if (!winnerModal || !winner) return;
    if (winnerAvatar) winnerAvatar.src = winner.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + winner.playerNumber;
    if (winnerName) winnerName.textContent = winner.nickname;
    if (winnerUser) winnerUser.textContent = `@${winner.uniqueId}`;
    if (winnerNum) winnerNum.textContent = `#${winner.playerNumber}`;
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
      const perimeter = 283;
      const fraction = Math.max(0, remaining / (total || 30));
      const offset = perimeter - (fraction * perimeter);
      timerCircleProgress.style.strokeDashoffset = offset;
      if (remaining <= 5) {
        timerCircleProgress.style.stroke = '#ef4444';
      } else {
        timerCircleProgress.style.stroke = '#f59e0b';
      }
    }
  }

  function setBanner(text) {
    if (actionBannerText) actionBannerText.textContent = text;
  }

  // -------------------------------------------------------------
  // Drawer Actions Implementation
  // -------------------------------------------------------------
  function updateDrawerUI() {
    if (!currentSnapshot) return;
    if (drawerStateBadge) {
      drawerStateBadge.textContent = `الجولة #${currentSnapshot.roundNumber} (${currentSnapshot.state})`;
    }
    if (btnDrawerToggleJoin) {
      btnDrawerToggleJoin.textContent = currentSnapshot.settings?.isJoinOpen ? '🔒 إغلاق الانضمام' : '🔓 فتح الانضمام';
    }
    populateDrawerSettings();
  }

  // Apply wheel configuration from snapshot
  function applyWheelConfigFromSnapshot() {
    const wc = currentSnapshot?.settings?.wheelConfig;
    if (wc) {
      wheel.updateConfig(wc);
      if (wheelThemeSelect) wheelThemeSelect.value = wc.theme || 'casino';
      if (wheelSpinDuration) wheelSpinDuration.value = wc.spinDuration || 6500;
      if (wheelShowAvatars) wheelShowAvatars.checked = wc.showPlayerAvatars !== false;
      if (wheelShowNames) wheelShowNames.checked = wc.showPlayerNames !== false;
    }
  }

  // TikTok Connect in Drawer
  if (btnDrawerConnect) {
    btnDrawerConnect.addEventListener('click', async () => {
      const username = drawerTiktokUser.value.trim();
      if (!username) {
        alert('يرجى إدخال اسم حساب تيك توك صاحب البث');
        return;
      }
      drawerTiktokStatusText.innerHTML = '<span style="color: #f59e0b;">⏳ جاري محاولة الاتصال بالبث المباشر...</span>';
      try {
        const res = await fetch('/api/tiktok/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!data.success) {
          alert('تنبيه: ' + (data.error || 'تأكد من فتح البث المباشر في تيك توك'));
        }
      } catch (e) {
        alert('خطأ: ' + e.message);
      }
    });
  }

  if (btnDrawerDisconnect) {
    btnDrawerDisconnect.addEventListener('click', async () => {
      await fetch('/api/tiktok/disconnect', { method: 'POST' });
    });
  }

  // Game Control buttons in Drawer
  if (btnDrawerToggleJoin) {
    btnDrawerToggleJoin.addEventListener('click', async () => {
      await fetch('/api/control/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    });
  }

  if (btnDrawerNextRound) {
    btnDrawerNextRound.addEventListener('click', async () => {
      await fetch('/api/control/round/next', { method: 'POST' });
    });
  }

  if (btnDrawerFinalRound) {
    btnDrawerFinalRound.addEventListener('click', async () => {
      if (confirm('هل تريد بدء مرحلة الحسم النهائي الآن؟')) {
        await fetch('/api/control/round/final', { method: 'POST' });
        adminDrawerModal.classList.remove('active');
      }
    });
  }

  if (btnDrawerCancelElim) {
    btnDrawerCancelElim.addEventListener('click', async () => {
      await fetch('/api/control/elimination/cancel', { method: 'POST' });
    });
  }

  if (btnDrawerPauseTimer) {
    btnDrawerPauseTimer.addEventListener('click', async () => {
      await fetch('/api/control/timer/pause', { method: 'POST' });
    });
  }

  if (btnDrawerResumeTimer) {
    btnDrawerResumeTimer.addEventListener('click', async () => {
      await fetch('/api/control/timer/resume', { method: 'POST' });
    });
  }

  if (btnDrawerExtendTimer) {
    btnDrawerExtendTimer.addEventListener('click', async () => {
      await fetch('/api/control/timer/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: 15 })
      });
    });
  }

  if (btnDrawerResetGame) {
    btnDrawerResetGame.addEventListener('click', async () => {
      if (confirm('تحذير: هل أنت متأكد من رغبتك في إعادة تعيين اللعبة ومسح اللاعبين؟')) {
        await fetch('/api/control/game/reset', { method: 'POST' });
      }
    });
  }

  // -------------------------------------------------------------
  // Gift Configuration with Visual Image Picker
  // -------------------------------------------------------------
  function renderGiftConfigTab() {
    if (!giftConfigContainer) return;
    const gifts = currentSnapshot?.settings?.gifts || {
      defense: { giftName: 'وردة', giftId: 'rose', minCoins: 1, labelAr: 'هدية الدفاع عن النفس' },
      shield: { giftName: 'نظارات', giftId: 'sunglasses', minCoins: 30, labelAr: 'هدية الحصانة / الدرع' },
      rejoin: { giftName: 'قلب', giftId: 'heart', minCoins: 5, labelAr: 'هدية العودة إلى اللعبة' },
      help: { giftName: 'كاب', giftId: 'cap', minCoins: 16, labelAr: 'هدية المساعدة / الإنقاذ' },
      finalRound: { giftName: 'صاروخ', giftId: 'rocket', minCoins: 100, labelAr: 'هدية حسم الجولة' },
      winnerChallenge: { giftName: 'تاج', giftId: 'crown', minCoins: 100, labelAr: 'هدية تحدي الفائز' }
    };

    const categories = [
      { key: 'defense', label: '🛡️ هدية الدفاع عن النفس', desc: 'يرسلها اللاعب المهدد لإنقاذ نفسه من الإقصاء' },
      { key: 'shield', label: '🕶️ هدية الحصانة / الدرع', desc: 'تمنح اللاعب درعاً يحميه من أي استهداف' },
      { key: 'rejoin', label: '🔄 هدية العودة إلى اللعبة', desc: 'يرسلها اللاعب المستبعد للعودة إلى اللعبة' },
      { key: 'help', label: '❤️ هدية المساعدة / الإنقاذ', desc: 'يرسلها مشاهد لإنقاذ لاعب مستبعد' },
      { key: 'finalRound', label: '🚀 هدية حسم الجولة', desc: 'حسم المواجهة النهائية' },
      { key: 'winnerChallenge', label: '👑 هدية تحدي الفائز', desc: 'تحدي بطل الروليت' }
    ];

    giftConfigContainer.innerHTML = categories.map(cat => {
      const currentGift = gifts[cat.key] || {};
      const giftInfo = getGiftInfo(currentGift.giftId || currentGift.giftName || 'rose');

      return `
        <div class="gift-config-card" data-cat-key="${cat.key}">
          <div class="gift-config-header">
            <span class="gift-config-title">${cat.label}</span>
          </div>
          <div style="font-size:11px;color:#94a3b8;">${cat.desc}</div>

          <!-- Current Selection Preview -->
          <div class="gift-current-preview">
            <img class="gift-preview-img" src="${giftInfo.image}" alt="">
            <div class="gift-preview-details">
              <div class="gift-preview-name">${currentGift.giftName || giftInfo.nameAr}</div>
              <div class="gift-preview-coins">${currentGift.minCoins || giftInfo.coins} عملة (Coins)</div>
            </div>
          </div>

          <!-- Coins input -->
          <div class="gift-coins-input-row">
            <label>قيمة العملات المطلوبة:</label>
            <input type="number" class="drawer-input cat-coins-input" value="${currentGift.minCoins || giftInfo.coins}" min="1" data-cat="${cat.key}">
          </div>

          <!-- Visual Gift Selector Bar -->
          <div style="font-size:12px;font-weight:700;color:#cbd5e1;margin-top:4px;">اختر من صور الهدايا:</div>
          <div class="gift-catalog-selector">
            ${giftCatalog.map(g => {
              const isSelected = (currentGift.giftId === g.id) || (!currentGift.giftId && currentGift.giftName === g.nameAr);
              return `
                <button type="button" class="gift-item-btn ${isSelected ? 'selected' : ''}"
                  onclick="window.selectGiftForCategory('${cat.key}', '${g.id}', '${g.nameAr}', ${g.coins})">
                  <img src="${g.image}" alt="${g.nameAr}">
                  <span>${g.nameAr}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Attach coins input change listeners
    document.querySelectorAll('.cat-coins-input').forEach(inp => {
      inp.addEventListener('change', async (e) => {
        const catKey = e.target.dataset.cat;
        const newCoins = parseInt(e.target.value, 10) || 1;
        if (!currentSnapshot.settings.gifts[catKey]) currentSnapshot.settings.gifts[catKey] = {};
        currentSnapshot.settings.gifts[catKey].minCoins = newCoins;
        await saveCurrentGiftsConfig();
      });
    });
  }

  // Globally exposed for onclick
  window.selectGiftForCategory = async (catKey, giftId, giftName, defaultCoins) => {
    if (!currentSnapshot) return;
    if (!currentSnapshot.settings.gifts) currentSnapshot.settings.gifts = {};
    if (!currentSnapshot.settings.gifts[catKey]) currentSnapshot.settings.gifts[catKey] = {};

    currentSnapshot.settings.gifts[catKey].giftId = giftId;
    currentSnapshot.settings.gifts[catKey].giftName = giftName;
    currentSnapshot.settings.gifts[catKey].minCoins = defaultCoins;

    await saveCurrentGiftsConfig();
    renderGiftConfigTab();
    renderHeader();
  };

  async function saveCurrentGiftsConfig() {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gifts: currentSnapshot.settings.gifts })
      });
    } catch (e) {
      console.error('Failed to save gift config:', e);
    }
  }

  // -------------------------------------------------------------
  // Wheel Customization Handling
  // -------------------------------------------------------------
  if (btnApplyWheelConfig) {
    btnApplyWheelConfig.addEventListener('click', async () => {
      const theme = wheelThemeSelect ? wheelThemeSelect.value : 'casino';
      const spinDuration = parseInt(wheelSpinDuration.value, 10) || 6500;
      const showPlayerAvatars = wheelShowAvatars ? wheelShowAvatars.checked : true;
      const showPlayerNames = wheelShowNames ? wheelShowNames.checked : true;

      const wheelConfig = {
        theme,
        spinDuration,
        showPlayerAvatars,
        showPlayerNames
      };

      wheel.updateConfig(wheelConfig);

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wheelConfig })
      });

      alert('تم تطبيق وتحديث شكل العجلة بنجاح! 🎡');
    });
  }

  // Drawer Simulator
  if (btnDrawerMockTen) {
    btnDrawerMockTen.addEventListener('click', async () => {
      const mockNames = [
        { name: 'أحمد الصقر', user: 'ahmed_hawk' },
        { name: 'سارة الملكة', user: 'queen_sara' },
        { name: 'فهد البطل', user: 'fahad_hero' },
        { name: 'نورة تيك', user: 'noura_live' },
        { name: 'عمر القائد', user: 'omar_chief' },
        { name: 'ريم الرياض', user: 'reem_riyadh' },
        { name: 'خالد النجم', user: 'khaled_star' },
        { name: 'منى القمر', user: 'mona_moon' },
        { name: 'يوسف الفهد', user: 'yousef_leopard' },
        { name: 'ليلى الدانة', user: 'laila_pearl' }
      ];

      for (const m of mockNames) {
        await fetch('/api/simulate/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nickname: m.name,
            uniqueId: m.user,
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user}`
          })
        });
      }
    });
  }

  if (btnSimDrawerJoin) {
    btnSimDrawerJoin.addEventListener('click', async () => {
      const u = simDrawerJoinUser.value.trim() || `user_${Date.now() % 1000}`;
      const n = simDrawerJoinNick.value.trim() || u;
      await fetch('/api/simulate/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: n,
          uniqueId: u,
          avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${u}`
        })
      });
      simDrawerJoinNick.value = '';
      simDrawerJoinUser.value = '';
    });
  }

  if (btnSimDrawerComment) {
    btnSimDrawerComment.addEventListener('click', async () => {
      const uniqueId = simDrawerCommentUser.value;
      const commentText = simDrawerCommentText.value.trim();
      if (!commentText) return;

      await fetch('/api/simulate/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId, commentText })
      });
      simDrawerCommentText.value = '';
      adminDrawerModal.classList.remove('active');
    });
  }

  if (btnSimDrawerAutoTarget) {
    btnSimDrawerAutoTarget.addEventListener('click', () => {
      if (!currentSnapshot?.chosenPlayer) {
        alert('يجب تشغيل الروليت واختيار لاعب أولاً!');
        return;
      }
      simDrawerCommentUser.value = currentSnapshot.chosenPlayer.uniqueId;

      const eligible = allPlayers.filter(p =>
        (p.status === 'active' || p.status === 'immune') &&
        p.id !== currentSnapshot.chosenPlayer.id &&
        !p.hasShield && p.status !== 'immune'
      );

      if (eligible.length > 0) {
        simDrawerCommentText.value = `${eligible[0].playerNumber}`;
      } else {
        simDrawerCommentText.value = '2';
      }
    });
  }

  // Drawer Gift buttons
  document.querySelectorAll('[data-drawer-gift]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const giftType = btn.dataset.drawerGift;
      let uniqueId = simDrawerCommentUser.value;
      let giftName = 'وردة';
      let coins = 1;

      const gConf = currentSnapshot?.settings?.gifts;

      if (giftType === 'defense') {
        if (currentSnapshot?.targetPlayer) {
          uniqueId = currentSnapshot.targetPlayer.uniqueId;
        }
        giftName = gConf?.defense?.giftName || 'وردة';
        coins = gConf?.defense?.minCoins || 1;
      } else if (giftType === 'rejoin') {
        const eliminated = allPlayers.filter(p => p.status === 'eliminated');
        if (eliminated.length > 0) uniqueId = eliminated[0].uniqueId;
        giftName = gConf?.rejoin?.giftName || 'قلب';
        coins = gConf?.rejoin?.minCoins || 5;
      } else if (giftType === 'help') {
        giftName = gConf?.help?.giftName || 'كاب';
        coins = gConf?.help?.minCoins || 16;
      } else if (giftType === 'shield') {
        giftName = gConf?.shield?.giftName || 'نظارات';
        coins = gConf?.shield?.minCoins || 30;
      } else if (giftType === 'final') {
        giftName = gConf?.finalRound?.giftName || 'صاروخ';
        coins = gConf?.finalRound?.minCoins || 100;
      }

      await fetch('/api/simulate/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uniqueId, giftName, coins, repeatCount: 1 })
      });
      adminDrawerModal.classList.remove('active');
    });
  });

  // Drawer Player Add
  if (drawerAddPlayerForm) {
    drawerAddPlayerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nickname = drawerAddNick.value.trim();
      const uniqueId = drawerAddUser.value.trim();
      if (!nickname) return;

      await fetch('/api/players/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, uniqueId })
      });
      drawerAddNick.value = '';
      drawerAddUser.value = '';
    });
  }

  function renderDrawerPlayersTable() {
    if (!drawerPlayersTableBody) return;
    drawerPlayersTableBody.innerHTML = allPlayers.map(p => {
      let stColor = '#34d399';
      let stText = 'نشط 🟢';
      if (p.status === 'eliminated') {
        stColor = '#f87171';
        stText = 'مستبعد ☠️';
      } else if (p.hasShield || p.status === 'immune') {
        stColor = '#60a5fa';
        stText = 'محصن 🛡️';
      }

      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
          <td style="padding: 6px 8px;"><strong>#${p.playerNumber}</strong></td>
          <td style="padding: 6px 8px;">
            <img src="${p.profilePictureUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + p.playerNumber}" style="width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-left: 6px;" alt="">
            <span>${escapeHtml(p.nickname)}</span>
          </td>
          <td style="padding: 6px 8px; color: ${stColor}; font-weight: 700;">${stText}</td>
          <td style="padding: 6px 8px;">
            ${p.status === 'eliminated' ? `
              <button class="drawer-btn" style="padding: 2px 6px; font-size: 11px; background: #16a34a;" onclick="window.drawerRevivePlayer('${p.id}')">إعادة 🔄</button>
            ` : `
              <button class="drawer-btn" style="padding: 2px 6px; font-size: 11px;" onclick="window.drawerToggleShield('${p.id}', ${!p.hasShield})">
                ${p.hasShield ? 'إلغاء الحصانة' : 'حصانة 🛡️'}
              </button>
            `}
            <button class="drawer-btn drawer-btn-danger" style="padding: 2px 6px; font-size: 11px;" onclick="window.drawerDeletePlayer('${p.id}')">حذف</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.drawerRevivePlayer = async (id) => {
    await fetch(`/api/players/${id}/revive`, { method: 'POST' });
  };
  window.drawerToggleShield = async (id, hasShield) => {
    await fetch(`/api/players/${id}/shield`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hasShield, rounds: 1 })
    });
  };
  window.drawerDeletePlayer = async (id) => {
    if (confirm('حذف هذا اللاعب؟')) {
      await fetch(`/api/players/${id}`, { method: 'DELETE' });
    }
  };

  function updateSimCommentDropdown() {
    if (!simDrawerCommentUser) return;
    const cur = simDrawerCommentUser.value;
    simDrawerCommentUser.innerHTML = allPlayers.map(p =>
      `<option value="${p.uniqueId}">#${p.playerNumber} - ${p.nickname}</option>`
    ).join('');
    if (cur) simDrawerCommentUser.value = cur;
  }

  // Drawer Settings Form
  if (drawerSettingsForm) {
    drawerSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const updated = {
        joinKeyword: setDrawerJoinKw.value.trim(),
        maxPlayers: parseInt(setDrawerMaxPlayers.value, 10),
        timeoutBehavior: setDrawerTimeout.value,
        timers: {
          targetSelectDuration: parseInt(setDrawerTargetSec.value, 10),
          defenseDuration: parseInt(setDrawerDefSec.value, 10)
        }
      };

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      alert('تم حفظ الإعدادات بنجاح!');
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
  }

  // Drawer Logs
  function appendDrawerLog(entry) {
    if (!drawerLogsContainer) return;
    const row = document.createElement('div');
    row.style.padding = '4px 8px';
    row.style.background = 'rgba(255,255,255,0.03)';
    row.style.borderRadius = '6px';
    const timeStr = new Date(entry.timestamp).toLocaleTimeString();
    row.innerHTML = `<span style="color: var(--text-muted);">[${timeStr}]</span> <span style="color: #e2e8f0;">${escapeHtml(entry.message)}</span>`;
    drawerLogsContainer.prepend(row);
  }

  if (btnDrawerClearLogs) {
    btnDrawerClearLogs.addEventListener('click', async () => {
      await fetch('/api/logs', { method: 'DELETE' });
      drawerLogsContainer.innerHTML = '';
    });
  }

  // Fetch initial logs
  fetch('/api/logs?limit=40')
    .then(r => r.json())
    .then(d => {
      if (d.logs && drawerLogsContainer) {
        drawerLogsContainer.innerHTML = '';
        d.logs.reverse().forEach(appendDrawerLog);
      }
    });

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
