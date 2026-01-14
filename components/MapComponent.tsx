
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { fromLonLat, toLonLat } from 'ol/proj';
import Draw, { createBox } from 'ol/interaction/Draw';
import { Style, Stroke, Fill, Circle as CircleStyle } from 'ol/style';
import { ScaleLine, Zoom, FullScreen } from 'ol/control';
import { convertToLambertRaw, calculateScale } from '../services/geoService';

interface MapComponentProps {
  onSelectionComplete: (data: { x: string, y: string, scale: string, bounds: number[], size: number[] }) => void;
}

export interface MapComponentRef {
  getMapCanvas: () => Promise<{ canvas: HTMLCanvasElement, extent: number[] } | null>;
}

const MapComponent = forwardRef<MapComponentRef, MapComponentProps>(({ onSelectionComplete }, ref) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<VectorSource>(new VectorSource());
  const [activeTool, setActiveTool] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getMapCanvas: async () => {
      if (!mapRef.current) return null;
      const map = mapRef.current;
      const size = map.getSize();
      const extent = map.getView().calculateExtent(size);

      return new Promise((resolve) => {
        map.once('rendercomplete', () => {
          const mapCanvas = document.createElement('canvas');
          if (!size) return resolve(null);
          mapCanvas.width = size[0];
          mapCanvas.height = size[1];
          const mapContext = mapCanvas.getContext('2d');
          if (!mapContext) return resolve(null);

          const canvases = mapElement.current?.querySelectorAll('.ol-layer canvas');
          canvases?.forEach((canvas: any) => {
            if (canvas.width > 0) {
              const opacity = canvas.parentNode.style.opacity;
              mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
              const transform = canvas.style.transform;
              let matrix;
              if (transform) {
                const match = transform.match(/^matrix\(([^\(]*)\)$/);
                if (match) {
                  matrix = match[1].split(',').map(Number);
                }
              }
              if (!matrix) {
                matrix = [
                  parseFloat(canvas.style.width) / canvas.width, 0, 0,
                  parseFloat(canvas.style.height) / canvas.height, 0, 0,
                ];
              }
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

    const googleLayer = new TileLayer({
      source: new XYZ({
        url: 'https://mt{0-3}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        maxZoom: 22,
        crossOrigin: 'anonymous',
      }),
    });

    const vectorLayer = new VectorLayer({
      source: sourceRef.current,
      style: new Style({
        fill: new Fill({ color: 'rgba(37, 99, 235, 0.15)' }),
        stroke: new Stroke({ color: '#2563eb', width: 2.5 }),
      }),
    });

    const map = new Map({
      target: mapElement.current,
      layers: [googleLayer, vectorLayer],
      view: new View({
        center: fromLonLat([-7.5898, 33.5731]),
        zoom: 13,
      }),
      controls: [new Zoom(), new ScaleLine(), new FullScreen()],
    });

    mapRef.current = map;
    return () => map.setTarget(undefined);
  }, []);

  const setDrawInteraction = (type: string | null) => {
    if (!mapRef.current) return;
    mapRef.current.getInteractions().forEach((interaction) => {
      if (interaction instanceof Draw) mapRef.current?.removeInteraction(interaction);
    });

    if (!type) { setActiveTool(null); return; }
    setActiveTool(type);

    let draw = new Draw({
      source: sourceRef.current,
      type: (type === 'Rectangle' ? 'Circle' : type) as any,
      geometryFunction: type === 'Rectangle' ? createBox() : undefined,
    });

    draw.on('drawend', (event) => {
      const geometry = event.feature.getGeometry();
      if (!geometry) return;
      const extent = geometry.getExtent();
      const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
      const lonLat = toLonLat(center);

      if (type === 'Rectangle') {
        const view = mapRef.current?.getView();
        const lambert = convertToLambertRaw(lonLat[1], lonLat[0]);
        const scale = calculateScale(view?.getZoom() || 13, lonLat[1]);
        const size = mapRef.current?.getSize() || [0,0];

        onSelectionComplete({
          x: lambert.x,
          y: lambert.y,
          scale: `1/${Math.round(parseFloat(scale))}`,
          bounds: extent,
          size: size
        });
        setTimeout(() => sourceRef.current.clear(), 500);
      }
    });

    mapRef.current.addInteraction(draw);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapElement} className="w-full h-full bg-slate-900"></div>
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-3 bg-white/90 backdrop-blur p-2.5 rounded-2xl shadow-2xl border border-white/40">
        <button onClick={() => setDrawInteraction('Rectangle')} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTool === 'Rectangle' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-indigo-50 text-indigo-600'}`}>
          <i className="fas fa-expand text-lg"></i>
        </button>
        <button onClick={() => { sourceRef.current.clear(); setDrawInteraction(null); }} className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-red-50 text-red-500">
          <i className="fas fa-trash-alt text-lg"></i>
        </button>
      </div>
    </div>
  );
});

export default MapComponent;
