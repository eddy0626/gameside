const fs = require('fs');
const path = require('path');

const ACTIVITY_PATH = path.join(__dirname, '..', 'data', 'activity.json');
const MAX_ENTRIES = 100;

function readActivity() {
  try { return JSON.parse(fs.readFileSync(ACTIVITY_PATH, 'utf-8')); }
  catch (_) { return []; }
}

function writeActivityAtomic(data) {
  var tmp = ACTIVITY_PATH + '.' + process.pid + '.' + Date.now() + '.tmp';
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, ACTIVITY_PATH);
  } catch (error) {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    throw error;
  }
}

function addActivity(type, actor, details) {
  var activities = readActivity();
  activities.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    type: type,
    actor: actor,
    details: details,
    timestamp: new Date().toISOString()
  });
  if (activities.length > MAX_ENTRIES) {
    activities = activities.slice(0, MAX_ENTRIES);
  }
  writeActivityAtomic(activities);
}

module.exports = { addActivity, readActivity };
