'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  Tv,
  Smartphone,
  IndianRupee,
  ClipboardList,
  FileCheck,
  Percent,
  LogOut,
  Search,
  Plus,
  Check,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  TrendingUp,
  PieChart,
  HelpCircle,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building,
  UserCheck,
  Settings,
  Video,
  Mail,
  Phone,
  KeyRound,
  ShieldAlert,
  Edit,
  Trash2,
  Bell,
  Upload,
  BarChart3,
  Lock,
  Unlock,
  Sliders,
  Megaphone,
  MapPin,
  Clock,
  Layers,
  Play,
  Tablet,
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

export default function AdminPortal() {
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState('stats');
  const [theme, setTheme] = useState('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Core Lists States
  const [stats, setStats] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [rates, setRates] = useState([]);
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [deviceRequests, setDeviceRequests] = useState([]);
  const [selectedDeviceReq, setSelectedDeviceReq] = useState(null);
  const [showDeviceReqModal, setShowDeviceReqModal] = useState(false);
  const [deviceReqFilter, setDeviceReqFilter] = useState('pending');

  // Detail Modal states
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedHostApp, setSelectedHostApp] = useState(null);
  const [showVenueModal, setShowVenueModal] = useState(false);

  // Advertiser Account & Campaign Modals
  const [selectedAdvertiserUser, setSelectedAdvertiserUser] = useState(null);
  const [showAdvertiserAdsModal, setShowAdvertiserAdsModal] = useState(false);

  // Campaign Tab Modal & Filter States
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReasonText, setDenyReasonText] = useState('');
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  const [watchedVideos, setWatchedVideos] = useState(new Set());

  // Deploy device form
  const [deviceForm, setDeviceForm] = useState({
    deviceType: 'tablet',
    hostApplicationId: ''
  });
  const [showDeployForm, setShowDeployForm] = useState(false);

  // Rates Form
  const [rateForm, setRateForm] = useState({
    rateId: '',
    deviceType: 'tablet',
    mediaType: 'video',
    durationDays: '7',
    frequency: 'hourly',
    amount: ''
  });
  const [editingRateId, setEditingRateId] = useState(null);
  const [frequencyOption, setFrequencyOption] = useState('hourly');
  const [customMinutes, setCustomMinutes] = useState('45');

  const [toasts, setToasts] = useState([]);

  // User edit/delete states
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ name: '', phone: '', email: '', roles: [] });
  const [deletingUser, setDeletingUser] = useState(null);
  const [adminDeletePassword, setAdminDeletePassword] = useState('');

  // Quota Override Modal States
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [quotaForm, setQuotaForm] = useState({
    customMaxVideoSlots: '',
    customDailyVideoQuota: '',
    customMaxImageSlots: '',
    customDailyImageQuota: '',
    customMaxScreenSlots: '',
    customDailyScreenQuota: ''
  });

  const openQuotaModal = (hostApp) => {
    setSelectedHostApp(hostApp);
    const isClosedVenue = hostApp?.allowOpenAds === false || hostApp?.adMode === 'closed';
    setQuotaForm({
      customMaxVideoSlots: hostApp?.customMaxVideoSlots ?? (isClosedVenue ? 3 : 2),
      customDailyVideoQuota: hostApp?.customDailyVideoQuota ?? (isClosedVenue ? 6 : 4),
      customMaxImageSlots: hostApp?.customMaxImageSlots ?? (isClosedVenue ? 8 : 3),
      customDailyImageQuota: hostApp?.customDailyImageQuota ?? (isClosedVenue ? 15 : 10),
      customMaxScreenSlots: hostApp?.customMaxScreenSlots ?? (isClosedVenue ? 8 : 3),
      customDailyScreenQuota: hostApp?.customDailyScreenQuota ?? (isClosedVenue ? 6 : 4)
    });
    setIsQuotaModalOpen(true);
  };

  const handleResetQuotaDefaults = () => {
    if (!selectedHostApp) return;
    const isClosedVenue = selectedHostApp?.allowOpenAds === false || selectedHostApp?.adMode === 'closed';
    setQuotaForm({
      customMaxVideoSlots: isClosedVenue ? 3 : 2,
      customDailyVideoQuota: isClosedVenue ? 6 : 4,
      customMaxImageSlots: isClosedVenue ? 8 : 3,
      customDailyImageQuota: isClosedVenue ? 15 : 10,
      customMaxScreenSlots: isClosedVenue ? 8 : 3,
      customDailyScreenQuota: isClosedVenue ? 6 : 4
    });
  };

  const handleSaveQuotas = async () => {
    if (!selectedHostApp) return;
    try {
      const res = await axios.put(`${API_BASE}/admin/hosts/${selectedHostApp._id}/status`, quotaForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        showNotification('Host quota overrides updated successfully!', 'success');
        setSelectedHostApp(res.data.data);
        fetchHosts(token);
        setIsQuotaModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      showNotification(err.response?.data?.message || 'Failed to update quotas.', 'error');
    }
  };

  // Watermark management state
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [watermarkForm, setWatermarkForm] = useState({
    showPoweredBy: true,
    customWatermark: 'POWERED BY - DIGIADS'
  });
  const [watermarkSaving, setWatermarkSaving] = useState(false);

  const openWatermarkModal = (hostApp) => {
    setSelectedHostApp(hostApp);
    const billConfig = hostApp?.billConfig || {};
    setWatermarkForm({
      showPoweredBy: billConfig.showPoweredBy !== false,
      customWatermark: billConfig.customWatermark !== undefined ? billConfig.customWatermark : 'POWERED BY - DIGIADS'
    });
    setShowWatermarkModal(true);
  };

  const handleSaveWatermark = async () => {
    if (!selectedHostApp || !token) return;
    setWatermarkSaving(true);
    try {
      const res = await axios.put(`${API_BASE}/admin/hosts/${selectedHostApp._id}/watermark`, watermarkForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success) {
        showNotification('Venue watermark updated successfully!', 'success');
        setShowWatermarkModal(false);
        if (res.data.data) {
          setSelectedHostApp(res.data.data);
        }
        fetchHosts(token);
      }
    } catch (err) {
      console.error('handleSaveWatermark error:', err.message);
      showNotification(err.response?.data?.message || 'Failed to update watermark', 'error');
    } finally {
      setWatermarkSaving(false);
    }
  };

  // Sub-tabs & Filter states
  const [deviceSubTab, setDeviceSubTab] = useState('tablet');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState('all');
  const [userSubTab, setUserSubTab] = useState('merchant');
  const [rateSubTab, setRateSubTab] = useState('tablet');
  const [hostFilter, setHostFilter] = useState('pending');
  const [adFilter, setAdFilter] = useState('pending');

  // Venue & Advertiser dedicated tab filters
  const [venueStatusFilter, setVenueStatusFilter] = useState('all');
  const [campaignFormatFilter, setCampaignFormatFilter] = useState('all');
  const [campaignDisplayFilter, setCampaignDisplayFilter] = useState('all');

  // Combined Requests Tab subtab
  const [requestsSubTab, setRequestsSubTab] = useState('campaigns');

  // Revoke modal states
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokePassword, setRevokePassword] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Dashboard graph filtering range
  const [chartRange, setChartRange] = useState(7);

  // Paid Advertisers Revenue Modal
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  // Campaign Analytics Modal (Parity with Advertiser Portal)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsBookingId, setAnalyticsBookingId] = useState('');
  const [activeAnalyticsData, setActiveAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState([]);
  const notificationsRef = useRef(null);

  // Global Search Dropdown State & Ref
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Comprehensive Multi-Entity Global Search Computation
  const searchResults = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { venues: [], campaigns: [], users: [], devices: [], requests: [], total: 0 };

    const match = (field) => {
      if (field === null || field === undefined) return false;
      return String(field).toLowerCase().includes(query);
    };

    // 1. Search Venues / Host Applications
    const matchedVenues = hosts.filter(h =>
      match(h._id) ||
      match(h.outletName) ||
      match(h.applicantName) ||
      match(h.addressLine1) ||
      match(h.addressLine2) ||
      match(h.city) ||
      match(h.state) ||
      match(h.zipCode) ||
      match(h.phone) ||
      match(h.email) ||
      match(h.status) ||
      match(h.billConfig?.billPrefix) ||
      match(h.billConfig?.gstin) ||
      match(h.billConfig?.fssaiNo) ||
      match(h.userId?.name) ||
      match(h.userId?.phone) ||
      match(h.userId?.email)
    );

    // 2. Search Ad Bookings & Campaigns
    const matchedCampaigns = campaigns.filter(c =>
      match(c._id) ||
      match(c.campaignName) ||
      match(c.approvalStatus) ||
      match(c.paymentStatus) ||
      match(c.mediaType) ||
      match(c.targetScreenType) ||
      match(c.paymentDetails?.txnId) ||
      match(c.paymentDetails?.merchantTransactionId) ||
      match(c.userId?.name) ||
      match(c.userId?.phone) ||
      match(c.userId?.email) ||
      (Array.isArray(c.targetOutlets) && c.targetOutlets.some(o => match(o) || match(o?.outletName)))
    );

    // 3. Search Users (Hosts, Advertisers, Admins)
    const matchedUsers = users.filter(u =>
      match(u._id) ||
      match(u.name) ||
      match(u.phone) ||
      match(u.email) ||
      match(u.role) ||
      (Array.isArray(u.roles) && u.roles.some(r => match(r)))
    );

    // 4. Search Devices
    const matchedDevices = devices.filter(d =>
      match(d._id) ||
      match(d.deviceId) ||
      match(d.deviceType) ||
      match(d.status) ||
      match(d.hostApplicationId?.outletName) ||
      match(d.hostApplicationId?._id)
    );

    // 5. Search Device Hardware Requests
    const matchedRequests = deviceRequests.filter(r =>
      match(r._id) ||
      match(r.deviceType) ||
      match(r.status) ||
      match(r.reason) ||
      match(r.hostApplicationId?.outletName) ||
      match(r.userId?.name) ||
      match(r.userId?.phone)
    );

    const total = matchedVenues.length + matchedCampaigns.length + matchedUsers.length + matchedDevices.length + matchedRequests.length;

    return {
      venues: matchedVenues,
      campaigns: matchedCampaigns,
      users: matchedUsers,
      devices: matchedDevices,
      requests: matchedRequests,
      total
    };
  }, [searchQuery, hosts, campaigns, users, devices, deviceRequests]);

  const handleSelectSearchResult = (type, item) => {
    setSearchQuery('');
    setShowSearchDropdown(false);

    if (type === 'venue') {
      setSelectedHostApp(item);
      setShowVenueModal(true);
      setActiveTab('venues');
    } else if (type === 'campaign') {
      setSelectedCampaign(item);
      setShowDetailsModal(true);
      if (item.approvalStatus === 'pending') {
        setActiveTab('requests');
        setRequestsSubTab('campaigns');
      } else {
        setActiveTab('campaigns');
      }
    } else if (type === 'user') {
      if (item.role === 'advertiser' || (Array.isArray(item.roles) && item.roles.includes('advertiser'))) {
        setSelectedAdvertiserUser(item);
        setShowAdvertiserAdsModal(true);
        setActiveTab('advertisers');
      } else {
        setEditingUser(item);
        setUserForm({
          name: item.name || '',
          phone: item.phone || '',
          email: item.email || '',
          roles: Array.isArray(item.roles) ? item.roles : (item.role ? [item.role] : ['host'])
        });
        setActiveTab('users');
      }
    } else if (type === 'device') {
      setActiveTab('devices');
      setDeviceSubTab(item.deviceType || 'tablet');
    } else if (type === 'request') {
      setSelectedDeviceReq(item);
      setShowDeviceReqModal(true);
      setActiveTab('requests');
      setRequestsSubTab('devices');
    }
  };

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('adminTheme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedTab = localStorage.getItem('adminActiveTab');
    if (savedTab) setActiveTab(savedTab);

    const savedDeviceSubTab = localStorage.getItem('adminDeviceSubTab');
    if (savedDeviceSubTab) setDeviceSubTab(savedDeviceSubTab);

    const savedVenueFilter = localStorage.getItem('adminSelectedVenueFilter') || 'all';
    setSelectedVenueFilter(savedVenueFilter);

    const savedUserSubTab = localStorage.getItem('adminUserSubTab');
    if (savedUserSubTab) setUserSubTab(savedUserSubTab);

    const savedRateSubTab = localStorage.getItem('adminRateSubTab');
    if (savedRateSubTab) setRateSubTab(savedRateSubTab);

    const savedHostFilter = localStorage.getItem('adminHostFilter') || 'pending';
    setHostFilter(savedHostFilter);

    const savedAdFilter = localStorage.getItem('adminAdFilter') || 'pending';
    setAdFilter(savedAdFilter);

    const savedRequestsSubTab = localStorage.getItem('adminRequestsSubTab');
    if (savedRequestsSubTab) setRequestsSubTab(savedRequestsSubTab);

    const savedChartRange = localStorage.getItem('adminChartRange');
    if (savedChartRange) setChartRange(parseInt(savedChartRange, 10));

    try {
      const savedRead = JSON.parse(localStorage.getItem('adminReadNotifications') || '[]');
      setReadNotifications(savedRead);
    } catch (e) { console.error(e); }

    const storedToken = localStorage.getItem('adminToken');
    const role = localStorage.getItem('adminRole');
    if (storedToken && role === 'admin') {
      setToken(storedToken);
      setIsAuthenticated(true);
      loadDashboardData(storedToken);
    }
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminDeviceSubTab', deviceSubTab);
  }, [deviceSubTab, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminSelectedVenueFilter', selectedVenueFilter);
  }, [selectedVenueFilter, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminUserSubTab', userSubTab);
  }, [userSubTab, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminRateSubTab', rateSubTab);
  }, [rateSubTab, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminHostFilter', hostFilter);
  }, [hostFilter, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminAdFilter', adFilter);
  }, [adFilter, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminRequestsSubTab', requestsSubTab);
  }, [requestsSubTab, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem('adminChartRange', chartRange.toString());
  }, [chartRange, mounted]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Telemetry Refresh Cooldown Timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Analytics Modal Auto-Polling (refreshes every 2 minutes when open)
  useEffect(() => {
    let interval;
    if (showAnalyticsModal && analyticsBookingId && token) {
      interval = setInterval(() => {
        fetchCampaignAnalytics(analyticsBookingId, true);
      }, 120000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showAnalyticsModal, analyticsBookingId, token]);

  // Real-time WebSocket updates
  useEffect(() => {
    if (!mounted || !isAuthenticated || !token) return;
    let ws = null;
    let reconnectTimeout = null;
    let reconnectDelay = 1000;
    const maxReconnectDelay = 30000;
    let stopReconnect = false;

    const connectWebSocket = () => {
      if (stopReconnect) return;
      if (ws) {
        try { ws.close(); } catch (e) { }
      }

      ws = new WebSocket(`${config.wsUrl}/ws/admin?token=${token}`);
      ws.onopen = () => { reconnectDelay = 1000; };
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.error && (payload.error.includes('token') || payload.error.includes('Access denied'))) {
            stopReconnect = true;
            try { ws.close(); } catch (e) { }
            return;
          }

          if (['new_host_app', 'host_app_reviewed', 'new_campaign', 'campaign_reviewed', 'report_updated', 'new_device_request', 'device_request_reviewed'].includes(payload.event)) {
            loadDashboardData(token);
          }
        } catch (e) {
          console.error('[WebSocket] Error parsing:', e.message);
        }
      };

      ws.onclose = () => {
        if (stopReconnect) return;
        reconnectTimeout = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
          connectWebSocket();
        }, reconnectDelay);
      };

      ws.onerror = () => {
        try { ws.close(); } catch (e) { }
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.onclose = null;
        try { ws.close(); } catch (e) { }
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [mounted, isAuthenticated, token]);

  const getNotificationsList = () => {
    const list = [];
    hosts.filter(h => h.status === 'pending').forEach(app => {
      list.push({
        id: `host_${app._id}`,
        title: 'New Venue Application',
        description: `Outlet: ${app.outletName} (${app.city})`,
        type: 'host',
        target: app,
        time: new Date(app.createdAt)
      });
    });

    campaigns.filter(c => c.paymentStatus === 'completed' && c.approvalStatus === 'pending').forEach(booking => {
      list.push({
        id: `campaign_${booking.bookingId}`,
        title: 'New Ad Campaign',
        description: `Campaign ${booking.bookingId} - ${booking.outletId?.outletName || 'Outlet'}`,
        type: 'campaign',
        target: booking,
        time: new Date(booking.createdAt)
      });
    });

    const now = new Date();
    campaigns.filter(c => c.paymentStatus === 'completed' && c.approvalStatus === 'approved').forEach(booking => {
      const expiryDate = new Date(booking.createdAt);
      expiryDate.setDate(expiryDate.getDate() + (booking.adDurationDays || 0));
      if (expiryDate < now) {
        list.push({
          id: `expired_${booking.bookingId}`,
          title: 'Expired Ad Subscription',
          description: `Campaign ${booking.bookingId} — ${booking.outletId?.outletName || 'Venue'}`,
          type: 'expired',
          target: booking,
          time: expiryDate
        });
      }
    });

    return list.sort((a, b) => b.time - a.time);
  };

  const notificationsList = getNotificationsList();
  const unreadNotificationsCount = notificationsList.filter(n => !readNotifications.includes(n.id)).length;

  const markAllNotificationsAsRead = () => {
    const allIds = notificationsList.map(n => n.id);
    setReadNotifications(allIds);
    localStorage.setItem('adminReadNotifications', JSON.stringify(allIds));
  };

  const handleNotificationClick = (item) => {
    if (!readNotifications.includes(item.id)) {
      const updated = [...readNotifications, item.id];
      setReadNotifications(updated);
      localStorage.setItem('adminReadNotifications', JSON.stringify(updated));
    }

    if (item.type === 'host') {
      setSelectedHostApp(item.target);
      setShowVenueModal(true);
    } else if (item.type === 'campaign' || item.type === 'expired') {
      setSelectedCampaign(item.target);
      setShowDetailsModal(true);
    }
    setShowNotifications(false);
  };

  const showToast = (type, message) => {
    if (!message) return;
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showNotification = (message, type = 'success') => {
    showToast(type, message);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('adminTheme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadDashboardData = async (authToken) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [statsRes, hostsRes, campaignsRes, ratesRes, devicesRes, usersRes, deviceReqsRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/stats`, { headers }).catch(() => ({ data: { data: null } })),
        axios.get(`${API_BASE}/admin/hosts`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/admin/bookings`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/admin/rates`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/admin/devices`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/admin/users`, { headers }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/admin/device-requests`, { headers }).catch(() => ({ data: { data: [] } }))
      ]);

      setStats(statsRes.data.data);
      setHosts(hostsRes.data.data || []);
      setCampaigns(campaignsRes.data.data || []);
      setRates(ratesRes.data.data || []);
      setDevices(devicesRes.data.data || []);
      setUsers(usersRes.data.data || []);
      setDeviceRequests(deviceReqsRes.data.data || []);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchHosts = async (authToken = token) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/hosts`, { headers: { Authorization: `Bearer ${authToken}` } });
      setHosts(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchCampaignAnalytics = async (bookingId, isSilent = false) => {
    if (!bookingId) return;
    if (!isSilent) setAnalyticsLoading(true);
    setAnalyticsBookingId(bookingId);
    setShowAnalyticsModal(true);

    try {
      const res = await axios.get(`${API_BASE}/ads/analytics/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setActiveAnalyticsData(res.data.data);
        setCooldownRemaining(30);
      }
    } catch (err) {
      console.error(err);
      if (!isSilent) {
        showNotification(err.response?.data?.message || 'Failed to load campaign analytics.', 'error');
      }
    } finally {
      if (!isSilent) setAnalyticsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        identifier: loginIdentifier,
        password: loginPassword
      });

      if (res.data.success) {
        const { token: jwtToken, user } = res.data.data;
        if (user.role !== 'admin' && !user.roles?.includes('admin')) {
          setLoginError('Access Denied: Administrator role required.');
          setLoginLoading(false);
          return;
        }

        localStorage.setItem('adminToken', jwtToken);
        localStorage.setItem('adminRole', 'admin');
        setToken(jwtToken);
        setIsAuthenticated(true);
        loadDashboardData(jwtToken);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Login failed. Verify credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    setIsAuthenticated(false);
    setToken('');
  };

  const handleReviewHost = async (hostId, status) => {
    try {
      const res = await axios.post(`${API_BASE}/admin/hosts/review`, {
        applicationId: hostId,
        action: status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        showNotification(`Venue application ${status} successfully!`, 'success');
        setShowVenueModal(false);
        setSelectedHostApp(null);
        loadDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleReviewCampaign = async (bookingId, status, rejectionReason = '') => {
    try {
      const payload = {
        bookingId,
        action: status,
        denialReason: rejectionReason
      };
      const res = await axios.post(`${API_BASE}/admin/bookings/review`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        showNotification(`Campaign ${bookingId} updated to ${status}!`, 'success');
        setSelectedCampaign(null);
        loadDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleRevokeCampaign = async (e) => {
    e.preventDefault();
    if (!selectedCampaign || !revokePassword || !revokeReason) {
      showNotification('Please fill in both admin password and reason for revocation.', 'error');
      return;
    }

    setRevokeLoading(true);
    try {
      const res = await axios.put(`${API_BASE}/admin/bookings/revoke/${selectedCampaign.bookingId}`, {
        reason: revokeReason,
        adminPassword: revokePassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        showNotification(`Campaign ${selectedCampaign.bookingId} revoked cleanly.`, 'success');
        setShowRevokeModal(false);
        setSelectedCampaign(null);
        setRevokePassword('');
        setRevokeReason('');
        loadDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to revoke campaign. Verify admin password.', 'error');
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleReviewDeviceRequest = async (requestId, status) => {
    try {
      const res = await axios.post(`${API_BASE}/admin/device-requests/review`, {
        requestId,
        action: status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        showNotification(`Device request ${status} successfully!`, 'success');
        setShowDeviceReqModal(false);
        setSelectedDeviceReq(null);
        loadDashboardData(token);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    try {
      const computedFrequency = frequencyOption === 'custom' ? `every_${customMinutes}_mins` : rateForm.frequency;
      const payload = {
        ...rateForm,
        frequency: computedFrequency,
        amount: Math.round(parseFloat(rateForm.amount) * 100)
      };

      if (editingRateId) {
        await axios.put(`${API_BASE}/admin/rates/${editingRateId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Ad rate updated successfully!', 'success');
      } else {
        await axios.post(`${API_BASE}/admin/rates`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('New ad rate created!', 'success');
      }

      setEditingRateId(null);
      setRateForm({ rateId: '', deviceType: 'tablet', mediaType: 'video', durationDays: '7', frequency: 'hourly', amount: '' });
      const ratesRes = await axios.get(`${API_BASE}/admin/rates`, { headers: { Authorization: `Bearer ${token}` } });
      setRates(ratesRes.data.data || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save ad rate.', 'error');
    }
  };

  const handleEditRate = (rate) => {
    setEditingRateId(rate._id);
    const isCustom = rate.frequency.startsWith('every_');
    setFrequencyOption(isCustom ? 'custom' : rate.frequency);
    if (isCustom) {
      const mins = rate.frequency.replace('every_', '').replace('_mins', '');
      setCustomMinutes(mins);
    }
    setRateForm({
      rateId: rate.rateId || '',
      deviceType: rate.deviceType,
      mediaType: rate.mediaType || 'video',
      durationDays: rate.durationDays.toString(),
      frequency: rate.frequency,
      amount: (rate.amount / 100).toString()
    });
  };

  const handleDeleteRate = async (rateId) => {
    if (!confirm('Are you sure you want to delete this rate?')) return;
    try {
      await axios.delete(`${API_BASE}/admin/rates/${rateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('Ad rate deleted.', 'success');
      const ratesRes = await axios.get(`${API_BASE}/admin/rates`, { headers: { Authorization: `Bearer ${token}` } });
      setRates(ratesRes.data.data || []);
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete rate.', 'error');
    }
  };

  const handleUserSave = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await axios.put(`${API_BASE}/admin/users/${editingUser._id}`, userForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        showNotification('User properties updated successfully!', 'success');
        setEditingUser(null);
        const usersRes = await axios.get(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
        setUsers(usersRes.data.data || []);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to update user.', 'error');
    }
  };

  const handleUserDelete = async (e) => {
    e.preventDefault();
    if (!deletingUser || !adminDeletePassword) {
      showNotification('Administrator password required for deletion.', 'error');
      return;
    }
    try {
      const res = await axios.delete(`${API_BASE}/admin/users/${deletingUser._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { adminPassword: adminDeletePassword }
      });
      if (res.data.success) {
        showNotification('User account deleted permanently.', 'success');
        setDeletingUser(null);
        setAdminDeletePassword('');
        const usersRes = await axios.get(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
        setUsers(usersRes.data.data || []);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to delete user. Check admin password.', 'error');
    }
  };

  const handleDeployDevice = async (e) => {
    e.preventDefault();
    if (!deviceForm.hostApplicationId) {
      showNotification('Please select a target approved venue outlet.', 'error');
      return;
    }
    try {
      const res = await axios.post(`${API_BASE}/admin/devices/deploy`, deviceForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        showNotification(`New ${deviceForm.deviceType} terminal deployed cleanly!`, 'success');
        setShowDeployForm(false);
        setDeviceForm({ deviceType: 'tablet', hostApplicationId: '' });
        const devRes = await axios.get(`${API_BASE}/admin/devices`, { headers: { Authorization: `Bearer ${token}` } });
        setDevices(devRes.data.data || []);
      }
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to deploy device.', 'error');
    }
  };

  // Helper getters for Advertiser Accounts & Campaigns
  const getAdvertiserCampaigns = (advertiserId) => {
    if (!advertiserId) return [];
    return campaigns.filter(c => {
      const advId = (c.advertiserId?._id || c.advertiserId)?.toString();
      return advId === advertiserId.toString();
    });
  };

  const getAdvertiserTotalSpend = (advertiserId) => {
    const advCampaigns = getAdvertiserCampaigns(advertiserId);
    const totalPaise = advCampaigns
      .filter(c => c.paymentStatus === 'completed')
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    return totalPaise / 100;
  };

  // Filter Computations
  const filteredCampaigns = campaigns.filter(c => {
    const isFilterMatch = adFilter === 'all' || c.approvalStatus === adFilter;
    if (!isFilterMatch) return false;

    const query = (searchQuery || campaignSearchQuery).trim().toLowerCase();
    if (!query) return true;
    return (
      c.bookingId.toLowerCase().includes(query) ||
      (c.outletId?.outletName || '').toLowerCase().includes(query) ||
      (c.advertiserId?.name || '').toLowerCase().includes(query) ||
      (c.advertiserId?.phone || '').includes(query) ||
      (c.city || '').toLowerCase().includes(query) ||
      (c.state || '').toLowerCase().includes(query)
    );
  });

  const approvedAdvertisersList = users.filter(u => {
    const isAdvertiser = u.roles ? u.roles.includes('advertiser') : u.role === 'advertiser';
    if (!isAdvertiser) return false;

    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      u._id.toLowerCase().includes(query) ||
      (u.name || '').toLowerCase().includes(query) ||
      u.phone.includes(query) ||
      (u.email || '').toLowerCase().includes(query)
    );
  });

  const filteredDevices = devices.filter(d => {
    if (d.deviceType !== deviceSubTab) return false;
    if (selectedVenueFilter !== 'all') {
      const deviceHostId = d.hostApplicationId?._id || d.hostApplicationId;
      if (deviceHostId !== selectedVenueFilter) return false;
    }
    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      d.deviceId.toLowerCase().includes(query) ||
      (d.hostApplicationId?.outletName || '').toLowerCase().includes(query) ||
      (d.hostApplicationId?.city || '').toLowerCase().includes(query) ||
      (d.hostApplicationId?.state || '').toLowerCase().includes(query)
    );
  });

  const filteredUsers = users.filter(u => {
    const isRoleMatch = u.roles ? u.roles.includes(userSubTab) : u.role === userSubTab;
    if (!isRoleMatch) return false;
    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      u._id.toLowerCase().includes(query) ||
      (u.name || '').toLowerCase().includes(query) ||
      u.phone.includes(query) ||
      (u.email || '').toLowerCase().includes(query)
    );
  });

  const filteredHosts = hosts.filter(h => {
    const isFilterMatch = hostFilter === 'all' || h.status === hostFilter;
    if (!isFilterMatch) return false;
    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      h._id.toLowerCase().includes(query) ||
      h.outletName.toLowerCase().includes(query) ||
      h.contactPerson.toLowerCase().includes(query) ||
      (h.userId?.name || '').toLowerCase().includes(query) ||
      h.phone.includes(query) ||
      (h.email || '').toLowerCase().includes(query) ||
      h.city.toLowerCase().includes(query) ||
      h.state.toLowerCase().includes(query)
    );
  });

  const approvedVenuesList = hosts.filter(h => {
    const isApproved = h.status === 'approved';
    if (!isApproved) return false;

    if (venueStatusFilter === 'paused' && !h.isPaused) return false;
    if (venueStatusFilter === 'revoked' && !h.isRevoked) return false;
    if (venueStatusFilter === 'approved' && (h.isPaused || h.isRevoked)) return false;

    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      h._id.toLowerCase().includes(query) ||
      h.outletName.toLowerCase().includes(query) ||
      h.contactPerson.toLowerCase().includes(query) ||
      (h.userId?.name || '').toLowerCase().includes(query) ||
      h.phone.includes(query) ||
      (h.email || '').toLowerCase().includes(query) ||
      h.city.toLowerCase().includes(query) ||
      h.state.toLowerCase().includes(query)
    );
  });

  const filteredDeviceReqs = deviceRequests.filter(r => {
    const isFilterMatch = deviceReqFilter === 'all' || r.status === deviceReqFilter;
    if (!isFilterMatch) return false;
    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      r._id.toLowerCase().includes(query) ||
      (r.userId?.name || '').toLowerCase().includes(query) ||
      (r.userId?.phone || '').includes(query) ||
      (r.hostApplicationId?.outletName || '').toLowerCase().includes(query)
    );
  });

  const navItems = [
    { id: 'stats', label: 'Dashboard', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'requests', label: 'Requests', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'venues', label: 'Venues', icon: <Building className="w-4 h-4" /> },
    { id: 'advertisers', label: 'Advertisers', icon: <Tv className="w-4 h-4" /> },
    { id: 'devices', label: 'Devices', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'rates', label: 'Ad Rates', icon: <Percent className="w-4 h-4" /> }
  ];

  const getTabBadgeCount = (tabId) => {
    if (tabId === 'requests') {
      const pendingHostsCount = hosts.filter(h => h.status === 'pending').length;
      const pendingCampaignsCount = campaigns.filter(c => c.paymentStatus === 'completed' && c.approvalStatus === 'pending' && c.mediaUrl && c.mediaUrl.trim() !== '' && (c.transcodeStatus === 'completed' || !c.transcodeStatus)).length;
      const pendingDevicesCount = deviceRequests.filter(r => r.status === 'pending').length;
      return pendingHostsCount + pendingCampaignsCount + pendingDevicesCount;
    }
    return 0;
  };

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-card/40 backdrop-blur-xl border border-border/80 rounded-[32px] p-8 shadow-2xl relative z-10"
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-900 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="font-outfit text-2xl font-black tracking-tight text-foreground">DigiAds Admin</h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Enterprise Management Portal</p>
          </div>

          {loginError && (
            <div className="mb-6 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                Username or Phone
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                <input
                  type="text"
                  required
                  placeholder="admin@digiads.com or +91..."
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl pl-10 pr-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-background/50 border border-border rounded-xl pl-10 pr-10 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black py-3.5 rounded-xl transition-colors duration-200 shadow-lg shadow-primary/20 cursor-pointer text-xs mt-2 disabled:opacity-50 min-h-[44px]"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/50 text-center flex justify-between items-center text-[10px] text-muted-foreground font-medium">
            <span>Powered by DigiAds Engine</span>
            <button onClick={toggleTheme} className="hover:text-foreground flex items-center gap-1 cursor-pointer">
              {theme === 'dark' ? <Sun className="w-3 h-3 text-amber-500" /> : <Moon className="w-3 h-3 text-blue-500" />}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden font-sans relative">
      {/* Top-Right Corner Floating Toast Container */}
      <div className="fixed top-5 right-5 z-[9999] pointer-events-none flex flex-col space-y-2.5 max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start justify-between space-x-3 transition-all duration-300 ${
                toast.type === 'error' || toast.type === 'destructive'
                  ? 'bg-destructive/90 border-destructive text-white shadow-[0_0_25px_rgba(239,68,68,0.35)]'
                  : toast.type === 'warning'
                  ? 'bg-amber-500/90 border-amber-500 text-white shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                  : toast.type === 'info'
                  ? 'bg-blue-600/90 border-blue-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.35)]'
                  : 'bg-emerald-600/90 border-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.35)]'
              }`}
            >
              <div className="flex items-start space-x-3 min-w-0">
                <div className="shrink-0 mt-0.5">
                  {toast.type === 'error' || toast.type === 'destructive' ? (
                    <XCircle className="w-5 h-5 text-white" />
                  ) : toast.type === 'warning' ? (
                    <AlertTriangle className="w-5 h-5 text-white" />
                  ) : toast.type === 'info' ? (
                    <AlertCircle className="w-5 h-5 text-white" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h5 className="font-outfit text-xs font-black uppercase tracking-wider text-white">
                    {toast.type === 'error' || toast.type === 'destructive'
                      ? 'System Error'
                      : toast.type === 'warning'
                      ? 'Warning Notice'
                      : toast.type === 'info'
                      ? 'System Info'
                      : 'Success'}
                  </h5>
                  <p className="text-xs font-semibold leading-relaxed break-words text-white/95">
                    {toast.message}
                  </p>
                </div>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white/80 hover:text-white shrink-0 mt-0.5"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Side Navigation Bar */}
      <aside
        className={`bg-card border-r border-border py-4 px-0 flex flex-col justify-between hidden md:flex transition-all duration-300 h-screen sticky top-0 shrink-0 select-none ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
      >
        <div>
          <div className={`flex items-center mb-8 ${sidebarCollapsed ? 'justify-center' : 'px-4 space-x-2.5'}`}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="relative group w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 cursor-pointer overflow-hidden transition-all duration-300"
              aria-label="Toggle Sidebar"
            >
              <div className="transition-all duration-300 transform group-hover:scale-0 group-hover:opacity-0 flex items-center justify-center p-1">
                <img src="/brandicon.png" alt="DigiAds Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-50 group-hover:scale-100">
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-white" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-white" />
                )}
              </div>
            </button>

            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-outfit text-sm font-bold tracking-tight brandLogo"
              >
                Digi<span className="text-primary">Ads</span>
              </motion.span>
            )}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const badgeCount = getTabBadgeCount(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center py-3 text-xs font-bold transition-colors duration-200 cursor-pointer relative ${activeTab === item.id
                    ? 'bg-primary/10 text-primary border-l-4 border-primary'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border-l-4 border-transparent'
                    } ${sidebarCollapsed ? 'justify-center px-0' : 'px-4 space-x-3'}`}
                  title={item.label}
                  aria-label={item.label}
                >
                  <div className="shrink-0 relative">
                    {item.icon}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                        {item.label}
                      </motion.span>
                      {badgeCount > 0 && (
                        <span className="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm pointer-events-none select-none">
                          {badgeCount}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar Controls */}
        <div className="px-3 space-y-2 border-t border-border/50 pt-4">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center py-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer ${sidebarCollapsed ? 'justify-center' : 'px-3 space-x-3'}`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500 shrink-0" /> : <Moon className="w-4 h-4 text-blue-500 shrink-0" />}
            {!sidebarCollapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center py-2.5 rounded-xl text-xs font-semibold text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 cursor-pointer ${sidebarCollapsed ? 'justify-center' : 'px-3 space-x-3'}`}
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">

        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 md:hidden hover:bg-muted border border-border rounded-xl text-muted-foreground cursor-pointer"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-outfit text-base font-bold text-foreground">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center space-x-4">
            {/* Global Search Bar with Live Categorized Results Dropdown */}
            <div className="relative hidden sm:block w-72 lg:w-96" ref={searchRef}>
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search venues, campaigns, users, devices, phone, IDs..."
                value={searchQuery}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-8 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Floating Categorized Search Results Dropdown */}
              {showSearchDropdown && searchQuery.trim() !== '' && (
                <div className="absolute left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-[100] max-h-[75vh] overflow-y-auto animate-fade-in divide-y divide-border/40">
                  <div className="p-3 bg-muted/20 flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Search Results ({searchResults.total})</span>
                    <span>Click any item to inspect</span>
                  </div>

                  {searchResults.total === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground font-semibold">
                      No matching venues, campaigns, users, or devices found for "{searchQuery}".
                    </div>
                  ) : (
                    <>
                      {/* 1. Venues */}
                      {searchResults.venues.length > 0 && (
                        <div className="p-2 space-y-1">
                          <div className="text-[10px] font-black uppercase text-purple-500 px-2 py-1 flex items-center space-x-1.5">
                            <Building className="w-3 h-3" />
                            <span>Venues ({searchResults.venues.length})</span>
                          </div>
                          {searchResults.venues.slice(0, 5).map(v => (
                            <div
                              key={v._id}
                              onClick={() => handleSelectSearchResult('venue', v)}
                              className="p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer space-y-0.5"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-foreground">{v.outletName || 'Unnamed Venue'}</span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  v.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {v.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center space-x-2">
                                <span>Contact: {v.phone || v.applicantName || 'N/A'}</span>
                                <span>•</span>
                                <span>{v.city || v.state || 'India'}</span>
                                <span>•</span>
                                <span className="font-mono">{v._id.slice(-6)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2. Ad Campaigns */}
                      {searchResults.campaigns.length > 0 && (
                        <div className="p-2 space-y-1">
                          <div className="text-[10px] font-black uppercase text-blue-500 px-2 py-1 flex items-center space-x-1.5">
                            <Tv className="w-3 h-3" />
                            <span>Ad Campaigns ({searchResults.campaigns.length})</span>
                          </div>
                          {searchResults.campaigns.slice(0, 5).map(c => (
                            <div
                              key={c._id}
                              onClick={() => handleSelectSearchResult('campaign', c)}
                              className="p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer space-y-0.5"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-foreground">{c.campaignName || 'Campaign'}</span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  c.approvalStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {c.approvalStatus}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center space-x-2">
                                <span>Advertiser: {c.userId?.name || c.userId?.phone || 'N/A'}</span>
                                <span>•</span>
                                <span>Txn: {c.paymentDetails?.txnId ? c.paymentDetails.txnId.slice(-8) : 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 3. Platform Users */}
                      {searchResults.users.length > 0 && (
                        <div className="p-2 space-y-1">
                          <div className="text-[10px] font-black uppercase text-emerald-500 px-2 py-1 flex items-center space-x-1.5">
                            <UserCheck className="w-3 h-3" />
                            <span>Users ({searchResults.users.length})</span>
                          </div>
                          {searchResults.users.slice(0, 5).map(u => (
                            <div
                              key={u._id}
                              onClick={() => handleSelectSearchResult('user', u)}
                              className="p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer space-y-0.5"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-foreground">{u.name || 'Platform User'}</span>
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  {u.role || (Array.isArray(u.roles) ? u.roles.join(', ') : 'user')}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center space-x-2">
                                <span>Phone: {u.phone}</span>
                                <span>•</span>
                                <span>{u.email || 'No Email'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 4. Kiosk Devices */}
                      {searchResults.devices.length > 0 && (
                        <div className="p-2 space-y-1">
                          <div className="text-[10px] font-black uppercase text-indigo-500 px-2 py-1 flex items-center space-x-1.5">
                            <Smartphone className="w-3 h-3" />
                            <span>Kiosk Devices ({searchResults.devices.length})</span>
                          </div>
                          {searchResults.devices.slice(0, 5).map(d => (
                            <div
                              key={d._id}
                              onClick={() => handleSelectSearchResult('device', d)}
                              className="p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer space-y-0.5"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-mono font-bold text-xs text-foreground">{d.deviceId}</span>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  d.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {d.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center space-x-2">
                                <span>Type: {d.deviceType}</span>
                                <span>•</span>
                                <span>Outlet: {d.hostApplicationId?.outletName || 'Unassigned'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 5. Hardware Requests */}
                      {searchResults.requests.length > 0 && (
                        <div className="p-2 space-y-1">
                          <div className="text-[10px] font-black uppercase text-amber-500 px-2 py-1 flex items-center space-x-1.5">
                            <FileCheck className="w-3 h-3" />
                            <span>Device Requests ({searchResults.requests.length})</span>
                          </div>
                          {searchResults.requests.slice(0, 5).map(r => (
                            <div
                              key={r._id}
                              onClick={() => handleSelectSearchResult('request', r)}
                              className="p-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer space-y-0.5"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-foreground">{r.hostApplicationId?.outletName || 'Venue Request'}</span>
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                                  {r.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground flex items-center space-x-2">
                                <span>Requested: {r.deviceType}</span>
                                <span>•</span>
                                <span>{r.userId?.name || r.userId?.phone || 'N/A'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground relative transition-colors duration-200 cursor-pointer"
                title="Notifications feed"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-2xl shadow-2xl p-4 z-50 space-y-3"
                  >
                    <div className="flex justify-between items-center border-b border-border/50 pb-3">
                      <div className="flex items-center space-x-2">
                        <Bell className="w-4 h-4 text-primary" />
                        <h4 className="font-outfit text-xs font-bold text-foreground">Notifications Alert Feed</h4>
                      </div>
                      {unreadNotificationsCount > 0 && (
                        <button
                          onClick={markAllNotificationsAsRead}
                          className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1 text-xs">
                      {notificationsList.length === 0 ? (
                        <p className="text-center py-6 text-muted-foreground text-xs font-semibold">No active notifications</p>
                      ) : (
                        notificationsList.map((item) => {
                          const isUnread = !readNotifications.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleNotificationClick(item)}
                              className={`p-3 rounded-xl border transition-colors duration-200 cursor-pointer ${isUnread
                                ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                                : 'bg-background/40 border-border/40 hover:bg-muted/30'
                                }`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-foreground">{item.title}</span>
                                <span className="text-[9px] text-muted-foreground font-medium">{item.time.toLocaleDateString()}</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Body Scrollable Area */}
        <main className="flex-1 overflow-y-auto p-6">

          <AnimatePresence mode="wait">

            {/* 1. DASHBOARD OVERVIEW TAB */}
            {activeTab === 'stats' && (
              <motion.div
                key="stats-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 animate-fade-in"
              >
                {/* KPI Cards Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Revenue */}
                  <div
                    onClick={() => setShowRevenueModal(true)}
                    className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm hover:border-primary/40 transition-colors duration-200 group"
                  >
                    <div className="absolute right-4 top-4 p-2 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Revenue</p>
                    <h3 className="font-outfit text-2xl font-black mt-2">₹{stats?.revenue?.totalINR || 0}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold group-hover:text-emerald-500 transition-colors">Click to view paid advertisers</p>
                  </div>

                  {/* Total Ads Deployed */}
                  <div
                    onClick={() => setActiveTab('advertisers')}
                    className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm hover:border-primary/40 transition-colors duration-200 group"
                  >
                    <div className="absolute right-4 top-4 p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                      <Tv className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Campaigns</p>
                    <h3 className="font-outfit text-2xl font-black mt-2">
                      {campaigns.filter(c => c.approvalStatus === 'approved').length}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                      <span className="text-[#0069a8] font-bold">{campaigns.filter(c => c.paymentStatus === 'completed' && c.approvalStatus === 'pending' && c.mediaUrl && c.mediaUrl.trim() !== '' && (c.transcodeStatus === 'completed' || !c.transcodeStatus)).length} pending review</span> / {campaigns.length} total
                    </p>
                  </div>

                  {/* Pending Approvals */}
                  <div
                    onClick={() => {
                      setActiveTab('requests');
                      setRequestsSubTab('campaigns');
                    }}
                    className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm hover:border-primary/40 transition-colors duration-200 group"
                  >
                    <div className="absolute right-4 top-4 p-2 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors">
                      <FileCheck className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending Ads</p>
                    <h3 className="font-outfit text-2xl font-black mt-2">
                      {campaigns.filter(c => c.paymentStatus === 'completed' && c.approvalStatus === 'pending' && c.mediaUrl && c.mediaUrl.trim() !== '' && (c.transcodeStatus === 'completed' || !c.transcodeStatus)).length}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Moderation queue waiting</p>
                  </div>

                  {/* Active Venue Outlets */}
                  <div
                    onClick={() => setActiveTab('venues')}
                    className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm hover:border-primary/40 transition-colors duration-200 group"
                  >
                    <div className="absolute right-4 top-4 p-2 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                      <Building className="w-4 h-4 text-purple-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Outlets</p>
                    <h3 className="font-outfit text-2xl font-black mt-2">
                      {hosts.filter(h => h.status === 'approved').length}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                      <span className="text-purple-500 font-bold">{hosts.filter(h => h.status === 'pending').length} pending apps</span> / {hosts.length} total
                    </p>
                  </div>
                </div>

                {/* Telemetry Status Row */}
                <div className="grid lg:grid-cols-3 gap-5">
                  <div className="lg:col-span-3 glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <h4 className="font-outfit text-xs font-bold text-foreground">Kiosk Fleet Health & Metrics</h4>
                      </div>
                    </div>

                    {(() => {
                      const total = devices.length;
                      const online = devices.filter(d => d.status === 'online').length;
                      const offline = total - online;
                      const onlinePercentage = total > 0 ? Math.round((online / total) * 100) : 0;
                      const tabletsCount = devices.filter(d => d.deviceType === 'tablet').length;
                      const screensCount = devices.filter(d => d.deviceType === 'screen').length;

                      return (
                        <div className="grid md:grid-cols-3 gap-6 items-center">
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black">
                              <span className="text-primary font-bold">Operational Health Status</span>
                              <span>{onlinePercentage}% Online</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-3 border border-border/40 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-700 to-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${onlinePercentage}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-l border-border/40 pl-6 h-full py-1">
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground block">Active Terminals</span>
                              <span className="text-xl font-black text-foreground mt-1 block">
                                {online}{' '}
                                <span className="text-xs font-semibold text-muted-foreground">/ {total} deployed</span>
                              </span>
                              <span className="text-[10px] text-muted-foreground font-semibold mt-0.5 block">
                                {tabletsCount} Tablets • {screensCount} Display Screens
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-l border-border/40 pl-6 h-full py-1">
                            <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-center flex flex-col justify-center">
                              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">Online</span>
                              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{online}</p>
                            </div>
                            <div className="p-3 bg-muted/20 border border-border/30 rounded-xl text-center flex flex-col justify-center">
                              <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Offline</span>
                              <p className="text-lg font-black text-foreground/80 mt-0.5">{offline}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Bottom Widgets grid */}
                <div className="grid lg:grid-cols-3 gap-5">
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
                    <h4 className="font-outfit text-xs font-bold border-b border-border/40 pb-3 text-foreground">Venue Applications</h4>
                    {hosts.filter(h => h.status === 'pending').slice(0, 3).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center font-medium">No pending host requests.</p>
                    ) : (
                      <div className="space-y-3">
                        {hosts.filter(h => h.status === 'pending').slice(0, 3).map((app) => (
                          <div
                            key={app._id}
                            onClick={() => {
                              setSelectedHostApp(app);
                              setShowVenueModal(true);
                            }}
                            className="flex justify-between items-start border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/20 p-1.5 rounded-xl transition-colors duration-200"
                            title="Click to view host request popup"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground">{app.outletName}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 font-bold uppercase">
                                {app.requestTablet && `TAB (${app.tabletQuantity})`}
                                {app.requestTablet && app.requestScreen && ' / '}
                                {app.requestScreen && `SCR (${app.screenQuantity})`}
                              </p>
                            </div>
                            <span className="text-[9px] font-bold text-primary shrink-0 uppercase tracking-wide">Review &rarr;</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
                    <h4 className="font-outfit text-xs font-bold border-b border-border/40 pb-3 text-foreground">Recent Booked Ads</h4>
                    {campaigns.slice(0, 3).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center font-medium">No ad bookings found.</p>
                    ) : (
                      <div className="space-y-3">
                        {campaigns.slice(0, 3).map((booking) => (
                          <div
                            key={booking.bookingId}
                            onClick={() => {
                              setSelectedCampaign(booking);
                              setShowDetailsModal(true);
                            }}
                            className="flex justify-between items-center border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/20 p-1.5 rounded-xl transition-colors duration-200"
                            title="Click to view campaign details popup"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground">Campaign {booking.bookingId}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{booking.outletId?.outletName || 'Outlet'} - {booking.adDurationDays} days</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${booking.paymentStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                              {booking.paymentStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
                    <h4 className="font-outfit text-xs font-bold border-b border-border/40 pb-3 text-foreground">New User Registrations</h4>
                    {users.slice(0, 3).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center font-medium">No registered user accounts.</p>
                    ) : (
                      <div className="space-y-3">
                        {users.slice(0, 3).map((u) => (
                          <div
                            key={u._id}
                            onClick={() => {
                              setActiveTab('users');
                              setSelectedUser(u);
                            }}
                            className="flex justify-between items-center border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/20 p-1.5 rounded-xl transition-colors duration-200"
                            title="Click to manage user details"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground">{u.name || 'User'}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{u.phone}</p>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                              {u.roles?.join(', ') || u.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. REQUESTS PANEL (MODERATION INBOX FOR PENDING & REJECTED) */}
            {activeTab === 'requests' && (
              <motion.div
                key="requests-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="bg-card/40 border border-border p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-wrap shadow-sm">
                  <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
                    <button
                      onClick={() => setRequestsSubTab('campaigns')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${requestsSubTab === 'campaigns' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Ad Campaigns
                    </button>
                    <button
                      onClick={() => setRequestsSubTab('hosts')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${requestsSubTab === 'hosts' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Venue Applications
                    </button>
                    <button
                      onClick={() => setRequestsSubTab('devices')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${requestsSubTab === 'devices' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Device Requests
                    </button>
                  </div>

                  {requestsSubTab === 'hosts' && (
                    <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border/60">
                      {['pending', 'rejected', 'all'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setHostFilter(filter)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-colors duration-200 cursor-pointer ${hostFilter === filter ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}

                  {requestsSubTab === 'campaigns' && (
                    <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border/60">
                      {['pending', 'rejected', 'all'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setAdFilter(filter)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-colors duration-200 cursor-pointer ${adFilter === filter ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}

                  {requestsSubTab === 'devices' && (
                    <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border/60">
                      {['pending', 'rejected', 'all'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setDeviceReqFilter(filter)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-colors duration-200 cursor-pointer ${deviceReqFilter === filter ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subtab Content */}
                {requestsSubTab === 'campaigns' ? (
                  <div>
                    {filteredCampaigns.length === 0 ? (
                      <div className="text-center py-20 border border-border rounded-[32px] text-xs text-muted-foreground glassmorphism bg-card/20 animate-fade-in">
                        <UserCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-4" />
                        <p className="font-semibold">
                          {adFilter === 'rejected' ? 'No rejected ad campaigns found.' : adFilter === 'pending' ? 'All booked and paid ad campaigns are resolved.' : 'No matching ad campaigns found in moderation queue.'}
                        </p>
                      </div>
                    ) : (
                      <div className="mx-1 mt-2 overflow-x-auto animate-fade-in">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                              <th className="p-4 pl-6">Advertiser Name</th>
                              <th className="p-4">Ad ID</th>
                              <th className="p-4 text-center">Attachment</th>
                              <th className="p-4 text-center">Details</th>
                              <th className="p-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {filteredCampaigns.map((booking) => (
                              <tr key={booking.bookingId} className="hover:bg-card/20 transition-colors duration-200">
                                <td className="p-4 pl-6 font-bold text-foreground">
                                  <div>{booking.advertiserId?.name || booking.advertiserId?.phone || 'Advertiser'}</div>
                                  <div className="text-[10px] text-muted-foreground font-medium">{booking.city}, {booking.state}</div>
                                </td>
                                <td className="p-4 font-mono font-bold text-primary">
                                  <div>{booking.bookingId}</div>
                                  <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 mt-1 uppercase">
                                    {booking.adCategory || 'Other'}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => {
                                      setSelectedCampaign(booking);
                                      setActiveVideoUrl(booking.mediaUrl);
                                      setShowVideoModal(true);
                                      setWatchedVideos(prev => new Set(prev).add(booking.bookingId));
                                    }}
                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl transition-colors duration-200 cursor-pointer border border-blue-500/20 inline-flex items-center justify-center shadow-sm"
                                    title="Preview media attachment"
                                    aria-label="Preview attachment"
                                  >
                                    {(booking.mediaUrl || '').includes('.mp4') || (booking.mediaUrl || '').includes('.webm') ? (
                                      <Video className="w-4 h-4" />
                                    ) : (
                                      <Upload className="w-4 h-4" />
                                    )}
                                  </button>
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => {
                                      setSelectedCampaign(booking);
                                      setShowDetailsModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-muted hover:bg-muted-foreground/20 text-foreground border border-border font-bold rounded-lg transition-colors duration-200 cursor-pointer"
                                  >
                                    Details
                                  </button>
                                </td>
                                <td className="p-4">
                                  <div className="flex items-center justify-center space-x-2">
                                    {booking.approvalStatus === 'pending' ? (
                                      <>
                                        <button
                                          onClick={() => handleReviewCampaign(booking.bookingId, 'approve')}
                                          disabled={!watchedVideos.has(booking.bookingId)}
                                          title={!watchedVideos.has(booking.bookingId) ? 'You must view/watch the media creative before approving' : 'Approve this campaign'}
                                          className={`px-3 py-1.5 border font-bold rounded-lg transition-colors duration-200 flex items-center space-x-1 ${watchedVideos.has(booking.bookingId)
                                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20 hover:border-emerald-500 cursor-pointer'
                                            : 'bg-muted/50 text-muted-foreground border-border cursor-not-allowed opacity-50'
                                            }`}
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>{watchedVideos.has(booking.bookingId) ? 'Approve' : 'View First'}</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            setSelectedCampaign(booking);
                                            setDenyReasonText('');
                                            setShowDenyModal(true);
                                          }}
                                          className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-1"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>Deny</span>
                                        </button>
                                      </>
                                    ) : booking.approvalStatus === 'approved' ? (
                                      <button
                                        onClick={() => {
                                          setSelectedCampaign(booking);
                                          setRevokePassword('');
                                          setRevokeReason('');
                                          setShowRevokeModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-1 shadow-sm"
                                        title="Revoke active campaign"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Revoke</span>
                                      </button>
                                    ) : (
                                      <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${booking.approvalStatus === 'rejected'
                                        ? 'bg-destructive/10 text-destructive border border-destructive/10'
                                        : 'bg-orange-500/10 text-orange-500 border border-orange-500/10'
                                        }`}>
                                        {booking.approvalStatus}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : requestsSubTab === 'hosts' ? (
                  <div className="w-full mx-1 mt-2 overflow-x-auto animate-fade-in">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                          <th className="p-4 pl-6">Venue Outlet</th>
                          <th className="p-4">Location</th>
                          <th className="p-4">Contact Person</th>
                          <th className="p-4">Device Qty</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Form Details</th>
                          <th className="p-4 text-right pr-6">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredHosts.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="p-12 text-center text-muted-foreground font-medium italic">
                              No host applications found matching filter.
                            </td>
                          </tr>
                        ) : (
                          filteredHosts.map((app) => (
                            <tr
                              key={app._id}
                              onClick={() => {
                                setSelectedHostApp(app);
                                setShowVenueModal(true);
                              }}
                              className="hover:bg-card/20 cursor-pointer transition-colors duration-200"
                            >
                              <td className="p-4 pl-6 font-bold text-foreground">
                                <div className="flex items-center space-x-2">
                                  <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>{app.outletName}</span>
                                </div>
                              </td>
                              <td className="p-4 text-muted-foreground font-semibold">
                                {app.city}, {app.state}
                              </td>
                              <td className="p-4 font-semibold text-foreground">
                                <div>{app.contactPerson}</div>
                                <div className="text-[10px] text-muted-foreground">{app.phone}</div>
                              </td>
                              <td className="p-4">
                                <div className="text-[11px] space-y-0.5 font-bold">
                                  {app.requestTablet && (
                                    <div className="text-foreground">Tablet ({app.tabletQuantity})</div>
                                  )}
                                  {app.requestScreen && (
                                    <div className="text-foreground">Screen ({app.screenQuantity})</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${app.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : app.status === 'rejected'
                                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                    : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                  }`}>
                                  {app.status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHostApp(app);
                                    setShowVenueModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-1 mx-auto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Form</span>
                                </button>
                              </td>
                              <td className="p-4 text-right pr-6 text-muted-foreground font-medium">
                                {new Date(app.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="w-full mx-1 mt-2 overflow-x-auto animate-fade-in">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                          <th className="p-4 pl-6">Venue Outlet</th>
                          <th className="p-4">Merchant</th>
                          <th className="p-4">Requested Devices</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Details</th>
                          <th className="p-4 text-right pr-6">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {filteredDeviceReqs.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="p-12 text-center text-muted-foreground font-medium italic">
                              No device requests found.
                            </td>
                          </tr>
                        ) : (
                          filteredDeviceReqs.map((req) => (
                            <tr
                              key={req._id}
                              onClick={() => {
                                setSelectedDeviceReq(req);
                                setShowDeviceReqModal(true);
                              }}
                              className="hover:bg-card/20 cursor-pointer transition-colors duration-200"
                            >
                              <td className="p-4 pl-6 font-bold text-foreground">
                                <div className="flex items-center space-x-2">
                                  <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span>{req.hostApplicationId?.outletName || 'Outlet'}</span>
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-foreground">
                                <div>{req.userId?.name || 'N/A'}</div>
                                <div className="text-[10px] text-muted-foreground">{req.userId?.phone}</div>
                              </td>
                              <td className="p-4">
                                <div className="text-[11px] space-y-0.5 font-bold">
                                  {req.requestTablet && (
                                    <div className="text-foreground">Tablet (Qty: {req.tabletQuantity})</div>
                                  )}
                                  {req.requestScreen && (
                                    <div className="text-foreground">Screen (Qty: {req.screenQuantity})</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${req.status === 'approved'
                                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  : req.status === 'rejected'
                                    ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                    : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                  }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDeviceReq(req);
                                    setShowDeviceReqModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-lg transition-colors duration-200 cursor-pointer flex items-center space-x-1 mx-auto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Details</span>
                                </button>
                              </td>
                              <td className="p-4 text-right pr-6 text-muted-foreground font-medium">
                                {new Date(req.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. DEDICATED VENUES TAB (APPROVED HOST OUTLETS MANAGEMENT) */}
            {activeTab === 'venues' && (
              <motion.div
                key="venues-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 animate-fade-in"
              >
                {/* Header Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Approved Outlets</p>
                    <h3 className="font-outfit text-2xl font-black mt-2 text-foreground">{hosts.filter(h => h.status === 'approved').length}</h3>
                    <p className="text-[10px] text-emerald-500 font-semibold mt-1">Active streaming outlets</p>
                  </div>
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Open Ads Mode</p>
                    <h3 className="font-outfit text-2xl font-black mt-2 text-blue-500">{hosts.filter(h => h.status === 'approved' && h.allowOpenAds !== false).length}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Public ad Network venues</p>
                  </div>
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Closed Private Mode</p>
                    <h3 className="font-outfit text-2xl font-black mt-2 text-purple-500">{hosts.filter(h => h.status === 'approved' && h.allowOpenAds === false).length}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Private venue promos</p>
                  </div>
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Deployed Terminals</p>
                    <h3 className="font-outfit text-2xl font-black mt-2 text-foreground">{devices.length}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Tablets & Display Screens</p>
                  </div>
                </div>

                {/* Filter & Controls Bar */}
                <div className="bg-card/40 border border-border p-4 rounded-2xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
                  <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border/60">
                    {[
                      { id: 'all', label: 'All Active' },
                      { id: 'approved', label: 'Standard' },
                      { id: 'paused', label: 'Paused' },
                      { id: 'revoked', label: 'Revoked' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setVenueStatusFilter(f.id)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-colors duration-200 cursor-pointer ${venueStatusFilter === f.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-muted-foreground font-semibold">
                    Showing <span className="text-foreground font-bold">{approvedVenuesList.length}</span> venue outlets
                  </span>
                </div>

                {/* Full-width Outlets Data Table */}
                <div className="w-full mx-1 overflow-x-auto animate-fade-in">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                        <th className="p-4 pl-6">Venue Outlet</th>
                        <th className="p-4">Owner & Location</th>
                        <th className="p-4">Ad Mode</th>
                        <th className="p-4">Quotas (V/I/S)</th>
                        <th className="p-4 text-center">Full Form Details</th>
                        <th className="p-4 text-right pr-6">Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {approvedVenuesList.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-12 text-center text-muted-foreground font-medium italic">
                            No active venues found.
                          </td>
                        </tr>
                      ) : (
                        approvedVenuesList.map((app) => {
                          const isClosed = app.allowOpenAds === false || app.adMode === 'closed';
                          const vMax = app.customMaxVideoSlots ?? (isClosed ? 3 : 2);
                          const vDaily = app.customDailyVideoQuota ?? (isClosed ? 6 : 4);
                          const iMax = app.customMaxImageSlots ?? (isClosed ? 8 : 3);
                          const iDaily = app.customDailyImageQuota ?? (isClosed ? 15 : 10);
                          const sMax = app.customMaxScreenSlots ?? (isClosed ? 8 : 3);

                          return (
                            <tr
                              key={app._id}
                              onClick={() => {
                                setSelectedHostApp(app);
                                setShowVenueModal(true);
                              }}
                              className="hover:bg-card/20 cursor-pointer transition-colors duration-200"
                            >
                              <td className="p-4 pl-6 font-bold text-foreground">
                                <div className="flex items-center space-x-2">
                                  <Building className="w-4 h-4 text-primary shrink-0" />
                                  <span className="font-outfit text-sm">{app.outletName}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground font-medium pl-6">
                                  {app.requestTablet && `Tablet (${app.tabletQuantity}) `}
                                  {app.requestScreen && `Screen (${app.screenQuantity})`}
                                </div>
                              </td>
                              <td className="p-4 font-semibold text-foreground">
                                <div>{app.contactPerson}</div>
                                <div className="text-[10px] text-muted-foreground">{app.city}, {app.state} • {app.phone}</div>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${!isClosed
                                  ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                  }`}>
                                  {!isClosed ? <Unlock className="w-3 h-3 text-blue-500 shrink-0" /> : <Lock className="w-3 h-3 text-purple-500 shrink-0" />}
                                  <span>{!isClosed ? 'OPEN ADS' : 'PRIVATE'}</span>
                                </span>
                              </td>
                              <td className="p-4 font-mono text-[11px] font-bold">
                                <div className="text-foreground">Vid: {vMax}/{vDaily}d</div>
                                <div className="text-muted-foreground text-[10px]">Img: {iMax}/{iDaily}d • Scr: {sMax}</div>
                              </td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedHostApp(app);
                                    setShowVenueModal(true);
                                  }}
                                  className="px-3 py-1.5 text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors duration-200 flex items-center space-x-1 mx-auto cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Form Popup</span>
                                </button>
                              </td>
                              <td className="p-4 text-right pr-6">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openQuotaModal(app);
                                    }}
                                    className="px-2.5 py-1.5 text-[10px] font-bold bg-muted hover:bg-muted-foreground/20 text-foreground border border-border rounded-lg transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
                                    title="Edit Custom Quotas"
                                    aria-label="Edit Quotas"
                                  >
                                    <Settings className="w-3.5 h-3.5" />
                                    <span>Quotas</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 4. DEDICATED ADVERTISERS TAB (APPROVED ADVERTISERS ACCOUNTS MANAGEMENT) */}
            {activeTab === 'advertisers' && (
              <motion.div
                key="advertisers-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6 animate-fade-in"
              >
                {/* Header Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Approved Advertisers</p>
                    <h3 className="font-outfit text-2xl font-black mt-2 text-foreground">{approvedAdvertisersList.length}</h3>
                    <p className="text-[10px] text-emerald-500 font-semibold mt-1">Registered advertiser accounts</p>
                  </div>
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Campaigns Booked</p>
                    <h3 className="font-outfit text-2xl font-black mt-2 text-blue-500">{campaigns.length}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Active & historical bookings</p>
                  </div>
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Live Active Ads</p>
                    <h3 className="font-outfit text-2xl font-black mt-2 text-purple-500">
                      {campaigns.filter(c => c.approvalStatus === 'approved').length}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Currently streaming on kiosks</p>
                  </div>
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 border border-border/50 shadow-sm">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Ad Spend</p>
                    <h3 className="font-outfit text-2xl font-black mt-2 text-emerald-500">₹{stats?.revenue?.totalINR || 0}</h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">Collected advertiser revenue</p>
                  </div>
                </div>

                {/* Info & Filter Header Bar */}
                <div className="bg-card/40 border border-border p-4 rounded-2xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Approved Advertiser Accounts Directory</span>
                  </div>

                  <span className="text-xs text-muted-foreground font-semibold">
                    Showing <span className="text-foreground font-bold">{approvedAdvertisersList.length}</span> advertiser accounts
                  </span>
                </div>

                {/* Approved Advertisers Accounts Table */}
                <div className="mx-1 overflow-x-auto animate-fade-in">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                        <th className="p-4 pl-6">Advertiser Account</th>
                        <th className="p-4">Contact Phone</th>
                        <th className="p-4">Email Address</th>
                        <th className="p-4 text-center">Campaigns Running</th>
                        <th className="p-4">Total Spend (₹)</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {approvedAdvertisersList.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-12 text-center text-muted-foreground font-medium italic">
                            No approved advertiser accounts found matching filter.
                          </td>
                        </tr>
                      ) : (
                        approvedAdvertisersList.map((adv) => {
                          const advCampaigns = getAdvertiserCampaigns(adv._id);
                          const totalSpend = getAdvertiserTotalSpend(adv._id);

                          return (
                            <tr
                              key={adv._id}
                              onClick={() => {
                                setSelectedAdvertiserUser(adv);
                                setShowAdvertiserAdsModal(true);
                              }}
                              className="hover:bg-card/20 cursor-pointer transition-colors duration-200"
                            >
                              <td className="p-4 pl-6 font-bold text-foreground">
                                <div className="flex items-center space-x-2">
                                  <UserCheck className="w-4 h-4 text-primary shrink-0" />
                                  <div>
                                    <div className="font-outfit text-sm">{adv.name || 'Advertiser'}</div>
                                    <div className="text-[10px] font-mono text-muted-foreground">{adv._id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 font-mono font-bold text-foreground">{adv.phone}</td>
                              <td className="p-4 font-semibold text-muted-foreground">{adv.email || 'N/A'}</td>
                              <td className="p-4 text-center">
                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${advCampaigns.length > 0 ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                                  {advCampaigns.length} Campaign{advCampaigns.length !== 1 ? 's' : ''}
                                </span>
                              </td>
                              <td className="p-4 font-black text-emerald-500 text-sm">₹{totalSpend}</td>
                              <td className="p-4 text-right pr-6">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAdvertiserUser(adv);
                                    setShowAdvertiserAdsModal(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-lg transition-colors duration-200 cursor-pointer text-xs flex items-center space-x-1.5 ml-auto"
                                >
                                  <Tv className="w-3.5 h-3.5" />
                                  <span>View Running Ads ({advCampaigns.length})</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 5. DEVICES FLEET TAB */}
            {activeTab === 'devices' && (
              <motion.div
                key="devices-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center border-b border-border/50 pb-6 flex-wrap gap-4">
                  <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
                    <button
                      onClick={() => setDeviceSubTab('tablet')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${deviceSubTab === 'tablet' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Tablets ({devices.filter(d => d.deviceType === 'tablet').length})
                    </button>
                    <button
                      onClick={() => setDeviceSubTab('screen')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${deviceSubTab === 'screen' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Display Screens ({devices.filter(d => d.deviceType === 'screen').length})
                    </button>
                  </div>

                  <button
                    onClick={() => setShowDeployForm(!showDeployForm)}
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-colors duration-200 shadow-md flex items-center space-x-1.5 cursor-pointer min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deploy New Terminal</span>
                  </button>
                </div>

                {showDeployForm && (
                  <form onSubmit={handleDeployDevice} className="p-6 rounded-2xl bg-card/40 border border-border space-y-4 max-w-lg animate-fade-in shadow-xl">
                    <h3 className="font-outfit text-sm font-bold text-foreground">Deploy New Terminal Device</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                      <div>
                        <label className="block text-[10px] uppercase text-muted-foreground mb-1">Device Type</label>
                        <select
                          value={deviceForm.deviceType}
                          onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                        >
                          <option value="tablet">Tablet Kiosk (3:4)</option>
                          <option value="screen">Wall Screen (16:9)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-muted-foreground mb-1">Target Approved Venue</label>
                        <select
                          value={deviceForm.hostApplicationId}
                          onChange={(e) => setDeviceForm({ ...deviceForm, hostApplicationId: e.target.value })}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                        >
                          <option value="">Select Venue...</option>
                          {hosts.filter(h => h.status === 'approved').map(h => (
                            <option key={h._id} value={h._id}>{h.outletName} ({h.city})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowDeployForm(false)}
                        className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-md"
                      >
                        Deploy Terminal
                      </button>
                    </div>
                  </form>
                )}

                <div className="mx-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                        <th className="p-4 pl-6">Device Serial ID</th>
                        <th className="p-4">Deployed Venue</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Last Sync Heartbeat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredDevices.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-12 text-center text-muted-foreground font-medium italic">
                            No deployed hardware terminals found for {deviceSubTab}.
                          </td>
                        </tr>
                      ) : (
                        filteredDevices.map((d) => (
                          <tr key={d._id} className="hover:bg-card/20 transition-colors duration-200">
                            <td className="p-4 pl-6 font-mono font-bold text-primary">{d.deviceId}</td>
                            <td className="p-4 font-bold text-foreground">
                              {d.hostApplicationId?.outletName || 'Standalone'}
                              <div className="text-[10px] text-muted-foreground font-medium">{d.hostApplicationId?.city}, {d.hostApplicationId?.state}</div>
                            </td>
                            <td className="p-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${d.status === 'online' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                                {d.status}
                              </span>
                            </td>
                            <td className="p-4 text-muted-foreground font-medium">
                              {d.lastSync ? new Date(d.lastSync).toLocaleString() : 'Never'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 6. USERS & ROLES TAB */}
            {activeTab === 'users' && (
              <motion.div
                key="users-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="border-b border-border/50 pb-6 flex justify-between items-center">
                  <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
                    <button
                      onClick={() => {
                        setUserSubTab('merchant');
                        setSelectedUser(null);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${userSubTab === 'merchant' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Venue Hosts
                    </button>
                    <button
                      onClick={() => {
                        setUserSubTab('advertiser');
                        setSelectedUser(null);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${userSubTab === 'advertiser' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Advertisers
                    </button>
                  </div>
                </div>

                <div className="mx-1 overflow-x-auto animate-fade-in">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                        <th className="p-4 pl-6">Name / User ID</th>
                        <th className="p-4">Contact Phone</th>
                        <th className="p-4">{userSubTab === 'merchant' ? 'Applications' : 'Ad campaigns'}</th>
                        {userSubTab === 'merchant' && <th className="p-4">Deployed Devices</th>}
                        <th className="p-4">Created Date</th>
                        <th className="p-4 text-right pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-8 text-center text-muted-foreground font-medium">
                            No registered {userSubTab} accounts yet.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user._id} className={`hover:bg-card/20 transition-colors duration-200 ${selectedUser?._id === user._id ? 'bg-primary/5' : ''}`}>
                            <td className="p-4 pl-6 font-bold tracking-tight text-foreground">
                              <div>{user.name || 'N/A'}</div>
                              <div className="text-[10px] text-muted-foreground font-mono font-medium">{user._id}</div>
                            </td>
                            <td className="p-4 text-foreground font-bold">{user.phone}</td>
                            <td className="p-4 text-foreground font-extrabold">
                              {userSubTab === 'merchant' ? user.stats?.merchant?.applicationsCount || 0 : user.stats?.advertiser?.bookingsCount || 0}
                            </td>
                            {userSubTab === 'merchant' && (
                              <td className="p-4 text-foreground font-extrabold">{user.stats?.merchant?.devicesCount || 0}</td>
                            )}
                            <td className="p-4 text-muted-foreground font-medium">
                              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="p-4 text-right pr-6">
                              <div className="flex items-center justify-end space-x-2">
                                {userSubTab === 'merchant' && (() => {
                                  const merchantVenues = hosts.filter(h => (h.userId?._id || h.userId)?.toString() === user._id?.toString() && h.status === 'approved');
                                  if (merchantVenues.length === 0) return null;
                                  return (
                                    <button
                                      onClick={() => {
                                        if (merchantVenues.length === 1) {
                                          openQuotaModal(merchantVenues[0]);
                                        } else {
                                          setSelectedUser(user);
                                        }
                                      }}
                                      className="px-2.5 py-1 text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors duration-200 flex items-center space-x-1 cursor-pointer"
                                      title="Edit Custom Quotas for this Merchant Venue"
                                      aria-label="Edit quotas"
                                    >
                                      <Settings className="w-3 h-3" />
                                      <span>Edit Quotas</span>
                                    </button>
                                  );
                                })()}
                                <button
                                  onClick={() => setSelectedUser(user)}
                                  className="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                                  title="Inspect User Details"
                                  aria-label="Inspect user"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                    setUserForm({
                                      name: user.name || '',
                                      phone: user.phone || '',
                                      email: user.email || '',
                                      roles: user.roles || [user.role]
                                    });
                                  }}
                                  className="p-1.5 bg-muted hover:bg-amber-500 hover:text-white border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                                  title="Edit User Properties"
                                  aria-label="Edit user"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingUser(user);
                                    setAdminDeletePassword('');
                                  }}
                                  className="p-1.5 bg-muted hover:bg-destructive hover:text-white border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                                  title="Delete User"
                                  aria-label="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 7. AD RATES TAB */}
            {activeTab === 'rates' && (
              <motion.div
                key="rates-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                  <form onSubmit={handleSaveRate} className="lg:col-span-5 p-6 rounded-2xl bg-card/40 border border-border space-y-4 shadow-xl">
                    <h3 className="font-outfit text-sm font-bold text-foreground">
                      {editingRateId ? 'Edit Ad Spot Rate' : 'Create New Ad Spot Rate'}
                    </h3>

                    <div className="space-y-3 text-xs font-semibold">
                      <div>
                        <label className="block text-[10px] uppercase text-muted-foreground mb-1">Target Hardware Device</label>
                        <select
                          value={rateForm.deviceType}
                          onChange={(e) => setRateForm({ ...rateForm, deviceType: e.target.value })}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                        >
                          <option value="tablet">Tablet Display (3:4)</option>
                          <option value="screen">Wall Screen (16:9)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-muted-foreground mb-1">Ad Media Type</label>
                        <select
                          value={rateForm.mediaType}
                          onChange={(e) => setRateForm({ ...rateForm, mediaType: e.target.value })}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                        >
                          <option value="video">Dynamic Video Ad</option>
                          <option value="image">Static Image Ad</option>
                        </select>
                      </div>

                      {rateForm.mediaType === 'video' && (
                        <div>
                          <label className="block text-[10px] uppercase text-muted-foreground mb-1">Video Duration Plan Tier</label>
                          <select
                            value={rateForm.maxVideoLengthSeconds || 30}
                            onChange={(e) => setRateForm({ ...rateForm, maxVideoLengthSeconds: parseInt(e.target.value, 10) })}
                            className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                          >
                            <option value={30}>30s Standard Plan (Up to 30s)</option>
                            <option value={60}>60s Extended Plan (31s to 60s)</option>
                          </select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase text-muted-foreground mb-1">Duration (Days)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={rateForm.durationDays}
                            onChange={(e) => setRateForm({ ...rateForm, durationDays: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase text-muted-foreground mb-1">Price Amount (₹)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            step="0.01"
                            placeholder="e.g. 499"
                            value={rateForm.amount}
                            onChange={(e) => setRateForm({ ...rateForm, amount: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-bold text-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-muted-foreground mb-1">Rotation Frequency</label>
                        <select
                          value={frequencyOption}
                          onChange={(e) => {
                            setFrequencyOption(e.target.value);
                            if (e.target.value !== 'custom') {
                              setRateForm({ ...rateForm, frequency: e.target.value });
                            }
                          }}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                        >
                          <option value="hourly">Hourly (Every 60 mins)</option>
                          <option value="daily">Daily</option>
                          <option value="custom">Custom Minute Interval...</option>
                        </select>

                        {frequencyOption === 'custom' && (
                          <div className="mt-2">
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Interval in minutes (e.g. 45)"
                              value={customMinutes}
                              onChange={(e) => setCustomMinutes(e.target.value)}
                              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2">
                      {editingRateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRateId(null);
                            setRateForm({ rateId: '', deviceType: 'tablet', mediaType: 'video', durationDays: '7', frequency: 'hourly', amount: '' });
                          }}
                          className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-md min-h-[44px]"
                      >
                        {editingRateId ? 'Update Rate' : 'Create Rate Card'}
                      </button>
                    </div>
                  </form>

                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border w-fit">
                      <button
                        onClick={() => setRateSubTab('tablet')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${rateSubTab === 'tablet' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Tablet Rates
                      </button>
                      <button
                        onClick={() => setRateSubTab('screen')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200 ${rateSubTab === 'screen' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Screen Rates
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                            <th className="p-4 pl-6">Media Type</th>
                            <th className="p-4">Duration</th>
                            <th className="p-4">Frequency</th>
                            <th className="p-4">Price Rate</th>
                            <th className="p-4 text-right pr-6">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {rates.filter(r => r.deviceType === rateSubTab).length === 0 ? (
                            <tr>
                              <td colSpan="5" className="p-8 text-center text-muted-foreground font-medium italic">
                                No rates configured for {rateSubTab} displays.
                              </td>
                            </tr>
                          ) : (
                            rates.filter(r => r.deviceType === rateSubTab).map((rate) => (
                              <tr key={rate._id} className="hover:bg-card/20 transition-colors duration-200">
                                <td className="p-4 pl-6 font-bold text-foreground">
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${rate.mediaType === 'image' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                    {rate.mediaType === 'image' ? <Upload className="w-3 h-3 text-purple-500 shrink-0" /> : <Video className="w-3 h-3 text-blue-500 shrink-0" />}
                                    <span>{rate.mediaType === 'image' ? 'Static Image' : `Dynamic Video (${rate.maxVideoLengthSeconds || 30}s Plan)`}</span>
                                  </span>
                                </td>
                                <td className="p-4 font-semibold text-foreground">{rate.durationDays} Days</td>
                                <td className="p-4 font-semibold text-muted-foreground">{rate.frequency}</td>
                                <td className="p-4 font-black text-emerald-500 text-sm">₹{rate.amount / 100}</td>
                                <td className="p-4 text-right pr-6">
                                  <div className="flex items-center justify-end space-x-2">
                                    <button
                                      onClick={() => handleEditRate(rate)}
                                      className="p-1.5 bg-muted hover:bg-amber-500 hover:text-white border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                                      title="Edit rate"
                                      aria-label="Edit rate"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRate(rate._id)}
                                      className="p-1.5 bg-muted hover:bg-destructive hover:text-white border border-border rounded-lg text-muted-foreground transition-colors duration-200 cursor-pointer"
                                      title="Delete rate"
                                      aria-label="Delete rate"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[90] flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="relative w-4/5 max-w-xs bg-card border-r border-border h-full p-6 flex flex-col justify-between z-10"
            >
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-4 top-4 p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <div className="flex items-center space-x-3 mb-10">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-outfit text-base font-bold tracking-tight">DigiAds Admin</span>
                </div>

                <nav className="space-y-2">
                  {navItems.map((item) => {
                    const badgeCount = getTabBadgeCount(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors duration-200 cursor-pointer ${activeTab === item.id
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {badgeCount > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black leading-none ${activeTab === item.id ? 'bg-primary-foreground text-primary' : 'bg-destructive text-destructive-foreground'}`}>
                            {badgeCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-4">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-destructive/20 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ROOT DIALOG MODAL OVERLAYS */}

      {/* Advertiser Running Ads Page Modal Popup */}
      {showAdvertiserAdsModal && selectedAdvertiserUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-4xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                    Advertiser Portfolio & Campaigns
                  </span>
                </div>
                <h3 className="font-outfit text-xl font-bold text-foreground mt-2 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  <span>{selectedAdvertiserUser.name || 'Advertiser Account'}</span>
                </h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                  Phone: <span className="font-mono text-foreground font-bold">{selectedAdvertiserUser.phone}</span> • Email: {selectedAdvertiserUser.email || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAdvertiserAdsModal(false);
                  setSelectedAdvertiserUser(null);
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close advertiser ads modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Top Advertiser Summary Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-background/50 rounded-2xl border border-border/40 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Campaigns</span>
                <p className="text-2xl font-black text-foreground mt-1">
                  {getAdvertiserCampaigns(selectedAdvertiserUser._id).length}
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Ad Spend</span>
                <p className="text-2xl font-black text-emerald-500 mt-1">
                  ₹{getAdvertiserTotalSpend(selectedAdvertiserUser._id)}
                </p>
              </div>
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Live Running Ads</span>
                <p className="text-2xl font-black text-purple-500 mt-1">
                  {getAdvertiserCampaigns(selectedAdvertiserUser._id).filter(c => c.approvalStatus === 'approved').length}
                </p>
              </div>
            </div>

            {/* Campaign Table for Selected Advertiser */}
            <div>
              <h4 className="font-outfit text-xs font-bold text-foreground mb-3 uppercase tracking-wider">
                All Booked Ad Campaigns by {selectedAdvertiserUser.name || 'this Advertiser'}
              </h4>

              {getAdvertiserCampaigns(selectedAdvertiserUser._id).length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-xs font-medium border border-border/50 rounded-2xl bg-background/30">
                  This advertiser account has not submitted any ad campaign bookings yet.
                </div>
              ) : (
                <div className="overflow-x-auto border border-border/50 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/20">
                        <th className="p-3.5 pl-4">Booking ID</th>
                        <th className="p-3.5">Target Outlet</th>
                        <th className="p-3.5">Display & Format</th>
                        <th className="p-3.5">Duration & Payout</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-center">Creative</th>
                        <th className="p-3.5 text-right pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {getAdvertiserCampaigns(selectedAdvertiserUser._id).map((booking) => {
                        const isImage = booking.mediaType === 'image' || booking.adType === 'image' || (booking.mediaUrl || '').includes('/images/');

                        return (
                          <tr key={booking.bookingId} className="hover:bg-card/20 transition-colors duration-200">
                            <td className="p-3.5 pl-4 font-mono font-bold text-primary">
                              <div>{booking.bookingId}</div>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">{booking.adCategory || 'Other'}</span>
                            </td>
                            <td className="p-3.5 font-bold text-foreground">
                              <div>{booking.outletId?.outletName || 'Standalone Venue'}</div>
                              <div className="text-[10px] text-muted-foreground font-normal">{booking.city}, {booking.state}</div>
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${isImage ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {isImage ? <Upload className="w-3 h-3 shrink-0" /> : <Video className="w-3 h-3 shrink-0" />}
                                <span>{isImage ? 'IMAGE' : 'VIDEO'} ({booking.deviceType})</span>
                              </span>
                            </td>
                            <td className="p-3.5 font-semibold">
                              <div className="text-foreground">{booking.adDurationDays} Days</div>
                              <div className="text-emerald-500 font-bold">₹{booking.amount / 100}</div>
                            </td>
                            <td className="p-3.5">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${booking.approvalStatus === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : booking.approvalStatus === 'rejected'
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                }`}>
                                {booking.approvalStatus}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <button
                                onClick={() => {
                                  setSelectedCampaign(booking);
                                  setActiveVideoUrl(booking.mediaUrl);
                                  setShowVideoModal(true);
                                }}
                                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-lg transition-colors cursor-pointer border border-blue-500/20 inline-flex items-center justify-center"
                                title="View Creative Media"
                              >
                                {isImage ? <Upload className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                            <td className="p-3.5 text-right pr-4">
                              <div className="flex items-center justify-end space-x-1.5">
                                {booking.paymentStatus === 'completed' && booking.approvalStatus === 'approved' && (
                                  <button
                                    onClick={() => fetchCampaignAnalytics(booking.bookingId)}
                                    className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 text-[10px] font-bold"
                                    title="View Campaign Telemetry Analytics"
                                  >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    <span>Analytics</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedCampaign(booking);
                                    setShowDetailsModal(true);
                                  }}
                                  className="px-2 py-1 bg-muted hover:bg-muted-foreground/20 text-foreground border border-border font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                                >
                                  Details
                                </button>
                                {booking.approvalStatus === 'approved' && (
                                  <button
                                    onClick={() => {
                                      setSelectedCampaign(booking);
                                      setRevokePassword('');
                                      setRevokeReason('');
                                      setShowRevokeModal(true);
                                    }}
                                    className="p-1.5 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white border border-destructive/20 rounded-lg transition-colors cursor-pointer"
                                    title="Revoke Campaign"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 border-t border-border/50">
              <button
                onClick={() => {
                  setShowAdvertiserAdsModal(false);
                  setSelectedAdvertiserUser(null);
                }}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Venue Form Details Modal Popup */}
      {showVenueModal && selectedHostApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                    Venue Form Submission
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${selectedHostApp.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : selectedHostApp.status === 'rejected' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                    {selectedHostApp.status}
                  </span>
                </div>
                <h3 className="font-outfit text-xl font-bold text-foreground mt-2">{selectedHostApp.outletName}</h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Submitted on {new Date(selectedHostApp.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => {
                  setShowVenueModal(false);
                  setSelectedHostApp(null);
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close venue modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 text-xs font-semibold">
              <div className="space-y-1 bg-background/50 p-4 rounded-2xl border border-border/50">
                <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-primary" /> Outlet Overview & Description
                </span>
                <p className="text-foreground leading-relaxed font-semibold mt-1">{selectedHostApp.outletDescription || 'No description provided.'}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Full Address & Location
                  </span>
                  <p className="text-foreground font-semibold">
                    {selectedHostApp.doorNo}, {selectedHostApp.street}<br />
                    {selectedHostApp.city}, {selectedHostApp.state} - <span className="font-mono text-primary">{selectedHostApp.zipCode}</span>
                  </p>
                </div>

                <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-primary" /> Hardware Devices Requested
                  </span>
                  <div className="space-y-1 text-foreground font-bold">
                    {selectedHostApp.requestTablet && (
                      <div className="flex items-center justify-between">
                        <span>Tablet Display (3:4)</span>
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">Qty: {selectedHostApp.tabletQuantity}</span>
                      </div>
                    )}
                    {selectedHostApp.requestScreen && (
                      <div className="flex items-center justify-between">
                        <span>Wall Screen (16:9)</span>
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">Qty: {selectedHostApp.screenQuantity}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-primary" /> Owner / Contact Details
                </span>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Contact Person</span>
                    <p className="text-foreground font-bold text-sm">{selectedHostApp.contactPerson}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Phone Number</span>
                    <p className="text-foreground font-mono font-bold">{selectedHostApp.phone}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Email Address</span>
                    <p className="text-foreground font-medium">{selectedHostApp.email}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-primary" /> Network Ad Mode & Quotas
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${selectedHostApp.allowOpenAds !== false ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'}`}>
                    {selectedHostApp.allowOpenAds !== false ? <Unlock className="w-3 h-3 text-blue-500 shrink-0" /> : <Lock className="w-3 h-3 text-purple-500 shrink-0" />}
                    <span>{selectedHostApp.allowOpenAds !== false ? 'OPEN ADS MODE' : 'PRIVATE MODE'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono text-[11px] pt-1">
                  <div className="p-2.5 bg-card/60 rounded-xl border border-border/40 text-center">
                    <span className="text-[9px] font-sans text-muted-foreground block">Video Max / Daily</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {selectedHostApp.customMaxVideoSlots ?? (selectedHostApp.allowOpenAds === false ? 3 : 2)} / {selectedHostApp.customDailyVideoQuota ?? (selectedHostApp.allowOpenAds === false ? 6 : 4)}d
                    </p>
                  </div>
                  <div className="p-2.5 bg-card/60 rounded-xl border border-border/40 text-center">
                    <span className="text-[9px] font-sans text-muted-foreground block">Image Max / Daily</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {selectedHostApp.customMaxImageSlots ?? (selectedHostApp.allowOpenAds === false ? 8 : 3)} / {selectedHostApp.customDailyImageQuota ?? (selectedHostApp.allowOpenAds === false ? 15 : 10)}d
                    </p>
                  </div>
                  <div className="p-2.5 bg-card/60 rounded-xl border border-border/40 text-center">
                    <span className="text-[9px] font-sans text-muted-foreground block">Screen Max / Daily</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {selectedHostApp.customMaxScreenSlots ?? (selectedHostApp.allowOpenAds === false ? 8 : 3)} / {selectedHostApp.customDailyScreenQuota ?? (selectedHostApp.allowOpenAds === false ? 6 : 4)}d
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/50 flex-wrap gap-3">
              {selectedHostApp.status === 'pending' ? (
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleReviewHost(selectedHostApp._id, 'approve')}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors duration-200 cursor-pointer shadow-md flex items-center justify-center space-x-1 text-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Application</span>
                  </button>
                  <button
                    onClick={() => handleReviewHost(selectedHostApp._id, 'reject')}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-colors duration-200 cursor-pointer shadow-md flex items-center justify-center space-x-1 text-xs"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Application</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openQuotaModal(selectedHostApp)}
                    className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl transition-colors duration-200 flex items-center space-x-1.5 cursor-pointer text-xs"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Customize Quotas</span>
                  </button>
                  <button
                    onClick={() => openWatermarkModal(selectedHostApp)}
                    className="px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold rounded-xl transition-colors duration-200 flex items-center space-x-1.5 cursor-pointer text-xs"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Manage Watermark</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setShowVenueModal(false);
                  setSelectedHostApp(null);
                }}
                className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs ml-auto"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Admin Manage Watermark Modal */}
      {showWatermarkModal && selectedHostApp && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-[32px] shadow-2xl p-6 relative space-y-6">
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-full border border-purple-500/20">
                  Platform Admin Control
                </span>
                <h3 className="font-outfit text-lg font-bold text-foreground mt-1">Manage Watermark for {selectedHostApp.outletName}</h3>
                <p className="text-xs text-muted-foreground font-semibold mt-0.5">Control "Powered by DigiAds" footer text per venue (support white-label premium hosts)</p>
              </div>
              <button
                onClick={() => setShowWatermarkModal(false)}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-muted/20 border border-border/40 rounded-xl">
                <input
                  type="checkbox"
                  checked={watermarkForm.showPoweredBy}
                  onChange={(e) => setWatermarkForm({ ...watermarkForm, showPoweredBy: e.target.checked })}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-foreground block text-xs">Enable Receipt Watermark</span>
                  <span className="text-[10px] text-muted-foreground">Uncheck only for verified premium white-label venues</span>
                </div>
              </label>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground font-bold uppercase block">Watermark Text Line</label>
                <input
                  type="text"
                  value={watermarkForm.customWatermark}
                  onChange={(e) => setWatermarkForm({ ...watermarkForm, customWatermark: e.target.value })}
                  placeholder="POWERED BY - DIGIADS"
                  disabled={!watermarkForm.showPoweredBy}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none disabled:opacity-50"
                />
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setWatermarkForm({ showPoweredBy: true, customWatermark: 'POWERED BY - DIGIADS' })}
                  className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-lg text-[10px] uppercase border border-border/40 cursor-pointer"
                >
                  Preset: Default DigiAds
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkForm({ showPoweredBy: false, customWatermark: '' })}
                  className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold rounded-lg text-[10px] uppercase border border-purple-500/20 cursor-pointer"
                >
                  Preset: White-Label (Blank)
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border/50">
              <button
                onClick={() => setShowWatermarkModal(false)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs cursor-pointer border border-border"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWatermark}
                disabled={watermarkSaving}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md transition-all flex items-center space-x-1.5"
              >
                {watermarkSaving ? 'Saving...' : 'Save Watermark Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Request Details Modal Popup */}
      {showDeviceReqModal && selectedDeviceReq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-[32px] shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                  Device Hardware Request
                </span>
                <h3 className="font-outfit text-base font-bold text-foreground mt-2">{selectedDeviceReq.hostApplicationId?.outletName || 'Outlet Request'}</h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Submitted on {new Date(selectedDeviceReq.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => {
                  setShowDeviceReqModal(false);
                  setSelectedDeviceReq(null);
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close device request modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Merchant Contact</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Merchant Name</span>
                    <p className="text-foreground font-bold">{selectedDeviceReq.userId?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Phone</span>
                    <p className="text-foreground font-mono font-bold">{selectedDeviceReq.userId?.phone}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase">Requested Hardware Specifications</span>
                <div className="space-y-1 font-bold text-foreground">
                  {selectedDeviceReq.requestTablet && (
                    <div className="flex justify-between items-center">
                      <span>Tablet Kiosk Display</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">Qty: {selectedDeviceReq.tabletQuantity}</span>
                    </div>
                  )}
                  {selectedDeviceReq.requestScreen && (
                    <div className="flex justify-between items-center">
                      <span>Wall Display Screen</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px]">Qty: {selectedDeviceReq.screenQuantity}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-border/50 mt-4">
              {selectedDeviceReq.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleReviewDeviceRequest(selectedDeviceReq._id, 'approve')}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Request</span>
                  </button>
                  <button
                    onClick={() => handleReviewDeviceRequest(selectedDeviceReq._id, 'reject')}
                    className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject Request</span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setShowDeviceReqModal(false);
                  setSelectedDeviceReq(null);
                }}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video / Image Creative Preview Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-2xl max-h-[85vh] rounded-[24px] overflow-hidden shadow-2xl p-5 relative flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-outfit text-base font-bold text-foreground">Media Creative Preview</h3>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setActiveVideoUrl('');
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full flex-1 max-h-[60vh] md:max-h-[68vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-2">
              {activeVideoUrl ? (
                (() => {
                  const mediaUrls = activeVideoUrl.split(',').map(s => s.trim()).filter(Boolean);
                  const firstUrl = mediaUrls[0] || '';
                  const isVideo = firstUrl.endsWith('.mp4') || firstUrl.endsWith('.webm');

                  if (isVideo) {
                    return (
                      <video
                        key={firstUrl}
                        src={resolveMediaUrl(firstUrl)}
                        controls
                        className="w-full max-h-[60vh] md:max-h-[65vh] object-contain bg-black rounded-xl"
                        onPlay={() => {
                          if (selectedCampaign) {
                            setWatchedVideos(prev => new Set(prev).add(selectedCampaign.bookingId));
                          }
                        }}
                      />
                    );
                  }

                  return (
                    <div className="w-full flex justify-center items-center gap-4 py-4">
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
                                onLoad={() => {
                                  if (selectedCampaign) {
                                    setWatchedVideos(prev => new Set(prev).add(selectedCampaign.bookingId));
                                  }
                                }}
                                onError={(e) => {
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
                            <span className="text-[10px] font-bold text-slate-300 mt-2">
                              {mediaUrls.length > 1 ? (idx === 0 ? 'Front (Image 1)' : 'Back (Image 2)') : 'Image'}
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

      {/* Campaign Form Details Modal Popup */}
      {showDetailsModal && selectedCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-border/50 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                    Advertiser Campaign Submission
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${selectedCampaign.approvalStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : selectedCampaign.approvalStatus === 'rejected' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'}`}>
                    {selectedCampaign.approvalStatus}
                  </span>
                </div>
                <h3 className="font-outfit text-xl font-bold text-foreground mt-2 font-mono">Booking ID: {selectedCampaign.bookingId}</h3>
                <p className="text-xs text-muted-foreground font-medium mt-0.5">Booked on {new Date(selectedCampaign.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close details modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5 text-xs font-semibold">
              <div className="p-4 bg-background/50 rounded-2xl border border-border/50 space-y-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-primary" /> Advertiser Account Info
                </span>
                <div className="grid sm:grid-cols-3 gap-4 font-semibold mt-1">
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Advertiser Name</span>
                    <p className="text-foreground font-bold text-sm">{selectedCampaign.advertiserId?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Phone</span>
                    <p className="text-foreground font-mono font-bold">{selectedCampaign.advertiserId?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block">Email</span>
                    <p className="text-foreground font-medium">{selectedCampaign.advertiserId?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-primary" /> Target Venue Outlet
                  </span>
                  <p className="text-foreground font-bold text-sm">{selectedCampaign.outletId?.outletName || 'Standalone Venue'}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {selectedCampaign.city}, {selectedCampaign.state}
                  </p>
                </div>

                <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-primary" /> Display Hardware Target
                  </span>
                  <p className="text-foreground font-bold capitalize">{selectedCampaign.deviceType} Display ({selectedCampaign.deviceType === 'tablet' ? '3:4 Aspect Ratio' : '16:9 Aspect Ratio'})</p>
                  <p className="text-[11px] text-muted-foreground">Quantity: <span className="font-bold text-foreground">{selectedCampaign.quantity}</span></p>
                </div>
              </div>

              <div className="p-4 bg-background/40 rounded-2xl border border-border/40 space-y-3">
                <span className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Campaign Category & Schedule
                </span>
                <div className="grid sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 bg-card/60 rounded-xl border border-border/40">
                    <span className="text-[9px] text-muted-foreground block">Category</span>
                    <p className="font-bold text-primary uppercase text-[11px] mt-0.5">{selectedCampaign.adCategory || 'Other'}</p>
                  </div>
                  <div className="p-2.5 bg-card/60 rounded-xl border border-border/40">
                    <span className="text-[9px] text-muted-foreground block">Media Type</span>
                    <p className="font-bold text-foreground capitalize text-[11px] mt-0.5">{selectedCampaign.mediaType || selectedCampaign.adType || 'Video'}</p>
                  </div>
                  <div className="p-2.5 bg-card/60 rounded-xl border border-border/40">
                    <span className="text-[9px] text-muted-foreground block">Duration</span>
                    <p className="font-bold text-foreground text-[11px] mt-0.5">{selectedCampaign.adDurationDays} Days</p>
                  </div>
                  <div className="p-2.5 bg-card/60 rounded-xl border border-border/40">
                    <span className="text-[9px] text-muted-foreground block">Frequency</span>
                    <p className="font-bold text-foreground text-[11px] mt-0.5">{selectedCampaign.frequency}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-background/40 rounded-2xl border border-border/40 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase block">Total Payout Collected</span>
                  <p className="text-2xl font-black text-emerald-500 mt-0.5">₹{selectedCampaign.amount / 100}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-muted-foreground uppercase block">Payment Status</span>
                  <span className="inline-block text-xs font-black uppercase text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 mt-1">
                    {selectedCampaign.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/50 flex-wrap gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setActiveVideoUrl(selectedCampaign.mediaUrl);
                    setShowVideoModal(true);
                  }}
                  className="px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1.5"
                >
                  <Video className="w-4 h-4" />
                  <span>Preview Creative</span>
                </button>

                {selectedCampaign.paymentStatus === 'completed' && selectedCampaign.approvalStatus === 'approved' && (
                  <button
                    onClick={() => fetchCampaignAnalytics(selectedCampaign.bookingId)}
                    className="px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold rounded-xl transition-colors cursor-pointer text-xs flex items-center space-x-1.5"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Analytics</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }}
                className="px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
              >
                Close Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Denial Reason Prompt Dialog */}
      {showDenyModal && selectedCampaign && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
              <h3 className="font-outfit text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span>Deny Ad Campaign</span>
              </h3>
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setSelectedCampaign(null);
                  setDenyReasonText('');
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!denyReasonText.trim()) {
                showNotification('Please provide a reason for denial', 'error');
                return;
              }
              await handleReviewCampaign(selectedCampaign.bookingId, 'reject', denyReasonText);
              setShowDenyModal(false);
              setSelectedCampaign(null);
              setDenyReasonText('');
            }} className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold">
                Please specify the reason for denying campaign <span className="font-mono font-bold text-primary">{selectedCampaign.bookingId}</span>.
              </p>

              <textarea
                required
                rows="4"
                placeholder="e.g. Inappropriate content, poor resolution, wrong schedule specifications..."
                value={denyReasonText}
                onChange={(e) => setDenyReasonText(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDenyModal(false);
                    setSelectedCampaign(null);
                    setDenyReasonText('');
                  }}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs min-h-[44px]"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Campaign Modal */}
      {showRevokeModal && selectedCampaign && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
              <h3 className="font-outfit text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span>Revoke Ad Campaign</span>
              </h3>
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setSelectedCampaign(null);
                  setRevokePassword('');
                  setRevokeReason('');
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRevokeCampaign} className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold">
                Revoking campaign <span className="font-mono font-bold text-primary">{selectedCampaign.bookingId}</span> is a destructive action.
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Reason for Revocation
                </label>
                <textarea
                  required
                  rows="3"
                  placeholder="Provide reason for revoking this campaign..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Administrator Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter admin password to confirm"
                  value={revokePassword}
                  onChange={(e) => setRevokePassword(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRevokeModal(false);
                    setSelectedCampaign(null);
                    setRevokePassword('');
                    setRevokeReason('');
                  }}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-colors cursor-pointer border border-border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revokeLoading}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-colors cursor-pointer text-xs disabled:opacity-50 min-h-[44px]"
                >
                  {revokeLoading ? 'Revoking...' : 'Confirm Revocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revenue Details Modal */}
      {showRevenueModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-primary/20">
                  Revenue Summary
                </span>
                <h3 className="font-outfit text-lg font-bold text-foreground mt-2">Paid Advertisers & Completed Payments</h3>
              </div>
              <button
                onClick={() => setShowRevenueModal(false)}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {campaigns.filter(c => c.paymentStatus === 'completed').length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-xs font-semibold">No completed payments found.</p>
              ) : (
                campaigns.filter(c => c.paymentStatus === 'completed').map((c) => (
                  <div key={c._id} className="p-4 rounded-2xl bg-background/50 border border-border/60 text-xs font-semibold space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-foreground text-sm">{c.advertiserId?.name || 'Advertiser'}</span>
                        <span className="text-[10px] text-muted-foreground block font-mono">Campaign ID: {c.bookingId}</span>
                      </div>
                      <span className="text-emerald-500 font-black text-base">₹{c.amount / 100}</span>
                    </div>

                    <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 flex justify-between">
                      <span>Outlet: {c.outletId?.outletName || 'Venue'}</span>
                      <span>Payment Status: <span className="text-emerald-500 font-bold uppercase">{c.paymentStatus}</span></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Analytics Modal (1:1 Parity with Advertiser Portal) */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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
                  className={`p-2 border border-border/40 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${analyticsLoading || cooldownRemaining > 0
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
                    setActiveAnalyticsData(null);
                  }}
                  className="p-2 hover:bg-muted border border-border/40 rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer text-xs font-bold"
                  aria-label="Close analytics"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto pt-4 space-y-6 pr-1">
              {analyticsLoading && !activeAnalyticsData ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs font-bold text-muted-foreground">Fetching playback telemetry data...</p>
                </div>
              ) : activeAnalyticsData ? (
                <>
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Plays</span>
                        <Play className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="text-2xl font-black font-outfit text-foreground">{activeAnalyticsData.totalPlays || 0}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold mt-1">Full Campaign Impressions</span>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Devices Reached</span>
                        <Tablet className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <span className="text-2xl font-black font-outfit text-foreground">{activeAnalyticsData.uniqueDevicesCount || 0}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold mt-1">Unique Tablets / Screens</span>
                    </div>

                    <div className="p-4 rounded-xl bg-card border border-border/40 flex flex-col justify-between shadow-sm">
                      <div className="flex items-center justify-between text-muted-foreground mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Duration</span>
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <span className="text-2xl font-black font-outfit text-foreground">
                        {activeAnalyticsData.totalDurationMinutes || Math.round((activeAnalyticsData.totalDurationSeconds || 0) / 60)}
                        <span className="text-xs font-semibold text-muted-foreground ml-1">mins</span>
                      </span>
                      <span className="text-[9px] text-muted-foreground font-semibold mt-1">{activeAnalyticsData.totalDurationSeconds || 0} Seconds Broadcast</span>
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

                    {(!activeAnalyticsData.recentImpressions || activeAnalyticsData.recentImpressions.length === 0) ? (
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
                            {activeAnalyticsData.recentImpressions.map((imp) => (
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

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
              <h3 className="font-outfit text-base font-bold text-foreground">Edit User Properties</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUserSave} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground mb-1">Email Address</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer min-h-[44px]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative">
            <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
              <h3 className="font-outfit text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span>Delete User Account</span>
              </h3>
              <button
                onClick={() => {
                  setDeletingUser(null);
                  setAdminDeletePassword('');
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close delete modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUserDelete} className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold">
                Are you sure you want to permanently delete user account <span className="font-bold text-foreground">{deletingUser.name || deletingUser.phone}</span>?
              </p>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Administrator Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter admin password to confirm"
                  value={adminDeletePassword}
                  onChange={(e) => setAdminDeletePassword(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-foreground"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingUser(null);
                    setAdminDeletePassword('');
                  }}
                  className="px-4 py-2 bg-muted text-foreground font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-destructive text-white font-bold rounded-xl text-xs cursor-pointer min-h-[44px]"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Custom Quotas Modal */}
      {isQuotaModalOpen && selectedHostApp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                  Custom Quota Override
                </span>
                <h3 className="font-outfit text-base font-bold text-foreground mt-2">
                  Edit Quotas for {selectedHostApp.outletName}
                </h3>
              </div>
              <button
                onClick={() => setIsQuotaModalOpen(false)}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="p-3 bg-muted/30 border border-border/40 rounded-xl flex justify-between items-center">
                <span className="text-muted-foreground">Current Mode Plan:</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded ${selectedHostApp.allowOpenAds !== false ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                  {selectedHostApp.allowOpenAds !== false ? <Unlock className="w-3 h-3 text-blue-500 shrink-0" /> : <Lock className="w-3 h-3 text-purple-500 shrink-0" />}
                  <span>{selectedHostApp.allowOpenAds !== false ? 'Open Ads Mode' : 'Closed Private Mode'}</span>
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Video Promo Quotas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Max Concurrent Slots</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customMaxVideoSlots}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customMaxVideoSlots: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Daily Changes Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customDailyVideoQuota}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customDailyVideoQuota: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Image Promo Quotas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Max Concurrent Slots</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customMaxImageSlots}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customMaxImageSlots: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Daily Changes Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customDailyImageQuota}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customDailyImageQuota: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border/40">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Screen Promo Quotas</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Max Concurrent Slots</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customMaxScreenSlots}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customMaxScreenSlots: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground mb-1">Daily Changes Limit</label>
                    <input
                      type="number"
                      min="1"
                      value={quotaForm.customDailyScreenQuota}
                      onChange={(e) => setQuotaForm({ ...quotaForm, customDailyScreenQuota: e.target.value })}
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-foreground focus:outline-none font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border/40">
                <button
                  type="button"
                  onClick={handleResetQuotaDefaults}
                  className="px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs cursor-pointer"
                >
                  Reset Plan Defaults
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsQuotaModalOpen(false)}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuotas}
                    className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs cursor-pointer shadow-md min-h-[44px]"
                  >
                    Save Quota Overrides
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
