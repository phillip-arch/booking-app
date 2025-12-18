
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { VIENNA_AIRPORT, CITIES, VEHICLES, BASE_RATE_PER_KM, SERVICE_TIPS } from '../constants';
import { BookingData, Vehicle, User } from '../types';
import { getAddressSuggestions } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { authService } from '../services/authService';

interface BookingWidgetProps {
  onComplete: (data: BookingData) => void;
  initialData?: BookingData | null;
  currentUser?: User | null;
  onOpenProfile?: () => void;
  onOpenLogin?: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

// Regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9\s-]{7,20}$/;

export const BookingWidget: React.FC<BookingWidgetProps> = ({ onComplete, initialData, currentUser, onOpenProfile, onOpenLogin }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [direction, setDirection] = useState<'from_airport' | 'to_airport'>('from_airport');
  const [selectedCity, setSelectedCity] = useState(CITIES[0].name);
  const [date, setDate] = useState('');
  const [time, setTime] = useState(''); 
  const [passengers, setPassengers] = useState(0);
  const [suitcases, setSuitcases] = useState(-1);
  const [handLuggage, setHandLuggage] = useState(-1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  // Child Seats
  const [hasChildren, setHasChildren] = useState(false);
  const [babySeats, setBabySeats] = useState(0);
  const [childSeats, setChildSeats] = useState(0);
  const [boosterSeats, setBoosterSeats] = useState(0);

  // User Details & Payment
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'card'|'invoice'>('cash');
  
  const [isForMyself, setIsForMyself] = useState(true);

  // Address Autocomplete
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  
  // Validation
  const [timeError, setTimeError] = useState<string | null>(null);
  const [flightError, setFlightError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [serviceTip, setServiceTip] = useState<string>('');
  
  const addressInputRef = useRef<HTMLInputElement>(null);
  const ignoreFetchRef = useRef(false);
  
  // Ref for Auto-Scroll
  const widgetRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const today = new Date().toISOString().split('T')[0];

  // Auto-scroll effect
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    
    if (widgetRef.current) {
        const headerOffset = 100; // Approx header height + top margin
        const elementPosition = widgetRef.current.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
  }, [step]);

  // 1. Optimization: Memoize distance calculation
  const distance = useMemo(() => {
    return CITIES.find(c => c.name === selectedCity)?.distanceKm || 20;
  }, [selectedCity]);

  // 2. Optimization: Memoize price calculation
  const vehiclePrices = useMemo(() => {
    // Calculate Base Price first
    const prices = VEHICLES.reduce((acc, vehicle) => {
      acc[vehicle.id] = Math.round(vehicle.basePrice + (distance * BASE_RATE_PER_KM * vehicle.priceMultiplier));
      return acc;
    }, {} as Record<string, number>);

    return prices;
  }, [distance]);

  // 2.5 Logic: Calculate Final Discounted Price
  const getFinalPrice = (basePrice: number) => {
      if (currentUser?.isCorporate && currentUser.discount) {
          const discountFactor = currentUser.discount / 100;
          return Math.round(basePrice * (1 - discountFactor));
      }
      return basePrice;
  };

  // Check if all mandatory fields in Step 2 are selected
  const areDetailsSelected = passengers > 0 && suitcases > -1 && handLuggage > -1;

  // 3. New Logic: Automatically determine best vehicle based on inputs
  const bestVehicle = useMemo(() => {
    // If details aren't fully selected, don't recommend yet
    if (!areDetailsSelected) return undefined;
    
    return VEHICLES.find(v => passengers <= v.passengers && suitcases <= v.luggage);
  }, [passengers, suitcases, handLuggage, areDetailsSelected]);

  // Auto-select the best vehicle whenever inputs change, BUT allow user override if valid
  useEffect(() => {
    if (bestVehicle) {
      setSelectedVehicleId(bestVehicle.id);
    } else if (passengers > 0 && areDetailsSelected) {
      // If passengers selected but no car fits (e.g. 8 pax, max car 3), select none
      setSelectedVehicleId(null);
    } else if (!areDetailsSelected) {
      setSelectedVehicleId(null);
    }
  }, [bestVehicle, passengers, areDetailsSelected]);

  // Auto-fill user details and logic
  useEffect(() => {
    if (currentUser && !initialData) {
        setName(currentUser.name);
        setEmail(currentUser.email);
        
        // Auto-select Invoice if corporate
        if (currentUser.isCorporate) {
            setPaymentMethod('invoice');
        }
    }
  }, [currentUser, initialData, isForMyself]);

  const handleForMyselfChange = (checked: boolean) => {
      setIsForMyself(checked);
      if (checked) {
          if (currentUser?.phoneNumber) setPhone(currentUser.phoneNumber);
          if (currentUser?.homeAddress) setAddress(currentUser.homeAddress);
      } else {
          setAddress('');
      }
  };

  // Service Tips Logic
  useEffect(() => {
      // If user is NOT logged in (Guest) -> Show "Create Account" tip key
      if (!currentUser && onOpenLogin) {
          setServiceTip('tip.createAccount');
          return;
      }
      
      // If User is Logged In
      if (currentUser) {
          // Check if they need to save addresses
          if (!currentUser.homeAddress && !currentUser.businessAddress) {
               setServiceTip('tip.saveAddress');
          } else {
               // Show random operational tip (exclude the "Create Account" tip)
               const operationalTips = SERVICE_TIPS.filter(tip => tip !== 'tip.createAccount');
               const randomTipKey = operationalTips[Math.floor(Math.random() * operationalTips.length)];
               setServiceTip(randomTipKey);
          }
      }
  }, [currentUser, onOpenLogin]);

  useEffect(() => {
    if (initialData) {
      setEditingId(initialData.id);
      const isFromAirport = initialData.pickupLocation === VIENNA_AIRPORT;
      setDirection(isFromAirport ? 'from_airport' : 'to_airport');
      
      const city = isFromAirport ? initialData.dropoffLocation : initialData.pickupLocation;
      const cityExists = CITIES.find(c => c.name === city);
      setSelectedCity(cityExists ? city : CITIES[0].name);

      setDate(initialData.date);
      setTime(initialData.time || ''); 
      setPassengers(initialData.passengers);
      setSuitcases(initialData.suitcases ?? 0);
      setHandLuggage(initialData.handLuggage ?? 0);
      
      setName(initialData.customerName);
      setEmail(initialData.customerEmail);
      setPhone(initialData.customerPhone);
      setAddress(initialData.address || '');
      setFlightNumber(initialData.flightNumber || '');
      setPaymentMethod(initialData.paymentMethod || 'cash');
      setStep(1);
    } else {
      setEditingId(undefined);
      if (currentUser && isForMyself) {
          if (currentUser.phoneNumber) setPhone(currentUser.phoneNumber);
          if (currentUser.homeAddress) setAddress(currentUser.homeAddress);
      }
    }
  }, [initialData, currentUser]); 

  useEffect(() => {
    let isCancelled = false; 
    if (ignoreFetchRef.current) {
        ignoreFetchRef.current = false;
        return;
    }
    const delayDebounceFn = setTimeout(async () => {
      if (address.length >= 3 && step === 1) {
        setIsFetchingAddress(true);
        const suggestions = await getAddressSuggestions(selectedCity, address);
        if (!isCancelled) {
            setAddressSuggestions(suggestions);
            setIsFetchingAddress(false);
            if (suggestions.length > 0) setShowSuggestions(true);
        }
      } else {
        if (!isCancelled) {
            setAddressSuggestions([]);
            setShowSuggestions(false);
        }
      }
    }, 600); 
    return () => {
        isCancelled = true;
        clearTimeout(delayDebounceFn);
    };
  }, [address, selectedCity, step]);

  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
    setAddress('');
    setAddressSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleAddressSelect = (suggestion: string) => {
    ignoreFetchRef.current = true;
    setAddress(suggestion);
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const handleQuickSelect = (addr: string) => {
    ignoreFetchRef.current = true;
    setAddress(addr);
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const handleTimeChange = (type: 'hour' | 'minute', val: string) => {
      const parts = (time || '').split(':');
      let h = parts[0] || '';
      let m = parts[1] || '';
      if (type === 'hour') h = val;
      else m = val;
      setTime(`${h}:${m}`);
      setTimeError(null);
  };

  const validateBookingLeadTime = (dateStr: string, timeStr: string): string | null => {
    if (!dateStr || !timeStr || timeStr.split(':').some(part => !part)) return t('err.selectDate');
    const selectedDateTime = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();
    if (isNaN(selectedDateTime.getTime())) return t('err.invalidDate');
    if (selectedDateTime < now) return t('err.pastDate');
    const pickupHour = parseInt(timeStr.split(':')[0], 10);
    const isDayTime = pickupHour >= 7 && pickupHour < 22;
    const diffHours = (selectedDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < (isDayTime ? 2 : 8)) return isDayTime ? t('err.leadTimeDay') : t('err.leadTimeNight');
    return null;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeError(null);
    setFlightError(null);

    if (!address.trim()) { addressInputRef.current?.focus(); return; }
    if (direction === 'from_airport' && !flightNumber.trim()) { setFlightError(t('err.flightRequired')); return; }
    
    const timeValidationMsg = validateBookingLeadTime(date, time);
    if (timeValidationMsg) { setTimeError(timeValidationMsg); return; }

    setStep(2);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setSubmitError(null);

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) { setContactError(t('err.invalidEmail')); return; }
    if (!PHONE_REGEX.test(trimmedPhone)) { setContactError(t('err.invalidPhone')); return; }

    const vehicle = VEHICLES.find(v => v.id === selectedVehicleId);
    if (!vehicle) return;

    const basePrice = vehiclePrices[vehicle.id];
    const finalPrice = getFinalPrice(basePrice);

    setIsSubmitting(true);
    try {
      if (currentUser && isForMyself) {
        const needsUpdate = (!currentUser.phoneNumber && trimmedPhone) || (!currentUser.homeAddress && address);
        if (needsUpdate) {
          await authService.updateUserProfile(currentUser.id, {
            phoneNumber: currentUser.phoneNumber || trimmedPhone,
            homeAddress: currentUser.homeAddress || address
          });
        }
      }

      await onComplete({
        id: editingId,
        pickupLocation: direction === 'from_airport' ? VIENNA_AIRPORT : selectedCity,
        dropoffLocation: direction === 'from_airport' ? selectedCity : VIENNA_AIRPORT,
        address,
        date,
        time,
        passengers,
        suitcases,
        handLuggage,
        selectedVehicleId,
        customerName: name.trim(),
        customerEmail: trimmedEmail,
        customerPhone: trimmedPhone,
        flightNumber: direction === 'from_airport' ? flightNumber : '',
        price: finalPrice, 
        babySeats,
        childSeats,
        boosterSeats,
        paymentMethod
      });
    } catch (err: any) {
      console.error('Booking submit error', err);
      setSubmitError(err?.message || 'Failed to submit booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderAddressInput = () => (
      <div className="relative mt-2" ref={addressInputRef}>
         <i className="fa-solid fa-map-pin absolute left-4 top-3.5 text-slate-400 z-10"></i>
         <input 
            type="text" required autoComplete="off" value={address}
            onChange={(e) => { setAddress(e.target.value); setShowSuggestions(true); }}
            placeholder={t('placeholder.address')}
            className="text-slate-900 w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
         />
         {isFetchingAddress && (<div className="absolute right-3 top-3.5 text-slate-400"><i className="fa-solid fa-circle-notch fa-spin"></i></div>)}
         {isForMyself && currentUser && (currentUser.homeAddress || currentUser.businessAddress) && (
             <div className="flex gap-2 mt-2">
                 {currentUser.homeAddress && address !== currentUser.homeAddress && (
                     <button type="button" onClick={() => handleQuickSelect(currentUser.homeAddress!)} className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 flex items-center gap-1"><i className="fa-solid fa-house"></i> {t('label.useHome')}</button>
                 )}
                 {currentUser.businessAddress && address !== currentUser.businessAddress && (
                     <button type="button" onClick={() => handleQuickSelect(currentUser.businessAddress!)} className="text-xs bg-slate-50 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 flex items-center gap-1"><i className="fa-solid fa-briefcase"></i> {t('label.useBusiness')}</button>
                 )}
             </div>
         )}
         {showSuggestions && addressSuggestions.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in">
                {addressSuggestions.map((suggestion, idx) => (
                    <li key={idx} onClick={() => handleAddressSelect(suggestion)} className="px-4 py-3 hover:bg-primary-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0 flex items-center gap-2"><i className="fa-solid fa-location-dot text-slate-300"></i>{suggestion}</li>
                ))}
            </ul>
         )}
      </div>
  );

  return (
    <div ref={widgetRef} className="bg-white rounded-2xl shadow-xl overflow-visible max-w-4xl mx-auto border border-slate-100 relative">
      <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center text-sm font-medium text-slate-500 rounded-t-3xl">
        <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 1 ? 'bg-primary-100 text-primary-700' : 'bg-slate-200'}`}>1</div><span className="hidden sm:inline">{t('step.1')}</span>
        </div>
        <div className={`h-1 flex-1 mx-4 ${step >= 2 ? 'bg-primary-500' : 'bg-slate-200'} rounded`}></div>
        <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 2 ? 'bg-primary-100 text-primary-700' : 'bg-slate-200'}`}>2</div><span className="hidden sm:inline">{t('step.2')}</span>
        </div>
        <div className={`h-1 flex-1 mx-4 ${step >= 3 ? 'bg-primary-500' : 'bg-slate-200'} rounded`}></div>
        <div className={`flex items-center ${step >= 3 ? 'text-primary-600' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${step >= 3 ? 'bg-primary-100 text-primary-700' : 'bg-slate-200'}`}>3</div><span className="hidden sm:inline">{t('step.3')}</span>
        </div>
      </div>

      <div className="p-6 md:p-8">
        {step === 1 && (
          <form onSubmit={handleSearch} className="space-y-6">
             {editingId && (<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm mb-4 flex items-center gap-2"><i className="fa-solid fa-pen-to-square"></i><span>{t('msg.modifying')}</span></div>)}
             {currentUser && (
                <div className="flex items-center gap-2 mb-2">
                    <input type="checkbox" id="forMyself" checked={isForMyself} onChange={(e) => handleForMyselfChange(e.target.checked)} className="w-4 h-4 text-primary-600 rounded" />
                    <label htmlFor="forMyself" className="text-sm font-medium text-slate-700 cursor-pointer">{t('label.bookingForMyself')}</label>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1 md:col-span-2 flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
                <button type="button" onClick={() => { setDirection('from_airport'); setFlightNumber(''); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${direction === 'from_airport' ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}>{t('btn.fromAirport')}</button>
                <button type="button" onClick={() => { setDirection('to_airport'); setFlightNumber(''); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${direction === 'to_airport' ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'}`}>{t('btn.toAirport')}</button>
              </div>

              <div className="space-y-2 relative">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('label.pickup')}</label>
                <div className="relative">
                  <i className={`fa-solid ${direction === 'from_airport' ? 'fa-plane' : 'fa-location-dot'} absolute left-4 top-3.5 text-slate-400`}></i>
                  {direction === 'from_airport' ? (
                    <input type="text" disabled value={VIENNA_AIRPORT} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
                  ) : (
                    <select value={selectedCity} onChange={handleCityChange} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg outline-none text-slate-900">
                      {CITIES.map(city => <option key={city.name} value={city.name}>{city.name} ({city.country})</option>)}
                    </select>
                  )}
                </div>
                {direction === 'to_airport' && renderAddressInput()}
              </div>

              <div className="space-y-2 relative">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('label.dropoff')}</label>
                <div className="relative">
                  <i className={`fa-solid ${direction === 'to_airport' ? 'fa-plane' : 'fa-location-dot'} absolute left-4 top-3.5 text-slate-400`}></i>
                  {direction === 'to_airport' ? (
                    <input type="text" disabled value={VIENNA_AIRPORT} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed" />
                  ) : (
                    <select value={selectedCity} onChange={handleCityChange} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg outline-none text-slate-900">
                      {CITIES.map(city => <option key={city.name} value={city.name}>{city.name} ({city.country})</option>)}
                    </select>
                  )}
                </div>
                 {direction === 'from_airport' && renderAddressInput()}
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('label.date')}</label>
                <input type="date" min={today} required value={date} onChange={(e) => { setDate(e.target.value); setTimeError(null); }} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{direction === 'from_airport' ? t('label.landingTime') : t('label.pickupTime')}</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <select value={time ? time.split(':')[0] : ''} onChange={(e) => handleTimeChange('hour', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg appearance-none text-slate-900"><option value="" disabled>--</option>{HOURS.map(h => <option key={h} value={h}>{h}</option>)}</select>
                    </div>
                    <span className="self-center font-bold text-slate-400">:</span>
                    <div className="relative flex-1">
                        <select value={time ? time.split(':')[1] : ''} onChange={(e) => handleTimeChange('minute', e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg appearance-none text-slate-900"><option value="" disabled>--</option>{MINUTES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                    </div>
                </div>
              </div>

              {timeError && <div className="col-span-1 md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{timeError}</div>}

              {direction === 'from_airport' && (
                <div className="space-y-2 col-span-1 md:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('label.flight')}<span className="text-red-500">*</span></label>
                    <div className="relative">
                        <i className="fa-solid fa-plane-arrival absolute left-4 top-3.5 text-slate-400"></i>
                        <input type="text" required value={flightNumber} onChange={(e) => { setFlightNumber(e.target.value); setFlightError(null); }} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900" placeholder={t('placeholder.flight')} />
                    </div>
                    {flightError && <p className="text-xs text-red-600 mt-1">{flightError}</p>}
                </div>
              )}
            </div>

            {serviceTip && (
               <div className="mt-4 p-3 bg-primary-50 text-primary-800 text-sm rounded-lg flex items-start border border-primary-100">
                  <div className="flex-1">
                      <p className="flex items-start gap-2">
                         <i className="fa-solid fa-circle-info mt-1 text-primary-500"></i> 
                         <span dangerouslySetInnerHTML={{ __html: t(serviceTip) }}></span>
                      </p>
                      {serviceTip === 'tip.createAccount' && onOpenLogin && (
                          <button type="button" onClick={onOpenLogin} className="mt-2 text-xs bg-primary-600 text-white px-3 py-1.5 rounded font-bold hover:bg-primary-700 transition-colors ml-6">
                              Sign Up / Log In
                          </button>
                      )}
                      {!currentUser && serviceTip !== 'tip.createAccount' && (currentUser?.homeAddress || currentUser?.businessAddress) && (
                           <div className="ml-6 mt-1">
                               <button type="button" onClick={onOpenProfile} className="text-xs text-primary-700 font-bold underline">
                                   Setup now
                               </button>
                           </div>
                      )}
                  </div>
               </div>
            )}

            <button type="submit" className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2">
              {t('btn.seePrices')} <i className="fa-solid fa-arrow-right"></i>
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800">{t('step.2')}</h3>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.passengers')}<span className="text-red-500">*</span></label>
                    <div className="relative">
                    <i className="fa-solid fa-user absolute left-4 top-3.5 text-slate-400"></i>
                    <select value={passengers} onChange={(e) => setPassengers(parseInt(e.target.value))} className={`w-full pl-10 pr-4 py-3 bg-white border rounded-lg text-slate-900 ${passengers === 0 ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
                      <option value={0} disabled>-</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.suitcases')}<span className="text-red-500">*</span></label>
                    <div className="relative">
                    <i className="fa-solid fa-suitcase absolute left-4 top-3.5 text-slate-400"></i>
                    <select value={suitcases} onChange={(e) => setSuitcases(parseInt(e.target.value))} className={`w-full pl-10 pr-4 py-3 bg-white border rounded-lg text-slate-900 ${suitcases === -1 ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
                      <option value={-1} disabled>-</option>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.handLuggage')}<span className="text-red-500">*</span></label>
                    <div className="relative">
                    <i className="fa-solid fa-briefcase absolute left-4 top-3.5 text-slate-400"></i>
                    <select value={handLuggage} onChange={(e) => setHandLuggage(parseInt(e.target.value))} className={`w-full pl-10 pr-4 py-3 bg-white border rounded-lg text-slate-900 ${handLuggage === -1 ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'}`}>
                      <option value={-1} disabled>-</option>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <div className="flex items-center gap-2 mb-3">
                   <input type="checkbox" id="childrenToggle" checked={hasChildren} onChange={(e) => { setHasChildren(e.target.checked); if(!e.target.checked){ setBabySeats(0); setChildSeats(0); setBoosterSeats(0); } }} className="w-4 h-4 text-primary-600 rounded" />
                   <label htmlFor="childrenToggle" className="text-sm font-semibold text-slate-700 cursor-pointer">{t('label.travelWithChildren')}</label>
                </div>
                {hasChildren && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in pl-6">
                         <div className="space-y-2"><label className="text-xs font-semibold text-slate-500 uppercase">{t('label.babySeat')}</label><select value={babySeats} onChange={(e) => setBabySeats(parseInt(e.target.value))} className="w-full px-3 py-2 bg-white border rounded-lg text-sm">{[0,1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                         <div className="space-y-2"><label className="text-xs font-semibold text-slate-500 uppercase">{t('label.childSeat')}</label><select value={childSeats} onChange={(e) => setChildSeats(parseInt(e.target.value))} className="w-full px-3 py-2 bg-white border rounded-lg text-sm">{[0,1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                         <div className="space-y-2"><label className="text-xs font-semibold text-slate-500 uppercase">{t('label.boosterSeat')}</label><select value={boosterSeats} onChange={(e) => setBoosterSeats(parseInt(e.target.value))} className="w-full px-3 py-2 bg-white border rounded-lg text-sm">{[0,1,2,3].map(n=><option key={n} value={n}>{n}</option>)}</select></div>
                    </div>
                )}
            </div>

            <p className="text-slate-500 text-sm mb-4">{t('info.distance')}: ~{distance} km</p>
            
            {/* RENDER VEHICLES ALWAYS */}
            <div className="space-y-4 mb-6">
            {VEHICLES.map(vehicle => {
                // Check Capacity
                const pax = passengers > 0 ? passengers : 0;
                const bags = suitcases > -1 ? suitcases : 0;
                const isFits = pax <= vehicle.passengers && bags <= vehicle.luggage;
                const isSelected = selectedVehicleId === vehicle.id;
                const isBestMatch = bestVehicle?.id === vehicle.id;

                return (
                <div 
                    key={vehicle.id}
                    onClick={() => isFits && setSelectedVehicleId(vehicle.id)}
                    className={`relative border-2 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 transition-all duration-300 
                    ${isFits ? 'cursor-pointer hover:shadow-lg' : 'opacity-50 cursor-not-allowed grayscale bg-slate-50'}
                    ${isSelected ? 'border-primary-600 bg-primary-50/30' : 'border-slate-100 bg-white'}
                    `}
                >
                    {isBestMatch && isFits && (
                        <div className="absolute -top-3 left-4 bg-primary-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm z-10">
                        <i className="fa-solid fa-thumbs-up mr-1"></i> {t('widget.recommended')}
                        </div>
                    )}
                    {!isFits && (
                        <div className="absolute top-4 right-4 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded uppercase">
                        {t('widget.tooSmall')}
                        </div>
                    )}

                    <div className="w-full md:w-32 flex-shrink-0">
                        <img src={vehicle.image} alt={t(vehicle.name)} className="w-full h-auto object-cover rounded-lg" />
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                        <h4 className="font-bold text-lg text-slate-800">{t(vehicle.name)}</h4>
                        <div className="flex items-center justify-center md:justify-start gap-3 text-xs text-slate-500 mt-1">
                        <span><i className="fa-solid fa-user mr-1"></i>{t('widget.max')} {vehicle.passengers}</span>
                        <span><i className="fa-solid fa-suitcase mr-1"></i>{t('widget.max')} {vehicle.luggage}</span>
                        </div>
                    </div>

                    <div className="text-right min-w-[100px]">
                        {currentUser?.isCorporate && currentUser.discount ? (
                        <>
                            <div className="text-xs text-slate-400 line-through">€{vehiclePrices[vehicle.id]}</div>
                            <div className="text-2xl font-bold text-primary-700">€{getFinalPrice(vehiclePrices[vehicle.id])}</div>
                        </>
                        ) : (
                        <div className="text-2xl font-bold text-primary-700">€{vehiclePrices[vehicle.id]}</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-medium uppercase mt-1">{t('widget.fixedPrice')}</div>
                    </div>

                    {isSelected && (
                    <div className="absolute inset-0 border-2 border-primary-600 rounded-2xl pointer-events-none"></div>
                    )}
                </div>
                );
            })}
            </div>

            <div className="flex gap-4 pt-4">
               <button onClick={() => setStep(1)} className="flex-1 px-6 py-3 border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-colors">{t('btn.back')}</button>
               <button onClick={() => selectedVehicleId && setStep(3)} disabled={!selectedVehicleId || !areDetailsSelected} className={`flex-1 px-6 py-3 font-bold rounded-lg shadow-lg transition-all ${selectedVehicleId && areDetailsSelected ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>{t('btn.continue')}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleBookingSubmit} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-800">{t('step.3')}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.name')}</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.email')}</label>
                <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setContactError(null); }} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.phone')}</label>
                <input type="tel" required value={phone} onChange={(e) => { setPhone(e.target.value); setContactError(null); }} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900" />
              </div>

               <div className="space-y-2">
                 <label className="text-xs font-semibold text-slate-500 uppercase">{t('label.paymentMethod')}</label>
                 <div className={`grid ${currentUser?.isCorporate ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
                    <button type="button" onClick={() => setPaymentMethod('cash')} className={`flex flex-col md:flex-row items-center justify-center gap-2 px-2 py-3 border rounded-lg transition-all ${paymentMethod === 'cash' ? 'bg-primary-50 border-primary-500 text-primary-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <i className="fa-solid fa-money-bill-wave"></i><span className="text-xs md:text-sm">{t('payment.cash')}</span>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('card')} className={`flex flex-col md:flex-row items-center justify-center gap-2 px-2 py-3 border rounded-lg transition-all ${paymentMethod === 'card' ? 'bg-primary-50 border-primary-500 text-primary-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <i className="fa-solid fa-credit-card"></i><span className="text-xs md:text-sm">{t('payment.card')}</span>
                    </button>
                    {/* Invoice Option for Corporate Users */}
                    {currentUser?.isCorporate && (
                         <button type="button" onClick={() => setPaymentMethod('invoice')} className={`flex flex-col md:flex-row items-center justify-center gap-2 px-2 py-3 border rounded-lg transition-all ${paymentMethod === 'invoice' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            <i className="fa-solid fa-file-invoice"></i><span className="text-xs md:text-sm">{t('payment.invoice')}</span>
                        </button>
                    )}
                 </div>
              </div>
            </div>

            {contactError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{contactError}</div>}
            {submitError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{submitError}</div>}

            {/* Summary Box */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
              <h4 className="font-semibold text-slate-700 mb-2">{t('summary.title')}</h4>
              
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>{t('summary.route')}</span>
                <span className="font-medium text-slate-800 text-right">{direction === 'from_airport' ? VIENNA_AIRPORT : selectedCity} <i className="fa-solid fa-arrow-right mx-1 text-xs"></i> {direction === 'from_airport' ? selectedCity : VIENNA_AIRPORT}</span>
              </div>
              
              {/* Added Address Row */}
              {address && (
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                     <span>{direction === 'from_airport' ? t('label.destinationAddress') : `${t('label.pickup')} ${t('label.address')}`}</span>
                     <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">{address}</span>
                  </div>
              )}

              {/* REPLACED VEHICLE NAME WITH CAPACITY ICONS */}
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                 <span>{t('summary.requirements')}</span>
                 <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-800" title={t('label.passengers')}>
                        <i className="fa-solid fa-user text-xs"></i> {passengers}
                    </span>
                    <span className="flex items-center gap-1 text-slate-800" title={t('label.suitcases')}>
                        <i className="fa-solid fa-suitcase text-xs"></i> {suitcases}
                    </span>
                    <span className="flex items-center gap-1 text-slate-800" title={t('label.handLuggage')}>
                        <i className="fa-solid fa-briefcase text-xs"></i> {handLuggage}
                    </span>
                 </div>
              </div>

              {/* Added Payment Method Row */}
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                 <span>{t('label.paymentMethod')}</span>
                 <span className="font-medium text-slate-800 capitalize">
                    {paymentMethod === 'cash' && t('payment.cash')}
                    {paymentMethod === 'card' && t('payment.card')}
                    {paymentMethod === 'invoice' && t('payment.invoice')}
                 </span>
              </div>

               <div className="flex justify-between text-sm text-slate-600 mb-1">
                  <span>{t('label.date')}</span>
                  <div className="text-right">
                      <span className="font-medium text-slate-800 block">
                          {date.split('-').reverse().join('/')}
                      </span>
                      <span className="font-medium text-slate-600 text-xs block">
                           {direction === 'from_airport' ? t('label.landingTime') : t('label.pickupTime')} {time}
                      </span>
                      {direction === 'from_airport' && flightNumber && (
                          <span className="text-blue-600 text-xs block mt-0.5 font-medium">
                              {t('label.flight')}: {flightNumber}
                          </span>
                      )}
                  </div>
              </div>

               <div className="border-t border-slate-200 my-3 pt-2 flex justify-between items-center">
                <span className="font-bold text-slate-700">{t('summary.total')}</span>
                <div className="text-right">
                    {selectedVehicleId && (
                         <span className="font-bold text-xl text-primary-700">€{getFinalPrice(vehiclePrices[selectedVehicleId])}</span>
                    )}
                    {currentUser?.isCorporate && paymentMethod === 'invoice' && (
                        <div className="text-xs text-indigo-600 font-semibold mt-1">
                            {currentUser.companyName ? `Billed to ${currentUser.companyName}` : 'Monthly Invoice'}
                        </div>
                    )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
               <button type="button" onClick={() => setStep(2)} className="flex-1 px-6 py-3 border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-colors">{t('btn.back')}</button>
               <button 
                 type="submit" 
                 disabled={isSubmitting}
                 className={`flex-1 px-6 py-3 font-bold rounded-lg shadow-lg shadow-primary-500/30 transition-all ${isSubmitting ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
                 {isSubmitting 
                   ? (t('btn.processing') === 'btn.processing' ? 'Processing...' : t('btn.processing')) 
                   : (editingId ? t('btn.update') : t('btn.confirm'))}
               </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
