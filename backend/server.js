const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const connectDB = require('./config/db');
const { initScheduler } = require('./cron/scheduler');
const { authMiddleware, authRateLimiter, apiRateLimiter } = require('./middleware/auth');

// Route files
const authRoutes   = require('./routes/authRoutes');
const configRoutes = require('./routes/configRoutes');
const postRoutes   = require('./routes/postRoutes');
const syncRoutes   = require('./routes/syncRoutes');
const cronRoutes   = require('./routes/cronRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(helmet());

// ── CORS — only allow the configured frontend origin ─────────────────────────
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Database ──────────────────────────────────────────────────────────────────
connectDB();

// ── Health check (for deployment platforms) ───────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Public auth routes (strict rate limit)
app.use('/api/auth', authRateLimiter, authRoutes);

// Protected application routes (JWT required + general rate limit)
app.use('/api/config', apiRateLimiter, authMiddleware, configRoutes);
app.use('/api/posts',  apiRateLimiter, authMiddleware, postRoutes);
app.use('/api/sync',   apiRateLimiter, authMiddleware, syncRoutes);
app.use('/api/cron',   cronRoutes);

// ── Scheduler ─────────────────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  initScheduler();
} else {
  console.log('[Scheduler] Running in Vercel environment: local node-cron scheduler disabled.');
}

// ── Start ─────────────────────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` LinkFlow Secured Backend Service online on port ${PORT}!`);
    console.log(` Configured DB routes, Auth controls & scheduler.  `);
    console.log(`===================================================`);
  });
}

module.exports = app;
