const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAuth, requireCsrf } = require('../middleware/auth');

const router = express.Router();

const COMMENTS_PATH = path.join(__dirname, '..', 'data', 'comments.json');

function readComments() {
  try {
    return JSON.parse(fs.readFileSync(COMMENTS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function writeCommentsAtomic(data) {
  const tmp = `${COMMENTS_PATH}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, COMMENTS_PATH);
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

// GET /api/games/:id/comments — public
router.get('/games/:id/comments', function (req, res) {
  try {
    const allComments = readComments();
    const gameComments = allComments[req.params.id] || [];
    const sorted = gameComments.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    res.json({ comments: sorted });
  } catch (error) {
    console.error('Failed to read comments:', error.message);
    res.status(500).json({ error: 'Failed to read comments' });
  }
});

// POST /api/games/:id/comments — requires auth + CSRF
router.post('/games/:id/comments', requireAuth, requireCsrf, function (req, res) {
  try {
    var text = req.body && req.body.text;
    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    text = text.trim();
    if (text.length > 1000) {
      return res.status(400).json({ error: 'Comment must be 1000 characters or fewer' });
    }

    var gameId = req.params.id;
    var allComments = readComments();
    var gameComments = allComments[gameId] || [];

    var userId = req.user.sub || req.user.id || req.user.email;
    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      userId: userId,
      name: req.user.name || req.user.email || 'Anonymous',
      text: text,
      timestamp: new Date().toISOString(),
    };

    gameComments.push(entry);
    allComments[gameId] = gameComments;
    writeCommentsAtomic(allComments);

    try {
      var { addActivity } = require('../lib/activity');
      var { readGamesIndex } = require('../lib/games');
      var games = readGamesIndex();
      var foundGame = games.find(function (g) { return g.id === gameId; });
      addActivity('comment_added', { name: req.user.name || 'Unknown', email: req.user.email || '' }, { gameTitle: foundGame ? foundGame.title : gameId, gameId: gameId });
    } catch (_) {}

    var sorted = gameComments.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    res.json({ comments: sorted });
  } catch (error) {
    console.error('Failed to save comment:', error.message);
    res.status(500).json({ error: 'Failed to save comment' });
  }
});

// DELETE /api/games/:id/comments/:commentId — requires auth
router.delete('/games/:id/comments/:commentId', requireAuth, requireCsrf, function (req, res) {
  try {
    var gameId = req.params.id;
    var commentId = req.params.commentId;
    var allComments = readComments();
    var gameComments = allComments[gameId] || [];

    var idx = gameComments.findIndex(function (c) { return c.id === commentId; });
    if (idx === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    var userId = req.user.sub || req.user.id || req.user.email;
    if (gameComments[idx].userId !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    gameComments.splice(idx, 1);
    allComments[gameId] = gameComments;
    writeCommentsAtomic(allComments);

    var sorted = gameComments.slice().sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    res.json({ comments: sorted });
  } catch (error) {
    console.error('Failed to delete comment:', error.message);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

module.exports = router;
