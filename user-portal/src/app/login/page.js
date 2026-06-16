'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Phone, KeyRound, UtensilsCrossed } from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;



export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const response = await axios.post(`${API_BASE}/auth/login`, {
        phone: fullPhone,
        password
      });

      // Save credentials locally
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('role', response.data.data.user.role);
      localStorage.setItem('phone', response.data.data.user.phone);
      localStorage.setItem('uid', response.data.data.user.uid);

      // Routing
      if (response.data.data.user.role === 'merchant') {
        router.push('/merchant');
      } else {
        router.push('/advertiser');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid mobile number or password.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glassmorphism p-8 rounded-[32px] relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-outfit text-2xl font-bold text-white">Welcome Back</h2>
          <p className="text-sm text-slate-400 mt-1">Sign in to manage your account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="tel"
                required
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-semibold">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/10"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500 font-semibold">
          Don&apos;t have an account?{' '}
          <a href="/register" className="text-blue-400 hover:underline">
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
