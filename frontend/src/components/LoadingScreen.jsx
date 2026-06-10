import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfaf7] font-sans">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 bg-stone-200 rounded-full"></div>
        <div className="text-stone-400 font-semibold text-sm tracking-widest uppercase">Loading LinkFlow...</div>
      </div>
    </div>
  );
}
