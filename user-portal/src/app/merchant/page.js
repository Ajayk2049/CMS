'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  Building,
  CreditCard,
  Form,
  UtensilsCrossed,
  Send,
  Plus,
  Trash2,
  LogOut,
  Bell,
  Tablet,
  Clock,
  Tv,
  Sun,
  Moon,
  Megaphone,
  RefreshCw,
  X,
  Pencil,
  ChevronDown,
  ChevronUp,
  Settings,
  MonitorSmartphone,
  Salad,
  QrCode,
  CheckCircle,
  AlertCircle,
  Percent,
  Lock,
  Star,
  Video,
  Upload
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

const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

const STATE_ALIASES = {
  "chattisgarh": "Chhattisgarh",
  "orissa": "Odisha",
  "pondicherry": "Puducherry",
  "andaman & nicobar islands": "Andaman and Nicobar Islands",
  "andaman & nicobar": "Andaman and Nicobar Islands",
  "andaman and nicobar": "Andaman and Nicobar Islands",
  "dadra & nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman & diu": "Dadra and Nagar Haveli and Daman and Diu",
  "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
  "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  "uttaranchal": "Uttarakhand"
};

const normalizeAndMatchState = (apiState) => {
  if (!apiState) return "";

  const cleanApi = apiState.trim().toLowerCase();

  // 1. Check direct aliases map
  if (STATE_ALIASES[cleanApi]) {
    return STATE_ALIASES[cleanApi];
  }

  // 2. Check case-insensitive exact match
  const exactMatch = INDIAN_STATES.find(s => s.toLowerCase() === cleanApi);
  if (exactMatch) return exactMatch;

  // Helper to normalize strings for comparison
  const normalize = (str) => {
    return str
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]/g, "");
  };

  const normalizedApi = normalize(cleanApi);

  // 3. Try to match normalized strings
  const fuzzyMatch = INDIAN_STATES.find(s => normalize(s) === normalizedApi);
  if (fuzzyMatch) return fuzzyMatch;

  // 4. Substring matching
  const substringMatch = INDIAN_STATES.find(s => {
    const normalizedState = normalize(s);
    return normalizedState.includes(normalizedApi) || normalizedApi.includes(normalizedState);
  });
  if (substringMatch) return substringMatch;

  return "";
};

