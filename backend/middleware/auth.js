const jwt = require('jsonwebtoken');
const crypto = require('crypto');

if (!process.env.ACCESS_TOKEN_SECRET) {
  throw new Error('[Auth Middleware] ACCESS_TOKEN_SECRET must be set in .env');
}

const TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

/**
 * Verifies the JWT access token from the Authorization header.
 * Returns 401 + code: 'TOKEN_EXPIRED' when the token is expired,
 * allowing the frontend's apiFetch to silently refresh and retry.
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
  }

  jwt.verify(token, TOKEN_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, code: 'TOKEN_EXPIRED', message: 'Access Token Expired' });
      }
      return res.status(401).json({ success: false, message: 'Invalid Authentication Token' });
    }
    req.user = decoded;
    next();
  });
};

/**
 * Rate limiter middleware — limits each IP to `max` requests per `windowMs`.
 * Returns a 429 Too Many Requests if the limit is exceeded.
 */
const rateLimitMap = new Map();

const createRateLimiter = ({ windowMs = 60_000, max = 20, message = 'Too many requests, please slow down.' } = {}) => {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip;
    const now = Date.now();
    const window = rateLimitMap.get(ip) || { count: 0, start: now };

    if (now - window.start > windowMs) {
      // Reset window
      rateLimitMap.set(ip, { count: 1, start: now });
      return next();
    }

    if (window.count >= max) {
      return res.status(429).json({ success: false, message });
    }

    window.count++;
    rateLimitMap.set(ip, window);
    next();
  };
};

// Strict limiter for auth endpoints (login, signup)
const authRateLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 15, message: 'Too many auth attempts. Try again in 15 minutes.' });

// Less strict limiter for refresh endpoints to accommodate multi-tab users
const refreshRateLimiter = createRateLimiter({ windowMs: 60_000, max: 50, message: 'Too many refresh requests.' });

// Relaxed limiter for general API endpoints
const apiRateLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });

module.exports = { authMiddleware, authRateLimiter, refreshRateLimiter, apiRateLimiter };
