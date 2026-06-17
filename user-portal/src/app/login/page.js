'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Mail, Phone, KeyRound, Tv, Sun, Moon, ShieldAlert, Check, Eye, EyeOff } from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

export default function LoginPage() {
  const router = useRouter();

  const [theme, setTheme] = useState('dark');
  const [identifier, setIdentifier] = useState(''); // Email or Mobile Number
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', nextTheme);
  };

  // Identifier (Email/Phone) change handler with validation
  const handleIdentifierChange = (val) => {
    // If it starts looking like a phone number (just digits), apply phone constraints
    if (!val.includes('@') && /^\d+$/.test(val.replace(/[\s-+]/g, ''))) {
      const cleaned = val.replace(/\D/g, '');
      if (cleaned.length > 10) return;
      if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) return;
      setIdentifier(cleaned);
    } else {
      // Allow regular typing for email/generic input
      setIdentifier(val);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loginPayload = { password };
      
      // Determine if identifier is email or phone
      if (identifier.includes('@')) {
        loginPayload.identifier = identifier.trim().toLowerCase();
      } else {
        // Enforce 10-digit check for phone number
        if (identifier.length !== 10) {
          setError('Mobile number must be exactly 10 digits');
          setLoading(false);
          return;
        }
        loginPayload.identifier = `+91${identifier}`;
      }

      const response = await axios.post(`${API_BASE}/auth/login`, loginPayload);

      // Save credentials locally
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('role', response.data.data.user.role);
      localStorage.setItem('phone', response.data.data.user.phone);
      localStorage.setItem('uid', response.data.data.user.uid);

      // Routing based on role
      if (response.data.data.user.role === 'merchant') {
        router.push('/merchant');
      } else if (response.data.data.user.role === 'advertiser') {
        router.push('/advertiser');
      } else {
        setError('Access denied: Unauthorized role');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid email/mobile number or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans transition-colors duration-300">
      {/* Background radial effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shadow-md"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
        </button>
      </div>

      {/* Main Grid Wrapper */}
      <div className="w-full max-w-5xl grid md:grid-cols-12 gap-8 items-center relative z-10 animate-fade-in">
        
        {/* Left Column - Transparent Info Panel ("Free Layout") */}
        <div className="md:col-span-5 space-y-6 text-foreground p-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              DigiAds Portal
            </span>
            <h2 className="font-outfit text-3xl font-extrabold tracking-tight mt-4 text-foreground">
              Sign In to Your Workspace
            </h2>
            <p className="text-muted-foreground text-xs font-semibold mt-2 leading-relaxed">
              Access your personalized dashboard to manage kiosks, tabletop menu displays, live orders, or launch high-ROI display campaigns.
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-3">
            <h4 className="font-outfit text-xs font-extrabold uppercase tracking-wider text-foreground">Portal Features</h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
              <li className="flex items-start">
                <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                <span>Hosts: Monitor live tabletop ordering devices and daily payouts.</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                <span>Advertisers: Track campaign impressions, clicks, and QR telemetry.</span>
              </li>
              <li className="flex items-start">
                <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                <span>Security: Session tokens are fully encrypted and verified.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 text-[10px] text-muted-foreground font-bold flex items-center justify-between border-t border-border mt-6">
            <span>Powered by Aibot Ink</span>
          </div>
        </div>

        {/* Right Column - Centered Bordered Form Card */}
        <div className="md:col-span-7 flex justify-center">
          <div className="w-full max-w-md glassmorphism p-6 rounded-[32px] relative z-10 shadow-2xl bg-card/30 backdrop-blur-md border-border">
            
            {/* Logo and Brand - Compact Side-by-Side Layout */}
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <Tv className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h2 className="font-outfit text-lg font-bold tracking-tight">
                  Digi<span className="text-primary">Ads</span> Console
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                  Sign in with email or mobile credentials
                </p>
              </div>
            </div>

            {/* Notification messages */}
            {error && (
              <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              
              {/* Email or Mobile Input */}
              <div>
                <div className="relative">
                  {identifier.includes('@') ? (
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  )}
                  <input
                    type="text"
                    required
                    placeholder="Email or Mobile Number"
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-11 pr-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Account Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-11 pr-10 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-lg glow-hover cursor-pointer mt-4 flex items-center justify-center space-x-2"
              >
                <span>{loading ? 'Logging In...' : 'Log In to Account'}</span>
              </button>
            </form>

            <div className="text-center text-xs text-muted-foreground mt-6 font-semibold">
              Don&apos;t have an account?{' '}
              <a href="/register" className="text-primary hover:underline transition-all">
                Register
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
