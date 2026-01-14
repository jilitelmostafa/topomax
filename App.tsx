
import React, { useState, useRef } from 'react';
import MapComponent, { MapComponentRef } from './components/MapComponent';
import proj4 from 'proj4';

declare const UTIF: any;

interface ExportData {
  lat: string;
  lng: string;
  scale: string;
  bounds: number[];
}

const App: React.FC = () => {
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const mapComponentRef = useRef<MapComponentRef>(null);

  // توليد ملف World File بنظام WGS84
  const generateTFW = (extent: number[], width: number, height: number) => {
    // تحويل زوايا النطاق إلى WGS84
    const minCorner = proj4('EPSG:3857', 'EPSG:4326', [extent[0], extent[1]]);
    const maxCorner = proj4('EPSG:3857', 'EPSG:4326', [extent[2], extent[3]]);

    const pixelWidthDegree = (maxCorner[0] - minCorner[0]) / width;
    const pixelHeightDegree = (maxCorner[1] - minCorner[1]) / height;

    // TFW Format (6 lines)
    return [
      pixelWidthDegree.toFixed(12), // Pixel size in X (Lon)
      "0.000000000000",            // Rotation
      "0.000000000000",            // Rotation
      (-pixelHeightDegree).toFixed(12), // Pixel size in Y (Lat - negative)
      minCorner[0].toFixed(12),    // X coordinate of top-left pixel
      maxCorner[1].toFixed(12)     // Y coordinate of top-left pixel
    ].join('\n');
  };

  const handleDownload = async () => {
    if (!mapComponentRef.current || !exportData) return;
    setIsDownloading(true);

    try {
      const result = await mapComponentRef.current.getMapCanvas();
      if (!result) return;

      const { canvas, extent } = result;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 1. ملف الصورة TIFF
      const tiffBuffer = UTIF.encodeImage(imgData.data, canvas.width, canvas.height);
      const tiffBlob = new Blob([tiffBuffer], { type: 'image/tiff' });

      // 2. ملف الإحداثيات TFW (World File)
      const tfwContent = generateTFW(extent, canvas.width, canvas.height);
      const tfwBlob = new Blob([tfwContent], { type: 'text/plain' });

      // 3. ملف التعريف PRJ (WGS84 Projection)
      const prjContent = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';
      const prjBlob = new Blob([prjContent], { type: 'text/plain' });

      const baseName = `Map_WGS84_${exportData.lat}_${exportData.lng}`;

      // وظيفة مساعدة للتنزيل
      const downloadFile = (blob: Blob, ext: string) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${baseName}.${ext}`;
        link.click();
      };

      // تنزيل الحزمة (البرامج تقرأهم معاً إذا كانوا بنفس الاسم في نفس المجلد)
      downloadFile(tiffBlob, 'tif');
      setTimeout(() => downloadFile(tfwBlob, 'tfw'), 300);
      setTimeout(() => downloadFile(prjBlob, 'prj'), 600);

    } catch (error) {
      console.error(error);
      alert("خطأ في التصدير");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-slate-950">
      <MapComponent ref={mapComponentRef} onSelectionComplete={setExportData} />

      {exportData && (
        <div className="absolute inset-0 z-[2000] bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-right">
          <button onClick={() => setExportData(null)} className="absolute top-8 right-8 text-slate-400 hover:text-red-500 text-2xl"><i className="fas fa-times"></i></button>

          <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-100 max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl"><i className="fas fa-globe"></i></div>
              <h2 className="text-2xl font-bold text-slate-900">تصدير جغرافي WGS84</h2>
              <p className="text-slate-500 text-sm">سيتم إنشاء حزمة SIG متوافقة مع جميع الأنظمة</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-sm space-y-2">
              <div className="flex justify-between"><span>{exportData.lat}</span><span className="text-slate-400">Lat:</span></div>
              <div className="flex justify-between"><span>{exportData.lng}</span><span className="text-slate-400">Lng:</span></div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold"><span>{exportData.scale}</span><span className="text-slate-400">Scale:</span></div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-blue-800 text-xs font-bold leading-relaxed">
                <i className="fas fa-check-circle ml-1"></i>
                ستحصل على 3 ملفات (TIF, TFW, PRJ). 
                ضعهم في مجلد واحد ليتم التعرف على الإحداثيات تلقائياً في AutoCAD أو QGIS.
              </p>
            </div>

            <button onClick={handleDownload} disabled={isDownloading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50">
              {isDownloading ? <i className="fas fa-sync fa-spin"></i> : <i className="fas fa-download"></i>}
              <span>تنزيل حزمة الإحداثيات الجغرافية</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
