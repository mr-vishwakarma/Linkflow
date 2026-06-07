import React, { useState } from 'react';
import { Briefcase, Lock, Mail, RefreshCw } from 'lucide-react';

export default function Signup({ onTogglePage, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password !== confirmPassword) {
      return showToast('Passwords do not match.', 'error');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (data.success) {
        showToast('Registration successful! You can now sign in.', 'success');
        onTogglePage('login');
      } else {
        showToast(data.message || 'Signup failed. Please try again.', 'error');
      }
    } catch (err) {
      showToast('Network error during registration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-stone-900 flex flex-col items-center justify-center p-4">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-200/20 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-8 shadow-sm backdrop-blur-md relative z-10">
        
        {/* Branding Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 text-stone-900 bg-stone-100 p-3 rounded-2xl border border-stone-200 flex items-center justify-center mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900">Create Account</h2>
          <p className="text-xs text-stone-500 mt-1">Get started with automated post scheduling</p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 text-stone-400 w-4 h-4" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#fbfaf7] border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-stone-400 w-4 h-4" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#fbfaf7] border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Confirm Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-stone-400 w-4 h-4" />
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-[#fbfaf7] border border-stone-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition duration-150"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition duration-150 disabled:opacity-50 mt-2 shadow-sm"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Sign Up</span>
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center mt-6 text-xs text-stone-500 border-t border-stone-100 pt-4">
          Already have an account?{' '}
          <button 
            onClick={() => onTogglePage('login')}
            className="font-bold text-stone-900 hover:underline cursor-pointer"
          >
            Sign In
          </button>
        </div>

      </div>
    </div>
  );
}
