const express = require('express');
const router = express.Router();
const { generateAICaption, enhanceAICaption } = require('../services/geminiService');

// POST /api/ai/generate
router.post('/generate', async (req, res) => {
  try {
    const { prompt, tone } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Topic or Prompt is required' });
    }

    console.log(`[AI Route] Generating caption for prompt: "${prompt}", tone: ${tone || 'default'}`);
    const generatedText = await generateAICaption(prompt, tone);

    res.json({
      success: true,
      text: generatedText
    });
  } catch (err) {
    console.error('[AI Route] Generate caption failed:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error generating caption'
    });
  }
});

// POST /api/ai/enhance
router.post('/enhance', async (req, res) => {
  try {
    const { text, instruction } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Original draft caption text is required' });
    }
    if (!instruction) {
      return res.status(400).json({ success: false, message: 'Enhancement instruction or preset is required' });
    }

    console.log(`[AI Route] Enhancing text. Instruction: "${instruction}"`);
    const enhancedText = await enhanceAICaption(text, instruction);

    res.json({
      success: true,
      text: enhancedText
    });
  } catch (err) {
    console.error('[AI Route] Enhance caption failed:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error enhancing caption'
    });
  }
});

module.exports = router;
