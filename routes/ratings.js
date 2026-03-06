const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth, requireCsrf } = require('../middleware/auth');

const router = express.Router();

const RATINGS_PATH = path.join(__dirname, '..', 'data', 'ratings.json');

function readRatings() {
  try {
    return JSON.parse(fs.readFileSync(RATINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeRatingsAtomic(data) {
  const tmp = `${RATINGS_PATH}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, RATINGS_PATH);
  } catch (error) {
    try {
      if (fs.existsSync(tmp)) {
        fs.unlinkSync(tmp);
      }
    } catch {
      // Ignore temp file cleanup errors.
    }
    throw error;
  }
}

function computeStats(ratings) {
  if (!ratings || ratings.length === 0) {
    return { ratings: [], average: 0, count: 0 };
  }
  const sum = ratings.reduce(function (acc, r) { return acc + r.rating; }, 0);
  const average = Math.round((sum / ratings.length) * 10) / 10;
  return { ratings: ratings, average: average, count: ratings.length };
}

// GET /api/games/:id/ratings — public
router.get('/games/:id/ratings', function (req, res) {
  try {
    const allRatings = readRatings();
    const gameRatings = allRatings[req.params.id] || [];
    res.json(computeStats(gameRatings));
  } catch (error) {
    console.error('Failed to read ratings:', error.message);
    res.status(500).json({ error: 'Failed to read ratings' });
  }
});

// POST /api/games/:id/ratings — requires auth + CSRF
router.post('/games/:id/ratings', requireAuth, requireCsrf, function (req, res) {
  try {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    const gameId = req.params.id;
    const allRatings = readRatings();
    const gameRatings = allRatings[gameId] || [];

    // Upsert: find existing rating by this user
    const userId = req.user.sub || req.user.id || req.user.email;
    const existing = gameRatings.findIndex(function (r) { return r.userId === userId; });

    const entry = {
      userId: userId,
      name: req.user.name || req.user.email || 'Anonymous',
      rating: rating,
      timestamp: new Date().toISOString(),
    };

    if (existing >= 0) {
      gameRatings[existing] = entry;
    } else {
      gameRatings.push(entry);
    }

    allRatings[gameId] = gameRatings;
    writeRatingsAtomic(allRatings);

    res.json(computeStats(gameRatings));
  } catch (error) {
    console.error('Failed to save rating:', error.message);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

module.exports = router;
