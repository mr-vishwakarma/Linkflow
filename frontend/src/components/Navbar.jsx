import React from 'react';
import { Briefcase, RotateCw, Settings, LogOut } from 'lucide-react';

export default function Navbar({ connectionStatus, isSyncing, onSync, onOpenSettings, onLogout, userEmail }) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-center pb-6 border-b border-stone-200 mb-8 gap-4">
      {/* Branding Logo */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 text-stone-900 bg-stone-100 p-2.5 rounded-xl border border-stone-200 flex items-center justify-center">
          <Briefcase className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">LinkFlow</h1>
          <p className="text-[10px] font-medium text-stone-500 tracking-widest uppercase">Content Pipeline Engine</p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
        {userEmail && (
          <span className="text-[10px] text-stone-500 font-semibold bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
            {userEmail}
          </span>
        )}

        <button 
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition duration-150 disabled:opacity-50 cursor-pointer"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Notion Sync</span>
        </button>

        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
          connectionStatus.status === 'connected' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' : 
          connectionStatus.status === 'disconnected' ? 'bg-rose-500/5 text-rose-600 border-rose-500/20' : 
          'bg-amber-500/5 text-amber-600 border-amber-500/20'
        }`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
          <span>{connectionStatus.text}</span>
        </div>

        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>

        <button 
          onClick={onLogout}
          title="Sign out of LinkFlow"
          className="w-8 h-8 rounded-full flex items-center justify-center border border-stone-200 bg-white hover:bg-rose-50 text-stone-600 hover:text-rose-600 transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
