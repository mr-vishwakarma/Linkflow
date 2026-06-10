import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  PlusCircle, 
  List, 
  Calendar as CalendarIcon, 
  Eye, 
  TrendingUp 
} from 'lucide-react';

// Restructured modular components
import Navbar from './components/Navbar';
import ComposerForm from './features/composer/components/ComposerForm';
import PostQueue from './features/queue/components/PostQueue';
import LinkedInPreview from './features/preview/components/LinkedInPreview';
import SettingsModal from './features/settings/components/SettingsModal';
import Login from './features/auth/components/Login';
import Signup from './features/auth/components/Signup';
import AnalyticsDashboard from './features/analytics/components/AnalyticsDashboard';
import ContentCalendar from './features/calendar/components/ContentCalendar';
import LoadingScreen from './components/LoadingScreen';
import OfflineScreen from './components/OfflineScreen';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

let activeRefreshPromise = null;

const refreshSessionToken = async (storedRefreshToken) => {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      });
      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Initial auto-login check failed:', err);
      return { success: false, error: err.message };
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
};

export default function App() {
  // Authentication states
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || null);
  const [authPage, setAuthPage] = useState('login');
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Config & list states
  const [config, setConfig] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activeTab, setActiveTab] = useState('queue');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ status: 'unconfigured', text: 'Checking status...' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Network offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Responsive window width resize trigger
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setActiveTab(prev => prev === 'compose' ? 'queue' : prev);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compose state (autosaved to localStorage)
  const [caption, setCaption] = useState(localStorage.getItem('linkflow_draft_caption') || '');
  const [mediaFiles, setMediaFiles] = useState(() => {
    const saved = localStorage.getItem('linkflow_draft_mediaFiles');
    try { return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
  });
  const [githubLink, setGithubLink] = useState(localStorage.getItem('linkflow_draft_githubLink') || '');
  const [liveLink, setLiveLink] = useState(localStorage.getItem('linkflow_draft_liveLink') || '');
  const [scheduleTime, setScheduleTime] = useState(localStorage.getItem('linkflow_draft_scheduleTime') || '');

  // Syncing states
  const [isSyncing, setIsSyncing] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, postId: null });

  // Setup default schedule date (+1 hour) if none restored from localStorage
  useEffect(() => {
    if (!scheduleTime) {
      const defaultDate = new Date();
      defaultDate.setHours(defaultDate.getHours() + 1);
      const year = defaultDate.getFullYear();
      const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
      const day = String(defaultDate.getDate()).padStart(2, '0');
      const hours = String(defaultDate.getHours()).padStart(2, '0');
      const minutes = String(defaultDate.getMinutes()).padStart(2, '0');
      const nextHourTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      setScheduleTime(nextHourTime);
      localStorage.setItem('linkflow_draft_scheduleTime', nextHourTime);
    }
  }, [scheduleTime]);

  // Sync changes to localStorage
  useEffect(() => {
    localStorage.setItem('linkflow_draft_caption', caption);
  }, [caption]);

  useEffect(() => {
    localStorage.setItem('linkflow_draft_mediaFiles', JSON.stringify(mediaFiles));
  }, [mediaFiles]);

  useEffect(() => {
    localStorage.setItem('linkflow_draft_githubLink', githubLink);
  }, [githubLink]);

  useEffect(() => {
    localStorage.setItem('linkflow_draft_liveLink', liveLink);
  }, [liveLink]);

  useEffect(() => {
    if (scheduleTime) {
      localStorage.setItem('linkflow_draft_scheduleTime', scheduleTime);
    }
  }, [scheduleTime]);

  // Handle silent token refresh on app boot
  useEffect(() => {
    let active = true;
    const checkAuth = async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedEmail = localStorage.getItem('userEmail');
      
      if (storedRefreshToken && storedEmail) {
        try {
          const data = await refreshSessionToken(storedRefreshToken);
          if (!active) return;
          if (data.success) {
            setToken(data.accessToken);
            localStorage.setItem('token', data.accessToken);
            
            // Save the NEW rotated refresh token (server invalidated the old one)
            const newRefresh = data.refreshToken || storedRefreshToken;
            setRefreshToken(newRefresh);
            localStorage.setItem('refreshToken', newRefresh);
            
            setUserEmail(storedEmail);
          } else {
            handleLogoutSilently();
          }
        } catch (err) {
          console.error('Initial auto-login check failed:', err);
          if (active) handleLogoutSilently();
        }
      }
      if (active) setIsAuthChecking(false);
    };
    checkAuth();
    return () => {
      active = false;
    };
  }, []);

  // Fetch configs and queue list when authenticated
  useEffect(() => {
    if (!token) return;

    loadConfig();
    loadPosts();

    // Auto-sync Notion silently in the background on dashboard mount/login
    const autoSyncNotion = async () => {
      try {
        await apiFetch('/api/sync', { method: 'POST' });
        loadPosts();
      } catch (err) {
        console.error('Silent auto Notion sync failed:', err);
      }
    };
    autoSyncNotion();

    // Reload posts every 12 seconds
    const interval = setInterval(loadPosts, 12000);
    return () => clearInterval(interval);
  }, [token]);

  const showToast = (message, type = 'info') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else if (type === 'warning') toast.warning(message);
    else toast.info(message);
  };

  // Custom authenticated fetch wrapper with silent refresh and automatic retries
  const apiFetch = async (url, options = {}) => {
    if (!navigator.onLine) {
      setIsOffline(true);
      throw new Error('No internet connection');
    }

    if (!options.headers) {
      options.headers = {};
    }
    const currentToken = token || localStorage.getItem('token');
    if (currentToken) {
      options.headers['Authorization'] = `Bearer ${currentToken}`;
    }
    
    try {
      let res = await fetch(url, options);

      if (res.status === 429) {
        showToast('Too many requests. Please slow down.', 'warning');
      } else if (res.status >= 500) {
        showToast('Server encountered an error. Please try again later.', 'error');
      }
      
      if (res.status === 401) {
        const clone = res.clone();
        try {
          const data = await clone.json();
          if (data.code === 'TOKEN_EXPIRED') {
            const storedRefreshToken = localStorage.getItem('refreshToken') || refreshToken;
            if (storedRefreshToken) {
              const refreshData = await refreshSessionToken(storedRefreshToken);
              if (refreshData.success) {
                const newToken = refreshData.accessToken;
                setToken(newToken);
                localStorage.setItem('token', newToken);

                if (refreshData.refreshToken) {
                  setRefreshToken(refreshData.refreshToken);
                  localStorage.setItem('refreshToken', refreshData.refreshToken);
                }
                
                options.headers['Authorization'] = `Bearer ${newToken}`;
                res = await fetch(url, options);
              } else {
                handleLogoutSilently();
              }
            } else {
              handleLogoutSilently();
            }
          } else {
            handleLogoutSilently();
          }
        } catch (err) {
          handleLogoutSilently();
        }
      }
      return res;
    } catch (err) {
      if (!navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setIsOffline(true);
      } else {
        showToast(`Network request failed: ${err.message}`, 'error');
      }
      throw err;
    }
  };

  const handleLoginSuccess = (authData) => {
    setToken(authData.accessToken);
    setRefreshToken(authData.refreshToken);
    setUserEmail(authData.email);
    localStorage.setItem('token', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('userEmail', authData.email);
    showToast('Welcome back!', 'success');
  };

  const handleLogoutSilently = () => {
    setToken(null);
    setRefreshToken(null);
    setUserEmail(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userEmail');
  };

  const handleLogout = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken') || refreshToken;
    if (storedRefreshToken) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken })
        });
      } catch (err) {
        console.error('Error logging out from server:', err);
      }
    }
    handleLogoutSilently();
    showToast('Logged out successfully', 'info');
  };

  const loadConfig = async () => {
    if (!navigator.onLine) return;
    try {
      const res = await apiFetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        updateConnectionBadge(data.config);
      }
    } catch (err) {
      showToast('Error loading configuration credentials', 'error');
    }
  };

  const loadPosts = async () => {
    if (!navigator.onLine) return;
    try {
      const res = await apiFetch('/api/posts');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };

  const updateConnectionBadge = async (conf) => {
    if (!conf.hasLinkedinToken || !conf.linkedinUrn || !conf.hasNotionToken || !conf.notionDatabaseId) {
      setConnectionStatus({ status: 'unconfigured', text: 'Credentials Pending' });
      return;
    }

    setConnectionStatus({ status: 'unconfigured', text: 'Credentials Configured' });
    
    try {
      const testRes = await apiFetch('/api/config/test-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const testData = await testRes.json();
      if (testData.success) {
        setConnectionStatus({ status: 'connected', text: `Connected: ${testData.profile.firstName}` });
      } else {
        setConnectionStatus({ status: 'disconnected', text: 'Connection failed' });
      }
    } catch (err) {
      setConnectionStatus({ status: 'disconnected', text: 'Network Offline' });
    }
  };

  const handleSaveConfig = async (newConfig) => {
    try {
      const res = await apiFetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        showToast('API credentials saved successfully!', 'success');
        setIsSettingsOpen(false);
        updateConnectionBadge(data.config);
      } else {
        showToast(data.message || 'Failed to save settings', 'error');
      }
    } catch (err) {
      showToast('Error saving settings config', 'error');
    }
  };

  const handleSyncNotion = async () => {
    setIsSyncing(true);
    showToast('Starting synchronization with Notion database...', 'info');
    try {
      const res = await apiFetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        loadPosts();
      } else {
        showToast(data.message || 'Synchronization failed', 'error');
      }
    } catch (err) {
      showToast(`Network error: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!caption || !scheduleTime) return;

    try {
      const res = await apiFetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: caption,
          media: mediaFiles,
          githubLink: githubLink,
          liveLink: liveLink,
          time: scheduleTime
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Local draft added to queue', 'success');
        setCaption('');
        setMediaFiles([]);
        setGithubLink('');
        setLiveLink('');
        localStorage.removeItem('linkflow_draft_caption');
        localStorage.removeItem('linkflow_draft_mediaFiles');
        localStorage.removeItem('linkflow_draft_githubLink');
        localStorage.removeItem('linkflow_draft_liveLink');
        localStorage.removeItem('linkflow_draft_scheduleTime');
        
        // Reset schedule date
        const defaultDate = new Date();
        defaultDate.setHours(defaultDate.getHours() + 1);
        const year = defaultDate.getFullYear();
        const month = String(defaultDate.getMonth() + 1).padStart(2, '0');
        const day = String(defaultDate.getDate()).padStart(2, '0');
        const hours = String(defaultDate.getHours()).padStart(2, '0');
        const minutes = String(defaultDate.getMinutes()).padStart(2, '0');
        const nextHourTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        setScheduleTime(nextHourTime);
        localStorage.setItem('linkflow_draft_scheduleTime', nextHourTime);

        loadPosts();
      } else {
        showToast(data.message || 'Failed to create post', 'error');
      }
    } catch (err) {
      showToast('Error connecting to draft queue', 'error');
    }
  };

  const handleForcePublish = async (id, e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    showToast('Initiating immediate LinkedIn publish...', 'info');

    try {
      const res = await apiFetch(`/api/posts/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Published successfully to LinkedIn!', 'success');
        loadPosts();
      } else {
        showToast(data.message || 'Immediate publish failed', 'error');
        loadPosts();
      }
    } catch (err) {
      showToast('Error requesting publish command', 'error');
      btn.disabled = false;
    }
  };

  const handleDeletePost = (id) => {
    setDeleteConfirmation({ isOpen: true, postId: id });
  };

  const handleConfirmDelete = async () => {
    const id = deleteConfirmation.postId;
    setDeleteConfirmation({ isOpen: false, postId: null });
    try {
      const res = await apiFetch(`/api/posts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Post removed successfully', 'info');
        loadPosts();
      } else {
        showToast('Failed to delete post', 'error');
      }
    } catch (err) {
      showToast('Network error deleting post', 'error');
    }
  };

  const formatLocalDateTime = (dateTimeStr) => {
    const dateObj = new Date(dateTimeStr);
    if (isNaN(dateObj.getTime())) return dateTimeStr;
    return dateObj.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Render initial loading screen during auth checking
  if (isAuthChecking) {
    return <LoadingScreen />;
  }

  if (isOffline) {
    return <OfflineScreen />;
  }

  // Render Auth screens if not logged in
  if (!token) {
    if (authPage === 'signup') {
      return (
        <Signup 
          onTogglePage={setAuthPage} 
          showToast={showToast} 
        />
      );
    }
    return (
      <Login 
        onLoginSuccess={handleLoginSuccess} 
        onTogglePage={setAuthPage} 
        showToast={showToast} 
      />
    );
  }

  // Render full dashboard if authenticated
  return (
    <div className="bg-[#fbfaf7] text-stone-900 min-h-screen relative overflow-x-hidden font-sans pb-24 lg:pb-12 selection:bg-stone-200 selection:text-stone-800">
      
      {/* Background Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-200/20 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-0 w-[500px] h-[500px] bg-orange-200/10 rounded-full filter blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        
        {/* Navigation shared bar */}
        <Navbar 
          connectionStatus={connectionStatus}
          isSyncing={isSyncing}
          onSync={handleSyncNotion}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={handleLogout}
          userEmail={userEmail}
        />

        {/* Dashboard grid panel */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Compose Draft form (Visible persistently on desktop, only when activeTab === 'compose' on mobile) */}
          {(!isMobile || activeTab === 'compose') && (
            <section className="lg:col-span-5 w-full">
              <ComposerForm 
                caption={caption}
                setCaption={setCaption}
                mediaFiles={mediaFiles}
                setMediaFiles={setMediaFiles}
                githubLink={githubLink}
                setGithubLink={setGithubLink}
                liveLink={liveLink}
                setLiveLink={setLiveLink}
                scheduleTime={scheduleTime}
                setScheduleTime={setScheduleTime}
                onSubmit={handleCreatePost}
                apiFetch={apiFetch}
                showToast={showToast}
                setActiveTab={setActiveTab}
              />
            </section>
          )}

          {/* Right panel: Switchable view tabs (Visible persistently on desktop, hidden on mobile if activeTab === 'compose') */}
          {(!isMobile || activeTab !== 'compose') && (
            <section className="lg:col-span-7 w-full flex flex-col">
              
              {/* View navigation buttons */}
              <div className="hidden lg:flex gap-2 mb-4 border-b border-stone-200 pb-2">
              <button 
                onClick={() => setActiveTab('queue')}
                className={`px-4 py-2 text-sm font-semibold transition relative cursor-pointer ${
                  activeTab === 'queue' 
                    ? 'text-stone-900 border-b-2 border-stone-900' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                Sync Post Queue
              </button>
              <button 
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 text-sm font-semibold transition relative cursor-pointer ${
                  activeTab === 'preview' 
                    ? 'text-stone-900 border-b-2 border-stone-900' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                Feed Simulator
              </button>
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-sm font-semibold transition relative cursor-pointer ${
                  activeTab === 'analytics' 
                    ? 'text-stone-900 border-b-2 border-stone-900' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                Analytics
              </button>
              <button 
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 text-sm font-semibold transition relative cursor-pointer ${
                  activeTab === 'calendar' 
                    ? 'text-stone-900 border-b-2 border-stone-900' 
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                Content Calendar
              </button>
            </div>

            {/* View mapping */}
            {activeTab === 'queue' && (
              <PostQueue 
                posts={posts}
                activeFilter={activeFilter}
                setActiveFilter={setActiveFilter}
                onDelete={handleDeletePost}
                onForcePublish={handleForcePublish}
                formatLocalDateTime={formatLocalDateTime}
              />
            )}
            {activeTab === 'preview' && (
              <LinkedInPreview 
                text={caption} 
                mediaFiles={mediaFiles} 
                authorName={connectionStatus.status === 'connected' ? connectionStatus.text.replace('Connected: ', '') : ''} 
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsDashboard 
                posts={posts}
              />
            )}
            {activeTab === 'calendar' && (
              <ContentCalendar 
                posts={posts}
                apiFetch={apiFetch}
                onRefresh={loadPosts}
                showToast={showToast}
                formatLocalDateTime={formatLocalDateTime}
              />
            )}

          </section>
        )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/85 backdrop-blur-md border-t border-stone-200/80 z-40 py-3 px-6 flex justify-around items-center shadow-2xl animate-slide-up">
          {[
            { id: 'compose', label: 'Compose', icon: PlusCircle },
            { id: 'queue', label: 'Queue', icon: List },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
            { id: 'preview', label: 'Simulator', icon: Eye },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1.5 transition duration-150 relative cursor-pointer ${
                  isActive ? 'text-stone-900 scale-105 font-semibold' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                <span className="text-[9px] uppercase tracking-wider font-semibold leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Settings configuration modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        showToast={showToast}
        apiFetch={apiFetch}
      />
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, postId: null })}
        onConfirm={handleConfirmDelete}
      />

      {/* Global notifications overlay */}
      <ToastContainer 
        position="bottom-right" 
        autoClose={3800} 
        hideProgressBar={false} 
        newestOnTop={true} 
        closeOnClick 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="light" 
        toastClassName="font-sans text-sm rounded-xl shadow-lg border border-stone-200"
      />

    </div>
  );
}
