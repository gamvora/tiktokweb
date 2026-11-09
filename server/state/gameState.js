const EventEmitter = require('events');
const config = require('../config');
const storage = require('./storage');

const GameStates = {
  WAITING_FOR_PLAYERS: 'WAITING_FOR_PLAYERS',
  READY: 'READY',
  SPINNING: 'SPINNING',
  SELECTED_PLAYER: 'SELECTED_PLAYER',
  SELECTING_TARGET: 'SELECTING_TARGET',
  ELIMINATION_WARNING: 'ELIMINATION_WARNING',
  DEFENDING: 'DEFENDING',
  ELIMINATED: 'ELIMINATED',
  SAVED: 'SAVED',
  NEXT_ROUND: 'NEXT_ROUND',
  FINAL_ROUND: 'FINAL_ROUND',
  CHALLENGE: 'CHALLENGE',
  FINISHED: 'FINISHED'
};

class GameState extends EventEmitter {
  constructor() {
    super();

    this.settings = JSON.parse(JSON.stringify(config.defaultSettings));
    this.state = GameStates.WAITING_FOR_PLAYERS;
    this.roundNumber = 1;
    this.isPaused = false;

    // Players collection: keyed by uniqueId / userId
    this.players = []; // Array of Player objects

    // Current Round Data
    this.chosenPlayer = null; // The player landed on by the wheel
    this.targetPlayer = null; // The player targeted for elimination
    this.wheelResult = null;  // { playerNumber, angle, chosenPlayer }

    // Final round & winner challenge data
    this.winner = null;
    this.challenger = null;
    this.finalRoundScores = {}; // userId -> count/coins

    // Master Server Timer
    this.timer = {
      active: false,
      type: null, // 'join', 'target_select', 'defense', 'challenge', 'final_round'
      duration: 0,
      remaining: 0,
      expiresAt: null
    };
    this._timerInterval = null;

    // Deduplication of incoming events
    this.processedEventIds = new Set();

    // Try to load persisted state
    this.initFromStorage();
  }

  initFromStorage() {
    const saved = storage.loadGameState();
    if (saved) {
      try {
        if (saved.settings) {
          this.settings = {
            ...this.settings,
            ...saved.settings,
            gifts: { ...this.settings.gifts, ...(saved.settings.gifts || {}) },
            wheelConfig: { ...this.settings.wheelConfig, ...(saved.settings.wheelConfig || {}) }
          };
        }
        if (Array.isArray(saved.players)) this.players = saved.players;
        if (saved.roundNumber) this.roundNumber = saved.roundNumber;
        if (saved.state) {
          // If server restarted during spinning/defending, revert to a stable state
          if ([GameStates.SPINNING, GameStates.DEFENDING, GameStates.SELECTING_TARGET].includes(saved.state)) {
            this.state = GameStates.READY;
          } else {
            this.state = saved.state;
          }
        }
        if (saved.winner) this.winner = saved.winner;
        console.log(`[GameState] Restored state from storage: ${this.players.length} players, state=${this.state}`);
      } catch (e) {
        console.error('[GameState] Failed to restore from storage:', e);
      }
    }
  }

  persist() {
    storage.saveGameState({
      settings: this.settings,
      state: this.state,
      roundNumber: this.roundNumber,
      players: this.players,
      winner: this.winner
    });
  }

  logActivity(type, message, details = {}) {
    const entry = storage.appendLog({ type, message, details });
    this.emit('activity_log', entry);
    return entry;
  }

  // -------------------------------------------------------------
  // Player Management
  // -------------------------------------------------------------

  getActivePlayers() {
    return this.players.filter(p => p.status === 'active' || p.status === 'immune');
  }

  getEliminatedPlayers() {
    return this.players.filter(p => p.status === 'eliminated');
  }

  getPlayerById(id) {
    if (!id) return null;
    const strId = String(id).trim().toLowerCase();
    return this.players.find(p =>
      String(p.id).toLowerCase() === strId ||
      String(p.userId).toLowerCase() === strId ||
      String(p.uniqueId).toLowerCase() === strId ||
      String(p.uniqueId).toLowerCase() === strId.replace(/^@/, '')
    );
  }

