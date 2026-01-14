
import proj4 from 'proj4';
import { MOROCCAN_CITIES } from '../constants';
import { ElementType, MapElement } from '../types';

// Define Moroccan Lambert Projections
proj4.defs("EPSG:26191", "+proj=lcc +lat_1=33.21666666666667 +lat_2=35 +lat_0=33.21666666666667 +lon_0=-5.4 +x_0=500000 +y_0=300000 +ellps=intl +units=m +no_defs");
proj4.defs("EPSG:26192", "+proj=lcc +lat_1=29.66666666666667 +lat_2=31 +lat_0=29.66666666666667 +lon_0=-8.75 +x_0=600000 +y_0=300000 +ellps=intl +units=m +no_defs");

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getClosestCity = (lat: number, lng: number): string => {
  let closestCity = '';
  let minDistance = Infinity;

  const cityTranslations: Record<string, string> = {
    "Casablanca": "الدار البيضاء",
    "Rabat": "الرباط",
    "Marrakech": "مراكش",
    "Fes": "فاس",
    "Tangier": "طنجة",
    "Agadir": "أكادير",
    "Oujda": "وجدة",
    "Kenitra": "القنيطرة",
    "Tetouan": "تطوان",
    "Safi": "آسفي",
    "Laayoune": "العيون",
    "Dakhla": "الداخلة"
  };

  for (const [city, coords] of Object.entries(MOROCCAN_CITIES)) {
    const distance = calculateDistance(lat, lng, coords.lat, coords.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestCity = city;
    }
  }

  const cityName = cityTranslations[closestCity] || closestCity;

  if (minDistance < 10) return `في ${cityName}`;
  if (minDistance < 50) return `بالقرب من ${cityName}`;
  return `جهة ${cityName}`;
};

export const convertToMarocLambert = (lat: number, lng: number): string => {
  try {
    const coords = proj4('EPSG:4326', 'EPSG:26191', [lng, lat]);
    return `${coords[0].toFixed(2)} م, ${coords[1].toFixed(2)} م`;
  } catch (e) {
    return 'N/A';
  }
};

export const generateCSV = (elements: MapElement[]): string => {
  const header = "الاسم,النوع,الموقع,إحداثيات WGS84,إسقاط لامبرت,القياس,التاريخ\n";
  const rows = elements.map(el => {
    const typeLabel = el.type === 'polygon' ? 'مساحة' : el.type === 'line' ? 'مسار' : 'نقطة';
    const measure = el.type === 'polygon' ? `${el.measurements.areaHectares} هكتار` : 
                   el.type === 'line' ? `${el.measurements.lengthKm} كلم` : 'نقطة موقع';
    return `"${el.name}","${typeLabel}","${el.location}","${el.coordinates.wgs84}","${el.coordinates.maroc}","${measure}","${el.createdAt}"`;
  }).join("\n");
  return "\uFEFF" + header + rows; // UTF-8 BOM for Excel Arabic support
};
