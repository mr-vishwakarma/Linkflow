const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Calls Google's official Gemini REST API to generate text based on a prompt.
 * @param {string} promptText 
 * @returns {Promise<string>} Generated text
 */
const callGeminiAPI = async (promptText) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured in .env. Please add it to enable AI Content Generation.');
  }

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: promptText
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response received from Gemini API');
    }

    return text.trim();
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.error('[Gemini Service] API Error:', errMsg);
    throw new Error(`Gemini API Error: ${errMsg}`);
  }
};

/**
 * Generates a draft LinkedIn post based on a topic prompt and tone.
 * @param {string} prompt 
 * @param {string} tone 
 * @returns {Promise<string>}
 */
const generateAICaption = async (prompt, tone) => {
  if (!prompt) throw new Error('Prompt is required for AI generation');

  const toneText = tone ? tone.trim() : 'professional';
  const systemPrompt = `You are a professional LinkedIn content creator. Write a highly engaging LinkedIn post based on the following topic:
Topic: "${prompt}"
Tone style: ${toneText}

Guidelines:
- Start with a compelling, scroll-stopping hook line to grab the reader's attention.
- Keep paragraphs short (1-2 sentences) to ensure high readability.
- Use bullet points where appropriate to structure lists or key insights.
- End with a call to action or an engaging question to drive comments.
- Add 3-5 relevant hashtags at the very bottom.
- Do NOT include placeholders (e.g. "[Insert Name]"), markdown headers (like #, ##) in the body, or meta-commentary about the generation. Write only the actual post copy.`;

  return callGeminiAPI(systemPrompt);
};

/**
 * Rewrites or enhances an existing draft caption based on custom instructions or preset commands.
 * @param {string} text 
 * @param {string} instruction 
 * @returns {Promise<string>}
 */
const enhanceAICaption = async (text, instruction) => {
  if (!text) throw new Error('Original text caption is required for enhancement');
  if (!instruction) throw new Error('Enhancement instruction is required');

  const systemPrompt = `You are an expert LinkedIn copywriter. Rewrite and enhance the following LinkedIn draft caption according to this instruction:
Instruction: "${instruction}"

Original Draft Caption:
"""
${text}
"""

Guidelines:
- Maintain the main message, facts, or value of the post.
- Optimize the formatting for LinkedIn readability (short paragraphs, clear hook, CTA, hashtags).
- Do NOT include any markdown headers (like #, ##) in the body.
- Respond ONLY with the revised, enhanced caption. Do not include any explanations, introductions, or wrappers.`;

  return callGeminiAPI(systemPrompt);
};

module.exports = {
  generateAICaption,
  enhanceAICaption
};
