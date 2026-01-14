
import proj4 from 'proj4';

// تعريف المساقط
proj4.defs("EPSG:3857", "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs");
proj4.defs("EPSG:4326", "+proj=longlat +datum=WGS84 +no_defs");

export interface WGS84Coords {
  lat: string;
  lng: string;
}

export const convertToWGS84 = (x: number, y: number): WGS84Coords => {
  try {
    // التحويل من Web Mercator (الخريطة) إلى WGS84
    const coords = proj4('EPSG:3857', 'EPSG:4326', [x, y]);
    return {
      lng: coords[0].toFixed(6),
      lat: coords[1].toFixed(6)
    };
  } catch (e) {
    return { lat: '0.000000', lng: '0.000000' };
  }
};

export const calculateScale = (zoom: number, lat: number): string => {
  const metersPerPixel = (Math.cos(lat * Math.PI / 180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, zoom));
  const scale = metersPerPixel / 0.000264583333;
  return scale.toFixed(0);
};