  getPlayerByNumber(num) {
    const n = parseInt(num, 10);
    if (isNaN(n)) return null;
    return this.players.find(p => p.playerNumber === n);
  }

  getAvailablePlayerNumber() {
    const used = new Set(this.players.map(p => p.playerNumber));
    let num = 1;
    while (used.has(num)) {
      num++;
    }
    return num;
  }

  addPlayer({ userId, uniqueId, nickname, profilePictureUrl, manual = false }) {
    if (!manual && !this.settings.isJoinOpen) {
      return { success: false, reason: 'الانضمام مغلق حالياً' };
    }

    if (!manual && this.players.length >= this.settings.maxPlayers) {
      return { success: false, reason: 'تم اكتمال العدد الأقصى للاعبين' };
    }

    // Check duplicate
    const cleanUniqueId = (uniqueId || '').replace(/^@/, '').trim();
    const existing = this.players.find(p =>
      (userId && p.userId === String(userId)) ||
      (cleanUniqueId && p.uniqueId.toLowerCase() === cleanUniqueId.toLowerCase())
    );

    if (existing) {
      return { success: false, reason: 'اللاعب مسجل بالفعل في اللعبة', player: existing };
    }

    const assignedNumber = this.getAvailablePlayerNumber();
    const newPlayer = {
      id: userId || 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId: userId ? String(userId) : 'uid_' + Date.now(),
      uniqueId: cleanUniqueId || `player_${assignedNumber}`,
      nickname: nickname || cleanUniqueId || `لاعب ${assignedNumber}`,
      profilePictureUrl: profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUniqueId || assignedNumber}`,
      playerNumber: assignedNumber,
      status: 'active', // 'active' | 'eliminated' | 'immune'
      hasShield: false,
      shieldRoundsRemaining: 0,
      coins: 0,
      killsCount: 0,
      joinedAt: new Date().toISOString(),
      eliminatedAt: null,
      rejoinedAt: null
    };

    this.players.push(newPlayer);

    // If we have at least 2 players and we were in WAITING_FOR_PLAYERS, we can be ready
    if (this.state === GameStates.WAITING_FOR_PLAYERS && this.players.length >= 2) {
      this.state = GameStates.READY;
    }

    this.persist();
    this.logActivity('PLAYER_JOINED', `انضم اللاعب ${newPlayer.nickname} برقم #${newPlayer.playerNumber}`, {
      player: newPlayer
    });

    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());

    return { success: true, player: newPlayer };
  }

  removePlayer(idOrNumber) {
    const player = this.getPlayerById(idOrNumber) || this.getPlayerByNumber(idOrNumber);
    if (!player) return false;

    this.players = this.players.filter(p => p !== player);

    // Re-check state if players dropped below 2
    if (this.getActivePlayers().length < 2 && this.state === GameStates.READY) {
      this.state = GameStates.WAITING_FOR_PLAYERS;
    }

    this.persist();
    this.logActivity('PLAYER_REMOVED', `تم حذف اللاعب ${player.nickname} (#${player.playerNumber})`, { player });
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());
    return true;
  }

  changePlayerNumber(playerId, newNumber) {
    const player = this.getPlayerById(playerId);
    if (!player) return { success: false, reason: 'اللاعب غير موجود' };

    const n = parseInt(newNumber, 10);
    if (isNaN(n) || n <= 0) return { success: false, reason: 'رقم غير صالح' };

    const conflict = this.players.find(p => p !== player && p.playerNumber === n);
    if (conflict) return { success: false, reason: `الرقم ${n} مستخدم بالفعل من قبل ${conflict.nickname}` };

    const oldNum = player.playerNumber;
    player.playerNumber = n;

    this.persist();
    this.logActivity('NUMBER_CHANGED', `تم تغيير رقم اللاعب ${player.nickname} من #${oldNum} إلى #${n}`, { player });
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());
    return { success: true, player };
  }

  setPlayerShield(playerId, hasShield, rounds = 1) {
    const player = this.getPlayerById(playerId);
    if (!player) return { success: false, reason: 'اللاعب غير موجود' };

    player.hasShield = !!hasShield;
    player.shieldRoundsRemaining = hasShield ? rounds : 0;
    if (player.status !== 'eliminated') {
      player.status = hasShield ? 'immune' : 'active';
    }

    this.persist();
    this.logActivity('SHIELD_UPDATED', hasShield ? `🛡️ تم منح الحصانة للاعب ${player.nickname}` : `تم إلغاء الحصانة عن اللاعب ${player.nickname}`, { player });
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());
    return { success: true, player };
  }

  // -------------------------------------------------------------
  // Timers Management
  // -------------------------------------------------------------

  startTimer(type, seconds, onExpireCallback) {
    this.stopTimer();

    this.timer = {
      active: true,
      type,
      duration: seconds,
      remaining: seconds,
      expiresAt: Date.now() + (seconds * 1000)
    };

    this.emit('timer_started', this.timer);

    this._timerInterval = setInterval(() => {
      if (this.isPaused) return;

      const now = Date.now();
      const remainingMs = Math.max(0, this.timer.expiresAt - now);
      this.timer.remaining = Math.ceil(remainingMs / 1000);

      this.emit('timer_tick', { remaining: this.timer.remaining, expiresAt: this.timer.expiresAt, type });

      if (remainingMs <= 0) {
        this.stopTimer();
        if (typeof onExpireCallback === 'function') {
          onExpireCallback();
        }
      }
    }, 500);
  }

  stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    if (this._turnTimeout) {
      clearTimeout(this._turnTimeout);
      this._turnTimeout = null;
    }
    if (this._defenseTimeout) {
      clearTimeout(this._defenseTimeout);
      this._defenseTimeout = null;
    }
    this.timer.active = false;
    this.timer.expiresAt = null;
    this.timer.remaining = 0;
    this.emit('timer_stopped');
  }

  pauseTimer() {
    if (!this.timer.active) return;
    this.isPaused = true;
    this.timer._pausedAt = Date.now();
    this.emit('timer_paused', this.timer);
  }

  resumeTimer() {
    if (!this.timer.active || !this.isPaused) return;
    const pausedDuration = Date.now() - (this.timer._pausedAt || Date.now());
    this.timer.expiresAt += pausedDuration;
    this.isPaused = false;
    this.emit('timer_resumed', this.timer);
  }

  extendTimer(additionalSeconds) {
    if (!this.timer.active) return;
    this.timer.duration += additionalSeconds;
    this.timer.expiresAt += (additionalSeconds * 1000);
    this.timer.remaining = Math.ceil((this.timer.expiresAt - Date.now()) / 1000);
    this.emit('timer_extended', this.timer);
  }

  // -------------------------------------------------------------
  // Roulette Spin & Turn Flow (القاعدة الأساسية)
  // -------------------------------------------------------------

  startRoulette() {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) {
      return { success: false, reason: 'يجب وجود لاعبين نشطين على الأقل لبدء الروليت' };
    }

    if (this.state === GameStates.SPINNING) {
      return { success: false, reason: 'العجلة تدور بالفعل حالياً' };
    }

    // Pick fair random player among ACTIVE players
    const randomIndex = Math.floor(Math.random() * activePlayers.length);
    const chosenPlayer = activePlayers[randomIndex];

    this.state = GameStates.SPINNING;
    this.chosenPlayer = chosenPlayer;
    this.targetPlayer = null;

    // Calculate angle for visual sync (wheel component will use this)
    const sliceAngle = 360 / activePlayers.length;
    // Align indicator (typically at top = 270 deg or right = 0 deg)
    const targetAngle = (randomIndex * sliceAngle) + (sliceAngle / 2);

    this.wheelResult = {
      chosenPlayer,
      playerIndex: randomIndex,
      totalPlayers: activePlayers.length,
      playerNumber: chosenPlayer.playerNumber,
      targetAngle
    };

    this.logActivity('ROULETTE_SPIN_START', `بدأ دوران عجلة الروليت للجولة #${this.roundNumber}`);
    this.emit('roulette_spin_started', this.wheelResult);
    this.emit('state_updated', this.getSnapshot());

    return { success: true, result: this.wheelResult };
  }

  // Called when wheel lands (after animation duration e.g. 5-7 seconds)
  landRoulette() {
    if (!this.chosenPlayer) return;

    this.state = GameStates.SELECTED_PLAYER;
    this.logActivity('PLAYER_TURN_CHOSEN', `🎯 توقفت العجلة على اللاعب ${this.chosenPlayer.nickname} (#${this.chosenPlayer.playerNumber})! حان دوره لاختيار شخص للإقصاء.`);

    this.emit('player_selected_turn', { chosenPlayer: this.chosenPlayer });
    this.emit('state_updated', this.getSnapshot());

    // Automatically transition to SELECTING_TARGET and start target selection timer
    if (this._turnTimeout) clearTimeout(this._turnTimeout);
    this._turnTimeout = setTimeout(() => {
      if (this.chosenPlayer && this.state === GameStates.SELECTED_PLAYER) {
        this.beginTargetSelection();
      }
    }, 2000);
  }

  beginTargetSelection() {
    if (!this.chosenPlayer) return;
    this.state = GameStates.SELECTING_TARGET;
    this.emit('state_updated', this.getSnapshot());

    const duration = this.settings.timers.targetSelectDuration || 20;
    this.logActivity('TARGET_SELECTION_STARTED', `بدأ مؤقت اختيار الهدف (${duration} ثانية) للاعب ${this.chosenPlayer.nickname}`);

    this.startTimer('target_select', duration, () => {
      this.handleTargetSelectionTimeout();
    });
  }

  // -------------------------------------------------------------
  // Target Selection from TikTok Chat (اختيار الهدف بالشات)
  // -------------------------------------------------------------

  handleChatComment({ userId, uniqueId, nickname, commentText, profilePictureUrl }) {
    if (!commentText) return null;
    const trimmed = commentText.trim();

    // 1. Check for JOIN keyword if joining is open
    const joinKeyword = (this.settings.joinKeyword || 'تم').trim().toLowerCase();
    if (this.settings.isJoinOpen && trimmed.toLowerCase() === joinKeyword) {
      return this.addPlayer({
        userId,
        uniqueId,
        nickname: nickname || uniqueId,
        profilePictureUrl
      });
    }

    // 2. Check for TARGET SELECTION if we are in SELECTING_TARGET state
    if (this.state === GameStates.SELECTING_TARGET && this.chosenPlayer) {
      // STRICT VERIFICATION: Commenter MUST be the chosen player
      const cleanUnique = (uniqueId || '').replace(/^@/, '').toLowerCase();
      const chosenUnique = (this.chosenPlayer.uniqueId || '').toLowerCase();
      const isChosenPlayer =
        (userId && String(userId) === String(this.chosenPlayer.userId)) ||
        (cleanUnique && cleanUnique === chosenUnique);

      if (!isChosenPlayer) {
        // Ignored: Not the chosen player
        return null;
      }

      // Extract number from comment
      const match = trimmed.match(/\b\d+\b/);
      if (!match) {
        // No number found in comment
        return null;
      }

      const targetNum = parseInt(match[0], 10);
      return this.selectTargetByNumber(targetNum, this.chosenPlayer);
    }

    return null;
  }

  selectTargetByNumber(targetNum, selectorPlayer) {
    if (this.state !== GameStates.SELECTING_TARGET) {
      return { success: false, reason: 'ليست مرحلة اختيار الهدف حالياً' };
    }

    const target = this.getPlayerByNumber(targetNum);
    if (!target) {
      this.logActivity('TARGET_INVALID', `الرقم #${targetNum} غير موجود`);
      return { success: false, reason: `الرقم #${targetNum} غير موجود` };
    }

    // Cannot target self
    if (target.playerNumber === selectorPlayer.playerNumber || target.id === selectorPlayer.id) {
      this.logActivity('TARGET_INVALID', `اللاعب ${selectorPlayer.nickname} حاول استهداف نفسه!`);
      return { success: false, reason: 'لا يمكنك استهداف نفسك!' };
    }

    // Cannot target eliminated player
    if (target.status === 'eliminated') {
      this.logActivity('TARGET_INVALID', `اللاعب #${targetNum} تم إقصاؤه مسبقاً`);
      return { success: false, reason: 'هذا اللاعب تم إقصاؤه بالفعل' };
    }

    // Cannot target immune player (الحصانة)
    if (target.hasShield || target.status === 'immune') {
      this.logActivity('TARGET_BLOCKED_SHIELD', `اللاعب #${targetNum} لديه حصانة فعالة! لا يمكن استهدافه.`);
      this.emit('target_immune_blocked', { target, selector: selectorPlayer });
      return { success: false, reason: `اللاعب ${target.nickname} يمتلك درع الحصانة!` };
    }

    // Target is valid! Lock in!
    this.stopTimer();
    this.targetPlayer = target;
    this.state = GameStates.ELIMINATION_WARNING;

    this.logActivity('TARGET_SELECTED', `⚠️ اللاعب ${selectorPlayer.nickname} (#${selectorPlayer.playerNumber}) اختار إقصاء اللاعب ${target.nickname} (#${target.playerNumber})!`, {
      selector: selectorPlayer,
      target
    });

    this.emit('target_selected', {
      selector: selectorPlayer,
      target: this.targetPlayer
    });
    this.emit('state_updated', this.getSnapshot());

    // Transition to DEFENDING countdown
    const defenseSeconds = this.settings.timers.defenseDuration || 30;
    if (this._defenseTimeout) clearTimeout(this._defenseTimeout);
    this._defenseTimeout = setTimeout(() => {
      if (!this.targetPlayer || this.state !== GameStates.ELIMINATION_WARNING) return;
      this.state = GameStates.DEFENDING;
      this.emit('state_updated', this.getSnapshot());

      this.logActivity('DEFENSE_COUNTDOWN_START', `بدأ مؤقت الدفاع عن النفس (${defenseSeconds} ثانية) للاعب ${target.nickname}`);

      this.startTimer('defense', defenseSeconds, () => {
        this.handleDefenseTimeout();
      });
    }, 2500);

    return { success: true, target };
  }

  handleTargetSelectionTimeout() {
    const behavior = this.settings.timeoutBehavior || 'skip';
    this.logActivity('TARGET_TIMEOUT', `انتهى مؤقت اختيار الهدف دون تحديد رقم صالح. الإجراء: ${behavior}`);

    if (behavior === 'skip') {
      this.state = GameStates.NEXT_ROUND;
      this.emit('target_timeout_action', { action: 'skip' });
      this.emit('state_updated', this.getSnapshot());
    } else if (behavior === 'respin') {
      this.state = GameStates.READY;
      this.emit('target_timeout_action', { action: 'respin' });
      this.emit('state_updated', this.getSnapshot());
    } else if (behavior === 'random') {
      // Pick a random eligible target
      const eligible = this.getActivePlayers().filter(p =>
        p.id !== this.chosenPlayer.id && !p.hasShield && p.status !== 'immune'
      );
      if (eligible.length > 0) {
        const randomTarget = eligible[Math.floor(Math.random() * eligible.length)];
        this.selectTargetByNumber(randomTarget.playerNumber, this.chosenPlayer);
      } else {
        this.state = GameStates.NEXT_ROUND;
        this.emit('state_updated', this.getSnapshot());
      }
    }
  }

  // -------------------------------------------------------------
  // Gift Defense System (نظام الدفاع عن النفس)
  // -------------------------------------------------------------

  handleDefenseTimeout() {
    if (this.state !== GameStates.DEFENDING || !this.targetPlayer) return;

    const eliminated = this.targetPlayer;
    eliminated.status = 'eliminated';
    eliminated.eliminatedAt = new Date().toISOString();
    eliminated.eliminatedCount = (eliminated.eliminatedCount || 0) + 1;

    if (this.chosenPlayer) {
      this.chosenPlayer.killsCount = (this.chosenPlayer.killsCount || 0) + 1;
    }

    this.state = GameStates.ELIMINATED;

    this.persist();
    this.logActivity('PLAYER_ELIMINATED', `❌ تم إقصاء اللاعب ${eliminated.nickname} (#${eliminated.playerNumber}) من اللعبة!`, {
      eliminated,
      by: this.chosenPlayer
    });

    this.emit('player_eliminated', {
      player: eliminated,
      by: this.chosenPlayer
    });
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());

    // Check if only 1 player remains -> Winner!
    const remaining = this.getActivePlayers();
    if (remaining.length === 1) {
      setTimeout(() => {
        this.declareWinner(remaining[0]);
      }, 4000);
    }
  }

  handleDefenseGift({ userId, uniqueId, giftName, diamonds, repeatCount = 1, eventId }) {
    if (eventId && this.processedEventIds.has(eventId)) return false;
    if (eventId) this.processedEventIds.add(eventId);

    if (this.state !== GameStates.DEFENDING || !this.targetPlayer) {
      return false;
    }

    // Verify sender is target player
    const cleanUnique = (uniqueId || '').replace(/^@/, '').toLowerCase();
    const targetUnique = (this.targetPlayer.uniqueId || '').toLowerCase();
    const isTarget =
      (userId && String(userId) === String(this.targetPlayer.userId)) ||
      (cleanUnique && cleanUnique === targetUnique);

    if (!isTarget) return false;

    // Check gift validity
    const defenseConf = this.settings.gifts.defense;
    const coinValue = (diamonds || 1) * (repeatCount || 1);

    const matchesName = defenseConf.giftName && giftName &&
      giftName.toLowerCase().includes(defenseConf.giftName.toLowerCase());
    const matchesCoins = coinValue >= (defenseConf.minCoins || 1);

    if (!matchesName && !matchesCoins) {
      return false;
    }

    // DEFENSE SUCCESS! Cancel elimination immediately!
    this.stopTimer();
    this.state = GameStates.SAVED;

    const savedPlayer = this.targetPlayer;
    savedPlayer.status = 'active';

    this.persist();
    this.logActivity('PLAYER_SAVED', `🛡️ تم إنقاذ اللاعب ${savedPlayer.nickname} (#${savedPlayer.playerNumber})! نجح في الدفاع عن نفسه بالهدية وسيستمر في اللعبة!`, {
      player: savedPlayer,
      gift: { giftName, diamonds: coinValue }
    });

    this.emit('player_saved', {
      player: savedPlayer,
      giftName,
      coins: coinValue
    });
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());

    return true;
  }

  // -------------------------------------------------------------
  // Rejoin & Help & Shield System (العودة، المساعدة، الحصانة)
  // -------------------------------------------------------------

  handleRejoin({ userId, uniqueId, nickname, profilePictureUrl, coins = 5, eventId }) {
    if (eventId && this.processedEventIds.has(eventId)) return false;
    if (eventId) this.processedEventIds.add(eventId);

    const player = this.getPlayerById(userId || uniqueId);
    if (!player || player.status !== 'eliminated') {
      return false;
    }

    const rejoinConf = this.settings.gifts.rejoin;
    if (coins < (rejoinConf.minCoins || 5)) {
      return false;
    }

    player.status = 'active';
    player.rejoinedAt = new Date().toISOString();

    if (!rejoinConf.keepPreviousNumber) {
      player.playerNumber = this.getAvailablePlayerNumber();
    }

    this.persist();
    this.logActivity('PLAYER_REJOINED', `🔄 اللاعب ${player.nickname} عاد إلى اللعبة! (#${player.playerNumber})`, { player, coins });

    this.emit('player_rejoined', { player, coins });
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());

    return true;
  }

  handleHelp({ helperUserId, helperName, targetPlayerNumber, coins = 16, eventId }) {
    if (eventId && this.processedEventIds.has(eventId)) return false;
    if (eventId) this.processedEventIds.add(eventId);

    const helpConf = this.settings.gifts.help;
    if (coins < (helpConf.minCoins || 16)) {
      return false;
    }

    // Beneficiary is targetPlayerNumber or first eliminated player
    let target = null;
    if (targetPlayerNumber) {
      target = this.getPlayerByNumber(targetPlayerNumber);
    }
    if (!target || target.status !== 'eliminated') {
      const eliminated = this.getEliminatedPlayers();
      if (eliminated.length === 0) return false;
      target = eliminated[eliminated.length - 1]; // latest eliminated
    }

    target.status = 'active';
    target.coins = (target.coins || 0) + (helpConf.beneficiaryCoins || 5);
    target.rejoinedAt = new Date().toISOString();

    this.persist();
    this.logActivity('PLAYER_HELPED', `❤️ اللاعب ${helperName} ساعد اللاعب ${target.nickname} (#${target.playerNumber}) وأعاده إلى اللعبة!`, {
      helper: helperName,
      target,
      coins
    });

    this.emit('player_helped', {
      helperName,
      target,
      coins
    });
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());

    return true;
  }

  handleShieldGift({ userId, uniqueId, coins = 30, eventId }) {
    if (eventId && this.processedEventIds.has(eventId)) return false;
    if (eventId) this.processedEventIds.add(eventId);

    const shieldConf = this.settings.gifts.shield;
    if (coins < (shieldConf.minCoins || 30)) {
      return false;
    }

    const player = this.getPlayerById(userId || uniqueId);
    if (!player || player.status === 'eliminated') return false;

    this.setPlayerShield(player.id, true, shieldConf.durationRounds || 1);
    this.emit('player_shield_activated', { player, rounds: shieldConf.durationRounds });
    return true;
  }

  // -------------------------------------------------------------
  // Round Progression & Shield Decrement
  // -------------------------------------------------------------

  nextRound() {
    this.roundNumber++;
    this.chosenPlayer = null;
    this.targetPlayer = null;
    this.wheelResult = null;
    this.stopTimer();

    // Decrement shields
    for (const p of this.players) {
      if (p.hasShield) {
        p.shieldRoundsRemaining--;
        if (p.shieldRoundsRemaining <= 0) {
          p.hasShield = false;
          if (p.status === 'immune') p.status = 'active';
          this.logActivity('SHIELD_EXPIRED', `انتهت مدة درع الحصانة للاعب ${p.nickname}`);
        }
      }
    }

    this.state = this.getActivePlayers().length >= 2 ? GameStates.READY : GameStates.WAITING_FOR_PLAYERS;

    this.persist();
    this.logActivity('ROUND_ADVANCED', `الانتقال إلى الجولة #${this.roundNumber}`);
    this.emit('round_advanced', { roundNumber: this.roundNumber });
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());
  }

  cancelElimination() {
    this.stopTimer();
    this.state = GameStates.READY;
    this.targetPlayer = null;
    this.persist();
    this.logActivity('ELIMINATION_CANCELLED', 'قام المدير بإلغاء عملية الإقصاء يدوياً');
    this.emit('state_updated', this.getSnapshot());
  }

  // -------------------------------------------------------------
  // Final Round & Winner Challenge (حسم الجولة وتحدي الفائز)
  // -------------------------------------------------------------

  startFinalRound() {
    this.state = GameStates.FINAL_ROUND;
    this.finalRoundScores = {};
    const duration = this.settings.timers.finalRoundDuration || 60;

    this.logActivity('FINAL_ROUND_STARTED', `🏆 بدأت مرحلة حسم الجولة! أرسل الهدية المطلوبة للفوز! (${duration} ثانية)`);
    this.emit('final_round_started', { duration });
    this.emit('state_updated', this.getSnapshot());

    this.startTimer('final_round', duration, () => {
      this.resolveFinalRound();
    });
  }

  handleFinalRoundGift({ userId, uniqueId, nickname, coins = 100 }) {
    if (this.state !== GameStates.FINAL_ROUND) return false;

    let player = this.getPlayerById(userId || uniqueId);
    if (!player) {
      // Auto add if not in roster
      const addRes = this.addPlayer({ userId, uniqueId, nickname, manual: true });
      player = addRes.player;
    }

    this.finalRoundScores[player.id] = (this.finalRoundScores[player.id] || 0) + coins;
    this.emit('final_round_score_updated', {
      player,
      score: this.finalRoundScores[player.id],
      scores: this.finalRoundScores
    });

    if (this.settings.gifts.finalRound.rule === 'first_to_gift') {
      this.stopTimer();
      this.declareWinner(player);
    }

    return true;
  }

  resolveFinalRound() {
    let topPlayerId = null;
    let topScore = -1;

    for (const [pId, score] of Object.entries(this.finalRoundScores)) {
      if (score > topScore) {
        topScore = score;
        topPlayerId = pId;
      }
    }

    if (topPlayerId) {
      const winner = this.getPlayerById(topPlayerId);
      this.declareWinner(winner);
    } else {
      // Pick last standing or random active
      const actives = this.getActivePlayers();
      if (actives.length > 0) {
        this.declareWinner(actives[0]);
      } else {
        this.state = GameStates.FINISHED;
        this.emit('state_updated', this.getSnapshot());
      }
    }
  }

  declareWinner(winnerPlayer) {
    this.winner = winnerPlayer;
    this.state = GameStates.FINISHED;
    this.stopTimer();

    this.persist();
    this.logActivity('WINNER_DECLARED', `👑 الفائز النهائي في اللعبة هو ${winnerPlayer.nickname} (#${winnerPlayer.playerNumber})!`, { winner: winnerPlayer });

    this.emit('winner_declared', { winner: winnerPlayer });
    this.emit('state_updated', this.getSnapshot());
  }

  startWinnerChallenge(challenger) {
    this.state = GameStates.CHALLENGE;
    this.challenger = challenger;
    const duration = this.settings.timers.challengeDuration || 45;

    this.logActivity('CHALLENGE_STARTED', `⚔️ تحدي جديد! ${challenger.nickname} يتحدى الفائز ${this.winner.nickname}!`, {
      challenger,
      winner: this.winner
    });

    this.emit('winner_challenge_started', {
      challenger,
      winner: this.winner,
      duration
    });
    this.emit('state_updated', this.getSnapshot());

    this.startTimer('challenge', duration, () => {
      this.resolveChallenge();
    });
  }

  resolveChallenge() {
    // Challenge concludes
    this.state = GameStates.FINISHED;
    this.logActivity('CHALLENGE_RESOLVED', `انتهى وقت التحدي.`);
    this.emit('challenge_ended', { winner: this.winner });
    this.emit('state_updated', this.getSnapshot());
  }

  // -------------------------------------------------------------
  // Settings & Reset
  // -------------------------------------------------------------

  updateSettings(newSettings) {
    if (!newSettings || typeof newSettings !== 'object') return;
    if (newSettings.gifts) {
      this.settings.gifts = {
        ...(this.settings.gifts || {}),
        ...newSettings.gifts
      };
      delete newSettings.gifts;
    }
    if (newSettings.timers) {
      this.settings.timers = {
        ...(this.settings.timers || {}),
        ...newSettings.timers
      };
      delete newSettings.timers;
    }
    if (newSettings.wheelConfig) {
      this.settings.wheelConfig = {
        ...(this.settings.wheelConfig || {}),
        ...newSettings.wheelConfig
      };
      delete newSettings.wheelConfig;
    }
    this.settings = { ...this.settings, ...newSettings };
    this.persist();
    this.emit('settings_updated', this.settings);
    this.emit('state_updated', this.getSnapshot());
  }

  resetGame() {
    this.stopTimer();
    this.state = GameStates.WAITING_FOR_PLAYERS;
    this.roundNumber = 1;
    this.chosenPlayer = null;
    this.targetPlayer = null;
    this.wheelResult = null;
    this.winner = null;
    this.challenger = null;
    this.players = [];
    this.finalRoundScores = {};
    this.processedEventIds.clear();
    this.settings.isJoinOpen = true;
    this.persist();
    this.logActivity('GAME_RESET', 'تم إعادة تعيين اللعبة ومسح قائمة اللاعبين والجولات');
    this.emit('game_reset');
    this.emit('players_updated', this.players);
    this.emit('state_updated', this.getSnapshot());
  }

  getSnapshot() {
    return {
      state: this.state,
      roundNumber: this.roundNumber,
      isPaused: this.isPaused,
      settings: this.settings,
      chosenPlayer: this.chosenPlayer,
      targetPlayer: this.targetPlayer,
      wheelResult: this.wheelResult,
      winner: this.winner,
      challenger: this.challenger,
      timer: this.timer,
      activeCount: this.getActivePlayers().length,
      eliminatedCount: this.getEliminatedPlayers().length,
      totalPlayers: this.players.length
    };
  }
}

module.exports = { GameState, GameStates };
