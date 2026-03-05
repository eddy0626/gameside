const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';

// Cookie options (reusable for set and clear)
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

// Parse allowed emails from env
const allowedEmails = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

// Passport Google OAuth 2.0 strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    (accessToken, refreshToken, profile, done) => {
      const emailObj = profile.emails && profile.emails[0];
      const email = emailObj && emailObj.value;

      if (!email) {
        return done(null, false, { message: 'No email found in Google profile' });
      }

      // MED-6: Check email is verified
      if (emailObj.verified === false) {
        return done(null, false, { message: 'Email not verified' });
      }

      if (allowedEmails.length > 0 && !allowedEmails.includes(email.toLowerCase())) {
        return done(null, false, { message: 'Email not in allowed list' });
      }

      const user = {
        email: email,
        name: profile.displayName,
        picture: profile.photos && profile.photos[0] && profile.photos[0].value,
      };

      return done(null, user);
    }
  )
);

// HIGH-6: Generate CSRF state and store in short-lived cookie
router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000, // 5 minutes
  });
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: state,
  })(req, res, next);
});

// HIGH-6: Verify state + HIGH-10: Redirect instead of JSON
router.get('/google/callback', (req, res, next) => {
  // Verify CSRF state
  const cookieState = req.cookies && req.cookies.oauth_state;
  const queryState = req.query.state;

  if (!cookieState || !queryState || cookieState !== queryState) {
    res.clearCookie('oauth_state');
    return res.redirect('/?login=csrf_error');
  }

  res.clearCookie('oauth_state');

  passport.authenticate('google', { session: false, failureRedirect: '/?login=failed' })(
    req, res, () => {
      const payload = {
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture,
      };

      // CRIT-3: Explicit algorithm
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: 'HS256',
        expiresIn: '24h',
      });

      res.cookie('token', token, cookieOptions);

      // HIGH-10: Redirect to frontend instead of returning JSON
      res.redirect('/?login=success');
    }
  );
});

// GET /auth/me - Get current user info
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /auth/logout - Clear token cookie (LOW-6: matching cookie options)
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
  });
  res.json({ message: 'Logged out' });
});

module.exports = router;
