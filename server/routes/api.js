const express = require('express');
const storage = require('../state/storage');
const config = require('../config');

function createApiRouter(gameState, tiktokConnector) {
  const router = express.Router();

  // GET State snapshot
  router.get('/state', (req, res) => {
    res.json({
      snapshot: gameState.getSnapshot(),
      players: gameState.players,
      tiktokStatus: tiktokConnector.getStatus()
    });
  });

  // GET Gift catalog (صور ومعلومات الهدايا)
  router.get('/gifts/catalog', (req, res) => {
    res.json({ gifts: config.giftCatalog || [] });
  });

  // Settings
  router.post('/settings', (req, res) => {
    const newSettings = req.body || {};
    gameState.updateSettings(newSettings);
    res.json({ success: true, settings: gameState.settings });
  });

  // Basic Controls
  router.post('/control/join', (req, res) => {
    const { isOpen } = req.body;
    gameState.settings.isJoinOpen = isOpen !== undefined ? !!isOpen : !gameState.settings.isJoinOpen;
    gameState.persist();
    gameState.logActivity('JOIN_TOGGLE', gameState.settings.isJoinOpen ? 'تم فتح باب الانضمام للاعبين' : 'تم إغلاق باب الانضمام');
    gameState.emit('settings_updated', gameState.settings);
    gameState.emit('state_updated', gameState.getSnapshot());
    res.json({ success: true, isJoinOpen: gameState.settings.isJoinOpen });
  });

  // Roulette Control: Start
  router.post('/control/roulette/start', (req, res) => {
    const result = gameState.startRoulette();
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // Roulette Control: Land
  router.post('/control/roulette/land', (req, res) => {
    gameState.landRoulette();
    res.json({ success: true, chosenPlayer: gameState.chosenPlayer });
  });

  // Next Round
  router.post('/control/round/next', (req, res) => {
    gameState.nextRound();
    res.json({ success: true, roundNumber: gameState.roundNumber });
  });

  // Final Round
  router.post('/control/round/final', (req, res) => {
    gameState.startFinalRound();
    res.json({ success: true });
  });

  // Cancel Elimination
  router.post('/control/elimination/cancel', (req, res) => {
    gameState.cancelElimination();
    res.json({ success: true });
  });

  // Timers Control
  router.post('/control/timer/pause', (req, res) => {
    gameState.pauseTimer();
    res.json({ success: true, isPaused: gameState.isPaused });
  });

  router.post('/control/timer/resume', (req, res) => {
    gameState.resumeTimer();
    res.json({ success: true, isPaused: gameState.isPaused });
  });

  router.post('/control/timer/extend', (req, res) => {
    const seconds = parseInt(req.body.seconds || 10, 10);
    gameState.extendTimer(seconds);
    res.json({ success: true, timer: gameState.timer });
  });

  // Reset Game
  router.post('/control/game/reset', (req, res) => {
    gameState.resetGame();
    res.json({ success: true });
  });

  // -------------------------------------------------------------
  // Player Management
  // -------------------------------------------------------------

  router.post('/players/add', (req, res) => {
    const { nickname, uniqueId, profilePictureUrl, playerNumber } = req.body;
    const result = gameState.addPlayer({
      uniqueId: uniqueId || nickname,
      nickname: nickname || uniqueId || 'لاعب',
      profilePictureUrl,
      manual: true
    });

    if (result.success && playerNumber) {
      gameState.changePlayerNumber(result.player.id, playerNumber);
    }

    res.json(result);
  });

  router.delete('/players/:id', (req, res) => {
    const removed = gameState.removePlayer(req.params.id);
    res.json({ success: removed });
  });

  router.post('/players/:id/number', (req, res) => {
    const { playerNumber } = req.body;
    const result = gameState.changePlayerNumber(req.params.id, playerNumber);
    res.json(result);
  });

  router.post('/players/:id/revive', (req, res) => {
    const player = gameState.getPlayerById(req.params.id);
    if (!player) return res.status(404).json({ success: false, reason: 'اللاعب غير موجود' });

    player.status = 'active';
    player.rejoinedAt = new Date().toISOString();
    gameState.persist();
    gameState.logActivity('PLAYER_REVIVED_MANUAL', `قام المدير بإعادة اللاعب ${player.nickname} (#${player.playerNumber}) للعبة يدوياً`);
    gameState.emit('players_updated', gameState.players);
    gameState.emit('state_updated', gameState.getSnapshot());
    res.json({ success: true, player });
  });

  router.post('/players/:id/shield', (req, res) => {
    const { hasShield, rounds } = req.body;
    const result = gameState.setPlayerShield(req.params.id, hasShield, rounds || 1);
    res.json(result);
  });

  // -------------------------------------------------------------
  // TikTok Connection (3 Modes)
  // -------------------------------------------------------------

  // Mode 1: Direct TikTok connection (needs EulerStream API key)
  router.post('/tiktok/connect', async (req, res) => {
    const { username, apiKey } = req.body;
    try {
      gameState.settings.tiktokUsername = username;
      if (apiKey) {
        gameState.settings.eulerApiKey = apiKey;
      }
      gameState.persist();
      const status = await tiktokConnector.connect(username, apiKey || gameState.settings.eulerApiKey);
      res.json({ success: true, status });
    } catch (err) {
      res.json({ success: false, error: err.message, status: tiktokConnector.getStatus() });
    }
  });

  // Mode 2: TikFinity mode
  router.post('/tiktok/tikfinity-mode', (req, res) => {
    const { username } = req.body;
    const status = tiktokConnector.connectViaTikFinity(username || '');
    res.json({ success: true, status });
  });

  // Mode 3: Simulator mode
  router.post('/tiktok/simulator-mode', (req, res) => {
    const status = tiktokConnector.connectSimulator();
    res.json({ success: true, status });
  });

  // Set EulerStream API Key
  router.post('/tiktok/set-api-key', (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.json({ success: false, error: 'يرجى إدخال API Key' });
    }
    tiktokConnector.setEulerApiKey(apiKey);
    gameState.settings.eulerApiKey = apiKey;
    gameState.persist();
    res.json({ success: true, message: 'تم حفظ API Key بنجاح' });
  });

  router.post('/tiktok/disconnect', async (req, res) => {
    await tiktokConnector.disconnect();
    res.json({ success: true, status: tiktokConnector.getStatus() });
  });

  router.get('/tiktok/status', (req, res) => {
    res.json(tiktokConnector.getStatus());
  });

  // -------------------------------------------------------------
  // Simulation Toolbar (لاختبار جميع السيناريوهات بسهولة!)
  // -------------------------------------------------------------

  router.post('/simulate/join', (req, res) => {
    const { uniqueId, nickname, avatar } = req.body;
    const uId = uniqueId || `user_${Math.floor(Math.random() * 1000)}`;
    const result = gameState.handleChatComment({
      userId: 'sim_' + uId,
      uniqueId: uId,
      nickname: nickname || uId,
      commentText: gameState.settings.joinKeyword || 'تم',
      profilePictureUrl: avatar
    });
    res.json({ success: !!result, result });
  });

  router.post('/simulate/comment', (req, res) => {
    const { uniqueId, commentText } = req.body;
    const player = gameState.getPlayerById(uniqueId);
    const result = gameState.handleChatComment({
      userId: player ? player.userId : 'sim_' + uniqueId,
      uniqueId: uniqueId || (player ? player.uniqueId : 'tester'),
      nickname: player ? player.nickname : uniqueId,
      commentText
    });
    res.json({ success: !!result, result });
  });

  router.post('/simulate/gift', (req, res) => {
    const { uniqueId, giftName, coins, repeatCount } = req.body;
    const player = gameState.getPlayerById(uniqueId);
    const giftEvent = {
      userId: player ? player.userId : 'sim_' + (uniqueId || 'viewer'),
      uniqueId: uniqueId || (player ? player.uniqueId : 'viewer'),
      nickname: player ? player.nickname : uniqueId,
      giftName: giftName || 'هدية تجريبية',
      diamonds: parseInt(coins || 1, 10),
      repeatCount: parseInt(repeatCount || 1, 10),
      eventId: `sim_${Date.now()}`
    };

    tiktokConnector.dispatchGift(giftEvent);
    res.json({ success: true, giftEvent });
  });

  // -------------------------------------------------------------
  // Logs
  // -------------------------------------------------------------

  router.get('/logs', (req, res) => {
    const limit = parseInt(req.query.limit || 100, 10);
    res.json({ logs: storage.loadLogs(limit) });
  });

  router.delete('/logs', (req, res) => {
    storage.clearLogs();
    res.json({ success: true });
  });

  return router;
}

module.exports = createApiRouter;
