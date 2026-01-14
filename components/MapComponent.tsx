
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import { MapElement, ElementType } from '../types';
import { getClosestCity, convertToMarocLambert } from '../services/geoService';

interface MapComponentProps {
  onElementCreated: (element: MapElement) => void;
  elements: MapElement[];
}

// Localize Leaflet Draw to Arabic
const localizeDraw = () => {
  if (!(L as any).drawLocal) return;
  
  const drawLocal = (L as any).drawLocal;
  drawLocal.draw.toolbar.buttons.polyline = 'رسم مسار (خط)';
  drawLocal.draw.toolbar.buttons.polygon = 'رسم مساحة (مضلع)';
  drawLocal.draw.toolbar.buttons.rectangle = 'رسم مستطيل';
  drawLocal.draw.toolbar.buttons.circle = 'رسم دائرة';
  drawLocal.draw.toolbar.buttons.marker = 'إضافة علامة';
  drawLocal.draw.toolbar.buttons.circlemarker = 'إضافة نقطة دائرية';
  
  drawLocal.draw.toolbar.actions.title = 'إلغاء الرسم';
  drawLocal.draw.toolbar.actions.text = 'إلغاء';
  drawLocal.draw.toolbar.finish.title = 'إنهاء الرسم';
  drawLocal.draw.toolbar.finish.text = 'إنهاء';
  drawLocal.draw.toolbar.undo.title = 'حذف آخر نقطة';
  drawLocal.draw.toolbar.undo.text = 'تراجع';
  
  drawLocal.draw.handlers.polyline.tooltip.start = 'انقر لبدء رسم الخط';
  drawLocal.draw.handlers.polyline.tooltip.cont = 'انقر للاستمرار في الرسم';
  drawLocal.draw.handlers.polyline.tooltip.end = 'انقر على آخر نقطة لإنهاء الخط';
  
  drawLocal.draw.handlers.polygon.tooltip.start = 'انقر لبدء رسم المساحة';
  drawLocal.draw.handlers.polygon.tooltip.cont = 'انقر للاستمرار في تحديد المساحة';
  drawLocal.draw.handlers.polygon.tooltip.end = 'انقر على أول نقطة لإغلاق المساحة';
  
  drawLocal.edit.toolbar.actions.save.title = 'حفظ التغييرات';
  drawLocal.edit.toolbar.actions.save.text = 'حفظ';
  drawLocal.edit.toolbar.actions.cancel.title = 'إلغاء التعديلات';
  drawLocal.edit.toolbar.actions.cancel.text = 'إلغاء';
  
  drawLocal.edit.toolbar.buttons.edit = 'تعديل العناصر';
  drawLocal.edit.toolbar.buttons.editDisabled = 'لا توجد عناصر للتعديل';
  drawLocal.edit.toolbar.buttons.remove = 'حذف العناصر';
  drawLocal.edit.toolbar.buttons.removeDisabled = 'لا توجد عناصر للحذف';
};

const MapComponent = forwardRef((props: MapComponentProps, ref) => {
  const { onElementCreated, elements } = props;
  const mapRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const elementsRef = useRef(elements);

  // Sync ref with props to avoid stale closures in event listeners
  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number) => {
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 15);
        L.marker([lat, lng]).addTo(mapRef.current)
          .bindPopup(`الإحداثيات: ${lat.toFixed(6)}, ${lng.toFixed(6)}`)
          .openPopup();
      }
    }
  }));

  useEffect(() => {
    if (mapRef.current) return;

    localizeDraw();

    const map = L.map('map', {
      center: [31.7917, -7.0926],
      zoom: 6,
      zoomControl: false
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Layers
    const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
      maxZoom: 22,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google'
    }).addTo(map);

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    });

    const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    });

    L.control.layers({
      "قمر صناعي (جوجل)": googleHybrid,
      "خريطة الشارع (OSM)": osm,
      "قمر صناعي (Esri)": esriWorldImagery
    }, {}, { position: 'topleft' }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new (L.Control as any).Draw({
      edit: {
        featureGroup: drawnItems,
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          metric: true,
          shapeOptions: { color: '#2563eb', fillOpacity: 0.3, weight: 3 }
        },
        polyline: { shapeOptions: { color: '#f59e0b', weight: 4 } },
        rectangle: { shapeOptions: { color: '#10b981', fillOpacity: 0.3 } },
        circle: { shapeOptions: { color: '#ef4444', fillOpacity: 0.2 } },
        marker: { icon: L.icon({
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41]
        })}
      }
    });
    map.addControl(drawControl);

    map.on((L as any).Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const layerType = e.layerType as string; // Fixed: Use local variable name layerType to avoid conflicts
      drawnItems.addLayer(layer);

      const geoJson = layer.toGeoJSON();
      const center = layerType === 'marker' || layerType === 'circlemarker' || layerType === 'circle' 
        ? layer.getLatLng() 
        : layer.getBounds().getCenter();
      
      const locationName = getClosestCity(center.lat, center.lng);
      
      let finalElementType: ElementType = 'point';
      const measurements: any = {};

      if (layerType === 'polygon' || layerType === 'rectangle' || layerType === 'circle') {
        finalElementType = 'polygon';
        if (layerType === 'circle') {
          const radius = layer.getRadius();
          const area = Math.PI * radius * radius;
          measurements.area = area;
          measurements.areaHectares = (area / 10000).toFixed(4);
        } else {
          const latlngs = layer.getLatLngs()[0];
          let area = (L as any).GeometryUtil.geodesicArea(latlngs);
          measurements.area = area;
          measurements.areaHectares = (area / 10000).toFixed(4);
        }
      } else if (layerType === 'polyline') {
        finalElementType = 'line';
        const latlngs = layer.getLatLngs();
        let length = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
          length += latlngs[i].distanceTo(latlngs[i+1]);
        }
        measurements.length = length;
        measurements.lengthKm = (length / 1000).toFixed(3);
      }

      const typeLabels: Record<string, string> = {
        polygon: 'مساحة',
        rectangle: 'مستطيل',
        circle: 'دائرة',
        polyline: 'مسار',
        marker: 'نقطة',
        circlemarker: 'نقطة'
      };

      const newElement: MapElement = {
        id: Date.now(),
        name: `${typeLabels[layerType] || 'عنصر'} #${elementsRef.current.length + 1}`,
        type: finalElementType,
        drawType: layerType,
        location: locationName,
        createdAt: new Date().toLocaleTimeString('ar-MA'),
        coordinates: {
          wgs84: `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`,
          maroc: convertToMarocLambert(center.lat, center.lng)
        },
        measurements,
        geoJson
      };

      onElementCreated(newElement);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onElementCreated]);

  return <div id="map" className="flex-1 bg-slate-100 z-0"></div>;
});

export default MapComponent;
