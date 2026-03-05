const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (Railway, Heroku, etc. terminate SSL at the proxy)
app.set('trust proxy', true);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// --- Route mounting ---
const uploadRoutes = require('./routes/upload');
app.use('/api', uploadRoutes);
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// API: Get games list
app.get('/api/games', (req, res) => {
  const gamesPath = path.join(__dirname, 'games', 'index.json');
  fs.readFile(gamesPath, 'utf-8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to load games list' });
    }
    res.json(JSON.parse(data));
  });
});

// Static files: only public/ and games/ are served (source code is NOT exposed)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/games', express.static(path.join(__dirname, 'games')));

// Start server (only when run directly, not when imported for tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GameSide server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
