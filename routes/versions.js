const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireCsrf } = require('../middleware/auth');
const { GAMES_DIR, readGamesIndex, writeGamesIndexAtomic } = require('../lib/games');
const { copyDirSync } = require('./upload');

const router = express.Router();

// GET /api/games/:id/versions — public
router.get('/games/:id/versions', function (req, res) {
  try {
    var gamesIndex = readGamesIndex();
    var game = gamesIndex.find(function (g) { return g.id === req.params.id; });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json({
      currentVersion: game.currentVersion || 1,
      versions: game.versions || [],
    });
  } catch (err) {
    console.error('Failed to load versions:', err.message);
    res.status(500).json({ error: 'Failed to load versions' });
  }
});

// POST /api/games/:id/rollback — auth required
router.post('/games/:id/rollback', requireAuth, requireCsrf, function (req, res) {
  try {
    var targetVersion = parseInt(req.body.version);
    if (!targetVersion || targetVersion < 1) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    var gamesIndex = readGamesIndex();
    var game = gamesIndex.find(function (g) { return g.id === req.params.id; });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    if (!game.versions || game.versions.length === 0) {
      return res.status(400).json({ error: 'No previous versions available' });
    }

    var versionEntry = game.versions.find(function (v) { return v.version === targetVersion; });
    if (!versionEntry) return res.status(404).json({ error: 'Version not found' });

    var gameDir = path.join(GAMES_DIR, game.id);
    var versionDir = path.join(GAMES_DIR, versionEntry.folder);

    if (!fs.existsSync(versionDir)) {
      return res.status(404).json({ error: 'Version files not found' });
    }

    // Save current as a version before rollback
    var currentVersion = game.currentVersion || 1;
    var backupDir = path.join(GAMES_DIR, game.id + '-v' + currentVersion);
    if (!fs.existsSync(backupDir)) {
      copyDirSync(gameDir, backupDir);
      game.versions.push({
        version: currentVersion,
        folder: game.id + '-v' + currentVersion,
        date: game.date,
        description: game.description,
        author: game.author,
      });
    }

    // Restore target version
    fs.rmSync(gameDir, { recursive: true, force: true });
    copyDirSync(versionDir, gameDir);

    game.date = new Date().toISOString();
    game.currentVersion = targetVersion;
    game.description = versionEntry.description || game.description;

    writeGamesIndexAtomic(gamesIndex);
    res.json({ message: 'Rolled back to v' + targetVersion, game: game });
  } catch (err) {
    console.error('Rollback failed:', err.message);
    res.status(500).json({ error: 'Rollback failed' });
  }
});

module.exports = router;
