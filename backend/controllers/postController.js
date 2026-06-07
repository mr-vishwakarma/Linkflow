const fs = require('fs');
const path = require('path');
const Post = require('../models/Post');
const Config = require('../models/Config');
const { publishToLinkedIn } = require('../services/linkedinService');
const { updateNotionPageStatus } = require('../services/notionService');
const { sendSuccessNotification } = require('../services/notificationService');

const saveImageLocally = (base64Data, filename) => {
  const buffer = Buffer.from(base64Data, 'base64');
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  
  const port = process.env.PORT || 5000;
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
  return `${baseUrl}/uploads/${filename}`;
};

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ scheduledTime: 1 });
    res.json({ success: true, posts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createPost = async (req, res) => {
  try {
    const { text, imageUrl, time } = req.body;
    if (!text || !time) {
      return res.status(400).json({ success: false, message: 'Caption and Schedule Date/Time are required.' });
    }

    let finalImageUrl = imageUrl ? imageUrl.trim() : '';

    // If it's a base64 encoded image, process upload
    if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
      const matches = finalImageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const fileType = matches[1];
        const base64Data = matches[2];
        const extension = fileType.split('/')[1] || 'png';
        const filename = `upload-${Date.now()}.${extension}`;
        
        if (process.env.IMAGEKIT_PUBLIC_KEY) {
          try {
            console.log('[Post Controller] Uploading image to ImageKit...');
            const { uploadBase64ToImageKit } = require('../services/imagekitService');
            finalImageUrl = await uploadBase64ToImageKit(base64Data, filename);
            console.log(`[Post Controller] Upload successful: ${finalImageUrl}`);
          } catch (uploadErr) {
            console.error('[Post Controller] ImageKit upload failed, falling back to local storage:', uploadErr.message);
            finalImageUrl = saveImageLocally(base64Data, filename);
          }
        } else {
          finalImageUrl = saveImageLocally(base64Data, filename);
        }
      }
    }

    const newPost = new Post({
      notionPageId: `local-${Date.now()}`,
      text,
      imageUrl: finalImageUrl,
      scheduledTime: new Date(time),
      status: 'pending'
    });

    await newPost.save();
    res.json({ success: true, message: 'Local post queued successfully', post: newPost });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const result = await Post.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, message: 'Post removed from database queue' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const publishPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.status = 'publishing';
    await post.save();

    const config = await Config.getOrCreate();

    console.log(`[Post Controller] Triggering manual publish for post ID: ${post._id}`);
    const postUrn = await publishToLinkedIn(post, config);
    let postUrl = '';
    if (postUrn) {
      postUrl = `https://www.linkedin.com/feed/update/${postUrn}`;
      post.postUrl = postUrl;
      post.postUrn = postUrn;
    }

    post.status = 'posted';
    post.postedAt = new Date();
    post.error = null;
    await post.save();

    // Two-way status update in Notion
    if (post.notionPageId && !post.notionPageId.startsWith('local-')) {
      await updateNotionPageStatus(post.notionPageId, config, postUrl);
    }

    // Trigger success webhook notification
    sendSuccessNotification(post).catch(err => console.error('[Post Controller] Webhook notification error:', err.message));

    res.json({ success: true, message: 'Post published to LinkedIn successfully' });
  } catch (err) {
    console.error(`[Post Controller] Manual publish failed:`, err.message);
    const post = await Post.findById(req.params.id);
    if (post) {
      post.status = 'failed';
      post.error = err.message || 'Unknown error occurred';
      await post.save();
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getPosts,
  createPost,
  deletePost,
  publishPost
};
