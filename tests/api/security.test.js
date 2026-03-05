const request = require('supertest');
const jwt = require('jsonwebtoken');
const { TEST_SECRET } = require('../helpers/setup');

const app = require('../../server');

// ── Sensitive file exposure ─────────────────────────────────────────────────

describe('Sensitive file exposure protection', () => {
  it('should not serve .env', async () => {
    const res = await request(app).get('/.env');
    expect(res.status).toBe(404);
  });

  it('should not serve server.js', async () => {
    const res = await request(app).get('/server.js');
    expect(res.status).toBe(404);
  });

  it('should not serve routes/auth.js', async () => {
    const res = await request(app).get('/routes/auth.js');
    expect(res.status).toBe(404);
  });

  it('should not serve middleware/auth.js', async () => {
    const res = await request(app).get('/middleware/auth.js');
    expect(res.status).toBe(404);
  });

  it('should not serve package.json', async () => {
    const res = await request(app).get('/package.json');
    expect(res.status).toBe(404);
  });
});

// ── Auth enforcement on protected routes ────────────────────────────────────

describe('Auth enforcement', () => {
  it('should reject unauthenticated POST to /api/games', async () => {
    const res = await request(app)
      .post('/api/games')
      .field('title', 'Unauthorized Upload');
    expect(res.status).toBe(401);
  });

  it('should reject forged JWT on POST to /api/games', async () => {
    const token = jwt.sign(
      { email: 'hacker@evil.com' },
      'wrong-secret-entirely',
      { algorithm: 'HS256' }
    );
    const res = await request(app)
      .post('/api/games')
      .set('Cookie', `token=${token}`)
      .field('title', 'Hacked Upload');
    expect(res.status).toBe(401);
  });
});

// ── CORS ────────────────────────────────────────────────────────────────────

describe('CORS headers', () => {
  it('should include CORS headers for allowed origin', async () => {
    const origin = process.env.FRONTEND_URL || 'http://localhost:3000';
    const res = await request(app)
      .get('/api/games')
      .set('Origin', origin);
    expect(res.headers['access-control-allow-origin']).toBe(origin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
