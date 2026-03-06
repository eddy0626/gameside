const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth, requireCsrf } = require('../middleware/auth');

const router = express.Router();

const GAMEJAM_PATH = path.join(__dirname, '..', 'data', 'gamejam.json');
const GAMES_INDEX_PATH = path.join(__dirname, '..', 'games', 'index.json');

function readGamejams() {
  try {
    return JSON.parse(fs.readFileSync(GAMEJAM_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeGamejamsAtomic(data) {
  const tmp = `${GAMEJAM_PATH}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, GAMEJAM_PATH);
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

function readGamesIndex() {
  try {
    return JSON.parse(fs.readFileSync(GAMES_INDEX_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function computeStatus(jam) {
  var now = new Date();
  var start = new Date(jam.startDate + 'T00:00:00');
  var end = new Date(jam.endDate + 'T23:59:59');
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'active';
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// GET /api/gamejam — public
router.get('/gamejam', function (req, res) {
  try {
    var jams = readGamejams();
    var result = jams
      .map(function (jam) {
        return Object.assign({}, jam, { status: computeStatus(jam) });
      })
      .sort(function (a, b) {
        return new Date(b.startDate) - new Date(a.startDate);
      });
    res.json(result);
  } catch (error) {
    console.error('Failed to read gamejams:', error.message);
    res.status(500).json({ error: 'Failed to read gamejams' });
  }
});

// POST /api/gamejam — requires auth + CSRF
router.post('/gamejam', requireAuth, requireCsrf, function (req, res) {
  try {
    var title = req.body && req.body.title;
    var description = req.body && req.body.description;
    var theme = req.body && req.body.theme;
    var startDate = req.body && req.body.startDate;
    var endDate = req.body && req.body.endDate;

    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }
    title = title.trim();
    if (title.length > 100) {
      return res.status(400).json({ error: 'Title must be 100 characters or fewer' });
    }
    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }
    if (!endDate) {
      return res.status(400).json({ error: 'End date is required' });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    var userId = req.user.sub || req.user.id || req.user.email;
    var id = slugify(title) + '-' + Date.now().toString(36);

    var jam = {
      id: id,
      title: title,
      description: (description || '').trim(),
      theme: (theme || '').trim(),
      startDate: startDate,
      endDate: endDate,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      entries: [],
    };

    var jams = readGamejams();
    jams.push(jam);
    writeGamejamsAtomic(jams);

    try {
      var { addActivity } = require('../lib/activity');
      addActivity('gamejam_created', { name: req.user.name || 'Unknown', email: req.user.email || '' }, { jamTitle: jam.title, jamId: jam.id });
    } catch (_) {}

    res.json(Object.assign({}, jam, { status: computeStatus(jam) }));
  } catch (error) {
    console.error('Failed to create gamejam:', error.message);
    res.status(500).json({ error: 'Failed to create gamejam' });
  }
});

// PUT /api/gamejam/:id/entries — requires auth + CSRF
router.put('/gamejam/:id/entries', requireAuth, requireCsrf, function (req, res) {
  try {
    var gameId = req.body && req.body.gameId;
    if (!gameId) {
      return res.status(400).json({ error: 'gameId is required' });
    }

    var games = readGamesIndex();
    var game = games.find(function (g) { return g.id === gameId; });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    var jams = readGamejams();
    var jamIdx = jams.findIndex(function (j) { return j.id === req.params.id; });
    if (jamIdx === -1) {
      return res.status(404).json({ error: 'Gamejam not found' });
    }

    var jam = jams[jamIdx];
    var userId = req.user.sub || req.user.id || req.user.email;

    // Only jam creator or game author can add entries
    if (jam.createdBy !== userId && game.author !== userId) {
      return res.status(403).json({ error: 'Only the jam creator or the game author can add entries' });
    }

    if (jam.entries.indexOf(gameId) !== -1) {
      return res.status(400).json({ error: 'Game is already entered in this jam' });
    }

    jam.entries.push(gameId);
    jams[jamIdx] = jam;
    writeGamejamsAtomic(jams);

    try {
      var { addActivity } = require('../lib/activity');
      addActivity('gamejam_entry', { name: req.user.name || 'Unknown', email: req.user.email || '' }, { jamTitle: jam.title, gameTitle: game.title, jamId: jam.id, gameId: gameId });
    } catch (_) {}

    res.json(Object.assign({}, jam, { status: computeStatus(jam) }));
  } catch (error) {
    console.error('Failed to add entry:', error.message);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

module.exports = router;
