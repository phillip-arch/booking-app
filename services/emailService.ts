
import { BookingData, User } from '../types';
import emailjsLib from '@emailjs/browser';

// Configuration keys - In production, these should come from process.env
// Example: process.env.REACT_APP_EMAILJS_SERVICE_ID
const EMAILJS_CONFIG = {
  SERVICE_ID: process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
  TEMPLATE_ID_BOOKING: process.env.REACT_APP_EMAILJS_TEMPLATE_ID_BOOKING || '',
  TEMPLATE_ID_WELCOME: process.env.REACT_APP_EMAILJS_TEMPLATE_ID_WELCOME || '',
  PUBLIC_KEY: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || ''
};

declare global {
  interface Window {
    emailjs: any;
  }
}

// Attach the library to window for backwards compatibility with existing code paths
if (typeof window !== 'undefined') {
  (window as any).emailjs = emailjsLib;
}

const isConfigured = () => {
  return (
    window.emailjs && 
    EMAILJS_CONFIG.SERVICE_ID && 
    EMAILJS_CONFIG.PUBLIC_KEY
  );
};

export const emailService = {
  
  init: () => {
    if (window.emailjs && EMAILJS_CONFIG.PUBLIC_KEY) {
      window.emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
    }
  },

  sendBookingConfirmation: async (booking: BookingData) => {
    if (!isConfigured()) {
      console.log('📧 [Email Simulation] Booking Confirmation sent to:', booking.customerEmail);
      console.log('   Data:', booking);
      console.warn('   To send real emails, configure REACT_APP_EMAILJS_ variables in your .env file.');
      return;
    }

    try {
      // Format date to DD/MM/YYYY for email
      const formattedDate = booking.date.split('-').reverse().join('/');

      const templateParams = {
        to_name: booking.customerName,
        to_email: booking.customerEmail,
        pickup_location: booking.pickupLocation,
        dropoff_location: booking.dropoffLocation,
        date: formattedDate,
        time: booking.time,
        price: booking.price,
        vehicle: booking.selectedVehicleId, // ideally map this to name
        booking_id: booking.id,
        link: window.location.origin
      };

      await window.emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID_BOOKING,
        templateParams
      );
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Failed to send booking email:', error);
    }
  },

  sendWelcomeEmail: async (user: User) => {
    if (!isConfigured()) {
      console.log('📧 [Email Simulation] Welcome Email sent to:', user.email);
      return;
    }

    try {
      const templateParams = {
        to_name: user.name,
        to_email: user.email,
        link: window.location.origin
      };

      await window.emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID_WELCOME,
        templateParams
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
};

// Initialize immediately if keys are present
emailService.init();
