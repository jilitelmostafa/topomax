
import React, { useState, useRef } from 'react';
import MapComponent, { MapComponentRef } from './components/MapComponent';
import proj4 from 'proj4';

declare const UTIF: any;
declare const JSZip: any;

interface ExportData {
  lat: string;
  lng: string;
  scale: string;
  bounds: number[];
}

const App: React.FC = () => {
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isKMLMode, setIsKMLMode] = useState(false);
  const mapComponentRef = useRef<MapComponentRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKMLUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && mapComponentRef.current) {
      setIsKMLMode(true);
      mapComponentRef.current.loadKML(file);
    }
  };

  const generateTFW = (extent: number[], width: number, height: number) => {
    const minCorner = proj4('EPSG:3857', 'EPSG:4326', [extent[0], extent[1]]);
    const maxCorner = proj4('EPSG:3857', 'EPSG:4326', [extent[2], extent[3]]);
    const pixelWidthDegree = (maxCorner[0] - minCorner[0]) / width;
    const pixelHeightDegree = (maxCorner[1] - minCorner[1]) / height;
    return [
      pixelWidthDegree.toFixed(12), "0.000000000000", "0.000000000000",
      (-pixelHeightDegree).toFixed(12), minCorner[0].toFixed(12), maxCorner[1].toFixed(12)
    ].join('\n');
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

      // 1. TIFF Image (With Alpha Channel for Masking)
      const tiffBuffer = UTIF.encodeImage(imgData.data, canvas.width, canvas.height);
      
      // 2. World File (TFW)
      const tfwContent = generateTFW(extent, canvas.width, canvas.height);
      
      // 3. Projection File (PRJ)
      const prjContent = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

      // 4. Create ZIP Bundle
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseName = isKMLMode ? `Clipped_SIG_${timestamp}` : `Manual_SIG_${timestamp}`;
      
      zip.file(`${baseName}.tif`, tiffBuffer);
      zip.file(`${baseName}.tfw`, tfwContent);
      zip.file(`${baseName}.prj`, prjContent);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `${baseName}.zip`;
      link.click();
      URL.revokeObjectURL(zipUrl);

      setExportData(null);
      setIsKMLMode(false);

    } catch (error) {
      console.error(error);
      alert("خطأ أثناء معالجة القناع الجغرافي.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-slate-950 font-sans">
      <MapComponent 
        ref={mapComponentRef} 
        onSelectionComplete={(data) => setExportData(data)} 
      />

      {/* Tools Menu */}
      <div className="absolute top-6 left-6 z-10">
        <div className="bg-white/95 backdrop-blur-xl p-3 rounded-3xl shadow-2xl border border-white/20 flex flex-col gap-4">
          <input type="file" accept=".kml" className="hidden" ref={fileInputRef} onChange={handleKMLUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg transition-all flex items-center justify-center text-xl active:scale-90"
            title="تحميل KML للقص المباشر"
          >
            <i className="fas fa-layer-group"></i>
          </button>
        </div>
      </div>

      {exportData && (
        <div className="absolute inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-right">
          <div className="bg-white p-10 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-slate-100 max-w-md w-full space-y-8 relative animate-in zoom-in duration-500">
            <button onClick={() => { setExportData(null); setIsKMLMode(false); }} className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"><i className="fas fa-times text-2xl"></i></button>

            <div className="text-center space-y-3">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-xl ${isKMLMode ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                <i className={isKMLMode ? "fas fa-mask" : "fas fa-crop-alt"}></i>
              </div>
              <h2 className="text-3xl font-black text-slate-900">{isKMLMode ? 'قص حسب الحدود' : 'تصدير المنطقة'}</h2>
              <p className="text-slate-500 font-medium">سيتم تصدير الصورة بدقة داخل حدود المضلع فقط</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">الإسقاط</p>
                <p className="text-sm font-bold text-slate-800">WGS84</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">المقياس</p>
                <p className="text-sm font-bold text-slate-800">{exportData.scale}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-blue-50 text-blue-800 rounded-2xl text-xs border border-blue-100 leading-relaxed font-bold">
                <i className="fas fa-shield-alt ml-2"></i>
                سيتم إنشاء ملف .tif شفاف خارج الحدود المطلوبة لتسهيل التركيب في AutoCAD.
              </div>
              
              <button 
                onClick={handleDownload} 
                disabled={isDownloading} 
                className="w-full bg-slate-900 hover:bg-black text-white py-6 rounded-3xl font-black flex items-center justify-center gap-4 shadow-2xl transition-all active:scale-95 disabled:opacity-50"
              >
                {isDownloading ? <i className="fas fa-spinner fa-spin text-2xl"></i> : <i className="fas fa-file-export text-2xl"></i>}
                <span className="text-xl">تنزيل حزمة ZIP</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
