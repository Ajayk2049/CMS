'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ChevronUp,
  Tablet,
  Clock,
  Calendar,
  AlertCircle,
  XCircle,
  Trash2,
  X,
  createIcons,
  ListVideo,
  IndianRupee,
  BarChart3,
  Activity
} from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

const resolveMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const base = API_BASE.split('/api/v1')[0];
  let subpath = url;
  if (url.includes('/uploads/')) {
    subpath = `/uploads/${url.split('/uploads/')[1]}`;
  } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
    subpath = url.startsWith('/') ? url : `/${url}`;
  } else {
    try {
      const parsed = new URL(url);
      subpath = parsed.pathname;
    } catch (e) {
      subpath = url;
    }
  }
  if (subpath.includes('/uploads/ads/')) {
    subpath = subpath.replace('/uploads/ads/', '/uploads/creative/');
  }
  if (subpath.startsWith('http://') || subpath.startsWith('https://')) {
    return subpath;
  }
  return `${base}${subpath}`;
};

export default function AdvertiserDashboard() {
  const router = useRouter();

  const [theme, setTheme] = useState('dark');
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState('bookings');

  // Toast notification system
  const [toasts, setToasts] = useState([]);

  const showToast = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  const [roleActionLoading, setRoleActionLoading] = useState(false);
  const [showBecomeHostModal, setShowBecomeHostModal] = useState(false);
  const [expandedCampaigns, setExpandedCampaigns] = useState({});
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Analytics Modal state
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsBookingId, setAnalyticsBookingId] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchCampaignAnalytics = async (bookingId, isSilent = false) => {
    if (!bookingId) return;
    if (!isSilent) setAnalyticsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/ads/analytics/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.error('fetchCampaignAnalytics Error:', err);
      if (!isSilent) {
        showToast('error', err.response?.data?.message || 'Failed to load campaign analytics.');
      }
    } finally {
      if (!isSilent) setAnalyticsLoading(false);
    }
  };

  const openAnalyticsModal = (bookingId) => {
    setAnalyticsBookingId(bookingId);
    setAnalyticsData(null);
    setShowAnalyticsModal(true);
    fetchCampaignAnalytics(bookingId);
  };

  useEffect(() => {
    let interval = null;
    if (showAnalyticsModal && analyticsBookingId && token) {
      interval = setInterval(() => {
        fetchCampaignAnalytics(analyticsBookingId, true);
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showAnalyticsModal, analyticsBookingId, token]);

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

  const getFrequencyLabel = (freq) => {
    if (!freq) return 'Unknown';
    const f = freq.toLowerCase();
    if (f === 'continuous') return 'Continuous Loop';
    if (f === 'hourly') return 'Once Every Hour';
    if (f === 'every_15_mins') return 'Once Every 15 Mins';
    if (f === 'every_30_mins') return 'Once Every 30 Mins';
    if (f === 'every_2_hours') return 'Once Every 2 Hours';
    const numMatch = f.match(/\d+/);
    if (numMatch) {
      return `Once Every ${numMatch[0]} Mins`;
    }
    return freq;
  };

  const getAvailableFrequencies = () => {
    const deviceRates = rates.filter((r) => r.deviceType === selectedDeviceType);
    const uniqFrequencies = Array.from(new Set(deviceRates.map((r) => r.frequency)));
    if (uniqFrequencies.length === 0) {
      return ['continuous', 'hourly'];
    }
    return uniqFrequencies;
  };

  useEffect(() => {
    const avail = getAvailableFrequencies();
    if (avail.length > 0 && !avail.includes(frequency)) {
      setFrequency(avail[0]);
    }
  }, [selectedDeviceType, rates]);
  const [computedAmount, setComputedAmount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [rateTab, setRateTab] = useState('tablet');
  const [mediaTypeTab, setMediaTypeTab] = useState('videos'); // 'videos' or 'images'
  const [uploadedImages, setUploadedImages] = useState([]); // array of up to 2 image URLs
  const [uploadProgress, setUploadProgress] = useState(0);

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

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userMenuOpen]);

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
        handleVerifyPayment(verifyBookingId, storedToken, true);
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

    if (!selectedDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) before uploading.');
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.mp4', '.webm'].includes(ext)) {
      showToast('error', 'Unsupported file type. Only MP4 and WEBM are allowed.');
      return;
    }

    // Inspect video duration locally before network transfer
    const maxDuration = config.maxVideoDurationSeconds || 30;
    try {
      const duration = await new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };
        video.onerror = () => {
          resolve(0);
        };
        video.src = URL.createObjectURL(file);
      });

      if (duration > maxDuration) {
        showToast('error', `Video duration (${Math.round(duration)}s) exceeds the maximum allowed limit of ${maxDuration} seconds.`);
        if (e && e.target) e.target.value = '';
        return;
      }
    } catch (err) {
      console.warn('Could not inspect video duration locally:', err);
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post(`${API_BASE}/ads/upload${selectedDeviceType ? '?deviceType=' + selectedDeviceType : ''}`, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-Filename': file.name,
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success && response.data.data.url) {
        setMediaUrl(response.data.data.url);
        showToast('success', 'Video uploaded successfully!');
      } else {
        showToast('error', response.data.message || 'Upload failed.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to upload video file.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (e && e.target) {
        e.target.value = '';
      }
    }
  };

  // Upload image raw binary payload and save to local disk via sharp
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!selectedDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) before uploading.');
      return;
    }

    if (uploadedImages.length >= 2) {
      showToast('error', 'You can upload a maximum of 2 images per campaign.');
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      showToast('error', 'Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.');
      return;
    }

    let contentType = file.type || 'application/octet-stream';
    if (!file.type || file.type === '') {
      if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const response = await axios.post(`${API_BASE}/ads/upload-image${selectedDeviceType ? '?deviceType=' + selectedDeviceType : ''}`, file, {
        headers: {
          'Content-Type': contentType,
          'X-Filename': file.name,
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success && response.data.data.url) {
        const serverUrl = response.data.data.url;
        // Create instant local object URL for preview fallback
        const localPreviewUrl = URL.createObjectURL(file);
        const newImageItems = [...uploadedImages, { serverUrl, previewUrl: localPreviewUrl }];
        setUploadedImages(newImageItems);
        setMediaUrl(newImageItems.map(item => typeof item === 'string' ? item : item.serverUrl).join(','));
        showToast('success', `Image ${newImageItems.length}/2 uploaded & optimized successfully!`);
      } else {
        showToast('error', response.data.message || 'Image upload failed.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to upload image file.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (e && e.target) {
        e.target.value = '';
      }
    }
  };

  const removeUploadedImage = (index) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    setMediaUrl(newImages.map(item => typeof item === 'string' ? item : item.serverUrl).join(','));
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


    if (!selectedOutlet) {
      showToast('error', 'Please select a target venue and display type.');
      return;
    }

    if (mediaTypeTab === 'images') {
      if (uploadedImages.length === 0 && (!mediaUrl || !mediaUrl.trim())) {
        showToast('error', 'Please upload at least 1 image (max 2) or paste an image URL before proceeding.');
        return;
      }
    } else {
      if (!mediaUrl || !mediaUrl.trim()) {
        showToast('error', 'Please upload a video file or provide a video URL before proceeding.');
        return;
      }
    }

    const bookingQty = parseInt(quantity, 10);
    if (isNaN(bookingQty) || bookingQty < 1) {
      showToast('error', 'Quantity must be a number of 1 or more.');
      return;
    }

    if (bookingQty > selectedOutlet.quantity) {
      showToast('error', `Requested quantity exceeds outlet availability (${selectedOutlet.quantity}).`);
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

      showToast('success', 'Ad booking initiated! Redirecting you to the payment gateway...');

      // Simulate/Open Checkout Redirect
      if (response.data.data.paymentUrl) {
        window.location.href = response.data.data.paymentUrl;
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to initiate campaign booking.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const handleSwitchRole = async (targetRole) => {
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
      showToast('error', err.response?.data?.message || 'Failed to switch role.');
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleBecomeHost = async () => {
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
      showToast('error', err.response?.data?.message || 'Failed to register as host.');
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleVerifyPayment = async (bookingId, explicitToken = null, isAutoVerify = false) => {
    const activeToken = explicitToken || token;
    if (!activeToken) return;
    try {
      const res = await axios.post(`${API_BASE}/ads/verify-payment/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const paymentStatus = res.data.data?.paymentStatus;

      if (paymentStatus === 'completed') {
        showToast('success', 'Payment verified successfully! Your campaign is under review.');
        fetchBookings(activeToken);
        if (isAutoVerify) setActiveTab('bookings');
      } else if (paymentStatus === 'failed') {
        showToast('error', 'Payment failed or was declined. Please try booking again.');
        if (isAutoVerify) setActiveTab('new-booking');
      } else {
        // pending or unknown
        showToast('info', res.data.message || 'Payment is still being verified. Check back shortly.');
        fetchBookings(activeToken);
        if (isAutoVerify) setActiveTab('bookings');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to verify payment status.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-all duration-300">

      {/* Top Header Navbar - Universal styled shadcn preset */}
      <header className="border-b border-border/40 bg-card px-5 sm:px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 overflow-hidden p-1">
            <img src="/brandicon.png" alt="DigiAds Logo" className="w-full h-full object-contain rounded-lg" />
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
            <ListVideo className={`w-3.5 h-3.5 fill-current ${activeTab === 'bookings' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span className="hidden sm:inline">My Campaigns</span>
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'rates'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <IndianRupee className={`w-3.5 h-3.5 fill-current ${activeTab === 'rates' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span className="hidden sm:inline">Ad Rates</span>
          </button>
          <button
            onClick={() => setActiveTab('new-booking')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'new-booking'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <Plus className={`w-3.5 h-3.5 fill-current ${activeTab === 'new-booking' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span className="hidden sm:inline">Book Ad Spot</span>
          </button>
        </nav>

        <div className="flex items-center space-x-2 md:space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 fill-current" /> : <Moon className="w-4 h-4 text-indigo-500 fill-current" />}
          </button>

          {/* User profile dropdown on the rightmost side */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-card hover:bg-muted border border-border rounded-xl transition-all cursor-pointer shadow-sm select-none"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-black">
                {(name || phone || 'U')[0].toUpperCase()}
              </div>
              <span className="text-xs font-bold text-foreground max-w-[120px] truncate">{name || phone}</span>
              {userMenuOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-card border border-border/40 shadow-lg py-1.5 z-40 animate-fade-in text-xs font-semibold">
                <div className="px-3 py-2 border-b border-border/40">
                  <p className="text-[10px] text-muted-foreground leading-none">Logged in as</p>
                  <p className="text-xs font-bold text-foreground mt-1 truncate">{name || phone}</p>
                </div>

                {bookings.length > 0 && (
                  <div className="p-1.5 space-y-1 border-b border-border/40">
                    {roles.includes('merchant') ? (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleSwitchRole('merchant');
                        }}
                        disabled={roleActionLoading}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                      >
                        <RefreshCw className={`w-4 h-4 text-indigo-500 ${roleActionLoading ? 'animate-spin' : ''}`} />
                        <span>Switch to Host</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setShowBecomeHostModal(true);
                        }}
                        disabled={roleActionLoading}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                      >
                        <Megaphone className="w-4 h-4 text-blue-500" />
                        <span>Become Host</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-destructive font-bold"
                  >
                    <LogOut className="w-3.5 h-3.5 fill-current" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Toast Notification Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 w-80 max-w-[calc(100vw-2rem)]">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-start space-x-3 p-3.5 rounded-xl border animate-fade-in text-xs font-semibold select-none ${toast.type === 'error'
              ? 'bg-rose-600 dark:bg-rose-500 border-rose-400/40 text-white shadow-[0_6px_20px_rgba(244,63,94,0.3)] dark:shadow-[0_8px_30px_rgba(244,63,94,0.5)]'
              : toast.type === 'success'
                ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-400/40 text-white shadow-[0_6px_20px_rgba(16,185,129,0.3)] dark:shadow-[0_8px_30px_rgba(16,185,129,0.5)]'
                : 'bg-[#0069a8] border-blue-400/40 text-white shadow-[0_6px_20px_rgba(0,105,168,0.3)] dark:shadow-[0_8px_30px_rgba(0,105,168,0.5)]'
              }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' && <XCircle className="w-4 h-4 text-white" />}
              {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-white" />}
              {toast.type === 'info' && <AlertCircle className="w-4 h-4 text-white" />}
            </div>
            <p className="flex-1 leading-relaxed text-white font-bold">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Content Pane */}
      <main className="flex-1 p-2 sm:p-3 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* 1. Campaigns List Tab */}
        {activeTab === 'bookings' && (
          <div className="animate-fade-in w-full max-w-7xl mx-auto p-4 bg-transparent">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">My Ad Campaigns</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8">Review the payment and delivery status of your local campaigns.</p>

            {bookings.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">No campaigns booked yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">Click &ldquo;Book Ad Spot&rdquo; in the navigation to launch your first location-based ad.</p>
              </div>
            ) : (
              <div className="overflow-x-auto m-0 p-0 bg-transparent border-none">
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
                            <td className="py-4 pr-4">
                              <div className="flex items-center space-x-1.5 font-bold text-primary uppercase tracking-wider">
                                <Megaphone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span>{booking.bookingId}</span>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex items-start space-x-2">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="font-bold text-foreground text-xs">{booking.outletId?.outletName || 'Host Outlet'}</div>
                                  <div className="text-[10px] text-muted-foreground mt-0.5">{booking.city}, {booking.state}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center space-x-1.5 capitalize font-semibold text-foreground">
                                {booking.deviceType === 'tablet' ? (
                                  <Tablet className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                ) : (
                                  <Tv className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                )}
                                <span>{booking.deviceType}s (Qty: {booking.quantity})</span>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center space-x-1.5 font-semibold text-foreground">
                                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>{booking.adDurationDays} Days / {getFrequencyLabel(booking.frequency)}</span>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex items-center space-x-1 font-extrabold text-foreground">
                                <span className="text-emerald-500 font-bold">₹</span>
                                <span>{booking.amount / 100}</span>
                              </div>
                            </td>
                            <td className="py-4 pr-4">
                              <div className="flex flex-col space-y-1">
                                <span className={`w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center ${booking.paymentStatus === 'completed'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : booking.paymentStatus === 'failed'
                                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                                  }`}>
                                  {booking.paymentStatus === 'completed' ? (
                                    <>
                                      <CheckCircle className="w-2.5 h-2.5 text-emerald-500 shrink-0 mr-1" />
                                      <span>Paid</span>
                                    </>
                                  ) : booking.paymentStatus === 'failed' ? (
                                    <>
                                      <XCircle className="w-2.5 h-2.5 text-destructive shrink-0 mr-1" />
                                      <span>Failed</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-2.5 h-2.5 text-orange-500 shrink-0 mr-1 animate-pulse" />
                                      <span>Processing</span>
                                    </>
                                  )}
                                </span>
                                {booking.approvalStatus === 'approved' ? (
                                  <span className="w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                                    <CheckCircle className="w-2.5 h-2.5 text-sky-500 shrink-0 mr-1" />
                                    <span>Approved</span>
                                  </span>
                                ) : booking.approvalStatus === 'rejected' ? (
                                  <span className="w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center bg-destructive/10 text-destructive border border-destructive/20">
                                    <XCircle className="w-2.5 h-2.5 text-destructive shrink-0 mr-1" />
                                    <span>Rejected</span>
                                  </span>
                                ) : booking.paymentStatus === 'completed' ? (
                                  <span className="w-fit text-[9px] font-bold uppercase px-2 py-0.5 rounded flex items-center bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                    <Clock className="w-2.5 h-2.5 text-orange-500 shrink-0 mr-1" />
                                    <span>Reviewing</span>
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="py-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {booking.paymentStatus === 'pending' && (
                                  <button
                                    onClick={() => handleVerifyPayment(booking.bookingId)}
                                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-blue-300 font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm"
                                    title="Verify Payment Status"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    <span className="hidden md:inline">Verify</span>
                                  </button>
                                )}
                                {booking.paymentStatus === 'completed' && booking.approvalStatus === 'approved' && (
                                  <button
                                    onClick={() => openAnalyticsModal(booking.bookingId)}
                                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm"
                                    title="View Campaign Analytics"
                                  >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    <span>Analytics</span>
                                  </button>
                                )}
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

                                  {/* Right Panel Media Creative Preview */}
                                  <div className="flex flex-col space-y-2">
                                    {(() => {
                                      const mediaUrls = (booking.mediaUrl || '').split(',').map(s => s.trim()).filter(Boolean);
                                      const firstUrl = mediaUrls[0] || '';
                                      const isVideo = booking.adType === 'video' || firstUrl.endsWith('.mp4') || firstUrl.endsWith('.webm');

                                      if (isVideo) {
                                        return (
                                          <>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Video Asset Preview</span>
                                            <div className="w-full max-w-[320px] aspect-video rounded-xl border border-border/40 bg-black overflow-hidden relative">
                                              <video
                                                src={resolveMediaUrl(firstUrl)}
                                                controls
                                                className="w-full h-full object-contain"
                                              />
                                            </div>
                                            <a
                                              href={resolveMediaUrl(firstUrl)}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-xs text-primary hover:underline font-bold mt-1 inline-block"
                                            >
                                              View Raw Video Link
                                            </a>
                                          </>
                                        );
                                      }

                                      return (
                                        <>
                                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            {mediaUrls.length > 1 ? 'Image Creatives (Front & Back)' : 'Image Creative Preview'}
                                          </span>
                                          <div className="flex items-center gap-3 overflow-x-auto py-1">
                                            {mediaUrls.map((rawUrl, idx) => {
                                              const resolvedUrl = resolveMediaUrl(rawUrl);
                                              return (
                                                <div key={idx} className="flex flex-col items-center space-y-1">
                                                  <div className="bg-black/80 rounded-xl border border-border/40 p-2 w-[180px] h-[135px] flex items-center justify-center overflow-hidden relative shadow-sm">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                      src={resolvedUrl}
                                                      alt={`Creative ${idx + 1}`}
                                                      className="max-w-full max-h-full object-contain block"
                                                      onError={(e) => {
                                                        console.error('Image preview load failed for URL:', resolvedUrl);
                                                        const base = API_BASE.split('/api/v1')[0];
                                                        if (rawUrl.includes('/uploads/')) {
                                                          const sub = rawUrl.split('/uploads/')[1];
                                                          const fallbackUrl = `${base}/uploads/${sub}`;
                                                          if (e.target.src !== fallbackUrl) {
                                                            e.target.src = fallbackUrl;
                                                          }
                                                        }
                                                      }}
                                                    />
                                                  </div>
                                                  <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                                    {mediaUrls.length > 1 ? (idx === 0 ? 'Front (Image 1)' : 'Back (Image 2)') : 'Image Asset'}
                                                  </span>
                                                  <a
                                                    href={resolvedUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] text-primary hover:underline font-semibold"
                                                  >
                                                    View Raw Asset
                                                  </a>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </>
                                      );
                                    })()}
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

        {/* 2. Configured Ad Rates Tab */}
        {activeTab === 'rates' && (
          <div className="animate-fade-in max-w-2xl mx-auto p-4 rounded-xl bg-card border border-[#0069a8]/80 shadow-[0_0_20px_rgba(0,105,168,0.3)] dark:shadow-[0_0_35px_rgba(0,105,168,0.55)] space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="space-y-1">
                <h1 className="font-outfit text-2xl font-black text-foreground">Configured Ad Rates</h1>
                <p className="text-muted-foreground text-xs font-semibold">Standard package prices set by platform administrators.</p>
              </div>

              {/* Device Tabs for Tablet vs Screen */}
              <div className="flex bg-muted p-1 rounded-xl border border-border/40 text-[10px] font-bold">
                <button
                  onClick={() => setRateTab('tablet')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${rateTab === 'tablet'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Tablets
                </button>
                <button
                  onClick={() => setRateTab('screen')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${rateTab === 'screen'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Screens
                </button>
              </div>
            </div>

            {(() => {
              const filteredRates = rates.filter(r => r.deviceType === rateTab);
              return filteredRates.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-medium italic border border-dashed border-border/40 rounded-xl">
                  No rate configurations found for {rateTab === 'tablet' ? 'tablets' : 'screens'}.
                </div>
              ) : (
                <div className="overflow-x-auto m-0 p-0 bg-transparent border-none">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground font-bold uppercase tracking-wider">
                        <th className="pb-3 pr-2">Duration</th>
                        <th className="pb-3 pr-2">Frequency</th>
                        <th className="pb-3 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredRates.map((rate, index) => (
                        <tr key={index} className="hover:bg-muted/10">
                          <td className="py-3 pr-2">
                            <div className="flex items-center space-x-1.5 font-semibold text-foreground">
                              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>{rate.durationDays} Days</span>
                            </div>
                          </td>
                          <td className="py-3 pr-2 font-semibold capitalize text-foreground">
                            {getFrequencyLabel(rate.frequency)}
                          </td>
                          <td className="py-3 font-extrabold text-foreground text-right">
                            ₹{rate.amount / 100}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* 3. New Booking Flow Tab */}
        {activeTab === 'new-booking' && (
          <div className="animate-fade-in max-w-4xl mx-auto p-4 rounded-xl bg-card border border-[#0069a8]/80 shadow-[0_0_20px_rgba(0,105,168,0.3)] dark:shadow-[0_0_35px_rgba(0,105,168,0.55)] space-y-6">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Book Advertising Spot</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8">Target specific local dining tables or digital display screens in three simple steps.</p>

            {/* Step 1: Location selection - Flushed and Borderless */}
            <div className="space-y-4 m-0 p-0 border-none bg-transparent">
              <h3 className="font-outfit text-lg font-black text-foreground flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary shrink-0" />
                <span>Select Target Venue</span>
              </h3>

              <div className="space-y-4">
                {/* Row 1: State & City */}
                <div className="grid md:grid-cols-2 gap-4">
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
                </div>

                {/* Row 2: Outlet Name & Display Type */}
                <div className="grid md:grid-cols-2 gap-4">
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
            </div>

            {/* Step 2: Campaign Settings - Flushed and Borderless */}
            <div className="space-y-4 m-0 p-0 border-none bg-transparent pt-4">
              <h3 className="font-outfit text-lg font-black text-foreground flex items-center">
                <Video className="w-5 h-5 mr-2 text-primary shrink-0" />
                <span>Ad Details & Schedule</span>
              </h3>

              <form onSubmit={handleInitiateBooking} className="grid md:grid-cols-12 gap-8 items-start">
                {/* Left Column: Stacked settings inputs (col-span-5) */}
                <div className="md:col-span-5 space-y-4">
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
                      {getAvailableFrequencies().map((freq) => (
                        <option key={freq} value={freq}>
                          {getFrequencyLabel(freq)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right Column: Tabbed Media File Asset Upload (col-span-7) */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    {/* Tab Selector: Videos vs Images */}
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Media Creative Type</label>
                      <div className="flex bg-muted p-1 rounded-xl border border-border/40 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setMediaTypeTab('videos');
                            setMediaUrl('');
                            setUploadedImages([]);
                          }}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${mediaTypeTab === 'videos'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          <Video className="w-3 h-3 text-blue-500" />
                          <span>Videos</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaTypeTab('images');
                            setMediaUrl('');
                            setUploadedImages([]);
                          }}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${mediaTypeTab === 'images'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          <Upload className="w-3 h-3 text-amber-500" />
                          <span>Images</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {!selectedDeviceType ? (
                        <div className="flex flex-col items-center justify-center border border-dashed border-border/40 rounded-xl py-6 opacity-50 cursor-not-allowed text-center bg-card/5">
                          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-[10px] font-bold text-foreground">Select Target Display Type first to upload media</span>
                        </div>
                      ) : (
                        <>
                          {/* Media Specifications Disclaimer Banner */}
                          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-medium space-y-1 text-foreground">
                            <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 font-bold uppercase text-[10px] tracking-wider">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Media Specs & Requirements ({selectedDeviceType === 'tablet' ? 'Tablet Kiosk' : 'Digital Screen / TV'})</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground leading-relaxed pl-5 space-y-0.5 font-semibold">
                              {mediaTypeTab === 'videos' ? (
                                <>
                                  <p>• <strong>Aspect Ratio</strong>: {selectedDeviceType === 'tablet' ? 'Portrait 10:16 / 9:16 (Vertical)' : 'Landscape 16:9 (Horizontal Widescreen)'}</p>
                                  <p>• <strong>Max Duration</strong>: Up to <strong>{config.maxVideoDurationSeconds || 30} seconds</strong> (MP4 / WEBM formats)</p>
                                  <p>• <strong>Preferred Resolution</strong>: <strong>{selectedDeviceType === 'tablet' ? '800 × 1280 px' : '1920 × 1080 px Full HD'}</strong></p>
                                </>
                              ) : (
                                <>
                                  <p>• <strong>Aspect Ratio</strong>: {selectedDeviceType === 'tablet' ? 'Portrait 10:16 / 9:16 (Vertical)' : 'Landscape 16:9 (Horizontal Widescreen)'}</p>
                                  <p>• <strong>Creatives Allowed</strong>: Up to <strong>2 Images</strong> (Front & Back switching creatives)</p>
                                  <p>• <strong>Preferred Resolution</strong>: <strong>{selectedDeviceType === 'tablet' ? '800 × 1280 px' : '1920 × 1080 px Full HD'}</strong></p>
                                </>
                              )}
                            </div>
                          </div>

                          {mediaTypeTab === 'videos' ? (
                            /* VIDEO UPLOADER ROUTINE */
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <label className="flex flex-col items-center justify-center border border-dashed border-border/40 hover:bg-muted/50 rounded-xl py-4 cursor-pointer transition-all text-center bg-card/5">
                                  <Video className="w-5 h-5 text-blue-500 mb-1" />
                                  <span className="text-[10px] font-bold text-foreground">
                                    {uploading ? (
                                      uploadProgress < 100
                                        ? `Uploading (${uploadProgress}%)...`
                                        : 'Processing Video...'
                                    ) : (
                                      'Upload Video File (.mp4, .webm)'
                                    )}
                                  </span>
                                  <input
                                    type="file"
                                    accept="video/mp4,video/webm"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                    className="hidden"
                                  />
                                </label>
                                {uploading && (
                                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-300 ${uploadProgress === 100
                                        ? 'bg-primary animate-pulse w-full'
                                        : 'bg-primary'
                                        }`}
                                      style={{ width: uploadProgress === 100 ? '100%' : `${uploadProgress}%` }}
                                    />
                                  </div>
                                )}
                              </div>

                              <input
                                type="text"
                                placeholder="Or, paste video URL"
                                value={mediaUrl}
                                onChange={(e) => setMediaUrl(e.target.value)}
                                className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                              />

                              {mediaUrl && (
                                <div className="space-y-1.5 animate-fade-in pt-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Video Aspect-Ratio Preview</p>
                                    <button
                                      type="button"
                                      onClick={() => setMediaUrl('')}
                                      className="text-[9px] font-bold text-destructive hover:underline cursor-pointer flex items-center space-x-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Remove Video</span>
                                    </button>
                                  </div>
                                  <div className={`mx-auto w-full max-w-[200px] rounded-xl border border-border/40 bg-black overflow-hidden relative shadow-md ${selectedDeviceType === 'tablet'
                                    ? 'aspect-[3/4]'
                                    : 'aspect-[16/9]'
                                    }`}>
                                    <video
                                      src={resolveMediaUrl(mediaUrl)}
                                      controls
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <p className="text-[8px] text-primary font-semibold truncate text-center mt-1">{mediaUrl}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* IMAGE UPLOADER ROUTINE (UP TO 2 IMAGES) */
                            <div className="space-y-3">
                              {uploadedImages.length < 2 && (
                                <div className="space-y-2">
                                  <label className="flex flex-col items-center justify-center border border-dashed border-border/40 hover:bg-muted/50 rounded-xl py-4 cursor-pointer transition-all text-center bg-card/5">
                                    <Upload className="w-5 h-5 text-amber-500 mb-1" />
                                    <span className="text-[10px] font-bold text-foreground">
                                      {uploading ? (
                                        uploadProgress < 100
                                          ? `Uploading (${uploadProgress}%)...`
                                          : 'Optimizing Image via Sharp...'
                                      ) : (
                                        `Upload Image File ${uploadedImages.length + 1}/2 (.png, .jpg, .webp)`
                                      )}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/png,image/jpeg,image/jpg,image/webp"
                                      onChange={handleImageUpload}
                                      disabled={uploading}
                                      className="hidden"
                                    />
                                  </label>
                                  {uploading && (
                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-1.5 rounded-full transition-all duration-300 ${uploadProgress === 100
                                          ? 'bg-amber-500 animate-pulse w-full'
                                          : 'bg-amber-500'
                                          }`}
                                        style={{ width: uploadProgress === 100 ? '100%' : `${uploadProgress}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              <input
                                type="text"
                                placeholder="Or, paste image URL"
                                value={uploadedImages.length === 0 ? mediaUrl : ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setMediaUrl(val);
                                  if (val) setUploadedImages([val]);
                                  else setUploadedImages([]);
                                }}
                                className="w-full bg-background border border-input rounded-xl px-3.5 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                              />

                              {/* Image Cards Preview Grid */}
                              {uploadedImages.length > 0 && (
                                <div className="space-y-2 animate-fade-in pt-1">
                                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Image Asset Previews ({uploadedImages.length}/2)</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    {uploadedImages.map((imgItem, idx) => {
                                      const imgSrc = typeof imgItem === 'string'
                                        ? resolveMediaUrl(imgItem)
                                        : (imgItem.previewUrl || resolveMediaUrl(imgItem.serverUrl));
                                      return (
                                        <div key={idx} className="relative group border border-border/40 rounded-xl overflow-hidden bg-muted/20 p-2 space-y-2">
                                          <div className={`w-full rounded-lg bg-black overflow-hidden relative shadow-sm ${selectedDeviceType === 'tablet'
                                            ? 'aspect-[3/4]'
                                            : 'aspect-[16/9]'
                                            }`}>
                                            <img
                                              src={imgSrc}
                                              alt={`Creative ${idx + 1}`}
                                              className="w-full h-full object-contain"
                                            />
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-foreground">
                                              {idx === 0 ? 'Front (Image 1)' : 'Back (Image 2)'}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => removeUploadedImage(idx)}
                                              className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                                              title="Remove Image"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Pay button */}
                <div className="col-span-full pt-2">
                  <button
                    type="submit"
                    disabled={computedAmount === 0 || uploading}
                    className="w-full bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg glow-hover cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>
                      {computedAmount > 0
                        ? `Pay ₹${computedAmount / 100} via PhonePe Payment Gateway`
                        : 'Pay via PhonePe Payment Gateway'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Become Host Modal */}
      {showBecomeHostModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative">
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

      {/* Campaign Analytics Modal */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-4xl bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border/40 pb-4 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-outfit text-md font-bold text-foreground flex items-center space-x-2">
                    <span>Campaign Analytics</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/40">
                      {analyticsBookingId}
                    </span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    Real-time playback telemetry & impression statistics
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => fetchCampaignAnalytics(analyticsBookingId)}
                  disabled={analyticsLoading}
                  className="p-2 hover:bg-muted border border-border/40 rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer text-xs font-bold flex items-center space-x-1"
                  title="Refresh Live Data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={() => {
                    setShowAnalyticsModal(false);
                    setAnalyticsBookingId('');
                    setAnalyticsData(null);
                  }}
                  className="p-2 hover:bg-muted border border-border/40 rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer text-xs font-bold"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pt-4 space-y-6 pr-1">
              {analyticsLoading && !analyticsData ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs font-bold text-muted-foreground">Fetching playback telemetry data...</p>
                </div>
              ) : analyticsData ? (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Plays</span>
                        <Play className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="text-2xl font-black font-outfit text-foreground">{analyticsData.totalPlays}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold mt-1">Total Impressions</span>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Devices Reached</span>
                        <Tablet className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className="text-2xl font-black font-outfit text-foreground">{analyticsData.uniqueDevicesCount}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold mt-1">Unique Tablets / Screens</span>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Duration</span>
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className="text-2xl font-black font-outfit text-foreground">{analyticsData.totalDurationMinutes}<span className="text-xs font-semibold text-muted-foreground ml-1">mins</span></span>
                      <span className="text-[9px] text-muted-foreground font-semibold mt-1">{analyticsData.totalDurationSeconds} Seconds Broadcast</span>
                    </div>
                  </div>

                  {/* Impression History Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-2">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span>Playback Impression Log</span>
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-semibold">Updated live every 30s</span>
                    </div>

                    {analyticsData.recentImpressions.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-border/40 text-center">
                        <p className="text-xs font-semibold text-muted-foreground">No playback telemetry recorded yet.</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Impressions will appear here automatically once the ad plays on target devices.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border/40">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground border-b border-border/40">
                            <tr>
                              <th className="py-2.5 px-3">Date & Time</th>
                              <th className="py-2.5 px-3">Device ID</th>
                              <th className="py-2.5 px-3">Outlet / Venue</th>
                              <th className="py-2.5 px-3 text-right">Duration</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/20 font-medium">
                            {analyticsData.recentImpressions.map((imp) => (
                              <tr key={imp.id} className="hover:bg-muted/20 transition-colors">
                                <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                                  {new Date(imp.createdAt).toLocaleString()}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-[11px] text-foreground font-semibold">
                                  {imp.deviceId}
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-foreground">
                                  {imp.outletName} {imp.city ? `(${imp.city})` : ''}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-[11px] text-emerald-500 font-bold">
                                  {imp.durationSeconds}s
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
