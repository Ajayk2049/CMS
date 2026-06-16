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
  Megaphone
} from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

export default function AdvertiserDashboard() {
  const router = useRouter();

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
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  // Form Fields
  const [mediaUrl, setMediaUrl] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [adDurationDays, setAdDurationDays] = useState(7);
  const [frequency, setFrequency] = useState('hourly');
  const [computedAmount, setComputedAmount] = useState(0);

  // Bookings list
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const storedPhone = localStorage.getItem('phone');

    if (!storedToken || role !== 'advertiser') {
      localStorage.clear();
      router.push('/login');
      return;
    }

    setToken(storedToken);
    setPhone(storedPhone);

    fetchBookings(storedToken);
    fetchStates(storedToken);
    fetchRates(storedToken);
  }, [router]);

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

  // Dynamic pricing calculation
  useEffect(() => {
    if (!selectedOutlet) {
      setComputedAmount(0);
      return;
    }

    const deviceType = selectedOutlet.deviceType;
    const duration = parseInt(adDurationDays, 10);

    const matchRate = rates.find(
      r => r.deviceType === deviceType && 
           r.durationDays === duration && 
           r.frequency === frequency
    );

    if (matchRate) {
      setComputedAmount(matchRate.amount * quantity); // in paise
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
      setError('Please select a target outlet');
      return;
    }

    try {
      const redirectUrl = `${config.userPortalUrl}/advertiser`; // redirect back to dashboard
      const response = await axios.post(
        `${API_BASE}/ads/book`,
        {
          outletId: selectedOutlet._id,
          deviceType: selectedOutlet.deviceType,
          quantity: parseInt(quantity, 10),
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-900 bg-slate-950 p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center space-x-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <span className="font-outfit text-lg font-bold text-white">Advertiser Portal</span>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'bookings'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>My Campaigns</span>
            </button>
            <button
              onClick={() => setActiveTab('new-booking')}
              className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'new-booking'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Book Ad Spot</span>
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-900 pt-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-blue-400">
              A
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Log in as</p>
              <p className="text-sm font-bold text-white">{phone}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white font-bold py-3 rounded-xl transition-all text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="flex justify-between items-center mb-10 md:hidden">
          <div className="flex items-center space-x-2">
            <Megaphone className="w-6 h-6 text-blue-500" />
            <span className="font-outfit font-bold text-white">Advertiser Portal</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-8 p-4 rounded-2xl bg-blue-950/40 border border-blue-900/50 text-blue-400 text-xs font-semibold">
            {info}
          </div>
        )}

        {/* 1. Campaigns List Tab */}
        {activeTab === 'bookings' && (
          <div>
            <h1 className="font-outfit text-3xl font-extrabold text-white mb-2">My Ad Campaigns</h1>
            <p className="text-slate-400 text-sm mb-8">Review the payment and delivery status of your local campaigns.</p>

            {bookings.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl">
                <Megaphone className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-400">No campaigns booked yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Click &ldquo;Book Ad Spot&rdquo; in the sidebar to launch your first location-based ad.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {bookings.map((booking) => (
                  <div key={booking.bookingId} className="glassmorphism p-6 rounded-2xl flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start border-b border-slate-900 pb-3 mb-3">
                        <div>
                          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">{booking.bookingId}</span>
                          <h4 className="font-bold text-white text-sm mt-0.5">{booking.outletId?.outletName || 'Host Outlet'}</h4>
                          <p className="text-[10px] text-slate-500">{booking.city}, {booking.state}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Device Target</span>
                          <span className="text-slate-200 capitalize font-medium">{booking.deviceType}s (Qty: {booking.quantity})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Campaign Scale</span>
                          <span className="text-slate-200 font-medium">{booking.adDurationDays} Days / {booking.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Media Asset</span>
                          <a href={booking.mediaUrl} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline font-medium truncate max-w-[120px]">
                            View Asset
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500">Amount Paid</p>
                        <p className="text-sm font-extrabold text-white">₹{booking.amount / 100}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          booking.paymentStatus === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {booking.paymentStatus === 'completed' ? 'Paid' : 'Unpaid'}
                        </span>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                          booking.approvalStatus === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : booking.approvalStatus === 'rejected'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
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
          <div>
            <h1 className="font-outfit text-3xl font-extrabold text-white mb-2">Book Advertising Spot</h1>
            <p className="text-slate-400 text-sm mb-8">Target specific local dining tables or digital display screens in three simple steps.</p>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Selector and Settings */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Location selection */}
                <div className="glassmorphism p-8 rounded-3xl space-y-6">
                  <h3 className="font-outfit text-lg font-bold text-white flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-blue-500" />
                    <span>Select Target Venue</span>
                  </h3>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select State</label>
                      <select
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          fetchCities(e.target.value);
                        }}
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                      >
                        <option value="">-- State --</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select City</label>
                      <select
                        value={selectedCity}
                        disabled={!selectedState}
                        onChange={(e) => {
                          setSelectedCity(e.target.value);
                          fetchOutlets(e.target.value);
                        }}
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="">-- City --</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Select Outlet</label>
                      <select
                        value={selectedOutlet ? selectedOutlet._id : ''}
                        disabled={!selectedCity}
                        onChange={(e) => {
                          const matched = outlets.find(o => o._id === e.target.value);
                          setSelectedOutlet(matched || null);
                        }}
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="">-- Outlet --</option>
                        {outlets.map(o => (
                          <option key={o._id} value={o._id}>
                            {o.outletName} ({o.deviceType})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Step 2: Campaign Settings */}
                <div className="glassmorphism p-8 rounded-3xl space-y-6">
                  <h3 className="font-outfit text-lg font-bold text-white flex items-center">
                    <Video className="w-5 h-5 mr-2 text-indigo-500" />
                    <span>Ad Details & Schedule</span>
                  </h3>

                  <form onSubmit={handleInitiateBooking} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Media File Asset URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://mybucket.com/ads/commercial.mp4"
                        value={mediaUrl}
                        onChange={(e) => setMediaUrl(e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Quantity of Screens</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max={selectedOutlet ? selectedOutlet.quantity : 1}
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Duration (Days)</label>
                        <select
                          value={adDurationDays}
                          onChange={(e) => setAdDurationDays(parseInt(e.target.value, 10))}
                          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value={7}>7 Days Plan</option>
                          <option value={30}>30 Days Plan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Frequency</label>
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                        >
                          <option value="hourly">Once Every Hour</option>
                          <option value="continuous">Continuous Loop</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={computedAmount === 0}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-900 disabled:text-slate-600 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Pay via PhonePe Payment Gateway</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Checkout Summary Card */}
              <div className="glassmorphism p-8 rounded-3xl h-fit space-y-6">
                <h3 className="font-outfit text-lg font-bold text-white border-b border-slate-900 pb-3">Checkout Summary</h3>
                
                {selectedOutlet ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <p className="text-slate-500 font-semibold uppercase">Target Outlet</p>
                      <p className="font-bold text-white text-sm mt-0.5">{selectedOutlet.outletName}</p>
                      <p className="text-[10px] text-slate-400">{selectedOutlet.doorNo}, {selectedOutlet.street}, {selectedOutlet.city}</p>
                    </div>

                    <div>
                      <p className="text-slate-500 font-semibold uppercase">Hardware Type</p>
                      <p className="font-bold text-white capitalize mt-0.5">{selectedOutlet.deviceType} display</p>
                      <p className="text-[10px] text-slate-400">Configured qty: {quantity} out of {selectedOutlet.quantity} available</p>
                    </div>

                    <div className="border-t border-slate-900 pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Plan Rate</span>
                        <span className="font-semibold text-slate-300">₹{(computedAmount / quantity) / 100}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Multiplier</span>
                        <span className="font-semibold text-slate-300">x{quantity}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-900 pt-3 text-sm">
                        <span className="text-slate-400 font-bold">Total Cost</span>
                        <span className="font-extrabold text-blue-400">₹{computedAmount / 100}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-500 leading-relaxed">
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
