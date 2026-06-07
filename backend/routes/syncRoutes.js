const express = require('express');
const router = express.Router();
const { syncNotion } = require('../controllers/syncController');

router.post('/', syncNotion);

module.exports = router;
