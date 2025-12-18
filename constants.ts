
import { City, Vehicle, VehicleType } from './types';

export const VIENNA_AIRPORT = "Vienna International Airport (VIE)";

export const CITIES: City[] = [
  { name: "Vienna", distanceKm: 20, country: "Austria" },
  { name: "Bratislava", distanceKm: 65, country: "Slovakia" },
  { name: "St. Pölten", distanceKm: 90, country: "Austria" },
  { name: "Wiener Neustadt", distanceKm: 60, country: "Austria" },
  { name: "Eisenstadt", distanceKm: 40, country: "Austria" },
  { name: "Parndorf", distanceKm: 30, country: "Austria" },
  { name: "Sopron", distanceKm: 75, country: "Hungary" },
  { name: "Brno", distanceKm: 130, country: "Czech Republic" }, // Slightly over 100km but popular
  { name: "Krems an der Donau", distanceKm: 95, country: "Austria" },
  { name: "Baden bei Wien", distanceKm: 45, country: "Austria" },
  { name: "Mödling", distanceKm: 35, country: "Austria" },
  { name: "Mosonmagyaróvár", distanceKm: 70, country: "Hungary" },
  { name: "Trnava", distanceKm: 110, country: "Slovakia" },
  { name: "Győr", distanceKm: 100, country: "Hungary" },
  { name: "Mistelbach", distanceKm: 60, country: "Austria" },
  { name: "Tulln", distanceKm: 65, country: "Austria" },
];

export const VEHICLES: Vehicle[] = [
  {
    id: 'eco',
    type: VehicleType.ECONOMY,
    name: 'vehicle.sedan',
    image: 'https://pictures.dealer.com/p/platinumvolkswagenvw/1929/d1d4a2dc7f2521b927ae928b2e369bd1x.jpg',
    passengers: 3,
    luggage: 2,
    priceMultiplier: 1.0,
    basePrice: 35
  },
  {
    id: 'comf',
    type: VehicleType.COMFORT,
    name: 'vehicle.wagon',
    image: 'https://pictures.dealer.com/p/platinumvolkswagenvw/0220/2027e777caaf6615444e4ae111667aeax.jpg',
    passengers: 4,
    luggage: 4,
    priceMultiplier: 1.3,
    basePrice: 45
  },
  {
    id: 'biz',
    type: VehicleType.VAN,
    name: 'vehicle.van',
    image: 'https://afxfuvomxq.cloudimg.io/v7/https://www.autoplenum.de/rails/active_storage/mono/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTAxOTU3LCJwdXIiOiJibG9iX2lkIn19--356143afd1671a5f07e7e4a6c7f0f660307fcb3f/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fbGltaXQiOlsxMDI1LDY4MF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--ff334b316e54dc4d1fbd5ba1cee4419317cb1a2c/mercedes_19vitotour126vp1e_angularfront.jpg',
    passengers: 8,
    luggage: 8,
    priceMultiplier: 2.0,
    basePrice: 65
  }
];

export const SERVICE_TIPS = [
  "tip.airportPickup",
  "tip.beReady",
  "tip.payment",
  "tip.safety",
  "tip.flightMonitoring",
  "tip.cancellation",
  "tip.createAccount"
];

export const BASE_RATE_PER_KM = 1.8; // Euro per km
