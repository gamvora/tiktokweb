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

// ─── CORS: allow Vercel frontend + local dev ───────────────────────────────
const allowedOrigins = [
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Vercel - set FRONTEND_URL env var in Railway to your Vercel URL
  process.env.FRONTEND_URL,
  // Allow all vercel.app subdomains
  /\.vercel\.app$/,
  // Allow all github.io subdomains
  /\.github\.io$/
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, server-to-server, etc.)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(o => {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    
    if (isAllowed) return callback(null, true);
    
    // Also allow in development
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// وراء Railway/Render/Vercel نثق بالبروكسي للحصول على IP والعنوان الصحيح
app.set('trust proxy', 1);

// Initialize core instances
const gameState = new GameState();
const tiktokConnector = new TikTokConnector(gameState);

// Routes (قبل الملفات الثابتة حتى لا تتضارب)
app.use('/api', createApiRouter(gameState, tiktokConnector));
app.use('/api/tikfinity', createTikFinityRouter(gameState, tiktokConnector));

// Serve static frontend from the repository root (مصدر واحد لكل البيئات)
const ROOT = path.join(__dirname, '..');
app.use('/css', express.static(path.join(ROOT, 'css')));
app.use('/js', express.static(path.join(ROOT, 'js')));
app.use('/assets', express.static(path.join(ROOT, 'assets')));

const sendIndex = (req, res) => res.sendFile(path.join(ROOT, 'index.html'));
const sendAdmin = (req, res) => res.sendFile(path.join(ROOT, 'admin.html'));

app.get(['/', '/index.html', '/overlay'], sendIndex);
app.get(['/admin', '/admin.html'], sendAdmin);

// ─── Socket.IO Real-time Events ──────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id} from ${socket.handshake.headers.origin || 'unknown'}`);

  socket.emit('init_sync', {
    snapshot: gameState.getSnapshot(),
    players: gameState.players,
    tiktokStatus: tiktokConnector.getStatus()
  });

  socket.on('request_state', () => {
    socket.emit('state_updated', gameState.getSnapshot());
    socket.emit('players_updated', gameState.players);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Wire GameState Events → Socket.IO Broadcasts
const gameEvents = [
  'state_updated', 'players_updated', 'settings_updated',
  'timer_started', 'timer_tick', 'timer_stopped', 'timer_paused', 'timer_resumed', 'timer_extended',
  'roulette_spin_started', 'player_selected_turn', 'target_selected',
  'target_immune_blocked', 'target_timeout_action',
  'player_saved', 'player_eliminated', 'player_rejoined', 'player_helped', 'player_shield_activated',
  'round_advanced', 'final_round_started', 'final_round_score_updated',
  'winner_declared', 'winner_challenge_started', 'challenge_ended',
  'game_reset', 'activity_log'
];

gameEvents.forEach(event => {
  gameState.on(event, (data) => io.emit(event, data));
});

// Wire TikTok Connector Events
tiktokConnector.on('status_change', (status) => io.emit('tiktok_status', status));
tiktokConnector.on('room_info', (info) => io.emit('tiktok_room_info', info));
tiktokConnector.on('chat', (comment) => io.emit('tiktok_chat', comment));
tiktokConnector.on('gift', (gift) => io.emit('tiktok_gift', gift));

// Start server
const PORT = config.PORT;
server.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🎡  TikTok Live Roulette — Backend v2.0 running on port ${PORT}`);
  console.log(`📺  Overlay : http://localhost:${PORT}/`);
  console.log(`🎛️  Admin   : http://localhost:${PORT}/admin`);
  console.log(`🔗  TikFinity Webhook: http://localhost:${PORT}/api/tikfinity/webhook`);
  console.log(`🌐  Frontend URL env: ${process.env.FRONTEND_URL || '(not set - all origins allowed in dev)'}`);
  console.log('═══════════════════════════════════════════════════════════');
});

// إغلاق نظيف عند إيقاف الخادم (Railway/Render يرسلان SIGTERM)
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[Server] ${signal} received, shutting down...`);
  try { await tiktokConnector.disconnect(); } catch (e) {}
  gameState.stopTimer();
  server.close(() => {
    console.log('[Server] Closed. Bye!');
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => {
  console.error('[Server] Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
});
