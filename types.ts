
export type ElementType = 'point' | 'line' | 'polygon';

export interface Measurements {
  length?: number;
  lengthKm?: string;
  area?: number;
  areaHectares?: string;
  perimeter?: number;
  perimeterKm?: string;
  coordinates?: {
    wgs84: string;
    maroc: string;
  };
}

export interface MapElement {
  id: number;
  name: string;
  type: ElementType;
  drawType: string;
  location: string;
  createdAt: string;
  measurements: Measurements;
  coordinates: {
    wgs84: string;
    maroc: string;
  };
  geoJson: any;
}

export interface City {
  lat: number;
  lng: number;
}
