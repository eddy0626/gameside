const request = require('supertest');
const jwt = require('jsonwebtoken');
const {
  TEST_CSRF,
  TEST_SECRET,
  generateToken,
  generateExpiredToken,
} = require('../helpers/setup');

const app = require('../../server');

// ── GET /auth/google ────────────────────────────────────────────────────────

describe('GET /auth/google', () => {
  it('should redirect to Google OAuth', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/accounts\.google\.com/);
  });
});

// ── GET /auth/me ────────────────────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('should return 401 without auth', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication/i);
  });

  it('should return user with valid cookie', async () => {
    const token = generateToken();
    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.csrfToken).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.name).toBe('Test User');
  });

  it('should return user with Bearer token', async () => {
    const token = generateToken();
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should return 401 with expired token', async () => {
    const token = generateExpiredToken();
    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(401);
  });

  it('should return 401 with wrong secret', async () => {
    const token = jwt.sign(
      { email: 'test@example.com', name: 'Test User' },
      'completely-wrong-secret',
      { algorithm: 'HS256' }
    );
    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(401);
  });
});

// ── POST /auth/logout ───────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('should clear the token cookie', async () => {
    const token = generateToken();
    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', [`token=${token}`, `csrf_token=${TEST_CSRF}`])
      .set('X-CSRF-Token', TEST_CSRF);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
    // Verify Set-Cookie header clears the token
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.startsWith('token='))).toBe(true);
  });

  it('should be idempotent (no error without cookie)', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });
});

// ── Algorithm validation ────────────────────────────────────────────────────

describe('JWT algorithm validation', () => {
  it('should reject tokens signed with wrong algorithm (HS384)', async () => {
    const token = jwt.sign(
      { email: 'test@example.com', name: 'Test User' },
      TEST_SECRET,
      { algorithm: 'HS384' }
    );
    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(401);
  });
});
