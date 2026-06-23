'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Layers,
  MapPin,
  Video,
  CreditCard,
  LogOut,
  DollarSign,
  CheckCircle,
  HelpCircle,
  Megaphone,
  Tv,
  Sun,
  Moon,
  Upload,
  Building,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

export default function AdvertiserDashboard() {
  const router = useRouter();

  const [theme, setTheme] = useState('dark');
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState('bookings');

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [roleActionLoading, setRoleActionLoading] = useState(false);
  const [showBecomeHostModal, setShowBecomeHostModal] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState({});
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');

  // Dropdown options loaded from server
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [rates, setRates] = useState([]);

  // Selections
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedOutletName, setSelectedOutletName] = useState('');
  const [availableDeviceTypes, setAvailableDeviceTypes] = useState([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  // Form Fields
  const [mediaUrl, setMediaUrl] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [adDurationDays, setAdDurationDays] = useState(7);
  const [frequency, setFrequency] = useState('hourly');
  const [computedAmount, setComputedAmount] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Bookings list
  const [bookings, setBookings] = useState([]);

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

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedPhone = localStorage.getItem('phone');
    const storedRoles = JSON.parse(localStorage.getItem('roles') || '[]');

    if (!storedToken) {
      localStorage.clear();
      router.push('/login');
      return;
    }

    if (role !== 'advertiser') {
      if (storedRoles.includes('advertiser')) {
        axios.post(`${API_BASE}/auth/switch-role`, { role: 'advertiser' }, {
          headers: { Authorization: `Bearer ${storedToken}` }
        }).then(res => {
          localStorage.setItem('token', res.data.data.token);
          localStorage.setItem('role', res.data.data.user.role);
          localStorage.setItem('roles', JSON.stringify(res.data.data.user.roles));
          window.location.reload();
        }).catch(err => {
          console.error('Role auto-switch failed:', err);
          localStorage.clear();
          router.push('/login');
        });
        return;
      }
      if (role === 'merchant') {
        router.push('/merchant');
      } else {
        localStorage.clear();
        router.push('/login');
      }
      return;
    }

    const savedTab = localStorage.getItem('advertiserActiveTab');
    if (savedTab) {
      setActiveTab(savedTab);
    }

    setToken(storedToken);
    setPhone(storedPhone);
    setName(localStorage.getItem('name') || '');
    setRoles(storedRoles);

    fetchBookings(storedToken);
    fetchStates(storedToken);
    fetchRates(storedToken);

    // Auto-verify if returning from payment redirect
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const verifyBookingId = urlParams.get('verifyBookingId');
      if (verifyBookingId) {
        handleVerifyPayment(verifyBookingId, storedToken);
        // Clear query parameters from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [router]);

  // Persist Active Tab
  useEffect(() => {
    localStorage.setItem('advertiserActiveTab', activeTab);
  }, [activeTab]);

  // Fetch bookings list
  const fetchBookings = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/ads/bookings`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setBookings(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch unique states
  const fetchStates = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/ads/locations/states`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setStates(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch cities when state changes
  const fetchCities = async (stateVal) => {
    if (!stateVal) return;
    try {
      const res = await axios.get(`${API_BASE}/ads/locations/cities?state=${stateVal}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCities(res.data.data);
      setOutlets([]);
      setSelectedCity('');
      setSelectedOutletName('');
      setAvailableDeviceTypes([]);
      setSelectedDeviceType('');
      setSelectedOutlet(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch outlets when city changes
  const fetchOutlets = async (cityVal) => {
    if (!cityVal || !selectedState) return;
    try {
      const res = await axios.get(`${API_BASE}/ads/locations/outlets?state=${selectedState}&city=${cityVal}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutlets(res.data.data);
      setSelectedOutletName('');
      setAvailableDeviceTypes([]);
      setSelectedDeviceType('');
      setSelectedOutlet(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch pricing rates
  const fetchRates = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/ads/rates`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setRates(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Numeric input constraints
  const handleQuantityChange = (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned === '0') return;
    setQuantity(cleaned);
  };

  // Upload video raw binary payload and save to local disk
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.mp4', '.webm'].includes(ext)) {
      setError('Unsupported file type. Only MP4 and WEBM are allowed.');
      return;
    }

    setUploading(true);
    setError('');
    setInfo('');

    try {
      const response = await axios.post(`${API_BASE}/ads/upload${selectedDeviceType ? '?deviceType=' + selectedDeviceType : ''}`, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Filename': file.name,
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success && response.data.data.url) {
        setMediaUrl(response.data.data.url);
        setInfo('Video uploaded successfully!');
      } else {
        setError(response.data.message || 'Upload failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload video file.');
    } finally {
      setUploading(false);
    }
  };

  // Dynamic pricing calculation
  useEffect(() => {
    if (!selectedOutlet) {
      setComputedAmount(0);
      return;
    }

    const deviceType = selectedOutlet.deviceType;
    const duration = parseInt(adDurationDays, 10);
    const qty = parseInt(quantity, 10) || 0;

    const matchRate = rates.find(
      r => r.deviceType === deviceType &&
        r.durationDays === duration &&
        r.frequency === frequency
    );

    if (matchRate) {
      setComputedAmount(matchRate.amount * qty); // in paise
    } else {
      setComputedAmount(0);
    }
  }, [selectedOutlet, quantity, adDurationDays, frequency, rates]);

  // Handle Ad booking initiation
  const handleInitiateBooking = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!selectedOutlet) {
      setError('Please select a target venue and display type');
      return;
    }

    if (!mediaUrl || !mediaUrl.trim()) {
      setError('Please upload a video file or provide a video URL before proceeding.');
      return;
    }

    const bookingQty = parseInt(quantity, 10);
    if (isNaN(bookingQty) || bookingQty < 1) {
      setError('Quantity must be a number of 1 or more');
      return;
    }

    if (bookingQty > selectedOutlet.quantity) {
      setError(`Requested quantity exceeds outlet availability (${selectedOutlet.quantity})`);
      return;
    }

    try {
      const redirectUrl = `${config.userPortalUrl}/advertiser`; // redirect back to dashboard
      const response = await axios.post(
        `${API_BASE}/ads/book`,
        {
          outletId: selectedOutlet._id,
          deviceType: selectedOutlet.deviceType,
          quantity: bookingQty,
          adDurationDays: parseInt(adDurationDays, 10),
          frequency,
          mediaUrl,
          redirectUrl
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setInfo('Ad booking initiated successfully! Redirecting you to payment...');

      // Simulate/Open Checkout Redirect
      if (response.data.data.paymentUrl) {
        window.location.href = response.data.data.paymentUrl;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate campaign booking.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const handleSwitchRole = async (targetRole) => {
    setError('');
    setInfo('');
    setRoleActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/switch-role`, { role: targetRole }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('role', res.data.data.user.role);
      localStorage.setItem('roles', JSON.stringify(res.data.data.user.roles));
      router.push(targetRole === 'merchant' ? '/merchant' : '/advertiser');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to switch role.');
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleBecomeHost = async () => {
    setError('');
    setInfo('');
    setRoleActionLoading(true);
    setShowBecomeHostModal(false);
    try {
      const res = await axios.post(`${API_BASE}/auth/add-role`, { role: 'merchant' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('role', res.data.data.user.role);
      localStorage.setItem('roles', JSON.stringify(res.data.data.user.roles));
      router.push('/merchant');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register as host.');
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleVerifyPayment = async (bookingId, explicitToken = null) => {
    setError('');
    setInfo('');
    const activeToken = explicitToken || token;
    if (!activeToken) return;
    try {
      const res = await axios.post(`${API_BASE}/ads/verify-payment/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.data.success) {
        setInfo(res.data.message);
        fetchBookings(activeToken); // reload campaigns
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to verify payment status.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-all duration-300">

      {/* Top Header Navbar - Universal styled shadcn preset */}
      <header className="border-b border-border/40 bg-card px-5 sm:px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="font-outfit text-md font-bold text-foreground brandLogo">Advertiser Portal</span>
        </div>

        <nav className="flex space-x-1.5 md:space-x-2">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'bookings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('new-booking')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'new-booking'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Book Ad Spot</span>
          </button>
        </nav>

        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="hidden lg:block text-right pr-2">
            <p className="text-[10px] text-muted-foreground font-semibold leading-none">Logged in as</p>
            <p className="text-xs font-bold text-foreground mt-1">{name || phone}</p>
          </div>

          {/* Role Actions */}
          {roles.includes('merchant') ? (
            <button
              onClick={() => handleSwitchRole('merchant')}
              disabled={roleActionLoading}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-blue-300 font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${roleActionLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Switch to Host</span>
            </button>
          ) : (
            <button
              onClick={() => setShowBecomeHostModal(true)}
              disabled={roleActionLoading}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Building className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Become Host</span>
            </button>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-2 bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-1 p-5 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {error && (
          <div className="mb-8 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-8 p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            {info}
          </div>
        )}

        {/* 1. Campaigns List Tab */}
        {activeTab === 'bookings' && (
          <div className="animate-fade-in">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">My Ad Campaigns</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8">Review the payment and delivery status of your local campaigns.</p>
 
            {bookings.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">No campaigns booked yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">Click &ldquo;Book Ad Spot&rdquo; in the navigation to launch your first location-based ad.</p>
              </div>
            ) : (
              <div className="p-5 rounded-2xl overflow-x-auto bg-card/10 border border-border/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="pb-4 pr-4">Campaign ID</th>
                      <th className="pb-4 pr-4">Target Venue</th>
                      <th className="pb-4 pr-4">Display Type</th>
                      <th className="pb-4 pr-4">Schedule Scale</th>
                      <th className="pb-4 pr-4">Amount Paid</th>
                      <th className="pb-4 pr-4">Status</th>
                      <th className="pb-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {bookings.map((booking) => {
                      const isExpanded = expandedCampaigns[booking.bookingId];
                      return (
                        <React.Fragment key={booking.bookingId}>
                          <tr className="hover:bg-muted/10">
                            <td className="py-4 pr-4 font-bold text-primary uppercase tracking-wider">
                              {booking.bookingId}
                            </td>
                            <td className="py-4 pr-4">
                              <div className="font-bold text-foreground text-xs">{booking.outletId?.outletName || 'Host Outlet'}</div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">{booking.city}, {booking.state}</div>
                            </td>
                            <td className="py-4 pr-4 capitalize font-semibold text-foreground">
                              {booking.deviceType}s (Qty: {booking.quantity})
                            </td>
                            <td className="py-4 pr-4 font-semibold text-foreground">
                              {booking.adDurationDays} Days / {booking.frequency}
                            </td>
                            <td className="py-4 pr-4 font-extrabold text-foreground">
                              ₹{booking.amount / 100}
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex flex-col space-y-1">
                                <span className={`w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded ${booking.paymentStatus === 'completed'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                                  }`}>
                                  {booking.paymentStatus === 'completed' ? 'Paid' : 'Unpaid'}
                                </span>
                                <span className={`w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded ${booking.approvalStatus === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : booking.approvalStatus === 'rejected'
                                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                      : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                                  }`}>
                                  {booking.approvalStatus === 'approved' ? 'Approved' : booking.approvalStatus === 'rejected' ? 'Rejected' : 'Reviewing'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {booking.paymentStatus !== 'completed' && (
                                  <button
                                    onClick={() => handleVerifyPayment(booking.bookingId)}
                                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-blue-300 font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm"
                                    title="Verify Payment Status"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span className="hidden md:inline">Verify</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => setPreviewVideoUrl(booking.mediaUrl)}
                                  className="p-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl text-primary transition-all cursor-pointer flex items-center justify-center"
                                  title="Play Video Asset"
                                >
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </button>
                                <button
                                  onClick={() => setExpandedCampaigns(prev => ({
                                    ...prev,
                                    [booking.bookingId]: !prev[booking.bookingId]
                                  }))}
                                  className="flex items-center space-x-1 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/40 text-muted-foreground hover:text-foreground font-semibold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  <span>{isExpanded ? 'Hide' : 'Details'}</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-card/5">
                              <td colSpan="7" className="p-4 border-t border-border/40">
                                <div className="grid md:grid-cols-2 gap-6 items-start">
                                  {/* Left Panel Metadata */}
                                  <div className="space-y-3 text-xs">
                                    <div className="grid grid-cols-3 border-b border-border/40 pb-2">
                                      <span className="text-muted-foreground font-semibold">Order ID</span>
                                      <span className="col-span-2 text-foreground font-semibold break-all">{booking.orderId || 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-3 border-b border-border/40 pb-2">
                                      <span className="text-muted-foreground font-semibold">Payment ID</span>
                                      <span className="col-span-2 text-foreground font-semibold break-all">{booking.paymentId || 'N/A'}</span>
                                    </div>
                                    <div className="grid grid-cols-3 border-b border-border/40 pb-2">
                                      <span className="text-muted-foreground font-semibold">Created At</span>
                                      <span className="col-span-2 text-foreground font-semibold">{booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A'}</span>
                                    </div>
                                    {booking.approvalStatus === 'rejected' && booking.denialReason && (
                                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold space-y-1">
                                        <p className="uppercase font-bold text-[9px] tracking-wider">Reason for Denial</p>
                                        <p className="text-foreground leading-relaxed font-semibold">{booking.denialReason}</p>
                                      </div>
                                    )}
                                    {booking.approvalStatus === 'approved' && (
                                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                        Campaign Approved & Broadcasting on Target Devices.
                                      </div>
                                    )}
                                  </div>
 
                                  {/* Right Panel Video Preview */}
                                  <div className="flex flex-col space-y-2">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Video Asset Preview</span>
                                    <div className="w-full max-w-[320px] aspect-video rounded-xl border border-border/40 bg-black overflow-hidden relative">
                                      <video
                                        src={booking.mediaUrl}
                                        controls
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <a
                                      href={booking.mediaUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs text-primary hover:underline font-bold mt-1 inline-block"
                                    >
                                      View Raw Asset Link
                                    </a>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. New Booking Flow Tab */}
        {activeTab === 'new-booking' && (
          <div className="animate-fade-in">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Book Advertising Spot</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8">Target specific local dining tables or digital display screens in three simple steps.</p>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Selector and Settings */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Location selection */}
                <div className="p-6 rounded-2xl bg-card/10 border border-border/40 space-y-6">
                  <h3 className="font-outfit text-lg font-bold text-foreground flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary shrink-0" />
                    <span>Select Target Venue</span>
                  </h3>

                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Select State</label>
                      <select
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          fetchCities(e.target.value);
                        }}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer transition-all"
                      >
                        <option value="">-- State --</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Select City</label>
                      <select
                        value={selectedCity}
                        disabled={!selectedState}
                        onChange={(e) => {
                          setSelectedCity(e.target.value);
                          fetchOutlets(e.target.value);
                        }}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer disabled:opacity-50 transition-all"
                      >
                        <option value="">-- City --</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Select Outlet Name</label>
                      <select
                        value={selectedOutletName}
                        disabled={!selectedCity}
                        onChange={(e) => {
                          const name = e.target.value;
                          setSelectedOutletName(name);

                          // Find matching outlets
                          const matches = outlets.filter(o => o.outletName === name);
                          const devices = matches.map(o => o.deviceType);
                          setAvailableDeviceTypes(devices);

                          // Reset device type and selectedOutlet
                          setSelectedDeviceType('');
                          setSelectedOutlet(null);
                        }}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer disabled:opacity-50 transition-all"
                      >
                        <option value="">-- Outlet --</option>
                        {Array.from(new Set(outlets.map(o => o.outletName))).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Select Display Type</label>
                      <select
                        value={selectedDeviceType}
                        disabled={!selectedOutletName}
                        onChange={(e) => {
                          const devType = e.target.value;
                          setSelectedDeviceType(devType);

                          // Find specific outlet matching name and device type
                          const matched = outlets.find(o => o.outletName === selectedOutletName && o.deviceType === devType);
                          setSelectedOutlet(matched || null);
                          setQuantity('1');
                        }}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer disabled:opacity-50 transition-all"
                      >
                        <option value="">-- Display Type --</option>
                        {availableDeviceTypes.map(type => (
                          <option key={type} value={type}>
                            {type === 'tablet' ? 'Tabletop Tablet' : 'Wall Screen'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 2: Campaign Settings */}
                <div className="p-6 rounded-2xl bg-card/10 border border-border/40 space-y-6">
                  <h3 className="font-outfit text-lg font-bold text-foreground flex items-center">
                    <Video className="w-5 h-5 mr-2 text-primary shrink-0" />
                    <span>Ad Details & Schedule</span>
                  </h3>

                  <form onSubmit={handleInitiateBooking} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 font-bold">Media File Asset</label>

                      <div className="space-y-4">
                        {/* File Upload Box */}
                        <div className="flex items-center space-x-3">
                          <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-border/40 hover:bg-muted/50 rounded-xl py-6 cursor-pointer transition-all">
                            <Upload className="w-5 h-5 text-muted-foreground mb-2" />
                            <span className="text-xs font-bold text-foreground">
                              {uploading ? 'Uploading Video...' : 'Upload Video File (.mp4, .webm)'}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-1">Raw binary file upload</span>
                            <input
                              type="file"
                              accept="video/mp4,video/webm"
                              onChange={handleFileUpload}
                              disabled={uploading}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Or URL input */}
                        <div className="relative">
                          <input
                            type="url"
                            placeholder="Or, paste video URL (e.g. https://mybucket.com/ads/commercial.mp4)"
                            value={mediaUrl}
                            onChange={(e) => setMediaUrl(e.target.value)}
                            className="w-full bg-background border border-input rounded-xl px-4 py-3.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                          />
                        </div>

                        {/* Video preview */}
                        {mediaUrl && (
                          <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                            <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase">Video Preview</p>
                            <video
                              src={mediaUrl}
                              controls
                              className="w-full max-h-40 rounded-lg bg-black"
                            />
                            <p className="text-[9px] text-primary font-semibold truncate mt-2">{mediaUrl}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 font-bold">Quantity of Devices</label>
                        <input
                          type="text"
                          required
                          value={quantity}
                          onChange={(e) => handleQuantityChange(e.target.value)}
                          className="w-full bg-background border border-input rounded-xl px-4 py-3.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                        />
                        {selectedOutlet && (
                          <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold">
                            Max available: {selectedOutlet.quantity}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 font-bold">Duration (Days)</label>
                        <select
                          value={adDurationDays}
                          onChange={(e) => setAdDurationDays(parseInt(e.target.value, 10))}
                          className="w-full bg-background border border-input rounded-xl px-4 py-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer transition-all"
                        >
                          <option value={7}>7 Days Plan</option>
                          <option value={30}>30 Days Plan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 font-bold">Frequency</label>
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value)}
                          className="w-full bg-background border border-input rounded-xl px-4 py-3.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer transition-all"
                        >
                          <option value="hourly">Once Every Hour</option>
                          <option value="continuous">Continuous Loop</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={computedAmount === 0 || uploading}
                      className="w-full bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg glow-hover cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay via PhonePe Payment Gateway</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Checkout Summary Card */}
              <div className="p-6 rounded-2xl bg-card/10 border border-border/40 h-fit space-y-6">
                <h3 className="font-outfit text-lg font-bold text-foreground border-b border-border/40 pb-3">Checkout Summary</h3>

                {selectedOutlet ? (
                  <div className="space-y-4 text-xs animate-fade-in">
                    <div>
                      <p className="text-muted-foreground font-bold uppercase">Target Outlet</p>
                      <p className="font-bold text-foreground text-sm mt-0.5">{selectedOutlet.outletName}</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">{selectedOutlet.doorNo}, {selectedOutlet.street}, {selectedOutlet.city}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground font-bold uppercase">Hardware Type</p>
                      <p className="font-bold text-foreground capitalize mt-0.5">{selectedOutlet.deviceType} display</p>
                      <p className="text-[10px] text-muted-foreground font-semibold">Configured qty: {quantity} out of {selectedOutlet.quantity} available</p>
                    </div>

                    <div className="border-t border-border/40 pt-4 space-y-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-muted-foreground">Plan Rate</span>
                        <span className="text-foreground">₹{(computedAmount / (parseInt(quantity, 10) || 1)) / 100}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-muted-foreground">Multiplier</span>
                        <span className="text-foreground">x{parseInt(quantity, 10) || 0}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/40 pt-3 text-sm font-bold">
                        <span className="text-muted-foreground">Total Cost</span>
                        <span className="text-primary">₹{computedAmount / 100}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-muted-foreground font-semibold leading-relaxed">
                    Select a target outlet and schedule criteria to compute payment summary.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Become Host Modal */}
      {showBecomeHostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                <Building className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-outfit text-md font-bold tracking-tight">Become a Host</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Apply for tabletop devices/screens at your outlet</p>
              </div>
            </div>
 
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              By activating the Host profile, you can apply to host tablet ordering kiosks and wall display screens at your physical venue, manage your digital restaurant menu catalogs, and monitor live customer orders.
              <br /><br />
              This will use your same phone number and credentials, allowing you to seamlessly switch between your Advertiser and Host dashboards.
            </p>
 
            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleBecomeHost}
                disabled={roleActionLoading}
                className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg glow-hover flex items-center justify-center space-x-2"
              >
                <span>{roleActionLoading ? 'Activating...' : 'Activate Host Profile'}</span>
              </button>
              <button
                onClick={() => setShowBecomeHostModal(false)}
                disabled={roleActionLoading}
                className="px-5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-3xl bg-card border border-border/40 p-4 rounded-2xl shadow-2xl relative flex flex-col space-y-4">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h3 className="font-outfit text-sm font-bold text-foreground">Campaign Video Preview</h3>
              <button
                onClick={() => setPreviewVideoUrl('')}
                className="p-1 hover:bg-muted border border-border/40 rounded-lg text-muted-foreground hover:text-foreground transition-all cursor-pointer text-xs font-bold w-6 h-6 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video
                src={previewVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
