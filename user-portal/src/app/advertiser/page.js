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
  Upload
} from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

export default function AdvertiserDashboard() {
  const router = useRouter();

  const [theme, setTheme] = useState('dark');
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [activeTab, setActiveTab] = useState('bookings');
  
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

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

    if (!storedToken || role !== 'advertiser') {
      localStorage.clear();
      router.push('/login');
      return;
    }

    const savedTab = localStorage.getItem('advertiserActiveTab');
    if (savedTab) {
      setActiveTab(savedTab);
    }

    setToken(storedToken);
    setPhone(storedPhone);

    fetchBookings(storedToken);
    fetchStates(storedToken);
    fetchRates(storedToken);
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
      const response = await axios.post(`${API_BASE}/ads/upload`, file, {
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-all duration-300">
      
      {/* Top Header Navbar - Universal styled shadcn preset */}
      <header className="border-b border-border bg-card px-6 md:px-12 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="font-outfit text-md font-bold text-foreground">Advertiser Portal</span>
        </div>

        <nav className="flex space-x-1.5 md:space-x-2">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('new-booking')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'new-booking'
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
            <p className="text-xs font-bold text-foreground mt-1">{phone}</p>
          </div>
          
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
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">
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
            <h1 className="font-outfit text-3xl font-extrabold text-foreground mb-2">My Ad Campaigns</h1>
            <p className="text-muted-foreground text-sm mb-8 font-semibold">Review the payment and delivery status of your local campaigns.</p>

            {bookings.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border bg-card/10 rounded-[32px]">
                <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">No campaigns booked yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">Click &ldquo;Book Ad Spot&rdquo; in the navigation to launch your first location-based ad.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {bookings.map((booking) => (
                  <div key={booking.bookingId} className="glassmorphism p-6 rounded-[24px] bg-card/20 border-border flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start border-b border-border pb-3 mb-3">
                        <div>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider">{booking.bookingId}</span>
                          <h4 className="font-bold text-foreground text-sm mt-0.5">{booking.outletId?.outletName || 'Host Outlet'}</h4>
                          <p className="text-[10px] text-muted-foreground font-semibold">{booking.city}, {booking.state}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Device Target</span>
                          <span className="text-foreground capitalize font-semibold">{booking.deviceType}s (Qty: {booking.quantity})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Campaign Scale</span>
                          <span className="text-foreground font-semibold">{booking.adDurationDays} Days / {booking.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Media Asset</span>
                          <a href={booking.mediaUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold truncate max-w-[120px]">
                            View Asset
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-semibold">Amount Paid</p>
                        <p className="text-sm font-extrabold text-foreground">₹{booking.amount / 100}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          booking.paymentStatus === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                        }`}>
                          {booking.paymentStatus === 'completed' ? 'Paid' : 'Unpaid'}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          booking.approvalStatus === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : booking.approvalStatus === 'rejected'
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                        }`}>
                          {booking.approvalStatus === 'approved' ? 'Approved' : booking.approvalStatus === 'rejected' ? 'Rejected' : 'Reviewing'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. New Booking Flow Tab */}
        {activeTab === 'new-booking' && (
          <div className="animate-fade-in">
            <h1 className="font-outfit text-3xl font-extrabold text-foreground mb-2">Book Advertising Spot</h1>
            <p className="text-muted-foreground text-sm mb-8 font-semibold">Target specific local dining tables or digital display screens in three simple steps.</p>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Selector and Settings */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Location selection */}
                <div className="glassmorphism p-8 rounded-[32px] bg-card/20 border-border space-y-6">
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
                <div className="glassmorphism p-8 rounded-[32px] bg-card/20 border-border space-y-6">
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
                          <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-border hover:bg-muted/50 rounded-xl py-6 cursor-pointer transition-all">
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
                          <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
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
              <div className="glassmorphism p-8 rounded-[32px] bg-card/20 border-border h-fit space-y-6">
                <h3 className="font-outfit text-lg font-bold text-foreground border-b border-border pb-3">Checkout Summary</h3>
                
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

                    <div className="border-t border-border pt-4 space-y-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-muted-foreground">Plan Rate</span>
                        <span className="text-foreground">₹{(computedAmount / (parseInt(quantity, 10) || 1)) / 100}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span className="text-muted-foreground">Multiplier</span>
                        <span className="text-foreground">x{parseInt(quantity, 10) || 0}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-3 text-sm font-bold">
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
    </div>
  );
}
