
import React, { useEffect, useRef, useState } from 'react';
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
  onSelectionComplete: (data: { x: string, y: string, scale: string, bounds: any }) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ onSelectionComplete }) => {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<VectorSource>(new VectorSource());
  const [activeTool, setActiveTool] = useState<string | null>(null);

  useEffect(() => {
    if (!mapElement.current) return;

    // Google Satellite Layer
    const googleLayer = new TileLayer({
      source: new XYZ({
        url: 'https://mt{0-3}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        maxZoom: 22,
      }),
    });

    // Drawing Layer
    const vectorLayer = new VectorLayer({
      source: sourceRef.current,
      style: new Style({
        fill: new Fill({ color: 'rgba(37, 99, 235, 0.15)' }),
        stroke: new Stroke({ color: '#2563eb', width: 2.5 }),
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#2563eb' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      }),
    });

    const map = new Map({
      target: mapElement.current,
      layers: [googleLayer, vectorLayer],
      view: new View({
        center: fromLonLat([-7.5898, 33.5731]),
        zoom: 13,
      }),
      controls: [
        new Zoom(),
        new ScaleLine({ units: 'metric', bar: true }),
        new FullScreen(),
      ],
    });

    mapRef.current = map;

    return () => map.setTarget(undefined);
  }, []);

  const setDrawInteraction = (type: string | null) => {
    if (!mapRef.current) return;

    // Clear previous interactions
    mapRef.current.getInteractions().forEach((interaction) => {
      if (interaction instanceof Draw) {
        mapRef.current?.removeInteraction(interaction);
      }
    });

    if (!type) {
      setActiveTool(null);
      return;
    }

    setActiveTool(type);

    let draw: Draw;
    if (type === 'Rectangle') {
      draw = new Draw({
        source: sourceRef.current,
        type: 'Circle',
        geometryFunction: createBox(),
      });
    } else {
      draw = new Draw({
        source: sourceRef.current,
        type: type as any,
      });
    }

    draw.on('drawend', (event) => {
      const geometry = event.feature.getGeometry();
      if (!geometry) return;

      // Reliable way to get center of any geometry (Point, Line, Polygon)
      const extent = geometry.getExtent();
      const centerX = (extent[0] + extent[2]) / 2;
      const centerY = (extent[1] + extent[3]) / 2;
      const centerCoord = toLonLat([centerX, centerY]);

      if (type === 'Rectangle') {
        const view = mapRef.current?.getView();
        const zoom = view?.getZoom() || 13;
        
        const lambert = convertToLambertRaw(centerCoord[1], centerCoord[0]);
        const scaleValue = calculateScale(zoom, centerCoord[1]);

        onSelectionComplete({
          x: lambert.x,
          y: lambert.y,
          scale: `1/${Math.round(parseFloat(scaleValue))}`,
          bounds: extent
        });
        
        // Auto-clear rectangle for next use to keep the view clean
        setTimeout(() => sourceRef.current.clear(), 500);
      }
    });

    mapRef.current.addInteraction(draw);
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapElement} className="w-full h-full overflow-hidden"></div>

      {/* Floating Toolbar (Right Side) */}
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-3 bg-white/90 backdrop-blur-lg p-2.5 rounded-2xl shadow-2xl border border-white/40 ring-1 ring-black/5">
        <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-1">الأدوات</div>
        <button 
          onClick={() => setDrawInteraction('Point')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTool === 'Point' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'hover:bg-blue-50 text-slate-600'}`}
          title="إضافة نقطة"
        >
          <i className="fas fa-map-marker-alt text-lg"></i>
        </button>
        <button 
          onClick={() => setDrawInteraction('LineString')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTool === 'LineString' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'hover:bg-blue-50 text-slate-600'}`}
          title="رسم مسار"
        >
          <i className="fas fa-route text-lg"></i>
        </button>
        <button 
          onClick={() => setDrawInteraction('Polygon')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTool === 'Polygon' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105' : 'hover:bg-blue-50 text-slate-600'}`}
          title="تحديد مساحة"
        >
          <i className="fas fa-draw-polygon text-lg"></i>
        </button>
        <div className="h-px bg-slate-100 mx-2"></div>
        <button 
          onClick={() => setDrawInteraction('Rectangle')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeTool === 'Rectangle' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'hover:bg-indigo-50 text-indigo-600'}`}
          title="تصدير منطقة"
        >
          <i className="fas fa-expand text-lg"></i>
        </button>
        <div className="h-px bg-slate-100 mx-2"></div>
        <button 
          onClick={() => {
            sourceRef.current.clear();
            setDrawInteraction(null);
          }}
          className="w-11 h-11 rounded-xl flex items-center justify-center hover:bg-red-50 text-red-500 transition-all active:scale-95"
          title="مسح الخريطة"
        >
          <i className="fas fa-trash-alt text-lg"></i>
        </button>
      </div>

      {/* Map Attribution Custom Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-md text-[10px] text-slate-600 border border-white/40 shadow-sm pointer-events-none">
        GeoMapper Pro | Maroc Lambert Zone 1 (EPSG:26191)
      </div>
    </div>
  );
};

export default MapComponent;
