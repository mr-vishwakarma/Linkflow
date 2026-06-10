import React, { useState, useEffect } from 'react';

export default function LinkedInPreview({ text, mediaFiles, authorName }) {
  const [imageError, setImageError] = useState(false);

  // Reset image error state when mediaFiles changes
  useEffect(() => {
    setImageError(false);
  }, [mediaFiles]);

  const displayAuthorName = authorName || 'LinkedIn Profile';
  const displayAvatarLetter = displayAuthorName.substring(0, 10) === 'urn:li:per' 
    ? '👤' 
    : (displayAuthorName.substring(0, 10) === 'urn:li:org' ? '🏢' : displayAuthorName.charAt(0).toUpperCase());

  return (
    <div className="flex flex-col gap-4">
      <div className="self-start text-[9px] font-bold tracking-widest uppercase bg-stone-100 text-stone-600 border border-stone-200 px-2.5 py-1 rounded">
        LinkedIn Live Simulator
      </div>

      <div className="bg-white border border-[#e0e0e0] rounded-lg text-[#191919] overflow-hidden shadow-sm transition duration-200 max-w-full font-sans">
        
        {/* Header */}
        <div className="flex p-3 gap-3 relative">
          <div className="w-12 h-12 rounded-full bg-[#0a66c2] text-white flex items-center justify-center font-bold text-lg border border-[#e0e0e0] shrink-0">
            {displayAvatarLetter}
          </div>
          <div className="flex flex-col">
            <div className="text-sm font-semibold text-[#191919] truncate max-w-[240px] md:max-w-xs" title={displayAuthorName}>
              {displayAuthorName}
            </div>
            <div className="text-[11px] text-[#666666]">LinkedIn Member • Creator Mode</div>
            <div className="text-[10px] text-[#666666] flex items-center gap-1 mt-0.5">
              Just now • 
              <svg className="fill-[#666666] w-3 h-3" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13zM6 9v2.5a.5.5 0 00.5.5h3a.5.5 0 00.5-.5V9h1.5a.5.5 0 00.35-.85l-3-3a.5.5 0 00-.7 0l-3 3A.5.5 0 005.5 9H6z"/>
              </svg>
            </div>
          </div>
          <div className="absolute right-4 top-3 text-[#666666] text-sm cursor-pointer select-none font-bold">•••</div>
        </div>

        {/* Text */}
        <div className="px-4 pb-3 pt-1 text-sm leading-relaxed whitespace-pre-wrap break-words text-[#191919] min-h-[40px]">
          {text || 'What would you like to talk about today? Share your thoughts, achievements, or project updates...'}
        </div>

        {/* Media */}
        <div className="bg-[#f3f2f0] border-y border-[#e0e0e0] min-h-[180px] flex items-center justify-center relative overflow-hidden">
          {mediaFiles && mediaFiles.length > 0 && mediaFiles[0].type === 'image' && !imageError ? (
            <img 
              src={mediaFiles[0].url} 
              alt="LinkedIn upload preview" 
              className="w-full max-h-[380px] object-cover block"
              onError={() => setImageError(true)}
            />
          ) : mediaFiles && mediaFiles.length > 0 && mediaFiles[0].type === 'video' ? (
             <div className="flex flex-col items-center gap-2 text-stone-600 font-semibold py-12 px-6 w-full text-center bg-stone-200">
                <span>▶️ Video Preview</span>
             </div>
          ) : mediaFiles && mediaFiles.length > 0 && mediaFiles[0].type === 'document' ? (
             <div className="flex flex-col items-center gap-2 text-stone-600 font-semibold py-12 px-6 w-full text-center bg-stone-200">
                <span>📄 Document Preview</span>
             </div>
          ) : (
            <div className="flex flex-col items-center gap-2.5 text-[#666666] text-xs py-12 px-6 w-full text-center">
              <svg className="text-stone-400" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>
                {imageError ? 'Invalid image link / failed to download source' : 'Post graphic preview (Resolves dynamically from your uploaded media)'}
              </span>
            </div>
          )}
        </div>

        {/* Engagement Stats */}
        <div className="flex justify-between items-center px-4 py-2 border-b border-[#e0e0e0] text-[10px] text-[#666666]">
          <div className="flex items-center gap-1">
            <span>👍❤️</span>
            <span>You and 142 others</span>
          </div>
          <div>21 comments • 7 reposts</div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between px-2 py-1">
          <button className="flex-grow flex items-center justify-center gap-1.5 py-2.5 text-[#666666] font-semibold text-xs rounded hover:bg-black/5 transition duration-150">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span>Like</span>
          </button>
          <button className="flex-grow flex items-center justify-center gap-1.5 py-2.5 text-[#666666] font-semibold text-xs rounded hover:bg-black/5 transition duration-150">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Comment</span>
          </button>
          <button className="flex-grow flex items-center justify-center gap-1.5 py-2.5 text-[#666666] font-semibold text-xs rounded hover:bg-black/5 transition duration-150">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 2.1l4 4-4 4"/>
              <path d="M3 22v-6a4 4 0 0 1 4-4h14"/>
            </svg>
            <span>Repost</span>
          </button>
          <button className="flex-grow flex items-center justify-center gap-1.5 py-2.5 text-[#666666] font-semibold text-xs rounded hover:bg-black/5 transition duration-150">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
