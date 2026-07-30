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
  Activity,
  Eye
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
  const [expandedCampaigns, setExpandedCampaigns] = useState({});
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Analytics Modal state
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsBookingId, setAnalyticsBookingId] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Media Creative Preview Modal state (matching Admin panel popup)
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [activeMediaUrl, setActiveMediaUrl] = useState('');

  const fetchCampaignAnalytics = async (bookingId, isSilent = false) => {
    if (!bookingId) return;
    if (!isSilent) setAnalyticsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/ads/analytics/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAnalyticsData(res.data.data);
        if (!isSilent) {
          setLastRefreshedAt(Date.now());
        }
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
    setLastRefreshedAt(0);
    setCooldownRemaining(0);
    setShowAnalyticsModal(true);
    fetchCampaignAnalytics(bookingId);
  };

  // Cooldown countdown timer effect
  useEffect(() => {
    if (!lastRefreshedAt) {
      setCooldownRemaining(0);
      return;
    }

    const updateCooldown = () => {
      const elapsed = Math.floor((Date.now() - lastRefreshedAt) / 1000);
      const remaining = 120 - elapsed;
      if (remaining > 0) {
        setCooldownRemaining(remaining);
      } else {
        setCooldownRemaining(0);
      }
    };

    updateCooldown();
    const timer = setInterval(updateCooldown, 1000);
    return () => clearInterval(timer);
  }, [lastRefreshedAt]);

  // Auto-polling every 2 minutes (120,000ms)
  useEffect(() => {
    let interval = null;
    if (showAnalyticsModal && analyticsBookingId && token) {
      interval = setInterval(() => {
        fetchCampaignAnalytics(analyticsBookingId, true);
      }, 120000);
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
  const [selectedMediaType, setSelectedMediaType] = useState(''); // 'image' or 'video'

  // Form Fields
  const [mediaUrl, setMediaUrl] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [adDurationDays, setAdDurationDays] = useState(7);
  const [frequency, setFrequency] = useState('hourly');
  const [adCategory, setAdCategory] = useState('Electronics');

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
    const deviceRates = rates.filter((r) => r.deviceType === selectedDeviceType && (r.mediaType ? r.mediaType === selectedMediaType : true));
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
  }, [selectedDeviceType, selectedMediaType, rates]);
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

  // Active paid booking pending media upload persistence
  const [activeUploadBooking, setActiveUploadBooking] = useState(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  
  useEffect(() => {
    if (activeUploadBooking) {
      if (activeUploadBooking.mediaType === 'image') {
        setMediaTypeTab('images');
      } else if (activeUploadBooking.mediaType === 'video') {
        setMediaTypeTab('videos');
      }
    }
  }, [activeUploadBooking]);
  
  // Local browser media preview state (before server upload)
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);
  const [localVideoPreviewUrl, setLocalVideoPreviewUrl] = useState('');

  // Prevent accidental tab refresh / close during active file uploads
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = 'Upload in progress. Please do not refresh or leave this page until completed.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading]);

  // Persist Active Tab
  useEffect(() => {
    localStorage.setItem('advertiserActiveTab', activeTab);
  }, [activeTab]);

  // Sync active upload booking when bookings array is fetched (preserves user activeTab choice)
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      const pendingUpload = bookings.find(b => b.paymentStatus === 'completed' && b.approvalStatus === 'pending' && (!b.mediaUrl || b.mediaUrl.trim() === ''));
      if (pendingUpload) {
        setActiveUploadBooking(pendingUpload);
      } else {
        setActiveUploadBooking(null);
      }
    }
  }, [bookings]);

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

  // Step 1: Handle local browser video file selection (Generates local preview only, no upload)
  const handleVideoFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const targetBooking = activeUploadBooking;
    const targetDeviceType = targetBooking ? targetBooking.deviceType : selectedDeviceType;

    if (!targetDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) first.');
      return;
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.mp4', '.webm'].includes(ext)) {
      showToast('error', 'Unsupported file type. Only MP4 and WEBM are allowed.');
      return;
    }

    // Inspect video duration locally before creating preview
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

    // Revoke old object URL if exists
    if (localVideoPreviewUrl) {
      URL.revokeObjectURL(localVideoPreviewUrl);
    }

    const blobUrl = URL.createObjectURL(file);
    setSelectedVideoFile(file);
    setLocalVideoPreviewUrl(blobUrl);
    showToast('info', 'Video selected! Preview your video below and click "Upload Ad" to proceed.');
  };

  const clearSelectedVideoFile = () => {
    if (localVideoPreviewUrl) {
      URL.revokeObjectURL(localVideoPreviewUrl);
    }
    setSelectedVideoFile(null);
    setLocalVideoPreviewUrl('');
  };

  // Step 2: Upload selected video file to server staging queue upon explicit button click
  const handleFileUpload = async () => {
    if (!selectedVideoFile) {
      showToast('error', 'Please select a video file first.');
      return;
    }

    const targetBooking = activeUploadBooking;
    const targetDeviceType = targetBooking ? targetBooking.deviceType : selectedDeviceType;

    if (!targetDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) before uploading.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      let uploadUrl = `${API_BASE}/ads/upload?deviceType=${targetDeviceType}`;
      if (targetBooking) {
        uploadUrl += `&bookingId=${targetBooking._id}`;
      }

      const response = await axios.post(uploadUrl, selectedVideoFile, {
        headers: {
          'Content-Type': selectedVideoFile.type || 'application/octet-stream',
          'X-Filename': selectedVideoFile.name,
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        const uploadedUrl = response.data.data?.url || '';
        showToast('success', 'Campaign ad creative uploaded and submitted for admin review!');
        
        // Update local bookings state array in memory immediately to prevent stale state race condition
        if (targetBooking) {
          setBookings(prev => prev.map(b => {
            if (b._id === targetBooking._id || b.bookingId === targetBooking.bookingId) {
              return { ...b, mediaUrl: uploadedUrl };
            }
            return b;
          }));
        }

        // Single point of final action: Clear upload state and return to My Campaigns tab
        setActiveUploadBooking(null);
        setSelectedVideoFile(null);
        setLocalVideoPreviewUrl('');
        setMediaUrl('');
        setActiveTab('bookings');
        localStorage.setItem('advertiserActiveTab', 'bookings');
        fetchBookings(token);
      } else {
        showToast('error', response.data.message || 'Upload failed.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to upload video file.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Local image file selection state (before server upload)
  const [selectedImageFiles, setSelectedImageFiles] = useState([]);
  const [localImagePreviewUrls, setLocalImagePreviewUrls] = useState([]);

  // Step 1: Handle local browser image file selection (Generates local preview only, no upload)
  const handleImageFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const targetBooking = activeUploadBooking;
    const targetDeviceType = targetBooking ? targetBooking.deviceType : selectedDeviceType;

    if (!targetDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) first.');
      return;
    }

    const availableSlots = 2 - selectedImageFiles.length;
    if (availableSlots <= 0) {
      showToast('error', 'You can select a maximum of 2 images per campaign.');
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    const validFiles = [];
    const validPreviews = [];

    filesToProcess.forEach(file => {
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        validFiles.push(file);
        validPreviews.push(URL.createObjectURL(file));
      } else {
        showToast('error', `Skipped ${file.name}: Only JPG, JPEG, PNG, and WEBP are allowed.`);
      }
    });

    if (validFiles.length > 0) {
      const updatedFiles = [...selectedImageFiles, ...validFiles];
      const updatedPreviews = [...localImagePreviewUrls, ...validPreviews];
      setSelectedImageFiles(updatedFiles);
      setLocalImagePreviewUrls(updatedPreviews);
      showToast('info', `${updatedFiles.length}/2 Images selected! Preview below and click "Upload Ad" to proceed.`);
    }

    if (e && e.target) e.target.value = '';
  };

  const removeSelectedImageFile = (idx) => {
    if (localImagePreviewUrls[idx]) {
      URL.revokeObjectURL(localImagePreviewUrls[idx]);
    }
    const updatedFiles = selectedImageFiles.filter((_, i) => i !== idx);
    const updatedPreviews = localImagePreviewUrls.filter((_, i) => i !== idx);
    setSelectedImageFiles(updatedFiles);
    setLocalImagePreviewUrls(updatedPreviews);
  };

  // Step 2: Upload selected image files to server via Sharp upon explicit "Upload Ad" button click
  const handleImageUpload = async () => {
    if (selectedImageFiles.length === 0) {
      showToast('error', 'Please select at least 1 image file first.');
      return;
    }

    const targetBooking = activeUploadBooking;
    const targetDeviceType = targetBooking ? targetBooking.deviceType : selectedDeviceType;

    if (!targetDeviceType) {
      showToast('error', 'Please select a Display Type (Tablet or Screen) before uploading.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const serverUrls = [];
      for (let i = 0; i < selectedImageFiles.length; i++) {
        const imgFile = selectedImageFiles[i];
        let uploadUrl = `${API_BASE}/ads/upload-image?deviceType=${targetDeviceType}&slotIndex=${i}${i === 0 ? '&isFirst=true' : ''}`;
        if (targetBooking) {
          uploadUrl += `&bookingId=${targetBooking._id}`;
        }

        const response = await axios.post(uploadUrl, imgFile, {
          headers: {
            'Content-Type': imgFile.type || 'application/octet-stream',
            'X-Filename': imgFile.name,
            'Authorization': `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(((i + (progressEvent.loaded / progressEvent.total)) * 100) / selectedImageFiles.length);
            setUploadProgress(percentCompleted);
          }
        });

        if (response.data.success && response.data.data.url) {
          serverUrls.push(response.data.data.url);
        }
      }

      setUploadedImages(serverUrls);
      const combinedUrlStr = serverUrls.join(', ');
      showToast('success', 'Campaign ad creative uploaded and submitted for admin review!');

      // Update local bookings state array in memory immediately to prevent stale state race condition
      if (targetBooking) {
        setBookings(prev => prev.map(b => {
          if (b._id === targetBooking._id || b.bookingId === targetBooking.bookingId) {
            return { ...b, mediaUrl: combinedUrlStr };
          }
          return b;
        }));
      }

      // Single point of final action: Clear upload state and return to My Campaigns tab
      setActiveUploadBooking(null);
      setSelectedImageFiles([]);
      setLocalImagePreviewUrls([]);
      setMediaUrl('');
      setActiveTab('bookings');
      localStorage.setItem('advertiserActiveTab', 'bookings');
      fetchBookings(token);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to upload image creative.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeUploadedImage = (indexToRemove) => {
    const updated = uploadedImages.filter((_, idx) => idx !== indexToRemove);
    setUploadedImages(updated);
    setMediaUrl(updated.join(', '));
  };

  // Compute calculated pricing amount
  useEffect(() => {
    if (!selectedOutlet || !selectedMediaType) {
      setComputedAmount(0);
      return;
    }
    const qty = parseInt(quantity, 10);
    const dur = parseInt(adDurationDays, 10);
    if (isNaN(qty) || qty < 1) {
      setComputedAmount(0);
      return;
    }

    let matchRate = rates.find(
      (r) =>
        r.deviceType === selectedOutlet.deviceType &&
        (r.mediaType ? r.mediaType === selectedMediaType : true) &&
        r.durationDays === dur &&
        r.frequency === frequency
    );

    if (!matchRate) {
      matchRate = rates.find(
        (r) =>
          r.deviceType === selectedOutlet.deviceType &&
          r.durationDays === dur &&
          r.frequency === frequency
      );
    }

    if (matchRate) {
      setComputedAmount(matchRate.amount * qty); // in paise
    } else {
      setComputedAmount(0);
    }
  }, [selectedOutlet, selectedMediaType, quantity, adDurationDays, frequency, rates]);

  // Handle Ad booking initiation (Paywall First)
  const handleInitiateBooking = async (e) => {
    e.preventDefault();

    if (!selectedOutlet) {
      showToast('error', 'Please select a target venue and display type.');
      return;
    }

    if (!selectedMediaType) {
      showToast('error', 'Please choose what you want to advertise (Static Image or Dynamic Video) first.');
      return;
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
      const redirectUrl = `${config.userPortalUrl}/advertiser`;
      const response = await axios.post(
        `${API_BASE}/ads/book`,
        {
          outletId: selectedOutlet._id,
          deviceType: selectedOutlet.deviceType,
          mediaType: selectedMediaType,
          quantity: bookingQty,
          adDurationDays: parseInt(adDurationDays, 10),
          frequency,
          mediaUrl: '', // Paywall first: media URL filled in subsequent upload phase
          adCategory,
          redirectUrl
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      showToast('success', 'Ad campaign created! Redirecting to payment gateway...');

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

  const handleVerifyPayment = async (bookingId, explicitToken = null, isAutoVerify = false) => {
    const activeToken = explicitToken || token;
    if (!activeToken) return;
    try {
      const res = await axios.post(`${API_BASE}/ads/verify-payment/${bookingId}`, {}, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const paymentStatus = res.data.data?.paymentStatus;

      if (paymentStatus === 'completed') {
        showToast('success', 'Payment verified successfully! Please upload your campaign ad creative below.');
        fetchBookings(activeToken);
        if (res.data.data) {
          setActiveUploadBooking(res.data.data);
          setActiveTab('new-booking');
        }
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
            onClick={() => {
              if (activeUploadBooking) {
                showToast('info', 'Please upload media creative for your confirmed booking first.');
                return;
              }
              setActiveTab('bookings');
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'bookings'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <ListVideo className={`w-3.5 h-3.5 fill-current ${activeTab === 'bookings' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span className="hidden sm:inline">My Campaigns</span>
          </button>
          <button
            onClick={() => {
              if (activeUploadBooking) {
                showToast('info', 'Please upload media creative for your confirmed booking first.');
                return;
              }
              setActiveTab('rates');
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'rates'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <IndianRupee className={`w-3.5 h-3.5 fill-current ${activeTab === 'rates' ? 'text-primary-foreground' : 'text-primary'}`} />
            <span className="hidden sm:inline">Ad Rates</span>
          </button>
          <button
            onClick={() => {
              if (activeUploadBooking) {
                showToast('info', 'Please upload media creative for your confirmed booking first.');
                return;
              }
              setActiveTab('new-booking');
            }}
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

                {bookings.length > 0 && roles.includes('merchant') && (
                  <div className="p-1.5 space-y-1 border-b border-border/40">
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
                                {booking.paymentStatus === 'completed' && booking.approvalStatus === 'pending' && (!booking.mediaUrl || booking.mediaUrl.trim() === '') && (
                                  <button
                                    onClick={() => {
                                      setActiveUploadBooking(booking);
                                      setActiveTab('new-booking');
                                    }}
                                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold rounded-xl transition-all text-[10px] cursor-pointer shadow-sm animate-pulse"
                                    title="Upload Ad Creative"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Upload Media</span>
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

                                  {/* Right Panel - Media Asset Action */}
                                  <div className="flex flex-col justify-center items-center p-4 rounded-xl border border-border/40 bg-muted/10 space-y-3 text-center">
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                      Media Creative Attachments
                                    </span>
                                    {booking.mediaUrl && booking.mediaUrl.trim() !== '' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveMediaUrl(booking.mediaUrl);
                                          setShowMediaModal(true);
                                        }}
                                        className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm w-full max-w-[220px]"
                                      >
                                        <Eye className="w-4 h-4" />
                                        <span>View Media Attachment</span>
                                      </button>
                                    ) : (
                                      <span className="text-xs font-semibold text-muted-foreground">No media attached yet</span>
                                    )}
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
          <div className="animate-fade-in max-w-4xl mx-auto p-4 sm:p-6 rounded-2xl bg-card border border-[#0069a8]/80 shadow-[0_0_20px_rgba(0,105,168,0.3)] dark:shadow-[0_0_35px_rgba(0,105,168,0.55)] space-y-6 transition-all duration-500">
            
            {activeUploadBooking ? (
              <div className="space-y-6 animate-fade-in">
                {/* ACTIVE PAID CAMPAIGN MEDIA UPLOAD PANEL */}
                <div className="border-b border-border/40 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h1 className="font-outfit text-2xl font-black text-foreground">Upload Media Creative</h1>
                    </div>
                    <p className="text-muted-foreground text-xs font-semibold">
                      Payment Confirmed for Booking #{activeUploadBooking._id?.slice(-8).toUpperCase()}. You must upload your ad video or image creative below before booking additional spots.
                    </p>
                  </div>
                </div>

                {/* Scheduled Processing Notification Banner */}
                {uploadSuccessMsg && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-start space-x-3 shadow-sm animate-fade-in">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-sm">Upload Status</p>
                      <p className="text-xs text-foreground/90 mt-0.5 leading-relaxed">{uploadSuccessMsg}</p>
                    </div>
                  </div>
                )}

                {/* Media Specifications & Content Policy Banner */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-medium space-y-3 text-foreground">
                  <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold uppercase text-[11px] tracking-wider">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Media Specs & Content Policy ({activeUploadBooking.deviceType === 'tablet' ? 'Tablet Kiosk 9:16' : 'Digital Wall Screen 16:9'})</span>
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed pl-6 space-y-1 font-semibold">
                    <p>• <strong>Aspect Ratio</strong>: {activeUploadBooking.deviceType === 'tablet' ? 'Portrait 10:16 / 9:16 (Vertical)' : 'Landscape 16:9 (Horizontal Widescreen)'}</p>
                    <p>• <strong>Video Format</strong>: Up to <strong>{config.maxVideoDurationSeconds || 30} seconds</strong> (MP4 / WEBM formats)</p>
                    <p>• <strong>Image Format</strong>: Up to <strong>2 Images</strong> (Front & Back switching creatives)</p>
                    <p>• <strong>Preferred Resolution</strong>: <strong>{activeUploadBooking.deviceType === 'tablet' ? '800 × 1280 px' : '1920 × 1080 px Full HD'}</strong></p>
                  </div>
                  <div className="pt-2.5 border-t border-blue-500/20 text-xs text-amber-600 dark:text-amber-400 font-semibold space-y-1 pl-6">
                    <p>⚠️ <strong>Prohibited Content Policy</strong>: Restaurants, rival dining venues, fast-food chains (Dominos, KFC), and food truck ads are strictly prohibited on dining kiosks. Misclassified ads will be rejected during manual admin review.</p>
                  </div>
                </div>

                {/* Modern Media Creative Type Header Badge */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign Creative Format</label>
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border shadow-sm flex items-center space-x-1.5 ${activeUploadBooking?.mediaType === 'image' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'}`}>
                      {activeUploadBooking?.mediaType === 'image' ? (
                        <span>🖼️ Paid Format: Static Image Ad</span>
                      ) : (
                        <span>🎬 Paid Format: Dynamic Video Ad</span>
                      )}
                    </span>
                  </div>

                  {activeUploadBooking?.mediaType !== 'image' ? (
                    <div className="space-y-4">
                      {/* MODERN TWO-STAGE VIDEO UPLOAD SECTION */}
                      {/* Step 1: File selection target */}
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 rounded-2xl p-6 cursor-pointer transition-all text-center bg-card/10 group">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <Video className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-sm font-bold text-foreground">
                          {selectedVideoFile ? `Selected: ${selectedVideoFile.name}` : 'Click to select ad video file (.mp4, .webm)'}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">Maximum duration: {config.maxVideoDurationSeconds || 30}s</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm"
                          onChange={handleVideoFileSelect}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>

                      {/* Step 2: Instant Client-Side Browser Preview Box */}
                      {localVideoPreviewUrl && !mediaUrl && (
                        <div className="p-4 rounded-xl border border-primary/40 bg-muted/20 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-foreground">Browser Media Preview (Not Uploaded Yet)</p>
                            <button
                              type="button"
                              onClick={clearSelectedVideoFile}
                              disabled={uploading}
                              className="text-xs text-destructive hover:underline font-bold flex items-center space-x-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Change Video</span>
                            </button>
                          </div>
                          <div className={`mx-auto w-full max-w-[260px] rounded-xl border border-border/40 bg-black overflow-hidden relative shadow-md ${activeUploadBooking?.deviceType === 'tablet' ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
                            <video src={localVideoPreviewUrl} controls className="w-full h-full object-contain" />
                          </div>

                          {uploading && (
                            <div className="space-y-1.5 pt-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                                <span>Uploading payload to server staging...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${uploadProgress === 100 ? 'bg-primary animate-pulse w-full' : 'bg-primary'}`}
                                  style={{ width: uploadProgress === 100 ? '100%' : `${uploadProgress}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-amber-500 font-semibold flex items-center justify-center pt-1">
                                ⚠️ Upload in progress. Please do not refresh or close this tab!
                              </p>
                            </div>
                          )}

                          {!uploading && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={handleFileUpload}
                                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                              >
                                <Upload className="w-4 h-4" />
                                <span>Upload Ad</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Final Uploaded Media Confirmation Box */}
                      {mediaUrl && (
                        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-foreground">Final Uploaded Video Asset</p>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">Staged & Scheduled</span>
                          </div>
                          <div className={`mx-auto w-full max-w-[260px] rounded-xl border border-border/40 bg-black overflow-hidden relative shadow-md ${activeUploadBooking?.deviceType === 'tablet' ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
                            <video src={resolveMediaUrl(mediaUrl)} controls className="w-full h-full object-contain" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* MODERN TWO-STAGE IMAGE UPLOAD SECTION */}
                      {/* Step 1: File selection target box */}
                      {selectedImageFiles.length < 2 && !mediaUrl && (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/5 rounded-2xl p-6 cursor-pointer transition-all text-center bg-card/10 group">
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Upload className="w-5 h-5 text-amber-500" />
                          </div>
                          <span className="text-sm font-bold text-foreground">
                            Click to select image file {selectedImageFiles.length + 1}/2 (.png, .jpg, .webp)
                          </span>
                          <input
                            type="file"
                            multiple
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleImageFileSelect}
                            disabled={uploading}
                            className="hidden"
                          />
                        </label>
                      )}

                      {/* Step 2: Instant Client-Side Browser Preview Box */}
                      {localImagePreviewUrls.length > 0 && !mediaUrl && (
                        <div className="p-4 rounded-xl border border-amber-500/40 bg-muted/20 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-foreground">Browser Media Preview (Not Uploaded Yet)</p>
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                              {localImagePreviewUrls.length}/2 Images Selected
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {localImagePreviewUrls.map((blobUrl, idx) => (
                              <div key={idx} className="border border-border/40 rounded-xl overflow-hidden bg-muted/20 p-2.5 space-y-2 relative">
                                <div className={`w-full rounded-lg bg-black overflow-hidden relative shadow-sm ${activeUploadBooking?.deviceType === 'tablet' ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
                                  <img src={blobUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-contain" />
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-foreground">{idx === 0 ? 'Front Creative' : 'Back Creative'}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeSelectedImageFile(idx)}
                                    disabled={uploading}
                                    className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          {uploading && (
                            <div className="space-y-1.5 pt-2">
                              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                                <span>Optimizing & uploading images...</span>
                                <span>{uploadProgress}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${uploadProgress === 100 ? 'bg-primary animate-pulse w-full' : 'bg-primary'}`}
                                  style={{ width: uploadProgress === 100 ? '100%' : `${uploadProgress}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-amber-500 font-semibold flex items-center justify-center pt-1">
                                ⚠️ Upload in progress. Please do not refresh or close this tab!
                              </p>
                            </div>
                          )}

                          {!uploading && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={handleImageUpload}
                                className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                              >
                                <Upload className="w-4 h-4" />
                                <span>Upload Ad</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Final Uploaded Media Confirmation Box */}
                      {(mediaUrl || activeUploadBooking?.mediaUrl) && (
                        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-3 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-foreground">Final Uploaded & Optimized Images</p>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">Optimized & Saved</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {((activeUploadBooking?.mediaUrl || mediaUrl || '').split(',').map(s => s.trim()).filter(Boolean)).map((imgItem, idx) => (
                              <div key={idx} className="border border-border/40 rounded-xl overflow-hidden bg-muted/20 p-2.5 space-y-2">
                                <div className={`w-full rounded-lg bg-black overflow-hidden relative shadow-sm ${activeUploadBooking?.deviceType === 'tablet' ? 'aspect-[3/4]' : 'aspect-[16/9]'}`}>
                                  <img src={resolveMediaUrl(imgItem)} alt={`Creative ${idx + 1}`} className="w-full h-full object-contain" />
                                </div>
                                <span className="text-xs font-bold text-foreground">{idx === 0 ? 'Front Creative (Image 1)' : 'Back Creative (Image 2)'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* CLEAN INITIAL BOOKING FORM (PAYWALL ENFORCED) */}
                <h1 className="font-outfit text-2xl font-black text-foreground mb-1">Book Advertising Spot</h1>
                <p className="text-muted-foreground text-xs font-semibold mb-6">Select your target venue outlet and duration to proceed to payment checkout.</p>

                {/* Step 1: Location selection */}
                <div className="space-y-4 m-0 p-0 border-none bg-transparent">
                  <h3 className="font-outfit text-md font-bold text-foreground flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-primary shrink-0" />
                    <span>Target Location & Venue</span>
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Select State</label>
                      <select
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          fetchCities(e.target.value);
                        }}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="">-- State --</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Select City</label>
                      <select
                        value={selectedCity}
                        disabled={!selectedState}
                        onChange={(e) => {
                          setSelectedCity(e.target.value);
                          fetchOutlets(e.target.value);
                        }}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
                      >
                        <option value="">-- City --</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Select Outlet Name</label>
                      <select
                        value={selectedOutletName}
                        disabled={!selectedCity}
                        onChange={(e) => {
                          const name = e.target.value;
                          setSelectedOutletName(name);
                          const matches = outlets.filter(o => o.outletName === name);
                          const devices = matches.map(o => o.deviceType);
                          setAvailableDeviceTypes(devices);
                          setSelectedDeviceType('');
                          setSelectedOutlet(null);
                        }}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
                      >
                        <option value="">-- Outlet --</option>
                        {Array.from(new Set(outlets.map(o => o.outletName))).map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Select Display Type</label>
                      <select
                        value={selectedDeviceType}
                        disabled={!selectedOutletName}
                        onChange={(e) => {
                          const devType = e.target.value;
                          setSelectedDeviceType(devType);
                          const matched = outlets.find(o => o.outletName === selectedOutletName && o.deviceType === devType);
                          setSelectedOutlet(matched || null);
                          setQuantity('1');
                        }}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-50"
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

                {/* Step 2: Creative Format Selection (Mandatory before unlocking Plan Section) */}
                <div className="space-y-4 pt-6 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <h3 className="font-outfit text-md font-bold text-foreground flex items-center">
                      <Layers className="w-4 h-4 mr-2 text-primary shrink-0" />
                      <span>Step 2: Choose What You Want to Advertise</span>
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                      Step 2 of 3
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Select your creative ad format. Static image plans are cheaper than dynamic video motion plans.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <button
                      type="button"
                      disabled={!selectedOutlet}
                      onClick={() => setSelectedMediaType('image')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${selectedMediaType === 'image'
                        ? 'border-emerald-500 bg-emerald-500/10 text-foreground shadow-md'
                        : 'border-border/60 hover:border-emerald-500/50 bg-card/10 text-muted-foreground'
                        } ${!selectedOutlet ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-2xl">🖼️</span>
                          {selectedMediaType === 'image' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                        </div>
                        <h4 className="font-bold text-xs text-foreground">Static Image Ad</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          Economical static banners (Upload up to 2 images for front & back display).
                        </p>
                      </div>
                      <span className="text-[9px] font-black uppercase text-emerald-500 mt-3">Affordable Static Rates</span>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedOutlet}
                      onClick={() => setSelectedMediaType('video')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${selectedMediaType === 'video'
                        ? 'border-purple-500 bg-purple-500/10 text-foreground shadow-md'
                        : 'border-border/60 hover:border-purple-500/50 bg-card/10 text-muted-foreground'
                        } ${!selectedOutlet ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-2xl">🎬</span>
                          {selectedMediaType === 'video' && <CheckCircle className="w-5 h-5 text-purple-500" />}
                        </div>
                        <h4 className="font-bold text-xs text-foreground">Dynamic Video Ad</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                          High-impact motion video clips (Up to 30s MP4/WEBM with sound).
                        </p>
                      </div>
                      <span className="text-[9px] font-black uppercase text-purple-500 mt-3">Premium Dynamic Rates</span>
                    </button>
                  </div>
                </div>

                {/* Step 3: Campaign Schedule & Pricing Package (Unlocked only when media type selected) */}
                {!selectedMediaType ? (
                  <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center space-x-3 mt-6">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>Please choose whether you want to advertise <strong>Static Image</strong> or <strong>Dynamic Video</strong> above to unlock pricing plans.</span>
                  </div>
                ) : (
                  <form onSubmit={handleInitiateBooking} className="space-y-4 pt-6 border-t border-border/40 mt-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="font-outfit text-md font-bold text-foreground flex items-center">
                        <CreditCard className="w-4 h-4 mr-2 text-primary shrink-0" />
                        <span>Step 3: Select Plan & Proceed to Pay ({selectedMediaType === 'image' ? '🖼️ Static Image Pricing' : '🎬 Dynamic Video Pricing'})</span>
                      </h3>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        Step 3 of 3
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Quantity of Devices</label>
                        <input
                          type="text"
                          required
                          value={quantity}
                          onChange={(e) => handleQuantityChange(e.target.value)}
                          className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        {selectedOutlet && (
                          <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Max available: {selectedOutlet.quantity}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Duration (Days)</label>
                        <select
                          value={adDurationDays}
                          onChange={(e) => setAdDurationDays(parseInt(e.target.value, 10))}
                          className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value={7}>7 Days Plan</option>
                          <option value={30}>30 Days Plan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Frequency</label>
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value)}
                          className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          {getAvailableFrequencies().map((freq) => (
                            <option key={freq} value={freq}>{getFrequencyLabel(freq)}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Ad Category</label>
                        <select
                          value={adCategory}
                          onChange={(e) => setAdCategory(e.target.value)}
                          className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="Electronics">Electronics & Gadgets</option>
                          <option value="RealEstate">Real Estate & Housing</option>
                          <option value="Automotive">Automotive & Vehicles</option>
                          <option value="Beverages">Beverages & Soft Drinks</option>
                          <option value="Fashion">Fashion & Apparel</option>
                          <option value="Finance">Finance & Banking</option>
                          <option value="Entertainment">Entertainment & Media</option>
                          <option value="Other">Other Commercial Brands</option>
                        </select>
                      </div>
                    </div>

                    {/* Submit Pay button */}
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={computedAmount === 0 || uploading}
                        className="w-full bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-bold py-4 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg cursor-pointer"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>
                          {computedAmount > 0
                            ? `Pay ₹${computedAmount / 100} via PhonePe Payment Gateway (${selectedMediaType === 'image' ? 'Static Image Rate' : 'Dynamic Video Rate'})`
                            : 'Select Plan to Calculate Price'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )}
      </main>



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
                  disabled={analyticsLoading || cooldownRemaining > 0}
                  className={`p-2 border border-border/40 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                    analyticsLoading || cooldownRemaining > 0
                      ? 'bg-muted/40 text-muted-foreground opacity-60 cursor-not-allowed'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer'
                  }`}
                  title={cooldownRemaining > 0 ? `Refresh available in ${cooldownRemaining}s` : "Refresh Live Data"}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">
                    {cooldownRemaining > 0 ? `Refresh (${cooldownRemaining}s)` : 'Refresh'}
                  </span>
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
                      <span className="text-[9px] text-muted-foreground font-semibold mt-1">Full Campaign Impressions</span>
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
                        <span>Playback Impression Log (Last 10 Plays)</span>
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-semibold">Auto-refreshes every 2m</span>
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

      {/* Media Creative Preview Modal Popup (Matching Admin Panel) */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-4xl bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-border/40">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="font-outfit text-base font-bold text-foreground">Media Creative Preview</h3>
              </div>
              <button
                onClick={() => {
                  setShowMediaModal(false);
                  setActiveMediaUrl('');
                }}
                className="p-1.5 hover:bg-muted border border-border/40 rounded-xl text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full flex-1 max-h-[60vh] md:max-h-[68vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-2">
              {activeMediaUrl ? (
                (() => {
                  const mediaUrls = activeMediaUrl.split(',').map(s => s.trim()).filter(Boolean);
                  const firstUrl = mediaUrls[0] || '';
                  const isVideo = firstUrl.endsWith('.mp4') || firstUrl.endsWith('.webm');

                  if (isVideo) {
                    return (
                      <video
                        key={firstUrl}
                        src={resolveMediaUrl(firstUrl)}
                        controls
                        className="w-full max-h-[60vh] md:max-h-[65vh] object-contain bg-black rounded-xl"
                      />
                    );
                  }

                  // Render Image / Dual-Image Preview Grid (Matching Admin Panel Popup Exactly)
                  return (
                    <div className="w-full flex justify-center items-center gap-4 py-4 overflow-x-auto">
                      {mediaUrls.map((rawUrl, idx) => {
                        const resolvedUrl = resolveMediaUrl(rawUrl);
                        return (
                          <div key={idx} className="flex flex-col items-center">
                            <div className="bg-black/80 rounded-xl border border-border/40 shadow-lg p-3 min-w-[200px] min-h-[160px] flex items-center justify-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={resolvedUrl}
                                alt={`Creative ${idx + 1}`}
                                style={{ maxWidth: mediaUrls.length > 1 ? '260px' : '400px', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                                onError={(e) => {
                                  console.error('Image load failed for URL:', resolvedUrl);
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
                            <span className="text-[10px] font-extrabold text-slate-300 mt-2 uppercase tracking-wider">
                              {mediaUrls.length > 1 ? (idx === 0 ? 'Front (Image 1)' : 'Back (Image 2)') : 'Image Asset'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground font-semibold text-xs">
                  No media URL provided
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
