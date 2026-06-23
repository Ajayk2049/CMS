'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  Building,
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
  Pencil
} from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

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
  const [loading, setLoading] = useState(false);
  const [zipError, setZipError] = useState('');
  const [roleActionLoading, setRoleActionLoading] = useState(false);
  const [showBecomeAdvertiserModal, setShowBecomeAdvertiserModal] = useState(false);

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
    screenQuantity: '1'
  });

  // Menu tab states
  const [menuItems, setMenuItems] = useState([]);
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const approvedOutlets = applications.filter(app => app.status === 'approved' && app.deviceType === 'tablet');
  const [devices, setDevices] = useState([]);

  // Menu Modal and editing states
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [modalForm, setModalForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Starters',
    isAvailable: true,
    imageUrl: ''
  });
  const [zoomFactor, setZoomFactor] = useState(100);
  const [imageTab, setImageTab] = useState('upload');
  const fileInputRef = useRef(null);

  const MENU_CATEGORIES = ['Starters', 'Main Course', 'Dessert', 'Beverages'];

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
  }, [activeTab]);

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
      const approvedApps = res.data.data.filter(app => app.status === 'approved' && app.deviceType === 'tablet');
      if (approvedApps.length > 0) {
        setSelectedOutletId((prev) => prev || approvedApps[0]._id);
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

  // Fetch menu
  const fetchMenu = async (authToken, outletId) => {
    if (!outletId) return;
    try {
      const res = await axios.get(`${API_BASE}/host/menu`, {
        params: { hostApplicationId: outletId },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setMenuItems(res.data.data.items || []);
    } catch (err) {
      console.error(err);
      setMenuItems([]);
    }
  };

  useEffect(() => {
    if (token && selectedOutletId) {
      fetchMenu(token, selectedOutletId);
    }
  }, [token, selectedOutletId]);

  // Setup WebSocket connection
  const setupWebSocket = (authToken) => {
    try {
      const ws = new WebSocket(`${config.wsUrl}/ws/orders?token=${authToken}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.event === 'new_order') {
          setOrders(prev => [payload.data, ...prev]);
          alert(`New Order placed at Table ${payload.data.tableNumber}!`);
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
      const promises = [];

      if (form.requestTablet) {
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
          deviceType: 'tablet',
          quantity: parseInt(form.tabletQuantity, 10)
        };
        promises.push(axios.post(`${API_BASE}/host/apply`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        }));
      }

      if (form.requestScreen) {
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
          deviceType: 'screen',
          quantity: parseInt(form.screenQuantity, 10)
        };
        promises.push(axios.post(`${API_BASE}/host/apply`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        }));
      }

      await Promise.all(promises);
      setInfo('Host applications submitted successfully! Pending admin approval.');
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
    setError('');
    setInfo('');

    if (!selectedOutletId) {
      setError('Please select an approved outlet to save the menu.');
      return;
    }

    try {
      await axios.post(`${API_BASE}/host/menu`, {
        hostApplicationId: selectedOutletId,
        items: menuItems
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInfo('Menu saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu.');
    }
  };

  const handleImageUpload = async (index, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      setError('Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.');
      return;
    }

    setError('');
    setInfo('');

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
          setInfo('Image uploaded successfully!');
        } else {
          setError(response.data.message || 'Upload failed');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to upload image.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsArrayBuffer(file);
  };

  const openCreateModal = (category = 'Starters') => {
    setEditingItemIndex(-1);
    setModalForm({
      name: '',
      description: '',
      price: '',
      category: category,
      isAvailable: true,
      imageUrl: ''
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
      imageUrl: item.imageUrl || ''
    });
    setZoomFactor(100);
    setImageTab(item.imageUrl ? 'url' : 'upload');
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
        imageUrl: modalForm.imageUrl
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
        imageUrl: modalForm.imageUrl
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
      setError('Unsupported file type. Only JPG, JPEG, PNG, and WEBP are allowed.');
      return;
    }

    setError('');
    setInfo('');

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
          setInfo('Image uploaded successfully!');
        } else {
          setError(response.data.message || 'Upload failed');
        }
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.message || 'Failed to upload image.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsArrayBuffer(file);
  };

  const addMenuItem = () => {
    openCreateModal('Starters');
  };

  const removeMenuItem = (index) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-all duration-300">

      {/* Top Header Navbar - Universal styled shadcn preset */}
      <header className="border-b border-border/40 bg-card px-5 sm:px-6 py-3.5 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="font-outfit text-md font-bold text-foreground brandLogo">Merchant Portal</span>
        </div>

        <nav className="flex space-x-1.5 md:space-x-2">
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'applications'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Host Applications</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'menu'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu Manager</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${activeTab === 'orders'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Orders</span>
            {orders.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[8px] px-1.5 py-0.5 rounded-full font-bold">
                {orders.length}
              </span>
            )}
          </button>
        </nav>

        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="hidden lg:block text-right pr-2">
            <p className="text-[10px] text-muted-foreground font-semibold leading-none">Logged in as</p>
            <p className="text-xs font-bold text-foreground mt-1">{name || phone}</p>
          </div>

          {/* Role Actions */}
          {roles.includes('advertiser') ? (
            <button
              onClick={() => handleSwitchRole('advertiser')}
              disabled={roleActionLoading}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 hover:border-indigo-500 text-indigo-400 hover:text-indigo-300 font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${roleActionLoading ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Switch to Advertiser</span>
            </button>
          ) : (
            <button
              onClick={() => setShowBecomeAdvertiserModal(true)}
              disabled={roleActionLoading}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-blue-300 font-bold rounded-xl transition-all text-xs cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Become Advertiser</span>
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

        {/* 1. Host Applications Tab */}
        {activeTab === 'applications' && (
          <div className="animate-fade-in">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Host Applications</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8">Submit forms to host new tablet or screen devices at your restaurant.</p>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Submission Form */}
              <div className="lg:col-span-2 p-6 rounded-2xl bg-card/10 border border-border/40">
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

              {/* Applications List */}
              <div className="space-y-6">
                <h3 className="font-outfit text-lg font-bold text-foreground">Your Applications</h3>
                {applications.length === 0 ? (
                  <div className="text-center p-8 border border-border/40 bg-card/5 rounded-2xl text-xs text-muted-foreground font-semibold">
                    No applications submitted yet.
                  </div>
                ) : (
                  applications.map((app) => (
                    <div key={app._id} className="p-4 rounded-xl bg-card/10 border border-border/40 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{app.outletName}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{app.city}, {app.state}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${app.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : app.status === 'rejected'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                          }`}>
                          {app.status}
                        </span>
                      </div>

                      {/* Display Device ID codes for approved application */}
                      {app.status === 'approved' && (
                        <div className="bg-background/40 border border-border/40 rounded-xl p-3 space-y-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Provisioned Activation Codes</span>
                          <div className="space-y-1.5 mt-1">
                            {devices.filter(d => d.hostApplicationId === app._id).length === 0 ? (
                              <p className="text-[10px] text-muted-foreground font-semibold">Generating credentials...</p>
                            ) : (
                              devices.filter(d => d.hostApplicationId === app._id).map((device) => (
                                <div key={device._id} className="flex justify-between items-center text-[11px] font-mono bg-card/5 px-2 py-1 rounded border border-border/20">
                                  <span className="text-foreground font-bold">{device.deviceId}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${device.status === 'online' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                                    {device.status}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs border-t border-border pt-4">
                        <span className="text-muted-foreground flex items-center font-semibold capitalize">
                          <Tablet className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                          {app.deviceType}
                        </span>
                        <span className="font-bold text-foreground">Qty: {app.quantity}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
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
                    onClick={addMenuItem}
                    className="bg-card hover:bg-muted border border-border/40 text-foreground font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                  <button
                    onClick={handleSaveMenu}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer glow-hover"
                  >
                    Save Menu
                  </button>
                </div>
              )}
            </div>

            {approvedOutlets.length > 0 ? (
              <>
                {/* Outlet Selector Dropdown */}
                <div className="mb-6 p-4 bg-card/10 border border-border/40 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Select Venue / Outlet</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Customize menu list specific to this venue display target.</p>
                  </div>
                  <select
                    value={selectedOutletId}
                    onChange={(e) => setSelectedOutletId(e.target.value)}
                    className="bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-64"
                  >
                    {approvedOutlets.map((app) => (
                      <option key={app._id} value={app._id}>
                        {app.outletName} ({app.city}) - {app.deviceType}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-12">
                  {MENU_CATEGORIES.map((category) => {
                    const items = menuItems.filter(item => (item.category || '').toLowerCase() === category.toLowerCase());
                    return (
                      <div key={category} className="space-y-4">
                        <div className="flex items-center space-x-2 border-b border-border/20 pb-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${getCategoryDotColor(category)}`} />
                          <h3 className="font-outfit text-sm font-bold text-foreground tracking-wider">{category.toUpperCase()}</h3>
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
                                {/* Overlay Edit/Delete Controls */}
                                <div className="absolute top-6 right-6 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(item, originalIndex);
                                    }}
                                    className="p-1.5 bg-card/95 hover:bg-muted border border-border/40 rounded-lg text-foreground transition-all cursor-pointer shadow-sm"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeMenuItem(originalIndex);
                                    }}
                                    className="p-1.5 bg-destructive/95 hover:bg-destructive border border-destructive/20 rounded-lg text-white transition-all cursor-pointer shadow-sm"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div
                                  onClick={() => openEditModal(item, originalIndex)}
                                  className="cursor-pointer flex-1 flex flex-col"
                                >
                                  <div className="relative w-full h-40 overflow-hidden rounded-xl bg-muted/10 mb-4 shrink-0 border border-border/20">
                                    {item.imageUrl ? (
                                      <img
                                        src={item.imageUrl}
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
          <div className="animate-fade-in">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Live Kiosk Orders</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8 flex items-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mr-2 shrink-0" />
              Connected to active tabletop devices. Orders update in real-time.
            </p>

            {orders.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">Waiting for live orders...</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">When customers place orders at dining tables, they will pop up here instantly.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders.map((ord) => (
                  <div key={ord.orderId} className="p-4 rounded-xl bg-card/10 border border-border/40 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start border-b border-border/40 pb-3 mb-3">
                        <div>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Table {ord.tableNumber}</span>
                          <h4 className="font-bold text-foreground text-xs">{ord.orderId}</h4>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${ord.paymentStatus === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-destructive/10 text-destructive border border-destructive/20'
                          }`}>
                          {ord.paymentStatus === 'completed' ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>

                      <ul className="space-y-2 text-xs">
                        {ord.items.map((it, i) => (
                          <li key={i} className="flex justify-between">
                            <span className="text-muted-foreground font-semibold">{it.name} <span className="text-muted-foreground/60 font-normal">x{it.quantity}</span></span>
                            <span className="text-foreground font-semibold">₹{(it.price * it.quantity) / 100}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t border-border/40 pt-3 flex justify-between items-center text-xs">
                      <span className="text-muted-foreground font-semibold">Total Amount</span>
                      <span className="font-extrabold text-primary text-sm">₹{ord.totalAmount / 100}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Food Catalog Item Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in exclude-uppercase">
          <div className="w-full max-w-2xl bg-card border border-border/40 p-6 rounded-2xl shadow-2xl relative text-foreground">
            {/* Close button */}
            <button
              onClick={() => setIsMenuModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-outfit text-md font-bold uppercase tracking-wider mb-6 text-foreground">
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
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
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
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <textarea
                    placeholder="Brief description about the dish..."
                    value={modalForm.description}
                    onChange={(e) => setModalForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full h-24 bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <select
                    value={modalForm.category}
                    onChange={(e) => setModalForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer"
                  >
                    {MENU_CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-card text-foreground">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
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
              </div>

              {/* Right Column - Image Upload and Preview */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="relative w-full h-44 overflow-hidden rounded-xl border border-border/40 bg-muted/30 dark:bg-black/40 flex items-center justify-center shrink-0">
                  {modalForm.imageUrl ? (
                    <div className="w-full h-full overflow-hidden">
                      <img
                        src={modalForm.imageUrl}
                        alt="Preview"
                        style={{ transform: `scale(${zoomFactor / 100})` }}
                        className="w-full h-full object-cover transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground text-xs p-4 font-semibold uppercase">
                      <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <span className="text-foreground/70">No Cover Photo</span>
                    </div>
                  )}

                  {/* Pencil and Delete overlay */}
                  <div className="absolute top-3 right-3 flex space-x-2 bg-black/40 backdrop-blur-sm p-1 rounded-lg">
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
                        onClick={() => setModalForm(prev => ({ ...prev, imageUrl: '' }))}
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
                      className={`pb-2 border-b-2 transition-all uppercase ${imageTab === 'upload' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageTab('url')}
                      className={`pb-2 border-b-2 transition-all uppercase ${imageTab === 'url' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      Direct URL Link
                    </button>
                  </div>
                </div>

                {/* Upload Inputs */}
                <div className="min-h-[48px] flex items-center">
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
                        className="w-full bg-background hover:bg-muted border border-input rounded-xl py-2.5 text-xs font-semibold text-foreground transition-all cursor-pointer text-center uppercase"
                      >
                        Choose Cover Image
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Direct Image URL"
                      value={modalForm.imageUrl}
                      onChange={(e) => setModalForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                      className="w-full bg-background dark:bg-black/20 border border-input rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
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

                <div className="text-center text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Catalog cover photo
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
    </div>
  );
}
