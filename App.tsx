
import React, { useState, useRef } from 'react';
import MapComponent, { MapComponentRef } from './components/MapComponent';
import proj4 from 'proj4';

// تعريف المسقط المغربي للحسابات
proj4.defs("EPSG:26191", "+proj=lcc +lat_1=33.3 +lat_2=33.3 +lat_0=33.3 +lon_0=-5.4 +x_0=500000 +y_0=300000 +ellps=intl +units=m +no_defs");

interface ExportData {
  x: string;
  y: string;
  scale: string;
  bounds: number[];
  size: number[];
}

declare const UTIF: any;

const App: React.FC = () => {
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const mapComponentRef = useRef<MapComponentRef>(null);

  const generateTFW = (extent: number[], width: number, height: number) => {
    // تحويل زوايا النطاق من Web Mercator إلى Maroc Lambert
    const minCoord = proj4('EPSG:3857', 'EPSG:26191', [extent[0], extent[1]]);
    const maxCoord = proj4('EPSG:3857', 'EPSG:26191', [extent[2], extent[3]]);

    const resX = (maxCoord[0] - minCoord[0]) / width;
    const resY = (maxCoord[1] - minCoord[1]) / height; // عادة ما تكون سالبة في ملفات العالم

    // هيكل ملف TFW:
    // 1. Pixel Size X
    // 2. Rotation Y (0)
    // 3. Rotation X (0)
    // 4. Pixel Size Y (negative)
    // 5. X of top-left pixel center
    // 6. Y of top-left pixel center
    return `${resX.toFixed(8)}\n0.00000000\n0.00000000\n${(-resY).toFixed(8)}\n${minCoord[0].toFixed(8)}\n${maxCoord[1].toFixed(8)}`;
  };

  const handleDownload = async () => {
    if (!mapComponentRef.current || !exportData) return;
    setIsDownloading(true);

    try {
      const result = await mapComponentRef.current.getMapCanvas();
      if (!result) throw new Error("Canvas generation failed");

      const { canvas, extent } = result;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // 1. إنشاء ملف TIFF باستخدام UTIF.js
      const tiffBuffer = UTIF.encodeImage(imgData.data, canvas.width, canvas.height);
      const tiffBlob = new Blob([tiffBuffer], { type: 'image/tiff' });
      
      // 2. إنشاء ملف TFW (World File) للإحداثيات
      const tfwContent = generateTFW(extent, canvas.width, canvas.height);
      const tfwBlob = new Blob([tfwContent], { type: 'text/plain' });

      // تنزيل ملف التيف
      const tiffLink = document.createElement('a');
      const baseName = `Maroc_SIG_${exportData.x}_${exportData.y}`;
      tiffLink.download = `${baseName}.tif`;
      tiffLink.href = URL.createObjectURL(tiffBlob);
      tiffLink.click();

      // تنزيل ملف الإحداثيات (بشكل متزامن لضمان اقترانهما)
      setTimeout(() => {
        const tfwLink = document.createElement('a');
        tfwLink.download = `${baseName}.tfw`;
        tfwLink.href = URL.createObjectURL(tfwBlob);
        tfwLink.click();
      }, 500);

    } catch (error) {
      console.error("Export error:", error);
      alert("حدث خطأ أثناء تصدير ملفات SIG.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-slate-900 font-sans">
      <MapComponent ref={mapComponentRef} onSelectionComplete={setExportData} />

      {!exportData && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur shadow-2xl border border-blue-200 px-6 py-3 rounded-2xl flex items-center gap-4 animate-bounce">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white"><i className="fas fa-info-circle"></i></div>
            <p className="text-sm font-bold text-slate-800">استخدم أداة المربع لتصدير منطقة بنظام Lambert</p>
          </div>
        </div>
      )}

      {exportData && (
        <div className="absolute inset-0 z-[2000] bg-white/95 backdrop-blur-lg flex flex-col items-center justify-center animate-in fade-in duration-300">
          <button onClick={() => setExportData(null)} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-red-600 transition-all"><i className="fas fa-times text-xl"></i></button>

          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-lg w-full text-center space-y-8">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto text-3xl"><i className="fas fa-file-export"></i></div>
              <h2 className="text-2xl font-bold text-slate-900">جاهز للتصدير بنظام SIG</h2>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 font-mono">
                <div className="text-left"><p className="text-[10px] text-slate-400 uppercase">X (Lambert)</p><p className="text-blue-600 font-bold">{exportData.x}</p></div>
                <div className="text-left"><p className="text-[10px] text-slate-400 uppercase">Y (Lambert)</p><p className="text-blue-600 font-bold">{exportData.y}</p></div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl text-right">
              <p className="text-amber-800 text-xs font-bold mb-1"><i className="fas fa-lightbulb ml-1"></i> ملاحظة للمهندسين:</p>
              <p className="text-amber-700 text-[10px] leading-relaxed">سيتم تنزيل ملفين (<b>.tif</b> و <b>.tfw</b>). ضعهما في نفس المجلد لفتح الخريطة بإحداثياتها الجيوديسية الصحيحة في برامج CAD/GIS.</p>
            </div>

            <button onClick={handleDownload} disabled={isDownloading} className="bg-blue-600 hover:bg-blue-700 text-white w-full py-5 rounded-2xl text-xl font-bold shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50">
              {isDownloading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-download"></i>}
              <span>تحميل حزمة SIG</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
