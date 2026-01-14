
import proj4 from 'proj4';

// تعريف نظام الإسقاط المغربي (Lambert Zone 1 كمثال شائع)
proj4.defs("EPSG:26191", "+proj=lcc +lat_1=33.3 +lat_2=33.3 +lat_0=33.3 +lon_0=-5.4 +x_0=500000 +y_0=300000 +ellps=intl +units=m +no_defs");

export interface LambertCoords {
  x: string;
  y: string;
}

export const convertToLambertRaw = (lat: number, lng: number): LambertCoords => {
  try {
    const coords = proj4('EPSG:4326', 'EPSG:26191', [lng, lat]);
    return {
      x: coords[0].toFixed(2),
      y: coords[1].toFixed(2)
    };
  } catch (e) {
    return { x: '0.00', y: '0.00' };
  }
};

export const calculateScale = (zoom: number, lat: number): string => {
  // تقريب لمقياس الرسم بناءً على الزووم
  // Formula: Scale = (Cos(lat) * 2 * PI * 6378137) / (256 * 2^zoom)
  // تحويل لواحد على مقياس رسم
  const metersPerPixel = (Math.cos(lat * Math.PI / 180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, zoom));
  // لنفترض أن الشاشة القياسية هي 96 DPI (0.00026458333333333 متر لكل بكسل)
  const scale = metersPerPixel / 0.000264583333;
  return scale.toFixed(2);
};
