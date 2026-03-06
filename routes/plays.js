const express = require('express');
const { readGamesIndex, writeGamesIndexAtomic } = require('../lib/games');

const router = express.Router();

// In-memory rate-limit map: "ip:gameId" -> timestamp
const recentPlays = new Map();
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

// Evict stale entries every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of recentPlays) {
    if (now - ts >= RATE_LIMIT_MS) recentPlays.delete(key);
  }
}, 10 * 60 * 1000).unref();

router.post('/games/:id/play', (req, res) => {
  try {
    const games = readGamesIndex();
    const game = games.find((g) => g.id === req.params.id);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}:${game.id}`;
    const now = Date.now();
    const lastPlay = recentPlays.get(key);

    if (!lastPlay || now - lastPlay >= RATE_LIMIT_MS) {
      game.plays = (game.plays || 0) + 1;
      recentPlays.set(key, now);
      writeGamesIndexAtomic(games);
    }

    res.json({ plays: game.plays || 0 });
  } catch (error) {
    console.error('Failed to record play:', error.message);
    res.status(500).json({ error: 'Failed to record play' });
  }
});

module.exports = router;
