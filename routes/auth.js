const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { CSRF_COOKIE_NAME, requireAuth, requireCsrf } = require('../middleware/auth');

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
};

const csrfCookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: cookieOptions.sameSite,
  maxAge: cookieOptions.maxAge,
  path: '/',
};

const allowedEmails = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

function issueCsrfCookie(res) {
  const csrfToken = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, csrfToken, csrfCookieOptions);
  return csrfToken;
}

function ensureCsrfCookie(req, res) {
  const existingToken = req.cookies && req.cookies[CSRF_COOKIE_NAME];
  if (existingToken) {
    return existingToken;
  }

  return issueCsrfCookie(res);
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/auth/google/callback`
        : '/auth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      const emailObj = profile.emails && profile.emails[0];
      const email = emailObj && emailObj.value;

      if (!email) {
        return done(null, false, { message: 'No email found in Google profile' });
      }

      if (emailObj.verified === false) {
        return done(null, false, { message: 'Email not verified' });
      }

      if (allowedEmails.length > 0 && !allowedEmails.includes(email.toLowerCase())) {
        return done(null, false, { message: 'Email not in allowed list' });
      }

      const user = {
        email,
        name: profile.displayName,
        picture: profile.photos && profile.photos[0] && profile.photos[0].value,
      };

      return done(null, user);
    }
  )
);

router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000,
    path: '/',
  });
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state,
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const cookieState = req.cookies && req.cookies.oauth_state;
  const queryState = req.query.state;

  if (!cookieState || !queryState || cookieState !== queryState) {
    res.clearCookie('oauth_state', { path: '/' });
    return res.redirect('/?login=csrf_error');
  }

  res.clearCookie('oauth_state', { path: '/' });

  passport.authenticate('google', { session: false, failureRedirect: '/?login=failed' })(
    req, res, () => {
      const payload = {
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '24h',
      });

      res.cookie('token', token, cookieOptions);
      issueCsrfCookie(res);
      res.redirect('/?login=success');
    }
  );
});

router.get('/me', requireAuth, (req, res) => {
  const csrfToken = ensureCsrfCookie(req, res);
  res.json({ user: req.user, csrfToken });
});

router.post('/logout', requireCsrf, (req, res) => {
  res.clearCookie('token', {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: csrfCookieOptions.httpOnly,
    secure: csrfCookieOptions.secure,
    sameSite: csrfCookieOptions.sameSite,
    path: csrfCookieOptions.path,
  });
  res.json({ message: 'Logged out' });
});

module.exports = router;
