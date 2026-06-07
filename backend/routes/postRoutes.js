const express = require('express');
const router = express.Router();
const { 
  getPosts, 
  createPost, 
  deletePost, 
  publishPost 
} = require('../controllers/postController');

router.get('/', getPosts);
router.post('/', createPost);
router.delete('/:id', deletePost);
router.post('/:id/publish', publishPost);

module.exports = router;
