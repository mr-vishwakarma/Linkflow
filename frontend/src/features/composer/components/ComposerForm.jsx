import React from 'react';
import { Clock, Image as ImageIcon, PlusCircle } from 'lucide-react';

export default function ComposerForm({ 
  caption, 
  setCaption, 
  imageUrl, 
  setImageUrl, 
  scheduleTime, 
  setScheduleTime, 
  onSubmit 
}) {

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

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-base font-bold tracking-wide text-stone-900">Compose Draft</h2>
        <p className="text-xs text-stone-500 mt-1 font-inter">Write post copies or link image assets directly without Notion.</p>
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
              className="w-full bg-[#fbfaf7] border border-stone-200 rounded-xl pl-11 pr-4 py-3 text-sm text-stone-900 text-stone-600 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150" 
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
