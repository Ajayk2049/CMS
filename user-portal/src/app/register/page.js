'use client';

import React, { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { Tablet, KeyRound, Phone, ShieldCheck, HelpCircle, UtensilsCrossed } from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

const COUNTRY_CODES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' }
];

export default function RegisterPage() {
  const router = useRouter();

  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('merchant'); // default to merchant
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  
  const [step, setStep] = useState(1); // 1 = Phone & Role, 2 = Verify & Set Password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sessionId, setSessionId] = useState(''); // Exposed in demo/dev mode

  const isInternational = countryCode !== '+91';

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (isInternational) return;

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const fullPhone = `${countryCode}${phone}`;
      const response = await axios.post(`${API_BASE}/auth/send-otp`, { phone: fullPhone });
      
      setInfo('OTP has been sent to your mobile number!');
      if (response.data.data.sessionId) {
        setSessionId(response.data.data.sessionId);
        setInfo(`[DEMO MODE] OTP is 123456 (Session ID: ${response.data.data.sessionId.slice(0,8)})`);
      }
      setStep(2);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to dispatch OTP. Please check the phone number.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fullPhone = `${countryCode}${phone}`;
      const response = await axios.post(`${API_BASE}/auth/register`, {
        phone: fullPhone,
        otp,
        password,
        role
      });

      // Store Auth Details
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('role', response.data.data.user.role);
      localStorage.setItem('phone', response.data.data.user.phone);
      localStorage.setItem('uid', response.data.data.user.uid);

      if (response.data.data.user.role === 'merchant') {
        router.push('/merchant');
      } else {
        router.push('/advertiser');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Check OTP or password rules.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background radial effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glassmorphism p-8 rounded-[32px] relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <h2 className="font-outfit text-2xl font-bold text-white">Create Account</h2>
          <p className="text-sm text-slate-400 mt-1">Start hosting devices or booking ads</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-950/40 border border-blue-900/50 text-blue-400 text-xs font-semibold">
            {info}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Register As</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('merchant')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                    role === 'merchant'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UtensilsCrossed className="w-6 h-6 mb-2" />
                  <span className="text-xs font-bold">Host Merchant</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('advertiser')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                    role === 'advertiser'
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Tablet className="w-6 h-6 mb-2" />
                  <span className="text-xs font-bold">Advertiser</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Mobile Number</label>
              <div className="flex space-x-2">
                <div className="relative">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="appearance-none bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white focus:outline-none focus:border-blue-500 cursor-pointer pr-8"
                  >
                    {COUNTRY_CODES.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.flag} {cc.code}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                </div>

                <div className="relative flex-1">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isInternational}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {isInternational && (
                <div className="mt-3 p-3 rounded-xl bg-orange-950/30 border border-orange-900/50 text-orange-400 text-[11px] font-medium leading-relaxed">
                  ⚠️ International OTP coming soon – please choose Indian number (+91) for now.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || isInternational}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/10"
            >
              {loading ? 'Sending Request...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCompleteRegistration} className="space-y-6">
            <div className="text-center p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs font-semibold text-slate-300">
              Verifying <span className="text-white">{countryCode} {phone}</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Enter 6-Digit OTP</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold text-white tracking-[0.25em] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Set Account Password</label>
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/10"
              >
                {loading ? 'Completing...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-xs text-slate-500 font-semibold">
          Already have an account?{' '}
          <a href="/login" className="text-blue-400 hover:underline">
            Log In
          </a>
        </div>
      </div>
    </div>
  );
}
