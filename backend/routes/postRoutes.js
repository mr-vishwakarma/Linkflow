const express = require('express');
const router = express.Router();
const { 
  getPosts, 
  createPost, 
  deletePost, 
  publishPost,
  updatePost
} = require('../controllers/postController');

router.get('/', getPosts);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);
router.post('/:id/publish', publishPost);

module.exports = router;
