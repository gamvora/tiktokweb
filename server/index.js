const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const config = require('./config');
const { GameState } = require('./state/gameState');
const TikTokConnector = require('./connectors/tiktokConnector');
const createTikFinityRouter = require('./connectors/tikfinityWebhook');
const createApiRouter = require('./routes/api');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize Core Instances
const gameState = new GameState();
const tiktokConnector = new TikTokConnector(gameState);

// Routes
app.use('/api', createApiRouter(gameState, tiktokConnector));
app.use('/api/tikfinity', createTikFinityRouter(gameState, tiktokConnector));

// Explicit route for admin and overlay
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// -------------------------------------------------------------
// Socket.IO Real-time Events
// -------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Send initial snapshot immediately upon connection
  socket.emit('init_sync', {
    snapshot: gameState.getSnapshot(),
    players: gameState.players,
    tiktokStatus: tiktokConnector.getStatus()
  });

  // Client commands via Socket
  socket.on('request_state', () => {
    socket.emit('state_updated', gameState.getSnapshot());
  });

  socket.on('disconnect', () => {
    // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Wire GameState Events to Socket.IO Broadcasts
gameState.on('state_updated', (snapshot) => {
  io.emit('state_updated', snapshot);
});

gameState.on('players_updated', (players) => {
  io.emit('players_updated', players);
});

gameState.on('settings_updated', (settings) => {
  io.emit('settings_updated', settings);
});

gameState.on('timer_started', (timer) => {
  io.emit('timer_started', timer);
});

gameState.on('timer_tick', (tickData) => {
  io.emit('timer_tick', tickData);
});

gameState.on('timer_stopped', () => {
  io.emit('timer_stopped');
});

gameState.on('timer_paused', (timer) => {
  io.emit('timer_paused', timer);
});

gameState.on('timer_resumed', (timer) => {
  io.emit('timer_resumed', timer);
});

gameState.on('timer_extended', (timer) => {
  io.emit('timer_extended', timer);
});

gameState.on('roulette_spin_started', (result) => {
  io.emit('roulette_spin_started', result);
});

gameState.on('player_selected_turn', (data) => {
  io.emit('player_selected_turn', data);
});

gameState.on('target_selected', (data) => {
  io.emit('target_selected', data);
});

gameState.on('target_immune_blocked', (data) => {
  io.emit('target_immune_blocked', data);
});

gameState.on('target_timeout_action', (data) => {
  io.emit('target_timeout_action', data);
});

gameState.on('player_saved', (data) => {
  io.emit('player_saved', data);
});

gameState.on('player_eliminated', (data) => {
  io.emit('player_eliminated', data);
});

gameState.on('player_rejoined', (data) => {
  io.emit('player_rejoined', data);
});

gameState.on('player_helped', (data) => {
  io.emit('player_helped', data);
});

gameState.on('player_shield_activated', (data) => {
  io.emit('player_shield_activated', data);
});

gameState.on('round_advanced', (data) => {
  io.emit('round_advanced', data);
});

gameState.on('final_round_started', (data) => {
  io.emit('final_round_started', data);
});

gameState.on('final_round_score_updated', (data) => {
  io.emit('final_round_score_updated', data);
});

gameState.on('winner_declared', (data) => {
  io.emit('winner_declared', data);
});

gameState.on('winner_challenge_started', (data) => {
  io.emit('winner_challenge_started', data);
});

gameState.on('challenge_ended', (data) => {
  io.emit('challenge_ended', data);
});

gameState.on('game_reset', () => {
  io.emit('game_reset');
});

gameState.on('activity_log', (logEntry) => {
  io.emit('activity_log', logEntry);
});

// Wire TikTok Connector Events
tiktokConnector.on('status_change', (status) => {
  io.emit('tiktok_status', status);
});

tiktokConnector.on('room_info', (info) => {
  io.emit('tiktok_room_info', info);
});

tiktokConnector.on('chat', (comment) => {
  io.emit('tiktok_chat', comment);
});

tiktokConnector.on('gift', (gift) => {
  io.emit('tiktok_gift', gift);
});

// Start listening
server.listen(config.PORT, () => {
  console.log('========================================================');
  console.log(`🎡 TikTok Live Roulette Server is RUNNING on port ${config.PORT}`);
  console.log(`📺 Overlay Screen (البث):   http://localhost:${config.PORT}/overlay`);
  console.log(`🎛️ Admin Dashboard (المدير): http://localhost:${config.PORT}/admin`);
  console.log(`🔗 TikFinity Webhook:       http://localhost:${config.PORT}/api/tikfinity/webhook`);
  console.log('========================================================');
});
