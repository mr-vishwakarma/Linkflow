const express = require('express');
const router = express.Router();
const { runScheduledJobs } = require('../cron/scheduler');

router.get('/', async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;
    
    // Check if a cron secret is configured
    if (cronSecret) {
      const authHeader = req.headers.authorization;
      const querySecret = req.query.secret;
      
      const isAuthorizedHeader = authHeader && authHeader === `Bearer ${cronSecret}`;
      const isAuthorizedQuery = querySecret && querySecret === cronSecret;

      if (!isAuthorizedHeader && !isAuthorizedQuery) {
        return res.status(401).json({ 
          success: false, 
          message: 'Unauthorized. Please provide a valid CRON_SECRET via Authorization header or query parameter.' 
        });
      }
    } else {
      console.log('[Cron Route] Warning: CRON_SECRET is not configured. Running cron job publicly.');
    }

    console.log('[Cron Route] Executing scheduled post check...');
    const result = await runScheduledJobs();
    
    res.json({
      success: true,
      message: 'Scheduled posts processing completed.',
      result
    });
  } catch (err) {
    console.error('[Cron Route] Error during cron execution:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error running scheduled jobs.', 
      error: err.message 
    });
  }
});

module.exports = router;
