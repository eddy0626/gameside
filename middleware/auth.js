const jwt = require('jsonwebtoken');

const CSRF_COOKIE_NAME = 'csrf_token';

function getBearerToken(req) {
  if (!req.headers.authorization) {
    return null;
  }

  const parts = req.headers.authorization.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
}

const requireAuth = (req, res, next) => {
  // Prefer an explicit Authorization header over ambient cookies.
  let token = getBearerToken(req);

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireCsrf = (req, res, next) => {
  if (getBearerToken(req)) {
    return next();
  }

  const hasTokenCookie = Boolean(req.cookies && req.cookies.token);
  if (!hasTokenCookie) {
    return next();
  }

  const csrfCookie = req.cookies && req.cookies[CSRF_COOKIE_NAME];
  const csrfHeader = req.get('X-CSRF-Token');

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

module.exports = { CSRF_COOKIE_NAME, requireAuth, requireCsrf };
