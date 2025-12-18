
import React, { useState, useEffect, useMemo } from 'react';
import { bookingService } from '../services/bookingService';
import { authService } from '../services/authService';
import { BookingData, Driver, User, Company } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { VEHICLES, VIENNA_AIRPORT } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'bookings' | 'drivers' | 'analytics' | 'clients' | 'users';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('bookings');
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters - Default to Today
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  
  // New Driver Form
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [showAddDriver, setShowAddDriver] = useState(false);

  // Company Management State
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [newCoName, setNewCoName] = useState('');
  const [newCoDomain, setNewCoDomain] = useState('');
  const [newCoDiscount, setNewCoDiscount] = useState(0);

  // User Management State
  const [userSearch, setUserSearch] = useState('');
  const [userCompanyFilter, setUserCompanyFilter] = useState('all');

  // New User Form (Admin)
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserHomeAddress, setNewUserHomeAddress] = useState('');
  const [newUserBusinessAddress, setNewUserBusinessAddress] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserCompanyId, setNewUserCompanyId] = useState('');

  // Booking Editing State
  const [editingBooking, setEditingBooking] = useState<BookingData | null>(null);

  // Analytics Date Range - Initialize defaults (Current Month)
  const [analyticsStart, setAnalyticsStart] = useState(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [analyticsEnd, setAnalyticsEnd] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Analytics Filter
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'bookings' || activeTab === 'analytics') {
         const allBookings = await bookingService.getAllBookings();
         setBookings(allBookings);
         const allDrivers = await bookingService.getDrivers();
         setDrivers(allDrivers);
      } else if (activeTab === 'drivers') {
         const allDrivers = await bookingService.getDrivers();
         setDrivers(allDrivers);
      } else if (activeTab === 'clients') {
         const allCos = await authService.getCompanies();
         setCompanies(allCos);
      } else if (activeTab === 'users') {
         const allUsers = await authService.getAllUsers();
         const allCos = await authService.getCompanies();
         setUsers(allUsers);
         setCompanies(allCos);
      }
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const changeDate = (days: number) => {
    const current = new Date(dateFilter);
    current.setDate(current.getDate() + days);
    setDateFilter(current.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setDateFilter(new Date().toISOString().split('T')[0]);
  };

  const setDateRange = (type: 'thisMonth' | 'lastMonth' | 'last7Days') => {
    const end = new Date();
    let start = new Date();
    
    if (type === 'thisMonth') {
        start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (type === 'lastMonth') {
        start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
        end.setDate(0); 
        const prevMonth = new Date();
        prevMonth.setMonth(prevMonth.getMonth() - 1);
        start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
        end.setFullYear(prevMonth.getFullYear());
        end.setMonth(prevMonth.getMonth() + 1);
        end.setDate(0);
    } else if (type === 'last7Days') {
        start.setDate(end.getDate() - 7);
    }
    
    const toLocalISO = (d: Date) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    setAnalyticsStart(toLocalISO(start));
    setAnalyticsEnd(toLocalISO(end));
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bookingService.addDriver({
        name: newDriverName,
        email: newDriverEmail,
        phone: newDriverPhone,
        active: true
      });
      setNewDriverName('');
      setNewDriverEmail('');
      setNewDriverPhone('');
      setShowAddDriver(false);
      loadData();
    } catch (e) {
      alert("Failed to add driver");
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (window.confirm("Are you sure?")) {
      await bookingService.deleteDriver(id);
      loadData();
    }
  };

  const handleAssignDriver = async (bookingId: string, driverId: string) => {
    const dId = driverId === 'unassigned' ? null : driverId;
    await bookingService.assignDriver(bookingId, dId);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, assignedDriverId: dId || undefined } : b));
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm("Are you sure you want to cancel this booking?")) {
      await bookingService.updateStatus(bookingId, 'cancelled');
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    }
  };
  
  const handleEditBookingClick = (booking: BookingData) => {
      setEditingBooking({ ...booking });
  };

  const handleUpdateBooking = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingBooking) return;
      try {
          await bookingService.saveBooking(editingBooking);
          setEditingBooking(null);
          loadData();
      } catch (e) {
          alert("Failed to update booking");
      }
  };

  // --- COMPANY FUNCTIONS ---
  const handleAddCompany = async (e: React.FormEvent) => {
     e.preventDefault();
     if (editingCompany) {
         await authService.updateCompany({
             ...editingCompany,
             name: newCoName,
             domain: newCoDomain,
             discount: newCoDiscount
         });
         setEditingCompany(null);
     } else {
         await authService.addCompany({
            name: newCoName,
            domain: newCoDomain,
            joinCode: authService.generateJoinCode(),
            discount: newCoDiscount,
            invoiceEnabled: true
         });
     }
     setNewCoName(''); setNewCoDomain(''); setNewCoDiscount(0);
     setShowAddCompany(false);
     loadData();
  };

  const handleEditCompany = (c: Company) => {
      setEditingCompany(c);
      setNewCoName(c.name);
      setNewCoDomain(c.domain || '');
      setNewCoDiscount(c.discount);
      setShowAddCompany(true);
  };

  const handleRefreshCode = async (company: Company) => {
     if(window.confirm('Generate new code? Old one will stop working.')) {
        await authService.updateCompany({ ...company, joinCode: authService.generateJoinCode() });
        loadData();
     }
  };

  const handleDeleteCompany = async (id: string) => {
    if(window.confirm('Delete this company? Users will lose corporate status.')) {
        await authService.deleteCompany(id);
        loadData();
    }
  };

  // --- USER FUNCTIONS ---
  const handleSaveUser = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (editingUser) {
              // Update existing user
              let updateData: any = {
                  name: newUserName,
                  email: newUserEmail,
                  phoneNumber: newUserPhone,
                  homeAddress: newUserHomeAddress,
                  businessAddress: newUserBusinessAddress,
                  companyId: newUserCompanyId || null
              };
              
              // If company changed, we need to sync corporate status
              if (newUserCompanyId && newUserCompanyId !== editingUser.companyId) {
                  const company = companies.find(c => c.id === newUserCompanyId);
                  if (company) {
                      updateData.isCorporate = true;
                      updateData.companyName = company.name;
                      updateData.discount = company.discount;
                  }
              } else if (!newUserCompanyId && editingUser.companyId) {
                  updateData.isCorporate = false;
                  updateData.companyName = null;
                  updateData.discount = null;
              }

              await authService.updateUserProfile(editingUser.id, updateData);
          } else {
              // Create new user
              const createdUser = await authService.createUser(newUserName, newUserEmail, newUserPassword, newUserCompanyId || undefined);
              // Save extended profile details immediately
              if (newUserPhone || newUserHomeAddress || newUserBusinessAddress) {
                  await authService.updateUserProfile(createdUser.id, {
                      phoneNumber: newUserPhone,
                      homeAddress: newUserHomeAddress,
                      businessAddress: newUserBusinessAddress
                  });
              }
          }
          
          setShowAddUser(false);
          setEditingUser(null);
          setNewUserName(''); setNewUserEmail(''); setNewUserPhone(''); setNewUserHomeAddress(''); setNewUserBusinessAddress(''); setNewUserPassword(''); setNewUserCompanyId('');
          loadData();
      } catch (e: any) {
          alert("Error saving user: " + e.message);
      }
  };

  const handleEditUser = (u: User) => {
      setEditingUser(u);
      setNewUserName(u.name);
      setNewUserEmail(u.email);
      setNewUserPhone(u.phoneNumber || '');
      setNewUserHomeAddress(u.homeAddress || '');
      setNewUserBusinessAddress(u.businessAddress || '');
      setNewUserCompanyId(u.companyId || '');
      setNewUserPassword(''); // Reset password field, as we don't show old passwords
      setShowAddUser(true);
  };

  const handleDeleteUser = async (userId: string) => {
      if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
          try {
              await authService.deleteUserByAdmin(userId);
              loadData();
          } catch (e: any) {
              alert("Error deleting user: " + e.message);
          }
      }
  };

  const handleViewUserBookings = (userId: string) => {
     alert("User ID: " + userId + ". Filter functionality coming soon.");
  };

  // --- DERIVED DATA ---
  
  const filteredUsers = useMemo(() => {
     return users.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                              u.email.toLowerCase().includes(userSearch.toLowerCase());
        const matchesCompany = userCompanyFilter === 'all' || 
                               (u.companyId === userCompanyFilter) || 
                               (userCompanyFilter === 'none' && !u.companyId);
        return matchesSearch && matchesCompany;
     });
  }, [users, userSearch, userCompanyFilter]);


  // Analytics Logic
  const analyticsData = useMemo(() => {
    if (!analyticsStart || !analyticsEnd) return null;
    const start = new Date(analyticsStart);
    const end = new Date(analyticsEnd);
    end.setHours(23, 59, 59);

    // Filter confirmed rides within range
    const filtered = bookings.filter(b => {
      const bDate = new Date(b.date);
      return b.status === 'confirmed' && bDate >= start && bDate <= end;
    });

    const totalRevenue = filtered.reduce((sum, b) => sum + b.price, 0);
    const totalRides = filtered.length;
    
    // Aggregations
    const driverStatsMap = new Map<string, any>();
    const dailyStatsMap = new Map<string, number>();

    // Payment Stats for Pie Chart
    const paymentStats = [
        { name: t('payment.cash'), value: 0, color: '#10b981' },   // emerald-500
        { name: t('payment.card'), value: 0, color: '#3b82f6' },   // blue-500
        { name: t('payment.invoice'), value: 0, color: '#6366f1' } // indigo-500
    ];

    filtered.forEach(b => {
        // Driver Stats
        const dId = b.assignedDriverId || 'unassigned';
        // Skip unassigned in stats table
        if (dId !== 'unassigned') {
            const dName = drivers.find(d => d.id === dId)?.name || 'Unknown';
            
            if (!driverStatsMap.has(dId)) {
                driverStatsMap.set(dId, { 
                    id: dId, 
                    name: dName, 
                    rides: 0, 
                    revenue: 0, 
                    cashRides: 0, 
                    cardRides: 0,
                    cashRev: 0, 
                    cardRev: 0,
                    ratingSum: 0,
                    ratingCount: 0 
                });
            }
            const stats = driverStatsMap.get(dId);
            stats.rides++;
            stats.revenue += b.price;
            
            if (b.paymentMethod === 'cash') {
                stats.cashRides++;
                stats.cashRev += b.price;
            } else {
                stats.cardRides++;
                stats.cardRev += b.price;
            }

            if (b.rating) {
                stats.ratingSum += b.rating;
                stats.ratingCount++;
            }
        }

        // Daily Chart Data
        const dateKey = formatDate(b.date);
        dailyStatsMap.set(dateKey, (dailyStatsMap.get(dateKey) || 0) + 1);

        // Payment Data
        if (b.paymentMethod === 'invoice') paymentStats[2].value += b.price;
        else if (b.paymentMethod === 'card') paymentStats[1].value += b.price;
        else paymentStats[0].value += b.price;
    });

    const driverStats = Array.from(driverStatsMap.values());
    const validPaymentStats = paymentStats.filter(p => p.value > 0);
    
    // Sort Chart Data Chronologically
    const chartData = Array.from(dailyStatsMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => {
             const [d1, m1, y1] = a.date.split('/').map(Number);
             const [d2, m2, y2] = b.date.split('/').map(Number);
             return new Date(y1, m1-1, d1).getTime() - new Date(y2, m2-1, d2).getTime();
        });

    return { totalRevenue, totalRides, filtered, driverStats, chartData, paymentStats: validPaymentStats };
  }, [bookings, analyticsStart, analyticsEnd, drivers, t]);

  // Export functions
  const handleExportDriverStatsCSV = () => {
      if (!analyticsData || !selectedDriverId) return;
      
      const filteredRides = analyticsData.filtered.filter(b => b.assignedDriverId === selectedDriverId);
      const driverName = drivers.find(d => d.id === selectedDriverId)?.name || 'Driver';
      
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Date,Time,Route,Customer,Payment,Price,Rating,Review\n";
      
      filteredRides.forEach(b => {
          const route = `${b.pickupLocation} to ${b.dropoffLocation}`.replace(/,/g, '');
          const paymentLabel = b.paymentMethod === 'invoice' ? 'Invoice' : b.paymentMethod === 'card' ? 'Card' : 'Cash';
          const row = [
              formatDate(b.date),
              b.time,
              route,
              b.customerName,
              paymentLabel,
              b.price,
              b.rating || '',
              (b.review || '').replace(/,/g, ' ')
          ].join(",");
          csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `rides_${driverName.replace(/\s/g,'_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportDriverStatsPDF = () => {
    if (!analyticsData || !selectedDriverId) return;
    
    const filteredRides = analyticsData.filtered.filter(b => b.assignedDriverId === selectedDriverId);
    const driverName = drivers.find(d => d.id === selectedDriverId)?.name || 'Driver';

    // Calculate Summary Totals
    const totalRevenue = filteredRides.reduce((sum, b) => sum + b.price, 0);
    const totalCash = filteredRides.filter(b => b.paymentMethod === 'cash').reduce((sum, b) => sum + b.price, 0);
    const totalCard = filteredRides.filter(b => b.paymentMethod === 'card').reduce((sum, b) => sum + b.price, 0);
    const totalInvoice = filteredRides.filter(b => b.paymentMethod === 'invoice').reduce((sum, b) => sum + b.price, 0);

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(`Driver Report: ${driverName}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${formatDate(analyticsStart)} to ${formatDate(analyticsEnd)}`, 14, 22);

    // Summary Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, 28, 180, 24, 'FD');

    // Total Revenue
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "bold");
    doc.text("Total Revenue", 20, 36);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`€${totalRevenue}`, 20, 44);

    // Breakdown
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    
    doc.text("Cash", 70, 36);
    doc.text(`€${totalCash}`, 70, 44);
    
    doc.text("Card", 110, 36);
    doc.text(`€${totalCard}`, 110, 44);
    
    doc.text("Invoice", 150, 36);
    doc.text(`€${totalInvoice}`, 150, 44);

    const tableData = filteredRides.map(b => [
        formatDate(b.date),
        b.time,
        b.pickupLocation === VIENNA_AIRPORT ? `From Airport -> ${b.dropoffLocation}` : `${b.pickupLocation} -> Airport`,
        b.customerName,
        b.paymentMethod === 'invoice' ? 'Invoice' : b.paymentMethod === 'card' ? 'Card' : 'Cash',
        `€${b.price}`,
        b.rating ? `${b.rating}★` : '-'
    ]);

    autoTable(doc, {
        head: [['Date', 'Time', 'Route', 'Customer', 'Pay', 'Price', 'Rating']],
        body: tableData,
        startY: 60,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [14, 165, 233] }
    });

    doc.save(`report_${driverName.replace(/\s/g,'_')}.pdf`);
  };

  const filteredBookingsList = useMemo(() => {
     let list = bookings;
     if (dateFilter) {
         list = bookings.filter(b => b.date === dateFilter);
     }
     return list.sort((a, b) => {
         const dateA = new Date(`${a.date}T${a.time}`);
         const dateB = new Date(`${b.date}T${b.time}`);
         return dateA.getTime() - dateB.getTime();
     });
  }, [bookings, dateFilter]);
  

  // Common button styles for Desktop/Mobile consistency
  const btnStyles = {
      edit: "px-2 py-1.5 rounded border text-xs font-bold flex items-center gap-1 transition-colors bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
      delete: "px-2 py-1.5 rounded border text-xs font-bold flex items-center gap-1 transition-colors bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
      view: "px-2 py-1.5 rounded border text-xs font-bold flex items-center gap-1 transition-colors bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
      cancel: "px-2 py-1.5 rounded border text-xs font-bold flex items-center gap-1 transition-colors bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 animate-fade-in">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 md:px-6 py-4 flex justify-between items-center shadow-md">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <i className="fa-solid fa-user-shield text-primary-400"></i>
          <span className="hidden md:inline">{t('nav.admin')}</span>
          <span className="md:hidden">Dispatch</span>
        </h2>
        <button onClick={onClose} className="hover:text-primary-400 transition-colors">
          <i className="fa-solid fa-xmark text-2xl"></i>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 flex gap-6 overflow-x-auto">
        <button onClick={() => setActiveTab('bookings')} className={`py-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'bookings' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}><i className="fa-solid fa-list-check mr-2"></i> {t('admin.tab.bookings')}</button>
        <button onClick={() => setActiveTab('drivers')} className={`py-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'drivers' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}><i className="fa-solid fa-id-card mr-2"></i> {t('admin.tab.drivers')}</button>
        <button onClick={() => setActiveTab('clients')} className={`py-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'clients' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}><i className="fa-solid fa-building mr-2"></i> {t('admin.tab.clients')}</button>
        <button onClick={() => setActiveTab('users')} className={`py-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'users' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}><i className="fa-solid fa-users mr-2"></i> {t('admin.tab.users')}</button>
        <button onClick={() => setActiveTab('analytics')} className={`py-4 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'analytics' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500'}`}><i className="fa-solid fa-chart-line mr-2"></i> {t('admin.tab.analytics')}</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6 bg-slate-100/50">
        
        {/* --- BOOKINGS TAB --- */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
             <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center bg-white p-4 rounded-lg shadow-sm border border-slate-200 gap-4">
               <div className="flex items-center gap-2 w-full md:w-auto">
                 <button onClick={() => changeDate(-1)} className="p-2 rounded hover:bg-slate-100 border border-slate-300 text-slate-600"><i className="fa-solid fa-chevron-left"></i></button>
                 <div className="relative flex-1 md:flex-none"><input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-bold text-slate-700 outline-none bg-white text-slate-900" /></div>
                 <button onClick={() => changeDate(1)} className="p-2 rounded hover:bg-slate-100 border border-slate-300 text-slate-600"><i className="fa-solid fa-chevron-right"></i></button>
                 <button onClick={setToday} className="ml-2 px-3 py-2 bg-slate-100 text-slate-600 text-sm font-semibold rounded hover:bg-slate-200 border border-slate-300">Today</button>
               </div>
               <div className="text-sm font-semibold text-slate-600 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">{filteredBookingsList.length} rides found</div>
             </div>

             {/* Mobile Card View */}
             <div className="md:hidden space-y-4">
                {filteredBookingsList.map(b => (
                   <div key={b.id} className={`bg-white p-4 rounded-xl border-l-4 shadow-sm ${!b.assignedDriverId ? 'border-l-red-500 bg-red-50/50' : 'border-l-primary-500'}`}>
                      <div className="flex justify-between items-start mb-2">
                         <div>
                            <div className="font-bold text-lg text-slate-800">{b.time}</div>
                            <div className="text-xs text-slate-500">{formatDate(b.date)}</div>
                         </div>
                         <div className="text-right">
                             <div className="font-bold text-primary-700">€{b.price}</div>
                             <div className="text-xs text-slate-500">{b.paymentMethod}</div>
                         </div>
                      </div>
                      <div className="mb-3 space-y-1">
                          <div className="text-sm"><span className="font-semibold text-xs text-slate-400 uppercase w-12 inline-block">Route:</span> {b.pickupLocation.split('(')[0]} <i className="fa-solid fa-arrow-right text-xs mx-1"></i> {b.dropoffLocation.split('(')[0]}</div>
                          {b.address && <div className="text-sm"><span className="font-semibold text-xs text-slate-400 uppercase w-12 inline-block">Addr:</span> {b.address}</div>}
                          <div className="text-sm"><span className="font-semibold text-xs text-slate-400 uppercase w-12 inline-block">Cust:</span> {b.customerName}</div>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                          <div className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                             <i className="fa-solid fa-users"></i> {b.passengers}
                          </div>
                          <div className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">
                             <i className="fa-solid fa-suitcase"></i> {b.suitcases}
                          </div>
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <select className="border rounded px-2 py-2 text-sm w-full sm:w-auto bg-white text-slate-900" value={b.assignedDriverId || 'unassigned'} onChange={(e) => handleAssignDriver(b.id!, e.target.value)}>
                            <option value="unassigned">Unassigned</option>
                            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                          <div className="flex gap-2 w-full sm:w-auto">
                              <button onClick={() => handleEditBookingClick(b)} className={btnStyles.edit + " flex-1 sm:flex-none justify-center"}>
                                  <i className="fa-solid fa-pen-to-square mr-1"></i> Edit
                              </button>
                              {b.status === 'confirmed' && (
                                  <button onClick={() => handleCancelBooking(b.id!)} className={btnStyles.delete + " flex-1 sm:flex-none justify-center"}>
                                      <i className="fa-solid fa-ban mr-1"></i> Cancel
                                  </button>
                              )}
                              {b.status === 'cancelled' && <span className="text-xs font-bold px-3 py-2 rounded bg-slate-100 text-slate-500 text-center flex-1 sm:flex-none">Cancelled</span>}
                          </div>
                      </div>
                   </div>
                ))}
             </div>

             {/* Desktop Table View */}
             <div className="hidden md:block bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr><th className="px-4 py-3">{t('admin.table.timeId')}</th><th className="px-4 py-3">{t('admin.table.route')}</th><th className="px-4 py-3">{t('admin.table.customer')}</th><th className="px-4 py-3">{t('admin.table.reqPrice')}</th><th className="px-4 py-3">{t('admin.table.driver')}</th><th className="px-4 py-3">{t('admin.table.status')}</th><th className="px-4 py-3 text-right">{t('admin.table.actions')}</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredBookingsList.map(b => (
                             <tr key={b.id} className={`hover:bg-slate-50 ${!b.assignedDriverId ? 'bg-red-50/30' : ''}`}>
                                <td className="px-4 py-3 align-top"><div className="font-bold text-primary-700">{b.time}</div><div className="text-xs text-slate-500">{formatDate(b.date)}</div></td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-800">{b.pickupLocation.split('(')[0]} <i className="fa-solid fa-arrow-right text-xs"></i> {b.dropoffLocation.split('(')[0]}</div>
                                    {b.address && <div className="text-xs text-slate-500 mt-1"><i className="fa-solid fa-location-dot mr-1"></i>{b.address}</div>}
                                    {b.pickupLocation === VIENNA_AIRPORT && b.flightNumber && <div className="text-xs text-blue-600 mt-1"><i className="fa-solid fa-plane mr-1"></i>{b.flightNumber}</div>}
                                </td>
                                <td className="px-4 py-3">{b.customerName}</td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2 text-slate-500 mb-1">
                                        <span title="Passengers"><i className="fa-solid fa-user"></i> {b.passengers}</span>
                                        <span title="Suitcases"><i className="fa-solid fa-suitcase"></i> {b.suitcases}</span>
                                        <span title="Hand Luggage"><i className="fa-solid fa-briefcase"></i> {b.handLuggage}</span>
                                    </div>
                                    <div className="font-bold text-slate-800">€{b.price}</div>
                                </td>
                                <td className="px-4 py-3">
                                     <select className={`border rounded px-2 py-1 text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900 ${!b.assignedDriverId ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300'}`} value={b.assignedDriverId || 'unassigned'} onChange={(e) => handleAssignDriver(b.id!, e.target.value)}>
                                        <option value="unassigned">Unassigned</option>
                                        {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                     </select>
                                </td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${b.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{b.status}</span></td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEditBookingClick(b)} className={btnStyles.edit} title="Edit">
                                            <i className="fa-solid fa-pen-to-square"></i> Edit
                                        </button>
                                        {b.status === 'confirmed' && (
                                            <button onClick={() => handleCancelBooking(b.id!)} className={btnStyles.delete} title="Cancel Booking">
                                                <i className="fa-solid fa-ban"></i> Cancel
                                            </button>
                                        )}
                                    </div>
                                </td>
                             </tr>
                        ))}
                    </tbody>
                </table>
             </div>
          </div>
        )}
        
        {/* --- EDIT BOOKING MODAL --- */}
        {editingBooking && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Edit Booking</h3>
                        <button onClick={() => setEditingBooking(null)}><i className="fa-solid fa-xmark text-slate-400 hover:text-slate-600"></i></button>
                    </div>
                    <form onSubmit={handleUpdateBooking} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                                <input type="date" value={editingBooking.date} onChange={e => setEditingBooking({...editingBooking, date: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Time</label>
                                <input type="time" value={editingBooking.time} onChange={e => setEditingBooking({...editingBooking, time: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                            </div>
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Pickup Location</label>
                             <input type="text" value={editingBooking.pickupLocation} onChange={e => setEditingBooking({...editingBooking, pickupLocation: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Dropoff Location</label>
                             <input type="text" value={editingBooking.dropoffLocation} onChange={e => setEditingBooking({...editingBooking, dropoffLocation: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Exact Address</label>
                             <input type="text" value={editingBooking.address || ''} onChange={e => setEditingBooking({...editingBooking, address: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Price (€)</label>
                                <input type="number" value={editingBooking.price} onChange={e => setEditingBooking({...editingBooking, price: parseFloat(e.target.value)})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Flight No.</label>
                                <input type="text" value={editingBooking.flightNumber || ''} onChange={e => setEditingBooking({...editingBooking, flightNumber: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Customer Name</label>
                                <input type="text" value={editingBooking.customerName} onChange={e => setEditingBooking({...editingBooking, customerName: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                            </div>
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                                <input type="text" value={editingBooking.customerPhone} onChange={e => setEditingBooking({...editingBooking, customerPhone: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                            </div>
                        </div>
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Vehicle</label>
                             <select value={editingBooking.selectedVehicleId || ''} onChange={e => setEditingBooking({...editingBooking, selectedVehicleId: e.target.value})} className="w-full border p-2 rounded mt-1 bg-white text-slate-900">
                                 {VEHICLES.map(v => <option key={v.id} value={v.id}>{t(v.name)}</option>)}
                             </select>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setEditingBooking(null)} className="flex-1 py-2 border border-slate-300 rounded text-slate-600 font-semibold hover:bg-slate-50">Cancel</button>
                            <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded font-bold hover:bg-primary-700 shadow">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* --- COMPANIES TAB --- */}
        {activeTab === 'clients' && (
           <div className="max-w-6xl mx-auto space-y-6">
               <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">{t('admin.clientMgmt')}</h3>
                  <button 
                    onClick={() => {
                        setShowAddCompany(!showAddCompany);
                        setEditingCompany(null);
                        setNewCoName(''); setNewCoDomain(''); setNewCoDiscount(0);
                    }} 
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                      {showAddCompany ? t('admin.closeForm') : t('admin.addCompany')}
                  </button>
               </div>
               
               {showAddCompany && (
                 <form onSubmit={handleAddCompany} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                   <h4 className="font-bold mb-4 text-slate-700">{editingCompany ? 'Update Company' : 'Add New Company'}</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('admin.companyName')}</label>
                        <input type="text" required value={newCoName} onChange={e => setNewCoName(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('admin.companyDomain')}</label>
                        <input type="text" value={newCoDomain} onChange={e => setNewCoDomain(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" placeholder={t('admin.domainPlaceholder')} />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">{t('admin.discount')}</label>
                        <input type="number" min="0" max="100" value={newCoDiscount} onChange={e => setNewCoDiscount(Number(e.target.value))} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                      </div>
                   </div>
                   <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-sm">
                      {editingCompany ? 'Update Company' : 'Save Company'}
                   </button>
                 </form>
               )}

               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                   <div className="overflow-x-auto">
                       <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                               <tr>
                                   <th className="px-4 py-3">{t('admin.companyName')}</th>
                                   <th className="px-4 py-3">{t('admin.companyDomain')}</th>
                                   <th className="px-4 py-3">{t('admin.joinCode')}</th>
                                   <th className="px-4 py-3">{t('admin.discount')}</th>
                                   <th className="px-4 py-3 text-right">{t('admin.table.actions')}</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {companies.map(c => (
                                   <tr key={c.id} className="hover:bg-slate-50">
                                       <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                                       <td className="px-4 py-3 font-mono text-slate-600">@{c.domain || '-'}</td>
                                       <td className="px-4 py-3">
                                          <span className="bg-slate-100 px-2 py-1 rounded font-mono font-bold text-slate-700 mr-2">{c.joinCode}</span>
                                          <button onClick={() => handleRefreshCode(c)} className="text-xs text-primary-600 hover:underline">{t('admin.refreshCode')}</button>
                                       </td>
                                       <td className="px-4 py-3 font-bold text-green-600">{c.discount}%</td>
                                       <td className="px-4 py-3 text-right">
                                           <div className="flex justify-end gap-2">
                                               <button onClick={() => handleEditCompany(c)} className={btnStyles.edit}><i className="fa-solid fa-pen-to-square"></i> Edit</button>
                                               <button onClick={() => handleDeleteCompany(c.id)} className={btnStyles.delete}><i className="fa-solid fa-trash"></i> Delete</button>
                                           </div>
                                       </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   </div>
               </div>
           </div>
        )}

        {/* --- USERS TAB --- */}
        {activeTab === 'users' && (
           <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">{t('admin.userSearch')}</h3>
                  <button 
                    onClick={() => {
                        setShowAddUser(!showAddUser);
                        setEditingUser(null);
                        setNewUserName(''); setNewUserEmail(''); setNewUserPhone(''); setNewUserHomeAddress(''); setNewUserBusinessAddress(''); setNewUserPassword(''); setNewUserCompanyId('');
                    }} 
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                      {showAddUser ? t('admin.closeForm') : 'Add User'}
                  </button>
              </div>

              {showAddUser && (
                  <form onSubmit={handleSaveUser} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                      <h4 className="font-bold mb-4 text-slate-700">{editingUser ? 'Edit User' : 'Create New User Account'}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                              <input type="text" required value={newUserName} onChange={e => setNewUserName(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                              <input type="email" required value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                          </div>
                          
                          {/* New Phone Field */}
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                              <input type="text" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" placeholder="+43..." />
                          </div>
                          
                          {/* Company Selection */}
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Assign to Company (Optional)</label>
                              <select value={newUserCompanyId} onChange={e => setNewUserCompanyId(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900">
                                  <option value="">-- No Company --</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                          </div>

                          {/* New Address Fields */}
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Home Address</label>
                              <input type="text" value={newUserHomeAddress} onChange={e => setNewUserHomeAddress(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase">Business Address</label>
                              <input type="text" value={newUserBusinessAddress} onChange={e => setNewUserBusinessAddress(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                          </div>

                          {!editingUser && (
                              <div className="md:col-span-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                                  <input type="password" required minLength={6} value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full border p-2 rounded mt-1 bg-white text-slate-900" />
                              </div>
                          )}
                      </div>
                      <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-sm">
                          {editingUser ? 'Save Changes' : 'Create User'}
                      </button>
                  </form>
              )}

              <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{t('admin.userSearch')}</label>
                      <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Name or email..." className="w-full border p-2 rounded mt-1 outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900" />
                  </div>
                  <div className="w-full md:w-64">
                      <label className="text-xs font-bold text-slate-500 uppercase">{t('admin.filterByCompany')}</label>
                      <select value={userCompanyFilter} onChange={e => setUserCompanyFilter(e.target.value)} className="w-full border p-2 rounded mt-1 outline-none bg-white text-slate-900">
                          <option value="all">All Users</option>
                          <option value="none">Private Users (No Company)</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
              </div>

              {/* Mobile User Cards */}
              <div className="md:hidden space-y-4">
                  {filteredUsers.map(u => {
                      const userCo = companies.find(c => c.id === u.companyId);
                      return (
                          <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                              <div className="flex justify-between items-start mb-2">
                                  <div>
                                      <div className="font-bold text-slate-800 text-lg">{u.name}</div>
                                      <div className="text-xs text-slate-500">{u.email}</div>
                                  </div>
                                  {userCo && (
                                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                                          {userCo.name}
                                      </span>
                                  )}
                              </div>
                              <div className="text-sm text-slate-600 mb-4">
                                  <div className="flex items-center gap-2 mb-1">
                                      <i className="fa-solid fa-phone text-slate-400 w-4"></i>
                                      {u.phoneNumber || '-'}
                                  </div>
                                  <div className="text-xs text-slate-400 mt-2">
                                      Registered: {new Date(u.createdAt).toLocaleDateString()}
                                  </div>
                              </div>
                              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                                  <button onClick={() => handleViewUserBookings(u.id)} className={btnStyles.view}>
                                      <i className="fa-solid fa-list-check"></i> Bookings
                                  </button>
                                  <button onClick={() => handleEditUser(u)} className={btnStyles.edit}>
                                      <i className="fa-solid fa-pen-to-square"></i> Edit
                                  </button>
                                  <button onClick={() => handleDeleteUser(u.id)} className={btnStyles.delete}>
                                      <i className="fa-solid fa-trash"></i> Delete
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>

              {/* Desktop User Table */}
              <div className="hidden md:block bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                           <th className="px-4 py-3">User</th>
                           <th className="px-4 py-3">Contact</th>
                           <th className="px-4 py-3">Company</th>
                           <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map(u => {
                            const userCo = companies.find(c => c.id === u.companyId);
                            return (
                                <tr key={u.id} className="hover:bg-slate-50">
                                   <td className="px-4 py-3">
                                       <div className="font-bold text-slate-800">{u.name}</div>
                                       <div className="text-xs text-slate-400">Since {new Date(u.createdAt).toLocaleDateString()}</div>
                                   </td>
                                   <td className="px-4 py-3">
                                       <div className="text-slate-600">{u.email}</div>
                                       <div className="text-xs text-slate-500">{u.phoneNumber || '-'}</div>
                                   </td>
                                   <td className="px-4 py-3">
                                       {userCo ? (
                                           <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">
                                               {userCo.name}
                                           </span>
                                       ) : (
                                           <span className="text-slate-400">-</span>
                                       )}
                                   </td>
                                   <td className="px-4 py-3 text-right">
                                       <div className="flex justify-end gap-2">
                                           <button onClick={() => handleViewUserBookings(u.id)} className={btnStyles.view}>
                                               <i className="fa-solid fa-list-check"></i> Bookings
                                           </button>
                                           <button onClick={() => handleEditUser(u)} className={btnStyles.edit} title="Edit User">
                                               <i className="fa-solid fa-pen-to-square"></i> Edit
                                           </button>
                                           <button onClick={() => handleDeleteUser(u.id)} className={btnStyles.delete} title="Delete User">
                                               <i className="fa-solid fa-trash"></i> Delete
                                           </button>
                                       </div>
                                   </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
              </div>
           </div>
        )}

        {/* --- DRIVERS TAB --- */}
        {activeTab === 'drivers' && (
           <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-800">{t('admin.fleet')}</h3>
                 <button onClick={() => setShowAddDriver(!showAddDriver)} className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">{showAddDriver ? t('admin.closeForm') : t('admin.addDriver')}</button>
              </div>
              {showAddDriver && (
                  <form onSubmit={handleAddDriver} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="text" placeholder="Name" required value={newDriverName} onChange={e => setNewDriverName(e.target.value)} className="border p-2 rounded bg-white text-slate-900" />
                        <input type="email" placeholder="Email" required value={newDriverEmail} onChange={e => setNewDriverEmail(e.target.value)} className="border p-2 rounded bg-white text-slate-900" />
                        <input type="tel" placeholder="Phone" required value={newDriverPhone} onChange={e => setNewDriverPhone(e.target.value)} className="border p-2 rounded bg-white text-slate-900" />
                      </div>
                      <button type="submit" className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-sm">Save</button>
                  </form>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {drivers.map(d => (
                      <div key={d.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                          <div><div className="font-bold">{d.name}</div><div className="text-xs text-slate-500">{d.email}</div></div>
                          <button onClick={() => handleDeleteDriver(d.id)} className={btnStyles.delete}><i className="fa-solid fa-trash"></i> Delete</button>
                      </div>
                  ))}
              </div>
           </div>
        )}

        {/* --- ANALYTICS TAB --- */}
        {activeTab === 'analytics' && (
             <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
                 {/* Filters */}
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                           <i className="fa-solid fa-filter text-primary-500"></i> {t('admin.selectPeriod')}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setDateRange('last7Days')} className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded">Last 7 Days</button>
                            <button onClick={() => setDateRange('lastMonth')} className="px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded">Last Month</button>
                            <button onClick={() => setDateRange('thisMonth')} className="px-3 py-1 text-xs font-semibold bg-primary-100 hover:bg-primary-200 text-primary-700 rounded">This Month</button>
                        </div>
                     </div>
                     <div className="flex gap-4 items-end flex-wrap">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">{t('admin.startDate')}</label>
                            <input type="date" value={analyticsStart} onChange={e => setAnalyticsStart(e.target.value)} className="block border p-2 rounded mt-1 outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">{t('admin.endDate')}</label>
                            <input type="date" value={analyticsEnd} onChange={e => setAnalyticsEnd(e.target.value)} className="block border p-2 rounded mt-1 outline-none focus:ring-2 focus:ring-primary-500 bg-white text-slate-900" />
                        </div>
                     </div>
                 </div>

                 {analyticsData ? (
                   <>
                     {/* Overview Cards */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-emerald-500 text-white p-6 rounded-xl shadow-lg shadow-emerald-500/20">
                            <div className="text-sm font-bold uppercase opacity-80 mb-1">{t('admin.totalRevenue')}</div>
                            <div className="text-4xl font-bold">€{analyticsData.totalRevenue}</div>
                            <div className="mt-4 pt-4 border-t border-emerald-400/50 flex justify-between text-sm opacity-90">
                                <span>Cash: €{analyticsData.filtered.filter(b=>b.paymentMethod==='cash').reduce((s,b)=>s+b.price,0)}</span>
                                <span>Card: €{analyticsData.filtered.filter(b=>b.paymentMethod!=='cash').reduce((s,b)=>s+b.price,0)}</span>
                            </div>
                        </div>
                        <div className="bg-blue-500 text-white p-6 rounded-xl shadow-lg shadow-blue-500/20">
                            <div className="text-sm font-bold uppercase opacity-80 mb-1">{t('admin.totalRides')}</div>
                            <div className="text-4xl font-bold">{analyticsData.totalRides}</div>
                        </div>
                        <div className="bg-indigo-500 text-white p-6 rounded-xl shadow-lg shadow-indigo-500/20">
                             <div className="text-sm font-bold uppercase opacity-80 mb-1">{t('admin.avgRating')}</div>
                             <div className="text-4xl font-bold">
                                 {(analyticsData.driverStats.reduce((acc: number, d: any) => acc + (d.ratingSum || 0), 0) / (analyticsData.driverStats.reduce((acc: number, d: any) => acc + (d.ratingCount || 0), 0) || 1)).toFixed(1)} <span className="text-2xl">★</span>
                             </div>
                        </div>
                     </div>

                     {/* Charts Row */}
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Bar Chart - Orders Per Day */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                            <h3 className="font-bold text-slate-700 mb-4">{t('admin.ordersPerDay')}</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analyticsData.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                                    <YAxis allowDecimals={false} fontSize={12} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        cursor={{ fill: '#f1f5f9' }}
                                    />
                                    <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        
                        {/* Pie Chart - Revenue by Payment Type */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                            <h3 className="font-bold text-slate-700 mb-4">Revenue by Payment Type</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analyticsData.paymentStats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {analyticsData.paymentStats.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `€${value}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                     </div>

                     {/* Driver Performance Table */}
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                         <div className="p-6 border-b border-slate-200">
                             <h3 className="font-bold text-slate-700">{t('admin.driverPerf')}</h3>
                             <p className="text-xs text-slate-500 mt-1">{t('admin.clickToFilter')}</p>
                         </div>
                         <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3">Driver</th>
                                        <th className="px-6 py-3 text-center">Rides</th>
                                        <th className="px-6 py-3 text-right">Revenue</th>
                                        <th className="px-6 py-3 text-center">Cash Rides</th>
                                        <th className="px-6 py-3 text-right">Cash Rev</th>
                                        <th className="px-6 py-3 text-center">Card Rides</th>
                                        <th className="px-6 py-3 text-right">Card Rev</th>
                                        <th className="px-6 py-3 text-center">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {analyticsData.driverStats.map((stat: any) => (
                                        <tr 
                                            key={stat.id} 
                                            onClick={() => setSelectedDriverId(selectedDriverId === stat.id ? null : stat.id)}
                                            className={`cursor-pointer transition-colors ${selectedDriverId === stat.id ? 'bg-primary-50 ring-1 ring-primary-500 z-10 relative' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-6 py-3 font-medium text-slate-800">{stat.name}</td>
                                            <td className="px-6 py-3 text-center">{stat.rides}</td>
                                            <td className="px-6 py-3 text-right font-bold">€{stat.revenue}</td>
                                            <td className="px-6 py-3 text-center text-slate-500">{stat.cashRides}</td>
                                            <td className="px-6 py-3 text-right text-slate-500">€{stat.cashRev}</td>
                                            <td className="px-6 py-3 text-center text-slate-500">{stat.cardRides}</td>
                                            <td className="px-6 py-3 text-right text-slate-500">€{stat.cardRev}</td>
                                            <td className="px-6 py-3 text-center">
                                                {stat.ratingCount > 0 
                                                    ? <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold">{(stat.ratingSum / stat.ratingCount).toFixed(1)} ★</span> 
                                                    : <span className="text-slate-300">-</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                     </div>

                     {/* Rides List (Filtered) */}
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                         <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                             <div>
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    {selectedDriverId ? `${t('admin.ridesFor')} ${drivers.find(d=>d.id===selectedDriverId)?.name}` : t('admin.allRides')}
                                    {selectedDriverId && <button onClick={() => setSelectedDriverId(null)} className="ml-2 text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-300"><i className="fa-solid fa-xmark"></i> {t('admin.clearFilter')}</button>}
                                </h3>
                             </div>
                             {selectedDriverId && (
                                 <div className="flex gap-2">
                                    <button onClick={handleExportDriverStatsPDF} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors"><i className="fa-solid fa-file-pdf"></i> Export PDF</button>
                                    <button onClick={handleExportDriverStatsCSV} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors"><i className="fa-solid fa-file-csv"></i> Export CSV</button>
                                 </div>
                             )}
                         </div>
                         
                         <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Route</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Pay</th>
                                        <th className="px-6 py-3 text-right">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {analyticsData.filtered
                                        .filter(b => !selectedDriverId || b.assignedDriverId === selectedDriverId)
                                        .map(b => (
                                        <tr key={b.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3">
                                                <div className="font-bold text-slate-700">{formatDate(b.date)}</div>
                                                <div className="text-xs text-slate-500">{b.time}</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="truncate w-48" title={`${b.pickupLocation} -> ${b.dropoffLocation}`}>
                                                    {b.pickupLocation.split('(')[0]} <i className="fa-solid fa-arrow-right text-xs mx-1"></i> {b.dropoffLocation.split('(')[0]}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">{b.customerName}</td>
                                            <td className="px-6 py-3">
                                                {b.paymentMethod === 'card' 
                                                  ? <i className="fa-solid fa-credit-card text-blue-500" title="Card"></i> 
                                                  : b.paymentMethod === 'invoice' 
                                                  ? <i className="fa-solid fa-file-invoice text-indigo-500" title="Invoice"></i>
                                                  : <i className="fa-solid fa-money-bill-wave text-green-500" title="Cash"></i>
                                                }
                                            </td>
                                            <td className="px-6 py-3 text-right font-medium">€{b.price}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {analyticsData.filtered.filter(b => !selectedDriverId || b.assignedDriverId === selectedDriverId).length === 0 && (
                                <div className="p-8 text-center text-slate-400 italic">
                                    {t('admin.noRidesCriteria')}
                                </div>
                            )}
                         </div>
                     </div>
                   </>
                 ) : (
                     <div className="text-center py-12 text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                         Please select a date range to generate the report.
                     </div>
                 )}
             </div>
        )}

        {/* Footer actions */}
        <div className="mt-8 text-center">
            <button onClick={resetMockData} className="text-xs text-slate-400 hover:text-red-500 underline">Reset Data</button>
        </div>

      </div>
    </div>
  );
};
