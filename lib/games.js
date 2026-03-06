const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'games');
const GAMES_INDEX_PATH = path.join(GAMES_DIR, 'index.json');

function readGamesIndex() {
  const raw = fs.readFileSync(GAMES_INDEX_PATH, 'utf-8');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const wrapped = new Error('Invalid games index JSON.');
    wrapped.cause = error;
    throw wrapped;
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Games index must be an array.');
  }

  return parsed;
}

function writeGamesIndexAtomic(gamesIndex) {
  const tempPath = `${GAMES_INDEX_PATH}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(gamesIndex, null, 2);

  try {
    fs.writeFileSync(tempPath, payload);
    fs.renameSync(tempPath, GAMES_INDEX_PATH);
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
      // Ignore temp file cleanup errors.
    }
    throw error;
  }
}

function getGamesPort(mainPort) {
  const configuredPort = Number.parseInt(process.env.GAMES_PORT, 10);
  if (Number.isInteger(configuredPort) && configuredPort > 0) {
    return configuredPort;
  }

  return mainPort + 1;
}

function normalizeOrigin(origin) {
  return String(origin || '').replace(/\/+$/, '');
}

function getDefaultGamesOrigin(req, gamesPort) {
  const protocol = req.protocol || 'http';
  const hostname = req.hostname || 'localhost';

  if (hostname === 'localhost') {
    return `${protocol}://127.0.0.1:${gamesPort}`;
  }

  if (hostname === '127.0.0.1') {
    return `${protocol}://localhost:${gamesPort}`;
  }

  return `${protocol}://${hostname}:${gamesPort}`;
}

function getGamesPublicOrigin(req, gamesPort) {
  const configuredOrigin = normalizeOrigin(process.env.GAMES_PUBLIC_ORIGIN);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  return getDefaultGamesOrigin(req, gamesPort);
}

function decorateGameForResponse(game, req, gamesPort) {
  const publicOrigin = getGamesPublicOrigin(req, gamesPort);
  const thumbnailPath = String(game.thumbnail || '').replace(/^\/+/, '');

  return Object.assign({}, game, {
    thumbnailUrl: `${publicOrigin}/${thumbnailPath}`,
    playUrl: `${publicOrigin}/games/${encodeURIComponent(game.folder)}/index.html`,
  });
}

module.exports = {
  GAMES_DIR,
  GAMES_INDEX_PATH,
  decorateGameForResponse,
  getGamesPort,
  getGamesPublicOrigin,
  readGamesIndex,
  writeGamesIndexAtomic,
};
