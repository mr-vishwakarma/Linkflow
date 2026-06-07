import React, { useState, useEffect } from 'react';
import { Settings, Lock, User, RefreshCw, Database } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, config, onSave, showToast, apiFetch }) {
  const [notionToken, setNotionToken] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');

  const [testingLinkedin, setTestingLinkedin] = useState(false);
  const [testingNotion, setTestingNotion] = useState(false);
  const [linkedinFeedback, setLinkedinFeedback] = useState(null);
  const [notionFeedback, setNotionFeedback] = useState(null);

  useEffect(() => {
    if (config) {
      setNotionDatabaseId(config.notionDatabaseId || '');
      setNotionToken('');
      setNotionFeedback(null);
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSave({
      notionDatabaseId,
      notionToken: notionToken ? notionToken : undefined
    });
  };

  // LinkedIn OAuth flow handles testing automatically now

  const testNotion = async () => {
    setTestingNotion(true);
    setNotionFeedback(null);
    try {
      const response = await apiFetch('/api/config/test-notion', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: notionToken || undefined,
          databaseId: notionDatabaseId
        })
      });
      const data = await response.json();
      if (data.success) {
        setNotionFeedback({
          success: true,
          message: `Success: Found database "${data.database.title}"`
        });
        showToast('Notion database resolved!', 'success');
      } else {
        setNotionFeedback({
          success: false,
          message: data.message || 'Notion connection failed'
        });
      }
    } catch (err) {
      setNotionFeedback({ success: false, message: `Network error: ${err.message}` });
    } finally {
      setTestingNotion(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh] custom-scrollbar text-stone-900">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Settings className="text-stone-700 w-5 h-5" />
            <h2 className="text-base font-bold text-stone-900">API Connection Credentials</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-2xl text-stone-400 hover:text-stone-600 transition leading-none select-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Modal Fields */}
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: LinkedIn */}
            <div className="flex flex-col gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">LinkedIn Developer API</h3>
              
              <div className="flex flex-col gap-3 py-4 text-center items-center justify-center h-full">
                {config?.hasLinkedinToken ? (
                  <>
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                      <User className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900">Connected to LinkedIn</h4>
                    <p className="text-xs text-stone-500 font-mono bg-stone-100 px-2 py-1 rounded border border-stone-200">{config.linkedinUrn}</p>

                    {/* Token expiry badge */}
                    {config.linkedinTokenDaysLeft !== null && config.linkedinTokenDaysLeft !== undefined && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold mt-1 ${
                        config.linkedinTokenDaysLeft <= 7
                          ? 'bg-rose-50 text-rose-600 border border-rose-200'
                          : config.linkedinTokenDaysLeft <= 14
                          ? 'bg-amber-50 text-amber-600 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}>
                        {config.linkedinTokenDaysLeft <= 7 ? '⚠️' : '🔑'}
                        {config.linkedinTokenDaysLeft === 0
                          ? 'Token expired — please reconnect!'
                          : `Token expires in ${config.linkedinTokenDaysLeft} day${config.linkedinTokenDaysLeft === 1 ? '' : 's'}`}
                      </div>
                    )}

                    <a 
                      href="http://localhost:5000/api/auth/linkedin"
                      className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition duration-150 cursor-pointer inline-block"
                    >
                      Reconnect Account
                    </a>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2">
                      <Lock className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="text-sm font-bold text-stone-900">Not Connected</h4>
                    <p className="text-xs text-stone-500 mb-4 px-2">Authorize this app to post on your behalf automatically.</p>
                    <a 
                      href="http://localhost:5000/api/auth/linkedin"
                      className="w-full text-center py-2.5 rounded-lg text-xs font-bold bg-[#0a66c2] hover:bg-[#004182] text-white transition duration-200 shadow-sm cursor-pointer block"
                    >
                      Sign In with LinkedIn
                    </a>
                  </>
                )}
              </div>
            </div>


            {/* Right: Notion */}
            <div className="flex flex-col gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">Notion Integration API</h3>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Internal Integration Token</label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-stone-400 w-4 h-4" />
                  <input 
                    type="password" 
                    value={notionToken}
                    onChange={(e) => setNotionToken(e.target.value)}
                    placeholder={config?.hasNotionToken ? `${config.notionTokenMasked} (Saved)` : 'Paste Notion secret key...'}
                    className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Notion Database ID</label>
                <div className="relative flex items-center">
                  <Database className="absolute left-3.5 text-stone-400 w-4 h-4" />
                  <input 
                    type="text" 
                    value={notionDatabaseId}
                    onChange={(e) => setNotionDatabaseId(e.target.value)}
                    placeholder="Enter Notion Database ID..."
                    required
                    className="w-full bg-white border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150"
                  />
                </div>
              </div>

              <button 
                type="button" 
                onClick={testNotion}
                disabled={testingNotion}
                className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition duration-150 cursor-pointer"
              >
                {testingNotion ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                <span>Test Notion</span>
              </button>

              {notionFeedback && (
                <div className={`text-[10px] p-2.5 rounded-lg border ${notionFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                  {notionFeedback.message}
                </div>
              )}
            </div>

          </div>

          {/* Controls */}
          <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-xs font-bold border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-full text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition duration-200 shadow-sm cursor-pointer"
            >
              Save Connections
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
