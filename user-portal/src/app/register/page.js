'use client';

import React, { useState, useEffect, Suspense } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Tablet,
  KeyRound,
  Phone,
  ShieldCheck,
  UtensilsCrossed,
  Tv,
  Sun,
  Moon,
  Mail,
  Check,
  X,
  ArrowRight,
  ShieldAlert,
  Eye,
  EyeOff
} from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role'); // 'merchant' or 'advertiser'

  const [theme, setTheme] = useState('dark');
  const countryCode = '+91';
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('merchant');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration Flow Statuses
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(null); // null, true, false
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Lock role from URL parameter
  useEffect(() => {
    if (roleParam === 'merchant' || roleParam === 'advertiser') {
      setRole(roleParam);
    }
  }, [roleParam]);

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

  // Auto-verify OTP when reaching 6 digits
  useEffect(() => {
    if (otp.length === 6 && otpSent) {
      autoVerifyOtp();
    } else {
      setOtpVerified(null);
    }
  }, [otp]);

  const autoVerifyOtp = async () => {
    setOtpVerifying(true);
    setOtpVerified(null);
    setError('');
    try {
      const fullPhone = `${countryCode}${phone}`;
      await axios.post(`${API_BASE}/auth/verify-otp`, {
        phone: fullPhone,
        otp
      });
      setOtpVerified(true);
      showNotification('info', 'OTP verified successfully');
    } catch (err) {
      setOtpVerified(false);
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 10) return;
    if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) return;
    setPhone(cleaned);
  };

  const showNotification = (type, msg) => {
    if (type === 'error') setError(msg);
    else setInfo(msg);
    setTimeout(() => {
      setError('');
      setInfo('');
    }, 5000);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      showNotification('error', 'Email is required');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const fullPhone = `${countryCode}${phone}`;
      const response = await axios.post(`${API_BASE}/auth/send-otp`, { phone: fullPhone });

      setOtpSent(true);
      setInfo('OTP has been sent to your mobile number!');
      if (response.data.data.sessionId) {
        setSessionId(response.data.data.sessionId);
        setInfo(`[DEMO MODE] OTP is 123456 (Session ID: ${response.data.data.sessionId.slice(0, 8)})`);
      }
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

    if (!otpSent) {
      setError('Please send and verify OTP first');
      return;
    }

    // Password Complexity Validation
    if (password.length < 8 || password.length > 12) {
      setError('Password must be 8-12 characters long');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain a mix of alphabets and numbers');
      return;
    }

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

  const isMerchant = role === 'merchant';
  const displayRoleTitle = isMerchant ? 'Host Merchant' : 'Advertiser';

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
              {displayRoleTitle} Account
            </span>
            <h2 className="font-outfit text-3xl font-extrabold tracking-tight mt-4 text-foreground">
              {isMerchant ? 'Earn with DigiAds' : 'Grow with DigiAds'}
            </h2>
            <p className="text-muted-foreground text-xs font-semibold mt-2 leading-relaxed">
              {isMerchant
                ? 'Join our network of premium restaurants hosting smart tabletop ordering kiosks.'
                : 'Launch high-ROI campaigns directly onto tablets at customer dining tables.'
              }
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-3">
            <h4 className="font-outfit text-xs font-extrabold uppercase tracking-wider text-foreground">Key Benefits</h4>
            <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
              {isMerchant ? (
                <>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Host screens & tablets to collect device rental payouts.</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Receive live table orders in real-time via WebSockets.</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Process all customer checkout payments via PhonePe.</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Book campaigns targeted state → city → outlet level.</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Track impressions, interactive clicks, and QR scans live.</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                    <span>Highly visual full-screen loop layouts to engage diners.</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Instructions and suggestions */}
          <div className="border-t border-border pt-6 space-y-4">
            <div>
              <h4 className="font-outfit text-xs font-extrabold uppercase tracking-wider text-foreground mb-2">Instructions</h4>
              <ul className="list-decimal list-inside text-[11px] text-muted-foreground space-y-1.5 font-semibold">
                <li>Enter your email & mobile number</li>
                <li>Click "Send OTP" to receive verification</li>
                <li>Enter the code to auto-verify</li>
                <li>Set a password and register</li>
              </ul>
            </div>


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
                  Digi<span className="text-primary">Ads</span> {isMerchant ? 'Host Portal' : 'Advertiser Portal'}
                </h2>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                  Setup your account credentials
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

            {info && (
              <div className="mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                {info}
              </div>
            )}

            {/* Input Form */}
            <div className="space-y-4">

              {/* Dynamic selector ONLY shown if role is NOT locked in URL */}
              {!(roleParam === 'merchant' || roleParam === 'advertiser') && (
                <div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setRole('merchant')}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl border transition-all cursor-pointer ${role === 'merchant'
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <UtensilsCrossed className="w-4 h-4" />
                      <span className="text-xs">Merchant Host</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('advertiser')}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl border transition-all cursor-pointer ${role === 'advertiser'
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <Tablet className="w-4 h-4" />
                      <span className="text-xs">Advertiser</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-11 pr-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Mobile Number & Send OTP */}
              <div>
                <div className="flex space-x-2">
                  <div className="bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground flex items-center shrink-0 shadow-sm">
                    🇮🇳 +91
                  </div>

                  <div className="relative flex-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="tel"
                      required
                      placeholder="Mobile Number"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl pl-11 pr-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>

                  <button
                    onClick={handleSendOtp}
                    type="button"
                    disabled={loading || !phone || !email}
                    className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-xs font-bold px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                  >
                    Send OTP
                  </button>
                </div>
              </div>

              {/* OTP Verification Input (Greyed out until sent) */}
              <div>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    disabled={!otpSent}
                    placeholder="6-Digit Verification OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-background border border-input disabled:bg-muted/30 disabled:text-muted-foreground disabled:cursor-not-allowed rounded-xl pl-11 pr-10 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all tracking-[0.1em]"
                  />
                  {otpVerifying && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-t-primary border-r-transparent rounded-full animate-spin" />
                  )}
                  {otpVerified === true && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 font-bold" />
                  )}
                  {otpVerified === false && (
                    <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive font-bold" />
                  )}
                </div>
                {otpVerified === true && (
                  <p className="mt-1 text-[10px] text-emerald-500 font-bold">✓ OTP code successfully verified.</p>
                )}
                {otpVerified === false && (
                  <p className="mt-1 text-[10px] text-destructive font-bold">✗ The OTP entered is invalid.</p>
                )}
              </div>

              {/* Password Input (Greyed out until sent) */}
              <div>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={!otpSent}
                    placeholder="Set Account Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-background border border-input disabled:bg-muted/30 disabled:text-muted-foreground disabled:cursor-not-allowed rounded-xl pl-11 pr-10 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    disabled={!otpSent}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[9px] text-muted-foreground font-semibold leading-relaxed">
                  * Password must be 8-12 characters containing letters and numbers.
                </p>
              </div>

              {/* Submit button */}
              <button
                onClick={handleCompleteRegistration}
                type="button"
                disabled={loading || !otpSent || otpVerified !== true}
                className="w-full bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-lg glow-hover cursor-pointer mt-4 flex items-center justify-center space-x-2"
              >
                <span>Register Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center text-xs text-muted-foreground mt-6 font-semibold">
              Already have an account?{' '}
              <a href="/login" className="text-primary hover:underline transition-all">
                Log In
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-medium text-xs">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <p className="text-slate-400">Loading registration details...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
