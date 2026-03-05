const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const TEST_SECRET = 'test-secret-for-e2e-tests';
const GAMES_INDEX_PATH = path.join(__dirname, '..', '..', 'games', 'index.json');

// Set env vars before the app is required
process.env.JWT_SECRET = TEST_SECRET;
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
process.env.ALLOWED_EMAILS = 'test@example.com,admin@example.com';

function generateToken(payload, options) {
  const defaultPayload = {
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/pic.jpg',
  };
  return jwt.sign(
    Object.assign({}, defaultPayload, payload || {}),
    TEST_SECRET,
    Object.assign({ algorithm: 'HS256', expiresIn: '24h' }, options || {})
  );
}

function generateExpiredToken() {
  return jwt.sign(
    { email: 'test@example.com', name: 'Test User', picture: 'https://example.com/pic.jpg' },
    TEST_SECRET,
    { algorithm: 'HS256', expiresIn: '-1s' }
  );
}

function backupGamesIndex() {
  return fs.readFileSync(GAMES_INDEX_PATH, 'utf-8');
}

function restoreGamesIndex(data) {
  fs.writeFileSync(GAMES_INDEX_PATH, data);
}

function cleanupTestGame(gameId) {
  const gameDir = path.join(__dirname, '..', '..', 'games', gameId);
  if (fs.existsSync(gameDir)) {
    fs.rmSync(gameDir, { recursive: true, force: true });
  }
}

function cleanupUploadsTmp() {
  const tmpDir = path.join(__dirname, '..', '..', 'uploads_tmp');
  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    for (const file of files) {
      try { fs.unlinkSync(path.join(tmpDir, file)); } catch { /* ignore */ }
    }
  }
}

function ensureUploadsTmp() {
  const tmpDir = path.join(__dirname, '..', '..', 'uploads_tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
}

// Minimal valid 1x1 PNG (programmatically generated — no binary file needed)
function createTestPng() {
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // 8-bit RGB
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
    0x44, 0xAE, 0x42, 0x60, 0x82,
  ]);
}

// Create a valid ZIP with index.html inside
function createTestZip() {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();
  zip.addFile('index.html', Buffer.from('<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Test Game</h1></body></html>'));
  return zip.toBuffer();
}

// Create a ZIP without index.html (for validation testing)
function createTestZipNoIndex() {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();
  zip.addFile('readme.txt', Buffer.from('No index.html here'));
  return zip.toBuffer();
}

module.exports = {
  TEST_SECRET,
  GAMES_INDEX_PATH,
  generateToken,
  generateExpiredToken,
  backupGamesIndex,
  restoreGamesIndex,
  cleanupTestGame,
  cleanupUploadsTmp,
  ensureUploadsTmp,
  createTestPng,
  createTestZip,
  createTestZipNoIndex,
};
