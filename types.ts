
export enum VehicleType {
  ECONOMY = 'Economy',
  COMFORT = 'Comfort',
  BUSINESS = 'Business',
  VAN = 'Van'
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  name: string;
  image: string;
  passengers: number;
  luggage: number;
  priceMultiplier: number;
  basePrice: number;
}

export interface City {
  name: string;
  distanceKm: number; // Approx distance from VIE
  country: string;
}

export interface Company {
  id: string;
  name: string;
  domain?: string; // e.g., "company.com"
  joinCode: string; // e.g., "CORP2025"
  discount: number;
  invoiceEnabled: boolean;
}

export interface User {
  id: string; // This will be the Firebase UID
  email: string;
  name: string;
  createdAt: number;
  homeAddress?: string;
  businessAddress?: string;
  phoneNumber?: string;
  role?: 'user' | 'admin';
  
  // Corporate Fields linked to Company
  companyId?: string;
  
  // Legacy fields (kept for backward compatibility or individual overrides)
  isCorporate?: boolean;
  companyName?: string; 
  discount?: number; 
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
}

export interface BookingData {
  id?: string;
  userId?: string; // Link booking to a specific user
  timestamp?: number;
  status?: 'confirmed' | 'cancelled';
  pickupLocation: string;
  dropoffLocation: string;
  address?: string; // Specific street address
  date: string;
  time: string;
  passengers: number;
  suitcases?: number;
  handLuggage?: number;
  selectedVehicleId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  flightNumber?: string;
  price: number;
  reminderSet?: boolean;
  
  // Admin Assignment
  assignedDriverId?: string;

  // Rating
  rating?: number; // 1-5 stars
  review?: string; // Driver review text

  // Child Seats
  babySeats?: number;
  childSeats?: number;
  boosterSeats?: number;

  // Payment
  paymentMethod?: 'cash' | 'card' | 'invoice';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
