const request = require('supertest');
const path = require('path');
const fs = require('fs');
const {
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
} = require('../helpers/setup');

const app = require('../../server');

// ── GET /api/games ──────────────────────────────────────────────────────────

describe('GET /api/games', () => {
  it('should return an array of games', async () => {
    const res = await request(app).get('/api/games');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('each game should have required fields', async () => {
    const res = await request(app).get('/api/games');
    const game = res.body[0];
    expect(game).toHaveProperty('id');
    expect(game).toHaveProperty('title');
    expect(game).toHaveProperty('folder');
    expect(game).toHaveProperty('thumbnail');
    expect(game).toHaveProperty('description');
    expect(game).toHaveProperty('author');
    expect(game).toHaveProperty('tags');
    expect(game).toHaveProperty('date');
    expect(game).toHaveProperty('plays');
    expect(game).toHaveProperty('featured');
  });
});

// ── POST /api/games – Authentication ────────────────────────────────────────

describe('POST /api/games - Authentication', () => {
  it('should reject without auth', async () => {
    const res = await request(app)
      .post('/api/games')
      .field('title', 'Test');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication/i);
  });

  it('should reject with invalid token', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', 'token=invalid.jwt.token')
      .field('title', 'Test');
    expect(res.status).toBe(401);
  });

  it('should reject with expired token', async () => {
    const token = generateExpiredToken();
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'Test');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/games – Upload Success ────────────────────────────────────────

describe('POST /api/games - Upload Success', () => {
  let indexBackup;
  const testGameIds = [];

  beforeAll(() => {
    indexBackup = backupGamesIndex();
    ensureUploadsTmp();
  });

  afterAll(() => {
    restoreGamesIndex(indexBackup);
    testGameIds.forEach(id => cleanupTestGame(id));
    cleanupUploadsTmp();
  });

  it('should upload an HTML game successfully', async () => {
    const token = generateToken();
    const htmlContent = '<!DOCTYPE html><html><body>HTML Test Game</body></html>';

    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'E2E Test HTML Game')
      .field('description', 'A test game for E2E')
      .field('author', 'Tester')
      .field('tags', 'test,e2e')
      .attach('gameFile', Buffer.from(htmlContent), 'game.html')
      .attach('thumbnail', createTestPng(), 'thumb.png');

    expect(res.status).toBe(201);
    expect(res.body.game).toBeDefined();
    expect(res.body.game.title).toBe('E2E Test HTML Game');
    expect(res.body.game.tags).toEqual(['test', 'e2e']);
    expect(res.body.game.plays).toBe(0);
    expect(res.body.game.featured).toBe(false);
    testGameIds.push(res.body.game.id);
  });

  it('should upload a ZIP game successfully', async () => {
    const token = generateToken();

    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'E2E Test ZIP Game')
      .field('description', 'ZIP game test')
      .field('author', 'Tester')
      .attach('gameFile', createTestZip(), 'game.zip')
      .attach('thumbnail', createTestPng(), 'thumb.png');

    expect(res.status).toBe(201);
    expect(res.body.game.id).toBe('e2e-test-zip-game');
    testGameIds.push(res.body.game.id);

    // Verify index.html was extracted
    const indexPath = path.join(__dirname, '..', '..', 'games', 'e2e-test-zip-game', 'index.html');
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it('should reject duplicate game ID', async () => {
    const token = generateToken();
    const htmlContent = '<!DOCTYPE html><html><body>Dup</body></html>';

    const res1 = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'Duplicate Test Game')
      .attach('gameFile', Buffer.from(htmlContent), 'game.html')
      .attach('thumbnail', createTestPng(), 'thumb.png');
    expect(res1.status).toBe(201);
    testGameIds.push(res1.body.game.id);

    const res2 = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'Duplicate Test Game')
      .attach('gameFile', Buffer.from(htmlContent), 'game.html')
      .attach('thumbnail', createTestPng(), 'thumb.png');
    expect(res2.status).toBe(409);
    expect(res2.body.error).toMatch(/already exists/i);
  });
});

// ── POST /api/games – Validation ────────────────────────────────────────────

describe('POST /api/games - Validation', () => {
  let indexBackup;
  let token;
  const testGameIds = [];

  beforeAll(() => {
    indexBackup = backupGamesIndex();
    token = generateToken();
    ensureUploadsTmp();
  });

  afterAll(() => {
    restoreGamesIndex(indexBackup);
    testGameIds.forEach(id => cleanupTestGame(id));
    cleanupUploadsTmp();
  });

  it('should reject missing title', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .attach('gameFile', Buffer.from('<html></html>'), 'game.html')
      .attach('thumbnail', createTestPng(), 'thumb.png');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('should reject missing game file', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'No File Game')
      .attach('thumbnail', createTestPng(), 'thumb.png');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/game file/i);
  });

  it('should reject missing thumbnail', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'No Thumb Game')
      .attach('gameFile', Buffer.from('<html></html>'), 'game.html');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/thumbnail/i);
  });

  it('should reject wrong file type', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'Wrong Type Game')
      .attach('gameFile', Buffer.from('binary content'), 'game.exe')
      .attach('thumbnail', createTestPng(), 'thumb.png');
    expect(res.status).toBe(400);
  });

  it('should reject file with wrong magic bytes', async () => {
    // File named .png but contains plain text (no PNG magic bytes)
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'Bad Magic Game')
      .attach('gameFile', Buffer.from('<html></html>'), 'game.html')
      .attach('thumbnail', Buffer.from('not a real png file at all'), 'thumb.png');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content does not match/i);
  });

  it('should reject ZIP without index.html', async () => {
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'No Index ZIP Game')
      .attach('gameFile', createTestZipNoIndex(), 'game.zip')
      .attach('thumbnail', createTestPng(), 'thumb.png');
    // safeExtractZip throws → caught by outer try/catch → 500
    expect(res.status).toBe(500);
  });
});
