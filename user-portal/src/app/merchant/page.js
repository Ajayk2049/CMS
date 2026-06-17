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
  Moon
} from 'lucide-react';
import { config } from '@/config';

const API_BASE = config.apiUrl;

export default function MerchantDashboard() {
  const router = useRouter();
  
  const [theme, setTheme] = useState('dark');
  const [token, setToken] = useState('');
  const [phone, setPhone] = useState('');
  const [activeTab, setActiveTab] = useState('applications');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  
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

    if (!storedToken || role !== 'merchant') {
      localStorage.clear();
      router.push('/login');
      return;
    }

    const savedTab = localStorage.getItem('merchantActiveTab');
    if (savedTab) {
      setActiveTab(savedTab);
    }

    setToken(storedToken);
    setPhone(storedPhone);

    fetchApplications(storedToken);
    fetchMenu(storedToken);
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
  const fetchApplications = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/host/applications`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setApplications(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch menu
  const fetchMenu = async (authToken) => {
    try {
      const res = await axios.get(`${API_BASE}/host/menu`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setMenuItems(res.data.data.items || []);
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleZipCodeChange = (val) => {
    const cleaned = val.replace(/\D/g, '');
    if (cleaned.length > 6) return;
    setForm(prev => ({ ...prev, zipCode: cleaned }));
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

    try {
      await axios.post(`${API_BASE}/host/menu`, { items: menuItems }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInfo('Menu saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu.');
    }
  };

  const addMenuItem = () => {
    const newItem = {
      itemId: `item_${Date.now()}`,
      name: '',
      description: '',
      price: 10000,
      category: 'Main Course',
      isAvailable: true
    };
    setMenuItems([...menuItems, newItem]);
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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-all duration-300">
      
      {/* Top Header Navbar - Universal styled shadcn preset */}
      <header className="border-b border-border bg-card px-6 md:px-12 py-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="font-outfit text-md font-bold text-foreground">Merchant Portal</span>
        </div>

        <nav className="flex space-x-1.5 md:space-x-2">
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Host Applications</span>
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu Manager</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
              activeTab === 'orders'
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

        {/* 1. Host Applications Tab */}
        {activeTab === 'applications' && (
          <div className="animate-fade-in">
            <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Host Applications</h1>
            <p className="text-muted-foreground text-xs font-semibold mb-8">Submit forms to host new tablet or screen devices at your restaurant.</p>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Submission Form */}
              <div className="lg:col-span-2 glassmorphism p-8 rounded-[32px] bg-card/20 border-border">
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
                        placeholder="Contact Person"
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
                        placeholder="City"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="State"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="ZIP Code"
                        value={form.zipCode}
                        onChange={(e) => handleZipCodeChange(e.target.value)}
                        className="w-full bg-background border border-input rounded-xl px-4 py-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
                      />
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
                  <div className="text-center p-8 border border-border bg-card/10 rounded-[24px] text-xs text-muted-foreground font-semibold">
                    No applications submitted yet.
                  </div>
                ) : (
                  applications.map((app) => (
                    <div key={app._id} className="glassmorphism p-5 rounded-[24px] bg-card/20 border-border space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-foreground text-sm">{app.outletName}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{app.city}, {app.state}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                          app.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : app.status === 'rejected'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            : 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20'
                        }`}>
                          {app.status}
                        </span>
                      </div>

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
                <h1 className="font-outfit text-2xl font-black text-foreground mb-2">Menu Manager</h1>
                <p className="text-muted-foreground text-xs font-semibold">Design the digital ordering catalog displayed on the tabletop tablets.</p>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={addMenuItem}
                  className="bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
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
            </div>

            {menuItems.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border bg-card/10 rounded-[32px]">
                <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">Your menu is empty</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">Click &ldquo;Add Item&rdquo; above to start adding dishes to your menu.</p>
              </div>
            ) : (
              <div className="glassmorphism p-6 rounded-[32px] overflow-x-auto bg-card/20 border-border">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                      <th className="pb-4 pr-4">Item Name</th>
                      <th className="pb-4 pr-4">Description</th>
                      <th className="pb-4 pr-4">Price (INR)</th>
                      <th className="pb-4 pr-4">Category</th>
                      <th className="pb-4 pr-4">Available</th>
                      <th className="pb-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {menuItems.map((item, index) => (
                      <tr key={item.itemId} className="hover:bg-muted/10">
                        <td className="py-4 pr-4">
                          <input
                            type="text"
                            value={item.name}
                            required
                            placeholder="Item Name"
                            onChange={(e) => updateMenuItemField(index, 'name', e.target.value)}
                            className="bg-background border border-input rounded-xl px-3 py-2 text-foreground w-40 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-semibold"
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <input
                            type="text"
                            value={item.description}
                            placeholder="Description"
                            onChange={(e) => updateMenuItemField(index, 'description', e.target.value)}
                            className="bg-background border border-input rounded-xl px-3 py-2 text-foreground w-60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-semibold"
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <input
                            type="text"
                            value={item.price ? (item.price / 100).toString() : ''}
                            required
                            placeholder="Price"
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/\D/g, '');
                              updateMenuItemField(index, 'price', parseInt(cleaned, 10) * 100 || 0);
                            }}
                            className="bg-background border border-input rounded-xl px-3 py-2 text-foreground w-24 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent font-semibold"
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <select
                            value={item.category}
                            onChange={(e) => updateMenuItemField(index, 'category', e.target.value)}
                            className="bg-background border border-input rounded-xl px-3 py-2 text-foreground w-32 focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent cursor-pointer font-semibold"
                          >
                            <option value="Starters">Starters</option>
                            <option value="Main Course">Main Course</option>
                            <option value="Dessert">Dessert</option>
                            <option value="Beverages">Beverages</option>
                          </select>
                        </td>
                        <td className="py-4 pr-4">
                          <input
                            type="checkbox"
                            checked={item.isAvailable}
                            onChange={(e) => updateMenuItemField(index, 'isAvailable', e.target.checked)}
                            className="w-4 h-4 rounded accent-primary cursor-pointer"
                          />
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => removeMenuItem(index)}
                            className="p-2 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 rounded-lg text-destructive transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
              <div className="text-center py-20 border border-dashed border-border bg-card/10 rounded-[32px]">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">Waiting for live orders...</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">When customers place orders at dining tables, they will pop up here instantly.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders.map((ord) => (
                  <div key={ord.orderId} className="glassmorphism p-6 rounded-[24px] bg-card/20 border-border flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start border-b border-border pb-3 mb-3">
                        <div>
                          <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Table {ord.tableNumber}</span>
                          <h4 className="font-bold text-foreground text-xs">{ord.orderId}</h4>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          ord.paymentStatus === 'completed'
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

                    <div className="border-t border-border pt-3 flex justify-between items-center text-xs">
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
    </div>
  );
}
