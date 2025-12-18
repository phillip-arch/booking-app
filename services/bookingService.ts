import { supabase } from './supabaseClient';
import { BookingData, Driver } from '../types';

const USE_MOCK = false;
const LOCAL_STORAGE_KEY = 'vie_ride_bookings';
const LOCAL_DRIVERS_KEY = 'vie_ride_drivers';
const BOOKINGS_TABLE = 'bookings';
const DRIVERS_TABLE = 'drivers';

const toDbBooking = (booking: BookingData, userId?: string) => ({
  user_id: userId || booking.userId || null,
  pickup_location: booking.pickupLocation,
  dropoff_location: booking.dropoffLocation,
  address: booking.address,
  date: booking.date,
  time: booking.time,
  passengers: booking.passengers,
  suitcases: booking.suitcases,
  hand_luggage: booking.handLuggage,
  selected_vehicle_id: booking.selectedVehicleId,
  customer_name: booking.customerName,
  customer_email: booking.customerEmail,
  customer_phone: booking.customerPhone,
  flight_number: booking.flightNumber,
  price: booking.price,
  reminder_set: booking.reminderSet ?? false,
  status: booking.status ?? 'confirmed',
  assigned_driver_id: booking.assignedDriverId,
  rating: booking.rating,
  review: booking.review,
  baby_seats: booking.babySeats,
  child_seats: booking.childSeats,
  booster_seats: booking.boosterSeats,
  payment_method: booking.paymentMethod,
  timestamp: booking.timestamp ?? Date.now()
});

const fromDbBooking = (row: any): BookingData => ({
  id: row.id,
  userId: row.user_id || undefined,
  pickupLocation: row.pickup_location,
  dropoffLocation: row.dropoff_location,
  address: row.address || undefined,
  date: row.date,
  time: row.time,
  passengers: row.passengers,
  suitcases: row.suitcases,
  handLuggage: row.hand_luggage,
  selectedVehicleId: row.selected_vehicle_id,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  flightNumber: row.flight_number,
  price: row.price,
  reminderSet: row.reminder_set,
  status: row.status,
  assignedDriverId: row.assigned_driver_id,
  rating: row.rating,
  review: row.review,
  babySeats: row.baby_seats,
  childSeats: row.child_seats,
  boosterSeats: row.booster_seats,
  paymentMethod: row.payment_method,
  timestamp: row.timestamp
});

const toDbDriver = (driver: Omit<Driver, 'id'>) => ({
  name: driver.name,
  email: driver.email,
  phone: driver.phone,
  active: driver.active
});

const fromDbDriver = (row: any): Driver => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  active: row.active
});

