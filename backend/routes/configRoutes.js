const express = require('express');
const router = express.Router();
const { 
  getConfig, 
  updateConfig, 
  testLinkedin, 
  testNotion,
  getImageKitAuth
} = require('../controllers/configController');

router.get('/', getConfig);
router.post('/', updateConfig);
router.post('/test-linkedin', testLinkedin);
router.post('/test-notion', testNotion);
router.get('/imagekit-auth', getImageKitAuth);

module.exports = router;
