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
  // Replace '/uploads/ads/' with '/uploads/creative/' to bypass browser ad-blocker filters (uBlock/AdBlock)
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
  const [reports, setReports] = useState([]);
  const [deviceRequests, setDeviceRequests] = useState([]);
  const [selectedDeviceReq, setSelectedDeviceReq] = useState(null);
  const [deviceReqFilter, setDeviceReqFilter] = useState('all');

  // Detail Modal / Sidebar states
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedHostApp, setSelectedHostApp] = useState(null);

  // Campaign Tab Modal & Filter States
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReasonText, setDenyReasonText] = useState('');
  const [campaignSearchQuery, setCampaignSearchQuery] = useState('');
  const [watchedVideos, setWatchedVideos] = useState(new Set()); // Track which booking videos admin has watched

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
    durationDays: '7',
    frequency: 'hourly',
    amount: ''
  });
  const [editingRateId, setEditingRateId] = useState(null);
  const [frequencyOption, setFrequencyOption] = useState('hourly');
  const [customMinutes, setCustomMinutes] = useState('45');

  // Report Resolution Form
  const [reportActionForm, setReportActionForm] = useState({
    status: 'pending',
    actionTaken: ''
  });

  const [notification, setNotification] = useState({ type: '', message: '' });

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
    setQuotaForm({
      customMaxVideoSlots: hostApp.customMaxVideoSlots ?? '',
      customDailyVideoQuota: hostApp.customDailyVideoQuota ?? '',
      customMaxImageSlots: hostApp.customMaxImageSlots ?? '',
      customDailyImageQuota: hostApp.customDailyImageQuota ?? '',
      customMaxScreenSlots: hostApp.customMaxScreenSlots ?? '',
      customDailyScreenQuota: hostApp.customDailyScreenQuota ?? ''
    });
    setIsQuotaModalOpen(true);
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

  // Sub-tabs within sections
  const [deviceSubTab, setDeviceSubTab] = useState('tablet');
  const [selectedVenueFilter, setSelectedVenueFilter] = useState('all');
  const [userSubTab, setUserSubTab] = useState('merchant');
  const [venueSortOrder, setVenueSortOrder] = useState('name-asc');
  const [deviceSortOrder, setDeviceSortOrder] = useState('id-asc');
  const [selectedUserVenueId, setSelectedUserVenueId] = useState('all');
  const [rateSubTab, setRateSubTab] = useState('tablet');
  const [hostFilter, setHostFilter] = useState('all');
  const [adFilter, setAdFilter] = useState('all');

  // Combined Requests Tab subtab
  const [requestsSubTab, setRequestsSubTab] = useState('campaigns'); // 'campaigns' or 'hosts'

  // Revoke modal states
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokePassword, setRevokePassword] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Dashboard graph filtering range
  const [chartRange, setChartRange] = useState(7); // 1, 3, 7, 10, 15, 30

  // Paid Advertisers Revenue Modal
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState(null);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifications, setReadNotifications] = useState([]);
  const notificationsRef = useRef(null);

  // Hydration handling
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
    if (savedTab) {
      setActiveTab(savedTab);
    }

    const savedDeviceSubTab = localStorage.getItem('adminDeviceSubTab');
    if (savedDeviceSubTab) {
      setDeviceSubTab(savedDeviceSubTab);
    }

    const savedVenueFilter = localStorage.getItem('adminSelectedVenueFilter') || 'all';
    setSelectedVenueFilter(savedVenueFilter);

    const savedUserSubTab = localStorage.getItem('adminUserSubTab');
    if (savedUserSubTab) {
      setUserSubTab(savedUserSubTab);
    }

    const savedRateSubTab = localStorage.getItem('adminRateSubTab');
    if (savedRateSubTab) {
      setRateSubTab(savedRateSubTab);
    }

    const savedHostFilter = localStorage.getItem('adminHostFilter');
    if (savedHostFilter) {
      setHostFilter(savedHostFilter);
    }

    const savedAdFilter = localStorage.getItem('adminAdFilter');
    if (savedAdFilter) {
      setAdFilter(savedAdFilter);
    }

    const savedRequestsSubTab = localStorage.getItem('adminRequestsSubTab');
    if (savedRequestsSubTab) {
      setRequestsSubTab(savedRequestsSubTab);
    }

    const savedChartRange = localStorage.getItem('adminChartRange');
    if (savedChartRange) {
      setChartRange(parseInt(savedChartRange, 10));
    }

    try {
      const savedRead = JSON.parse(localStorage.getItem('adminReadNotifications') || '[]');
      setReadNotifications(savedRead);
    } catch (e) {
      console.error(e);
    }

    const storedToken = localStorage.getItem('adminToken');
    const role = localStorage.getItem('adminRole');
    if (storedToken && role === 'admin') {
      setToken(storedToken);
      setIsAuthenticated(true);
      loadDashboardData(storedToken);
    }
  }, []);

  // Persist Active Tab
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminActiveTab', activeTab);
    }
  }, [activeTab, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminDeviceSubTab', deviceSubTab);
    }
  }, [deviceSubTab, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminSelectedVenueFilter', selectedVenueFilter);
    }
  }, [selectedVenueFilter, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminUserSubTab', userSubTab);
    }
  }, [userSubTab, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminRateSubTab', rateSubTab);
    }
  }, [rateSubTab, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminHostFilter', hostFilter);
    }
  }, [hostFilter, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminAdFilter', adFilter);
    }
  }, [adFilter, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminRequestsSubTab', requestsSubTab);
    }
  }, [requestsSubTab, mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('adminChartRange', chartRange.toString());
    }
  }, [chartRange, mounted]);

  // Click outside notifications dropdown handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Real-time WebSocket updates for admin dashboard with exponential backoff reconnect
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
        try {
          ws.close();
        } catch (e) { }
      }

      console.log('[WebSocket] Connecting to admin feed...');
      ws = new WebSocket(`${config.wsUrl}/ws/admin?token=${token}`);

      ws.onopen = () => {
        console.log('[WebSocket] Connected to admin live feed successfully');
        reconnectDelay = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.error && (payload.error.includes('token') || payload.error.includes('Access denied') || payload.error.includes('Authentication'))) {
            console.warn('[WebSocket] Auth failed, stopping reconnect loop:', payload.error);
            stopReconnect = true;
            try { ws.close(); } catch (e) { }
            return;
          }

          console.log('[WebSocket] Received update alert:', payload);
          if (['new_host_app', 'host_app_reviewed', 'new_campaign', 'campaign_reviewed', 'report_updated', 'new_device_request', 'device_request_reviewed'].includes(payload.event)) {
            console.log('[WebSocket] Triggering dynamic dashboard refresh...');
            loadDashboardData(token);
          }
        } catch (e) {
          console.error('[WebSocket] Failed parsing message:', e.message);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Closed (code: ${event.code}).`);
        if (stopReconnect) return;

        console.log(`[WebSocket] Attempting reconnect in ${reconnectDelay}ms...`);
        reconnectTimeout = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
          connectWebSocket();
        }, reconnectDelay);
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Connection error:', err.message || err);
        try {
          ws.close();
        } catch (e) { }
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.onclose = null;
        try {
          ws.close();
        } catch (e) { }
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [mounted, isAuthenticated, token]);

  const getNotificationsList = () => {
    const list = [];

    // 1. Host Applications
    hosts.filter(h => h.status === 'pending').forEach(app => {
      list.push({
        id: `host_${app._id}`,
        title: 'New Venue Request',
        description: `Outlet: ${app.outletName} (${app.city})`,
        type: 'host',
        target: app,
        time: new Date(app.createdAt)
      });
    });

    // 2. Ad Campaigns
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

    // 3. Support Tickets (Reports)
    reports.filter(r => r.status !== 'resolved').forEach(report => {
      list.push({
        id: `report_${report.reportId}`,
        title: 'Support Ticket',
        description: `${report.title} (${report.reporterRole})`,
        type: 'report',
        target: report,
        time: new Date(report.createdAt)
      });
    });

    // 4. Expired Ad Subscriptions (campaigns whose duration has elapsed)
    const now = new Date();
    campaigns.filter(c => c.paymentStatus === 'completed' && c.approvalStatus === 'approved').forEach(booking => {
      const expiryDate = new Date(booking.createdAt);
      expiryDate.setDate(expiryDate.getDate() + (booking.adDurationDays || 0));
      if (expiryDate < now) {
        list.push({
          id: `expired_${booking.bookingId}`,
          title: '⏰ Expired Ad Subscription',
          description: `Campaign ${booking.bookingId} — ${booking.outletId?.outletName || 'Venue'} (expired ${expiryDate.toLocaleDateString()})`,
          type: 'expired',
          target: booking,
          time: expiryDate
        });
      }
    });

    // Sort by time descending
    return list.sort((a, b) => b.time - a.time);
  };

  const handleNotificationClick = (item) => {
    if (item.type === 'host') {
      setActiveTab('requests');
      setRequestsSubTab('hosts');
      setSelectedHostApp(item.target);
    } else if (item.type === 'campaign') {
      setActiveTab('requests');
      setRequestsSubTab('campaigns');
      setSelectedCampaign(item.target);
      setShowDetailsModal(true);
    } else if (item.type === 'expired') {
      // Navigate to campaign details for expired subscription review
      setActiveTab('requests');
      setRequestsSubTab('campaigns');
      setSelectedCampaign(item.target);
      setShowDetailsModal(true);
    } else if (item.type === 'report') {
      setActiveTab('reports');
      setSelectedReport(item.target);
      setReportActionForm({
        status: item.target.status,
        actionTaken: item.target.actionTaken || ''
      });
    }

    // Add to read list if not already there
    if (!readNotifications.includes(item.id)) {
      const updated = [...readNotifications, item.id];
      setReadNotifications(updated);
      localStorage.setItem('adminReadNotifications', JSON.stringify(updated));
    }

    setShowNotifications(false);
  };

  const markAllNotificationsAsRead = () => {
    const allIds = getNotificationsList().map(item => item.id);
    setReadNotifications(allIds);
    localStorage.setItem('adminReadNotifications', JSON.stringify(allIds));
  };

  const getTabBadgeCount = (tabId) => {
    if (tabId === 'requests') {
      const pendingHosts = hosts.filter(h => h.status === 'pending').length;
      const pendingCampaigns = campaigns.filter(c => c.paymentStatus === 'completed' && c.approvalStatus === 'pending').length;
      return pendingHosts + pendingCampaigns;
    }
    if (tabId === 'reports') {
      return reports.filter(r => r.status !== 'resolved').length;
    }
    return 0;
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('adminTheme', nextTheme);
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification({ type: '', message: '' }), 5000);
  };

  const handleIdentifierChange = (val) => {
    if (!val.includes('@') && /^\d+$/.test(val.replace(/[\s-+]/g, ''))) {
      const cleaned = val.replace(/\D/g, '');
      if (cleaned.length > 10) return;
      if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) return;
      setLoginIdentifier(cleaned);
    } else {
      setLoginIdentifier(val);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      let resolvedIdentifier = loginIdentifier.trim();
      if (!resolvedIdentifier.includes('@')) {
        if (resolvedIdentifier.length !== 10 && !resolvedIdentifier.startsWith('+91')) {
          throw new Error('Mobile number must be exactly 10 digits');
        }
        if (!resolvedIdentifier.startsWith('+91')) {
          resolvedIdentifier = `+91${resolvedIdentifier}`;
        }
      } else {
        resolvedIdentifier = resolvedIdentifier.toLowerCase();
      }

      const res = await axios.post(`${API_BASE}/auth/login`, {
        identifier: resolvedIdentifier,
        password: loginPassword
      });

      if (res.data.data.user.role !== 'admin') {
        throw new Error('Access Denied: Admin role required');
      }

      const authToken = res.data.data.token;
      localStorage.setItem('adminToken', authToken);
      localStorage.setItem('adminRole', 'admin');

      setToken(authToken);
      setIsAuthenticated(true);
      loadDashboardData(authToken);
      showNotification('success', 'Logged in as administrator');
    } catch (err) {
      console.error('Login error:', err.response?.data?.message || err.message);
      setLoginError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminActiveTab');
    localStorage.removeItem('adminDeviceSubTab');
    localStorage.removeItem('adminUserSubTab');
    localStorage.removeItem('adminRateSubTab');
    localStorage.removeItem('adminHostFilter');
    localStorage.removeItem('adminRequestsSubTab');
    localStorage.removeItem('adminChartRange');
    localStorage.removeItem('adminReadNotifications');
    setToken('');
    setIsAuthenticated(false);
    setReadNotifications([]);
    setShowNotifications(false);
    showNotification('success', 'Logged out successfully');
  };

  const getRevenueChartData = (days) => {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString();
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });

      const dailyTotal = campaigns
        .filter(c => c.paymentStatus === 'completed' && c.createdAt && new Date(c.createdAt).toLocaleDateString() === dateStr)
        .reduce((sum, c) => sum + (c.amount / 100), 0);

      result.push({
        label: dayLabel,
        rawDate: dateStr,
        amount: dailyTotal
      });
    }
    return result;
  };

  const loadDashboardData = (authToken) => {
    fetchStats(authToken);
    fetchHosts(authToken);
    fetchCampaigns(authToken);
    fetchRates(authToken);
    fetchDevices(authToken);
    fetchUsers(authToken);
    fetchReports(authToken);
    fetchDeviceRequests(authToken);
  };

  const fetchDeviceRequests = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/device-requests`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setDeviceRequests(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewDeviceRequest = async (requestId, action) => {
    try {
      await axios.post(
        `${API_BASE}/admin/device-requests/review`,
        { requestId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('success', `Device request ${action}ed successfully`);
      loadDashboardData(token);
      setSelectedDeviceReq(null);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Action failed');
    }
  };

  const fetchStats = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/stats`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHosts = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/hosts`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setHosts(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCampaigns = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/bookings`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setCampaigns(res.data.data);
      if (res.data.data.length > 0 && !selectedCampaign) {
        setSelectedCampaign(res.data.data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const fetchDevices = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/devices`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setDevices(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUsers(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/admin/reports`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setReports(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewHost = async (applicationId, action) => {
    try {
      await axios.post(
        `${API_BASE}/admin/hosts/review`,
        { applicationId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('success', `Host application ${action}ed successfully`);
      loadDashboardData(token);
      setSelectedHostApp(null);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Action failed');
    }
  };

  const handleReviewCampaign = async (bookingId, action, denialReason = null) => {
    try {
      const payload = { bookingId, action };
      if (action === 'reject' && denialReason) {
        payload.denialReason = denialReason;
      }
      await axios.post(
        `${API_BASE}/admin/bookings/review`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('success', `Campaign ${action === 'approve' ? 'approved' : 'denied'} successfully`);
      fetchCampaigns(token);
      fetchStats(token);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Action failed');
    }
  };

  const handleRevokeCampaign = async (e) => {
    e.preventDefault();
    if (!revokePassword) {
      showNotification('error', 'Administrator password is required');
      return;
    }
    if (!revokeReason.trim()) {
      showNotification('error', 'Reason for revocation is required');
      return;
    }

    setRevokeLoading(true);
    try {
      await axios.put(`${API_BASE}/admin/bookings/revoke/${selectedCampaign.bookingId}`, {
        adminPassword: revokePassword,
        reason: revokeReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('success', `Campaign ${selectedCampaign.bookingId} revoked successfully`);
      setShowRevokeModal(false);
      setRevokePassword('');
      setRevokeReason('');
      setSelectedCampaign(null);
      fetchCampaigns(token);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to revoke campaign');
    } finally {
      setRevokeLoading(false);
    }
  };

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

  const handleCreateRate = async (e) => {
    e.preventDefault();
    let finalFrequency = frequencyOption;
    if (frequencyOption === 'custom') {
      finalFrequency = `${customMinutes}_mins`;
    }
    try {
      await axios.post(
        `${API_BASE}/admin/rates`,
        {
          rateId: rateForm.rateId,
          deviceType: rateForm.deviceType,
          durationDays: parseInt(rateForm.durationDays, 10),
          frequency: finalFrequency,
          amount: parseInt(rateForm.amount, 10) * 100 // convert INR to paise
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('success', editingRateId ? 'Pricing plan updated' : 'Pricing plan created');
      fetchRates(token);
      setRateForm({
        rateId: '',
        deviceType: 'tablet',
        durationDays: '7',
        frequency: 'hourly',
        amount: ''
      });
      setFrequencyOption('hourly');
      setCustomMinutes('45');
      setEditingRateId(null);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to save pricing plan');
    }
  };

  const handleDeployDevice = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE}/admin/devices`,
        {
          deviceType: deviceForm.deviceType,
          hostApplicationId: deviceForm.hostApplicationId
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('success', 'Device successfully deployed and mapped');
      fetchDevices(token);
      fetchStats(token);
      setDeviceForm({ deviceType: 'tablet', hostApplicationId: '' });
      setShowDeployForm(false);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to deploy device');
    }
  };

  const handleUpdateReport = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(
        `${API_BASE}/admin/reports/${selectedReport.reportId}`,
        {
          status: reportActionForm.status,
          actionTaken: reportActionForm.actionTaken
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('success', 'Report resolution updated');
      fetchReports(token);
      setSelectedReport(null);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update report');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await axios.put(
        `${API_BASE}/admin/users/${editingUser._id}`,
        {
          name: userForm.name,
          phone: userForm.phone,
          email: userForm.email || undefined,
          roles: userForm.roles
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showNotification('success', 'User details updated successfully');
      fetchUsers(token);
      setEditingUser(null);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (e) => {
    e.preventDefault();
    if (!deletingUser) return;
    try {
      await axios.delete(
        `${API_BASE}/admin/users/${deletingUser._id}`,
        {
          data: { adminPassword: adminDeletePassword },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      showNotification('success', 'User deleted successfully');
      fetchUsers(token);
      setDeletingUser(null);
      setAdminDeletePassword('');
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete user');
    }
  };

  const startEditRate = (rate) => {
    setEditingRateId(rate.rateId);
    setRateForm({
      rateId: rate.rateId,
      deviceType: rate.deviceType,
      durationDays: rate.durationDays.toString(),
      frequency: rate.frequency,
      amount: (rate.amount / 100).toString()
    });
    const standardOptions = ['continuous', 'every_15_mins', 'every_30_mins', 'hourly', 'every_2_hours'];
    if (standardOptions.includes(rate.frequency)) {
      setFrequencyOption(rate.frequency);
    } else {
      setFrequencyOption('custom');
      const numMatch = (rate.frequency || '').match(/\d+/);
      if (numMatch) {
        setCustomMinutes(numMatch[0]);
      } else {
        setCustomMinutes('45');
      }
    }
  };

  const handleDeleteRate = async (rateId) => {
    if (!window.confirm(`Are you sure you want to delete rate "${rateId}"? This action cannot be undone.`)) return;
    try {
      await axios.delete(`${API_BASE}/admin/rates/${rateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('success', 'Pricing plan deleted');
      fetchRates(token);
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Failed to delete pricing plan');
    }
  };

  // Global ID Lookup Search
  const handleGlobalSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    // 1. Search in campaigns
    const foundCampaign = campaigns.find(c => c.bookingId.toLowerCase().includes(query));
    if (foundCampaign) {
      setActiveTab('requests');
      setRequestsSubTab('campaigns');
      setSelectedCampaign(foundCampaign);
      showNotification('success', `Ad booking found`);
      return;
    }

    // 2. Search in devices
    const foundDevice = devices.find(d => d.deviceId.toLowerCase().includes(query));
    if (foundDevice) {
      setActiveTab('devices');
      setDeviceSubTab(foundDevice.deviceType);
      showNotification('success', `Device found`);
      return;
    }

    // 3. Search in users
    const foundUser = users.find(u => u._id.toLowerCase().includes(query) || u.phone.includes(query));
    if (foundUser) {
      setActiveTab('users');
      setUserSubTab(foundUser.role);
      setSelectedUser(foundUser);
      showNotification('success', `User account found`);
      return;
    }

    // 4. Search in reports
    const foundReport = reports.find(r => r.reportId.toLowerCase().includes(query));
    if (foundReport) {
      setActiveTab('reports');
      setSelectedReport(foundReport);
      setReportActionForm({
        status: foundReport.status,
        actionTaken: foundReport.actionTaken || ''
      });
      showNotification('success', `Support ticket found`);
      return;
    }

    // 5. Search in host applications
    const foundHostApp = hosts.find(h => h._id.toLowerCase().includes(query) || h.outletName.toLowerCase().includes(query));
    if (foundHostApp) {
      setActiveTab('requests');
      setRequestsSubTab('hosts');
      setSelectedHostApp(foundHostApp);
      showNotification('success', `Venue request found`);
      return;
    }

    showNotification('error', `No matching ID or details found for: "${searchQuery}"`);
  };

  if (!mounted) return null;

  // RENDER LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans transition-colors duration-300">
        {/* Background radial effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Theme Toggle Button at Top-Right */}
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-card hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shadow-md"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
          </button>
        </div>

        {/* Main Grid Wrapper */}
        <div className="w-full max-w-5xl grid md:grid-cols-12 gap-8 items-center relative z-10 animate-fade-in">

          {/* Left Column - Transparent Info Panel */}
          <div className="md:col-span-5 space-y-6 text-foreground p-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                Admin Command Center
              </span>
              <h2 className="font-outfit text-3xl font-extrabold tracking-tight mt-4 text-foreground brandLogo">
                DigiAds Admin Console
              </h2>
              <p className="text-muted-foreground text-xs font-semibold mt-2 leading-relaxed">
                Authorize system nodes, verify host outlets, review advertiser campaigns, monitor device heartbeats, and manage platform tariffs.
              </p>
            </div>

            {/* Admin capabilities list */}
            <div className="space-y-3">
              <h4 className="font-outfit text-xs font-extrabold uppercase tracking-wider text-foreground">Console Controls</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground font-semibold">
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                  <span>Host Approvals: Provision and map device IDs to validated host venues.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                  <span>Ad Campaign Review: Verify advertiser payment transactions and campaign creative content.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 text-primary mr-2 shrink-0 mt-0.5" />
                  <span>Telemetry Monitor: View real-time device connectivity status and reports.</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 text-[10px] text-muted-foreground font-bold flex items-center justify-between border-t border-border mt-6">
              <span>System Administration Console</span>
            </div>
          </div>

          {/* Right Column - Centered Bordered Form Card */}
          <div className="md:col-span-7 flex justify-center">
            <div className="w-full max-w-md glassmorphism p-6 rounded-[32px] relative z-10 shadow-2xl bg-card/30 backdrop-blur-md border-border">

              {/* Logo and Brand */}
              <div className="flex items-center justify-center space-x-3 mb-6">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 overflow-hidden p-1">
                  <img src="/brandicon.png" alt="DigiAds Logo" className="w-full h-full object-contain rounded-lg" />
                </div>
                <div className="text-left">
                  <h2 className="font-outfit text-lg font-bold tracking-tight brandLogo">
                    Digi<span className="text-primary">Ads</span> Admin
                  </h2>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                    Log in with email or phone + password
                  </p>
                </div>
              </div>

              {/* Notification messages */}
              {loginError && (
                <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-destructive" />
                  <span>{loginError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email or Mobile Input */}
                <div>
                  <div className="relative">
                    {loginIdentifier.includes('@') ? (
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    )}
                    <input
                      type="text"
                      required
                      placeholder="Admin Email or Mobile Number"
                      value={loginIdentifier}
                      onChange={(e) => handleIdentifierChange(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl pl-11 pr-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Console Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl pl-11 pr-10 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-primary hover:bg-primary/95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-lg glow-hover cursor-pointer mt-2 flex items-center justify-center space-x-2"
                >
                  <span>{loginLoading ? 'Authenticating...' : 'Sign In as Admin'}</span>
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Filtered campaigns for Pending Ads tab search and global search
  const filteredCampaigns = campaigns.filter(c => {
    if (c.paymentStatus !== 'completed') return false;

    // Status filters
    if (adFilter === 'pending' && c.approvalStatus !== 'pending') return false;
    if (adFilter === 'approved' && c.approvalStatus !== 'approved') return false;
    if (adFilter === 'rejected' && (c.approvalStatus !== 'rejected' && c.approvalStatus !== 'revoked')) return false;

    const query = (searchQuery || campaignSearchQuery).trim().toLowerCase();
    if (!query) return true;
    return (
      c.bookingId.toLowerCase().includes(query) ||
      (c.outletId?.outletName || '').toLowerCase().includes(query) ||
      (c.advertiserId?.name || '').toLowerCase().includes(query) ||
      (c.advertiserId?.phone || '').includes(query) ||
      c.city.toLowerCase().includes(query) ||
      c.state.toLowerCase().includes(query)
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

  const filteredReportsList = reports.filter(r => {
    if (!searchQuery) return true;
    const query = searchQuery.trim().toLowerCase();
    return (
      r.reportId.toLowerCase().includes(query) ||
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      (r.reporterId?.name || '').toLowerCase().includes(query) ||
      (r.reporterId?.phone || '').includes(query) ||
      r.reporterRole.toLowerCase().includes(query)
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

  // NAVIGATION BAR ITEMS
  const navItems = [
    { id: 'stats', label: 'Dashboard', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'devices', label: 'Devices', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'requests', label: 'Requests', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'rates', label: 'Ad Rates', icon: <Percent className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <ClipboardList className="w-4 h-4" /> }
  ];

  return (
    <div className="h-screen bg-background text-foreground flex overflow-hidden font-sans">

      {/* Side Navigation Bar */}
      <aside
        className={`bg-card border-r border-border py-4 px-0 flex flex-col justify-between hidden md:flex transition-all duration-300 h-screen sticky top-0 shrink-0 select-none ${sidebarCollapsed ? 'w-16' : 'w-56'
          }`}
      >
        <div>
          {/* Logo & Sidebar toggle */}
          <div className={`flex items-center mb-8 ${sidebarCollapsed ? 'justify-center' : 'px-4 space-x-2.5'}`}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="relative group w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 to-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20 cursor-pointer overflow-hidden transition-all duration-300"
            >
              {/* Brand Icon */}
              <div className="transition-all duration-300 transform group-hover:scale-0 group-hover:opacity-0 flex items-center justify-center p-1">
                <img src="/brandicon.png" alt="DigiAds Logo" className="w-full h-full object-contain rounded-lg" />
              </div>
              {/* Chevron Icon */}
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
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center py-3 text-xs font-bold transition-all duration-200 cursor-pointer relative ${activeTab === item.id
                    ? 'bg-primary/10 text-primary border-l-4 border-primary'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground border-l-4 border-transparent'
                    } ${sidebarCollapsed ? 'justify-center px-0' : 'px-4 space-x-3'}`}
                  title={item.label}
                >
                  <div className="shrink-0 relative">
                    {item.icon}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
                        {item.label}
                      </motion.span>

                      {/* Alert Badge for pending items */}
                      {item.id === 'requests' && (() => {
                        const pendingHosts = hosts.filter(h => h.status === 'pending').length;
                        const pendingCampaigns = campaigns.filter(c => c.paymentStatus === 'completed' && c.approvalStatus === 'pending').length;
                        const pendingDevices = deviceRequests.filter(r => r.status === 'pending').length;
                        const count = pendingHosts + pendingCampaigns + pendingDevices;
                        if (count > 0) {
                          return (
                            <span className="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm pointer-events-none select-none">
                              {count}
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {item.id === 'reports' && (() => {
                        const count = reports.filter(r => r.status !== 'resolved').length;
                        if (count > 0) {
                          return (
                            <span className="bg-red-600 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm pointer-events-none select-none">
                              {count}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-2 px-3">
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer ${sidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-2.5 text-xs font-semibold'
              }`}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <Moon className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
            {!sidebarCollapsed && <span className="text-xs font-semibold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center py-2 rounded-xl border border-destructive/20 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer ${sidebarCollapsed ? 'justify-center px-0' : 'px-3 space-x-2.5 text-xs font-semibold'
              }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!sidebarCollapsed && <span className="text-xs font-semibold">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

        {/* Header Bar */}
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-md px-6 flex items-center justify-between shrink-0 relative z-20">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-muted border border-border rounded-lg text-muted-foreground md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Header tab indicator */}
            <h2 className="font-outfit text-lg font-bold tracking-tight capitalize hidden sm:block">
              {navItems.find(n => n.id === activeTab)?.label} console
            </h2>
          </div>

          <div className="flex items-center space-x-3.5 max-w-lg w-full justify-end">
            {/* Notifications Bell Dropdown */}
            <div className="relative shrink-0" ref={notificationsRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 bg-background hover:bg-muted border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center justify-center shadow-sm"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {(() => {
                  const notifications = getNotificationsList();
                  const unreadCount = notifications.filter(item => !readNotifications.includes(item.id)).length;
                  if (unreadCount > 0) {
                    return (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-[11px] font-black text-white flex items-center justify-center border-2 border-card shadow-md select-none pointer-events-none">
                        {unreadCount}
                      </span>
                    );
                  }
                  return null;
                })()}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2.5 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
                      <span className="text-xs font-bold text-foreground">Notifications</span>
                      {(() => {
                        const notifications = getNotificationsList();
                        const unreadCount = notifications.filter(item => !readNotifications.includes(item.id)).length;
                        if (unreadCount > 0) {
                          return (
                            <button
                              onClick={markAllNotificationsAsRead}
                              className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer uppercase tracking-wider"
                            >
                              Mark all read
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Content List */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                      {(() => {
                        const list = getNotificationsList();
                        if (list.length === 0) {
                          return (
                            <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                              No review requests or tickets.
                            </div>
                          );
                        }

                        return list.map(item => {
                          const isUnread = !readNotifications.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleNotificationClick(item)}
                              className={`w-full text-left p-3.5 hover:bg-muted/50 transition-all flex items-start space-x-3 cursor-pointer ${isUnread ? 'bg-primary/5' : ''
                                }`}
                            >
                              {/* Icon Indicator */}
                              <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.type === 'host' ? 'bg-emerald-500' :
                                item.type === 'campaign' ? 'bg-blue-500' :
                                item.type === 'expired' ? 'bg-amber-500' : 'bg-orange-500'
                                }`} />

                              <div className="flex-1 space-y-0.5">
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                                  <span className="text-[9px] text-muted-foreground font-semibold shrink-0 ml-2">
                                    {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed line-clamp-2">
                                  {item.description}
                                </p>
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Global ID Search bar */}
            <form onSubmit={handleGlobalSearch} className="flex items-center max-w-sm w-full bg-background border border-input rounded-xl px-3 h-10 shadow-sm">
              <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold bg-transparent focus:outline-none text-foreground placeholder-muted-foreground"
              />
              <button type="submit" className="hidden">Search</button>
            </form>
          </div>
        </header>

        {/* Main Content Workspace */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto min-w-0">

          {/* Notifications alert (Opaque Toast Alert System) */}
          {notification.message && (
            <div
              className={`fixed top-6 right-6 p-4 rounded-2xl shadow-2xl border text-xs font-bold z-[999] flex items-center justify-between space-x-3 text-white border-transparent animate-fade-in ${notification.type === 'success'
                ? 'bg-emerald-600 shadow-emerald-500/20'
                : notification.type === 'error'
                  ? 'bg-rose-600 shadow-rose-500/20'
                  : 'bg-[#0069a8] shadow-[#0069a8]/20'
                }`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification({ type: '', message: '' })}
                className="p-1 hover:bg-white/20 rounded-lg transition-all cursor-pointer text-white/80 hover:text-white shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
                    className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm group"
                  >
                    <div className="absolute right-4 top-4 p-2 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-all">
                      <IndianRupee className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Total Revenue</p>
                    <h3 className="font-outfit text-2xl font-black mt-2">₹{stats?.revenue?.totalINR || 0}</h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold group-hover:text-emerald-500 transition-colors">Click to view paid advertisers</p>
                  </div>

                  {/* Total Ads Deployed */}
                  <div
                    onClick={() => {
                      setActiveTab('requests');
                      setRequestsSubTab('campaigns');
                    }}
                    className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm group"
                  >
                    <div className="absolute right-4 top-4 p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-all">
                      <Tv className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Ads Deployed</p>
                    <h3 className="font-outfit text-2xl font-black mt-2">
                      {campaigns.filter(c => c.approvalStatus === 'approved').length}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                      <span className="text-[#0069a8] font-bold">{campaigns.filter(c => c.approvalStatus === 'pending').length} pending</span> / {campaigns.length} total
                    </p>
                  </div>

                  {/* Pending Approvals */}
                  <div
                    onClick={() => {
                      setActiveTab('requests');
                      setRequestsSubTab('campaigns');
                    }}
                    className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm group"
                  >
                    <div className="absolute right-4 top-4 p-2 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-all">
                      <FileCheck className="w-4 h-4 text-orange-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending Ads</p>
                    <h3 className="font-outfit text-2xl font-black mt-2">
                      {campaigns.filter(c => c.approvalStatus === 'pending').length}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Moderation queue waiting</p>
                  </div>

                  {/* Support tickets */}
                  <div
                    onClick={() => setActiveTab('reports')}
                    className="glassmorphism p-5 rounded-2xl bg-card/30 relative overflow-hidden border border-border/50 cursor-pointer shadow-sm group"
                  >
                    <div className="absolute right-4 top-4 p-2 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-all">
                      <ClipboardList className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Support Tickets</p>
                    <h3 className="font-outfit text-2xl font-black mt-2">
                      {reports.filter(r => r.status !== 'resolved').length}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-semibold">Open issues to resolve</p>
                  </div>
                </div>

                {/* Telemetry Status Row */}
                <div className="grid lg:grid-cols-3 gap-5">
                  {/* Summary Stats Panel */}
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

                      return (
                        <div className="grid md:grid-cols-3 gap-6 items-center">
                          {/* Col 1: Operational Health progress */}
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

                          {/* Col 2: Active vs Total count */}
                          <div className="flex items-center justify-between border-l border-border/40 pl-6 h-full py-1">
                            <div>
                              <span className="text-[10px] font-bold text-muted-foreground block">Active Terminals</span>
                              <span className="text-xl font-black text-foreground mt-1 block">
                                {online}{' '}
                                <span className="text-xs font-semibold text-muted-foreground">/ {total} deployed</span>
                              </span>
                            </div>
                          </div>

                          {/* Col 3: Quick status breakdown grid */}
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

                  {/* Host Requests moderation widget */}
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
                              setActiveTab('requests');
                              setRequestsSubTab('hosts');
                              setSelectedHostApp(app);
                            }}
                            className="flex justify-between items-start border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/10 p-1.5 rounded-xl transition-all"
                            title="Click to view host request"
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

                  {/* Recent ad campaigns booking widget */}
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
                              setActiveTab('requests');
                              setRequestsSubTab('campaigns');
                              setSelectedCampaign(booking);
                              setShowDetailsModal(true);
                            }}
                            className="flex justify-between items-center border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/10 p-1.5 rounded-xl transition-all"
                            title="Click to view campaign details"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground">Campaign {booking.bookingId}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{booking.outletId?.outletName || 'Outlet'} - {booking.adDurationDays} days</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${booking.paymentStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                              }`}>
                              {booking.paymentStatus}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active support tickets widget */}
                  <div className="glassmorphism p-5 rounded-2xl bg-card/30 space-y-4 border border-border/50">
                    <h4 className="font-outfit text-xs font-bold border-b border-border/40 pb-3 text-foreground">Active Tickets</h4>

                    {reports.filter(r => r.status !== 'resolved').slice(0, 3).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center font-medium">All support tickets resolved.</p>
                    ) : (
                      <div className="space-y-3">
                        {reports.filter(r => r.status !== 'resolved').slice(0, 3).map((rep) => (
                          <div
                            key={rep.reportId}
                            onClick={() => {
                              setActiveTab('reports');
                              setSelectedReport(rep);
                              setReportActionForm({
                                status: rep.status,
                                actionTaken: rep.actionTaken || ''
                              });
                            }}
                            className="flex justify-between items-start border-b border-border/40 pb-2 last:border-b-0 last:pb-0 cursor-pointer hover:bg-card/10 p-1.5 rounded-xl transition-all"
                            title="Click to resolve ticket"
                          >
                            <div>
                              <p className="text-xs font-bold text-foreground">{rep.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                                {rep.reporterId?.name || rep.reporterRole} ({rep.reporterId?.phone})
                              </p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize shrink-0 ${rep.status === 'pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'
                              }`}>
                              {rep.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* 2. DEPLOYED DEVICES TAB */}
            {activeTab === 'devices' && (
              <motion.div
                key="devices-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {/* Venue Filter Dropdown */}
                    <select
                      value={selectedVenueFilter}
                      onChange={(e) => setSelectedVenueFilter(e.target.value)}
                      className="bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-56 cursor-pointer"
                    >
                      <option value="all">All Approved Venues</option>
                      {hosts.filter(h => h.status === 'approved').map((app) => (
                        <option key={app._id} value={app._id}>
                          {app.outletName} ({app.city})
                        </option>
                      ))}
                    </select>

                    {/* Selector tabs */}
                    <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border shrink-0">
                      <button
                        onClick={() => setDeviceSubTab('tablet')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${deviceSubTab === 'tablet' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        Tabletop Tablets
                      </button>
                      <button
                        onClick={() => setDeviceSubTab('screen')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${deviceSubTab === 'screen' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        Wall Screens
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowDeployForm(!showDeployForm)}
                    className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-primary/95 transition-all shadow-md flex items-center space-x-2 cursor-pointer glow-hover"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deploy New Device</span>
                  </button>
                </div>

                {/* Provision Device form */}
                {showDeployForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-card/10 border border-border/40 mb-6 shadow-sm"
                  >
                    <h4 className="font-outfit text-sm font-bold mb-4">Provision Device Credentials</h4>
                    <form onSubmit={handleDeployDevice} className="grid sm:grid-cols-3 gap-6 items-end">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Device Hardware Type</label>
                        <select
                          value={deviceForm.deviceType}
                          onChange={(e) => setDeviceForm({ ...deviceForm, deviceType: e.target.value })}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="tablet">Tabletop Kiosk (Tablet)</option>
                          <option value="screen">Wall Display Screen</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Target Venue Outlet</label>
                        <select
                          required
                          value={deviceForm.hostApplicationId}
                          onChange={(e) => setDeviceForm({ ...deviceForm, hostApplicationId: e.target.value })}
                          className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">-- Choose Approved Venue --</option>
                          {hosts.filter(h => h.status === 'approved').map(app => (
                            <option key={app._id} value={app._id}>{app.outletName} ({app.city})</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          type="submit"
                          className="bg-primary text-primary-foreground text-xs font-bold h-9 px-4 rounded-xl hover:bg-primary/95 transition-all shadow-md cursor-pointer grow"
                        >
                          Deploy Device
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeployForm(false)}
                          className="border border-border hover:bg-muted text-foreground text-xs font-bold h-9 px-4 rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Devices lists table */}
                <div className="mx-1 mt-2 overflow-x-auto animate-fade-in">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                        <th className="p-4 pl-6">Device ID</th>
                        <th className="p-4">Target Venue</th>
                        <th className="p-4">Location</th>
                        <th className="p-4">Network Status</th>
                        <th className="p-4">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredDevices.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-muted-foreground font-medium">
                            No {deviceSubTab} devices deployed yet.
                          </td>
                        </tr>
                      ) : (
                        filteredDevices.map((device) => (
                          <tr key={device._id} className="hover:bg-card/20 transition-all">
                            <td className="p-4 pl-6 font-bold text-foreground tracking-tight">{device.deviceId}</td>
                            <td className="p-4 font-semibold">{device.hostApplicationId?.outletName || 'Standalone'}</td>
                            <td className="p-4 text-muted-foreground">
                              {device.hostApplicationId ? `${device.hostApplicationId.city}, ${device.hostApplicationId.state}` : '-'}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${device.status === 'online'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-muted text-muted-foreground border-border'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${device.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                                {device.status}
                              </span>
                            </td>
                            <td className="p-4 text-muted-foreground font-medium">
                              {device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleString() : 'Never'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 3. USERS & DRILLDOWN TAB */}
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
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${userSubTab === 'merchant' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Venue Hosts
                    </button>
                    <button
                      onClick={() => {
                        setUserSubTab('advertiser');
                        setSelectedUser(null);
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${userSubTab === 'advertiser' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Advertisers
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 items-start">

                  {/* Users table */}
                  <div className="mx-1 mt-2 overflow-x-auto animate-fade-in transition-all lg:col-span-3">
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
                            <tr key={user._id} className={`hover:bg-card/20 transition-all ${selectedUser?._id === user._id ? 'bg-primary/5' : ''}`}>
                              <td className="p-4 pl-6 font-bold tracking-tight text-foreground">
                                <div>{user.name || 'N/A'}</div>
                                <div className="text-[10px] text-muted-foreground font-mono font-medium">{user._id}</div>
                              </td>
                              <td className="p-4 text-foreground font-black dark:font-semibold dark:text-slate-300">{user.phone}</td>
                              <td className="p-4 text-foreground font-extrabold dark:font-bold dark:text-slate-300">
                                {userSubTab === 'merchant' ? user.stats?.merchant?.applicationsCount || 0 : user.stats?.advertiser?.bookingsCount || 0}
                              </td>
                              {userSubTab === 'merchant' && (
                                <td className="p-4 text-foreground font-extrabold dark:font-bold dark:text-slate-300">{user.stats?.merchant?.devicesCount || 0}</td>
                              )}
                              <td className="p-4 text-muted-foreground font-medium">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                              </td>
                              <td className="p-4 text-right pr-6">
                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => setSelectedUser(user)}
                                    className="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
                                    title="Inspect User Details"
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
                                    className="p-1.5 bg-muted hover:bg-amber-500 hover:text-white border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
                                    title="Edit User Properties"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingUser(user);
                                      setAdminDeletePassword('');
                                    }}
                                    className="p-1.5 bg-muted hover:bg-destructive hover:text-white border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
                                    title="Delete User"
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
              </motion.div>
            )}

            {/* 3.5. REQUESTS PANEL (PENDING ADS & VENUE APPLICATIONS) */}
            {activeTab === 'requests' && (
              <motion.div
                key="requests-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Selector Subtabs */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/50 pb-6 flex-wrap">
                  <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
                    <button
                      onClick={() => {
                        setRequestsSubTab('campaigns');
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${requestsSubTab === 'campaigns' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Ad Campaigns
                    </button>
                    <button
                      onClick={() => {
                        setRequestsSubTab('hosts');
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${requestsSubTab === 'hosts' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Venue Applications
                    </button>
                    <button
                      onClick={() => {
                        setRequestsSubTab('devices');
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${requestsSubTab === 'devices' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Device Requests
                    </button>
                  </div>

                  {requestsSubTab === 'hosts' && (
                    <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border/60">
                      {['all', 'pending', 'approved', 'rejected'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setHostFilter(filter);
                            setSelectedHostApp(null);
                          }}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${hostFilter === filter
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}

                  {requestsSubTab === 'campaigns' && (
                    <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border/60">
                      {['all', 'pending', 'approved', 'rejected'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setAdFilter(filter);
                          }}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${adFilter === filter
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  )}

                  {requestsSubTab === 'devices' && (
                    <div className="flex space-x-2 bg-muted/30 p-1 rounded-xl border border-border/60">
                      {['all', 'pending', 'approved', 'rejected'].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setDeviceReqFilter(filter);
                            setSelectedDeviceReq(null);
                          }}
                          className={`text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${deviceReqFilter === filter
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
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
                          {adFilter === 'approved'
                            ? 'No approved ad campaigns found.'
                            : adFilter === 'rejected'
                              ? 'No rejected or revoked ad campaigns found.'
                              : adFilter === 'pending'
                                ? 'All booked and paid ad campaigns are resolved.'
                                : 'No ad campaigns found.'}
                        </p>
                        <p className="text-[10px] mt-1">
                          {adFilter === 'approved'
                            ? 'Approve pending campaigns to see them here.'
                            : 'No matching campaigns are available.'}
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
                              <tr key={booking.bookingId} className="hover:bg-card/20 transition-all">
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
                                    className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-xl transition-all cursor-pointer border border-blue-500/20 inline-flex items-center justify-center shadow-sm"
                                    title="Preview media attachment"
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
                                    className="px-3 py-1.5 bg-muted hover:bg-muted-foreground/20 text-foreground border border-border font-bold rounded-lg transition-all cursor-pointer"
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
                                          className={`px-3 py-1.5 border font-bold rounded-lg transition-all flex items-center space-x-1 ${watchedVideos.has(booking.bookingId)
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
                                          className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 hover:border-destructive font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1"
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
                                        className="px-3 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1 shadow-sm font-semibold"
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
                  <div className="grid lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Applications List */}
                    <div className={`${selectedHostApp ? 'lg:col-span-6' : 'lg:col-span-12'} mx-1 mt-2 overflow-x-auto animate-fade-in`}>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                            <th className="p-4 pl-6">Venue Outlet</th>
                            <th className="p-4">Location</th>
                            <th className="p-4">Contact Person Name</th>
                            <th className="p-4">Device Qty</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right pr-6">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {filteredHosts.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-12 text-center text-muted-foreground font-medium italic">
                                No host applications found.
                              </td>
                            </tr>
                          ) : (
                            filteredHosts.map((app) => (
                              <tr
                                key={app._id}
                                onClick={() => setSelectedHostApp(app)}
                                className={`hover:bg-muted/10 cursor-pointer transition-all ${selectedHostApp?._id === app._id ? 'bg-primary/5' : ''
                                  }`}
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
                                      <div className="text-foreground">Tablet (Qty: {app.tabletQuantity})</div>
                                    )}
                                    {app.requestScreen && (
                                      <div className="text-foreground">Screen (Qty: {app.screenQuantity})</div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-col space-y-1 items-start">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${app.status === 'approved'
                                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      : app.status === 'rejected'
                                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                        : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                      }`}>
                                      {app.status}
                                    </span>
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${app.allowOpenAds !== false
                                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                      : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                                      }`}>
                                      {app.allowOpenAds !== false ? 'OPEN ADS' : 'PRIVATE'}
                                    </span>
                                  </div>
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

                    {/* Right Column: Detailed review pane */}
                    {selectedHostApp && (
                      <div className="lg:col-span-6 animate-slide-in">
                        <div className="p-6 rounded-2xl bg-card/10 border border-border/40 space-y-6 relative">
                          <button
                            onClick={() => setSelectedHostApp(null)}
                            className="absolute right-4 top-4 p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div>
                            <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                              Host Application Details
                            </span>
                            <h3 className="font-outfit text-lg font-bold text-slate-200 mt-3">{selectedHostApp.outletName}</h3>
                            <p className="text-xs text-muted-foreground font-medium mt-1">Submitted on {new Date(selectedHostApp.createdAt).toLocaleString()}</p>
                          </div>

                          <div className="space-y-4 text-xs font-semibold">
                            {/* Outlet description */}
                            <div className="space-y-1 bg-background/30 p-4 rounded-2xl border border-border/40">
                              <span className="text-[10px] font-black text-muted-foreground uppercase">Description</span>
                              <p className="text-foreground leading-relaxed font-semibold">{selectedHostApp.outletDescription}</p>
                            </div>

                            {/* Address details */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase">Outlet Address</span>
                                <p className="text-foreground font-medium">
                                  {selectedHostApp.doorNo}, {selectedHostApp.street}<br />
                                  {selectedHostApp.city}, {selectedHostApp.state} - {selectedHostApp.zipCode}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-black text-muted-foreground uppercase">Device Configuration</span>
                                <div className="text-foreground capitalize font-bold">
                                  <div className="text-xs font-bold space-y-1">
                                    {selectedHostApp.requestTablet && (
                                      <div>Tablet Display (Qty: {selectedHostApp.tabletQuantity})</div>
                                    )}
                                    {selectedHostApp.requestScreen && (
                                      <div>Screen Display (Qty: {selectedHostApp.screenQuantity})</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Contact details */}
                            <div className="space-y-2 border-t border-border/40 pt-4">
                              <span className="text-[10px] font-black text-muted-foreground uppercase">Contact Information</span>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                  <span className="text-[9px] text-muted-foreground">Person</span>
                                  <p className="text-foreground">{selectedHostApp.contactPerson}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] text-muted-foreground">Phone</span>
                                  <p className="text-foreground">{selectedHostApp.phone}</p>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-[9px] text-muted-foreground">Email</span>
                                  <p className="text-foreground">{selectedHostApp.email}</p>
                                </div>
                              </div>
                            </div>

                            {/* Request status */}
                            <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                              <span className="text-[10px] font-black text-muted-foreground uppercase">Current Request Status</span>
                              <span className={`text-[10px] font-bold px-3 py-1 rounded-full capitalize ${selectedHostApp.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : selectedHostApp.status === 'rejected'
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                }`}>
                                {selectedHostApp.status}
                              </span>
                            </div>

                            {/* Actions */}
                            {selectedHostApp.status === 'pending' && (
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                                <button
                                  onClick={() => handleReviewHost(selectedHostApp._id, 'approve')}
                                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Approve Request</span>
                                </button>
                                <button
                                  onClick={() => handleReviewHost(selectedHostApp._id, 'reject')}
                                  className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Reject Request</span>
                                </button>
                              </div>
                            )}

                            {selectedHostApp.status === 'approved' && (
                               <div className="space-y-3 pt-4 border-t border-border/40">
                                 <div className="flex justify-between items-center">
                                   <span className="text-[10px] font-black text-muted-foreground uppercase">Admin Account Controls</span>
                                   <button
                                     onClick={() => openQuotaModal(selectedHostApp)}
                                     className="text-xs font-bold text-primary hover:underline flex items-center space-x-1 cursor-pointer"
                                   >
                                     <Settings className="w-3.5 h-3.5" />
                                     <span>Edit Custom Quotas</span>
                                   </button>
                                 </div>

                                 <div className="grid grid-cols-2 gap-3">
                                   <button
                                     onClick={async () => {
                                       try {
                                         const nextState = !selectedHostApp.isPaused;
                                         await axios.put(`${API_BASE}/admin/hosts/${selectedHostApp._id}/status`, { isPaused: nextState }, { headers: { Authorization: `Bearer ${token}` } });
                                         setSelectedHostApp(prev => ({ ...prev, isPaused: nextState }));
                                         fetchHosts(token);
                                       } catch (e) {
                                         console.error(e);
                                       }
                                     }}
                                     className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer border ${selectedHostApp.isPaused
                                       ? 'bg-amber-500 text-white border-amber-600'
                                       : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                       }`}
                                   >
                                     <span>{selectedHostApp.isPaused ? 'Unpause Host' : 'Pause Host'}</span>
                                   </button>

                                   <button
                                     onClick={async () => {
                                       try {
                                         const nextState = !selectedHostApp.isRevoked;
                                         await axios.put(`${API_BASE}/admin/hosts/${selectedHostApp._id}/status`, { isRevoked: nextState }, { headers: { Authorization: `Bearer ${token}` } });
                                         setSelectedHostApp(prev => ({ ...prev, isRevoked: nextState }));
                                         fetchHosts(token);
                                       } catch (e) {
                                         console.error(e);
                                       }
                                     }}
                                     className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer border ${selectedHostApp.isRevoked
                                       ? 'bg-destructive text-white border-destructive'
                                       : 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
                                       }`}
                                   >
                                     <span>{selectedHostApp.isRevoked ? 'Unrevoke Host' : 'Revoke Host'}</span>
                                   </button>
                                 </div>
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Device Requests List */}
                    <div className={`${selectedDeviceReq ? 'lg:col-span-6' : 'lg:col-span-12'} mx-1 mt-2 overflow-x-auto animate-fade-in`}>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                            <th className="p-4 pl-6">Venue Outlet</th>
                            <th className="p-4">Merchant</th>
                            <th className="p-4">Requested Devices</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right pr-6">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                          {filteredDeviceReqs.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="p-12 text-center text-muted-foreground font-medium italic">
                                No device requests found.
                              </td>
                            </tr>
                          ) : (
                            filteredDeviceReqs.map((req) => (
                              <tr
                                key={req._id}
                                onClick={() => setSelectedDeviceReq(req)}
                                className={`hover:bg-muted/10 cursor-pointer transition-all ${selectedDeviceReq?._id === req._id ? 'bg-primary/5' : ''
                                  }`}
                              >
                                <td className="p-4 pl-6 font-bold text-foreground">
                                  <div className="flex items-center space-x-2">
                                    <Building className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{req.hostApplicationId?.outletName || 'Outlet'}</span>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-medium pl-5.5">
                                    {req.hostApplicationId?.city}, {req.hostApplicationId?.state}
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
                                <td className="p-4 text-right pr-6 text-muted-foreground font-medium">
                                  {new Date(req.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Right Column: Detailed review pane */}
                    {selectedDeviceReq && (
                      <div className="lg:col-span-6 animate-slide-in">
                        <div className="p-6 rounded-2xl bg-card/10 border border-border/40 space-y-6 relative">
                          <button
                            onClick={() => setSelectedDeviceReq(null)}
                            className="absolute right-4 top-4 p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <div>
                            <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                              Device Request Details
                            </span>
                            <h3 className="font-outfit text-lg font-bold text-slate-200 mt-3">{selectedDeviceReq.hostApplicationId?.outletName || 'Outlet'}</h3>
                            <p className="text-xs text-muted-foreground font-medium mt-1">Submitted on {new Date(selectedDeviceReq.createdAt).toLocaleString()}</p>
                          </div>

                          <div className="space-y-4 text-xs font-semibold">
                            {/* Merchant details */}
                            <div className="space-y-1 bg-background/30 p-4 rounded-2xl border border-border/40">
                              <span className="text-[10px] font-black text-muted-foreground uppercase">Merchant Information</span>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div>
                                  <span className="text-[9px] text-muted-foreground">Name</span>
                                  <p className="text-foreground">{selectedDeviceReq.userId?.name || 'N/A'}</p>
                                </div>
                                <div>
                                  <span className="text-[9px] text-muted-foreground">Phone</span>
                                  <p className="text-foreground">{selectedDeviceReq.userId?.phone}</p>
                                </div>
                              </div>
                            </div>

                            {/* Device quantities requests */}
                            <div className="space-y-1 bg-background/30 p-4 rounded-2xl border border-border/40">
                              <span className="text-[10px] font-black text-muted-foreground uppercase">Device Quantities Requested</span>
                              <div className="text-foreground capitalize font-bold mt-2 space-y-1">
                                {selectedDeviceReq.requestTablet && (
                                  <div>Tablet Display (Qty: {selectedDeviceReq.tabletQuantity})</div>
                                )}
                                {selectedDeviceReq.requestScreen && (
                                  <div>Screen Display (Qty: {selectedDeviceReq.screenQuantity})</div>
                                )}
                              </div>
                            </div>

                            {/* Request status */}
                            <div className="border-t border-border/40 pt-4 flex items-center justify-between">
                              <span className="text-[10px] font-black text-muted-foreground uppercase">Current Request Status</span>
                              <span className={`text-[10px] font-bold px-3 py-1 rounded-full capitalize ${selectedDeviceReq.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : selectedDeviceReq.status === 'rejected'
                                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                                  : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                                }`}>
                                {selectedDeviceReq.status}
                              </span>
                            </div>

                            {/* Actions */}
                            {selectedDeviceReq.status === 'pending' && (
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
                                <button
                                  onClick={() => handleReviewDeviceRequest(selectedDeviceReq._id, 'approve')}
                                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Approve Request</span>
                                </button>
                                <button
                                  onClick={() => handleReviewDeviceRequest(selectedDeviceReq._id, 'reject')}
                                  className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                                >
                                  <X className="w-4 h-4" />
                                  <span>Reject Request</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* 5. AD SPOT RATES CARD CRUD */}
            {activeTab === 'rates' && (
              <motion.div
                key="rates-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="border-b border-border/50 pb-6 flex justify-between items-center">
                  <div className="bg-muted p-1 rounded-xl flex space-x-1 border border-border">
                    <button
                      onClick={() => setRateSubTab('tablet')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${rateSubTab === 'tablet' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Tabletop Tablets
                    </button>
                    <button
                      onClick={() => setRateSubTab('screen')}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${rateSubTab === 'screen' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      Wall Screens
                    </button>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-start">

                  {/* Pricing Rate Form */}
                  <div className="lg:col-span-2 p-8 rounded-2xl bg-card/10 border border-border/40 space-y-6">
                    <h3 className="font-outfit text-sm font-bold border-b border-border/50 pb-3">
                      {editingRateId ? `Edit Pricing Plan: ${editingRateId}` : 'Create New Pricing Rate Spot'}
                    </h3>

                    <form onSubmit={handleCreateRate} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Rate Code ID</label>
                          <input
                            type="text"
                            required
                            disabled={!!editingRateId}
                            placeholder="R_T_7_H"
                            value={rateForm.rateId}
                            onChange={(e) => setRateForm({ ...rateForm, rateId: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Device Target</label>
                          <select
                            value={rateForm.deviceType}
                            onChange={(e) => setRateForm({ ...rateForm, deviceType: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="tablet">Tabletop Kiosk (Tablet)</option>
                            <option value="screen">Wall Display Screen</option>
                          </select>
                        </div>
                      </div>

                      <div className={`grid ${frequencyOption === 'custom' ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-6 transition-all`}>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Duration (Days)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="7"
                            value={rateForm.durationDays}
                            onChange={(e) => setRateForm({ ...rateForm, durationDays: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Loop Frequency</label>
                          <select
                            value={frequencyOption}
                            onChange={(e) => setFrequencyOption(e.target.value)}
                            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="continuous">Continuous Loop</option>
                            <option value="every_15_mins">Once Every 15 Mins</option>
                            <option value="every_30_mins">Once Every 30 Mins</option>
                            <option value="hourly">Once Every Hour</option>
                            <option value="every_2_hours">Once Every 2 Hours</option>
                            <option value="custom">Custom Minutes...</option>
                          </select>
                        </div>
                        {frequencyOption === 'custom' && (
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Custom Minutes</label>
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="45"
                              value={customMinutes}
                              onChange={(e) => setCustomMinutes(e.target.value)}
                              className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Price Amount (INR)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="500"
                            value={rateForm.amount}
                            onChange={(e) => setRateForm({ ...rateForm, amount: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-2">
                        <button
                          type="submit"
                          className="bg-primary text-primary-foreground font-bold py-3.5 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-lg glow-hover grow"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{editingRateId ? 'Save pricing modifications' : 'Save Pricing Spot'}</span>
                        </button>
                        {editingRateId && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRateId(null);
                              setRateForm({
                                rateId: '',
                                deviceType: 'tablet',
                                durationDays: '7',
                                frequency: 'hourly',
                                amount: ''
                              });
                            }}
                            className="border border-border text-foreground hover:bg-muted font-bold px-6 py-3.5 rounded-xl transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Rates list Cards */}
                  <div className="space-y-4">
                    <h3 className="font-outfit text-sm font-bold">Configured rates</h3>
                    {rates.filter(r => r.deviceType === rateSubTab).length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center italic font-semibold">No rates configured for this device type.</p>
                    ) : (
                      rates.filter(r => r.deviceType === rateSubTab).map((rate) => (
                        <div key={rate._id} className="p-4 border-b border-border/40 flex justify-between items-center relative group hover:bg-card/10 transition-all rounded-lg">
                          <div>
                            <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">{rate.rateId}</span>
                            <h4 className="font-bold text-foreground text-xs mt-1 capitalize">{rate.deviceType} Display</h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{rate.durationDays} Days / {getFrequencyLabel(rate.frequency)}</p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="font-black text-foreground text-sm">₹{rate.amount / 100}</span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => startEditRate(rate)}
                                className="p-1.5 hover:bg-primary hover:text-primary-foreground border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
                                title="Edit rate"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRate(rate.rateId)}
                                className="p-1.5 hover:bg-destructive hover:text-destructive-foreground border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
                                title="Delete rate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </motion.div>
            )}

            {/* 6. SUPPORT TICKETS & RESOLUTIONS */}
            {activeTab === 'reports' && (
              <motion.div
                key="reports-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="grid lg:grid-cols-3 gap-6 items-start">

                  {/* Reports list table */}
                  <div className={`mx-1 mt-2 overflow-x-auto animate-fade-in transition-all ${selectedReport ? 'lg:col-span-2' : 'lg:col-span-3'
                    }`}>
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider bg-card/10">
                          <th className="p-4 pl-6">Ticket ID</th>
                          <th className="p-4">Title / Issue</th>
                          <th className="p-4">Reporter</th>
                          <th className="p-4">Ticket Status</th>
                          <th className="p-4 text-right pr-6">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {filteredReportsList.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-muted-foreground font-medium">
                              No support tickets submitted.
                            </td>
                          </tr>
                        ) : (
                          filteredReportsList.map((ticket) => (
                            <tr key={ticket._id} className="hover:bg-card/20 transition-all">
                              <td className="p-4 pl-6 font-bold tracking-tight text-foreground">{ticket.reportId}</td>
                              <td className="p-4">
                                <p className="font-bold text-foreground">{ticket.title}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-xs">{ticket.description}</p>
                              </td>
                              <td className="p-4 text-muted-foreground font-semibold">
                                {ticket.reporterId?.name || ticket.reporterId?.phone || 'Account'} ({ticket.reporterRole})
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${ticket.status === 'resolved'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : ticket.status === 'in-progress'
                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                    : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                  }`}>
                                  {ticket.status}
                                </span>
                              </td>
                              <td className="p-4 text-right pr-6">
                                <button
                                  onClick={() => {
                                    setSelectedReport(ticket);
                                    setReportActionForm({
                                      status: ticket.status,
                                      actionTaken: ticket.actionTaken || ''
                                    });
                                  }}
                                  className="p-1.5 bg-muted hover:bg-primary hover:text-primary-foreground border border-border rounded-lg text-muted-foreground transition-all cursor-pointer font-bold text-[10px]"
                                >
                                  Moderate
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Resolution drawers */}
                  {selectedReport && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-6 rounded-2xl bg-card/10 border border-border/40 space-y-6 relative"
                    >
                      <button
                        onClick={() => setSelectedReport(null)}
                        className="absolute right-4 top-4 p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div>
                        <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                          Resolve Support Case
                        </span>
                        <h4 className="font-outfit text-sm font-bold mt-4 text-foreground">{selectedReport.title}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1 font-semibold">
                          Reporter: {selectedReport.reporterId?.name || 'N/A'} ({selectedReport.reporterId?.phone || 'Unknown'}) [{selectedReport.reporterRole}]
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 font-semibold bg-background/50 p-3.5 rounded-xl border border-border/40">
                          {selectedReport.description}
                        </p>
                      </div>

                      <form onSubmit={handleUpdateReport} className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Update Ticket Status</label>
                          <select
                            value={reportActionForm.status}
                            onChange={(e) => setReportActionForm({ ...reportActionForm, status: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                          >
                            <option value="pending">Pending review</option>
                            <option value="in-progress">In progress</option>
                            <option value="resolved">Resolved / Fixed</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Action / Resolution Logs</label>
                          <textarea
                            required
                            rows="4"
                            placeholder="Describe action taken to fix this issue..."
                            value={reportActionForm.actionTaken}
                            onChange={(e) => setReportActionForm({ ...reportActionForm, actionTaken: e.target.value })}
                            className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl transition-all shadow-lg glow-hover cursor-pointer"
                        >
                          Save Resolution Logs
                        </button>
                      </form>
                    </motion.div>
                  )}

                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </main>

      {/* Responsive mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black"
            />

            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 max-w-xs bg-card border-r border-border p-6 flex flex-col justify-between"
            >
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-4 top-4 p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div>
                <div className="flex items-center space-x-3 mb-10">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-900 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-outfit text-base font-bold tracking-tight">CMS Admin</span>
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
                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${activeTab === item.id
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <div className="flex items-center space-x-3">
                          {item.icon}
                          <span>{item.label}</span>
                        </div>
                        {badgeCount > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black leading-none ${activeTab === item.id ? 'bg-primary-foreground text-primary' : 'bg-destructive text-destructive-foreground'
                            }`}>
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
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
                  <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl border border-destructive/20 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* -------------------- ADMIN DIALOG MODAL OVERLAYS (RENDERED AT ROOT TO PREVENT TRANSFORM WHITE BAR ISSUES) -------------------- */}

      {/* Video / Image Creative Preview Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-2xl max-h-[85vh] rounded-[24px] overflow-hidden shadow-2xl p-5 relative flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-outfit text-base font-bold text-foreground">Media Creative Preview</h3>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setActiveVideoUrl('');
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
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

                  // Render Image / Dual-Image Preview Grid
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

      {/* Campaign Details Modal */}
      {showDetailsModal && selectedCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                  Campaign Metadata
                </span>
                <h3 className="font-outfit text-lg font-bold text-foreground mt-2">Details for {selectedCampaign.bookingId}</h3>
              </div>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs font-semibold text-muted-foreground mb-6">
              <div>
                <p className="font-bold text-foreground block uppercase text-[10px] mb-1">Campaign ID</p>
                <p className="font-mono text-primary font-bold text-sm">{selectedCampaign.bookingId}</p>
              </div>
              <div>
                <p className="font-bold text-foreground block uppercase text-[10px] mb-1">Advertiser</p>
                <p className="text-foreground font-bold">{selectedCampaign.advertiserId?.name || 'N/A'}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{selectedCampaign.advertiserId?.phone || 'Account deleted'}</p>
              </div>
              <div>
                <p className="font-bold text-foreground block uppercase text-[10px] mb-1">Target Venue Outlet</p>
                <p className="text-foreground">
                  {selectedCampaign.outletId?.outletName || 'Standalone'}
                </p>
                <p className="text-[10px] font-medium mt-0.5">{selectedCampaign.city}, {selectedCampaign.state}</p>
              </div>
              <div>
                <p className="font-bold text-foreground block uppercase text-[10px] mb-1">Target Screen Specs</p>
                <p className="text-foreground capitalize">{selectedCampaign.deviceType} Display (Qty: {selectedCampaign.quantity})</p>
              </div>
              <div>
                <p className="font-bold text-foreground block uppercase text-[10px] mb-1">Schedule Cycle</p>
                <p className="text-foreground">{selectedCampaign.adDurationDays} Days / {selectedCampaign.frequency}</p>
              </div>
              <div>
                <p className="font-bold text-foreground block uppercase text-[10px] mb-1">Total Payout</p>
                <p className="text-foreground text-sm font-black">₹{selectedCampaign.amount / 100}</p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-border/50">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all cursor-pointer border border-border text-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Denial Reason Prompt Dialog */}
      {showDenyModal && selectedCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
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
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!denyReasonText.trim()) {
                showNotification('error', 'Please provide a reason for denial');
                return;
              }
              await handleReviewCampaign(selectedCampaign.bookingId, 'reject', denyReasonText);
              setShowDenyModal(false);
              setSelectedCampaign(null);
              setDenyReasonText('');
            }} className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold">
                Please specify the reason for denying campaign <span className="font-mono font-bold text-primary">{selectedCampaign.bookingId}</span>. This message will be shown to the advertiser.
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
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all cursor-pointer border border-border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-all cursor-pointer text-xs"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative animate-fade-in">
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
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRevokeCampaign} className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold">
                Revoking campaign <span className="font-mono font-bold text-primary">{selectedCampaign.bookingId}</span> is a destructive action. This will immediately stop ad rotation and permanently delete the video file from the server.
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
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all cursor-pointer border border-border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={revokeLoading}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-all cursor-pointer text-xs disabled:opacity-50"
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
          <div className="bg-card border border-border w-full max-w-2xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-primary/20">
                  Revenue Summary
                </span>
                <h3 className="font-outfit text-lg font-bold text-foreground mt-2">Paid Advertisers & Completed Payments</h3>
              </div>
              <button
                onClick={() => {
                  setShowRevenueModal(false);
                  setExpandedPaymentId(null);
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {campaigns.filter(c => c.paymentStatus === 'completed').length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No completed payments found.</p>
              ) : (
                campaigns.filter(c => c.paymentStatus === 'completed').map((payment) => {
                  const isExpanded = expandedPaymentId === payment.bookingId;
                  return (
                    <div key={payment.bookingId} className="border border-border/50 rounded-2xl p-4 bg-card/25 space-y-3 transition-all hover:bg-card/40">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-foreground">Campaign {payment.bookingId}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{payment.advertiserId?.name || 'Unknown Advertiser'} ({payment.advertiserId?.phone || 'Unknown'})</p>
                        </div>
                        <div className="text-right flex items-center space-x-3">
                          <div>
                            <p className="text-xs font-black text-emerald-500">₹{payment.amount / 100}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : 'Unknown Date'}</p>
                          </div>
                          <button
                            onClick={() => setExpandedPaymentId(isExpanded ? null : payment.bookingId)}
                            className="px-2.5 py-1 bg-muted hover:bg-muted-foreground/10 border border-border rounded-lg text-[10px] font-bold text-foreground transition-all cursor-pointer"
                          >
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/40 text-[10px] font-semibold text-muted-foreground animate-fade-in">
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-muted-foreground">Transaction ID</span>
                            <span className="text-foreground font-mono">{payment.transactionId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-muted-foreground">Order ID</span>
                            <span className="text-foreground font-mono">{payment.orderId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-muted-foreground">Payment ID</span>
                            <span className="text-foreground font-mono">{payment.paymentId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-muted-foreground">Device Type</span>
                            <span className="text-foreground capitalize">{payment.deviceType}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold uppercase text-muted-foreground">Duration / Frequency</span>
                            <span className="text-foreground">{payment.adDurationDays} Days / {payment.frequency}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="block text-[8px] font-bold uppercase text-muted-foreground">Target Venue Outlet</span>
                            <span className="text-foreground">{payment.outletId?.outletName || 'N/A'} ({payment.city}, {payment.state})</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border/50 mt-6">
              <button
                onClick={() => {
                  setShowRevenueModal(false);
                  setExpandedPaymentId(null);
                }}
                className="px-4 py-2 bg-muted hover:bg-muted-foreground/10 border border-border rounded-xl transition-all cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20">
                  User Settings
                </span>
                <h3 className="font-outfit text-lg font-bold text-foreground mt-2">Edit User Profile</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">User Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Mobile Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. user@example.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Assigned Roles</label>
                <div className="space-y-2.5 mt-2">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.roles.includes('merchant')}
                      onChange={(e) => {
                        const newRoles = e.target.checked
                          ? [...userForm.roles, 'merchant']
                          : userForm.roles.filter(r => r !== 'merchant');
                        setUserForm({ ...userForm, roles: newRoles });
                      }}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4 bg-background"
                    />
                    <span>Merchant / Host</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={userForm.roles.includes('advertiser')}
                      onChange={(e) => {
                        const newRoles = e.target.checked
                          ? [...userForm.roles, 'advertiser']
                          : userForm.roles.filter(r => r !== 'advertiser');
                        setUserForm({ ...userForm, roles: newRoles });
                      }}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4 bg-background"
                    />
                    <span>Advertiser</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border/50 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all cursor-pointer border border-border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userForm.roles.length === 0}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all cursor-pointer text-xs disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Security verification Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-md rounded-[32px] shadow-2xl p-6 relative animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-destructive/10 text-destructive px-2.5 py-1 rounded-full border border-destructive/20">
                  Security Verification Required
                </span>
                <h3 className="font-outfit text-lg font-bold text-foreground mt-2">Delete User Account</h3>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDeleteUser} className="space-y-4">
              <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/15 text-xs text-destructive space-y-2">
                <p className="font-bold flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  This is a critical operation
                </p>
                <p className="font-medium leading-relaxed">
                  You are about to delete user <span className="font-bold">{deletingUser.name || deletingUser.phone}</span>. This will permanently remove their hosting applications, menus, assigned devices, bookings, and support reports.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Administrator Login Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your console password"
                    value={adminDeletePassword}
                    onChange={(e) => setAdminDeletePassword(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl pl-11 pr-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border/50 mt-6">
                <button
                  type="button"
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all cursor-pointer border border-border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!adminDeletePassword}
                  className="px-4 py-2 bg-destructive hover:bg-destructive/95 text-white font-bold rounded-xl transition-all cursor-pointer text-xs disabled:bg-muted disabled:text-muted-foreground"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal (Popup) */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border w-full max-w-2xl rounded-[32px] shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
              <div>
                <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
                  {userSubTab === 'merchant' ? 'Merchant' : 'Advertiser'} Account Details
                </span>
                {selectedUser.name && (
                  <h3 className="font-outfit text-lg font-bold text-foreground mt-2">{selectedUser.name}</h3>
                )}
                <p className="text-[11px] text-muted-foreground mt-1 font-semibold">ID: {selectedUser._id} | Phone: {selectedUser.phone} | Email: {selectedUser.email || 'N/A'}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setSelectedUserVenueId('all');
                }}
                className="p-1.5 hover:bg-muted border border-border rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drilldown content for host (merchant) */}
            {userSubTab === 'merchant' ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
                  <h5 className="text-xs font-bold text-foreground">Venues & Devices</h5>

                  {/* Venue selection dropdown */}
                  <div className="flex items-center space-x-1.5 w-full sm:w-auto">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase shrink-0">Select Venue:</span>
                    <select
                      value={selectedUserVenueId}
                      onChange={(e) => setSelectedUserVenueId(e.target.value)}
                      className="bg-background border border-input rounded-lg px-2 py-1 text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-full sm:w-48"
                    >
                      <option value="all">All Venues</option>
                      {hosts.filter(h => (h.userId?._id || h.userId)?.toString() === selectedUser._id?.toString()).map((app) => (
                        <option key={app._id} value={app._id}>
                          {app.outletName} ({app.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                  {(() => {
                    const userHosts = hosts.filter(h => (h.userId?._id || h.userId)?.toString() === selectedUser._id?.toString());
                    const filteredUserHosts = userHosts.filter(h => selectedUserVenueId === 'all' || h._id?.toString() === selectedUserVenueId?.toString());

                    if (filteredUserHosts.length === 0) {
                      return <p className="text-xs text-muted-foreground italic py-6 text-center">No venues match selection.</p>;
                    }

                    return filteredUserHosts.map((app) => {
                      const appDevices = devices.filter(d => (d.hostApplicationId?._id || d.hostApplicationId)?.toString() === app._id?.toString());

                      return (
                        <div key={app._id} className="border-b border-border/30 pb-4 last:border-b-0 last:pb-0 space-y-3 pt-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs font-bold text-foreground">{app.outletName}</p>
                              <p className="text-[9px] text-muted-foreground mt-0.5">{app.city}, {app.state}</p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${app.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                              }`}>
                              {app.status}
                            </span>
                          </div>

                          {app.status === 'approved' && (
                            <div className="space-y-1.5">
                              <p className="text-[9px] font-bold text-muted-foreground uppercase">Devices Assigned ({appDevices.length}):</p>
                              {appDevices.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground italic">No devices provisioned yet.</p>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {appDevices.map((d) => (
                                    <div key={d._id} className="flex justify-between items-center text-[10px] bg-muted/20 p-2 rounded-lg">
                                      <span className="font-semibold text-foreground/80">{d.deviceId}</span>
                                      <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[8px] font-bold capitalize ${d.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                                        {d.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ) : (
              // Drilldown content for advertiser (campaign bookings)
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-muted/20 p-3 rounded-2xl border border-border/40">
                  <h5 className="text-xs font-bold text-foreground">Campaign Bookings ({campaigns.filter(c => (c.advertiserId?._id || c.advertiserId)?.toString() === selectedUser._id?.toString()).length})</h5>

                  {/* Sorting dropdown for campaigns */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">Sort:</span>
                    <select
                      value={venueSortOrder}
                      onChange={(e) => setVenueSortOrder(e.target.value)}
                      className="bg-background border border-input rounded-lg px-2 py-1 text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="name-asc">Campaign ID A-Z</option>
                      <option value="name-desc">Campaign ID Z-A</option>
                      <option value="status-approved">Approved First</option>
                      <option value="status-pending">Pending First</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {(() => {
                    const userCampaigns = campaigns.filter(c => (c.advertiserId?._id || c.advertiserId)?.toString() === selectedUser._id?.toString());
                    const sortedCampaigns = [...userCampaigns].sort((a, b) => {
                      if (venueSortOrder === 'name-asc') {
                        return a.bookingId.localeCompare(b.bookingId);
                      }
                      if (venueSortOrder === 'name-desc') {
                        return b.bookingId.localeCompare(b.bookingId);
                      }
                      if (venueSortOrder === 'status-approved') {
                        if (a.approvalStatus === 'approved' && b.approvalStatus !== 'approved') return -1;
                        if (a.approvalStatus !== 'approved' && b.approvalStatus === 'approved') return 1;
                        return 0;
                      }
                      if (venueSortOrder === 'status-pending') {
                        if (a.approvalStatus === 'pending' && b.approvalStatus !== 'pending') return -1;
                        if (a.approvalStatus !== 'pending' && b.approvalStatus === 'pending') return 1;
                        return 0;
                      }
                      return 0;
                    });

                    if (sortedCampaigns.length === 0) {
                      return <p className="text-xs text-muted-foreground italic py-6 text-center">No ad campaigns booked.</p>;
                    }

                    return sortedCampaigns.map((book) => (
                      <div key={book.bookingId} className="border-b border-border/30 pb-4 last:border-b-0 last:pb-0 space-y-2 pt-2">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold text-foreground">Campaign ID: {book.bookingId}</p>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded capitalize ${book.approvalStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                            }`}>
                            {book.approvalStatus}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-[10px] text-muted-foreground pt-1">
                          <p><span className="font-semibold text-foreground">Venue:</span> {book.outletId?.outletName || 'Venue'} ({book.city})</p>
                          <p><span className="font-semibold text-foreground">Duration:</span> {book.adDurationDays} Days ({book.deviceType})</p>
                          <p><span className="font-semibold text-foreground">Total Paid:</span> ₹{book.amount / 100}</p>
                          <p><span className="font-semibold text-foreground">Payment Status:</span> <span className="font-bold text-foreground capitalize">{book.paymentStatus}</span></p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Quota Override Modal */}
      {isQuotaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-border/40 pb-3">
              <h4 className="font-outfit text-base font-black text-foreground uppercase tracking-wider">
                Edit Custom Quotas ({selectedHostApp?.outletName})
              </h4>
              <button
                onClick={() => setIsQuotaModalOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <p className="text-muted-foreground text-[11px]">
                Leave blank to use mode defaults — Open Mode: 4 Video / 4 Daily, 5 Image / 10 Daily; Closed Mode: 3 Video / 10 Daily, 10 Image / 15 Daily.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Max Video Slots</label>
                  <input
                    type="number"
                    placeholder="Default: 4"
                    value={quotaForm.customMaxVideoSlots}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, customMaxVideoSlots: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Daily Video Changes</label>
                  <input
                    type="number"
                    placeholder="Default: 4"
                    value={quotaForm.customDailyVideoQuota}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, customDailyVideoQuota: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Max Image Slots</label>
                  <input
                    type="number"
                    placeholder="Default: 5"
                    value={quotaForm.customMaxImageSlots}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, customMaxImageSlots: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Daily Image Changes</label>
                  <input
                    type="number"
                    placeholder="Default: 10"
                    value={quotaForm.customDailyImageQuota}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, customDailyImageQuota: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Max Wall Screen Slots</label>
                  <input
                    type="number"
                    placeholder="Default: 4"
                    value={quotaForm.customMaxScreenSlots}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, customMaxScreenSlots: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Daily Screen Changes</label>
                  <input
                    type="number"
                    placeholder="Default: 4"
                    value={quotaForm.customDailyScreenQuota}
                    onChange={(e) => setQuotaForm(prev => ({ ...prev, customDailyScreenQuota: e.target.value }))}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-border/40">
              <button
                onClick={() => setIsQuotaModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveQuotas}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
              >
                Save Quota Overrides
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