export const bookingService = {
  saveBooking: async (booking: BookingData, userId?: string): Promise<BookingData> => {
    const bookingWithTime = { ...booking, timestamp: booking.timestamp || Date.now(), userId: userId || booking.userId };

    // Always try Supabase first if configured (guest or logged-in)
    if (supabase) {
      if (booking.id && !booking.id.startsWith('local_')) {
        const { error } = await supabase
          .from(BOOKINGS_TABLE)
          .update(toDbBooking(bookingWithTime, userId))
          .eq('id', booking.id);
        if (error) throw error;
        return bookingWithTime;
      } else {
        const { data, error } = await supabase
          .from(BOOKINGS_TABLE)
          .insert({
            ...toDbBooking(bookingWithTime, userId),
            status: 'confirmed',
            reminder_set: false
          })
          .select()
          .single();
        if (error) throw error;
        return { ...bookingWithTime, id: data.id };
      }
    }

    // Fallback only if Supabase is unavailable (or mock mode)
    if (!supabase && !USE_MOCK) {
      throw new Error('Supabase is not configured. Cannot save booking without backend.');
    }

    // Local fallback (explicit mock mode)
    const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
    let history: BookingData[] = existing ? JSON.parse(existing) : [];
    let savedBooking: BookingData;

    if (booking.id) {
      const index = history.findIndex(b => b.id === booking.id);
      savedBooking = { ...bookingWithTime };
      if (index !== -1) history[index] = savedBooking;
    } else {
      savedBooking = {
        ...bookingWithTime,
        id: 'local_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        status: 'confirmed',
        reminderSet: false
      };
      history.push(savedBooking);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history));
    return savedBooking;
  },

  getBookings: async (userId?: string, email?: string): Promise<BookingData[]> => {
    if (supabase) {
      if (!userId && !email) return [];
      const filters: string[] = [];
      if (userId) filters.push(`user_id.eq.${userId}`);
      if (email) filters.push(`customer_email.eq.${email}`);

      const { data, error } = await supabase
        .from(BOOKINGS_TABLE)
        .select('*')
        .or(filters.join(','))
        .order('date', { ascending: true });
      if (error) {
        console.warn('fetch bookings error', error);
        return [];
      }
      return (data || []).map(fromDbBooking);
    }
    if (!supabase && !USE_MOCK) {
      throw new Error('Supabase is not configured. Cannot fetch bookings.');
    }
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  getAllBookings: async (): Promise<BookingData[]> => {
    if (supabase) {
      const { data, error } = await supabase.from(BOOKINGS_TABLE).select('*').order('date', { ascending: false });
      if (error) {
        console.warn('fetch all bookings error', error);
        return [];
      }
      return (data || []).map(fromDbBooking);
    }
    if (!supabase && !USE_MOCK) {
      throw new Error('Supabase is not configured. Cannot fetch all bookings.');
    }
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  updateStatus: async (bookingId: string, status: BookingData['status'], _userId?: string) => {
    if (supabase && !bookingId.startsWith('local_')) {
      const { error } = await supabase.from(BOOKINGS_TABLE).update({ status }).eq('id', bookingId);
      if (error) throw error;
      return;
    }
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const history: BookingData[] = JSON.parse(stored);
      const updated = history.map(b => b.id === bookingId ? { ...b, status } : b);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  },

  toggleReminder: async (bookingId: string, reminderSet: boolean, _userId?: string) => {
    if (supabase && !bookingId.startsWith('local_')) {
      const { error } = await supabase.from(BOOKINGS_TABLE).update({ reminder_set: reminderSet }).eq('id', bookingId);
      if (error) throw error;
      return;
    }
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const history: BookingData[] = JSON.parse(stored);
      const updated = history.map(b => b.id === bookingId ? { ...b, reminderSet } : b);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  },

  assignDriver: async (bookingId: string, driverId: string) => {
    if (supabase && !bookingId.startsWith('local_')) {
      const { error } = await supabase.from(BOOKINGS_TABLE).update({ assigned_driver_id: driverId }).eq('id', bookingId);
      if (error) throw error;
      return;
    }
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const history: BookingData[] = JSON.parse(stored);
      const updated = history.map(b => b.id === bookingId ? { ...b, assignedDriverId: driverId } : b);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  },

  submitRating: async (bookingId: string, rating: number, review?: string) => {
    const updateData: any = { rating };
    if (review !== undefined) updateData.review = review;

    if (supabase && !bookingId.startsWith('local_')) {
      const { error } = await supabase.from(BOOKINGS_TABLE).update({
        rating,
        review
      }).eq('id', bookingId);
      if (error) throw error;
      return;
    }
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const history: BookingData[] = JSON.parse(stored);
      const updated = history.map(b => b.id === bookingId ? { ...b, ...updateData } : b);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  },

  // --- DRIVER MANAGEMENT ---
  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      const { data, error } = await supabase.from(DRIVERS_TABLE).select('*');
      if (error) {
        console.warn('drivers fetch error', error);
        return [];
      }
      return (data || []).map(fromDbDriver);
    }
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    const stored = localStorage.getItem(LOCAL_DRIVERS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addDriver: async (driver: Omit<Driver, 'id'>): Promise<Driver> => {
    if (supabase) {
      const { data, error } = await supabase.from(DRIVERS_TABLE).insert(toDbDriver(driver)).select().single();
      if (error) throw error;
      return fromDbDriver(data);
    }
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    const stored = localStorage.getItem(LOCAL_DRIVERS_KEY);
    const drivers = stored ? JSON.parse(stored) : [];
    const newDriver = { id: 'd_' + Date.now(), ...driver };
    drivers.push(newDriver);
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(drivers));
    return newDriver;
  },

  updateDriver: async (driver: Driver): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from(DRIVERS_TABLE).update(toDbDriver(driver)).eq('id', driver.id);
      if (error) throw error;
      return;
    }
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    const stored = localStorage.getItem(LOCAL_DRIVERS_KEY);
    if (stored) {
      const drivers: Driver[] = JSON.parse(stored);
      const index = drivers.findIndex(d => d.id === driver.id);
      if (index !== -1) {
        drivers[index] = driver;
        localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(drivers));
      }
    }
  },

  deleteDriver: async (driverId: string): Promise<void> => {
    if (supabase) {
      const { error } = await supabase.from(DRIVERS_TABLE).delete().eq('id', driverId);
      if (error) throw error;
      return;
    }
    if (!USE_MOCK) throw new Error('Supabase is not configured.');
    const stored = localStorage.getItem(LOCAL_DRIVERS_KEY);
    if (stored) {
      const drivers: Driver[] = JSON.parse(stored);
      const filtered = drivers.filter(d => d.id !== driverId);
      localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(filtered));
    }
  }
};
