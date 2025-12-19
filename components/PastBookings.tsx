
import React, { useEffect, useState } from 'react';
import { BookingData, User } from '../types';
import { VEHICLES, VIENNA_AIRPORT } from '../constants';
import { authService } from '../services/authService';
import { bookingService } from '../services/bookingService';
import { useLanguage } from '../contexts/LanguageContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { supabase } from "../services/supabaseClient";

interface PastBookingsProps {
  isOpen: boolean;
  onClose: () => void;
  onModify: (booking: BookingData) => void;
  onDataChange?: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onLoginRequest?: () => void;
  initialTab?: 'bookings' | 'profile';
}

type ActionType = 'cancel' | 'modify' | 'delete_account';

interface ConfirmationState {
  type: ActionType;
  booking?: BookingData;
}

interface ToastState {
  message: string;
  type: 'success' | 'info' | 'error';
}

type Tab = 'bookings' | 'profile';

export const PastBookings: React.FC<PastBookingsProps> = ({ isOpen, onClose, onModify, onDataChange, currentUser, onLogout, onLoginRequest, initialTab = 'bookings' }) => {
  const { t } = useLanguage();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  
  // Show Change Password Modal
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Review State
  const [reviews, setReviews] = useState<{[key:string]: string}>({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBookings();
      setActiveTab(initialTab); 
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (isOpen && currentUser) {
        setEditName(currentUser.name || '');
        setEditEmail(currentUser.email || '');
        setEditPhone(currentUser.phoneNumber || '');
        setHomeAddress(currentUser.homeAddress || '');
        setBusinessAddress(currentUser.businessAddress || '');
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingService.getBookings(currentUser?.id, currentUser?.email);
      setBookings(data);
      const initialReviews: {[key:string]: string} = {};
      data.forEach(b => {
        if(b.id && b.review) initialReviews[b.id] = b.review;
      });
      setReviews(initialReviews);
    } catch (e) {
      console.error("Failed to load bookings", e);
      setToast({ message: "Failed to load bookings", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
      if (!currentUser) return;
      setIsSavingProfile(true);
      try {
          await authService.updateUserProfile(currentUser, {
            name: editName,
            email: editEmail,
            phoneNumber: editPhone,
            homeAddress, 
            businessAddress
          });
          setToast({ message: t('toast.profileSaved'), type: 'success' });
      } catch (e) {
          console.error("Profile save error", e);
          const message = (e as any)?.message || "Failed to save profile";
          setToast({ message, type: 'error' });
      } finally {
          setIsSavingProfile(false);
      }
  };

  const isUpcoming = (dateStr: string, timeStr: string) => {
    const bookingTime = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    return bookingTime > now;
  };

  const handleToggleReminder = async (e: React.MouseEvent, id: string, currentStatus: boolean | undefined) => {
    e.stopPropagation();
    if (!id) return;
    
    if (!currentStatus && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }

    try {
      await bookingService.toggleReminder(id, !currentStatus, currentUser?.id);
      loadBookings();
      const message = !currentStatus ? t('toast.reminderSet') : t('toast.reminderRemoved');
      setToast({ message, type: 'success' });
      if (onDataChange) onDataChange();
    } catch (e) {
      console.error("Failed to update reminder", e);
      setToast({ message: "Error updating reminder", type: 'error' });
    }
  };

  const handleRating = async (bookingId: string, rating: number) => {
     try {
       await bookingService.submitRating(bookingId, rating, reviews[bookingId]);
       loadBookings();
       setToast({ message: t('toast.ratingSubmitted'), type: 'success' });
     } catch (e) {
       console.error("Failed to save rating", e);
       setToast({ message: "Error saving rating", type: 'error' });
     }
  };

  const handleSubmitReview = async (bookingId: string, currentRating?: number) => {
      if (!currentRating) {
          setToast({ message: "Please select a star rating first.", type: 'info' });
          return;
      }
      try {
          await bookingService.submitRating(bookingId, currentRating, reviews[bookingId]);
          loadBookings();
          setToast({ message: t('toast.reviewSaved'), type: 'success' });
      } catch (e) {
          console.error("Failed to save review", e);
          setToast({ message: "Error saving review", type: 'error' });
      }
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const initiateCancel = (booking: BookingData) => {
    setConfirmation({ type: 'cancel', booking });
  };

  const initiateModify = (booking: BookingData) => {
    setConfirmation({ type: 'modify', booking });
  };

  const initiateDeleteAccount = () => {
    setConfirmation({ type: 'delete_account' });
  };

  const proceedWithCancellation = async () => {
    if (!confirmation?.booking?.id) return;
    try {
      await bookingService.updateStatus(confirmation.booking.id, 'cancelled', currentUser?.id);
      loadBookings();
      if (onDataChange) onDataChange();
      setConfirmation(null);
      setToast({ message: t('toast.bookingCancelled'), type: 'success' });
    } catch (e) {
      console.error("Failed to cancel booking", e);
      setToast({ message: "Failed to cancel booking", type: 'error' });
    }
  };

  const proceedWithModification = () => {
    if (!confirmation?.booking) return;
    setConfirmation(null);
    setToast({ message: t('toast.redirectModify'), type: 'info' });
    setTimeout(() => {
        onModify(confirmation.booking!);
    }, 800);
  };

  const proceedWithAccountDeletion = async () => {
    if (!currentUser) return;
    try {
      setConfirmation(null);
      await authService.deleteAccount(currentUser.id);
      onLogout();
      onClose();
      alert(t('msg.accountDeleted'));      
    } catch (e) {
      setToast({ message: "Failed to delete account. Please re-login and try again.", type: 'error' });
    }
  };

  const handleAddToCalendar = (e: React.MouseEvent, booking: BookingData) => {
    e.stopPropagation();
    const { date, time, pickupLocation, dropoffLocation, customerName } = booking;
    
    let y, m, d;
    if (date.includes('-')) {
        const parts = date.split('-');
        if (parts[0].length === 4) {
             [y, m, d] = parts.map(Number);
        } else {
             [d, m, y] = parts.map(Number);
        }
    } else if (date.includes('/')) {
        [d, m, y] = date.split('/').map(Number);
    } else {
        return;
    }

    const [hour, minute] = time.split(':').map(Number);
    const startDate = new Date(y, m - 1, d, hour, minute);
    
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000 + 30 * 60 * 1000); 

    const pad = (n: number) => n < 10 ? '0' + n : n;
    const formatLocal = (dateObj: Date) => {
        return `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}T${pad(dateObj.getHours())}${pad(dateObj.getMinutes())}00`;
    };

    const description = `Pickup: ${pickupLocation}\\nDropoff: ${dropoffLocation}\\nPassenger: ${customerName}`;
    
    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//VIERide//Transfer Booking//EN',
        'BEGIN:VEVENT',
        `UID:${booking.id || Date.now()}@vieride.com`,
        `DTSTAMP:${formatLocal(new Date())}`,
        `DTSTART:${formatLocal(startDate)}`,
        `DTEND:${formatLocal(endDate)}`,
        `SUMMARY:Transfer: ${pickupLocation} -> ${dropoffLocation}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${pickupLocation}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `ride_${date}_${time.replace(':','')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`; 
    return `${parts[0]}/${parts[1]}/${parts[2]}`; 
  };

  const formatTimestamp = (ts: number) => {
      const d = new Date(ts);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  const handleLoginClick = () => {
    if (onLoginRequest) {
      onClose();
      onLoginRequest();
    }
  };

  if (!isOpen) return null;

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredBookings = normalizedSearch
    ? bookings.filter(b => {
        const haystack = [
          b.pickupLocation,
          b.dropoffLocation,
          b.customerName,
          b.customerEmail,
          b.customerPhone,
          b.flightNumber,
          b.status,
          b.date,
          b.time,
          b.id
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : bookings;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative">
        <div className="p-0 border-b border-slate-100 flex flex-col bg-slate-50">
          <div className="flex justify-between items-center p-6 pb-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <i className="fa-solid fa-user-circle text-primary-600"></i>
              {currentUser ? `${t('history.welcome')}, ${currentUser.name.split(' ')[0]}` : t('history.title')}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
          
          {currentUser && (
            <div className="flex px-6 space-x-6 text-sm font-medium">
              <button 
                onClick={() => setActiveTab('bookings')}
                className={`pb-3 border-b-2 transition-colors ${activeTab === 'bookings' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {t('history.tab.bookings')}
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`pb-3 border-b-2 transition-colors ${activeTab === 'profile' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {t('history.tab.profile')}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {activeTab === 'profile' && currentUser && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{t('profile.info')}</h3>
                <div className="space-y-4">
                   <div>
                     <label className="text-xs text-slate-400 uppercase font-bold">{t('label.name')}</label>
                     <div className="relative mt-1">
                        <i className="fa-solid fa-user absolute left-3 top-3 text-slate-400"></i>
                        <input 
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                            placeholder={t('label.name')}
                        />
                     </div>
                   </div>
                   <div>
                     <label className="text-xs text-slate-400 uppercase font-bold">{t('label.email')}</label>
                     <div className="relative mt-1">
                        <i className="fa-solid fa-envelope absolute left-3 top-3 text-slate-400"></i>
                        <input 
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                            placeholder={t('label.email')}
                        />
                     </div>
                   </div>
                   <div>
                     <label className="text-xs text-slate-400 uppercase font-bold">{t('label.phone')}</label>
                     <div className="relative mt-1">
                        <i className="fa-solid fa-phone absolute left-3 top-3 text-slate-400"></i>
                        <input 
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                            placeholder="+43 1 234 5678"
                        />
                     </div>
                   </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                    <h4 className="font-semibold text-slate-700">{t('profile.savedAddresses')}</h4>
                    <div>
                        <label className="text-xs text-slate-500 uppercase font-bold">{t('label.homeAddress')}</label>
                        <div className="relative mt-1">
                            <i className="fa-solid fa-house absolute left-3 top-3 text-slate-400"></i>
                            <input 
                                type="text"
                                value={homeAddress}
                                onChange={(e) => setHomeAddress(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                placeholder="e.g. Mariahilfer Str. 123, Vienna"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 uppercase font-bold">{t('label.businessAddress')}</label>
                        <div className="relative mt-1">
                            <i className="fa-solid fa-briefcase absolute left-3 top-3 text-slate-400"></i>
                            <input 
                                type="text"
                                value={businessAddress}
                                onChange={(e) => setBusinessAddress(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900"
                                placeholder="e.g. Office Park 4, Vienna Airport"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile}
                        className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                        {isSavingProfile ? <i className="fa-solid fa-circle-notch fa-spin"></i> : t('btn.saveProfile')}
                    </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">{t('profile.accountActions')}</h3>
                <div className="space-y-3">
                   {/* Change Password Button */}
                   <button 
                    onClick={() => setShowChangePassword(true)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex justify-between items-center"
                   >
                     <span>{t('auth.changePassword')}</span>
                     <i className="fa-solid fa-key"></i>
                   </button>

                   <button 
                    onClick={() => { onLogout(); onClose(); }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex justify-between items-center"
                   >
                     <span>{t('nav.signOut')}</span>
                     <i className="fa-solid fa-right-from-bracket"></i>
                   </button>
                   
                   <button 
                    onClick={initiateDeleteAccount}
                    className="w-full text-left px-4 py-3 rounded-lg border border-red-100 text-red-600 bg-red-50 hover:bg-red-100 transition-colors flex justify-between items-center"
                   >
                     <span>{t('btn.deleteAccount')}</span>
                     <i className="fa-solid fa-trash-can"></i>
                   </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <>
              {!currentUser ? (
                <div className="text-center py-12 text-slate-600 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-lock text-primary-500 text-xl"></i>
                  </div>
                  <p className="text-lg font-semibold text-slate-800">
                   {t('history.loginTitle')}
                  </p>
                  <p className="text-sm text-slate-500 ">
                    {t('history.loginDesc')}
                  </p>
                  <button 
                    onClick={handleLoginClick}
                    className="mt-6 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-md shadow-primary-500/30 transition-colors"
                  >
                    {t('nav.signIn')}
                  </button>
                </div>
              ) : loading ? (
                <div className="flex justify-center py-12">
                   <div className="flex flex-col items-center gap-2">
                     <i className="fa-solid fa-circle-notch fa-spin text-primary-500 text-2xl"></i>
                     <span className="text-slate-400 text-sm">{t('profile.loading')}</span>
                   </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="relative w-full sm:w-72">
                          <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-slate-400"></i>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('history.search') || 'Search bookings'}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white text-slate-900 text-sm"
                          />
                        </div>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="text-xs text-slate-500 hover:text-primary-600"
                          >
                            {t('btn.clear') || 'Clear'}
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredBookings.length === 0 ? (
                      <div className="text-center py-12 text-slate-500">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <i className="fa-regular fa-calendar-xmark text-2xl text-slate-400"></i>
                        </div>
                        <p className="font-medium">{t('history.empty')}</p>
                        <p className="text-sm mt-2">{t('profile.noBookingsSub')}</p>
                        <button onClick={onClose} className="mt-6 text-primary-600 font-semibold hover:text-primary-700">
                          {t('history.bookNow')}
                        </button>
                      </div>
                    ) : (
                      filteredBookings.map((booking, index) => {
                    const creationDate = booking.timestamp ? formatTimestamp(booking.timestamp) : '';
                    const isFromAirport = booking.pickupLocation === VIENNA_AIRPORT;
                    const displayDate = formatDate(booking.date);
                    
                    const isCancelled = booking.status === 'cancelled';
                    const upcoming = isUpcoming(booking.date, booking.time);
                    const bookingId = booking.id || `temp-${index}`;
                    const isExpanded = expandedIds.has(bookingId);
                    
                    return (
                      <div key={bookingId} className={`relative bg-white p-5 rounded-xl border transition-all duration-300 ${isCancelled ? 'border-slate-100 opacity-75' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                        {/* Booking List Item Content */}
                        <div className="cursor-pointer" onClick={() => toggleExpand(bookingId)}>
                            {isCancelled && (
                            <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide z-10 animate-fade-in">
                                {t('status.cancelled')}
                            </div>
                            )}

                            {!isCancelled && upcoming && (
                                <div className="absolute top-4 right-4 z-10">
                                    <button 
                                        onClick={(e) => handleToggleReminder(e, bookingId, booking.reminderSet)}
                                        className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide flex items-center gap-1 transition-all ${
                                            booking.reminderSet 
                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                        title={
                                         booking.reminderSet
                                           ? t('reminder.active')
                                           : t('reminder.set')
                                              }
                                    >
                                        <i className={`fa-solid ${booking.reminderSet ? 'fa-bell' : 'fa-bell-slash'}`}></i>
                                        {booking.reminderSet ? 'On' : 'Set'}
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4 mt-6 sm:mt-0">
                                <div className="flex items-start gap-3">
                                    <div className={`font-bold px-3 py-2 rounded text-xs tracking-wide flex flex-col gap-1 ${isCancelled ? 'bg-slate-100 text-slate-500' : 'bg-primary-50 text-primary-700'}`}>
                                        <div className="flex items-center gap-2 border-b border-primary-100/50 pb-1">
                                            <i className="fa-regular fa-calendar"></i>
                                            <span>{displayDate}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <i className={`fa-solid ${isFromAirport ? 'fa-plane-arrival' : 'fa-landmark'}`}></i>
                                            <span>
                                                {isFromAirport ? t('label.landingTime') : t('label.pickupTime')} {booking.time}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono mt-1">#{booking.id?.slice(-6).toUpperCase() || 'REF'}</div>
                                </div>
                                <div className={`text-xl font-bold ${isCancelled ? 'text-slate-400 line-through' : 'text-slate-800'}`}>€{booking.price}</div>
                            </div>
                            
                            <div className="flex items-start gap-3 mb-4">
                                <div className="flex flex-col items-center mt-1">
                                    <div className={`w-2.5 h-2.5 rounded-full ${isCancelled ? 'bg-slate-300' : 'bg-slate-300'}`}></div>
                                    <div className="w-0.5 h-8 bg-slate-200 my-0.5"></div>
                                    <div className={`w-2.5 h-2.5 rounded-full ${isCancelled ? 'bg-slate-400' : 'bg-primary-500'}`}></div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-semibold">{t('label.pickup')}</div>
                                        <div className="text-slate-800 font-medium">{booking.pickupLocation}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-semibold">{t('label.dropoff')}</div>
                                        <div className="text-slate-800 font-medium">{booking.dropoffLocation}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-sm text-slate-500 mb-2">
                                <div className="flex items-center gap-3 text-slate-600">
                                    <div className="flex items-center gap-1" title={t('label.passengers')}>
                                        <i className="fa-solid fa-user"></i> {booking.passengers}
                                    </div>
                                    <div className="flex items-center gap-1" title={t('label.suitcases')}>
                                        <i className="fa-solid fa-suitcase"></i> {booking.suitcases}
                                    </div>
                                    <div className="flex items-center gap-1" title={t('label.handLuggage')}>
                                        <i className="fa-solid fa-briefcase"></i> {booking.handLuggage}
                                    </div>
                                </div>
                                {creationDate && (
                                    <div className="text-xs text-slate-400">
                                        {t('detail.bookedOn')} {creationDate}
                                    </div>
                                )}
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in text-sm bg-slate-50 -mx-5 px-5 pb-2">
                                    {/* Driver Rating Section */}
                                    {!isCancelled && !upcoming && booking.assignedDriverId && (
                                        <div className="sm:col-span-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                                            <div className="text-xs text-yellow-800 uppercase font-bold mb-2">{t('label.rateDriver')}</div>
                                            <div className="flex gap-2 mb-3">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={(e) => { e.stopPropagation(); handleRating(bookingId, star); }}
                                                        disabled={!!booking.rating}
                                                        className={`text-xl transition-transform ${!!booking.rating ? 'cursor-default' : 'hover:scale-110'}`}
                                                    >
                                                        <i className={`fa-solid fa-star ${booking.rating && star <= booking.rating ? 'text-yellow-400' : 'text-slate-300'}`}></i>
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Review Text Area */}
                                            {(!booking.review) ? (
                                                <div onClick={e => e.stopPropagation()}>
                                                    <textarea
                                                        value={reviews[bookingId] || ''}
                                                        onChange={(e) => setReviews({...reviews, [bookingId]: e.target.value})}
                                                        placeholder={t('placeholder.review')}
                                                        className="w-full p-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-yellow-400 outline-none text-slate-800"
                                                        rows={2}
                                                    />
                                                    <button 
                                                        onClick={() => handleSubmitReview(bookingId, booking.rating)}
                                                        className="mt-2 text-xs bg-yellow-400 hover:bg-yellow-500 text-white font-bold py-1 px-3 rounded transition-colors"
                                                    >
                                                        {t('btn.submitReview')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-600 italic border-l-2 border-yellow-200 pl-2">
                                                    "{booking.review}"
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">{t('label.passengers')}</div>
                                        <div className="text-slate-800 flex items-center gap-2">
                                            <i className="fa-solid fa-users text-slate-400"></i>
                                            {booking.passengers}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">{t('detail.luggage')}</div>
                                        <div className="text-slate-800 flex items-center gap-3">
                                            <span title={t('label.suitcases')}><i className="fa-solid fa-suitcase text-slate-400"></i> {booking.suitcases || 0}</span>
                                            <span title={t('label.handLuggage')}><i className="fa-solid fa-briefcase text-slate-400"></i> {booking.handLuggage || 0}</span>
                                        </div>
                                    </div>
                                    
                                    {(booking.babySeats || 0) + (booking.childSeats || 0) + (booking.boosterSeats || 0) > 0 && (
                                      <div className="sm:col-span-2">
                                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">{t('detail.extras')}</div>
                                        <div className="text-slate-800 flex flex-wrap gap-3">
                                            {booking.babySeats! > 0 && <span className="bg-white px-2 py-1 rounded border border-slate-200 text-xs"><i className="fa-solid fa-baby mr-1"></i> {booking.babySeats} Baby Seat</span>}
                                            {booking.childSeats! > 0 && <span className="bg-white px-2 py-1 rounded border border-slate-200 text-xs"><i className="fa-solid fa-child mr-1"></i> {booking.childSeats} Child Seat</span>}
                                            {booking.boosterSeats! > 0 && <span className="bg-white px-2 py-1 rounded border border-slate-200 text-xs"><i className="fa-solid fa-chair mr-1"></i> {booking.boosterSeats} Booster</span>}
                                        </div>
                                      </div>
                                    )}

                                    {booking.address && (
                                        <div className="sm:col-span-1">
                                            <div className="text-xs text-slate-400 uppercase font-semibold mb-1">
                                                {isFromAirport ? t('label.destinationAddress') : t('label.address')}
                                            </div>
                                            <div className="text-slate-800 flex items-center gap-2">
                                                <i className="fa-solid fa-map-pin text-slate-400"></i>
                                                <span className="truncate">{booking.address}</span>
                                            </div>
                                        </div>
                                    )}

                                    {booking.flightNumber && (
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase font-semibold mb-1">{t('label.flight')}</div>
                                            <div className="text-slate-800 flex items-center gap-2">
                                                <i className="fa-solid fa-plane text-slate-400"></i>
                                                {booking.flightNumber}
                                            </div>
                                        </div>
                                    )}
                                    <div className="sm:col-span-2">
                                        <div className="text-xs text-slate-400 uppercase font-semibold mb-1">{t('detail.paymentContact')}</div>
                                        <div className="text-slate-800 font-medium">{booking.customerName}</div>
                                        <div className="text-slate-500 flex flex-col sm:flex-row sm:gap-4 text-xs mt-1 mb-2">
                                            <span className="flex items-center gap-1"><i className="fa-solid fa-envelope text-slate-300"></i> {booking.customerEmail}</span>
                                            <span className="flex items-center gap-1"><i className="fa-solid fa-phone text-slate-300"></i> {booking.customerPhone}</span>
                                        </div>
                                        {booking.paymentMethod && (
                                            <div className="text-slate-800 text-xs flex items-center gap-2 bg-white p-2 rounded border border-slate-100 w-fit">
                                                {booking.paymentMethod === 'cash' ? <i className="fa-solid fa-money-bill-wave text-green-600"></i> : <i className="fa-solid fa-credit-card text-blue-600"></i>}
                                                {t('detail.payment')} {booking.paymentMethod === 'cash' ? t('payment.cash') : t('payment.card')}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="text-center mt-2">
                                <i className={`fa-solid fa-chevron-down text-slate-300 text-xs transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
                            </div>
                        </div>

                        {!isCancelled && (
                          <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100 flex-wrap">
                             <button 
                              onClick={(e) => handleAddToCalendar(e, booking)}
                              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                              <i className="fa-regular fa-calendar-plus"></i>
                              {t('btn.addToCalendar')}
                            </button>
                            <div className="flex-1"></div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); initiateCancel(booking); }}
                              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                            >
                              {t('btn.cancel')}
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); initiateModify(booking); }}
                              className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
                            >
                              {t('btn.modify')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }))}
                  </div>

                  {/* Static Policy Section */}
                  <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-circle-info"></i> {t('policy.title')}
                    </h3>
                    <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                      <li>{t('policy.freeCancellation')}</li>
                      <li>{t('policy.within24hFee')}</li>
                      <li>{t('policy.noShows')}</li>
                      <li>{t('policy.refundProcess')}</li>
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Action Confirmation Overlay Modal */}
        {confirmation && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100">
                <div className="text-center mb-6">
                   <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmation.type === 'modify' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                      <i className={`fa-solid text-2xl ${confirmation.type === 'cancel' ? 'fa-triangle-exclamation' : confirmation.type === 'modify' ? 'fa-pen-to-square' : 'fa-user-slash'}`}></i>
                   </div>
                   <h3 className="text-xl font-bold text-slate-800 mb-2">
                     {confirmation.type === 'cancel' ? t('btn.cancel') : confirmation.type === 'modify' ? t('btn.modify') : t('btn.deleteAccount')}?
                   </h3>
                   
                   {confirmation.type === 'cancel' && confirmation.booking && (
                     <div className="text-sm text-slate-600 space-y-2">
                        <p>{t('confirm.cancelRide', { dest: confirmation.booking.dropoffLocation })}</p>
                        <div className="bg-red-50 p-3 rounded text-left text-xs text-red-800 mt-2">
                           <strong>{t('confirm.cancelNote')}</strong>
                        </div>
                     </div>
                   )}

                   {confirmation.type === 'modify' && confirmation.booking && (
                      <div className="text-sm text-slate-600 space-y-2">
                         <p>{t('confirm.modifyRide')}</p>
                         <div className="bg-amber-50 p-3 rounded text-left text-xs text-amber-800 mt-2">
                           <strong>{t('confirm.modifyNote')}</strong>
                        </div>
                      </div>
                   )}

                   {confirmation.type === 'delete_account' && (
                      <div className="text-sm text-slate-600 space-y-2">
                         <p>{t('confirm.deleteAccount')}</p>
                         <div className="bg-red-50 p-3 rounded text-left text-xs text-red-800 mt-2">
                           <strong>{t('confirm.deleteNote')}</strong>
                        </div>
                      </div>
                   )}
                </div>

                <div className="flex gap-3">
                   <button 
                     onClick={() => setConfirmation(null)}
                     className="flex-1 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                   >
                     {t('btn.back')}
                   </button>
                   <button 
                     onClick={
                       confirmation.type === 'cancel' ? proceedWithCancellation : 
                       confirmation.type === 'modify' ? proceedWithModification :
                       proceedWithAccountDeletion
                     }
                     className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${confirmation.type === 'modify' ? 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30' : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'}`}
                   >
                      {confirmation.type === 'modify' ? t('btn.continue') : confirmation.type === 'cancel' ? 'Cancel Booking' : t('btn.confirm')}
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* Change Password Modal (Sub-modal) */}
        <ChangePasswordModal 
            isOpen={showChangePassword} 
            onClose={() => setShowChangePassword(false)} 
            onSaved={() => setToast({ message: t('auth.passwordChanged'), type: 'success' })}
        />

        {/* Toast Notification */}
        {toast && (
          <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-[60] animate-fade-in-up transition-all ${toast.type === 'success' ? 'bg-slate-800 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-primary-600 text-white'}`}>
             <i className={`fa-solid ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}`}></i>
             <span className="font-medium text-sm">{toast.message}</span>
          </div>
        )}

      </div>
    </div>
  );
};
