const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { signup, login, refresh, logout, linkedinAuth, linkedinCallback } = require('../controllers/authController');
const { authRateLimiter, refreshRateLimiter } = require('../middleware/auth');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: errors.array().map(e => e.msg).join(', '),
      errors: errors.array() 
    });
  }
  next();
};

const signupValidation = [
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

router.post('/signup', authRateLimiter, signupValidation, signup);
router.post('/login', authRateLimiter, loginValidation, login);
router.post('/refresh', refreshRateLimiter, refresh);
router.post('/logout', logout);

// LinkedIn OAuth2 Routes
router.get('/linkedin', authRateLimiter, linkedinAuth);
router.get('/linkedin/callback', authRateLimiter, linkedinCallback);

module.exports = router;
