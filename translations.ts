// src/i18n/translations.ts

export type LanguageCode =
  | 'en'
  | 'de'
  | 'fr'
  | 'it'
  | 'hr'
  | 'sr'
  | 'tr'
  | 'uk'
  | 'hu'
  | 'ru';

export const LANGUAGES: { code: LanguageCode; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr', name: 'Srpski (latinica)', flag: '🇷🇸' }, // Serbian Latin
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

const en: Record<string, string> = {
  // Nav & General
  'nav.locations': 'Locations',
  'nav.fleet': 'Fleet',
  'nav.myBookings': 'My Bookings',
  'nav.admin': 'Admin Dashboard',
  'nav.signIn': 'Sign In',
  'nav.signOut': 'Sign Out',
  'hero.title': 'Premium Transfers',
  'hero.subtitle': 'Vienna & Beyond',
  'hero.desc':
    'Reliable airport shuttles within a 100km radius. Fixed prices, professional drivers.',
  'features.punctual': 'Always Punctual',
  'features.punctualDesc': 'Flight monitoring included.',
  'features.fixed': 'Fixed Prices',
  'features.fixedDesc': 'No hidden fees or surge pricing.',
  'features.secure': 'Safe & Secure',
  'features.secureDesc': 'Verified drivers & insured rides.',

  // App Specific
  'app.reminder': 'Upcoming Trip Reminder:',
  'app.viewDetails': 'View Details',
  'app.whyChoose': 'Why Choose VIERide?',
  'app.whyChooseDesc': 'Experience the difference of a professional chauffeur service.',
  'app.bookingConfirmed': 'Booking Confirmed!',
  'app.bookingUpdated': 'Booking Updated!',
  'app.thankYou': 'Thank you, {name}.',
  'app.scheduled': 'Your ride has been scheduled.',
  'app.emailSent': 'We have sent a confirmation email to {email}.',
  'app.route': 'Route',
  'app.price': 'Price',
  'app.bookAnother': 'Book Another Ride',
  'app.viewHistory': 'View Booking History',

  // Footer
  'footer.desc':
    'Your premier choice for airport transfers in Vienna and the surrounding 100km region. Connecting Austria, Slovakia, Hungary, and Czech Republic.',
  'footer.contact': 'Contact',
  'footer.legal': 'Legal',
  'footer.privacy': 'Privacy Policy',
  'footer.terms': 'Terms of Service',
  'footer.impressum': 'Impressum',
  'footer.rights': 'All rights reserved.',
  'footer.companyName': 'VIERide Airport Transfers',

  // Booking Widget
  'step.1': 'Ride Details',
  'step.2': 'Choose Your Ride',
  'step.3': 'Checkout',
  'btn.fromAirport': 'From Airport',
  'btn.toAirport': 'To Airport',
  'label.pickup': 'Pickup',
  'label.dropoff': 'Dropoff',
  'label.address': 'Address',
  'label.destinationAddress': 'Destination Address',
  'label.date': 'Date',
  'label.time': 'Time',
  'label.landingTime': 'Landing Time',
  'label.pickupTime': 'Pickup Time',
  'label.flight': 'Flight Number',
  'label.passengers': 'Passengers',
  'label.suitcases': 'Suitcases',
  'label.handLuggage': 'Hand Luggage',
  'placeholder.flight': 'e.g. OS 123',
  'placeholder.address': 'Specific Address',
  'btn.seePrices': 'See Prices & Vehicles',
  'btn.back': 'Back',
  'btn.continue': 'Continue to Checkout',
  'btn.confirm': 'Confirm Booking',
  'btn.update': 'Update Booking',
  'msg.modifying': 'You are modifying an existing booking.',
  'msg.selectDetails':
    'Please select number of passengers and luggage to calculate the price.',
  'info.distance': 'Trip distance',
  'label.name': 'Full Name',
  'label.email': 'Email',
  'label.phone': 'Phone Number',
  'summary.title': 'Booking Summary',
  'summary.total': 'Total Price',
  'summary.route': 'Route:',
  'summary.vehicle': 'Vehicle:',
  'summary.requirements': 'Requirements:',
  'summary.luggage': 'Luggage:',
  'summary.childSeats': 'Child Seats:',
  'summary.payment': 'Payment:',
  'tip.title': 'Good to know',
  'widget.allocatedRide': 'Your Allocated Ride',
  'widget.capacityInfo':
    'This vehicle fits your requirements for {pax} passengers and {bag} suitcases.',
  'widget.fixedPrice': 'Fixed Price',
  'widget.allInclusive': 'All inclusive',
  'widget.largeGroup': 'Large Group?',
  'widget.largeGroupDesc':
    'It seems your requirements exceed our standard fleet capacity. Please contact us directly for a custom quote for large groups or buses.',
  'widget.callSupport': 'Call Support',
  'widget.recommended': 'Recommended',
  'widget.tooSmall': 'Too Small',
  'widget.max': 'Max',
  'err.selectDate': 'Please select both date and time.',
  'err.invalidDate': 'Invalid date or time.',
  'err.pastDate': 'Please select a future time.',
  'err.leadTimeDay':
    'For rides between 07:00 and 22:00, please book at least 2 hours in advance.',
  'err.leadTimeNight':
    'For night rides (22:00 - 07:00), please book at least 8 hours in advance.',
  'err.invalidEmail': 'Please enter a valid email address.',
  'err.invalidPhone': 'Please enter a valid phone number (e.g. +43 123 45678).',
  'err.flightRequired': 'Flight number is required.',

  // Vehicles
  'vehicle.sedan': 'Standard Sedan',
  'vehicle.wagon': 'Station Wagon',
  'vehicle.van': 'Minivan',

  // New Fields
  'label.travelWithChildren': 'Travel with children?',
  'label.babySeat': 'Baby Seat (0-13kg)',
  'label.childSeat': 'Child Seat (9-18kg)',
  'label.boosterSeat': 'Booster Seat (15-36kg)',
  'label.paymentMethod': 'Payment Method',
  'payment.cash': 'Cash to Driver',
  'payment.card': 'Credit Card',
  'payment.invoice': 'Monthly Invoice',
  'label.bookingForMyself': 'I am booking for myself',
  'label.useHome': 'Home',
  'label.useBusiness': 'Business',
  'label.homeAddress': 'Home Address',
  'label.businessAddress': 'Business Address',
  'btn.saveProfile': 'Save Profile',
  'label.discountApplied': '{percent}% Discount Applied',

  // Tips
  'tip.airportPickup':
    'Airport Pickup: Your driver will wait in the Arrivals Hall, directly in front of the gate exit, holding a name sign.',
  'tip.beReady':
    'Be Ready: A few minutes of waiting is tolerated, but please be ready on time to ensure a smooth schedule.',
  'tip.payment':
    'Payment: You can pay the driver directly in the car using Cash or Credit Card after the ride.',
  'tip.safety':
    'Safety First: Please do not make private bookings with the driver. Only app/website bookings are insured and guaranteed.',
  'tip.flightMonitoring':
    'Flight Delays: We monitor your flight! If it is delayed, we adjust the pickup time automatically at no extra cost.',
  'tip.cancellation':
    'Cancellation Policy: Free cancellation up to 24 hours before pickup. Cancellations within 24 hours are charged 50%.',
  'tip.createAccount':
    'App Tip: Create an account and save your profile details (Name, Phone, Address) to make your next booking in seconds!',
  'tip.saveAddress':
    'You can save your home or business address and quickly select saved locations.',

  // History
  'history.title': 'My Bookings',
  'history.welcome': 'Welcome',
  'history.empty': 'No bookings found.',
  'history.bookNow': 'Book a Ride',
  'history.tab.bookings': 'Booking History',
  'history.tab.profile': 'Account Settings',
  'profile.info': 'Profile Information',
  'profile.savedAddresses': 'Saved Addresses',
  'profile.accountActions': 'Account Actions',
  'profile.loading': 'Loading bookings...',
  'profile.noBookingsSub': 'Your rides will appear here.',
  'detail.paymentContact': 'Payment & Contact',
  'detail.payment': 'Payment:',
  'detail.extras': 'Extras',
  'detail.luggage': 'Luggage',
  'detail.bookedOn': 'Booked:',
  'btn.cancel': 'Cancel Booking',
  'btn.modify': 'Modify Booking',
  'btn.addToCalendar': 'Add to Calendar',
  'btn.deleteAccount': 'Delete Account',
  'status.cancelled': 'Cancelled',
  'policy.title': 'Cancellation Policy',
  'policy.freeCancellation': 'Free cancellation up to 24 hours before scheduled pickup.',
  'policy.within24hFee': 'Cancellations within 24 hours incur a 50% fee.',
  'policy.noShows': 'No-shows are non-refundable.',
  'policy.refundProcess':
    'Refunds are processed automatically to the original payment method within 5–7 business days.',
  'label.rateDriver': 'Rate Driver & Review',
  'label.rating': 'Rating',
  'label.writeReview': 'Write a review',
  'btn.submitReview': 'Submit Review',
  'placeholder.review': 'How was your ride?',
  'confirm.cancelRide': 'Are you sure you want to cancel your ride to {dest}?',
  'confirm.cancelNote':
    'Note: Free cancellation is available up to 24 hours before your pickup time.',
  'confirm.modifyRide': 'You are about to modify your booking.',
  'confirm.modifyNote':
    'Note: This will redirect you to the booking form. Current prices will apply.',
  'confirm.deleteAccount':
    'Are you sure you want to delete your account? This action cannot be undone.',
  'confirm.deleteNote':
    'Warning: All your personal data will be removed. Past bookings may be unlinked.',
  'toast.reminderSet': 'Reminder set for upcoming trip.',
  'toast.reminderRemoved': 'Reminder removed.',
  'toast.profileSaved': 'Profile saved successfully!',
  'toast.ratingSubmitted': 'Rating submitted!',
  'toast.reviewSaved': 'Review saved!',
  'toast.bookingCancelled': 'Booking cancelled successfully',
  'toast.redirectModify': 'Redirecting to booking form...',

  // Auth
  'auth.login': 'Sign In',
  'auth.register': 'Create Account',
  'auth.forgot': 'Reset Password',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.sendLink': 'Send Reset Link',
  'auth.password': 'Password',
  'auth.changePassword': 'Change Password',
  'auth.currentPassword': 'Current Password',
  'auth.newPassword': 'New Password',
  'auth.confirmPassword': 'Confirm New Password',
  'auth.passwordTooShort': 'Password must be at least 6 characters.',
  'auth.passwordsNoMatch': 'Passwords do not match.',
  'auth.passwordSame': 'New password cannot be the same as the current password.',
  'auth.incorrectPassword': 'Incorrect current password.',
  'auth.errorChangePassword': 'Failed to change password. Please try again.',
  'auth.passwordChanged': 'Password changed successfully!',
  'auth.savePassword': 'Save Password',
  'auth.saved': 'Saved',
  'auth.backSignIn': 'Back to Sign In',
  'auth.sentLink': 'If an account exists, a reset link has been sent to your email.',
  'auth.joinCode': 'Corporate Join Code (Optional)',
  'auth.joinCodePlaceholder': 'e.g. TECH2025',

  // Admin
  'admin.tab.bookings': 'Dispatch',
  'admin.tab.drivers': 'Drivers',
  'admin.tab.analytics': 'Analytics',
  'admin.tab.clients': 'Companies',
  'admin.tab.users': 'Users',
  'admin.totalRevenue': 'Total Revenue',
  'admin.totalRides': 'Total Rides',
  'admin.addDriver': 'Add Driver',
  'admin.assignDriver': 'Assign Driver',
  'admin.unassigned': 'Unassigned',
  'admin.avgRating': 'Avg Rating',
  'admin.fleet': 'Fleet Management',
  'admin.selectPeriod': 'Select Period',
  'admin.startDate': 'Start Date',
  'admin.endDate': 'End Date',
  'admin.ordersPerDay': 'Orders per Day',
  'admin.driverPerf': 'Driver Performance',
  'admin.ridesFor': 'Rides for',
  'admin.allRides': 'All Rides in Period',
  'admin.noRides': 'No rides scheduled for this date.',
  'admin.noRidesCriteria': 'No rides found for this criteria.',
  'admin.table.timeId': 'Time / ID',
  'admin.table.route': 'Route (Exact Address)',
  'admin.table.customer': 'Customer',
  'admin.table.reqPrice': 'Requirements / Price',
  'admin.table.driver': 'Driver',
  'admin.table.status': 'Status',
  'admin.table.actions': 'Actions',
  'admin.clearFilter': 'Clear Filter',
  'admin.clickToFilter':
    'Click on a driver to filter the rides list below.',
  'admin.closeForm': 'Close Form',
  'admin.clientMgmt': 'Company Management',
  'admin.isCorporate': 'Corporate Account',
  'admin.companyName': 'Company Name',
  'admin.companyDomain': 'Email Domain (@)',
  'admin.joinCode': 'Join Code',
  'admin.refreshCode': 'Refresh',
  'admin.discount': 'Discount %',
  'admin.editUser': 'Edit User',
  'admin.userSearch': 'Search Users',
  'admin.filterByCompany': 'Filter by Company',
  'admin.viewBookings': 'View Bookings',
  'admin.addCompany': 'Add Company',
  'admin.domainPlaceholder': 'e.g. google.com',

  // Chat
  'chat.title': 'Transfer Assistant',
  'chat.subtitle': 'Powered by Gemini AI',
  'chat.placeholder': 'Ask a question...',
  'chat.welcome':
    'Hello! I am your Vienna Airport transfer concierge. Ask me about travel times, local tips, or our services.',
  'chat.offline':
    "I'm currently offline. Please check your connection or try again later.",
  'chat.error': "I'm having trouble processing that request right now.",
};

// --- German (your existing)
const de: Record<string, string> = {
  ...en,
  'nav.locations': 'Standorte',
  'nav.fleet': 'Flotte',
  'nav.myBookings': 'Meine Buchungen',
  'nav.admin': 'Admin',
  'nav.signIn': 'Anmelden',
  'nav.signOut': 'Abmelden',
  'hero.title': 'Premium Transfers',
  'hero.subtitle': 'Wien & Umgebung',
  'hero.desc':
    'Zuverlässige Flughafentransfers im Umkreis von 100 km. Fixpreise, professionelle Fahrer.',
  'features.punctual': 'Immer pünktlich',
  'features.punctualDesc': 'Flugüberwachung inklusive.',
  'features.fixed': 'Fixpreise',
  'features.fixedDesc': 'Keine versteckten Gebühren oder Aufschläge.',
  'features.secure': 'Sicher & zuverlässig',
  'features.secureDesc': 'Geprüfte Fahrer & versicherte Fahrten.',
};

// --- French / Italian / Croatian / Turkish / Ukrainian / Hungarian / Russian
const fr: Record<string, string> = { ...en };
const it: Record<string, string> = { ...en };
const hr: Record<string, string> = { ...en };
const tr: Record<string, string> = { ...en };
const uk: Record<string, string> = { ...en };
const hu: Record<string, string> = { ...en };
const ru: Record<string, string> = { ...en };

/**
 * Serbian (Latin) — FULL set of overrides.
 * We start from English so any missing key still shows in English.
 */
const sr: Record<string, string> = {
  ...en,

  // Nav & General
  'nav.locations': 'Lokacije',
  'nav.fleet': 'Flota',
  'nav.myBookings': 'Moje rezervacije',
  'nav.admin': 'Admin',
  'nav.signIn': 'Prijava',
  'nav.signOut': 'Odjava',
  'hero.title': 'Premium transferi',
  'hero.subtitle': 'Beč i šire',
  'hero.desc':
    'Pouzdani aerodromski transferi u krugu 100 km. Fiksne cene, profesionalni vozači.',
  'features.punctual': 'Uvek tačno',
  'features.punctualDesc': 'Praćenje leta uključeno.',
  'features.fixed': 'Fiksne cene',
  'features.fixedDesc': 'Bez skrivenih troškova i “surge” cena.',
  'features.secure': 'Bezbedno i pouzdano',
  'features.secureDesc': 'Provereni vozači i osigurane vožnje.',

  // App Specific
  'app.reminder': 'Podsetnik za predstojeću vožnju:',
  'app.viewDetails': 'Pogledaj detalje',
  'app.whyChoose': 'Zašto VIERide?',
  'app.whyChooseDesc': 'Osetite razliku profesionalne chauffeur usluge.',
  'app.bookingConfirmed': 'Rezervacija potvrđena!',
  'app.bookingUpdated': 'Rezervacija ažurirana!',
  'app.thankYou': 'Hvala, {name}.',
  'app.scheduled': 'Vaša vožnja je zakazana.',
  'app.emailSent': 'Poslali smo email potvrdu na {email}.',
  'app.route': 'Ruta',
  'app.price': 'Cena',
  'app.bookAnother': 'Rezerviši novu vožnju',
  'app.viewHistory': 'Pogledaj istoriju',

  // Footer
  'footer.desc':
    'Premium izbor za aerodromske transfere u Beču i okolini (100 km). Povezujemo Austriju, Slovačku, Mađarsku i Češku.',
  'footer.contact': 'Kontakt',
  'footer.legal': 'Pravno',
  'footer.privacy': 'Politika privatnosti',
  'footer.terms': 'Uslovi korišćenja',
  'footer.impressum': 'Impressum',
  'footer.rights': 'Sva prava zadržana.',
  'footer.companyName': 'VIERide Aerodromski transferi',

  // Booking Widget
  'step.1': 'Detalji vožnje',
  'step.2': 'Izaberi vozilo',
  'step.3': 'Plaćanje',
  'btn.fromAirport': 'Sa aerodroma',
  'btn.toAirport': 'Na aerodrom',
  'label.pickup': 'Polazak',
  'label.dropoff': 'Destinacija',
  'label.address': 'Adresa',
  'label.destinationAddress': 'Adresa destinacije',
  'label.date': 'Datum',
  'label.time': 'Vreme',
  'label.landingTime': 'Vreme sletanja',
  'label.pickupTime': 'Vreme preuzimanja',
  'label.flight': 'Broj leta',
  'label.passengers': 'Putnici',
  'label.suitcases': 'Koferi',
  'label.handLuggage': 'Ručni prtljag',
  'placeholder.flight': 'npr. OS 123',
  'placeholder.address': 'Tačna adresa',
  'btn.seePrices': 'Prikaži cene i vozila',
  'btn.back': 'Nazad',
  'btn.continue': 'Nastavi na plaćanje',
  'btn.confirm': 'Potvrdi rezervaciju',
  'btn.update': 'Ažuriraj rezervaciju',
  'msg.modifying': 'Menjate postojeću rezervaciju.',
  'msg.selectDetails': 'Izaberite broj putnika i prtljag da izračunamo cenu.',
  'info.distance': 'Udaljenost',
  'label.name': 'Ime i prezime',
  'label.email': 'Email',
  'label.phone': 'Broj telefona',
  'summary.title': 'Pregled rezervacije',
  'summary.total': 'Ukupno',
  'summary.route': 'Ruta:',
  'summary.vehicle': 'Vozilo:',
  'summary.requirements': 'Zahtevi:',
  'summary.luggage': 'Prtljag:',
  'summary.childSeats': 'Dečija sedišta:',
  'summary.payment': 'Plaćanje:',
  'tip.title': 'Dobro je znati',
  'widget.allocatedRide': 'Dodeljena vožnja',
  'widget.capacityInfo': 'Ovo vozilo odgovara za {pax} putnika i {bag} kofera.',
  'widget.fixedPrice': 'Fiksna cena',
  'widget.allInclusive': 'Sve uključeno',
  'widget.largeGroup': 'Veća grupa?',
  'widget.largeGroupDesc':
    'Izgleda da vaši zahtevi prevazilaze kapacitet standardne flote. Kontaktirajte nas za ponudu za veće grupe ili autobus.',
  'widget.callSupport': 'Pozovi podršku',
  'widget.recommended': 'Preporučeno',
  'widget.tooSmall': 'Premalo',
  'widget.max': 'Maks',
  'err.selectDate': 'Molimo izaberite datum i vreme.',
  'err.invalidDate': 'Neispravan datum ili vreme.',
  'err.pastDate': 'Molimo izaberite buduće vreme.',
  'err.leadTimeDay':
    'Za vožnje između 07:00 i 22:00, rezervišite najmanje 2 sata unapred.',
  'err.leadTimeNight':
    'Za noćne vožnje (22:00 - 07:00), rezervišite najmanje 8 sati unapred.',
  'err.invalidEmail': 'Unesite ispravnu email adresu.',
  'err.invalidPhone': 'Unesite ispravan broj (npr. +43 123 45678).',
  'err.flightRequired': 'Broj leta je obavezan.',

  // Vehicles
  'vehicle.sedan': 'Standardna limuzina',
  'vehicle.wagon': 'Karavan',
  'vehicle.van': 'Minivan',

  // New Fields
  'label.travelWithChildren': 'Putujete sa decom?',
  'label.babySeat': 'Bebi sedište (0-13kg)',
  'label.childSeat': 'Dečije sedište (9-18kg)',
  'label.boosterSeat': 'Buster (15-36kg)',
  'label.paymentMethod': 'Način plaćanja',
  'payment.cash': 'Gotovina vozaču',
  'payment.card': 'Kreditna kartica',
  'payment.invoice': 'Mesečni račun',
  'label.bookingForMyself': 'Rezervišem za sebe',
  'label.useHome': 'Kuća',
  'label.useBusiness': 'Posao',
  'label.homeAddress': 'Kućna adresa',
  'label.businessAddress': 'Poslovna adresa',
  'btn.saveProfile': 'Sačuvaj profil',
  'label.discountApplied': '{percent}% popust primenjen',

  // Tips
  'tip.airportPickup':
    'Preuzimanje na aerodromu: vozač vas čeka u dolascima, ispred izlaza sa kapije, sa tablom sa imenom.',
  'tip.beReady':
    'Budite spremni: nekoliko minuta čekanja je u redu, ali budite tačni kako bismo ispoštovali raspored.',
  'tip.payment':
    'Plaćanje: možete platiti vozaču u vozilu gotovinom ili karticom nakon vožnje.',
  'tip.safety':
    'Bezbednost pre svega: ne dogovarajte privatne vožnje sa vozačem. Samo rezervacije preko aplikacije/sajta su osigurane.',
  'tip.flightMonitoring':
    'Kašnjenja leta: pratimo vaš let i automatski prilagođavamo preuzimanje bez doplate.',
  'tip.cancellation':
    'Otkazivanje: besplatno do 24h pre preuzimanja. Otkazivanja unutar 24h se naplaćuju 50%.',
  'tip.createAccount':
    'Savet: napravite nalog i sačuvajte podatke (ime, telefon, adresa) da sledeća rezervacija traje par sekundi.',
  'tip.saveAddress':
    'Možete sačuvati kućnu ili poslovnu adresu i brzo birati sačuvane lokacije.',

  // History
  'history.title': 'Moje rezervacije',
  'history.welcome': 'Dobrodošli',
  'history.empty': 'Nema rezervacija.',
  'history.bookNow': 'Rezerviši vožnju',
  'history.tab.bookings': 'Istorija rezervacija',
  'history.tab.profile': 'Podešavanja naloga',
  'profile.info': 'Podaci profila',
  'profile.savedAddresses': 'Sačuvane adrese',
  'profile.accountActions': 'Radnje naloga',
  'profile.loading': 'Učitavanje rezervacija...',
  'profile.noBookingsSub': 'Vaše vožnje će se pojaviti ovde.',
  'detail.paymentContact': 'Plaćanje i kontakt',
  'detail.payment': 'Plaćanje:',
  'detail.extras': 'Dodaci',
  'detail.luggage': 'Prtljag',
  'detail.bookedOn': 'Rezervisano:',
  'btn.cancel': 'Otkaži rezervaciju',
  'btn.modify': 'Izmeni rezervaciju',
  'btn.addToCalendar': 'Dodaj u kalendar',
  'btn.deleteAccount': 'Obriši nalog',
  'status.cancelled': 'Otkazano',
  'policy.title': 'Politika otkazivanja',
  'policy.freeCancellation':
    'Besplatno otkazivanje do 24 sata pre planiranog preuzimanja.',
  'policy.within24hFee':
    'Otkazivanja u roku od 24 sata podležu naknadi od 50%.',
  'policy.noShows': 'Nedolasci se ne refundiraju.',
  'policy.refundProcess':
    'Refundacije se automatski obrađuju na originalni način plaćanja u roku od 5–7 radnih dana.',
  'label.rateDriver': 'Oceni vozača',
  'label.rating': 'Ocena',
  'label.writeReview': 'Napiši recenziju',
  'btn.submitReview': 'Pošalji recenziju',
  'placeholder.review': 'Kako je prošla vožnja?',
  'confirm.cancelRide': 'Da li ste sigurni da želite da otkažete vožnju do {dest}?',
  'confirm.cancelNote':
    'Napomena: besplatno otkazivanje je dostupno do 24 sata pre preuzimanja.',
  'confirm.modifyRide': 'Upravo ćete izmeniti rezervaciju.',
  'confirm.modifyNote':
    'Napomena: bićete preusmereni na formu za rezervaciju. Važe aktuelne cene.',
  'confirm.deleteAccount':
    'Da li ste sigurni da želite da obrišete nalog? Ova radnja je nepovratna.',
  'confirm.deleteNote':
    'Upozorenje: svi lični podaci će biti uklonjeni. Stare rezervacije mogu biti razvezane.',
  'toast.reminderSet': 'Podsetnik je postavljen.',
  'toast.reminderRemoved': 'Podsetnik je uklonjen.',
  'toast.profileSaved': 'Profil je uspešno sačuvan!',
  'toast.ratingSubmitted': 'Ocena je poslata!',
  'toast.reviewSaved': 'Recenzija je sačuvana!',
  'toast.bookingCancelled': 'Rezervacija je otkazana',
  'toast.redirectModify': 'Preusmeravanje na formu...',

  // Auth
  'auth.login': 'Prijava',
  'auth.register': 'Napravi nalog',
  'auth.forgot': 'Resetuj lozinku',
  'auth.noAccount': 'Nemate nalog?',
  'auth.hasAccount': 'Već imate nalog?',
  'auth.sendLink': 'Pošalji link',
  'auth.password': 'Lozinka',
  'auth.changePassword': 'Promeni lozinku',
  'auth.currentPassword': 'Trenutna lozinka',
  'auth.newPassword': 'Nova lozinka',
  'auth.confirmPassword': 'Potvrdi novu lozinku',
  'auth.passwordTooShort': 'Lozinka mora imati najmanje 6 karaktera.',
  'auth.passwordsNoMatch': 'Lozinke se ne poklapaju.',
  'auth.passwordSame': 'Nova lozinka ne može biti ista kao trenutna.',
  'auth.incorrectPassword': 'Trenutna lozinka nije tačna.',
  'auth.errorChangePassword': 'Promena lozinke nije uspela. Pokušajte ponovo.',
  'auth.passwordChanged': 'Lozinka je uspešno promenjena!',
  'auth.savePassword': 'Sačuvaj lozinku',
  'auth.saved': 'Sačuvano',
  'auth.backSignIn': 'Nazad na prijavu',
  'auth.sentLink': 'Ako nalog postoji, link za reset je poslat na email.',
  'auth.joinCode': 'Kod kompanije (opciono)',
  'auth.joinCodePlaceholder': 'npr. TECH2025',

  // Admin
  'admin.tab.bookings': 'Dispeč',
  'admin.tab.drivers': 'Vozači',
  'admin.tab.analytics': 'Analitika',
  'admin.tab.clients': 'Kompanije',
  'admin.tab.users': 'Korisnici',
  'admin.totalRevenue': 'Ukupan prihod',
  'admin.totalRides': 'Ukupno vožnji',
  'admin.addDriver': 'Dodaj vozača',
  'admin.assignDriver': 'Dodeli vozača',
  'admin.unassigned': 'Nedodeljeno',
  'admin.avgRating': 'Prosečna ocena',
  'admin.fleet': 'Upravljanje flotom',
  'admin.selectPeriod': 'Izaberi period',
  'admin.startDate': 'Datum početka',
  'admin.endDate': 'Datum završetka',
  'admin.ordersPerDay': 'Porudžbine po danu',
  'admin.driverPerf': 'Učinak vozača',
  'admin.ridesFor': 'Vožnje za',
  'admin.allRides': 'Sve vožnje u periodu',
  'admin.noRides': 'Nema vožnji za ovaj datum.',
  'admin.noRidesCriteria': 'Nema vožnji za ove kriterijume.',
  'admin.table.timeId': 'Vreme / ID',
  'admin.table.route': 'Ruta (tačna adresa)',
  'admin.table.customer': 'Klijent',
  'admin.table.reqPrice': 'Zahtevi / Cena',
  'admin.table.driver': 'Vozač',
  'admin.table.status': 'Status',
  'admin.table.actions': 'Akcije',
  'admin.clearFilter': 'Očisti filter',
  'admin.clickToFilter': 'Kliknite na vozača da filtrirate listu ispod.',
  'admin.closeForm': 'Zatvori formu',
  'admin.clientMgmt': 'Upravljanje kompanijama',
  'admin.isCorporate': 'Korporativni nalog',
  'admin.companyName': 'Naziv kompanije',
  'admin.companyDomain': 'Email domen (@)',
  'admin.joinCode': 'Join kod',
  'admin.refreshCode': 'Osveži',
  'admin.discount': 'Popust %',
  'admin.editUser': 'Izmeni korisnika',
  'admin.userSearch': 'Pretraga korisnika',
  'admin.filterByCompany': 'Filtriraj po kompaniji',
  'admin.viewBookings': 'Pogledaj rezervacije',
  'admin.addCompany': 'Dodaj kompaniju',
  'admin.domainPlaceholder': 'npr. google.com',

  // Chat
  'chat.title': 'Transfer asistent',
  'chat.subtitle': 'Powered by Gemini AI',
  'chat.placeholder': 'Postavite pitanje...',
  'chat.welcome':
    'Zdravo! Ja sam vaš concierge za aerodromski transfer u Beču. Pitajte o vremenu putovanja, lokalnim savetima ili našim uslugama.',
  'chat.offline':
    'Trenutno sam offline. Proverite konekciju ili pokušajte kasnije.',
  'chat.error': 'Trenutno ne mogu da obradim zahtev.',
};

export const translations: Record<LanguageCode, Record<string, string>> = {
  en,
  de,
  fr,
  it,
  hr,
  sr,
  tr,
  uk,
  hu,
  ru,
};
