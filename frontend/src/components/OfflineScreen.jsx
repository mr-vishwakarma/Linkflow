import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function OfflineScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fbfaf7] font-sans p-4 text-center">
      <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
      <h2 className="text-xl font-bold text-stone-900 mb-2">Connection Lost</h2>
      <p className="text-sm text-stone-600 mb-6 max-w-sm">
        It looks like you're offline. Please check your internet connection and try again.
      </p>
      <button 
        onClick={() => window.location.reload()} 
        className="px-6 py-2 bg-stone-900 text-white rounded-full font-semibold hover:bg-stone-800 transition cursor-pointer"
      >
        Retry
      </button>
    </div>
  );
}
