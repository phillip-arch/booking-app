
import React, { useState, useEffect } from 'react';
import { BookingWidget } from './components/BookingWidget';
import { AIChat } from './components/AIChat';
import { PastBookings } from './components/PastBookings';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { BookingData, User } from './types';
import { authService } from './services/authService';
import { bookingService } from './services/bookingService';
import { emailService } from './services/emailService';
import { useLanguage } from './contexts/LanguageContext';
import { LANGUAGES, LanguageCode } from './translations';
import { VIENNA_AIRPORT } from './constants';

const App: React.FC = () => {
  const [bookingComplete, setBookingComplete] = useState<BookingData | null>(null);
  const [lastActionWasUpdate, setLastActionWasUpdate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyTab, setHistoryTab] = useState<'bookings' | 'profile'>('bookings');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [editingBooking, setEditingBooking] = useState<BookingData | null>(null);
  const [activeReminders, setActiveReminders] = useState<BookingData[]>([]);
  const { t, language, setLanguage } = useLanguage();
  
  // Auth State
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    return authService.getStoredUserQuick();
  });
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        await authService.ensureSessionFromStorage?.();
        if (!isMounted) return;

        const current = (await authService.getCurrentUser()) || authService.getStoredUserQuick();
        if (!isMounted) return;

        if (current) {
          setUser(current);
          loadReminders(current.id, current.email);
        } else {
          setUser(null);
        }

        unsubscribe = authService.onAuthStateChange((currentUser) => {
          if (!isMounted) return;
          setUser(currentUser);
          loadReminders(currentUser?.id, currentUser?.email || undefined);
        });
      } catch (error) {
        console.error('Auth initialization failed', error);
        if (isMounted) {
          setUser(null);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  const loadReminders = async (userId?: string, email?: string) => {
    try {
      const bookings = await bookingService.getBookings(userId, email);
      const now = new Date();
      const upcomingReminders = bookings.filter(b => {
        if (!b.reminderSet || b.status === 'cancelled') return false;
        const bookingTime = new Date(`${b.date}T${b.time}`);
        return bookingTime > now;
      });
      // Sort by date soonest first
      upcomingReminders.sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
      setActiveReminders(upcomingReminders);
    } catch (e) {
      console.error("Failed to load reminders", e);
    }
  };

  const handleBookingComplete = async (data: BookingData) => {
    try {
        // Refresh user from Supabase to avoid stale state after refresh (if logged in)
        const activeUser = user || await authService.getCurrentUser();
        if (activeUser) {
            setUser(activeUser);
        }

        // Safety timeout so UI cannot hang forever
        const timeout = (label: string) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), 12000));

        const isUpdate = Boolean(editingBooking?.id);

        console.log('Saving booking payload', { ...data, userId: activeUser?.id });
        const savedBooking = await Promise.race([
          bookingService.saveBooking({ ...data, userId: activeUser?.id }, activeUser?.id),
          timeout('Booking save')
        ]);
        
        console.log('Booking saved, sending confirmation email');
        await Promise.race([
          emailService.sendBookingConfirmation(savedBooking),
          timeout('Email send')
        ]);

        setLastActionWasUpdate(isUpdate);
        setBookingComplete(savedBooking);
        setEditingBooking(null); // Clear editing state
        loadReminders(activeUser?.id, activeUser?.email); // Refresh reminders
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
        console.error("Booking failed:", e);
        alert(e?.message || "There was an error saving your booking. Please try again.");
    }
  };

  // Migrate any guest/local bookings into the user's account after login
  const migrateLocalBookings = async (account: User) => {
    try {
      const raw = localStorage.getItem('vie_ride_bookings');
      if (!raw) return;
      const items: BookingData[] = JSON.parse(raw) || [];
      const toSync = items.filter(b => b && (!b.id || b.id.startsWith('local_')));
      if (toSync.length === 0) {
        localStorage.removeItem('vie_ride_bookings');
        return;
      }
      for (const b of toSync) {
        await bookingService.saveBooking(
          {
            ...b,
            id: undefined, // force insert
            userId: account.id,
            customerEmail: b.customerEmail || account.email,
            customerName: b.customerName || account.name
          },
          account.id
        );
      }
      localStorage.removeItem('vie_ride_bookings');
    } catch (e) {
      console.warn('Failed to migrate local bookings', e);
    }
  };

  const handleModifyBooking = (booking: BookingData) => {
    setEditingBooking(booking);
    setShowHistory(false);
    setBookingComplete(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = async (loggedInUser: User) => {
    // Auth state listener will handle setUser; also set immediately for snappier UI
    setUser(loggedInUser);
    await migrateLocalBookings(loggedInUser);
    loadReminders(loggedInUser.id, loggedInUser.email);
    setShowAuthModal(false);
    if (loggedInUser.role === 'admin') {
      setShowAdminDashboard(true);
    } else {
      setHistoryTab('profile');
      setShowHistory(true);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setShowAdminDashboard(false);
    setShowHistory(false);
    setHistoryTab('bookings');
    setBookingComplete(null);
    setEditingBooking(null);
    setShowAuthModal(false);
    loadReminders(undefined);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetBooking = () => {
    setBookingComplete(null);
    setEditingBooking(null);
    setLastActionWasUpdate(false);
  };

  const handleOpenProfile = () => {
    setHistoryTab('profile');
    setShowHistory(true);
  };

  const handleOpenHistory = () => {
    setHistoryTab('bookings');
    setShowHistory(true);
  }

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    // Handle both YYYY-MM-DD and DD-MM-YYYY input, prefer DD/MM/YYYY output
    if (parts[0].length === 4) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return `${parts[0]}/${parts[1]}/${parts[2]}`;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 cursor-pointer" onClick={resetBooking}>
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white text-xl">
                <i className="fa-solid fa-plane-departure"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-none">FLYCab</h1>
                <p className="text-xs text-slate-500 font-medium">Airport Transfers</p>
              </div>
            </div>
            <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-600 items-center">
              
              {/* Language Selector */}
              <div className="relative">
                <button 
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <span>{currentLang.flag}</span>
                  <span>{currentLang.code.toUpperCase()}</span>
                  <i className="fa-solid fa-chevron-down text-xs"></i>
                </button>
                {isLangMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setIsLangMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-3 text-slate-700"
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <a href="#" className="hover:text-primary-600 transition-colors">{t('nav.locations')}</a>
              <a href="#" className="hover:text-primary-600 transition-colors">{t('nav.fleet')}</a>
              
              {/* ADMIN LINK (Desktop) */}
              {user && user.role === 'admin' && (
                <button 
                  onClick={() => setShowAdminDashboard(true)}
                  className="text-primary-600 hover:text-primary-800 font-bold transition-colors flex items-center gap-2"
                >
                  <i className="fa-solid fa-user-shield"></i> {t('nav.admin')}
                </button>
              )}

              <button 
                onClick={handleOpenHistory}
                className="text-slate-600 hover:text-primary-600 transition-colors flex items-center gap-2"
              >
                <i className="fa-solid fa-clock-rotate-left"></i> {t('nav.myBookings')}
              </button>
              
              {user ? (
                <button 
                  onClick={handleOpenHistory} 
                  className="flex items-center gap-2 pl-4 border-l border-slate-200 text-slate-800 font-semibold"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name.split(' ')[0]}</span>
                </button>
              ) : (
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-colors"
                >
                  {t('nav.signIn')}
                </button>
              )}
            </nav>
            
            <div className="md:hidden flex items-center gap-4 relative">
               {/* Mobile Lang Selector */}
               <button 
                 onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                 className="text-xl flex items-center gap-1 p-1"
               >
                 {currentLang.flag}
                 <i className="fa-solid fa-chevron-down text-[10px] text-slate-400"></i>
               </button>

               {isLangMenuOpen && (
                 <div className="absolute top-12 right-0 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                   {LANGUAGES.map(lang => (
                     <button
                       key={lang.code}
                       onClick={() => { setLanguage(lang.code); setIsLangMenuOpen(false); }}
                       className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-slate-700 border-b border-slate-50 last:border-0"
                     >
                       <span className="text-lg">{lang.flag}</span>
                       <span className="text-sm font-medium">{lang.name}</span>
                     </button>
                   ))}
                 </div>
               )}

               {/* ADMIN LINK (Mobile) */}
               {user && user.role === 'admin' && (
                 <button 
                   onClick={() => setShowAdminDashboard(true)}
                   className="text-primary-600 hover:text-primary-800 transition-colors"
                   title={t('nav.admin')}
                 >
                   <i className="fa-solid fa-user-shield text-xl"></i>
                 </button>
               )}

               {user ? (
                 <div onClick={handleOpenHistory} className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold cursor-pointer">
                    {user.name.charAt(0).toUpperCase()}
                 </div>
               ) : (
                 <button onClick={() => setShowAuthModal(true)} className="text-primary-600 font-bold text-sm">{t('nav.signIn')}</button>
               )}
               <button 
                className="text-slate-600"
                onClick={handleOpenHistory}
              >
                <i className="fa-solid fa-clock-rotate-left text-xl"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {!bookingComplete ? (
          <>
            {/* Reminder Banner */}
            {activeReminders.length > 0 && (
              <div className="bg-amber-50 border-b border-amber-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                  <div className="flex items-center gap-3 text-sm text-amber-900">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <i className="fa-solid fa-bell text-amber-600"></i>
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="font-semibold">{t('app.reminder')}</span>
                      <span>
                        {activeReminders[0].pickupLocation} <i className="fa-solid fa-arrow-right text-xs"></i> {activeReminders[0].dropoffLocation}
                      </span>
                    </div>
                    <button 
                        onClick={handleOpenHistory}
                        className="text-amber-700 font-semibold hover:text-amber-900 underline text-xs sm:text-sm"
                    >
                        {t('app.viewDetails')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Hero Section */}
            <section className="relative bg-slate-900 py-20 lg:py-32 overflow-hidden">
              <div className="absolute inset-0 z-0 opacity-40">
                <img 
                  src="https://images.unsplash.com/photo-1526582522646-372074e6281e?auto=format&fit=crop&q=80&w=2000" 
                  alt="Vienna" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-50 z-0"></div>
              
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                  {t('hero.title')} <br/>
                  <span className="text-primary-400">{t('hero.subtitle')}</span>
                </h2>
                <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
                  {t('hero.desc')}
                </p>
              </div>

              <div className="relative z-20 px-4">
                <div className="max-w-3xl mx-auto">
                  <BookingWidget 
                    onComplete={handleBookingComplete} 
                    initialData={editingBooking}
                    currentUser={user}
                    onOpenProfile={handleOpenProfile}
                    onOpenLogin={() => setShowAuthModal(true)}
                  />
                </div>
              </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-slate-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <h3 className="text-3xl font-bold text-slate-900">{t('app.whyChoose')}</h3>
                  <p className="mt-4 text-slate-600">{t('app.whyChooseDesc')}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary-600 text-2xl">
                      <i className="fa-solid fa-clock"></i>
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 mb-3">{t('features.punctual')}</h4>
                    <p className="text-slate-500">{t('features.punctualDesc')}</p>
                  </div>
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary-600 text-2xl">
                      <i className="fa-solid fa-euro-sign"></i>
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 mb-3">{t('features.fixed')}</h4>
                    <p className="text-slate-500">{t('features.fixedDesc')}</p>
                  </div>
                  <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary-600 text-2xl">
                      <i className="fa-solid fa-shield-halved"></i>
                    </div>
                    <h4 className="text-xl font-bold text-slate-800 mb-3">{t('features.secure')}</h4>
                    <p className="text-slate-500">{t('features.secureDesc')}</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-slate-50">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl text-center max-w-lg w-full">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fa-solid fa-check text-4xl text-green-500"></i>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                {lastActionWasUpdate ? t('app.bookingUpdated') : t('app.bookingConfirmed')}
              </h2>
              <p className="text-slate-600 mb-8">
                {t('app.thankYou', { name: bookingComplete.customerName })} {t('app.scheduled')}
                <br/>
                {t('app.emailSent', { email: bookingComplete.customerEmail })}
              </p>
              
              <div className="bg-slate-50 rounded-xl p-6 text-left space-y-3 mb-8 border border-slate-100">
                 <div className="flex justify-between items-start">
                   <span className="text-slate-500 mt-1">{t('summary.route')}</span>
                   <div className="text-right">
                       <span className="font-semibold text-slate-800 block">{bookingComplete.pickupLocation.split('(')[0]}</span>
                       <i className="fa-solid fa-arrow-down text-xs text-slate-400 my-1 block text-center w-full"></i>
                       <span className="font-semibold text-slate-800 block">{bookingComplete.dropoffLocation.split('(')[0]}</span>
                   </div>
                 </div>

                 {bookingComplete.address && (
                    <div className="flex justify-between items-start border-t border-slate-100 pt-3 mt-3">
                       <span className="text-slate-500 mt-1">
                           {bookingComplete.pickupLocation === VIENNA_AIRPORT ? t('label.destinationAddress') : `${t('label.pickup')} ${t('label.address')}`}
                       </span>
                       <span className="font-medium text-slate-800 text-right max-w-[200px]">{bookingComplete.address}</span>
                    </div>
                 )}

                 <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-3">
                    <span className="text-slate-500">{t('summary.requirements')}</span>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-slate-800" title={t('label.passengers')}>
                            <i className="fa-solid fa-user text-xs text-slate-400"></i> {bookingComplete.passengers}
                        </span>
                        <span className="flex items-center gap-1 text-slate-800" title={t('label.suitcases')}>
                            <i className="fa-solid fa-suitcase text-xs text-slate-400"></i> {bookingComplete.suitcases}
                        </span>
                        <span className="flex items-center gap-1 text-slate-800" title={t('label.handLuggage')}>
                            <i className="fa-solid fa-briefcase text-xs text-slate-400"></i> {bookingComplete.handLuggage}
                        </span>
                    </div>
                 </div>

                 <div className="flex justify-between items-center border-t border-slate-100 pt-3 mt-3">
                    <span className="text-slate-500">{t('label.paymentMethod')}</span>
                    <span className="font-medium text-slate-800 capitalize">
                        {bookingComplete.paymentMethod === 'cash' && t('payment.cash')}
                        {bookingComplete.paymentMethod === 'card' && t('payment.card')}
                        {bookingComplete.paymentMethod === 'invoice' && t('payment.invoice')}
                    </span>
                 </div>

                 <div className="flex justify-between border-t border-slate-100 pt-3 mt-3">
                   <div className="text-slate-500 flex items-center gap-2">
                       <i className="fa-regular fa-calendar"></i>
                       {bookingComplete.pickupLocation === VIENNA_AIRPORT ? 
                         <i className="fa-solid fa-plane-arrival"></i> : 
                         <i className="fa-solid fa-landmark"></i>
                       }
                   </div>
                   <div className="text-right">
                       <span className="font-bold text-slate-800 block text-lg">{formatDate(bookingComplete.date)}</span>
                       <span className="text-slate-600 text-sm block">
                           {bookingComplete.pickupLocation === VIENNA_AIRPORT ? t('label.landingTime') : t('label.pickupTime')} {bookingComplete.time}
                       </span>
                       {bookingComplete.pickupLocation === VIENNA_AIRPORT && bookingComplete.flightNumber && (
                         <span className="text-slate-500 text-xs block mt-0.5">
                           {t('label.flight')}: {bookingComplete.flightNumber}
                         </span>
                       )}
                   </div>
                 </div>
                 <div className="flex justify-between border-t border-slate-200 pt-3 mt-3">
                   <span className="text-slate-800 font-bold">{t('app.price')}</span>
                   <div className="text-right">
                        <span className="font-bold text-primary-700 text-xl">€{bookingComplete.price}</span>
                        {user?.isCorporate && bookingComplete.paymentMethod === 'invoice' && (
                            <div className="text-xs text-indigo-600 font-semibold mt-1">
                                {user.companyName ? `Billed to ${user.companyName}` : t('payment.invoice')}
                            </div>
                        )}
                   </div>
                 </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={resetBooking}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  {t('app.bookAnother')}
                </button>
                <button 
                  onClick={() => {
                    if (user) {
                        setBookingComplete(null);
                        handleOpenHistory();
                    } else {
                        setShowAuthModal(true);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-3 rounded-xl transition-all"
                >
                  {user ? t('app.viewHistory') : t('nav.signIn')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                 <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center">
                    <i className="fa-solid fa-plane text-white text-sm"></i>
                 </div>
                 <span className="text-xl font-bold">FLYCab</span>
              </div>
              <p className="text-slate-400 max-w-sm text-sm">
                {t('footer.desc')}
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">{t('footer.contact')}</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><i className="fa-solid fa-phone mr-2 text-primary-500"></i> +43 1 234 5678</li>
                <li><i className="fa-solid fa-envelope mr-2 text-primary-500"></i> booking@vieride.com</li>
                <li><i className="fa-solid fa-location-dot mr-2 text-primary-500"></i> Vienna Airport, Office 23</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">{t('footer.legal')}</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">{t('footer.privacy')}</a></li>
                <li><a href="#" className="hover:text-white">{t('footer.terms')}</a></li>
                <li><a href="#" className="hover:text-white">{t('footer.impressum')}</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-12 pt-8 text-center text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} {t('footer.companyName')}. {t('footer.rights')}
          </div>
        </div>
      </footer>

      {/* AI Assistant */}
      <AIChat />

      {/* Past Bookings & Account Modal */}
      <PastBookings 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
        onModify={handleModifyBooking}
        onDataChange={() => loadReminders(user?.id, user?.email)}
        currentUser={user}
        onLogout={handleLogout}
        onLoginRequest={() => setShowAuthModal(true)}
        initialTab={historyTab}
      />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Admin Dashboard */}
      {user && user.role === 'admin' && (
        <AdminDashboard 
          isOpen={showAdminDashboard}
          onClose={() => setShowAdminDashboard(false)}
        />
      )}
    </div>
  );
};

export default App;
