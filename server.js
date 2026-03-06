const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const path = require('path');

const {
  GAMES_DIR,
  decorateGameForResponse,
  getGamesPort,
  readGamesIndex,
} = require('./lib/games');

const app = express();
const gamesApp = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const GAMES_PORT = getGamesPort(PORT);
const isProduction = process.env.NODE_ENV === 'production';

if (PORT === GAMES_PORT) {
  throw new Error('GAMES_PORT must be different from PORT.');
}

// In single-port deployments (e.g. Railway), default GAMES_PUBLIC_ORIGIN to FRONTEND_URL
if (!process.env.GAMES_PUBLIC_ORIGIN && process.env.FRONTEND_URL) {
  process.env.GAMES_PUBLIC_ORIGIN = process.env.FRONTEND_URL;
}

// Trust proxy (Railway, Heroku, etc. terminate SSL at the proxy)
app.set('trust proxy', true);
gamesApp.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// --- Route mounting ---
const uploadRoutes = require('./routes/upload');
app.use('/api', uploadRoutes);
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);
const membersRoutes = require('./routes/members');
app.use('/api/members', membersRoutes);
const playsRoutes = require('./routes/plays');
app.use('/api', playsRoutes);
const ratingsRoutes = require('./routes/ratings');
app.use('/api', ratingsRoutes);
const commentsRoutes = require('./routes/comments');
app.use('/api', commentsRoutes);
const activityRoutes = require('./routes/activity');
app.use('/api', activityRoutes);
const gamejamRoutes = require('./routes/gamejam');
app.use('/api', gamejamRoutes);
const versionsRoutes = require('./routes/versions');
app.use('/api', versionsRoutes);

// API: Get games list
app.get('/api/games', (req, res) => {
  try {
    const games = readGamesIndex();
    res.json(games.map((game) => decorateGameForResponse(game, req, GAMES_PORT)));
  } catch (error) {
    console.error('Failed to load games list:', error.message);
    res.status(500).json({ error: 'Failed to load games list' });
  }
});

// Unity WebGL Brotli/Gzip compressed files — must be served with correct headers
gamesApp.use('/games', (req, res, next) => {
  if (req.path.endsWith('.br')) {
    res.set('Content-Encoding', 'br');
    if (req.path.endsWith('.js.br')) res.set('Content-Type', 'application/javascript');
    else if (req.path.endsWith('.wasm.br')) res.set('Content-Type', 'application/wasm');
    else if (req.path.endsWith('.data.br')) res.set('Content-Type', 'application/octet-stream');
  } else if (req.path.endsWith('.gz')) {
    res.set('Content-Encoding', 'gzip');
    if (req.path.endsWith('.js.gz')) res.set('Content-Type', 'application/javascript');
    else if (req.path.endsWith('.wasm.gz')) res.set('Content-Type', 'application/wasm');
    else if (req.path.endsWith('.data.gz')) res.set('Content-Type', 'application/octet-stream');
  }
  next();
});

// Static files: the main app serves public/, while uploaded games are isolated.
app.use(express.static(path.join(__dirname, 'public')));

// Also serve /games from main app for single-port platforms (Railway, etc.)
app.use('/games', (req, res, next) => {
  if (req.path.endsWith('.br')) {
    res.set('Content-Encoding', 'br');
    if (req.path.endsWith('.js.br')) res.set('Content-Type', 'application/javascript');
    else if (req.path.endsWith('.wasm.br')) res.set('Content-Type', 'application/wasm');
    else if (req.path.endsWith('.data.br')) res.set('Content-Type', 'application/octet-stream');
  } else if (req.path.endsWith('.gz')) {
    res.set('Content-Encoding', 'gzip');
    if (req.path.endsWith('.js.gz')) res.set('Content-Type', 'application/javascript');
    else if (req.path.endsWith('.wasm.gz')) res.set('Content-Type', 'application/wasm');
    else if (req.path.endsWith('.data.gz')) res.set('Content-Type', 'application/octet-stream');
  }
  next();
});
app.use('/games', express.static(GAMES_DIR));

gamesApp.use('/games', express.static(GAMES_DIR));

// Start server (only when run directly, not when imported for tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GameSide server running on http://localhost:${PORT}`);
  });
  gamesApp.listen(GAMES_PORT, () => {
    console.log(`GameSide assets running on http://127.0.0.1:${GAMES_PORT}/games`);
  });
}

module.exports = app;
module.exports.gamesApp = gamesApp;
