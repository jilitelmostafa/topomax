
import { City } from './types';

export const MOROCCAN_CITIES: Record<string, City> = {
  "Casablanca": { lat: 33.5731, lng: -7.5898 },
  "Rabat": { lat: 34.0209, lng: -6.8416 },
  "Marrakech": { lat: 31.6295, lng: -7.9811 },
  "Fes": { lat: 34.0181, lng: -5.0078 },
  "Tangier": { lat: 35.7595, lng: -5.8340 },
  "Agadir": { lat: 30.4278, lng: -9.5981 },
  "Oujda": { lat: 34.6867, lng: -1.9114 },
  "Kenitra": { lat: 34.2524, lng: -6.5890 },
  "Tetouan": { lat: 35.5889, lng: -5.3626 },
  "Safi": { lat: 32.2994, lng: -9.2372 },
  "Laayoune": { lat: 27.1253, lng: -13.1625 },
  "Dakhla": { lat: 23.6848, lng: -15.9579 }
};

export const MAROC_PROJECTIONS = {
  NORTH: "EPSG:26191", // Lambert Nord
  SOUTH: "EPSG:26192", // Lambert Sud
};