export default function MerchantDashboard() {
  const router = useRouter();

  const [theme, setTheme] = useState('dark');
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState('applications');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  const [zipError, setZipError] = useState('');
  const [roleActionLoading, setRoleActionLoading] = useState(false);
  const [showBecomeAdvertiserModal, setShowBecomeAdvertiserModal] = useState(false);
  const [showGetMoreDevicesModal, setShowGetMoreDevicesModal] = useState(false);
  const [showEditApplicationModal, setShowEditApplicationModal] = useState(false);
  const [editingApplicationId, setEditingApplicationId] = useState('');
  const [editAppForm, setEditAppForm] = useState({
    outletName: '',
    outletDescription: '',
    doorNo: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    contactPerson: '',
    phone: '',
    email: ''
  });
  const [editAppZipError, setEditAppZipError] = useState('');
  const [editAppLoading, setEditAppLoading] = useState(false);
  const [editAppError, setEditAppError] = useState('');
  const [reqRequestTablet, setReqRequestTablet] = useState(false);
  const [reqTabletQuantity, setReqTabletQuantity] = useState('1');
  const [reqRequestScreen, setReqRequestScreen] = useState(false);
  const [reqScreenQuantity, setReqScreenQuantity] = useState('1');
  const [reqDeviceLoading, setReqDeviceLoading] = useState(false);
  const [reqDeviceError, setReqDeviceError] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showGlobalTaxesModal, setShowGlobalTaxesModal] = useState(false);
  const [globalGstInput, setGlobalGstInput] = useState('0');
  const [globalOtherChargesInput, setGlobalOtherChargesInput] = useState('0');
  const [globalOtherChargesType, setGlobalOtherChargesType] = useState('percentage');
  const [globalTaxesLoading, setGlobalTaxesLoading] = useState(false);
  const [globalTaxesError, setGlobalTaxesError] = useState('');
  const [menuDefaultGst, setMenuDefaultGst] = useState(0);
  const [menuDefaultOtherCharges, setMenuDefaultOtherCharges] = useState(0);
  const [menuDefaultOtherChargesType, setMenuDefaultOtherChargesType] = useState('percentage');
  const [deviceFilterType, setDeviceFilterType] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('deviceFilterType') || 'tablet';
    }
    return 'tablet';
  });
  const [deviceFilterVenue, setDeviceFilterVenue] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('deviceFilterVenue') || '';
    }
    return '';
  });

  // Applications tab states
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({
    outletName: '',
    outletDescription: '',
    doorNo: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    contactPerson: '',
    phone: '',
    email: '',
    requestTablet: false,
    tabletQuantity: '1',
    requestScreen: false,
    screenQuantity: '1',
    adMode: 'open',
    allowOpenAds: true
  });

  // Menu tab states
  const [menuItems, setMenuItems] = useState([]);
  const originalMenuRef = useRef(null);
  const [selectedOutletId, setSelectedOutletId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedOutletId') || '';
    }
    return '';
  });
  const approvedOutlets = applications.filter(app => app.status === 'approved' && app.requestTablet);
  const hasApprovedVenue = applications.some(app => app.status === 'approved');
  const [devices, setDevices] = useState([]);

  // Venue Promos Tab states
  const [promosList, setPromosList] = useState([]);
  const [promoQuotaStats, setPromoQuotaStats] = useState({
    maxVideoSlots: 2,
    maxImageSlots: 5,
    maxScreenVideoSlots: 2,
    maxScreenImageSlots: 5,
    maxScreenSlots: 3,
    dailyVideoQuota: 4,
    dailyImageQuota: 10,
    dailyScreenVideoQuota: 4,
    dailyScreenImageQuota: 10,
    dailyScreenQuota: 6,
    dailyVideoChangesRemaining: 4,
    dailyImageChangesRemaining: 10,
    dailyScreenVideoChangesRemaining: 4,
    dailyScreenImageChangesRemaining: 10,
    dailyScreenChangesRemaining: 6,
    isPaused: false,
    isRevoked: false
  });
  const [promoDraftSlots, setPromoDraftSlots] = useState({});
  const [isStreamingPromos, setIsStreamingPromos] = useState(false);
  const [activePromoSubTab, setActivePromoSubTab] = useState('tablet'); // 'tablet' | 'screen'

  // Menu Modal and editing states
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [modalForm, setModalForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Starters',
    isAvailable: true,
    imageUrl: '',
    isVeg: true,
    isPopular: false
  });
  const [zoomFactor, setZoomFactor] = useState(100);
  const [imageTab, setImageTab] = useState('upload');
  const fileInputRef = useRef(null);
  const userMenuRef = useRef(null);

  const [menuCategories, setMenuCategories] = useState(['Starters', 'Main Course', 'Dessert', 'Beverages']);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeOrderVenueTab, setActiveOrderVenueTab] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeOrderVenueTab') || '';
    }
    return '';
  });
  const [unreadOrderVenues, setUnreadOrderVenues] = useState(new Set());
  const activeOrderVenueTabRef = useRef(activeOrderVenueTab);

  const getCategoryDotColor = (category) => {
    const cat = category.toLowerCase();
    if (cat.includes('starter')) return 'bg-purple-500';
    if (cat.includes('main')) return 'bg-emerald-500';
    if (cat.includes('dessert')) return 'bg-yellow-500';
    if (cat.includes('beverag') || cat.includes('drink')) return 'bg-pink-500';
    return 'bg-muted-foreground';
  };

  // Orders tab states (WebSocket)
  const [orders, setOrders] = useState([]);
  const wsRef = useRef(null);

  // Payment tab states
  const [paymentConfig, setPaymentConfig] = useState({ hasUpiId: false, upiId: '' });
  const [paymentUpiInput, setPaymentUpiInput] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [paymentTab, setPaymentTab] = useState('config'); // 'config' or 'history'
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [tempUpiInput, setTempUpiInput] = useState('');
  const [isUpiVerified, setIsUpiVerified] = useState(false);
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [savedUpiList, setSavedUpiList] = useState([]);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [tempPayeeName, setTempPayeeName] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalInfo, setModalInfo] = useState('');
  const [confirmingPaymentOrderId, setConfirmingPaymentOrderId] = useState(null);

  // Security Password Modal for UPI Config
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordVerifyError, setPasswordVerifyError] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

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
    if (typeof window !== 'undefined') {
      localStorage.setItem('deviceFilterType', deviceFilterType);
    }
  }, [deviceFilterType]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deviceFilterVenue', deviceFilterVenue);
    }
  }, [deviceFilterVenue]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedOutletId', selectedOutletId);
    }
  }, [selectedOutletId]);

  useEffect(() => {
    activeOrderVenueTabRef.current = activeOrderVenueTab;
  }, [activeOrderVenueTab]);

  useEffect(() => {
    if (approvedOutlets.length > 0 && !activeOrderVenueTab) {
      setActiveOrderVenueTab(approvedOutlets[0]._id);
    }
  }, [approvedOutlets, activeOrderVenueTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeOrderVenueTab', activeOrderVenueTab);
    }
  }, [activeOrderVenueTab]);

  useEffect(() => {
    if (approvedOutlets.length > 0 && !selectedOutletId) {
      setSelectedOutletId(approvedOutlets[0]._id);
    }
  }, [approvedOutlets, selectedOutletId]);

  useEffect(() => {
    if (selectedOutletId) {
      const stored = localStorage.getItem(`merchant_upi_list_${selectedOutletId}`);
      if (stored) {
        setSavedUpiList(JSON.parse(stored));
      } else {
        if (paymentConfig.upiId) {
          const initialList = [{ upiId: paymentConfig.upiId, payeeName: paymentConfig.payeeName || '', verified: true }];
          setSavedUpiList(initialList);
          localStorage.setItem(`merchant_upi_list_${selectedOutletId}`, JSON.stringify(initialList));
        } else {
          setSavedUpiList([]);
        }
      }
    }
  }, [selectedOutletId, paymentConfig.upiId]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [userMenuOpen]);

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

    if (role !== 'merchant') {
      if (storedRoles.includes('merchant')) {
        axios.post(`${API_BASE}/auth/switch-role`, { role: 'merchant' }, {
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
      if (role === 'advertiser') {
        router.push('/advertiser');
      } else {
        localStorage.clear();
        router.push('/login');
      }
      return;
    }

    const savedTab = localStorage.getItem('merchantActiveTab');
    if (savedTab) {
      setActiveTab(savedTab);
    }

    setToken(storedToken);
    setPhone(storedPhone);
    setName(localStorage.getItem('name') || '');
    setRoles(storedRoles);

    fetchApplications(storedToken);
    fetchDevices(storedToken);
    fetchPaymentOrders(storedToken);
    fetchLiveOrders(storedToken);
    setupWebSocket(storedToken);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [router]);

  // Persist Active Tab
  useEffect(() => {
    localStorage.setItem('merchantActiveTab', activeTab);
    if (activeTab === 'payment' && token) {
      fetchPaymentOrders(token);
      if (selectedOutletId) {
        fetchPaymentConfig(token, selectedOutletId);
      }
    }
    if ((activeTab === 'promos' || selectedOutletId) && token) {
      fetchHostPromos(selectedOutletId);
    }
  }, [activeTab, token, selectedOutletId]);

  // Warn user if refreshing/closing tab during active promo streaming uploads
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isStreamingPromos) {
        e.preventDefault();
        e.returnValue = 'Active promo upload in progress. Are you sure you want to leave? Your changes may not be saved.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isStreamingPromos]);

  // Calculate real-time staged promo file uploads in local browser memory
  const stagedVideoUploadsCount = useMemo(() => {
    return Object.keys(promoDraftSlots).filter(k => {
      const item = promoDraftSlots[k];
      return k.startsWith('video_') && item?.fileObj && !item?.isDeleted;
    }).length;
  }, [promoDraftSlots]);

  const stagedImageUploadsCount = useMemo(() => {
    return Object.keys(promoDraftSlots).filter(k => {
      const item = promoDraftSlots[k];
      return k.startsWith('image_') && item?.fileObj && !item?.isDeleted;
    }).length;
  }, [promoDraftSlots]);

  const stagedScreenVideoUploadsCount = useMemo(() => {
    return Object.keys(promoDraftSlots).filter(k => {
      const item = promoDraftSlots[k];
      return (k.startsWith('screen_video_') || k.startsWith('screen_')) && item?.fileObj && item?.mediaType === 'video' && !item?.isDeleted;
    }).length;
  }, [promoDraftSlots]);

  const stagedScreenImageUploadsCount = useMemo(() => {
    return Object.keys(promoDraftSlots).filter(k => {
      const item = promoDraftSlots[k];
      return (k.startsWith('screen_image_') || k.startsWith('screen_')) && item?.fileObj && item?.mediaType === 'image' && !item?.isDeleted;
    }).length;
  }, [promoDraftSlots]);

  // Derived real-time remaining quota values reflecting local browser staged uploads instantly
  const effectiveTabletVideoRemaining = Math.max(0, (promoQuotaStats.dailyVideoChangesRemaining ?? promoQuotaStats.dailyVideoQuota ?? 4) - stagedVideoUploadsCount);
  const effectiveTabletImageRemaining = Math.max(0, (promoQuotaStats.dailyImageChangesRemaining ?? promoQuotaStats.dailyImageQuota ?? 10) - stagedImageUploadsCount);

  const effectiveScreenVideoRemaining = Math.max(0, (promoQuotaStats.dailyScreenVideoChangesRemaining ?? promoQuotaStats.dailyScreenVideoQuota ?? 4) - stagedScreenVideoUploadsCount);
  const effectiveScreenImageRemaining = Math.max(0, (promoQuotaStats.dailyScreenImageChangesRemaining ?? promoQuotaStats.dailyScreenImageQuota ?? 10) - stagedScreenImageUploadsCount);

  // Fetch host applications
  const [isFetchingApps, setIsFetchingApps] = useState(false);
  const fetchApplications = async (authToken) => {
    if (isFetchingApps) return;
    setIsFetchingApps(true);
    try {
      const res = await axios.get(`${API_BASE}/host/applications`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setApplications(res.data.data);
      const approvedApps = res.data.data.filter(app => app.status === 'approved' && app.requestTablet);
      if (approvedApps.length > 0) {
        setSelectedOutletId((prev) => prev || approvedApps[0]._id);
      }
      const hasApproved = res.data.data.some(app => app.status === 'approved');
      const approvedTabletApp = res.data.data.find(app => app.status === 'approved' && app.requestTablet);
      const savedTab = localStorage.getItem('merchantActiveTab');
      if (hasApproved) {
        if (approvedTabletApp) {
          if (!savedTab || savedTab === 'applications' || savedTab === 'my-applications') {
            setActiveTab('orders');
          } else {
            setActiveTab(savedTab);
          }
        } else {
          // Screens only - force to Devices
          setActiveTab('devices');
        }
      } else {
        if (res.data.data.length > 0) {
          setActiveTab('my-applications');
        } else {
          setActiveTab('applications');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFetchingApps(false);
    }
  };

  // Fetch merchant's provisioned devices
  const fetchDevices = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/host/devices`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setDevices(res.data.data);
    } catch (err) {
      console.error('fetchDevices Error:', err);
    }
  };

  // Fetch payment config
  const fetchPaymentConfig = async (authToken, outletId) => {
    if (!outletId) return;
    try {
      const res = await axios.get(`${API_BASE}/host/payment-config`, {
        params: { hostApplicationId: outletId },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setPaymentConfig(res.data.data);
      setPaymentUpiInput(res.data.data.upiId || '');
    } catch (err) {
      console.error('fetchPaymentConfig Error:', err);
    }
  };

  // Fetch payment order history
  const fetchPaymentOrders = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/host/orders`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const completed = (res.data.data || []).filter(
        ord => ord.paymentStatus === 'completed'
      );
      setPaymentOrders(completed);
    } catch (err) {
      console.error('fetchPaymentOrders Error:', err);
    }
  };

  // Fetch live orders (active ones only)
  const fetchLiveOrders = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/host/orders`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const live = (res.data.data || []).filter(
        ord => ord.tableStatus !== 'completed' && ord.tableStatus !== 'completed_acked'
      );
      setOrders(live);
    } catch (err) {
      console.error('fetchLiveOrders Error:', err);
    }
  };

  // Save payment config
  const savePaymentConfig = async () => {
    if (!selectedOutletId || !paymentUpiInput || !paymentUpiInput.includes('@')) return;
    setPaymentSaving(true);
    try {
      await axios.put(`${API_BASE}/host/payment-config`, {
        hostApplicationId: selectedOutletId,
        upiId: paymentUpiInput.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPaymentConfig({ hasUpiId: true, upiId: paymentUpiInput.trim() });
    } catch (err) {
      console.error('savePaymentConfig Error:', err);
    } finally {
      setPaymentSaving(false);
    }
  };

  // Order actions
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.post(`${API_BASE}/host/orders/update-status`, { orderId, orderStatus: newStatus }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
      fetchPaymentOrders(token);
    } catch (err) {
      console.error('updateOrderStatus Error:', err);
    }
  };

  const confirmOrder = async (orderId) => {
    try {
      await axios.post(`${API_BASE}/host/orders/confirm`, { orderId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
      fetchPaymentOrders(token);
    } catch (err) { console.error(err); }
  };

  const closeTable = async (orderId) => {
    try {
      await axios.post(`${API_BASE}/host/orders/close-table`, { orderId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
      fetchPaymentOrders(token);
    } catch (err) { console.error(err); }
  };

  const markPaymentReceived = async (orderId) => {
    try {
      await axios.post(`${API_BASE}/host/orders/payment-received`, { orderId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
      fetchPaymentOrders(token);
    } catch (err) { console.error(err); }
  };

  const serviceWaiter = async (orderId) => {
    try {
      await axios.post(`${API_BASE}/host/orders/service-waiter`, { orderId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
      fetchPaymentOrders(token);
    } catch (err) { console.error('serviceWaiter error:', err); }
  };

  const handleVerifyPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!confirmPasswordInput.trim()) {
      setPasswordVerifyError('Account password is required');
      return;
    }
    setPasswordVerifyError('');
    setIsVerifyingPassword(true);
    try {
      await axios.post(`${API_BASE}/host/verify-password`, { password: confirmPasswordInput }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowPasswordModal(false);
      setConfirmPasswordInput('');
      setShowUpiModal(true);
    } catch (err) {
      setPasswordVerifyError(err.response?.data?.message || 'Incorrect account password');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleVerifyUpi = () => {
    if (!tempUpiInput.includes('@')) return;
    const upiToCheck = tempUpiInput.trim().toLowerCase();
    if (savedUpiList.some(item => item && item.upiId && item.upiId.toLowerCase() === upiToCheck)) {
      setModalError('This UPI ID is already added.');
      setIsUpiVerified(false);
      return;
    }
    setIsVerifyingUpi(true);
    setModalError('');
    setModalInfo('');
    setTimeout(() => {
      setIsVerifyingUpi(false);
      setIsUpiVerified(true);
      setModalInfo('UPI ID format verified successfully.');
    }, 800);
  };

  const handleQrCodeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingQr(true);
    setModalError('');
    setModalInfo('');
    setIsUpiVerified(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await axios.post(`${API_BASE}/host/payment-config/upload-qr`, arrayBuffer, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream'
        }
      });

      if (res.data.success) {
        const decodedUpi = (res.data.data.upiId || '').trim();
        if (savedUpiList.some(item => item && item.upiId && item.upiId.toLowerCase() === decodedUpi.toLowerCase())) {
          setModalError('This UPI ID is already added.');
          setTempUpiInput('');
          setTempPayeeName('');
          setIsUpiVerified(false);
          return;
        }
        setTempUpiInput(res.data.data.upiId || '');
        setTempPayeeName(res.data.data.payeeName || '');
        setIsUpiVerified(true);
        setModalInfo('QR Code successfully decrypted and verified.');
      }
    } catch (err) {
      console.error('handleQrCodeUpload Error:', err);
      setModalError(err.response?.data?.message || 'Failed to decode QR code. Please upload a direct payment QR image.');
      setIsUpiVerified(false);
    } finally {
      setIsUploadingQr(false);
      e.target.value = '';
    }
  };

  const handleSaveNewUpi = () => {
    if (!isUpiVerified || !tempUpiInput) return;
    const upiToAdd = tempUpiInput.trim();
    const payeeToAdd = tempPayeeName.trim();
    if (savedUpiList.some(item => item && item.upiId && item.upiId.toLowerCase() === upiToAdd.toLowerCase())) {
      setModalError('This UPI ID is already added.');
      return;
    }
    setSavedUpiList(prev => {
      if (prev.some(item => item.upiId === upiToAdd)) return prev;
      const newList = [...prev, { upiId: upiToAdd, payeeName: payeeToAdd, verified: true }];
      localStorage.setItem(`merchant_upi_list_${selectedOutletId}`, JSON.stringify(newList));
      return newList;
    });
    setTempUpiInput('');
    setTempPayeeName('');
    setIsUpiVerified(false);
    setModalInfo('UPI ID saved successfully.');
  };

  const handleSelectActiveUpi = async (upiId, payeeName) => {
    setPaymentSaving(true);
    try {
      await axios.put(`${API_BASE}/host/payment-config`, {
        hostApplicationId: selectedOutletId,
        upiId: upiId,
        payeeName: payeeName || ''
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPaymentConfig({ hasUpiId: true, upiId });
    } catch (err) {
      console.error('handleSelectActiveUpi Error:', err);
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleDeleteUpi = (upiIdToDelete) => {
    if (!window.confirm("Are you sure you want to delete this UPI configuration?")) return;
    setTimeout(() => {
      setSavedUpiList(prev => {
        const newList = prev.filter(item => item && item.upiId !== upiIdToDelete);
        localStorage.setItem(`merchant_upi_list_${selectedOutletId}`, JSON.stringify(newList));
        return newList;
      });
      if (paymentConfig?.upiId === upiIdToDelete) {
        setPaymentConfig({ hasUpiId: false, upiId: '' });
        axios.put(`${API_BASE}/host/payment-config`, {
          hostApplicationId: selectedOutletId,
          upiId: '',
          payeeName: ''
        }, { headers: { Authorization: `Bearer ${token}` } }).catch(err => console.error(err));
      }
    }, 0);
  };

  // Fetch menu
  const fetchMenu = async (authToken, outletId) => {
    if (!outletId) return;
    try {
      const res = await axios.get(`${API_BASE}/host/menu`, {
        params: { hostApplicationId: outletId },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const items = res.data.data.items || [];
      const categories = res.data.data.categories || ['Starters', 'Main Course', 'Dessert', 'Beverages'];
      const defaultGst = res.data.data.defaultGst || 0;
      const defaultOtherCharges = res.data.data.defaultOtherCharges || 0;
      const defaultOtherChargesType = res.data.data.defaultOtherChargesType || 'percentage';

      setMenuItems(items);
      setMenuCategories(categories);
      setMenuDefaultGst(defaultGst);
      setMenuDefaultOtherCharges(defaultOtherCharges);
      setMenuDefaultOtherChargesType(defaultOtherChargesType);

      originalMenuRef.current = JSON.stringify({
        items,
        categories,
        defaultGst,
        defaultOtherCharges,
        defaultOtherChargesType
      });
    } catch (err) {
      console.error(err);
      setMenuItems([]);
      originalMenuRef.current = null;
    }
  };

  useEffect(() => {
    if (token && selectedOutletId) {
      fetchMenu(token, selectedOutletId);
      fetchPaymentConfig(token, selectedOutletId);
    }
  }, [token, selectedOutletId]);

  // Setup WebSocket connection
  const setupWebSocket = (authToken) => {
    try {
      const ws = new WebSocket(`${config.wsUrl}/ws/orders?token=${authToken}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.event === 'new_order' || payload.event === 'waiter_call' || payload.event === 'waiter_serviced') {
          fetchLiveOrders(authToken);
          fetchPaymentOrders(authToken);
          if (payload.event === 'new_order' && payload.data.hostApplicationId && payload.data.hostApplicationId !== activeOrderVenueTabRef.current) {
            setUnreadOrderVenues(prev => {
              const next = new Set(prev);
              next.add(payload.data.hostApplicationId);
              return next;
            });
          }
        }
      };

      ws.onclose = () => {
        console.log('[WS] Closed. Reconnecting in 5s...');
        setTimeout(() => setupWebSocket(authToken), 5000);
      };
    } catch (err) {
      console.error('[WS] Setup failed:', err.message);
    }
  };

  // Numeric input constraints
  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 10) return;
    if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) return;
    setForm(prev => ({ ...prev, phone: cleaned }));
  };

  const handleZipCodeChange = async (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 6) return;
    setForm(prev => ({ ...prev, zipCode: cleaned }));

    if (cleaned.length < 6) {
      setZipError('');
    }

    if (cleaned.length === 6) {
      try {
        const response = await axios.get(`https://api.postalpincode.in/pincode/${cleaned}`);
        if (response && response.data && response.data[0]) {
          const status = response.data[0].Status;
          if (status === 'Success') {
            const postOffices = response.data[0].PostOffice;
            if (postOffices && postOffices.length > 0) {
              const { State, District } = postOffices[0];
              // Match returned state with INDIAN_STATES using robust normalization
              const matchedState = normalizeAndMatchState(State);

              setForm(prev => ({
                ...prev,
                state: matchedState,
                city: District || prev.city
              }));
              setZipError('');
            } else {
              setZipError('Wrong pincode');
            }
          } else {
            setZipError('Wrong pincode');
          }
        } else {
          setZipError('Wrong pincode');
        }
      } catch (err) {
        console.error('Failed to auto-populate location details from pincode:', err);
        setZipError('Wrong pincode');
      }
    }
  };

  const handleQuantityChange = (field, val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned === '0') return;
    setForm(prev => ({ ...prev, [field]: cleaned }));
  };

  // Submit Host Applications
  const handleHostApply = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!form.requestTablet && !form.requestScreen) {
      setError('Please select at least one type of device to request');
      return;
    }

    if (form.phone.length !== 10) {
      setError('Mobile number must be exactly 10 digits');
      return;
    }

    if (form.zipCode.length !== 6) {
      setError('ZIP code must be exactly 6 digits');
      return;
    }

    if (zipError) {
      setError('Please resolve the wrong pincode error before submitting');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        outletName: form.outletName,
        outletDescription: form.outletDescription,
        doorNo: form.doorNo,
        street: form.street,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        contactPerson: form.contactPerson,
        phone: form.phone,
        email: form.email,
        requestTablet: !!form.requestTablet,
        tabletQuantity: form.requestTablet ? parseInt(form.tabletQuantity, 10) : 0,
        requestScreen: !!form.requestScreen,
        screenQuantity: form.requestScreen ? parseInt(form.screenQuantity, 10) : 0,
        adMode: form.adMode || 'open',
        allowOpenAds: form.allowOpenAds !== undefined ? !!form.allowOpenAds : true
      };

      await axios.post(`${API_BASE}/host/apply`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInfo('Host application submitted successfully! Pending admin approval.');
      fetchApplications(token);
      fetchDevices(token);

      // Clear form
      setForm({
        outletName: '',
        outletDescription: '',
        doorNo: '',
        street: '',
        city: '',
        state: '',
        zipCode: '',
        contactPerson: '',
        phone: '',
        email: '',
        requestTablet: false,
        tabletQuantity: '1',
        requestScreen: false,
        screenQuantity: '1'
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit host application.');
    } finally {
      setLoading(false);
    }
  };

  // Save restaurant menu items
  const handleSaveMenu = async () => {
    if (!selectedOutletId) {
      showToast('Please select an approved outlet to save the menu.', 'error');
      return;
    }

    try {
      await axios.post(`${API_BASE}/host/menu`, {
        hostApplicationId: selectedOutletId,
        items: menuItems,
        categories: menuCategories,
        defaultGst: menuDefaultGst,
        defaultOtherCharges: menuDefaultOtherCharges,
        defaultOtherChargesType: menuDefaultOtherChargesType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      originalMenuRef.current = JSON.stringify({
        items: menuItems,
        categories: menuCategories,
        defaultGst: menuDefaultGst,
        defaultOtherCharges: menuDefaultOtherCharges,
        defaultOtherChargesType: menuDefaultOtherChargesType
      });
      // Force update state trigger
      setMenuItems([...menuItems]);

      showToast('Menu saved successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save menu.', 'error');
    }
  };

  const handleSaveCategories = async (updatedCategories) => {
    if (!selectedOutletId) {
      showToast('Please select an approved outlet first.', 'error');
      return;
    }
    try {
      await axios.post(`${API_BASE}/host/menu`, {
        hostApplicationId: selectedOutletId,
        items: menuItems,
        categories: updatedCategories,
        defaultGst: menuDefaultGst,
        defaultOtherCharges: menuDefaultOtherCharges,
        defaultOtherChargesType: menuDefaultOtherChargesType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenuCategories(updatedCategories);

      originalMenuRef.current = JSON.stringify({
        items: menuItems,
        categories: updatedCategories,
        defaultGst: menuDefaultGst,
        defaultOtherCharges: menuDefaultOtherCharges,
        defaultOtherChargesType: menuDefaultOtherChargesType
      });
      setMenuItems([...menuItems]);

      showToast('Menu categories updated successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save menu categories.', 'error');
    }
  };

  const fetchHostPromos = async (outletId) => {
    const targetOutlet = outletId || selectedOutletId;
    if (!targetOutlet) return;
    try {
      const res = await axios.get(`${API_BASE}/host/promos?hostApplicationId=${targetOutlet}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPromosList(res.data.data.promos || []);
        if (res.data.data.quotaStats) {
          setPromoQuotaStats(res.data.data.quotaStats);
        }
        const draftMap = {};
        (res.data.data.promos || []).forEach(p => {
          draftMap[`${p.slotType}_${p.slotIndex}`] = {
            title: p.title || '',
            mediaUrl: p.mediaUrl || '',
            mediaType: p.mediaType || p.slotType,
            previewUrl: p.mediaUrl ? (p.mediaUrl.startsWith('http') ? p.mediaUrl : `${API_BASE.replace('/api/v1', '')}${p.mediaUrl}`) : '',
            fileObj: null,
            isModified: false,
            isDeleted: false
          };
        });
        setPromoDraftSlots(draftMap);
      }
    } catch (err) {
      console.error('Failed to fetch host promos:', err);
    }
  };

  const handleSelectPromoFile = (slotType, slotIndex, file) => {
    if (!file) return;
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isVid = ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
    const isImg = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

    if ((slotType === 'image' || slotType === 'screen_image') && !isImg) {
      showToast('Unsupported image format. Allowed: JPG, JPEG, PNG, WEBP.', 'error');
      return;
    }
    if ((slotType === 'video' || slotType === 'screen_video') && !isVid) {
      showToast('Unsupported video format. Allowed: MP4, WEBM, MOV.', 'error');
      return;
    }
    if (slotType === 'screen' && !isVid && !isImg) {
      showToast('Unsupported media format. Allowed: MP4, WEBM, JPG, PNG, WEBP.', 'error');
      return;
    }

    if (isVid && file.size > 104857600) {
      showToast('Video size exceeds 100MB limit.', 'error');
      return;
    }
    if (isImg && file.size > 10485760) {
      showToast('Image size exceeds 10MB limit.', 'error');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const key = `${slotType}_${slotIndex}`;

    setPromoDraftSlots(prev => ({
      ...prev,
      [key]: {
        title: prev[key]?.title || (file.name.replace(/\.[^/.]+$/, '')),
        mediaUrl: prev[key]?.mediaUrl || '',
        mediaType: isVid ? 'video' : 'image',
        previewUrl: localPreviewUrl,
        fileObj: file,
        isModified: true,
        isDeleted: false
      }
    }));
  };

  const handleClearPromoSlot = (slotType, slotIndex) => {
    const key = `${slotType}_${slotIndex}`;
    setPromoDraftSlots(prev => ({
      ...prev,
      [key]: {
        title: '',
        mediaUrl: '',
        mediaType: slotType,
        previewUrl: '',
        fileObj: null,
        isModified: true,
        isDeleted: true
      }
    }));
  };

  const handleStreamAds = async () => {
    if (!selectedOutletId) {
      showToast('Please select an outlet first.', 'error');
      return;
    }

    const modifiedKeys = Object.keys(promoDraftSlots).filter(k => promoDraftSlots[k]?.isModified);
    if (modifiedKeys.length === 0) {
      showToast('No unsaved promo changes to stream.', 'info');
      return;
    }

    // Sort modified keys so Image files upload FIRST and Video files upload SECOND
    const imageKeys = modifiedKeys.filter(k => {
      const item = promoDraftSlots[k];
      return item.fileObj && (item.mediaType === 'image' || k.includes('image'));
    });
    const videoKeys = modifiedKeys.filter(k => {
      const item = promoDraftSlots[k];
      return item.fileObj && (item.mediaType === 'video' || k.includes('video'));
    });
    const remainingKeys = modifiedKeys.filter(k => !imageKeys.includes(k) && !videoKeys.includes(k));

    const sortedKeys = [...imageKeys, ...videoKeys, ...remainingKeys];

    setIsStreamingPromos(true);
    try {
      const slotsPayload = [];
      const totalFilesToUpload = sortedKeys.filter(k => promoDraftSlots[k]?.fileObj).length;
      let filesUploadedSoFar = 0;

      for (const key of sortedKeys) {
        const item = promoDraftSlots[key];
        const lastUnderscore = key.lastIndexOf('_');
        const slotType = key.substring(0, lastUnderscore);
        const slotIndex = parseInt(key.substring(lastUnderscore + 1), 10);

        if (item.isDeleted) {
          slotsPayload.push({
            slotType,
            slotIndex,
            isDeleted: true
          });
          continue;
        }

        let finalMediaUrl = item.mediaUrl;
        if (item.fileObj) {
          filesUploadedSoFar++;
          showToast(`Uploading file ${filesUploadedSoFar} of ${totalFilesToUpload} (${item.mediaType.toUpperCase()})...`, 'info');
          const arrayBuffer = await item.fileObj.arrayBuffer();
          const uploadRes = await axios.post(`${API_BASE}/host/promos/upload-media`, arrayBuffer, {
            headers: {
              'Content-Type': item.fileObj.type || 'application/octet-stream',
              'X-Filename': item.fileObj.name,
              'X-Host-Application-Id': selectedOutletId,
              'Authorization': `Bearer ${token}`
            }
          });

          if (uploadRes.data.success && uploadRes.data.data.mediaUrl) {
            finalMediaUrl = uploadRes.data.data.mediaUrl;
          } else {
            throw new Error(uploadRes.data.message || 'File upload failed');
          }
        }

        slotsPayload.push({
          slotType,
          slotIndex,
          title: item.title,
          mediaUrl: finalMediaUrl,
          mediaType: item.mediaType,
          isDeleted: false
        });
      }

      const streamRes = await axios.post(`${API_BASE}/host/promos/stream`, {
        hostApplicationId: selectedOutletId,
        slots: slotsPayload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (streamRes.data.success) {
        showToast('Venue promos updated & streaming live on devices!', 'success');
        fetchHostPromos(selectedOutletId);
      } else {
        showToast(streamRes.data.message || 'Failed to stream promos.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || 'Failed to stream promos.', 'error');
    } finally {
      setIsStreamingPromos(false);
    }
  };

  const handleImageUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      showToast('Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      try {
        const response = await axios.post(`${API_BASE}/host/menu/upload-image`, arrayBuffer, {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-Filename': file.name,
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success && response.data.data.url) {
          updateMenuItemField(index, 'imageUrl', response.data.data.url);
          showToast('Image uploaded successfully!', 'success');
        } else {
          showToast(response.data.message || 'Upload failed', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast(err.response?.data?.message || 'Failed to upload image.', 'error');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read file.', 'error');
    };
    reader.readAsArrayBuffer(file);
  };

  const togglePopular = (index) => {
    const updated = [...menuItems];
    const item = updated[index];
    const nextPopularState = !item.isPopular;
    updated[index] = {
      ...item,
      isPopular: nextPopularState
    };
    setMenuItems(updated);
    showToast(
      nextPopularState
        ? `"${item.name}" featured in Popular section!`
        : `"${item.name}" removed from Popular section.`,
      'info'
    );
  };

  const openCreateModal = (category = 'Starters') => {
    setEditingItemIndex(-1);
    setModalForm({
      name: '',
      description: '',
      price: '',
      category: category,
      isAvailable: true,
      imageUrl: '',
      isVeg: true,
      isPopular: false,
      gst: (menuDefaultGst || 0).toString(),
      otherCharges: (menuDefaultOtherCharges || 0).toString(),
      otherChargesType: menuDefaultOtherChargesType || 'percentage'
    });
    setZoomFactor(100);
    setImageTab('upload');
    setIsMenuModalOpen(true);
  };

  const openEditModal = (item, index) => {
    setEditingItemIndex(index);
    setModalForm({
      name: item.name,
      description: item.description || '',
      price: item.price ? (item.price / 100).toString() : '',
      category: item.category || 'Starters',
      isAvailable: item.isAvailable !== false,
      imageUrl: item.imageUrl || '',
      isVeg: item.isVeg !== false,
      isPopular: item.isPopular || false,
      gst: item.gst !== undefined && item.gst !== null ? item.gst.toString() : (menuDefaultGst || 0).toString(),
      otherCharges: item.otherCharges !== undefined && item.otherCharges !== null ? item.otherCharges.toString() : (menuDefaultOtherCharges || 0).toString(),
      otherChargesType: (item.otherCharges !== undefined && item.otherCharges !== null) ? (item.otherChargesType || 'percentage') : (menuDefaultOtherChargesType || 'percentage')
    });
    const isExternalUrl = item.imageUrl && (item.imageUrl.startsWith('http://') || item.imageUrl.startsWith('https://'));
    setZoomFactor(100);
    setImageTab(isExternalUrl ? 'url' : 'upload');
    setIsMenuModalOpen(true);
  };

  const handleSaveModalItem = () => {
    if (!modalForm.name.trim()) {
      setError('Item Name is required');
      return;
    }
    const priceVal = parseFloat(modalForm.price);
    if (isNaN(priceVal) || priceVal < 0) {
      setError('Please enter a valid price');
      return;
    }

    const parsedGst = modalForm.gst !== '' ? parseFloat(modalForm.gst) : null;
    const parsedOther = modalForm.otherCharges !== '' ? parseFloat(modalForm.otherCharges) : null;

    if (parsedGst !== null && (isNaN(parsedGst) || parsedGst < 0)) {
      setError('Please enter a valid GST percentage');
      return;
    }
    if (parsedOther !== null && (isNaN(parsedOther) || parsedOther < 0)) {
      setError('Please enter a valid other charges value');
      return;
    }

    // CSS-like override: save null in DB if it matches global default configuration
    const gstVal = parsedGst === menuDefaultGst ? null : parsedGst;
    const otherChargesVal = (parsedOther === menuDefaultOtherCharges && modalForm.otherChargesType === menuDefaultOtherChargesType)
      ? null
      : parsedOther;

    const priceInPaise = Math.round(priceVal * 100);

    if (editingItemIndex === -1) {
      // Create new
      const newItem = {
        itemId: `item_${Date.now()}`,
        name: modalForm.name,
        description: modalForm.description,
        price: priceInPaise,
        category: modalForm.category,
        isAvailable: modalForm.isAvailable,
        imageUrl: modalForm.imageUrl,
        isVeg: modalForm.isVeg,
        isPopular: modalForm.isPopular,
        gst: gstVal,
        otherCharges: otherChargesVal,
        otherChargesType: modalForm.otherChargesType
      };
      setMenuItems([...menuItems, newItem]);
    } else {
      // Edit existing
      const updated = [...menuItems];
      updated[editingItemIndex] = {
        ...updated[editingItemIndex],
        name: modalForm.name,
        description: modalForm.description,
        price: priceInPaise,
        category: modalForm.category,
        isAvailable: modalForm.isAvailable,
        imageUrl: modalForm.imageUrl,
        isVeg: modalForm.isVeg,
        isPopular: modalForm.isPopular,
        gst: gstVal,
        otherCharges: otherChargesVal,
        otherChargesType: modalForm.otherChargesType
      };
      setMenuItems(updated);
    }
    setIsMenuModalOpen(false);
    setError('');
  };

  const handleModalImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      showToast('Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target.result;
      try {
        const response = await axios.post(`${API_BASE}/host/menu/upload-image`, arrayBuffer, {
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-Filename': file.name,
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.data.success && response.data.data.url) {
          setModalForm(prev => ({ ...prev, imageUrl: response.data.data.url }));
          showToast('Image uploaded successfully!', 'success');
        } else {
          showToast(response.data.message || 'Upload failed', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast(err.response?.data?.message || 'Failed to upload image.', 'error');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read file.', 'error');
    };
    reader.readAsArrayBuffer(file);
  };

  const addMenuItem = () => {
    openCreateModal('Starters');
  };

  const removeMenuItem = (index) => {
    const item = menuItems[index];
    if (window.confirm(`Are you sure you want to delete "${item?.name || 'this item'}"?`)) {
      setMenuItems(menuItems.filter((_, i) => i !== index));
    }
  };

  const updateMenuItemField = (index, field, value) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: value };
    setMenuItems(updated);
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

  const handleBecomeAdvertiser = async () => {
    setError('');
    setInfo('');
    setRoleActionLoading(true);
    setShowBecomeAdvertiserModal(false);
    try {
      const res = await axios.post(`${API_BASE}/auth/add-role`, { role: 'advertiser' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      localStorage.setItem('token', res.data.data.token);
      localStorage.setItem('role', res.data.data.user.role);
      localStorage.setItem('roles', JSON.stringify(res.data.data.user.roles));
      router.push('/advertiser');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register as advertiser.');
    } finally {
      setRoleActionLoading(false);
    }
  };

  const handleRequestMoreDevices = async (e) => {
    e.preventDefault();
    if (!selectedOutletId) {
      setReqDeviceError('Please select a venue/outlet first.');
      return;
    }

    if (!reqRequestTablet && !reqRequestScreen) {
      setReqDeviceError('Please select at least one type of device to request.');
      return;
    }

    let parsedTabletQty = 0;
    if (reqRequestTablet) {
      parsedTabletQty = parseInt(reqTabletQuantity, 10);
      if (isNaN(parsedTabletQty) || parsedTabletQty < 1) {
        setReqDeviceError('Tablet quantity must be at least 1.');
        return;
      }
    }

    let parsedScreenQty = 0;
    if (reqRequestScreen) {
      parsedScreenQty = parseInt(reqScreenQuantity, 10);
      if (isNaN(parsedScreenQty) || parsedScreenQty < 1) {
        setReqDeviceError('Screen quantity must be at least 1.');
        return;
      }
    }

    setReqDeviceError('');
    setReqDeviceLoading(true);
    try {
      await axios.post(`${API_BASE}/host/request-more-devices`, {
        hostApplicationId: selectedOutletId,
        requestTablet: reqRequestTablet,
        tabletQuantity: parsedTabletQty,
        requestScreen: reqRequestScreen,
        screenQuantity: parsedScreenQty
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Device request submitted successfully!', 'success');
      setShowGetMoreDevicesModal(false);
    } catch (err) {
      setReqDeviceError(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setReqDeviceLoading(false);
    }
  };

  const hasMenuChanges = () => {
    if (!originalMenuRef.current) return false;
    const currentMenu = {
      items: menuItems,
      categories: menuCategories,
      defaultGst: menuDefaultGst,
      defaultOtherCharges: menuDefaultOtherCharges,
      defaultOtherChargesType: menuDefaultOtherChargesType
    };
    return JSON.stringify(currentMenu) !== originalMenuRef.current;
  };

  const openEditApplicationModal = (targetApp) => {
    const appToEdit = targetApp || applications[0];
    if (!appToEdit) return;
    setEditingApplicationId(appToEdit._id);
    setEditAppForm({
      outletName: appToEdit.outletName || '',
      outletDescription: appToEdit.outletDescription || '',
      doorNo: appToEdit.doorNo || '',
      street: appToEdit.street || '',
      city: appToEdit.city || '',
      state: appToEdit.state || '',
      zipCode: appToEdit.zipCode || '',
      contactPerson: appToEdit.contactPerson || '',
      phone: appToEdit.phone || '',
      email: appToEdit.email || '',
      adMode: appToEdit.adMode || 'open',
      allowOpenAds: appToEdit.allowOpenAds !== undefined ? appToEdit.allowOpenAds : true
    });
    setEditAppZipError('');
    setEditAppError('');
    setShowEditApplicationModal(true);
  };

  const handleEditAppPhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 10) return;
    if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) return;
    setEditAppForm(prev => ({ ...prev, phone: cleaned }));
  };

  const handleEditAppZipCodeChange = async (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 6) return;
    setEditAppForm(prev => ({ ...prev, zipCode: cleaned }));

    if (cleaned.length < 6) {
      setEditAppZipError('');
    }

    if (cleaned.length === 6) {
      try {
        const response = await axios.get(`https://api.postalpincode.in/pincode/${cleaned}`);
        if (response && response.data && response.data[0]) {
          const status = response.data[0].Status;
          if (status === 'Success') {
            const postOffices = response.data[0].PostOffice;
            if (postOffices && postOffices.length > 0) {
              const { State, District } = postOffices[0];
              const matchedState = normalizeAndMatchState(State);

              setEditAppForm(prev => ({
                ...prev,
                state: matchedState,
                city: District || prev.city
              }));
              setEditAppZipError('');
            } else {
              setEditAppZipError('Wrong pincode');
            }
          } else {
            setEditAppZipError('Wrong pincode');
          }
        } else {
          setEditAppZipError('Wrong pincode');
        }
      } catch (err) {
        console.error('Failed to auto-populate location details from pincode:', err);
        setEditAppZipError('Wrong pincode');
      }
    }
  };

  const handleSaveEditedApplication = async (e) => {
    e.preventDefault();
    setEditAppError('');

    if (editAppForm.phone.length !== 10) {
      setEditAppError('Mobile number must be exactly 10 digits');
      return;
    }

    if (editAppForm.zipCode.length !== 6) {
      setEditAppError('ZIP code must be exactly 6 digits');
      return;
    }

    if (editAppZipError) {
      setEditAppError('Please resolve the wrong pincode error before saving');
      return;
    }

    setEditAppLoading(true);
    try {
      await axios.put(`${API_BASE}/host/applications/${editingApplicationId}`, editAppForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Application details updated successfully!', 'success');
      setShowEditApplicationModal(false);
      fetchApplications(token);
    } catch (err) {
      setEditAppError(err.response?.data?.message || 'Failed to update application details.');
    } finally {
      setEditAppLoading(false);
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
          <span className="font-outfit text-md font-bold text-foreground brandLogo">Merchant Portal</span>
        </div>

        <nav className="flex space-x-1.5 md:space-x-2">
          {applications.length === 0 && !hasApprovedVenue && (
            <button
              onClick={() => setActiveTab('applications')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'applications'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              <Form className={`w-4 h-4  ${activeTab === 'applications' ? 'text-primary-foreground' : 'text-primary'}`} />
              <span className="hidden sm:inline">Host Applications</span>
            </button>
          )}
          {applications.length > 0 && !hasApprovedVenue && (
            <button
              onClick={() => setActiveTab('my-applications')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'my-applications'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
            >
              <Form className={`w-4 h-4  ${activeTab === 'my-applications' ? 'text-primary-foreground' : 'text-primary'}`} />
              <span className="hidden sm:inline">Your Applications</span>
            </button>
          )}
          {hasApprovedVenue && (
            <>
              <button
                onClick={() => setActiveTab('devices')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'devices'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <MonitorSmartphone className={`w-4 h-4  ${activeTab === 'devices' ? 'text-primary-foreground' : 'text-primary'}`} />
                <span className="hidden sm:inline">Devices</span>
              </button>
              {applications.some(app => app.status === 'approved' && app.requestTablet) && (
                <>
                  <button
                    onClick={() => setActiveTab('menu')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'menu'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    <UtensilsCrossed className={`w-4 h-4  ${activeTab === 'menu' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="hidden sm:inline">Menu Manager</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('promos')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'promos'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    <Megaphone className={`w-4 h-4 ${activeTab === 'promos' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="hidden sm:inline">Venue Promos</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${activeTab === 'orders'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    <Salad className={`w-4 h-4 ${activeTab === 'orders' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="hidden sm:inline">Live Orders</span>
                    {orders.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center border-2 border-background shadow-md select-none pointer-events-none">
                        {orders.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('payment')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${activeTab === 'payment'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                  >
                    <CreditCard className={`w-4 h-4 ${activeTab === 'payment' ? 'text-primary-foreground' : 'text-primary'}`} />
                    <span className="hidden sm:inline">Payment</span>
                  </button>
                </>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Role Actions */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 " /> : <Moon className="w-4 h-4 text-indigo-500 " />}
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
              {userMenuOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-card border border-border/40 shadow-lg py-1.5 z-40 animate-fade-in text-xs font-semibold">
                <div className="px-3 py-2 border-b border-border/40">
                  <p className="text-[10px] text-muted-foreground leading-none">Logged in as</p>
                  <p className="text-xs font-bold text-foreground mt-1 truncate">{name || phone}</p>
                </div>

                {applications.length > 0 && !hasApprovedVenue && (
                  <div className="p-1.5 space-y-1 border-b border-border/40">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setActiveTab('my-applications');
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <Form className="w-4 h-4 text-[#0069a8]" />
                      <span>Your Applications</span>
                    </button>
                  </div>
                )}

                {applications.length > 0 && (
                  <div className="p-1.5 space-y-1 border-b border-border/40">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        openEditApplicationModal(applications[0]);
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <Pencil className="w-4 h-4 text-amber-500" />
                      <span>Edit Venue Details</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        setShowGetMoreDevicesModal(true);
                        setReqRequestTablet(false);
                        setReqTabletQuantity('1');
                        setReqRequestScreen(false);
                        setReqScreenQuantity('1');
                        setReqDeviceError('');
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <Tablet className="w-4 h-4 text-blue-500" />
                      <span>Get More Devices</span>
                    </button>

                    {roles.includes('advertiser') ? (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleSwitchRole('advertiser');
                        }}
                        disabled={roleActionLoading}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                      >
                        <RefreshCw className={`w-4 h-4 text-indigo-500 ${roleActionLoading ? 'animate-spin' : ''}`} />
                        <span>Switch to Advertiser</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          setShowBecomeAdvertiserModal(true);
                        }}
                        disabled={roleActionLoading}
                        className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                      >
                        <Megaphone className="w-4 h-4 text-blue-500" />
                        <span>Become Advertiser</span>
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
                    <LogOut className="w-4 h-4 " />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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

        {/* 1. Host Applications Tab */}
        {activeTab === 'applications' && (
          <div className="animate-fade-in max-w-3xl mx-auto">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Host Applications</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8">Submit forms to host new tablet or screen devices at your restaurant.</p>

            {/* Submission Form */}
            <div className="p-6 rounded-2xl bg-card border border-[#0069a8]/80 shadow-[0_0_20px_rgba(0,105,168,0.3)] dark:shadow-[0_0_35px_rgba(0,105,168,0.55)]">
              <h3 className="font-outfit text-md font-bold text-foreground mb-6">Device Application Form</h3>
              <form onSubmit={handleHostApply} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Outlet Name"
                      value={form.outletName}
                      onChange={(e) => setForm({ ...form, outletName: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Contact Person Name"
                      value={form.contactPerson}
                      onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <textarea
                    required
                    placeholder="Outlet Description"
                    value={form.outletDescription}
                    onChange={(e) => setForm({ ...form, outletDescription: e.target.value })}
                    className="w-full h-24 bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Door / Shop No"
                      value={form.doorNo}
                      onChange={(e) => setForm({ ...form, doorNo: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="Street / Location"
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="ZIP Code"
                      value={form.zipCode}
                      onChange={(e) => handleZipCodeChange(e.target.value)}
                      className={`w-full bg-background border ${zipError ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'} rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:border-transparent transition-all`}
                    />
                    {zipError && (
                      <p className="text-[10px] text-destructive font-semibold mt-1.5 ml-1">{zipError}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <select
                      required
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="" disabled>Select State</option>
                      {INDIAN_STATES.map((state) => (
                        <option key={state} value={state} className="bg-background text-foreground">
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="tel"
                      required
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Multi-Device selection space */}
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Devices to Host</span>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Tablet Checkbox and qty */}
                    <div className="p-4 bg-background/50 rounded-2xl border border-border/40 space-y-3">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.requestTablet}
                          onChange={(e) => setForm({ ...form, requestTablet: e.target.checked })}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Tabletop Ordering Tablet</span>
                      </label>
                      {form.requestTablet && (
                        <input
                          type="text"
                          required
                          placeholder="Quantity of Tablets"
                          value={form.tabletQuantity}
                          onChange={(e) => handleQuantityChange('tabletQuantity', e.target.value)}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                        />
                      )}
                    </div>

                    {/* Screen Checkbox and qty */}
                    <div className="p-4 bg-background/50 rounded-2xl border border-border/40 space-y-3">
                      <label className="flex items-center space-x-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.requestScreen}
                          onChange={(e) => setForm({ ...form, requestScreen: e.target.checked })}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Large Wall Display Screen</span>
                      </label>
                      {form.requestScreen && (
                        <input
                          type="text"
                          required
                          placeholder="Quantity of Screens"
                          value={form.screenQuantity}
                          onChange={(e) => handleQuantityChange('screenQuantity', e.target.value)}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Venue Ad Mode Choice Section */}
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Venue Ad Mode & Service Plan</span>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Open Ads Mode Option */}
                    <div
                      onClick={() => setForm({ ...form, allowOpenAds: true, adMode: 'open' })}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${form.allowOpenAds
                        ? 'bg-blue-500/10 border-blue-500/80 shadow-md ring-1 ring-blue-500/50'
                        : 'bg-background/50 border-border/40 hover:border-border'
                        }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-1.5">
                        <input
                          type="radio"
                          name="formAdMode"
                          checked={form.allowOpenAds === true}
                          onChange={() => setForm({ ...form, allowOpenAds: true, adMode: 'open' })}
                          className="w-4 h-4 accent-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Open Ads Mode (Recommended)</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-6 font-semibold">
                        Accept third-party brand advertisements on kiosk screens. Qualifies your venue for discounted/free hardware & SaaS platform tier.
                      </p>
                    </div>

                    {/* Closed / Private Mode Option */}
                    <div
                      onClick={() => setForm({ ...form, allowOpenAds: false, adMode: 'closed' })}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${!form.allowOpenAds
                        ? 'bg-purple-500/10 border-purple-500/80 shadow-md ring-1 ring-purple-500/50'
                        : 'bg-background/50 border-border/40 hover:border-border'
                        }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-1.5">
                        <input
                          type="radio"
                          name="formAdMode"
                          checked={form.allowOpenAds === false}
                          onChange={() => setForm({ ...form, allowOpenAds: false, adMode: 'closed' })}
                          className="w-4 h-4 accent-purple-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-foreground">Closed / Private Mode</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-6 font-semibold">
                        Exclusive internal venue usage only (digital menu & in-house promos). Excludes third-party ads (Private SaaS Tier).
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg glow-hover cursor-pointer mt-4"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? 'Submitting...' : 'Submit Host Application'}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 1.2 My Applications Tab [NEW] */}
        {activeTab === 'my-applications' && (
          <div className="animate-fade-in">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">My Applications</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8">View and monitor the status of all your submitted host applications.</p>

            {applications.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                <Building className="w-12 h-12 text-[#0069a8] fill-[#0069a8] mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">No Applications Submitted</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">You haven't submitted any host applications yet. Go to the "Host Applications" tab to request devices.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {applications.map((app) => (
                  <div key={app._id} className="p-5 rounded-2xl bg-card/10 border border-border/40 flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 animate-fade-in">
                    <div>
                      <div className="flex justify-between items-start border-b border-border/40 pb-3 mb-3">
                        <div>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Venue / Outlet</span>
                          <h4 className="font-bold text-foreground text-sm tracking-wide mt-0.5">{app.outletName}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditApplicationModal(app)}
                            className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                            title="Edit Application Details"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-500" />
                          </button>
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center ${app.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : app.status === 'rejected'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                              : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${app.status === 'approved' ? 'bg-emerald-500' : app.status === 'rejected' ? 'bg-red-500' : 'bg-orange-500'}`} />
                            {app.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        {app.requestTablet && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-semibold flex items-center">
                              <Tablet className="w-4 h-4 mr-1 text-[#0069a8] fill-[#0069a8]" />
                              Tablets Requested
                            </span>
                            <span className="text-foreground font-bold">{app.tabletQuantity}</span>
                          </div>
                        )}
                        {app.requestScreen && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground font-semibold flex items-center">
                              <Tv className="w-4 h-4 mr-1 text-[#0069a8] fill-[#0069a8]" />
                              Screens Requested
                            </span>
                            <span className="text-foreground font-bold">{app.screenQuantity}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Location</span>
                          <span className="text-foreground font-semibold text-right">{app.city}, {app.state}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Contact Person</span>
                          <span className="text-foreground font-semibold">{app.contactPerson}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-semibold">Submitted On</span>
                          <span className="text-foreground font-semibold">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-border/30">
                          <span className="text-muted-foreground font-semibold">Venue Ad Mode</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${app.allowOpenAds !== false
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            }`}>
                            {app.allowOpenAds !== false ? 'OPEN ADS MODE' : 'CLOSED / PRIVATE'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {app.status === 'approved' && (
                      <div className="border-t border-border/40 pt-3 text-[10px] text-muted-foreground font-semibold space-y-1">
                        <p className="uppercase text-[9px] tracking-wider font-bold">Approved Status</p>
                        <p className="text-foreground/80 leading-relaxed font-semibold">This application is approved. Device credentials have been generated under the "Devices" tab.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 1.5 Devices Tab [NEW] */}
        {activeTab === 'devices' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4 border-b border-border/40 pb-4">
              <div className="space-y-3">
                <div>
                  <h1 className="font-outfit text-2xl font-black text-foreground">My Devices</h1>
                  <p className="text-muted-foreground text-xs font-semibold">View and monitor the active tabletop kiosks and wall advertising screens provisioned for your venues.</p>
                </div>
                {/* Highlighted Instruction Banner */}
                <div className="bg-[#0069a8]/10 border border-[#0069a8]/20 rounded-xl px-4 py-3 text-xs max-w-xl text-left shadow-sm">
                  <p className="text-[#0069a8] font-black uppercase tracking-wider text-[9px] mb-1">Activation Guidelines</p>
                  <p className="text-muted-foreground font-semibold leading-relaxed text-[11px]">
                    To link your physical Android kiosks, start the client app on your hardware and enter the unique <strong className="text-foreground">Device ID</strong> code displayed on any of the cards below.
                  </p>
                </div>
              </div>

              {/* Filtering Controls */}
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                {/* Venue Dropdown Selector */}
                <select
                  value={deviceFilterVenue}
                  onChange={(e) => setDeviceFilterVenue(e.target.value)}
                  className="bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48 cursor-pointer"
                >
                  <option value="">All Venues</option>
                  {applications.filter(app => app.status === 'approved').map(app => (
                    <option key={app._id} value={app._id}>{app.outletName}</option>
                  ))}
                </select>

                {/* Device Type Tabs */}
                <div className="flex bg-muted p-1 rounded-xl border border-border/40 text-[10px] font-bold">
                  <button
                    onClick={() => setDeviceFilterType('tablet')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${deviceFilterType === 'tablet'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Tablets
                  </button>
                  <button
                    onClick={() => setDeviceFilterType('screen')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${deviceFilterType === 'screen'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    Screens
                  </button>
                </div>
              </div>
            </div>

            {(() => {
              const filteredDevices = devices.filter(device => {
                const matchesType = device.deviceType === deviceFilterType;
                const matchesVenue = !deviceFilterVenue || device.hostApplicationId === deviceFilterVenue;
                return matchesType && matchesVenue;
              });

              return filteredDevices.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                  <Tablet className="w-12 h-12 text-[#0069a8] fill-[#0069a8] mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-bold text-foreground">No Provisioned Devices Found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">No active {deviceFilterType === 'tablet' ? 'tablets' : 'screens'} match the selected venue criteria.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredDevices.map((device) => {
                    const associatedApp = applications.find(app => app._id === device.hostApplicationId);
                    return (
                      <div key={device._id} className="p-5 rounded-2xl bg-card/10 border border-border/40 flex flex-col justify-between space-y-4 hover:-translate-y-1 hover:border-primary/50 transition-all duration-300">
                        <div>
                          <div className="flex justify-between items-start border-b border-border/40 pb-3 mb-3">
                            <div>
                              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Device ID</span>
                              <h4 className="font-mono font-bold text-foreground text-sm tracking-wide mt-0.5">{device.deviceId}</h4>
                            </div>
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex items-center ${device.status === 'online'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-muted-foreground/10 text-muted-foreground border border-border/20'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${device.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                              {device.status}
                            </span>
                          </div>

                          <div className="space-y-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground font-semibold">Device Type</span>
                              <span className="text-foreground font-bold capitalize flex items-center">
                                {device.deviceType === 'tablet' ? (
                                  <Tablet className="w-4 h-4 mr-1 text-[#0069a8] fill-[#0069a8]" />
                                ) : (
                                  <Tv className="w-4 h-4 mr-1 text-[#0069a8] fill-[#0069a8]" />
                                )}
                                {device.deviceType}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground font-semibold">Target Venue</span>
                              <span className="text-foreground font-bold">{associatedApp?.outletName || 'Host Outlet'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground font-semibold">Location</span>
                              <span className="text-foreground font-semibold text-right">{associatedApp ? `${associatedApp.city}, ${associatedApp.state}` : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* 2. Menu Manager Tab */}
        {activeTab === 'menu' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
              <div>
                <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Food Items Catalog</h1>
                <p className="text-muted-foreground text-xs font-semibold">Design the digital ordering catalog displayed on the tabletop tablets.</p>
              </div>
              {approvedOutlets.length > 0 && (
                <div className="flex space-x-4">
                  <button
                    onClick={() => {
                      setGlobalGstInput(menuDefaultGst !== null ? menuDefaultGst.toString() : '0');
                      setGlobalOtherChargesInput(menuDefaultOtherCharges !== null ? menuDefaultOtherCharges.toString() : '0');
                      setGlobalOtherChargesType(menuDefaultOtherChargesType || 'percentage');
                      setShowGlobalTaxesModal(true);
                    }}
                    className="bg-card hover:bg-muted border border-border/40 text-foreground font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Percent className="w-4 h-4 text-indigo-500" />
                    <span>Configure Taxes</span>
                  </button>

                  <button
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="bg-card hover:bg-muted border border-border/40 text-foreground font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Manage Categories</span>
                  </button>
                  <button
                    onClick={addMenuItem}
                    className="bg-card hover:bg-muted border border-border/40 text-foreground font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                  <button
                    onClick={handleSaveMenu}
                    disabled={!hasMenuChanges()}
                    className="bg-primary hover:bg-primary/95 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer glow-hover"
                  >
                    Save Menu
                  </button>
                </div>
              )}
            </div>

            {approvedOutlets.length > 0 ? (
              <>

                <div className="space-y-12">
                  {menuCategories.map((category) => {
                    const items = menuItems.filter(item => (item.category || '').toLowerCase() === category.toLowerCase());
                    return (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center space-x-3 bg-muted/20 dark:bg-muted/5 border border-border/40 px-4 py-3 rounded-xl shadow-sm">
                          <span className={`w-3 h-3 rounded-full ${getCategoryDotColor(category)} shadow-sm`} />
                          <h3 className="font-outfit text-base md:text-lg font-black text-foreground tracking-widest uppercase">{category}</h3>
                          <span className="text-[10px] text-muted-foreground font-bold px-2 py-0.5 rounded-md bg-muted/50 dark:bg-muted/10 border border-border/20">
                            {items.length} {items.length === 1 ? 'Item' : 'Items'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                          {/* CREATE NEW Card */}
                          <div
                            onClick={() => openCreateModal(category)}
                            className="border border-dashed border-border/60 hover:border-primary/80 bg-card/5 hover:bg-card/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[280px] transition-all duration-300 group"
                          >
                            <div className="w-10 h-10 rounded-full border border-border/40 flex items-center justify-center mb-4 group-hover:border-primary/80 group-hover:bg-primary/5 transition-colors">
                              <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <span className="font-outfit text-xs font-bold text-foreground tracking-wide group-hover:text-primary transition-colors">CREATE NEW</span>
                            <span className="text-[10px] text-muted-foreground mt-2 max-w-[150px] leading-relaxed font-semibold">
                              Add food item to dynamic {category.toLowerCase()} menu
                            </span>
                          </div>

                          {/* Items in this category */}
                          {items.map((item) => {
                            const originalIndex = menuItems.findIndex(i => i.itemId === item.itemId);
                            return (
                              <div
                                key={item.itemId}
                                className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/40 bg-card/10 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 group"
                              >
                                {/* Overlay Edit/Delete/Star Controls */}
                                <div className="absolute top-6 right-6 z-10 flex space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePopular(originalIndex);
                                    }}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${item.isPopular
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                                      : 'bg-white dark:bg-black hover:bg-muted border-border/40 text-muted-foreground'
                                      }`}
                                    title={item.isPopular ? "Remove from Popular section" : "Add to Popular section"}
                                  >
                                    <Star className={`w-4 h-4 ${item.isPopular ? 'fill-white' : ''}`} />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(item, originalIndex);
                                    }}
                                    className="p-1.5 bg-white dark:bg-black hover:bg-muted border border-border/40 rounded-lg text-foreground transition-all cursor-pointer shadow-sm"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeMenuItem(originalIndex);
                                    }}
                                    className="p-1.5 bg-red-600 hover:bg-red-700 border border-red-500/20 rounded-lg text-white transition-all cursor-pointer shadow-sm"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                <div
                                  onClick={() => openEditModal(item, originalIndex)}
                                  className="cursor-pointer flex-1 flex flex-col"
                                >
                                  <div className="relative w-full h-40 overflow-hidden rounded-xl bg-muted/10 mb-4 shrink-0 border border-border/20">
                                    {item.isPopular && (
                                      <div className="absolute top-2 left-2 z-10 bg-amber-500/90 backdrop-blur-sm text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center space-x-1 shadow-md">
                                        <Star className="w-3 h-3 fill-white" />
                                        <span>POPULAR</span>
                                      </div>
                                    )}
                                    {item.imageUrl ? (
                                      <img
                                        src={resolveMediaUrl(item.imageUrl)}
                                        alt={item.name}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-muted-foreground font-bold uppercase p-4 text-center">
                                        <UtensilsCrossed className="w-8 h-8 mb-2 opacity-40" />
                                        No Image
                                      </div>
                                    )}
                                  </div>

                                  <h4 className="font-outfit text-xs font-black text-foreground uppercase tracking-wider mb-2 line-clamp-1">{item.name}</h4>
                                  <p className="text-[10px] text-muted-foreground line-clamp-3 mb-4 h-12 leading-relaxed font-semibold">{item.description || 'No description.'}</p>
                                </div>

                                <button
                                  onClick={() => openEditModal(item, originalIndex)}
                                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl text-center text-xs tracking-wider transition-colors mt-auto shadow-md"
                                >
                                  ₹{(item.price / 100).toFixed(2)}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">No Approved Outlets Found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">You need an approved host application before you can start designing menus for kiosks.</p>
              </div>
            )}
          </div>
        )}

        {/* 3. Live Orders Tab */}
        {activeTab === 'orders' && (
          <div className="animate-fade-in w-full">
            {approvedOutlets.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">No Approved Venue Outlets</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">Approved host application venues supporting tablet devices will appear here automatically.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6 border-b border-border/40 pb-3 flex-wrap gap-4">
                  <h1 className="font-outfit text-2xl font-black text-foreground uppercase tracking-wider">
                    {applications.find(app => app.status === 'approved')?.outletName || 'VENUE'}
                  </h1>

                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl shrink-0">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>LIVE</span>
                  </div>
                </div>

                {(() => {
                  const filteredOrders = orders.filter(ord => ord.hostApplicationId === activeOrderVenueTab);

                  // Rank orders by status: placed (1), cooking (2), served (3), others (4). Chronological (oldest first) within the same rank.
                  const getStatusRank = (status) => {
                    if (status === 'placed') return 1;
                    if (status === 'cooking') return 2;
                    if (status === 'served') return 3;
                    return 4;
                  };

                  const sortedOrders = [...filteredOrders].sort((a, b) => {
                    const rankA = getStatusRank(a.orderStatus);
                    const rankB = getStatusRank(b.orderStatus);
                    if (rankA !== rankB) return rankA - rankB;

                    const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
                    const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
                    return timeA - timeB;
                  });

                  return sortedOrders.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                      <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-sm font-bold text-foreground">Waiting for live orders...</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">When customers place orders at dining tables in this venue, they will pop up here instantly.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/40 text-muted-foreground font-bold uppercase tracking-wider">
                            <th className="pb-3 pr-2">Table</th>
                            <th className="pb-3 pr-2">Order ID</th>
                            <th className="pb-3 pr-2">Items</th>
                            <th className="pb-3 pr-2">Status</th>
                            <th className="pb-3 pr-2">Requests</th>
                            <th className="pb-3 pr-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedOrders.map((ord) => (
                            <tr key={ord.orderId} className="hover:bg-muted/10">
                              <td className="py-4 pr-2">
                                <div className="flex items-center space-x-2">
                                  {ord.orderStatus === 'placed' && (
                                    <span className="relative flex h-2 w-2 shrink-0">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                  )}
                                  <span className="font-black text-blue-500 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded text-xs whitespace-nowrap">
                                    Table &nbsp; {ord.tableNumber}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 pr-2 font-mono font-bold text-foreground">
                                {ord.orderId}
                              </td>
                              <td className="py-4 pr-2">
                                <div className="space-y-1 font-semibold text-foreground">
                                  {ord.items.map((item, idx) => (
                                    <div key={idx} className="text-xs">
                                      {item.name} &nbsp;&nbsp; <span className="text-muted-foreground">x &nbsp;{item.quantity}</span>
                                    </div>
                                  ))}
                                  <div className="w-12 border-t-2 border-border/50 my-1.5"></div>
                                  <div className="text-[10px] font-bold text-foreground">
                                    Total: ₹{(ord.totalAmount / 100).toFixed(2)}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 pr-2">
                                <select
                                  value={ord.orderStatus}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateOrderStatus(ord.orderId, e.target.value);
                                  }}
                                  className={`text-[9px] font-black uppercase px-2.5 py-1.5 rounded-xl border focus:outline-none cursor-pointer w-fit ${ord.orderStatus === 'placed'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : ord.orderStatus === 'cooking'
                                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                      : ord.orderStatus === 'served'
                                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                                        : 'bg-muted-foreground/15 text-muted-foreground border-border/30'
                                    }`}
                                >
                                  <option value="placed" className="bg-card text-foreground">Placed</option>
                                  <option value="cooking" className="bg-card text-foreground">Accepted & Preparing</option>
                                  <option value="served" className="bg-card text-foreground">Delivered / Served</option>
                                </select>
                              </td>
                              <td className="py-4 pr-2">
                                {ord.waiterCallStatus === 'pending' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      serviceWaiter(ord.orderId);
                                    }}
                                    className="bg-red-600 text-white text-[11px] font-black uppercase px-3 py-1.5 rounded-xl animate-pulse cursor-pointer shrink-0 border border-red-700 shadow-md select-none"
                                    style={{ animationDuration: '0.8s' }}
                                  >
                                    Call Waiter ({ord.waiterCallOption || 'Others'}) x{ord.waiterCallCount || 1}
                                  </button>
                                ) : ord.waiterCallStatus === 'serviced' ? (
                                  <div className="bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl w-fit shrink-0 select-none">
                                    Serviced x{ord.waiterCallCount || 1}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground font-semibold">-</span>
                                )}
                              </td>
                              <td className="py-4 pr-2">
                                {ord.tableStatus === 'close_table' ? (
                                  confirmingPaymentOrderId === ord.orderId ? (
                                    <div className="flex items-center space-x-1.5 animate-fade-in whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-[9px] font-black text-foreground uppercase">Received?</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markPaymentReceived(ord.orderId);
                                          setConfirmingPaymentOrderId(null);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[9px] transition-colors cursor-pointer uppercase tracking-wider"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmingPaymentOrderId(null);
                                        }}
                                        className="bg-muted hover:bg-muted/80 text-foreground font-bold px-2 py-1 rounded text-[9px] transition-colors cursor-pointer border border-border/40 uppercase tracking-wider"
                                      >
                                        No
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmingPaymentOrderId(ord.orderId);
                                      }}
                                      className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase px-3 py-1.5 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-sm w-fit shrink-0 animate-pulse"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0 animate-pulse" />
                                      Payment Received
                                    </button>
                                  )
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      closeTable(ord.orderId);
                                    }}
                                    disabled={ord.orderStatus !== 'served'}
                                    className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border transition-all shadow-sm shrink-0 w-fit cursor-pointer ${ord.orderStatus === 'served'
                                      ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20'
                                      : 'bg-muted text-muted-foreground border-border/40 opacity-50 cursor-not-allowed'
                                      }`}
                                  >
                                    Clear Table
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        )}

        {/* 2.5 Venue Promos Tab */}
        {activeTab === 'promos' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4 border-b border-border/40 pb-4">
              <div>
                <h1 className="font-outfit text-2xl font-black text-foreground uppercase tracking-wider">
                  IN-HOUSE VENUE PROMOS
                </h1>
                <p className="text-muted-foreground text-xs font-semibold mt-1">
                  Stream your own video ads, daily offers, and promotional banners directly onto your tabletop tablets and wall screens.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleStreamAds}
                  disabled={isStreamingPromos || promoQuotaStats.isPaused || promoQuotaStats.isRevoked}
                  className="bg-primary hover:bg-primary/95 disabled:opacity-50 text-primary-foreground font-black text-xs px-6 py-3 rounded-xl transition-all shadow-lg cursor-pointer glow-hover flex items-center space-x-2 uppercase tracking-wider"
                >
                  {isStreamingPromos ? (
                    <>
                      <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Processing & Streaming...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Stream Ads</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-tabs Navigation: Tablet vs Wall Screen */}
            <div className="flex items-center space-x-2 border-b border-border/40 pb-3">
              <button
                type="button"
                onClick={() => setActivePromoSubTab('tablet')}
                className={`px-5 py-2.5 rounded-xl font-outfit text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
                  activePromoSubTab === 'tablet'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-border/40'
                }`}
              >
                <Tablet className="w-4 h-4" />
                <span>Tabletop Tablets</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePromoSubTab('screen')}
                className={`px-5 py-2.5 rounded-xl font-outfit text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${
                  activePromoSubTab === 'screen'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-border/40'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Wall Display Screens</span>
              </button>
            </div>

            {/* SUB-TAB 1: TABLETOP TABLETS */}
            {activePromoSubTab === 'tablet' && (
              <div className="space-y-6 animate-fade-in">
                {/* Quota Cards Banner */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-left flex items-center space-x-3">
                    <Video className="w-6 h-6 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Tablet Video Changes Left</span>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        {effectiveTabletVideoRemaining} / {promoQuotaStats.dailyVideoQuota ?? 4} Remaining
                      </div>
                      <span className="text-[9px] text-muted-foreground font-semibold">Resets daily at 2:00 AM IST</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-left flex items-center space-x-3">
                    <Upload className="w-6 h-6 text-purple-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-purple-500 tracking-wider">Tablet Image Changes Left</span>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        {effectiveTabletImageRemaining} / {promoQuotaStats.dailyImageQuota ?? 10} Remaining
                      </div>
                      <span className="text-[9px] text-muted-foreground font-semibold">Resets daily at 2:00 AM IST</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-left flex items-center space-x-3">
                    <Lock className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Safeguard</span>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-tight mt-0.5">
                        Media changes apply live on tabletop devices when you click <strong className="text-foreground">Stream Ads</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Video Promo Slots Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-outfit text-base font-black text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <Video className="w-4 h-4 text-blue-500" />
                      <span>Tablet Video Promo Slots ({promoQuotaStats.maxVideoSlots} Max)</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: promoQuotaStats.maxVideoSlots }).map((_, idx) => {
                      const key = `video_${idx}`;
                      const slot = promoDraftSlots[key] || {};
                      const hasMedia = slot.previewUrl && !slot.isDeleted;

                      return (
                        <div
                          key={key}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${hasMedia
                            ? 'bg-card border-blue-500/40 shadow-sm'
                            : 'bg-card/20 border-dashed border-border/60 hover:border-blue-500/50'
                            }`}
                        >
                          <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                            <span className="text-xs font-black uppercase text-foreground flex items-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              <span>Tablet Video Slot #{idx + 1}</span>
                            </span>
                            {hasMedia && (
                              <button
                                type="button"
                                onClick={() => handleClearPromoSlot('video', idx)}
                                className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all cursor-pointer shadow-sm"
                                title="Delete / Clear Ad Slot"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {hasMedia ? (
                            <div className="space-y-3">
                              <div className="relative w-full h-48 bg-black/40 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
                                <video
                                  src={slot.previewUrl}
                                  controls
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Enter Video Ad Title (Optional)"
                                value={slot.title || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPromoDraftSlots(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], title: val, isModified: true }
                                  }));
                                }}
                                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-border/40 rounded-xl bg-muted/10 relative hover:bg-muted/20 transition-all">
                              <input
                                type="file"
                                accept="video/mp4,video/webm,video/mov"
                                onChange={(e) => handleSelectPromoFile('video', idx, e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                              />
                              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                <Plus className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">Click to Choose Video File</p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">MP4, WEBM (Max 100MB, ≤ 30s)</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Image Promo Slots Section */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-outfit text-base font-black text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-purple-500" />
                      <span>Tablet Image Promo Slots ({promoQuotaStats.maxImageSlots} Max)</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Array.from({ length: promoQuotaStats.maxImageSlots }).map((_, idx) => {
                      const key = `image_${idx}`;
                      const slot = promoDraftSlots[key] || {};
                      const hasMedia = slot.previewUrl && !slot.isDeleted;

                      return (
                        <div
                          key={key}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative ${hasMedia
                            ? 'bg-card border-purple-500/40 shadow-sm'
                            : 'bg-card/20 border-dashed border-border/60 hover:border-purple-500/50'
                            }`}
                        >
                          <div className="flex justify-between items-center border-b border-border/40 pb-2">
                            <span className="text-[11px] font-black uppercase text-foreground flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                              <span>Tablet Image #{idx + 1}</span>
                            </span>
                            {hasMedia && (
                              <button
                                type="button"
                                onClick={() => handleClearPromoSlot('image', idx)}
                                className="p-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all cursor-pointer"
                                title="Delete / Clear Ad Slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {hasMedia ? (
                            <div className="space-y-2">
                              <div className="relative w-full h-32 bg-black/40 rounded-lg overflow-hidden border border-border/40">
                                <img
                                  src={slot.previewUrl}
                                  alt={`Image slot ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Ad Title (Optional)"
                                value={slot.title || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPromoDraftSlots(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], title: val, isModified: true }
                                  }));
                                }}
                                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          ) : (
                            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border/40 rounded-xl bg-muted/10 relative hover:bg-muted/20 transition-all min-h-[140px]">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleSelectPromoFile('image', idx, e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                              />
                              <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                                <Plus className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-foreground">Choose Image</p>
                                <p className="text-[9px] text-muted-foreground font-medium">JPG, PNG (Max 10MB)</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: WALL DISPLAY SCREENS */}
            {activePromoSubTab === 'screen' && (
              <div className="space-y-6 animate-fade-in">
                {/* Quota Cards Banner */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-center space-x-3">
                    <Video className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">Screen Video Changes Left</span>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        {effectiveScreenVideoRemaining} / {promoQuotaStats.dailyScreenVideoQuota ?? 4} Remaining
                      </div>
                      <span className="text-[9px] text-muted-foreground font-semibold">Resets daily at 2:00 AM IST</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-left flex items-center space-x-3">
                    <Upload className="w-6 h-6 text-teal-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-teal-500 tracking-wider">Screen Image Changes Left</span>
                      <div className="text-lg font-black text-foreground mt-0.5">
                        {effectiveScreenImageRemaining} / {promoQuotaStats.dailyScreenImageQuota ?? 10} Remaining
                      </div>
                      <span className="text-[9px] text-muted-foreground font-semibold">Resets daily at 2:00 AM IST</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-left flex items-center space-x-3">
                    <Lock className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Safeguard</span>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-tight mt-0.5">
                        Wall screen ads stream live to TV display hardware when you click <strong className="text-foreground">Stream Ads</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Screen Video Promo Slots Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-outfit text-base font-black text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <Video className="w-4 h-4 text-emerald-500" />
                      <span>Wall Screen Video Promo Slots ({promoQuotaStats.maxScreenVideoSlots || 2} Max)</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({ length: promoQuotaStats.maxScreenVideoSlots || 2 }).map((_, idx) => {
                      const key = `screen_video_${idx}`;
                      const slot = promoDraftSlots[key] || promoDraftSlots[`screen_${idx}`] || {};
                      const hasMedia = slot.previewUrl && !slot.isDeleted;

                      return (
                        <div
                          key={key}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 relative ${hasMedia
                            ? 'bg-card border-emerald-500/40 shadow-sm'
                            : 'bg-card/20 border-dashed border-border/60 hover:border-emerald-500/50'
                            }`}
                        >
                          <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                            <span className="text-xs font-black uppercase text-foreground flex items-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span>Screen Video Slot #{idx + 1}</span>
                            </span>
                            {hasMedia && (
                              <button
                                type="button"
                                onClick={() => handleClearPromoSlot('screen_video', idx)}
                                className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all cursor-pointer shadow-sm"
                                title="Delete / Clear Ad Slot"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {hasMedia ? (
                            <div className="space-y-3">
                              <div className="relative w-full h-48 bg-black/40 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
                                <video
                                  src={slot.previewUrl}
                                  controls
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Enter Video Ad Title (Optional)"
                                value={slot.title || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPromoDraftSlots(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], title: val, isModified: true }
                                  }));
                                }}
                                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-border/40 rounded-xl bg-muted/10 relative hover:bg-muted/20 transition-all">
                              <input
                                type="file"
                                accept="video/mp4,video/webm,video/mov"
                                onChange={(e) => handleSelectPromoFile('screen_video', idx, e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                              />
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                <Plus className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-foreground">Choose Wall Screen Video</p>
                                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">MP4, WEBM (Full HD 1920×1080)</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Screen Image Promo Slots Section */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-outfit text-base font-black text-foreground uppercase tracking-wider flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-teal-500" />
                      <span>Wall Screen Image Promo Slots ({promoQuotaStats.maxScreenImageSlots || 5} Max)</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {Array.from({ length: promoQuotaStats.maxScreenImageSlots || 5 }).map((_, idx) => {
                      const key = `screen_image_${idx}`;
                      const slot = promoDraftSlots[key] || {};
                      const hasMedia = slot.previewUrl && !slot.isDeleted;

                      return (
                        <div
                          key={key}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative ${hasMedia
                            ? 'bg-card border-teal-500/40 shadow-sm'
                            : 'bg-card/20 border-dashed border-border/60 hover:border-teal-500/50'
                            }`}
                        >
                          <div className="flex justify-between items-center border-b border-border/40 pb-2">
                            <span className="text-[11px] font-black uppercase text-foreground flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                              <span>Screen Image #{idx + 1}</span>
                            </span>
                            {hasMedia && (
                              <button
                                type="button"
                                onClick={() => handleClearPromoSlot('screen_image', idx)}
                                className="p-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 transition-all cursor-pointer"
                                title="Delete / Clear Ad Slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {hasMedia ? (
                            <div className="space-y-2">
                              <div className="relative w-full h-32 bg-black/40 rounded-lg overflow-hidden border border-border/40">
                                <img
                                  src={slot.previewUrl}
                                  alt={`Screen image slot ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <input
                                type="text"
                                placeholder="Ad Title (Optional)"
                                value={slot.title || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPromoDraftSlots(prev => ({
                                    ...prev,
                                    [key]: { ...prev[key], title: val, isModified: true }
                                  }));
                                }}
                                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          ) : (
                            <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-border/40 rounded-xl bg-muted/10 relative hover:bg-muted/20 transition-all min-h-[140px]">
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => handleSelectPromoFile('screen_image', idx, e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                              />
                              <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 border border-teal-500/20">
                                <Plus className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-foreground">Choose Image</p>
                                <p className="text-[9px] text-muted-foreground font-medium">JPG, PNG (Max 10MB)</p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Payment Tab */}
        {activeTab === 'payment' && (
          <div className="animate-fade-in w-full">
            {/* Header row */}
            <div className="flex justify-between items-center mb-6 border-b border-border/40 pb-3 flex-wrap gap-4">
              <h1 className="font-outfit text-2xl font-black text-foreground uppercase tracking-wider">
                PAYMENT
              </h1>

              <button
                onClick={() => {
                  setConfirmPasswordInput('');
                  setPasswordVerifyError('');
                  setShowPasswordModal(true);
                }}
                className="bg-[#0069a8] hover:bg-[#005b94] text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
              >
                <Lock className="w-4 h-4" />
                <span>Configure UPI Payments</span>
              </button>
            </div>

            {/* Always show history/orders table */}
            {paymentOrders.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">No completed payments found</p>
                <p className="text-xs text-muted-foreground mt-1">Paid order transaction history will appear here once finalized.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="pb-3 pr-2">Table</th>
                      <th className="pb-3 pr-2">Order ID</th>
                      <th className="pb-3 pr-2">Items</th>
                      <th className="pb-3 pr-2">Status</th>
                      <th className="pb-3 pr-2">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentOrders.map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-muted/10">
                        <td className="py-4 pr-2">
                          <span className="font-black text-blue-500 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded text-xs whitespace-nowrap">
                            Table &nbsp; {ord.tableNumber}
                          </span>
                        </td>
                        <td className="py-4 pr-2 font-mono font-bold text-foreground">
                          {ord.orderId}
                        </td>
                        <td className="py-4 pr-2">
                          <div className="space-y-1 font-semibold text-foreground">
                            {ord.items.map((item, idx) => (
                              <div key={idx} className="text-xs">
                                {item.name} &nbsp;&nbsp; <span className="text-muted-foreground">x &nbsp;{item.quantity}</span>
                              </div>
                            ))}
                            <div className="w-12 border-t-2 border-border/50 my-1.5"></div>
                            <div className="text-[10px] font-bold text-foreground">
                              Total: ₹{(ord.totalAmount / 100).toFixed(2)}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-2">
                          <span className="w-fit text-[9px] font-black uppercase px-2.5 py-1 rounded-xl flex items-center border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 bg-emerald-500" />
                            Completed
                          </span>
                        </td>
                        <td className="py-4 pr-2">
                          <span className="w-fit text-[9px] font-black uppercase px-2.5 py-1 rounded-xl flex items-center border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 bg-emerald-500" />
                            Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Food Catalog Item Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in exclude-uppercase">
          <div className="w-full max-w-2xl bg-card border border-border/40 p-5 md:p-6 rounded-2xl shadow-2xl relative text-foreground max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsMenuModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-outfit text-md font-bold uppercase tracking-wider mb-5 text-foreground">
              {editingItemIndex === -1 ? 'Create Food Catalog Item' : 'Edit Food Catalog Item'}
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - Form Fields */}
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Name of item"
                    value={modalForm.name}
                    onChange={(e) => setModalForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Price (₹)"
                    value={modalForm.price}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d.]/g, '');
                      setModalForm(prev => ({ ...prev, price: cleaned }));
                    }}
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="GST PERCENTAGE"
                      value={modalForm.gst}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/[^\d.]/g, '');
                        setModalForm(prev => ({ ...prev, gst: cleaned }));
                      }}
                      className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="flex border border-input rounded-xl bg-background dark:bg-black/20 focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                  <input
                    type="text"
                    placeholder="Other Charges"
                    value={modalForm.otherCharges}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d.]/g, '');
                      setModalForm(prev => ({ ...prev, otherCharges: cleaned }));
                    }}
                    className="flex-1 bg-transparent px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <select
                    value={modalForm.otherChargesType}
                    onChange={(e) => setModalForm(prev => ({ ...prev, otherChargesType: e.target.value }))}
                    className="bg-muted border-l border-input px-3 py-2.5 text-xs font-bold text-foreground focus:outline-none cursor-pointer outline-none"
                  >
                    <option value="percentage">%</option>
                    <option value="rupees">₹</option>
                  </select>
                </div>

                <div>
                  <textarea
                    placeholder="Brief description about the dish..."
                    value={modalForm.description}
                    onChange={(e) => setModalForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full h-20 bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <select
                    value={modalForm.category}
                    onChange={(e) => setModalForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer"
                  >
                    {menuCategories.map(cat => (
                      <option key={cat} value={cat} className="bg-card text-foreground">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="modalItemAvailable"
                    checked={modalForm.isAvailable}
                    onChange={(e) => setModalForm(prev => ({ ...prev, isAvailable: e.target.checked }))}
                    className="w-4 h-4 rounded accent-primary cursor-pointer border border-input"
                  />
                  <label htmlFor="modalItemAvailable" className="text-xs font-bold text-foreground cursor-pointer uppercase select-none">
                    Available for Ordering
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="modalItemPopular"
                    checked={modalForm.isPopular}
                    onChange={(e) => setModalForm(prev => ({ ...prev, isPopular: e.target.checked }))}
                    className="w-4 h-4 rounded accent-amber-500 cursor-pointer border border-input"
                  />
                  <label htmlFor="modalItemPopular" className="text-xs font-bold text-foreground cursor-pointer uppercase select-none flex items-center space-x-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 inline mr-1" />
                    <span>Feature in Popular Section</span>
                  </label>
                </div>
              </div>

              {/* Right Column - Image Upload & Food Preference */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="relative w-full h-36 overflow-hidden rounded-xl border border-border/40 bg-muted/30 dark:bg-black/40 flex items-center justify-center shrink-0">
                    {modalForm.imageUrl ? (
                      <div className="w-full h-full overflow-hidden">
                        <img
                          src={resolveMediaUrl(modalForm.imageUrl)}
                          alt="Preview"
                          style={{ transform: `scale(${zoomFactor / 100})` }}
                          className="w-full h-full object-cover transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground text-xs p-3 font-semibold uppercase">
                        <UtensilsCrossed className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-foreground/70">No Cover Photo</span>
                      </div>
                    )}

                    {/* Pencil and Delete overlay */}
                    <div className="absolute top-2 right-2 flex space-x-1.5 bg-black/50 backdrop-blur-sm p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1 hover:text-primary text-white transition-colors"
                        title="Edit Image"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {modalForm.imageUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this cover image?")) {
                              setModalForm(prev => ({ ...prev, imageUrl: '' }));
                            }
                          }}
                          className="p-1 hover:text-destructive text-white transition-colors"
                          title="Delete Image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Tab Navigation */}
                  <div className="border-b border-border/40">
                    <div className="flex space-x-4 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setImageTab('upload')}
                        className={`pb-1.5 border-b-2 transition-all uppercase ${imageTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageTab('url')}
                        className={`pb-1.5 border-b-2 transition-all uppercase ${imageTab === 'url' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        Direct URL Link
                      </button>
                    </div>
                  </div>

                  {/* Upload Inputs */}
                  <div className="min-h-[40px] flex items-center">
                    {imageTab === 'upload' ? (
                      <div className="w-full">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleModalImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full bg-background hover:bg-muted border border-input rounded-xl py-2 text-xs font-semibold text-foreground transition-all cursor-pointer text-center uppercase"
                        >
                          Choose Cover Image
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="https://example.com/image.jpg"
                        value={modalForm.imageUrl.startsWith('http') ? modalForm.imageUrl : (imageTab === 'url' ? (modalForm.imageUrl.startsWith('/') ? '' : modalForm.imageUrl) : '')}
                        onChange={(e) => setModalForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all exclude-uppercase"
                      />
                    )}
                  </div>

                  {/* Zoom Factor Slider */}
                  {modalForm.imageUrl && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                        <span>Zoom Factor</span>
                        <span className="text-primary">{zoomFactor}%</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="200"
                        value={zoomFactor}
                        onChange={(e) => setZoomFactor(parseInt(e.target.value, 10))}
                        className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  )}

                  {/* Relocated Dietary Preference Selector (Right Column under Image Upload) */}
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Food Preference</span>
                    <div className="flex items-center space-x-6">
                      {/* Veg Radio Option */}
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="modalIsVeg"
                          checked={modalForm.isVeg === true}
                          onChange={() => setModalForm(prev => ({ ...prev, isVeg: true }))}
                          className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        />
                        <div className="w-5 h-5 border-2 border-emerald-600 rounded flex items-center justify-center bg-emerald-500/10 shrink-0">
                          <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full" />
                        </div>
                        <span className="text-xs font-bold text-foreground">Veg</span>
                      </label>

                      {/* Non-Veg Radio Option */}
                      <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="modalIsVeg"
                          checked={modalForm.isVeg === false}
                          onChange={() => setModalForm(prev => ({ ...prev, isVeg: false }))}
                          className="w-4 h-4 accent-red-500 cursor-pointer"
                        />
                        <div className="w-5 h-5 border-2 border-red-600 rounded flex items-center justify-center bg-red-500/10 shrink-0">
                          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[9px] border-b-red-600" />
                        </div>
                        <span className="text-xs font-bold text-foreground">Non-Veg</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-border/40 mt-6">
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="px-5 py-2.5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalItem}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all text-xs cursor-pointer uppercase shadow-md"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-6">
            <button
              onClick={() => {
                setIsCategoryModalOpen(false);
                setNewCategoryName('');
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 border-b border-border/40 pb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <Settings className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="font-outfit text-md font-bold tracking-tight">Manage Menu Categories</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Customize food categories for your digital ordering tablet.</p>
              </div>
            </div>

            {/* List of categories */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {menuCategories.map((cat) => (
                <div key={cat} className="flex justify-between items-center p-2 rounded-xl bg-muted/20 border border-border/20 text-xs font-bold">
                  <span className="text-foreground">{cat}</span>
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete category "${cat}"?`)) {
                        const updated = menuCategories.filter(c => c !== cat);
                        handleSaveCategories(updated);
                      }
                    }}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
                    title={`Delete category ${cat}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new category form */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <span className="text-[10px] font-black uppercase text-muted-foreground">Add New Category</span>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Category Name (e.g. Soup)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                />
                <button
                  onClick={() => {
                    const trimmed = newCategoryName.trim();
                    if (!trimmed) return;
                    if (menuCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
                      setError('Category already exists!');
                      return;
                    }
                    const updated = [...menuCategories, trimmed];
                    handleSaveCategories(updated);
                    setNewCategoryName('');
                  }}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all shadow-sm"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
                className="px-5 py-2 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Authorization Modal for UPI Configuration */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in exclude-uppercase">
          <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-5">
            <button
              type="button"
              onClick={() => {
                setShowPasswordModal(false);
                setConfirmPasswordInput('');
                setPasswordVerifyError('');
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-500">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-outfit text-base font-bold text-foreground">Security Verification</h3>
                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Confirm account password to configure payout details</p>
              </div>
            </div>

            {passwordVerifyError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-bold text-left animate-fade-in">
                {passwordVerifyError}
              </div>
            )}

            <form onSubmit={handleVerifyPasswordSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Account Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter your account password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={isVerifyingPassword}
                  className="flex-1 bg-[#0069a8] hover:bg-[#005b94] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-xs cursor-pointer shadow-md flex items-center justify-center space-x-2"
                >
                  {isVerifyingPassword ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Confirm & Continue</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setConfirmPasswordInput('');
                    setPasswordVerifyError('');
                  }}
                  disabled={isVerifyingPassword}
                  className="px-5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure UPI Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            className="bg-card border border-border/40 rounded-2xl w-full p-6 relative flex flex-col space-y-4 shadow-2xl overflow-y-auto"
            style={{ maxWidth: '85%', maxHeight: '80%' }}
          >
            <button
              onClick={() => {
                setShowUpiModal(false);
                setTempUpiInput('');
                setTempPayeeName('');
                setIsUpiVerified(false);
                setModalError('');
                setModalInfo('');
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-outfit text-md font-bold text-foreground">Configure UPI Payments</h3>
              <p className="text-[11px] text-muted-foreground mt-1 font-semibold">Upload your UPI QR code or enter details manually.</p>
            </div>

            {/* Notification messages */}
            {modalError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-[10px] text-destructive font-bold text-left animate-fade-in">
                {modalError}
              </div>
            )}
            {modalInfo && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-600 dark:text-emerald-400 font-bold text-left animate-fade-in">
                {modalInfo}
              </div>
            )}

            {/* Side-by-side layout container */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: QR Upload & Manual Entry */}
              <div className="flex flex-col space-y-4 md:col-span-5">
                {/* QR Code Upload Zone (Smaller, compact height, fully clickable) */}
                <div className="border border-dashed border-border/60 rounded-xl p-3 bg-muted/20 flex flex-col items-center justify-center text-center space-y-1 relative transition-all hover:bg-muted/30 cursor-pointer min-h-[90px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrCodeUpload}
                    disabled={isUploadingQr}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                  />
                  <div className="flex items-center justify-center space-x-2 pointer-events-none z-10">
                    <QrCode className="w-5 h-5 text-[#0069a8] opacity-70 animate-pulse shrink-0" />
                    <span className="text-xs font-bold text-foreground">
                      {isUploadingQr ? 'Scanning QR Code...' : 'Upload UPI QR Code Image'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground pointer-events-none z-10">
                    Upload a screenshot or photo of your UPI QR code
                  </span>
                </div>

                {/* Manual Entry & Save */}
                <div className="flex flex-col space-y-3 pt-1">
                  <div className="space-y-3">
                    <div className="flex space-x-2 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">UPI ID</label>
                        <input
                          type="text"
                          placeholder="enter upi id (e.g. name@bank)"
                          value={tempUpiInput}
                          onChange={(e) => {
                            setTempUpiInput(e.target.value);
                            setIsUpiVerified(false);
                            setModalError('');
                            setModalInfo('');
                          }}
                          className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all exclude-uppercase"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyUpi}
                        disabled={isVerifyingUpi || !tempUpiInput.includes('@')}
                        className="bg-[#0069a8]/10 hover:bg-[#0069a8]/20 disabled:opacity-50 text-[#0069a8] border border-[#0069a8]/20 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer h-[34px] flex items-center justify-center shrink-0 min-w-[70px]"
                      >
                        {isVerifyingUpi ? (
                          <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          'Verify'
                        )}
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Payee Name (Optional)</label>
                      <input
                        type="text"
                        placeholder="enter payee name (e.g. Shop Name)"
                        value={tempPayeeName}
                        onChange={(e) => setTempPayeeName(e.target.value)}
                        className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-3.5 py-2 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all exclude-uppercase"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveNewUpi}
                    disabled={!isUpiVerified}
                    className="w-full bg-[#0069a8] hover:bg-[#005b94] disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Save UPI ID</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Saved list */}
              <div className="border-t md:border-t-0 md:border-l border-border/40 pt-4 md:pt-0 md:pl-6 flex flex-col min-h-0 md:col-span-7">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Saved UPI IDs</h4>

                {savedUpiList.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No saved UPI IDs found. Add one above.</p>
                ) : (
                  <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-[150px] max-h-72">
                    {savedUpiList.map((item, idx) => {
                      const isActive = paymentConfig.upiId === item.upiId;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between ${isActive
                            ? 'bg-primary/5 border-[#0069a8] shadow-sm'
                            : 'bg-background hover:bg-muted border-border/40'
                            }`}
                        >
                          <div className="flex flex-col space-y-0.5 text-left min-w-0 flex-1 mr-4">
                            <span className={`text-xs font-mono font-bold truncate ${isActive ? 'text-[#0069a8]' : 'text-foreground'}`} title={item.upiId}>
                              {item.upiId}
                            </span>
                            {item.payeeName && (
                              <span className="text-[10px] text-muted-foreground font-semibold truncate" title={item.payeeName}>
                                Name: {item.payeeName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {isActive ? (
                              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg uppercase tracking-wider select-none">
                                Active
                              </span>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectActiveUpi(item.upiId, item.payeeName);
                                }}
                                className="text-[9px] font-black text-[#0069a8] bg-[#0069a8]/10 hover:bg-[#0069a8]/20 border border-[#0069a8]/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer uppercase tracking-wider"
                              >
                                Make Default
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteUpi(item.upiId);
                              }}
                              className="text-muted-foreground hover:text-destructive p-1 transition-colors cursor-pointer"
                              title="Delete UPI"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure Taxes Modal */}
      {showGlobalTaxesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in exclude-uppercase">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-md p-6 relative flex flex-col space-y-4 shadow-2xl">
            <button
              onClick={() => setShowGlobalTaxesModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-outfit text-md font-bold text-foreground">Configure Taxes</h3>
              <p className="text-[11px] text-muted-foreground mt-1 font-semibold">Set default taxes & charges applied to all menu items unless overridden.</p>
            </div>

            {globalTaxesError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-[10px] text-destructive font-bold text-left animate-fade-in">
                {globalTaxesError}
              </div>
            )}

            <div className="space-y-4 text-xs font-semibold text-foreground">
              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">GST</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 5"
                    value={globalGstInput}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d.]/g, '');
                      setGlobalGstInput(cleaned);
                    }}
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Other Charges</label>
                <div className="flex border border-input rounded-xl bg-background dark:bg-black/20 focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                  <input
                    type="text"
                    placeholder="e.g. 10"
                    value={globalOtherChargesInput}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d.]/g, '');
                      setGlobalOtherChargesInput(cleaned);
                    }}
                    className="flex-1 bg-transparent px-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                  <select
                    value={globalOtherChargesType}
                    onChange={(e) => setGlobalOtherChargesType(e.target.value)}
                    className="bg-muted border-l border-input px-3 py-3 text-xs font-bold text-foreground focus:outline-none cursor-pointer outline-none"
                  >
                    <option value="percentage">%</option>
                    <option value="rupees">₹</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={async () => {
                    const gstVal = globalGstInput !== '' ? parseFloat(globalGstInput) : 0;
                    const otherVal = globalOtherChargesInput !== '' ? parseFloat(globalOtherChargesInput) : 0;
                    if (isNaN(gstVal) || gstVal < 0) {
                      setGlobalTaxesError('Please enter a valid GST percentage');
                      return;
                    }
                    if (isNaN(otherVal) || otherVal < 0) {
                      setGlobalTaxesError('Please enter a valid other charges value');
                      return;
                    }

                    setGlobalTaxesError('');
                    setGlobalTaxesLoading(true);
                    try {
                      await axios.post(`${API_BASE}/host/menu`, {
                        hostApplicationId: selectedOutletId,
                        items: menuItems,
                        categories: menuCategories,
                        defaultGst: gstVal,
                        defaultOtherCharges: otherVal,
                        defaultOtherChargesType: globalOtherChargesType
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      setMenuDefaultGst(gstVal);
                      setMenuDefaultOtherCharges(otherVal);
                      setMenuDefaultOtherChargesType(globalOtherChargesType);

                      originalMenuRef.current = JSON.stringify({
                        items: menuItems,
                        categories: menuCategories,
                        defaultGst: gstVal,
                        defaultOtherCharges: otherVal,
                        defaultOtherChargesType: globalOtherChargesType
                      });
                      setMenuItems([...menuItems]);

                      showToast('Global taxes applied successfully!', 'success');
                      setShowGlobalTaxesModal(false);
                    } catch (err) {
                      setGlobalTaxesError(err.response?.data?.message || 'Failed to apply global taxes.');
                    } finally {
                      setGlobalTaxesLoading(false);
                    }
                  }}
                  disabled={globalTaxesLoading}
                  className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg flex items-center justify-center"
                >
                  {globalTaxesLoading ? 'Applying...' : 'Apply to All'}
                </button>
                <button
                  onClick={() => setShowGlobalTaxesModal(false)}
                  disabled={globalTaxesLoading}
                  className="px-5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Become Advertiser Modal */}
      {showBecomeAdvertiserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-outfit text-md font-bold tracking-tight">Become an Advertiser</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Activate advertising campaigns on your account</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              By activating the Advertiser profile, you will be able to book ad campaigns on tabletop tablets and large wall screens, manage your video assets, and view campaign analytical reports.
              <br /><br />
              This will use your same phone number and credentials, allowing you to seamlessly switch between your Host and Advertiser spaces.
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={handleBecomeAdvertiser}
                disabled={roleActionLoading}
                className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg glow-hover flex items-center justify-center space-x-2"
              >
                <span>{roleActionLoading ? 'Activating...' : 'Activate Advertiser Persona'}</span>
              </button>
              <button
                onClick={() => setShowBecomeAdvertiserModal(false)}
                disabled={roleActionLoading}
                className="px-5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Get More Devices Modal */}
      {showGetMoreDevicesModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                <Tablet className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-outfit text-md font-bold tracking-tight">Request More Devices</h3>
                <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 font-bold">
                  For Venue: {applications.find(app => app._id === selectedOutletId)?.outletName || 'Select Venue'}
                </p>
              </div>
            </div>

            <form onSubmit={handleRequestMoreDevices} className="space-y-4 text-xs font-semibold text-foreground">
              {reqDeviceError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
                  {reqDeviceError}
                </div>
              )}

              <div className="space-y-3 border-t border-border/60 pt-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Select Devices to Request</span>

                <div className="grid grid-cols-1 gap-4">
                  {/* Tablet Checkbox and qty */}
                  <div className="p-4 bg-background/50 rounded-2xl border border-border/40 space-y-3">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reqRequestTablet}
                        onChange={(e) => setReqRequestTablet(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground">Tabletop Ordering Tablet</span>
                    </label>
                    {reqRequestTablet && (
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Quantity of Tablets"
                        value={reqTabletQuantity}
                        onChange={(e) => setReqTabletQuantity(e.target.value)}
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                      />
                    )}
                  </div>

                  {/* Screen Checkbox and qty */}
                  <div className="p-4 bg-background/50 rounded-2xl border border-border/40 space-y-3">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reqRequestScreen}
                        onChange={(e) => setReqRequestScreen(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground">Large Wall Display Screen</span>
                    </label>
                    {reqRequestScreen && (
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Quantity of Screens"
                        value={reqScreenQuantity}
                        onChange={(e) => setReqScreenQuantity(e.target.value)}
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={reqDeviceLoading}
                  className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>{reqDeviceLoading ? 'Submitting...' : 'Submit Request'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGetMoreDevicesModal(false)}
                  disabled={reqDeviceLoading}
                  className="px-5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Host Application Details Modal */}
      {showEditApplicationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-outfit text-md font-bold tracking-tight">Edit Venue & Application Details</h3>
                  <p className="text-[11px] text-muted-foreground font-semibold">Update contact person, mobile number, address or outlet details.</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditApplicationModal(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedApplication} className="space-y-4 text-xs font-semibold text-foreground">
              {editAppError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl">
                  {editAppError}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Outlet Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Outlet Name"
                    value={editAppForm.outletName}
                    onChange={(e) => setEditAppForm({ ...editAppForm, outletName: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Contact Person Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Contact Person Name"
                    value={editAppForm.contactPerson}
                    onChange={(e) => setEditAppForm({ ...editAppForm, contactPerson: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Outlet Description</label>
                <textarea
                  required
                  placeholder="Outlet Description"
                  value={editAppForm.outletDescription}
                  onChange={(e) => setEditAppForm({ ...editAppForm, outletDescription: e.target.value })}
                  className="w-full h-20 bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Door / Shop No</label>
                  <input
                    type="text"
                    required
                    placeholder="Door / Shop No"
                    value={editAppForm.doorNo}
                    onChange={(e) => setEditAppForm({ ...editAppForm, doorNo: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Street / Location</label>
                  <input
                    type="text"
                    required
                    placeholder="Street / Location"
                    value={editAppForm.street}
                    onChange={(e) => setEditAppForm({ ...editAppForm, street: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">ZIP Code</label>
                  <input
                    type="text"
                    required
                    placeholder="ZIP Code"
                    value={editAppForm.zipCode}
                    onChange={(e) => handleEditAppZipCodeChange(e.target.value)}
                    className={`w-full bg-background border ${editAppZipError ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'} rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 transition-all`}
                  />
                  {editAppZipError && (
                    <p className="text-[10px] text-destructive font-semibold mt-1.5 ml-1">{editAppZipError}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">City</label>
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={editAppForm.city}
                    onChange={(e) => setEditAppForm({ ...editAppForm, city: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">State</label>
                  <select
                    required
                    value={editAppForm.state}
                    onChange={(e) => setEditAppForm({ ...editAppForm, state: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
                  >
                    <option value="" disabled>Select State</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state} className="bg-background text-foreground">
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="Phone Number"
                    value={editAppForm.phone}
                    onChange={(e) => handleEditAppPhoneChange(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={editAppForm.email}
                    onChange={(e) => setEditAppForm({ ...editAppForm, email: e.target.value })}
                    className="w-full bg-background border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              {/* Venue Ad Mode Choice Section */}
              <div className="space-y-3 border-t border-border/40 pt-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Venue Ad Mode & Service Plan</span>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Open Ads Mode Option */}
                  <div
                    onClick={() => setEditAppForm({ ...editAppForm, allowOpenAds: true, adMode: 'open' })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${editAppForm.allowOpenAds !== false
                      ? 'bg-blue-500/10 border-blue-500/80 shadow-md ring-1 ring-blue-500/50'
                      : 'bg-background/50 border-border/40 hover:border-border'
                      }`}
                  >
                    <div className="flex items-center space-x-2.5 mb-1.5">
                      <input
                        type="radio"
                        name="editAdMode"
                        checked={editAppForm.allowOpenAds !== false}
                        onChange={() => setEditAppForm({ ...editAppForm, allowOpenAds: true, adMode: 'open' })}
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground">Open Ads Mode</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-6 font-semibold">
                      Accept third-party brand advertisements on kiosk screens. Qualifies your venue for discounted/free hardware & SaaS platform tier.
                    </p>
                  </div>

                  {/* Closed / Private Mode Option */}
                  <div
                    onClick={() => setEditAppForm({ ...editAppForm, allowOpenAds: false, adMode: 'closed' })}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${editAppForm.allowOpenAds === false
                      ? 'bg-purple-500/10 border-purple-500/80 shadow-md ring-1 ring-purple-500/50'
                      : 'bg-background/50 border-border/40 hover:border-border'
                      }`}
                  >
                    <div className="flex items-center space-x-2.5 mb-1.5">
                      <input
                        type="radio"
                        name="editAdMode"
                        checked={editAppForm.allowOpenAds === false}
                        onChange={() => setEditAppForm({ ...editAppForm, allowOpenAds: false, adMode: 'closed' })}
                        className="w-4 h-4 accent-purple-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-foreground">Closed / Private Mode</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-6 font-semibold">
                      Exclusive internal venue usage only (digital menu & in-house promos). Excludes third-party ads (Private SaaS Tier).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-border/40">
                <button
                  type="submit"
                  disabled={editAppLoading}
                  className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-3 rounded-xl transition-all text-xs cursor-pointer shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>{editAppLoading ? 'Saving Changes...' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditApplicationModal(false)}
                  disabled={editAppLoading}
                  className="px-5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center space-x-3 border px-4 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success'
          ? 'bg-emerald-600 dark:bg-emerald-700 border-emerald-700 text-white'
          : 'bg-red-600 dark:bg-red-700 border-red-700 text-white'
          }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white shrink-0" />
          )}
          <div className="text-xs font-bold pr-4">
            {toast.message}
          </div>
          <button
            onClick={() => setToast(null)}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${toast.type === 'success'
              ? 'text-emerald-100 hover:bg-emerald-700 hover:text-white'
              : 'text-red-100 hover:bg-red-700 hover:text-white'
              }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
