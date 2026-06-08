import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  RotateCw, 
  Settings, 
  LogOut, 
  User, 
  ChevronDown,
  Database,
  Link
} from 'lucide-react';

export default function Navbar({ 
  connectionStatus, 
  isSyncing, 
  onSync, 
  onOpenSettings, 
  onLogout, 
  userEmail 
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Setup click-away listener to dismiss the menu
  useEffect(() => {
    if (!isMenuOpen) return;
    const clickAway = () => setIsMenuOpen(false);
    document.addEventListener('click', clickAway);
    return () => document.removeEventListener('click', clickAway);
  }, [isMenuOpen]);

  const toggleMenu = (e) => {
    e.stopPropagation(); // Prevent immediate click-away trigger
    setIsMenuOpen(!isMenuOpen);
  };

  const userInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <header className="flex justify-between items-center pb-6 border-b border-stone-200/80 mb-8 relative z-50">
      
      {/* Branding */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-stone-100 p-1.5 rounded-xl border border-stone-200 flex items-center justify-center shadow-sm">
          <img src="/assets/logo.png" alt="LinkFlow Logo" className="w-full h-full object-contain" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-stone-900 leading-none">LinkFlow</h1>
          <p className="text-[9px] font-bold text-stone-400 tracking-widest uppercase mt-1">Content Pipeline</p>
        </div>
      </div>

      {/* User Actions Profile Dropdown */}
      <div className="relative">
        <button 
          onClick={toggleMenu}
          className="flex items-center gap-2 p-1.5 rounded-full hover:bg-stone-100 border border-transparent hover:border-stone-200/80 transition duration-150 cursor-pointer"
        >
          {/* Avatar circle */}
          <div className="w-8 h-8 rounded-full bg-stone-950 text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {userInitial}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-stone-500 shrink-0 pr-0.5" />
        </button>

        {/* Dropdown Menu Card */}
        {isMenuOpen && (
          <div 
            onClick={(e) => e.stopPropagation()} // Keep open on clicks inside dropdown
            className="absolute right-0 mt-2.5 w-64 bg-white border border-stone-200 rounded-2xl shadow-xl p-4 flex flex-col gap-3.5 animate-dropdown z-50"
          >
            {/* User Session Info Header */}
            <div className="flex flex-col gap-0.5 border-b border-stone-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Active Account</span>
              <span className="text-xs font-semibold text-stone-800 truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>

            {/* Connection/Integration Badges */}
            <div className="flex flex-col gap-2 bg-stone-50/50 p-2.5 rounded-xl border border-stone-100 text-[10px] font-semibold text-stone-600">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <Link className="w-3 h-3 text-stone-400" /> LinkedIn
                </span>
                <span className={`px-2 py-0.5 rounded-full font-bold border ${
                  connectionStatus.status === 'connected' 
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' 
                    : 'bg-amber-500/10 text-amber-700 border-amber-500/20'
                }`}>
                  {connectionStatus.status === 'connected' ? 'Connected' : 'Offline'}
                </span>
              </div>

              {/* Display descriptive name/status */}
              <div className="text-[9px] text-stone-400 truncate mt-0.5 font-medium pl-4">
                {connectionStatus.text}
              </div>
            </div>

            {/* Actions Menu */}
            <div className="flex flex-col gap-1 border-t border-stone-100 pt-3">
              
              {/* Notion Sync Button */}
              <button 
                onClick={(e) => {
                  onSync();
                  setIsMenuOpen(false);
                }}
                disabled={isSyncing}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition text-left cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 text-stone-500 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Notion Database Sync</span>
              </button>

              {/* Settings Configuration Modal trigger */}
              <button 
                onClick={() => {
                  onOpenSettings();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition text-left cursor-pointer"
              >
                <Settings className="w-4 h-4 text-stone-500" />
                <span>API Settings</span>
              </button>

              {/* Log Out option */}
              <button 
                onClick={() => {
                  onLogout();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition text-left cursor-pointer border-t border-stone-100/60 mt-1 pt-2"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
              
            </div>

          </div>
        )}
      </div>

    </header>
  );
}
