'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  Upload,
  LayoutDashboard,
  Printer,
  FileText,
  Receipt,
  Image,
  ShoppingBag,
  Download,
  Calendar,
  Search,
  Loader2
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
  const [globalCgstInput, setGlobalCgstInput] = useState('2.5');
  const [globalSgstInput, setGlobalSgstInput] = useState('2.5');
  const [globalOtherChargesInput, setGlobalOtherChargesInput] = useState('0');
  const [globalOtherChargesType, setGlobalOtherChargesType] = useState('percentage');
  const [globalTaxesLoading, setGlobalTaxesLoading] = useState(false);
  const [globalTaxesError, setGlobalTaxesError] = useState('');
  const [menuDefaultGst, setMenuDefaultGst] = useState(0);
  const [menuDefaultOtherCharges, setMenuDefaultOtherCharges] = useState(0);
  const [menuDefaultOtherChargesType, setMenuDefaultOtherChargesType] = useState('percentage');

  // Bill Config & Thermal Print States
  const [showConfigureBillModal, setShowConfigureBillModal] = useState(false);
  const [billConfigLoading, setBillConfigLoading] = useState(false);
  const [billConfigSaving, setBillConfigSaving] = useState(false);
  const [billConfigError, setBillConfigError] = useState('');
  const [billUploadingImage, setBillUploadingImage] = useState(false);
  const [billForm, setBillForm] = useState({
    logoUrl: '',
    restaurantName: '',
    addressLine1: '',
    addressLine2: '',
    cityZip: '',
    gstin: '',
    fssaiNo: '',
    phone: '',
    billPrefix: 'INV',
    showKOTNumbers: true,
    showCovers: true,
    showCustomerDetail: true,
    cgstPercent: 2.5,
    sgstPercent: 2.5,
    enableAutoRoundOff: true,
    thankYouMessage: 'Thank You & Visit Again !',
    crmContactName: '',
    crmContactPhone: '',
    deliveryPhone: '',
    showPoweredBy: true,
    billWidthFormat: '80mm',
    qrImageUrl: '',
    qrCaption: ''
  });

  // Export Payment History Modal States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreset, setExportPreset] = useState('today'); // 'today', '7d', '15d', '30d', 'custom'

  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Set default export dates when preset changes
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (exportPreset === 'today') {
      setExportStartDate(todayStr);
      setExportEndDate(todayStr);
    } else if (exportPreset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    } else if (exportPreset === '15d') {
      const d = new Date();
      d.setDate(d.getDate() - 15);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    } else if (exportPreset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setExportStartDate(d.toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    }
  }, [exportPreset]);

  // Excel Generator Function
  const handleExportPaymentExcel = async () => {
    if (!exportStartDate || !exportEndDate) {
      showToast('Please select a valid date range for export', 'error');
      return;
    }

    setIsExportingExcel(true);
    try {
      const currentVenueApp = applications.find(app => app._id === activeOrderVenueTab) || applications.find(app => app.status === 'approved');
      const venueName = currentVenueApp?.outletName || 'Venue';

      const startMs = new Date(`${exportStartDate}T00:00:00.000`).getTime();
      const endMs = new Date(`${exportEndDate}T23:59:59.999`).getTime();

      // Combine all orders (completed transactions + live orders)
      const allVenueOrders = [...paymentOrders, ...orders];

      // Filter matching orders for this venue within the selected date range
      const matchingOrders = allVenueOrders.filter(ord => {
        if (ord.hostApplicationId && currentVenueApp && ord.hostApplicationId !== currentVenueApp._id) return false;
        const ordTime = new Date(ord.createdAt || ord.updatedAt || 0).getTime();
        return ordTime >= startMs && ordTime <= endMs;
      });

      if (matchingOrders.length === 0) {
        showToast('No transaction orders found for the selected date range', 'error');
        setIsExportingExcel(false);
        return;
      }


      // Create Excel Workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'DigiAds Platform';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Payment History');

      // Title Banner Row (Merged A1:K1)
      worksheet.mergeCells('A1:K1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `${venueName.toUpperCase()} — PAYMENT & TRANSACTION HISTORY`;
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0069A8' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(1).height = 30;

      // Subtitle Date Range Row (Merged A2:K2)
      worksheet.mergeCells('A2:K2');
      const subtitleCell = worksheet.getCell('A2');
      const formattedStart = new Date(exportStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const formattedEnd = new Date(exportEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      subtitleCell.value = `Report Period: ${formattedStart} to ${formattedEnd}  |  Generated On: ${new Date().toLocaleString('en-IN')}`;
      subtitleCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '475569' } };
      subtitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getRow(2).height = 20;

      // Blank Spacer Row 3
      worksheet.getRow(3).height = 10;

      // Table Headers Row 4
      const headers = [
        'Sl. No.',
        'Date & Time',
        'Order ID',
        'Type / Location',
        'Items Summary',
        'Payment Mode',
        'Subtotal (₹)',
        'CGST (₹)',
        'SGST (₹)',
        'Round Off (₹)',
        'Grand Total (₹)'
      ];

      const headerRow = worksheet.getRow(4);
      headerRow.values = headers;
      headerRow.height = 24;

      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'medium', color: { argb: '0F172A' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
      });

      // Obtain venue tax config (default 2.5% CGST + 2.5% SGST)
      const billCfg = currentVenueApp?.billConfig || activeBillConfig || billForm || {};
      const cgstPct = typeof billCfg.cgstPercent === 'number' ? billCfg.cgstPercent : 2.5;
      const sgstPct = typeof billCfg.sgstPercent === 'number' ? billCfg.sgstPercent : 2.5;
      const totalTaxPct = cgstPct + sgstPct;
      const enableAutoRoundOff = billCfg.enableAutoRoundOff !== false;

      // Data Rows
      let totalSubtotalSum = 0;
      let totalCgstSum = 0;
      let totalSgstSum = 0;
      let totalRoundOffSum = 0;
      let totalGrandTotalSum = 0;

      matchingOrders.forEach((ord, index) => {
        const rowNum = index + 5;
        const ordDate = new Date(ord.createdAt || ord.updatedAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const itemsText = (ord.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ');

        // Use frozen order snapshot values if available; otherwise calculate dynamically
        let subtotal = 0;
        let cgst = 0;
        let sgst = 0;
        let roundOff = 0;
        let grandTotal = (ord.totalAmount || 0) / 100;

        if (typeof ord.subtotalAmount === 'number' && ord.subtotalAmount > 0) {
          subtotal = ord.subtotalAmount / 100;
          cgst = (ord.cgstAmount || 0) / 100;
          sgst = (ord.sgstAmount || 0) / 100;
          roundOff = (ord.roundOffAmount || 0) / 100;
        } else {
          // Legacy orders fallback: calculate items subtotal & venue tax rates
          if (ord.items && ord.items.length > 0) {
            subtotal = ord.items.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 1)), 0) / 100;
          } else {
            subtotal = grandTotal / (1 + (totalTaxPct / 100));
          }

          const effectiveCgstPct = typeof ord.cgstPercent === 'number' ? ord.cgstPercent : cgstPct;
          const effectiveSgstPct = typeof ord.sgstPercent === 'number' ? ord.sgstPercent : sgstPct;

          cgst = subtotal * (effectiveCgstPct / 100);
          sgst = subtotal * (effectiveSgstPct / 100);
          const rawTotal = subtotal + cgst + sgst;

          if (grandTotal > 0) {
            roundOff = Math.max(0, grandTotal - rawTotal);
          } else {
            grandTotal = enableAutoRoundOff ? Math.ceil(rawTotal) : rawTotal;
            roundOff = grandTotal - rawTotal;
          }
        }

        totalSubtotalSum += subtotal;
        totalCgstSum += cgst;
        totalSgstSum += sgst;
        totalRoundOffSum += roundOff;
        totalGrandTotalSum += grandTotal;

        const row = worksheet.getRow(rowNum);
        row.values = [
          index + 1,
          ordDate,
          ord.orderId,
          ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? '🛍️ TAKEOUT' : `Table ${ord.tableNumber}`,
          itemsText,
          ord.paymentType || 'UPI',
          subtotal,
          cgst,
          sgst,
          roundOff,
          grandTotal
        ];
        row.height = 20;


        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 9 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E2E8F0' } },
            left: { style: 'thin', color: { argb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
            right: { style: 'thin', color: { argb: 'E2E8F0' } }
          };

          // Alignment & Number formatting
          if (colNumber === 1 || colNumber === 3 || colNumber === 6) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else if (colNumber >= 7) {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            cell.numFmt = '₹#,##0.00';
          } else {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          }
        });
      });

      // Total Summary Row
      const summaryRowNum = matchingOrders.length + 5;
      const summaryRow = worksheet.getRow(summaryRowNum);
      summaryRow.values = [
        '',
        'TOTAL SUMMARY',
        `${matchingOrders.length} Orders`,
        '',
        '',
        '',
        totalSubtotalSum,
        totalCgstSum,
        totalSgstSum,
        totalRoundOffSum,
        totalGrandTotalSum
      ];
      summaryRow.height = 25;

      summaryRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
        cell.border = {
          top: { style: 'medium', color: { argb: '0F172A' } },
          bottom: { style: 'double', color: { argb: '0F172A' } }
        };
        if (colNumber >= 7) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '₹#,##0.00';
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });

      // Auto Column Widths
      worksheet.columns = [
        { width: 8 },  // Sl No
        { width: 22 }, // Date & Time
        { width: 16 }, // Order ID
        { width: 18 }, // Type
        { width: 35 }, // Items
        { width: 14 }, // Payment Mode
        { width: 14 }, // Subtotal
        { width: 12 }, // CGST
        { width: 12 }, // SGST
        { width: 14 }, // Round Off
        { width: 16 }  // Grand Total
      ];


      // Export Blob & Save File
      const buffer = await workbook.xlsx.writeBuffer();
      const cleanVenueStr = venueName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanVenueStr}_Payment_History_${exportStartDate}_to_${exportEndDate}.xlsx`;

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);

      showToast(`Exported ${matchingOrders.length} payment records to Excel!`, 'success');
      setShowExportModal(false);
    } catch (err) {
      console.error('Excel Export Error:', err);
      showToast('Failed to export payment history to Excel', 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };


  const [showPrintBillModal, setShowPrintBillModal] = useState(false);
  const [printingOrder, setPrintingOrder] = useState(null);
  const [activeBillConfig, setActiveBillConfig] = useState(null);
  const [selectedPrintWidth, setSelectedPrintWidth] = useState('80mm');

  // Takeout / Pickup Order Modal states
  const [showTakeoutModal, setShowTakeoutModal] = useState(false);
  const [takeoutActiveCategory, setTakeoutActiveCategory] = useState('Starters');
  const [takeoutCart, setTakeoutCart] = useState([]);
  const [isSubmittingTakeout, setIsSubmittingTakeout] = useState(false);
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
  const [deviceFilterStatus, setDeviceFilterStatus] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('deviceFilterStatus') || 'all';
    }
    return 'all';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deviceFilterStatus', deviceFilterStatus);
    }
  }, [deviceFilterStatus]);

  // Analytics Dashboard states
  const [analyticsDays, setAnalyticsDays] = useState(0);
  const [analyticsSlotFilter, setAnalyticsSlotFilter] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchVenueAnalytics = async (authToken, days = 0) => {
    if (!authToken) return;
    setAnalyticsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/host/analytics?days=${days}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.data.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.error('fetchVenueAnalytics Error:', err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

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

  // Helper to format local YYYY-MM-DD date string without UTC timezone offset shift
  const getLocalDateString = (d = new Date()) => {
    const dateObj = new Date(d);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Payment tab states
  const [paymentConfig, setPaymentConfig] = useState({ hasUpiId: false, upiId: '' });
  const [paymentUpiInput, setPaymentUpiInput] = useState('');
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [paymentSearchInput, setPaymentSearchInput] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearchingPayments, setIsSearchingPayments] = useState(false);
  const searchAbortControllerRef = useRef(null);
  const [paymentCustomDate, setPaymentCustomDate] = useState(() => getLocalDateString());
  const [paymentTab, setPaymentTab] = useState('config'); // 'config' or 'history'

  // Debounce search input changes by 350ms to prevent rapid DB request spamming
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(paymentSearchInput);
    }, 350);
    return () => clearTimeout(timer);
  }, [paymentSearchInput]);

  // Re-fetch payment orders from backend when calendar date picker or debounced search query changes
  useEffect(() => {
    if (!token) return;

    // Cancel any in-flight pending search request to prevent race conditions
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    const queryParams = {};
    if (selectedOutletId) queryParams.hostApplicationId = selectedOutletId;

    if (debouncedSearchQuery.trim()) {
      // When searching, search across all historical database records
      queryParams.search = debouncedSearchQuery.trim();
    } else if (paymentCustomDate) {
      queryParams.startDate = paymentCustomDate;
      queryParams.endDate = paymentCustomDate;
    }

    setIsSearchingPayments(true);
    fetchLiveOrders(token, queryParams, controller.signal).finally(() => {
      setIsSearchingPayments(false);
    });
  }, [token, selectedOutletId, paymentCustomDate, debouncedSearchQuery]);

  // Derived sorted & filtered payment orders (newest first)
  const sortedAndFilteredPaymentOrders = useMemo(() => {
    // Sort orders newest first by createdAt / updatedAt
    const sorted = [...paymentOrders].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });

    const isSearching = !!debouncedSearchQuery.trim();

    return sorted.filter(ord => {
      const ordDate = new Date(ord.createdAt || ord.updatedAt || Date.now());

      // Only restrict by calendar date when user is NOT actively typing a search query
      if (!isSearching && paymentCustomDate) {
        const targetDateStr = getLocalDateString(ordDate);
        if (targetDateStr !== paymentCustomDate) return false;
      }

      // Search Query Filter
      if (isSearching) {
        const q = debouncedSearchQuery.trim().toLowerCase();
        const orderIdMatch = (ord.orderId || '').toLowerCase().includes(q);
        const tableMatch = (ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? 'takeout' : `table ${ord.tableNumber}`).toLowerCase().includes(q);
        const paymentTypeMatch = (ord.paymentType || 'UPI').toLowerCase().includes(q);
        const amountMatch = (ord.totalAmount ? (ord.totalAmount / 100).toFixed(2) : '').includes(q) ||
          (ord.totalAmount ? (ord.totalAmount / 100).toString() : '').includes(q) ||
          (ord.totalAmount ? ord.totalAmount.toString() : '').includes(q);
        const itemsMatch = (ord.items || []).some(item => (item.name || '').toLowerCase().includes(q));
        const formattedDateStr = ordDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).toLowerCase();
        const dateMatch = formattedDateStr.includes(q);

        if (!orderIdMatch && !tableMatch && !paymentTypeMatch && !amountMatch && !itemsMatch && !dateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [paymentOrders, paymentCustomDate, debouncedSearchQuery]);
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
      fetchBillConfig(selectedOutletId);
    }
  }, [selectedOutletId]);

  const fetchBillConfig = async (appId) => {
    const currentToken = token || localStorage.getItem('token');
    if (!currentToken || !appId) return;
    setBillConfigLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/host/bill-config/${appId}`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.data && res.data.data) {
        const configData = res.data.data;
        const currentApp = applications.find(a => a._id === appId);
        const mergedConfig = {
          logoUrl: configData.logoUrl || '',
          restaurantName: configData.restaurantName || (currentApp ? currentApp.outletName : ''),
          addressLine1: configData.addressLine1 || (currentApp ? `${currentApp.doorNo}, ${currentApp.street}` : ''),
          addressLine2: configData.addressLine2 || (currentApp ? `${currentApp.city}, ${currentApp.state}` : ''),
          cityZip: configData.cityZip || (currentApp ? currentApp.zipCode : ''),
          gstin: configData.gstin || '',
          fssaiNo: configData.fssaiNo || '',
          phone: configData.phone || (currentApp ? currentApp.phone : ''),
          billPrefix: configData.billPrefix || 'INV',
          showKOTNumbers: configData.showKOTNumbers !== undefined ? configData.showKOTNumbers : true,
          showCovers: configData.showCovers !== undefined ? configData.showCovers : true,
          showCustomerDetail: configData.showCustomerDetail !== undefined ? configData.showCustomerDetail : true,
          cgstPercent: configData.cgstPercent !== undefined ? configData.cgstPercent : 2.5,
          sgstPercent: configData.sgstPercent !== undefined ? configData.sgstPercent : 2.5,
          enableAutoRoundOff: configData.enableAutoRoundOff !== undefined ? configData.enableAutoRoundOff : true,
          thankYouMessage: configData.thankYouMessage || 'Thank You & Visit Again !',
          crmContactName: configData.crmContactName || '',
          crmContactPhone: configData.crmContactPhone || '',
          deliveryPhone: configData.deliveryPhone || '',
          showPoweredBy: configData.showPoweredBy !== undefined ? configData.showPoweredBy : true,
          customWatermark: configData.customWatermark !== undefined ? configData.customWatermark : 'POWERED BY - DIGIADS',
          billWidthFormat: configData.billWidthFormat || '80mm',
          qrImageUrl: configData.qrImageUrl || '',
          qrCaption: configData.qrCaption !== undefined ? configData.qrCaption : ''
        };
        setBillForm(mergedConfig);
        setActiveBillConfig(mergedConfig);
      }
    } catch (err) {
      console.error('fetchBillConfig error:', err.message);
    } finally {
      setBillConfigLoading(false);
    }
  };

  const handleSaveBillConfig = async () => {
    const currentToken = token || localStorage.getItem('token');
    if (!selectedOutletId || !currentToken) return;
    setBillConfigSaving(true);
    const parseTaxRate = (val) => {
      if (val === '' || val === null || val === undefined) return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) || parsed < 0 ? 0 : parsed;
    };

    const payload = {
      ...billForm,
      cgstPercent: parseTaxRate(billForm.cgstPercent),
      sgstPercent: parseTaxRate(billForm.sgstPercent)
    };

    try {
      const res = await axios.put(`${API_BASE}/host/bill-config/${selectedOutletId}`, payload, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.data && res.data.success) {
        showToast('Bill configuration saved successfully!', 'success');
        setActiveBillConfig(res.data.data);
        setShowConfigureBillModal(false);
      }
    } catch (err) {
      console.error('handleSaveBillConfig error:', err.message);
      setBillConfigError(err.response?.data?.message || 'Failed to save bill configuration');
    } finally {
      setBillConfigSaving(false);
    }
  };

  const handleUploadBillImageFile = async (file, fieldName) => {
    const currentToken = token || localStorage.getItem('token');
    if (!file || !currentToken) return;
    setBillUploadingImage(true);
    setBillConfigError('');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await axios.post(`${API_BASE}/host/bill-config/upload-image`, arrayBuffer, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': file.type || 'image/png',
          'X-Filename': file.name || 'image.png',
          'X-Host-Application-Id': selectedOutletId
        }
      });
      if (res.data && res.data.url) {
        setBillForm(prev => ({
          ...prev,
          [fieldName]: res.data.url
        }));
        showToast('Image uploaded successfully!');
      }
    } catch (err) {
      console.error('handleUploadBillImageFile error:', err);
      setBillConfigError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setBillUploadingImage(false);
    }
  };

  const openPrintBillModal = async (order) => {
    setPrintingOrder(order);
    const targetAppId = order.hostApplicationId || selectedOutletId || (approvedOutlets[0] ? approvedOutlets[0]._id : null);
    if (targetAppId) {
      await fetchBillConfig(targetAppId);
    }
    const defaultFormat = activeBillConfig?.billWidthFormat || billForm?.billWidthFormat || '80mm';
    setSelectedPrintWidth(defaultFormat);
    setShowPrintBillModal(true);
  };

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
    if (activeTab === 'payment' && token && selectedOutletId) {
      fetchPaymentConfig(token, selectedOutletId);
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

  // Fetch payment and live order history in a single HTTP call
  const fetchLiveOrders = async (authToken, queryParams = {}, signal = null) => {
    const activeToken = authToken || token;
    if (!activeToken) return;
    try {
      const params = {};
      if (queryParams.startDate) params.startDate = queryParams.startDate;
      if (queryParams.endDate) params.endDate = queryParams.endDate;
      if (queryParams.search) params.search = queryParams.search;
      if (queryParams.hostApplicationId) params.hostApplicationId = queryParams.hostApplicationId;
      params.limit = 1000;

      const res = await axios.get(`${API_BASE}/host/orders`, {
        params,
        signal,
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const allOrders = res.data.data || [];
      const completed = allOrders.filter(
        ord => ord.paymentStatus === 'completed'
      );
      const live = allOrders.filter(
        ord => ord.tableStatus !== 'completed' && ord.tableStatus !== 'completed_acked' && ord.orderStatus !== 'cancelled'
      );
      setPaymentOrders(completed);
      setOrders(live);
    } catch (err) {
      if (axios.isCancel(err) || err.name === 'CanceledError' || err.name === 'AbortError') {
        return; // Request aborted by newer debounced search query
      }
      console.error('fetchLiveOrders Error:', err);
    }
  };

  const fetchPaymentOrders = fetchLiveOrders;

  // Real-time WebSocket Order Stream
  useEffect(() => {
    if (!token) return;

    // Initial fetch
    fetchLiveOrders(token);

    let ws = null;
    let reconnectTimer = null;

    const connectWebSocket = () => {
      try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = API_BASE.replace(/^https?:\/\//, '').replace(/\/api\/v1\/?$/, '');
        const wsUrl = `${wsProtocol}//${wsHost}/ws/orders?token=${token}`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[WS] Connected to Merchant Live Orders Feed');
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'new_order' || data.event === 'order_update' || data.event === 'table_session') {
              console.log('[WS] Live order update received:', data.event);
              fetchLiveOrders(token);
            }
          } catch (e) {
            console.error('[WS] Message parse error:', e);
          }
        };

        ws.onclose = () => {
          console.log('[WS] Socket closed. Attempting reconnect in 3s...');
          reconnectTimer = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.error('[WS] Connection error:', err);
          if (ws) ws.close();
        };
      } catch (err) {
        console.error('[WS] Failed to initialize WebSocket:', err);
        reconnectTimer = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [token]);

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
    } catch (err) {
      console.error('updateOrderStatus Error:', err);
    }
  };

  const confirmOrder = async (orderId) => {
    try {
      await axios.post(`${API_BASE}/host/orders/confirm`, { orderId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
    } catch (err) { console.error(err); }
  };

  const closeTable = async (orderId) => {
    try {
      await axios.post(`${API_BASE}/host/orders/close-table`, { orderId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
    } catch (err) { console.error(err); }
  };

  const markPaymentReceived = async (orderId, paymentType = 'CASH') => {
    try {
      await axios.post(`${API_BASE}/host/orders/payment-received`, { orderId, paymentType }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
    } catch (err) { console.error('markPaymentReceived error:', err); }
  };

  const handleCreateTakeoutOrder = async () => {
    const targetAppId = activeOrderVenueTab || selectedOutletId || (approvedOutlets[0] ? approvedOutlets[0]._id : null);
    if (!targetAppId || takeoutCart.length === 0) return;
    setIsSubmittingTakeout(true);
    try {
      const itemsPayload = takeoutCart.map(cItem => ({
        itemId: cItem.item.itemId || cItem.item._id,
        name: cItem.item.name,
        quantity: cItem.quantity,
        price: Number(cItem.item.price || 0)
      }));

      await axios.post(`${API_BASE}/host/orders/takeout`, {
        hostApplicationId: targetAppId,
        items: itemsPayload
      }, { headers: { Authorization: `Bearer ${token}` } });

      setShowTakeoutModal(false);
      setTakeoutCart([]);
      fetchLiveOrders(token);
    } catch (err) {
      console.error('handleCreateTakeoutOrder error:', err);
    } finally {
      setIsSubmittingTakeout(false);
    }
  };

  const serviceWaiter = async (orderId) => {
    try {
      await axios.post(`${API_BASE}/host/orders/service-waiter`, { orderId }, { headers: { Authorization: `Bearer ${token}` } });
      fetchLiveOrders(token);
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
        } else if (payload.event === 'device_status_changed') {
          fetchDevices(authToken);
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

    // Client-side Video Duration Check (30s limit for Open Ads Mode, 60s for Closed Mode)
    if (isVid) {
      const selectedApp = applications.find(app => app._id === selectedOutletId);
      const isClosedMode = selectedApp?.adMode === 'closed' || selectedApp?.allowOpenAds === false;
      const maxAllowedSecs = isClosedMode ? 60 : 30;

      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        const duration = videoElement.duration || 0;
        if (duration > maxAllowedSecs + 0.5) {
          showToast(`Video duration (${Math.round(duration)}s) exceeds the ${maxAllowedSecs}-second limit for ${isClosedMode ? 'Closed' : 'Open'} Ads Mode venues.`, 'error');
          return;
        }

        const localPreviewUrl = URL.createObjectURL(file);
        const key = `${slotType}_${slotIndex}`;

        setPromoDraftSlots(prev => {
          const newTitle = (prev[key]?.title && !prev[key]?.isDeleted) ? prev[key].title : file.name.replace(/\.[^/.]+$/, '');
          return {
            ...prev,
            [key]: {
              title: newTitle,
              mediaUrl: prev[key]?.mediaUrl || '',
              mediaType: 'video',
              previewUrl: localPreviewUrl,
              fileObj: file,
              isModified: true,
              isDeleted: false
            }
          };
        });
      };
      videoElement.onerror = () => {
        showToast('Failed to parse video duration metadata.', 'error');
      };
      videoElement.src = URL.createObjectURL(file);
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    const key = `${slotType}_${slotIndex}`;

    setPromoDraftSlots(prev => {
      const newTitle = (prev[key]?.title && !prev[key]?.isDeleted) ? prev[key].title : file.name.replace(/\.[^/.]+$/, '');
      return {
        ...prev,
        [key]: {
          title: newTitle,
          mediaUrl: prev[key]?.mediaUrl || '',
          mediaType: isVid ? 'video' : 'image',
          previewUrl: localPreviewUrl,
          fileObj: file,
          isModified: true,
          isDeleted: false
        }
      };
    });
  };

  const handleClearPromoSlot = (slotType, slotIndex) => {
    const key = `${slotType}_${slotIndex}`;
    const currentSlot = promoDraftSlots[key];
    const mediaName = currentSlot?.title || `${slotType.replace('_', ' ').toUpperCase()} Slot ${slotIndex + 1}`;

    if (window.confirm(`Are you sure you want to delete this venue promo ("${mediaName}")? This is a destructive action and will remove the promo from all kiosk displays.`)) {
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
      showToast('Promo slot marked for deletion. Click "Save & Stream Promos" to finalize.', 'info');
    }
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
        let tempPath = null;
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
            tempPath = uploadRes.data.data.tempPath || null;
          } else {
            throw new Error(uploadRes.data.message || 'File upload failed');
          }
        }

        const resolvedTitle = (item.title && item.title.trim())
          ? item.title.trim()
          : (item.fileObj ? item.fileObj.name.replace(/\.[^/.]+$/, '') : `${slotType.replace('_', ' ').toUpperCase()} Slot ${slotIndex + 1}`);

        slotsPayload.push({
          slotType,
          slotIndex,
          title: resolvedTitle,
          mediaUrl: finalMediaUrl,
          mediaType: item.mediaType,
          tempPath,
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
            'X-Host-Application-Id': selectedOutletId,
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
                onClick={() => {
                  setActiveTab('dashboard');
                  fetchVenueAnalytics(token, analyticsDays);
                }}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'dashboard'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <LayoutDashboard className={`w-4 h-4  ${activeTab === 'dashboard' ? 'text-primary-foreground' : 'text-primary'}`} />
                <span className="hidden sm:inline">Dashboard</span>
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
                    <span className="hidden sm:inline">Payment History</span>
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
                        setActiveTab('devices');
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 text-left hover:bg-muted rounded-lg transition-colors cursor-pointer text-foreground font-bold"
                    >
                      <MonitorSmartphone className="w-4 h-4 text-emerald-500" />
                      <span>Devices</span>
                    </button>

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

                    {roles.includes('advertiser') && (
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

        {/* 0. Venue Analytics Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
              <div>
                <h1 className="font-outfit text-2xl font-black text-foreground flex items-center space-x-2">
                  <LayoutDashboard className="w-6 h-6 text-primary" />
                  <span>Venue Analytics Dashboard</span>
                </h1>
                <p className="text-muted-foreground text-xs font-semibold mt-1">
                  Food sales performance & order activity for <span className="text-foreground font-bold">{analyticsData?.venueName || 'Your Venue'}</span>
                </p>
              </div>

              <div className="flex items-center space-x-3 flex-wrap gap-2">
                {/* Date Filter Selector */}

                <div className="flex items-center space-x-2 bg-card border border-border/40 p-1.5 rounded-2xl shadow-sm overflow-x-auto">
                  {[
                    { label: 'Today', value: 0 },
                    { label: 'Last 7 Days', value: 7 },
                    { label: 'Last 15 Days', value: 15 },
                    { label: 'Last 30 Days', value: 30 }
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setAnalyticsDays(item.value);
                        fetchVenueAnalytics(token, item.value);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${analyticsDays === item.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Key Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-2 relative overflow-hidden">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Food Revenue</span>
                <p className="text-2xl font-black text-foreground font-outfit">
                  ₹{(((analyticsData?.summary?.totalRevenuePaise || 0) / 100)).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  {analyticsDays === 0 ? "Today's gross sales" : `Last ${analyticsDays} days gross sales`}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-2 relative overflow-hidden">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Orders</span>
                <p className="text-2xl font-black text-primary font-outfit">
                  {analyticsData?.summary?.totalCompletedOrders || 0}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Completed tablet/QR orders
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-2 relative overflow-hidden">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Order Value</span>
                <p className="text-2xl font-black text-foreground font-outfit">
                  ₹{(((analyticsData?.summary?.avgOrderValuePaise || 0) / 100)).toLocaleString('en-IN')}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Per customer transaction
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-2 relative overflow-hidden">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Peak Revenue Slot</span>
                <p className="text-2xl font-black text-primary font-outfit">
                  {analyticsData?.summary?.peakSlotName || '--'}
                </p>
                <span className="text-[10px] text-muted-foreground font-medium block">
                  Highest earning time period
                </span>
              </div>
            </div>

            {/* Time Slot Switcher & Item Analytics */}
            <div className="p-6 rounded-2xl bg-card border border-border/40 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div>
                  <h3 className="font-outfit text-base font-bold text-foreground">Time-of-Day Food Sales</h3>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Select a time slot to view best-selling dishes during that period
                  </p>
                </div>

                {/* 4 Clean Slot Buttons */}
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {[
                    { id: 'all', label: 'ALL (Overall)' },
                    { id: 'breakfast', label: 'Breakfast' },
                    { id: 'lunch', label: 'Lunch' },
                    { id: 'dinner', label: 'Dinner' }
                  ].map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setAnalyticsSlotFilter(slot.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${analyticsSlotFilter === slot.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Slot Item Performance Grid */}
              {(() => {
                const currentSlotData = analyticsData?.slots?.[analyticsSlotFilter];
                const topSeller = currentSlotData?.topSeller;
                const rankedItems = currentSlotData?.rankedItems || [];

                if (!currentSlotData || rankedItems.length === 0) {
                  return (
                    <div className="p-8 rounded-xl border border-dashed border-border/40 text-center space-y-2">
                      <p className="text-sm font-bold text-muted-foreground">No dish orders recorded for this time slot yet.</p>
                      <p className="text-xs text-muted-foreground">Orders placed during this slot will automatically rank here.</p>
                    </div>
                  );
                }

                return (
                  <div className="grid md:grid-cols-12 gap-6 items-start">
                    {/* #1 Best Seller Spotlight Card */}
                    <div className="md:col-span-5 p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-4 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                          Top Seller
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          {analyticsSlotFilter.toUpperCase()} SLOT
                        </span>
                      </div>

                      <div className="flex items-center space-x-4">
                        {topSeller.imageUrl ? (
                          <img
                            src={resolveMediaUrl(topSeller.imageUrl)}
                            alt={topSeller.name}
                            className="w-16 h-16 rounded-xl object-cover border border-border/40 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xl shrink-0">
                            🍽️
                          </div>
                        )}
                        <div>
                          <h4 className="font-outfit text-lg font-bold text-foreground">{topSeller.name}</h4>
                          <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                            {topSeller.qty} units sold
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border/20 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-semibold">Total Sales</span>
                        <span className="font-mono font-bold text-foreground text-sm">
                          ₹{((topSeller.revenuePaise || 0) / 100).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Top 3 Ranked Dish List (with Uniform Progress Meter Bars) */}
                    <div className="md:col-span-7 space-y-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Top 3 Performing Dishes (Ranked)
                      </h4>

                      <div className="space-y-3">
                        {rankedItems.map((item, idx) => (
                          <div key={item.itemId} className="space-y-1.5 p-3 rounded-xl border border-border/40 bg-muted/10">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2 font-bold text-foreground">
                                <span className="text-primary font-mono text-xs">#{idx + 1}</span>
                                <span>{item.name}</span>
                              </div>
                              <div className="flex items-center space-x-3 text-xs">
                                <span className="font-semibold text-muted-foreground">{item.qty} sold</span>
                                <span className="font-mono font-bold text-foreground">
                                  ₹{((item.revenuePaise || 0) / 100).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Uniform Progress Fill Meter */}
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${item.percentageShare}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Table Utilization Frequency Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Most Active Table */}
              <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Most Active Table
                  </span>
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">High Turnover</span>
                </div>

                {analyticsData?.tables?.mostActiveTable ? (
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h4 className="font-outfit text-xl font-bold text-foreground">
                        {analyticsData.tables.mostActiveTable.tableNumber}
                      </h4>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                        {analyticsData.tables.mostActiveTable.orderCount} total orders completed
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Total Revenue</span>
                      <span className="font-mono text-lg font-bold text-foreground">
                        ₹{((analyticsData.tables.mostActiveTable.totalAmount || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-muted-foreground pt-1">No table activity recorded yet.</p>
                )}
              </div>

              {/* Least Active Table */}
              <div className="p-5 rounded-2xl bg-card border border-border/40 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Least Active Table
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">Low Utilization</span>
                </div>

                {analyticsData?.tables?.leastActiveTable ? (
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h4 className="font-outfit text-xl font-bold text-foreground">
                        {analyticsData.tables.leastActiveTable.tableNumber}
                      </h4>
                      <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                        {analyticsData.tables.leastActiveTable.orderCount} total orders completed
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Total Revenue</span>
                      <span className="font-mono text-lg font-bold text-foreground">
                        ₹{((analyticsData.tables.leastActiveTable.totalAmount || 0) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-muted-foreground pt-1">No low-activity tables flagged.</p>
                )}
              </div>
            </div>
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

                {/* Status Filter Tabs (All, Online, Offline) */}
                <div className="flex bg-muted p-1 rounded-xl border border-border/40 text-[10px] font-bold space-x-0.5">
                  <button
                    onClick={() => setDeviceFilterStatus('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${deviceFilterStatus === 'all'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    All ({devices.filter(d => d.deviceType === deviceFilterType && (!deviceFilterVenue || d.hostApplicationId === deviceFilterVenue)).length})
                  </button>
                  <button
                    onClick={() => setDeviceFilterStatus('online')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center ${deviceFilterStatus === 'online'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm font-black'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                    Online ({devices.filter(d => d.deviceType === deviceFilterType && (!deviceFilterVenue || d.hostApplicationId === deviceFilterVenue) && d.status === 'online').length})
                  </button>
                  <button
                    onClick={() => setDeviceFilterStatus('offline')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center ${deviceFilterStatus === 'offline'
                      ? 'bg-background text-foreground shadow-sm font-black'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" />
                    Offline ({devices.filter(d => d.deviceType === deviceFilterType && (!deviceFilterVenue || d.hostApplicationId === deviceFilterVenue) && d.status !== 'online').length})
                  </button>
                </div>

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
                const matchesStatus = deviceFilterStatus === 'all' || 
                  (deviceFilterStatus === 'online' ? device.status === 'online' : device.status !== 'online');
                return matchesType && matchesVenue && matchesStatus;
              });

              return filteredDevices.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl">
                  <Tablet className="w-12 h-12 text-[#0069a8] fill-[#0069a8] mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-bold text-foreground">No Provisioned Devices Found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">
                    No {deviceFilterStatus !== 'all' ? `${deviceFilterStatus} ` : ''}{deviceFilterType === 'tablet' ? 'tablets' : 'screens'} match the selected venue criteria.
                  </p>
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

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setTakeoutCart([]);
                        setTakeoutActiveCategory(menuCategories[0] || 'Starters');
                        setShowTakeoutModal(true);
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md tracking-wider uppercase transition-all"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>+ Pickup Order</span>
                    </button>

                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl shrink-0">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>LIVE</span>
                    </div>
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
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto font-medium">When customers place orders at dining tables or counter pickups, they will pop up here instantly.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-border/40 text-muted-foreground font-bold uppercase tracking-wider">
                            <th className="pb-3 pr-2">Table / Type</th>
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
                                <div className="flex flex-col space-y-1">
                                  <div className="flex items-center space-x-2">
                                    {ord.orderStatus === 'placed' && (
                                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                      </span>
                                    )}
                                    <span className={`font-black px-3.5 py-1.5 rounded-xl text-sm whitespace-nowrap shadow-sm ${ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT'
                                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                      : 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20'
                                      }`}>
                                      {ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? '🛍️ TAKEOUT' : `Table ${ord.tableNumber}`}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 pr-2 font-mono font-bold text-foreground text-xs">
                                {ord.orderId}
                              </td>
                              <td className="py-4 pr-2">
                                <div className="space-y-1 font-semibold text-foreground">
                                  <div className="max-h-28 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                                    {ord.items.map((item, idx) => (
                                      <div key={idx} className="text-xs flex items-center justify-between space-x-2">
                                        <span className="truncate max-w-[150px]" title={item.name}>{item.name}</span>
                                        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">x {item.quantity}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="w-12 border-t-2 border-border/50 my-1.5"></div>
                                  <div className="text-xs font-bold text-foreground">
                                    Total: ₹{(ord.totalAmount / 100).toFixed(2)}
                                  </div>
                                </div>
                              </td>

                              <td className="py-4 pr-2">
                                <select
                                  value={ord.orderStatus}
                                  disabled={ord.orderStatus === 'served'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateOrderStatus(ord.orderId, e.target.value);
                                  }}
                                  className={`text-xs font-black uppercase px-3.5 py-2.5 rounded-xl border focus:outline-none w-fit shadow-sm tracking-wide ${ord.orderStatus === 'placed'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 cursor-pointer'
                                    : ord.orderStatus === 'cooking'
                                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 cursor-pointer'
                                      : ord.orderStatus === 'served'
                                        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 cursor-not-allowed opacity-90'
                                        : ord.orderStatus === 'cancelled'
                                          ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                                          : 'bg-muted-foreground/15 text-muted-foreground border-border/30'
                                    }`}
                                >
                                  {ord.orderStatus === 'placed' && (
                                    <option value="placed" className="bg-card text-foreground">Placed</option>
                                  )}
                                  {(ord.orderStatus === 'placed' || ord.orderStatus === 'cooking') && (
                                    <option value="cooking" className="bg-card text-foreground">Accepted & Preparing</option>
                                  )}
                                  <option value="served" className="bg-card text-foreground">Delivered / Served</option>
                                  {ord.orderStatus === 'placed' && (
                                    <option value="cancelled" className="bg-card text-foreground text-red-500 font-bold">Cancelled / Rejected</option>
                                  )}
                                </select>
                              </td>
                              <td className="py-4 pr-2">
                                {ord.waiterCallStatus === 'pending' ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      serviceWaiter(ord.orderId);
                                    }}
                                    className="bg-red-600 text-white text-xs font-black uppercase px-4 py-2 rounded-xl animate-pulse cursor-pointer shrink-0 border border-red-700 shadow-md select-none"
                                    style={{ animationDuration: '0.8s' }}
                                  >
                                    Call Waiter ({ord.waiterCallOption || 'Others'}) x{ord.waiterCallCount || 1}
                                  </button>
                                ) : ord.waiterCallStatus === 'serviced' ? (
                                  <div className="bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30 text-xs font-black uppercase px-3.5 py-2 rounded-xl w-fit shrink-0 select-none">
                                    Serviced x{ord.waiterCallCount || 1}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground font-semibold">-</span>
                                )}
                              </td>
                              <td className="py-4 pr-2">
                                <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                                  {confirmingPaymentOrderId === ord.orderId ? (
                                    <div className="flex items-center space-x-2 animate-fade-in whitespace-nowrap bg-muted/40 p-1.5 rounded-xl border border-border/40 shadow-sm" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-xs font-black text-foreground uppercase px-1">Via:</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markPaymentReceived(ord.orderId, 'CASH');
                                          setConfirmingPaymentOrderId(null);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider flex items-center space-x-1 shadow-sm"
                                      >
                                        <span>💵 Cash</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markPaymentReceived(ord.orderId, 'UPI');
                                          setConfirmingPaymentOrderId(null);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer uppercase tracking-wider flex items-center space-x-1 shadow-sm"
                                      >
                                        <span>📱 UPI</span>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmingPaymentOrderId(null);
                                        }}
                                        className="bg-muted hover:bg-muted/80 text-foreground font-bold px-2 py-1.5 rounded-xl text-xs transition-colors cursor-pointer border border-border/40 uppercase"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' || ord.tableStatus === 'close_table') ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmingPaymentOrderId(ord.orderId);
                                      }}
                                      className="bg-red-500/15 hover:bg-red-500/25 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-black uppercase px-4 py-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all shadow-sm w-fit shrink-0 tracking-wide"
                                    >
                                      <span className="w-2 h-2 rounded-full bg-red-500 mr-2 shrink-0 animate-ping" />
                                      Mark As Received
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        closeTable(ord.orderId);
                                      }}
                                      className={`text-xs font-black uppercase px-4 py-2.5 rounded-xl border transition-all shadow-sm shrink-0 w-fit cursor-pointer tracking-wide ${ord.orderStatus === 'served'
                                        ? 'bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/20'
                                        : 'bg-muted text-muted-foreground border-border/40 opacity-50 cursor-not-allowed'
                                        }`}
                                    >
                                      Clear Table
                                    </button>
                                  )}
                                </div>
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
                className={`px-5 py-2.5 rounded-xl font-outfit text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${activePromoSubTab === 'tablet'
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
                className={`px-5 py-2.5 rounded-xl font-outfit text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 ${activePromoSubTab === 'screen'
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

                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-center space-x-3">
                    <Video className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Video Duration Limit</span>
                      <p className="text-[10px] text-muted-foreground font-semibold leading-tight mt-0.5">
                        {(() => {
                          const currentApp = applications.find(app => app._id === selectedOutletId);
                          const isClosed = currentApp?.adMode === 'closed' || currentApp?.allowOpenAds === false;
                          return isClosed ? 'Max 60 Seconds per video (Closed Mode)' : 'Max 30 Seconds per video (Open Ads Mode)';
                        })()}
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
            <div className="flex justify-between items-center mb-6 border-b border-border/40 pb-4 flex-wrap gap-4">
              <h1 className="font-outfit text-2xl font-black text-foreground uppercase tracking-wider">
                PAYMENT HISTORY
              </h1>

              <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                {/* Standalone Calendar Date Picker defaulting to Today (Entire Container Clickable) */}
                <div
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input[type="date"]');
                    if (input && typeof input.showPicker === 'function') {
                      try { input.showPicker(); } catch (err) {}
                    } else if (input) {
                      input.focus();
                    }
                  }}
                  className="flex items-center space-x-2 bg-card hover:bg-muted/50 border border-border/40 rounded-xl px-3.5 py-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Calendar className="w-4 h-4 text-primary shrink-0 pointer-events-none" />
                  <input
                    type="date"
                    value={paymentCustomDate}
                    onChange={(e) => setPaymentCustomDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer py-1"
                  />
                </div>

                <button
                  onClick={() => {
                    setExportPreset('today');
                    setShowExportModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Payments</span>
                </button>

                <button
                  onClick={() => {
                    if (selectedOutletId) {
                      fetchBillConfig(selectedOutletId);
                    }
                    setShowConfigureBillModal(true);
                  }}
                  className="bg-[#0069a8] hover:bg-[#0069a8] border border-border/40 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1.5"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Configure Bill</span>
                </button>

                <button
                  onClick={() => {
                    setConfirmPasswordInput('');
                    setPasswordVerifyError('');
                    setShowPasswordModal(true);
                  }}
                  className="bg-[#0069a8] hover:bg-[#005b94] text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>Configure UPI</span>
                </button>

                {/* Search Bar - Positioned to the right of Configure UPI button */}
                <div className="relative min-w-[240px] max-w-sm">
                  {isSearchingPayments ? (
                    <Loader2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-primary animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  )}
                  <input
                    type="text"
                    placeholder="Search amount, table, dish, UPI, date, ID..."
                    value={paymentSearchInput}
                    onChange={(e) => setPaymentSearchInput(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-background border border-input rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all shadow-sm"
                  />
                  {paymentSearchInput && (
                    <button
                      onClick={() => {
                        setPaymentSearchInput('');
                        setDebouncedSearchQuery('');
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Always show history/orders table full-width */}
            {sortedAndFilteredPaymentOrders.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border/40 bg-card/5 rounded-2xl w-full">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm font-bold text-foreground">No completed payment orders found</p>
                <p className="text-xs text-muted-foreground mt-1">Adjust search parameters or date filters to locate specific transaction records.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider bg-muted/20">
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Table</th>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Items</th>
                      <th className="py-3 px-4">Payment Status</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAndFilteredPaymentOrders.map((ord, idx) => {
                      const ordDateObj = new Date(ord.createdAt || ord.updatedAt || Date.now());
                      const formattedDateTime = ordDateObj.toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      });

                      return (
                        <tr key={ord.orderId || idx} className="border-b border-border/60 hover:bg-muted/15 transition-colors">
                          <td className="py-4 px-4 text-center font-bold text-muted-foreground text-xs">
                            {idx + 1}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`font-black px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap shadow-sm inline-block ${ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20'
                              }`}>
                              {ord.orderType === 'TAKEOUT' || ord.tableNumber === 'TAKEOUT' ? '🛍️ TAKEOUT' : `Table ${ord.tableNumber}`}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-foreground text-xs">
                            {ord.orderId}
                          </td>
                          <td className="py-4 px-4">
                            <div className="space-y-1 font-semibold text-foreground">
                              {ord.items && ord.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="text-xs">
                                  {item.name} &nbsp;&nbsp; <span className="text-muted-foreground">x &nbsp;{item.quantity}</span>
                                </div>
                              ))}
                              <div className="w-16 border-t-2 border-border/50 my-1.5"></div>
                              <div className="text-xs font-bold text-foreground">
                                Total: ₹{(ord.totalAmount / 100).toFixed(2)}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="w-fit text-xs font-black uppercase px-3.5 py-2 rounded-xl flex items-center border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm">
                              <span className="w-2 h-2 rounded-full mr-2 shrink-0 bg-emerald-500" />
                              Paid {ord.paymentType ? `(${ord.paymentType})` : ''}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-semibold text-muted-foreground text-xs whitespace-nowrap">
                            {formattedDateTime}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => openPrintBillModal(ord)}
                              className="bg-card hover:bg-muted text-foreground border border-border/40 text-xs font-black uppercase px-4 py-2.5 rounded-xl inline-flex items-center space-x-2 cursor-pointer transition-all shadow-md whitespace-nowrap tracking-wide"
                              title="Print Thermal Bill"
                            >
                              <Printer className="w-4 h-4 text-primary" />
                              <span>Print Bill</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* Unified Thermal Receipt Rendering Helper */}
      {(() => {
        // Shared thermal receipt template for 100% parity across Configure Bill & Print Bill modals
        globalThis.__renderUnifiedThermalReceipt = (liveConfig, order, isPrintMode = false, overrideWidthFormat = null) => {
          // If order has a frozen billConfigSnapshot, use it to ensure historic venue info/address/GSTIN/header metadata never change
          const config = (order && order.billConfigSnapshot) ? order.billConfigSnapshot : liveConfig;

          const items = order?.items || [
            { name: 'Empire Special Porota', quantity: 2, price: 4900 },
            { name: 'Green Salad', quantity: 1, price: 7500 },
            { name: 'Chilly Chicken (Half)', quantity: 1, price: 26000 }
          ];

          const widthFormat = overrideWidthFormat || config?.billWidthFormat || '80mm';
          const is58mm = widthFormat === '58mm';


          let subtotal = 0;
          let cgstAmt = 0;
          let sgstAmt = 0;
          let roundOffDiff = 0;
          let roundedTotal = 0;
          let cgstRate = 0;
          let sgstRate = 0;

          if (order && typeof order.subtotalAmount === 'number' && order.subtotalAmount > 0) {
            // Priority 1: Frozen order billing snapshot fields from actual transaction time
            subtotal = order.subtotalAmount / 100;
            cgstAmt = (order.cgstAmount || 0) / 100;
            sgstAmt = (order.sgstAmount || 0) / 100;
            roundOffDiff = (order.roundOffAmount || 0) / 100;
            roundedTotal = (order.totalAmount || 0) / 100;

            if (subtotal > 0) {
              cgstRate = typeof order.cgstPercent === 'number' ? order.cgstPercent : Number(((cgstAmt / subtotal) * 100).toFixed(2));
              sgstRate = typeof order.sgstPercent === 'number' ? order.sgstPercent : Number(((sgstAmt / subtotal) * 100).toFixed(2));
            }
          } else if (order && order.totalAmount) {
            // Priority 2: Historic DB order created prior to subtotalAmount snapshot field
            const subtotalPaise = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            subtotal = subtotalPaise > 0 ? (subtotalPaise / 100) : (order.totalAmount / 100);
            roundedTotal = order.totalAmount / 100;

            const frozenCgstPct = order.billConfigSnapshot?.cgstPercent ?? order.cgstPercent;
            const frozenSgstPct = order.billConfigSnapshot?.sgstPercent ?? order.sgstPercent;

            if (typeof frozenCgstPct === 'number' || typeof frozenSgstPct === 'number') {
              cgstRate = frozenCgstPct || 0;
              sgstRate = frozenSgstPct || 0;
              cgstAmt = subtotal * (cgstRate / 100);
              sgstAmt = subtotal * (sgstRate / 100);
              const rawTotal = subtotal + cgstAmt + sgstAmt;
              // Round-off CANNOT exceed 0.99
              const calcDiff = roundedTotal - rawTotal;
              roundOffDiff = (calcDiff >= 0 && calcDiff < 1.00) ? Math.round(calcDiff * 100) / 100 : 0;
            } else {
              // Deduce tax vs round-off strictly from DB order values
              const diff = Math.round((roundedTotal - subtotal) * 100) / 100;
              if (diff <= 0) {
                cgstRate = 0;
                sgstRate = 0;
                cgstAmt = 0;
                sgstAmt = 0;
                roundOffDiff = 0;
              } else {
                // Read venue config rates or fallback to 2.5% CGST + 2.5% SGST
                cgstRate = typeof config?.cgstPercent === 'number' ? config.cgstPercent : 2.5;
                sgstRate = typeof config?.sgstPercent === 'number' ? config.sgstPercent : 2.5;
                cgstAmt = subtotal * (cgstRate / 100);
                sgstAmt = subtotal * (sgstRate / 100);
                const rawTotal = subtotal + cgstAmt + sgstAmt;
                const calcDiff = roundedTotal - rawTotal;
                // Round-off CANNOT exceed 0.99
                roundOffDiff = (calcDiff >= 0 && calcDiff < 1.00) ? Math.round(calcDiff * 100) / 100 : 0;
              }
            }
          }

          else {
            // Priority 3: Live billConfig fallback (ONLY for Configure Bill modal sample preview)
            const subtotalPaise = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            subtotal = subtotalPaise / 100;
            cgstRate = Math.max(0, typeof config?.cgstPercent === 'number' ? config.cgstPercent : (parseFloat(config?.cgstPercent) || 0));
            sgstRate = Math.max(0, typeof config?.sgstPercent === 'number' ? config.sgstPercent : (parseFloat(config?.sgstPercent) || 0));
            cgstAmt = Math.max(0, subtotal * (cgstRate / 100));
            sgstAmt = Math.max(0, subtotal * (sgstRate / 100));
            const totalGstAmt = Math.max(0, cgstAmt + sgstAmt);
            const rawTotal = subtotal + totalGstAmt;

            roundedTotal = config?.enableAutoRoundOff !== false ? Math.ceil(rawTotal) : rawTotal;
            roundOffDiff = roundedTotal - rawTotal;
          }




          const totalGstAmt = Math.max(0, cgstAmt + sgstAmt);
          const absRoundOff = Math.abs(roundOffDiff);
          const roundOffStr = absRoundOff < 0.001 ? "0.00" : (roundOffDiff > 0 ? `+${roundOffDiff.toFixed(2)}` : roundOffDiff.toFixed(2));
          const paymentTypeStr = order?.paymentType || order?.paymentMethod || (order?.paymentStatus === 'completed' ? 'ONLINE / UPI' : 'CASH / PENDING');
          const orderTypeStr = (order?.orderType === 'TAKEOUT' || order?.tableNumber === 'TAKEOUT') ? 'TAKEOUT' : 'DINE';
          const orderIdStr = order?.orderId ? order.orderId : `${config?.billPrefix || 'INV'}-873`;
          const tableNumStr = order?.tableNumber !== undefined ? order.tableNumber : '17';
          const dateStr = order?.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : '2026-08-01';


          return (
            <div
              id={isPrintMode ? "thermal-print-area" : undefined}
              className={`bg-white text-black font-mono shadow-xl border border-gray-300 mx-auto leading-tight select-none ${is58mm ? 'text-[8px] p-1.5 w-full max-w-[195px] rounded-lg' : 'text-[9.5px] p-2 w-full max-w-[270px] rounded-xl'
                }`}
            >
              {/* Logo Section */}
              {config?.logoUrl && (
                <div className="flex justify-center mb-0">
                  <img
                    src={resolveMediaUrl(config.logoUrl)}
                    alt="Logo"
                    className={is58mm ? "max-h-12 w-auto max-w-[150px] object-contain mx-auto" : "max-h-16 w-auto max-w-[220px] object-contain mx-auto"}
                  />
                </div>
              )}

              {/* Ultra-Compact Venue Header */}
              <div className="text-center leading-tight space-y-0 pt-0.5">
                <h3 className={`font-semibold uppercase tracking-tight ${is58mm ? 'text-base' : 'text-xl'}`}>{config?.restaurantName}</h3>
                {config?.addressLine1 && <p className={is58mm ? "text-[7.5px] text-gray-800" : "text-[9px] text-gray-800"}>{config.addressLine1}</p>}
                {(config?.addressLine2 || config?.cityZip) && (
                  <p className={is58mm ? "text-[7.5px] text-gray-800" : "text-[9px] text-gray-800"}>
                    {[config.addressLine2, config.cityZip].filter(Boolean).join(', ')}
                  </p>
                )}
                {config?.gstin && <p className={is58mm ? "text-[7.5px] font-bold text-gray-900" : "text-[9px] font-bold text-gray-900"}>GSTIN: {config.gstin}</p>}
                {(config?.fssaiNo || config?.phone) && (
                  <p className={is58mm ? "text-[7px] text-gray-800" : "text-[8.5px] text-gray-800"}>
                    {[config.fssaiNo ? `FSSAI: ${config.fssaiNo}` : null, config.phone ? `Ph: ${config.phone}` : null].filter(Boolean).join(' | ')}
                  </p>
                )}
              </div>

              <div className="border-b border-dashed border-gray-400 my-1" />

              {/* Order Metadata */}
              <div className={`space-y-0.5 ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>ORDER #: {orderIdStr}</span>
                  <span>TYPE: {orderTypeStr}</span>
                </div>
                {orderTypeStr !== 'TAKEOUT' && (
                  <div>TABLE NUMBER: {tableNumStr}</div>
                )}
                <div className={`flex justify-between text-gray-700 ${is58mm ? 'text-[7px]' : 'text-[8.5px]'}`}>
                  <span>BILL NO: {config?.billPrefix || 'INV'}-{order?.orderId ? order.orderId.slice(-5) : '13658'}</span>
                  <span>DATE: {dateStr}</span>
                </div>
                {config?.showKOTNumbers && <div>KOTS: 101, 102</div>}
                {config?.showCovers && <div>COVERS: 1</div>}
                <div className="font-bold text-gray-900">PAYMENT TYPE: {paymentTypeStr}</div>
              </div>

              {config?.showCustomerDetail && (
                <>
                  <div className="border-b border-dashed border-gray-400 my-1" />
                  <div className={`space-y-0.5 ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>
                    <div className="font-bold text-gray-800">CUSTOMER DETAIL</div>
                    <div>NAME: {order?.customer?.name || 'Bhaira'}</div>
                    <div>MOBILE: {order?.customer?.mobile || '6369087866'}</div>
                  </div>
                </>
              )}

              <div className="border-b border-dashed border-gray-400 my-1" />

              {/* Item Table Header */}
              <div className={`flex justify-between font-bold border-b border-gray-300 pb-0.5 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
                <span className={is58mm ? "w-4 shrink-0" : "w-5 shrink-0"}>NO.</span>
                <span className="flex-1 px-1">ITEM</span>
                <span className={is58mm ? "w-5 text-center shrink-0" : "w-7 text-center shrink-0"}>QTY</span>
                <span className={is58mm ? "w-10 text-right shrink-0" : "w-12 text-right shrink-0"}>AMT</span>
              </div>

              {/* Items */}
              <div className={`space-y-0.5 my-1 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start leading-tight">
                    <span className={is58mm ? "w-4 shrink-0 font-semibold" : "w-5 shrink-0 font-semibold"}>{idx + 1}.</span>
                    <span className="flex-1 px-1 font-bold text-gray-900 break-words pr-0.5">{item.name}</span>
                    <span className={is58mm ? "w-5 text-center shrink-0" : "w-7 text-center shrink-0"}>{item.quantity}</span>
                    <span className={is58mm ? "w-10 text-right shrink-0" : "w-12 text-right shrink-0"}>{((item.price * item.quantity) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-b border-dashed border-gray-400 my-1" />

              {/* Item Summary & Totals */}
              <div className={`space-y-0.5 ${is58mm ? 'text-[8px]' : 'text-[9px]'}`}>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>SUB TOTAL:</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-800">
                  <span>GST ({(cgstRate + sgstRate).toFixed(1)}%):</span>
                  <span>{totalGstAmt.toFixed(2)}</span>
                </div>
                {cgstRate > 0 && (
                  <div className={`flex justify-between text-gray-700 pl-2 ${is58mm ? 'text-[7px]' : 'text-[8.5px]'}`}>
                    <span>CGST @ {cgstRate}%:</span>
                    <span>{cgstAmt.toFixed(2)}</span>
                  </div>
                )}
                {sgstRate > 0 && (
                  <div className={`flex justify-between text-gray-700 pl-2 ${is58mm ? 'text-[7px]' : 'text-[8.5px]'}`}>
                    <span>SGST @ {sgstRate}%:</span>
                    <span>{sgstAmt.toFixed(2)}</span>
                  </div>
                )}
                {config?.enableAutoRoundOff !== false && absRoundOff >= 0.001 && (
                  <div className="flex justify-between text-gray-800">
                    <span>ROUND OFF:</span>
                    <span>{roundOffStr}</span>
                  </div>
                )}
                <div className={`flex justify-between font-extrabold pt-1 border-t-2 border-black text-gray-900 mt-1 ${is58mm ? 'text-[9.5px]' : 'text-[11px]'}`}>
                  <span>TOTAL INVOICE VALUE:</span>
                  <span>{roundedTotal.toFixed(2)}</span>
                </div>

              </div>

              <div className={`flex justify-between ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>
                <span>UNIQUE ITEMS: {items.length}</span>
                <span>TOTAL QTY: {items.reduce((sum, i) => sum + i.quantity, 0)}</span>
              </div>

              {/* Ultra-Compact Footer */}
              <div className="pt-2 mt-1 border-t border-dashed border-gray-400 flex items-center justify-between">
                <div className="flex-1 text-left pr-1.5 space-y-0.5">
                  <p className={`font-extrabold text-gray-900 leading-tight uppercase ${is58mm ? 'text-[9px]' : 'text-[10.5px]'}`}>{config?.thankYouMessage || 'THANK YOU & VISIT AGAIN !'}</p>

                  {config?.showPoweredBy !== false && (config?.customWatermark !== undefined ? config.customWatermark : 'POWERED BY - DIGIADS') !== '' && (
                    <p className={`text-gray-500 font-light uppercase ${is58mm ? 'text-[5.5px]' : 'text-[6.5px]'}`}>{config.customWatermark || 'POWERED BY - DIGIADS'}</p>
                  )}

                  {config?.crmContactPhone && (
                    <p className={`text-gray-800 font-semibold uppercase ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>CRM {config.crmContactName || ''}: {config.crmContactPhone}</p>
                  )}
                  {config?.deliveryPhone && <p className={`text-gray-800 font-semibold uppercase ${is58mm ? 'text-[7.5px]' : 'text-[9px]'}`}>HOME DELIVERY: {config.deliveryPhone}</p>}
                </div>

                {config?.qrImageUrl && (
                  <div className="shrink-0 flex flex-col items-center text-center pl-1">
                    <img src={resolveMediaUrl(config.qrImageUrl)} alt="QR Code" className={is58mm ? "w-12 h-12 object-contain p-0.5 border bg-white rounded shadow-sm" : "w-16 h-16 object-contain p-0.5 border bg-white rounded shadow-sm"} />
                    {config.qrCaption ? (
                      <p className={`mt-0.5 font-bold text-gray-700 leading-tight uppercase ${is58mm ? 'text-[7px] max-w-[65px]' : 'text-[8px] max-w-[85px]'}`}>{config.qrCaption}</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          );
        };
        return null;
      })()}

      {/* Configure Bill Modal */}
      {showConfigureBillModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-fade-in exclude-uppercase">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-5xl p-6 relative flex flex-col space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowConfigureBillModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-outfit text-xl font-black text-foreground flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Configure Thermal Bill & Receipts</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-semibold">
                Customize 4-section layout, branding logo, venue contact info, CGST/SGST tax split, and custom QR images.
              </p>
            </div>

            {billConfigError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs text-destructive font-bold text-left animate-fade-in">
                {billConfigError}
              </div>
            )}

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Column: Form Settings */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Header Section */}
                <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-4">
                  <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                    1. Venue Header & Branding
                  </h4>

                  <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">Header Logo Image</label>
                    <div className="flex items-center space-x-3">
                      {billForm.logoUrl ? (
                        <img src={resolveMediaUrl(billForm.logoUrl)} alt="Logo" className="w-12 h-12 object-contain rounded-lg border bg-black/20 p-1" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground bg-muted/20 text-[9px] font-bold">
                          No Logo
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadBillImageFile(e.target.files[0], 'logoUrl');
                          }
                        }}
                        className="text-xs font-semibold text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">Restaurant / Venue Name</label>
                      <input
                        type="text"
                        value={billForm.restaurantName}
                        onChange={(e) => setBillForm({ ...billForm, restaurantName: e.target.value })}
                        placeholder="Empire Restaurant"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">Bill Prefix</label>
                      <input
                        type="text"
                        value={billForm.billPrefix}
                        onChange={(e) => setBillForm({ ...billForm, billPrefix: e.target.value })}
                        placeholder="INV"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">Address Line 1</label>
                    <input
                      type="text"
                      value={billForm.addressLine1}
                      onChange={(e) => setBillForm({ ...billForm, addressLine1: e.target.value })}
                      placeholder="161, MLA Layout, RT Nagar"
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">Address Line 2</label>
                      <input
                        type="text"
                        value={billForm.addressLine2}
                        onChange={(e) => setBillForm({ ...billForm, addressLine2: e.target.value })}
                        placeholder="Bangalore"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">City & ZIP Code</label>
                      <input
                        type="text"
                        value={billForm.cityZip}
                        onChange={(e) => setBillForm({ ...billForm, cityZip: e.target.value })}
                        placeholder="Bangalore - 560032"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">GSTIN Number</label>
                      <input
                        type="text"
                        value={billForm.gstin}
                        onChange={(e) => setBillForm({ ...billForm, gstin: e.target.value })}
                        placeholder="29AADCN9372N1ZM"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">FSSAI Number</label>
                      <input
                        type="text"
                        value={billForm.fssaiNo}
                        onChange={(e) => setBillForm({ ...billForm, fssaiNo: e.target.value })}
                        placeholder="11223344556677"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">Phone Number</label>
                      <input
                        type="text"
                        value={billForm.phone}
                        onChange={(e) => setBillForm({ ...billForm, phone: e.target.value })}
                        placeholder="080-40414141"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Metadata & Toggles Section */}
                <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-3">
                  <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                    2. Table & Customer Details Toggles
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-xs font-semibold">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billForm.showKOTNumbers}
                        onChange={(e) => setBillForm({ ...billForm, showKOTNumbers: e.target.checked })}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      <span>Show KOT Nos</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billForm.showCovers}
                        onChange={(e) => setBillForm({ ...billForm, showCovers: e.target.checked })}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      <span>Show Covers</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={billForm.showCustomerDetail}
                        onChange={(e) => setBillForm({ ...billForm, showCustomerDetail: e.target.checked })}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      <span>Customer Name/Phone</span>
                    </label>
                  </div>
                </div>

                {/* 3. Tax Rates & Calculations */}
                <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-4">
                  <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                    3. Taxes & Calculation Rules
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">CGST (%)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={billForm.cgstPercent !== undefined && billForm.cgstPercent !== null ? billForm.cgstPercent : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setBillForm(prev => ({ ...prev, cgstPercent: '' }));
                            return;
                          }
                          const cleaned = val.replace(/[^0-9.]/g, '');
                          const parts = cleaned.split('.');
                          const validVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
                          setBillForm(prev => ({ ...prev, cgstPercent: validVal }));
                        }}
                        onBlur={() => {
                          if (billForm.cgstPercent === '' || isNaN(parseFloat(billForm.cgstPercent)) || parseFloat(billForm.cgstPercent) < 0) {
                            setBillForm(prev => ({ ...prev, cgstPercent: 0 }));
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">SGST (%)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={billForm.sgstPercent !== undefined && billForm.sgstPercent !== null ? billForm.sgstPercent : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setBillForm(prev => ({ ...prev, sgstPercent: '' }));
                            return;
                          }
                          const cleaned = val.replace(/[^0-9.]/g, '');
                          const parts = cleaned.split('.');
                          const validVal = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
                          setBillForm(prev => ({ ...prev, sgstPercent: validVal }));
                        }}
                        onBlur={() => {
                          if (billForm.sgstPercent === '' || isNaN(parseFloat(billForm.sgstPercent)) || parseFloat(billForm.sgstPercent) < 0) {
                            setBillForm(prev => ({ ...prev, sgstPercent: 0 }));
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="checkbox"
                      checked={billForm.enableAutoRoundOff}
                      onChange={(e) => setBillForm({ ...billForm, enableAutoRoundOff: e.target.checked })}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                    <span>Auto Round Off Paise (e.g. ₹817.05 + taxes → ₹858)</span>
                  </label>

                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase block">Default Thermal Paper Format</label>
                    <div className="flex items-center space-x-2 bg-background p-1 rounded-xl border border-input">
                      <button
                        type="button"
                        onClick={() => setBillForm({ ...billForm, billWidthFormat: '80mm' })}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${billForm.billWidthFormat !== '58mm'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        3-Inch (80mm POS)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillForm({ ...billForm, billWidthFormat: '58mm' })}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${billForm.billWidthFormat === '58mm'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                          }`}
                      >
                        2-Inch (58mm Portable Roll)
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Custom Footer & QR Code Upload */}
                <div className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-4">
                  <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                    4. Custom Footer & QR Code Upload
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">Greeting Line</label>
                    <input
                      type="text"
                      value={billForm.thankYouMessage}
                      onChange={(e) => setBillForm({ ...billForm, thankYouMessage: e.target.value })}
                      placeholder="Thank You & Visit Again !"
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">CRM Contact Name</label>
                      <input
                        type="text"
                        value={billForm.crmContactName}
                        onChange={(e) => setBillForm({ ...billForm, crmContactName: e.target.value })}
                        placeholder="Mr. VAISHAG"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">CRM Phone</label>
                      <input
                        type="text"
                        value={billForm.crmContactPhone}
                        onChange={(e) => setBillForm({ ...billForm, crmContactPhone: e.target.value })}
                        placeholder="9036888877"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase">Delivery Phone</label>
                      <input
                        type="text"
                        value={billForm.deliveryPhone}
                        onChange={(e) => setBillForm({ ...billForm, deliveryPhone: e.target.value })}
                        placeholder="080 6965 6565"
                        className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">Custom QR Code Image (UPI / Feedback)</label>
                    <div className="flex items-center space-x-3">
                      {billForm.qrImageUrl ? (
                        <img src={resolveMediaUrl(billForm.qrImageUrl)} alt="QR" className="w-16 h-16 object-contain rounded-lg border bg-white p-1" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground bg-muted/20 text-[9px] font-bold text-center">
                          No QR Image
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleUploadBillImageFile(e.target.files[0], 'qrImageUrl');
                          }
                        }}
                        className="text-xs font-semibold text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase">QR Caption Text</label>
                    <input
                      type="text"
                      value={billForm.qrCaption}
                      onChange={(e) => setBillForm({ ...billForm, qrCaption: e.target.value })}
                      placeholder="Scan this QR to pay / provide feedback"
                      className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Thermal Receipt Preview with 80mm / 58mm Paper Toggle */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-foreground flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Live Thermal Receipt Preview</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono font-bold">
                    {billForm.billWidthFormat === '58mm' ? '2-Inch (58mm Portable)' : '3-Inch (80mm POS)'}
                  </span>
                </div>

                {/* 80mm vs 58mm Interactive Tab Switcher */}
                <div className="flex items-center space-x-2 bg-muted/40 p-1 rounded-xl border border-border/40">
                  <button
                    type="button"
                    onClick={() => setBillForm({ ...billForm, billWidthFormat: '80mm' })}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${billForm.billWidthFormat !== '58mm'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <span>📄 3-Inch (80mm POS)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillForm({ ...billForm, billWidthFormat: '58mm' })}
                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${billForm.billWidthFormat === '58mm'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    <span>📄 2-Inch (58mm Portable)</span>
                  </button>
                </div>

                <div className="pt-1">
                  {globalThis.__renderUnifiedThermalReceipt ? globalThis.__renderUnifiedThermalReceipt(billForm, null, false, billForm.billWidthFormat) : null}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowConfigureBillModal(false)}
                className="px-5 py-2.5 border border-border/40 hover:bg-muted text-foreground font-bold rounded-xl transition-all text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBillConfig}
                disabled={billConfigSaving || billUploadingImage}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg flex items-center space-x-2"
              >
                <span>{billConfigSaving ? 'Saving Configuration...' : 'Save Bill Configuration'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Thermal Bill Modal & Document Body Portal */}
      {showPrintBillModal && printingOrder && (
        <>
          {/* Modal Preview UI */}
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in exclude-uppercase">
            <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg p-6 relative flex flex-col space-y-4 shadow-2xl max-h-[95vh] overflow-y-auto">
              <button
                onClick={() => setShowPrintBillModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex justify-between items-center pr-8 border-b border-border/40 pb-3">
                <div>
                  <h3 className="font-outfit text-base font-black text-foreground flex items-center space-x-2">
                    <Printer className="w-4 h-4 text-primary" />
                    <span>Print Customer Bill</span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono font-bold mt-0.5">Order ID: {printingOrder.orderId}</p>
                </div>

                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-md tracking-wider uppercase"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
              </div>

              {/* Paper Format Segmented Tab Bar */}
              <div className="flex items-center justify-center space-x-2 bg-muted/40 p-1 rounded-xl border border-border/40 my-1">
                <button
                  type="button"
                  onClick={() => setSelectedPrintWidth('80mm')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${selectedPrintWidth === '80mm'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <span>📄 3-Inch (80mm POS)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPrintWidth('58mm')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${selectedPrintWidth === '58mm'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <span>📄 2-Inch (58mm Portable)</span>
                </button>
              </div>

              {/* On-screen Preview */}
              <div className="py-2 flex justify-center">
                {globalThis.__renderUnifiedThermalReceipt
                  ? globalThis.__renderUnifiedThermalReceipt(printingOrder?.billConfigSnapshot || activeBillConfig || billForm, printingOrder, false, selectedPrintWidth)
                  : null
                }
              </div>
            </div>
          </div>

          {/* Dedicated Body Portal for Window.print() -> Eliminates 6 blank pages from parent SPA */}
          {typeof document !== 'undefined' && createPortal(
            <div id="thermal-print-portal">
              <style>{`
                @media print {
                  @page {
                    size: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} auto;
                    margin: 0mm !important;
                  }
                  html, body {
                    width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                    max-width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    overflow: visible !important;
                  }
                  /* Completely collapse main Next.js app layout and all dashboard DOM nodes to 0 height */
                  body > *:not(#thermal-print-portal) {
                    display: none !important;
                  }
                  #thermal-print-portal {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                    max-width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                  }
                  #thermal-print-area {
                    width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                    max-width: ${selectedPrintWidth === '58mm' ? '58mm' : '80mm'} !important;
                    margin: 0 !important;
                    padding: ${selectedPrintWidth === '58mm' ? '1.5mm 1mm' : '2mm 1mm'} !important;
                    box-sizing: border-box !important;
                    font-family: 'Courier New', Courier, monospace !important;
                    font-size: ${selectedPrintWidth === '58mm' ? '8px' : '10px'} !important;
                    line-height: 1.15 !important;
                    color: #000000 !important;
                    background: #ffffff !important;
                    box-shadow: none !important;
                    border: none !important;
                    border-radius: 0 !important;
                    page-break-after: avoid !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                }
              `}</style>
              {globalThis.__renderUnifiedThermalReceipt
                ? globalThis.__renderUnifiedThermalReceipt(printingOrder?.billConfigSnapshot || activeBillConfig || billForm, printingOrder, true, selectedPrintWidth)
                : null
              }

            </div>,
            document.body
          )}
        </>
      )}
      {/* Export Payment History Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[180] p-4 animate-fade-in exclude-uppercase">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-lg p-6 relative flex flex-col space-y-6 shadow-2xl">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-border/40 pb-3">
              <h3 className="font-outfit text-xl font-black text-foreground flex items-center space-x-2">
                <Download className="w-5 h-5 text-emerald-500" />
                <span>Export Payment History (.xlsx)</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                Generate styled Excel reports with custom date range filtering for venue transactions.
              </p>
            </div>

            {/* Range Presets (Today, 7D, 15D, 30D, Custom) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground block">Select Date Range Shortcut:</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'today', label: 'Today' },
                  { id: '7d', label: '7 Days' },
                  { id: '15d', label: '15 Days' },
                  { id: '30d', label: '30 Days' },
                  { id: 'custom', label: 'Custom' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExportPreset(item.id)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${exportPreset === item.id
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Pickers */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">From Date:</label>
                <div className="relative">
                  <input
                    type="date"
                    value={exportStartDate}
                    disabled={exportPreset !== 'custom'}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">To Date:</label>
                <div className="relative">
                  <input
                    type="date"
                    value={exportEndDate}
                    disabled={exportPreset !== 'custom'}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Matching Records Count Preview */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Matching Transactions:</span>
              <span className="font-mono font-bold text-emerald-500">
                {(() => {
                  if (!exportStartDate || !exportEndDate) return '0 Orders';
                  const sMs = new Date(`${exportStartDate}T00:00:00.000`).getTime();
                  const eMs = new Date(`${exportEndDate}T23:59:59.999`).getTime();
                  const currentVenueApp = applications.find(app => app._id === activeOrderVenueTab) || applications.find(app => app.status === 'approved');
                  const count = [...paymentOrders, ...orders].filter(ord => {
                    if (ord.hostApplicationId && currentVenueApp && ord.hostApplicationId !== currentVenueApp._id) return false;
                    const ordTime = new Date(ord.createdAt || ord.updatedAt || 0).getTime();
                    return ordTime >= sMs && ordTime <= eMs;
                  }).length;
                  return `${count} Orders Found`;

                })()}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="flex-1 bg-muted hover:bg-muted/80 text-foreground font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer border border-border/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExportPaymentExcel}
                disabled={isExportingExcel}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center space-x-1.5 uppercase"
              >
                {isExportingExcel ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download Excel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Takeout / Pickup Order Creation Modal */}
      {showTakeoutModal && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[180] p-4 animate-fade-in exclude-uppercase">
          <div className="bg-card border border-border/40 rounded-2xl w-full max-w-4xl p-6 relative flex flex-col space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowTakeoutModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-border/40 pb-3">
              <h3 className="font-outfit text-xl font-black text-foreground flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <span>Create Pickup / Takeout Order</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-semibold">
                Browse category-wise venue items, add quantities, and place direct counter pickup orders.
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Column: Menu Categories & Items */}
              <div className="lg:col-span-7 space-y-4">
                {/* Category Pills */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {menuCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTakeoutActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${takeoutActiveCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Items List - Simplified Compact Rows */}
                <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                  {menuItems
                    .filter(i => (i.category || '').toLowerCase() === takeoutActiveCategory.toLowerCase())
                    .map((item) => {
                      const cartEntry = takeoutCart.find(c => (c.item.itemId || c.item._id) === (item.itemId || item._id));
                      const qty = cartEntry ? cartEntry.quantity : 0;

                      return (
                        <div
                          key={item.itemId || item._id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center space-x-3 pr-2">
                            <span className="font-extrabold text-xs text-foreground uppercase tracking-tight">{item.name}</span>
                            <span className="font-mono text-xs font-bold text-primary">₹{((item.price || 0) / 100).toFixed(2)}</span>
                          </div>

                          <div className="shrink-0">
                            {qty === 0 ? (
                              <button
                                type="button"
                                onClick={() => setTakeoutCart([...takeoutCart, { item, quantity: 1 }])}
                                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center space-x-1 uppercase"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2 bg-muted px-2 py-1 rounded-lg border border-border/40">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (qty <= 1) {
                                      setTakeoutCart(takeoutCart.filter(c => (c.item.itemId || c.item._id) !== (item.itemId || item._id)));
                                    } else {
                                      setTakeoutCart(takeoutCart.map(c => (c.item.itemId || c.item._id) === (item.itemId || item._id) ? { ...c, quantity: c.quantity - 1 } : c));
                                    }
                                  }}
                                  className="w-5 h-5 flex items-center justify-center text-foreground font-bold hover:bg-background rounded transition-colors cursor-pointer text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold text-foreground px-1">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTakeoutCart(takeoutCart.map(c => (c.item.itemId || c.item._id) === (item.itemId || item._id) ? { ...c, quantity: c.quantity + 1 } : c));
                                  }}
                                  className="w-5 h-5 flex items-center justify-center text-foreground font-bold hover:bg-background rounded transition-colors cursor-pointer text-xs"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right Column: Live Pickup Cart */}
              <div className="lg:col-span-5 border-l border-border/40 pl-6 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="font-outfit text-xs font-black uppercase tracking-wider text-primary border-b border-border/40 pb-2">
                    Pickup Order Summary
                  </h4>

                  {takeoutCart.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground space-y-2">
                      <ShoppingBag className="w-8 h-8 mx-auto opacity-40" />
                      <p className="text-xs font-bold">No items added to pickup cart</p>
                      <p className="text-[10px]">Select items from menu categories on the left.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                      {takeoutCart.map((cEntry, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs p-2 bg-muted/20 rounded-lg border border-border/30">
                          <div>
                            <p className="font-bold text-foreground">{cEntry.item.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">₹{((cEntry.item.price || 0) / 100).toFixed(2)} x {cEntry.quantity}</p>
                          </div>
                          <span className="font-mono font-bold text-foreground">
                            ₹{(((cEntry.item.price || 0) * cEntry.quantity) / 100).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {takeoutCart.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    {(() => {
                      const totalPaise = takeoutCart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
                      const totalRs = (totalPaise / 100).toFixed(2);
                      return (
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between font-semibold text-muted-foreground">
                            <span>Total Items:</span>
                            <span>{takeoutCart.reduce((s, c) => s + c.quantity, 0)}</span>
                          </div>
                          <div className="flex justify-between font-black text-sm text-foreground pt-1 border-t border-border/40">
                            <span>Total Order Value:</span>
                            <span className="font-mono text-primary">₹{totalRs}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      type="button"
                      onClick={handleCreateTakeoutOrder}
                      disabled={isSubmittingTakeout}
                      className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg flex items-center justify-center space-x-2 uppercase tracking-wider"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>{isSubmittingTakeout ? 'Placing Order...' : 'Place Pickup Order'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
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
