
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import Draw, { createBox } from 'ol/interaction/Draw';
import { Style, Stroke, Fill } from 'ol/style';
import { ScaleLine, Zoom, FullScreen } from 'ol/control';
import KML from 'ol/format/KML';
import Polygon from 'ol/geom/Polygon';
import MultiPolygon from 'ol/geom/MultiPolygon';
import { convertToWGS84, calculateScale } from '../services/geoService';

interface MapComponentProps {
  onSelectionComplete: (data: { lat: string, lng: string, scale: string, bounds: number[] }) => void;
}

export interface MapComponentRef {
  getMapCanvas: () => Promise<{ canvas: HTMLCanvasElement, extent: number[] } | null>;
  loadKML: (file: File) => void;
  setDrawTool: (type: 'Rectangle' | 'Polygon' | null) => void;
  clearAll: () => void;
}

const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(({ onSelectionComplete }, ref) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<VectorSource>(new VectorSource());
  const kmlSourceRef = useRef<VectorSource>(new VectorSource());

  useImperativeHandle(ref, () => ({
    loadKML: (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const kmlText = e.target?.result as string;
        const features = new KML().readFeatures(kmlText, {
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857'
        });
        
        kmlSourceRef.current.clear();
        sourceRef.current.clear();
        kmlSourceRef.current.addFeatures(features);
        
        if (features.length > 0 && mapRef.current) {
          const extent = kmlSourceRef.current.getExtent();
          mapRef.current.getView().fit(extent, { 
            padding: [100, 100, 100, 100], 
            duration: 1000,
            callback: () => {
              const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
              const wgs = convertToWGS84(center[0], center[1]);
              const currentZoom = mapRef.current?.getView().getZoom() || 13;
              const scale = calculateScale(currentZoom, parseFloat(wgs.lat));

              onSelectionComplete({
                lat: wgs.lat,
                lng: wgs.lng,
                scale: `1/${scale}`,
                bounds: extent
              });
            }
          });
        }
      };
      reader.readAsText(file);
    },
    setDrawTool: (type) => {
      if (!mapRef.current) return;
      mapRef.current.getInteractions().forEach((i) => { if (i instanceof Draw) mapRef.current?.removeInteraction(i); });
      if (!type) return;

      const draw = new Draw({
        source: sourceRef.current,
        type: type === 'Rectangle' ? 'Circle' : 'Polygon',
        geometryFunction: type === 'Rectangle' ? createBox() : undefined,
      });

      draw.on('drawstart', () => {
        sourceRef.current.clear();
        kmlSourceRef.current.clear();
      });

      draw.on('drawend', (event) => {
        const geometry = event.feature.getGeometry();
        if (!geometry) return;
        const extent = geometry.getExtent();
        const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
        const wgs = convertToWGS84(center[0], center[1]);
        const scale = calculateScale(mapRef.current?.getView().getZoom() || 13, parseFloat(wgs.lat));

        onSelectionComplete({
          lat: wgs.lat,
          lng: wgs.lng,
          scale: `1/${scale}`,
          bounds: extent
        });
      });

      mapRef.current.addInteraction(draw);
    },
    clearAll: () => {
      sourceRef.current.clear();
      kmlSourceRef.current.clear();
    },
    getMapCanvas: async () => {
      if (!mapRef.current) return null;
      const map = mapRef.current;
      const size = map.getSize();
      if (!size) return null;
      
      const extent = map.getView().calculateExtent(size);
      const resolution = map.getView().getResolution();

      return new Promise((resolve) => {
        map.once('rendercomplete', () => {
          const mapCanvas = document.createElement('canvas');
          mapCanvas.width = size[0];
          mapCanvas.height = size[1];
          const mapContext = mapCanvas.getContext('2d');
          if (!mapContext) return resolve(null);

          // Clip by Mask: يشمل الـ KML والرسوم اليدوية
          const allFeatures = [...kmlSourceRef.current.getFeatures(), ...sourceRef.current.getFeatures()];
          
          if (allFeatures.length > 0 && resolution !== undefined) {
            mapContext.beginPath();
            allFeatures.forEach(feature => {
              const geom = feature.getGeometry();
              const coords: any[] = [];
              if (geom instanceof Polygon) coords.push(geom.getCoordinates());
              else if (geom instanceof MultiPolygon) coords.push(...geom.getCoordinates());

              coords.forEach(polyCoords => {
                polyCoords.forEach((ring: any[]) => {
                  ring.forEach((coord, idx) => {
                    const px = (coord[0] - extent[0]) / resolution;
                    const py = (extent[3] - coord[1]) / resolution;
                    if (idx === 0) mapContext.moveTo(px, py);
                    else mapContext.lineTo(px, py);
                  });
                  mapContext.closePath();
                });
              });
            });
            mapContext.clip();
          }

          const canvases = mapElement.current?.querySelectorAll('.ol-layer canvas');
          canvases?.forEach((canvas: any) => {
            if (canvas.width > 0) {
              const opacity = canvas.parentNode.style.opacity;
              mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
              const transform = canvas.style.transform;
              let matrix;
              if (transform) {
                const match = transform.match(/^matrix\(([^\(]*)\)$/);
                if (match) matrix = match[1].split(',').map(Number);
              }
              if (!matrix) matrix = [parseFloat(canvas.style.width) / canvas.width, 0, 0, parseFloat(canvas.style.height) / canvas.height, 0, 0];
              
              CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
              mapContext.drawImage(canvas, 0, 0);
            }
          });
          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          resolve({ canvas: mapCanvas, extent: extent });
        });
        map.renderSync();
      });
    }
  }));

  useEffect(() => {
    if (!mapElement.current) return;
    const map = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://mt{0-3}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
            maxZoom: 22,
            crossOrigin: 'anonymous',
          }),
        }),
        new VectorLayer({
          source: kmlSourceRef.current,
          style: new Style({
            stroke: new Stroke({ color: '#f59e0b', width: 3 }),
            fill: new Fill({ color: 'rgba(245, 158, 11, 0.1)' }),
          }),
        }),
        new VectorLayer({
          source: sourceRef.current,
          style: new Style({
            fill: new Fill({ color: 'rgba(59, 130, 246, 0.15)' }),
            stroke: new Stroke({ color: '#3b82f6', width: 3, lineDash: [5, 5] }),
          }),
        })
      ],
      view: new View({ center: fromLonLat([-7.5898, 33.5731]), zoom: 6 }),
      controls: [new Zoom(), new ScaleLine()],
    });
    mapRef.current = map;
    return () => map.setTarget(undefined);
  }, []);

  return <div ref={mapElement} className="w-full h-full bg-slate-900"></div>;
});

export default MapComponent;
