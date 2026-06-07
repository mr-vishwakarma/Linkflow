const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const axios  = require('axios');
const User   = require('../models/User');
const Config = require('../models/Config');

const ACCESS_TOKEN_SECRET  = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('[Auth] ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be set in .env');
}

const LINKEDIN_REDIRECT_URI = `${process.env.BACKEND_URL}/api/auth/linkedin/callback`;
const FRONTEND_URL          = process.env.FRONTEND_URL || 'http://localhost:5173/';
const LINKEDIN_SCOPE        = 'openid profile email w_member_social';

// ── Token helpers ────────────────────────────────────────────────────────────

const generateAccessToken  = (userId) =>
  jwt.sign({ id: userId }, ACCESS_TOKEN_SECRET,  { expiresIn: '1h' });

const generateRefreshToken = (userId) =>
  jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

/** One-way hash for safely storing refresh tokens in the database. */
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ── App auth handlers ─────────────────────────────────────────────────────────

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    await new User({ email: normalizedEmail, password }).save();
    res.status(201).json({ success: true, message: 'User registered successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken  = hashToken(refreshToken); // Store only the hash — never the raw token
    await user.save();

    res.json({ success: true, message: 'Logged in successfully!', accessToken, refreshToken, email: user.email });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    // Look up by hashed value — raw token is never stored
    const user = await User.findOne({ refreshToken: hashToken(refreshToken) });
    if (!user) {
      return res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Verify JWT signature and expiry
    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (err) => {
      if (err) return res.status(403).json({ success: false, message: 'Invalid refresh token signature' });

      // Refresh Token Rotation: issue a brand-new refresh token on every use.
      // The old token is immediately invalidated — stolen tokens can't be reused.
      const newRefreshToken = generateRefreshToken(user._id);
      const newAccessToken  = generateAccessToken(user._id);

      user.refreshToken = hashToken(newRefreshToken);
      await user.save();

      res.json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required to logout' });
    }

    // Clear the hashed token from the database — invalidates the session
    const user = await User.findOne({ refreshToken: hashToken(refreshToken) });
    if (user) {
      user.refreshToken = '';
      await user.save();
    }

    res.json({ success: true, message: 'Logged out successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── LinkedIn OAuth2 handlers ──────────────────────────────────────────────────

// GET /api/auth/linkedin  — redirect user to LinkedIn consent screen
const linkedinAuth = (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ success: false, message: 'LINKEDIN_CLIENT_ID is not configured in .env' });
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  LINKEDIN_REDIRECT_URI,
    state:         'linkflow_oauth_state',
    scope:         LINKEDIN_SCOPE
  });

  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
};

// GET /api/auth/linkedin/callback  — exchange code, persist token + URN
const linkedinCallback = async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error)  return res.status(400).send(`LinkedIn Auth Error: ${error_description}`);
  if (!code)  return res.status(400).send('Authorization code not provided.');

  try {
    // 1. Exchange code for Access Token
    const { data: tokenData } = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_id:     process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri:  LINKEDIN_REDIRECT_URI
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenData.access_token;

    // 2. Fetch user's OpenID sub to build the URN
    const { data: userInfo } = await axios.get('https://api.linkedin.com/v2/userinfo', {
      headers: {
        'Authorization':            `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const urn = `urn:li:person:${userInfo.sub}`;

    // 3. Persist to app config (stamp issuedAt for expiry tracking)
    const config = await Config.getOrCreate();
    config.linkedinToken         = accessToken;
    config.linkedinUrn           = urn;
    config.linkedinTokenIssuedAt = new Date();
    config.updatedAt             = new Date();
    await config.save();

    console.log(`[Auth] LinkedIn OAuth complete. Saved URN: ${urn}`);

    // 4. Redirect back to the frontend dashboard
    res.redirect(FRONTEND_URL);
  } catch (err) {
    console.error('[Auth] LinkedIn OAuth error:', err.response?.data || err.message);
    res.status(500).send('Failed to authenticate with LinkedIn. Check server logs.');
  }
};

module.exports = { signup, login, refresh, logout, linkedinAuth, linkedinCallback };
