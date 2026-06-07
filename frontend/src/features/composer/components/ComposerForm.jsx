import React, { useState } from 'react';
import { 
  Clock, 
  Image as ImageIcon, 
  PlusCircle, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  Smile, 
  List, 
  Zap, 
  Wand2
} from 'lucide-react';

export default function ComposerForm({ 
  caption, 
  setCaption, 
  imageUrl, 
  setImageUrl, 
  scheduleTime, 
  setScheduleTime, 
  onSubmit,
  apiFetch,
  showToast
}) {
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('Professional');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showCustomEnhance, setShowCustomEnhance] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, etc).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // AI Content Generator API trigger
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      if (showToast) showToast('Please enter what you want the post to be about.', 'error');
      return;
    }

    setIsGenerating(true);
    if (showToast) showToast('AI is drafting your LinkedIn post...', 'info');

    try {
      const res = await apiFetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, tone: aiTone })
      });
      const data = await res.json();
      
      if (data.success) {
        setCaption(data.text);
        setAiPrompt('');
        setIsAIPanelOpen(false);
        if (showToast) showToast('AI drafted caption successfully!', 'success');
      } else {
        if (showToast) showToast(data.message || 'AI Generation failed', 'error');
      }
    } catch (err) {
      if (showToast) showToast(`Network error: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Content Enhancer preset/custom trigger
  const handleAIEnhance = async (instruction) => {
    if (!caption.trim()) {
      if (showToast) showToast('Please enter some draft caption text to enhance first.', 'error');
      return;
    }

    setIsEnhancing(true);
    if (showToast) showToast('AI is polishing your caption...', 'info');

    try {
      const res = await apiFetch('/api/ai/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: caption, instruction })
      });
      const data = await res.json();
      
      if (data.success) {
        setCaption(data.text);
        setShowCustomEnhance(false);
        setCustomInstruction('');
        if (showToast) showToast('Caption enhanced successfully!', 'success');
      } else {
        if (showToast) showToast(data.message || 'Enhancement failed', 'error');
      }
    } catch (err) {
      if (showToast) showToast(`Network error: ${err.message}`, 'error');
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-5">
      <div className="mb-2">
        <h2 className="text-base font-bold tracking-wide text-stone-900">Compose Draft</h2>
        <p className="text-xs text-stone-500 mt-1 font-inter">Write post copies or link image assets directly without Notion.</p>
      </div>

      {/* Write with AI section */}
      <div className="border border-stone-200/60 rounded-xl overflow-hidden bg-amber-50/15">
        <button
          type="button"
          onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100/70 transition duration-150 cursor-pointer"
        >
          <div className="flex items-center gap-2 text-stone-800">
            <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500/20" />
            <span className="text-xs font-bold">Write with AI</span>
          </div>
          {isAIPanelOpen ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
        </button>

        {isAIPanelOpen && (
          <div className="p-4 border-t border-stone-200/60 flex flex-col gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Post Topic / Brief Idea</label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows="3"
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150"
                placeholder="What should the post be about? (e.g. 'Announcing my new Next.js project called LinkFlow')"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Tone</label>
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value)}
                  className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-700 focus:outline-none focus:border-stone-500 transition cursor-pointer"
                >
                  <option>Professional</option>
                  <option>Storytelling</option>
                  <option>Casual</option>
                  <option>Educational</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="self-end px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition duration-200 shadow-sm cursor-pointer disabled:bg-amber-600/60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Writing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Draft Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        
        {/* Caption */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Post Caption</label>
          <div className="relative">
            <textarea 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows="6" 
              className="w-full bg-[#fbfaf7] border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150 custom-scrollbar" 
              placeholder="Share your thoughts, achievements, or project updates..." 
              required
            />
            <div className="text-[10px] text-stone-400 absolute bottom-[-20px] right-1">
              {caption.length} characters
            </div>
          </div>

          {/* AI Enhancers toolbar */}
          {caption.trim().length > 0 && (
            <div className="mt-2 p-3 bg-stone-50/70 border border-stone-200/50 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-stone-500 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  AI Enhancer
                </span>
                {isEnhancing && (
                  <span className="text-[9px] font-semibold text-stone-400 flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Refining...
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAIEnhance('make it punchier and write a stronger hook')}
                  disabled={isEnhancing}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[10px] font-semibold text-stone-600 transition duration-150 cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  Punchy Hook
                </button>
                <button
                  type="button"
                  onClick={() => handleAIEnhance('add appropriate emojis to make it visually engaging')}
                  disabled={isEnhancing}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[10px] font-semibold text-stone-600 transition duration-150 cursor-pointer flex items-center gap-1"
                >
                  <Smile className="w-3 h-3 text-amber-500" />
                  Add Emojis
                </button>
                <button
                  type="button"
                  onClick={() => handleAIEnhance('format key points as clear bullet points with short paragraphs')}
                  disabled={isEnhancing}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[10px] font-semibold text-stone-600 transition duration-150 cursor-pointer flex items-center gap-1"
                >
                  <List className="w-3 h-3 text-amber-500" />
                  Bullet Points
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomEnhance(!showCustomEnhance)}
                  disabled={isEnhancing}
                  className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[10px] font-semibold text-stone-600 transition duration-150 cursor-pointer"
                >
                  Custom Instruction...
                </button>
              </div>

              {showCustomEnhance && (
                <div className="flex items-center gap-2 pt-1.5">
                  <input
                    type="text"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                    className="flex-1 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-500"
                    placeholder="e.g. 'rewrite it to sound casual' or 'add call to action'"
                  />
                  <button
                    type="button"
                    onClick={() => handleAIEnhance(customInstruction)}
                    disabled={isEnhancing || !customInstruction.trim()}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:bg-stone-300 disabled:cursor-not-allowed transition"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image Link or Local Upload */}
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Image URL or Local Upload (Optional)</label>
          <div className="relative flex items-center">
            <ImageIcon className="absolute left-4 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              value={imageUrl.startsWith('data:image/') ? '📷 Local Image Selected' : imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-[#fbfaf7] border border-stone-200 rounded-xl pl-11 pr-24 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150" 
              placeholder="https://example.com/assets/graphic.png" 
              autoComplete="off"
              disabled={imageUrl.startsWith('data:image/')}
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {imageUrl.startsWith('data:image/') ? (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="px-2.5 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition duration-150 cursor-pointer"
                >
                  Remove
                </button>
              ) : (
                <label className="px-2.5 py-1 text-[10px] font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition duration-150 cursor-pointer flex items-center gap-1">
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Schedule Time */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Scheduled Posting Time</label>
          <div className="relative flex items-center">
            <Clock className="absolute left-4 w-4 h-4 text-stone-400" />
            <input 
              type="datetime-local" 
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full bg-[#fbfaf7] border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-sm text-stone-600 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150" 
              required
            />
          </div>
        </div>

        {/* Action Button */}
        <button 
          type="submit" 
          className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-full text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition duration-200 mt-2 shadow-sm cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Queue Local Post</span>
        </button>
      </form>
    </div>
  );
}
