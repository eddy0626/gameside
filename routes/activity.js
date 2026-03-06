const express = require('express');
const { readActivity } = require('../lib/activity');

const router = express.Router();

router.get('/activity', function (req, res) {
  try {
    var limit = Math.min(parseInt(req.query.limit) || 20, 50);
    var activities = readActivity();
    res.json({ activities: activities.slice(0, limit) });
  } catch (err) {
    console.error('Failed to read activity:', err.message);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

module.exports = router;
