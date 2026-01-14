
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

type WorkflowStep = 'IDLE' | 'SELECTED' | 'PROCESSING' | 'DONE';
type ToolType = 'Rectangle' | 'Polygon' | null;

const App: React.FC = () => {
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [step, setStep] = useState<WorkflowStep>('IDLE');
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [fileName, setFileName] = useState("");
  
  const mapComponentRef = useRef<MapComponentRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTool = (tool: ToolType) => {
    const newTool = activeTool === tool ? null : tool;
    setActiveTool(newTool);
    mapComponentRef.current?.setDrawTool(newTool);
    if (newTool) {
        setStep('IDLE');
        setExportData(null);
        setZipBlob(null);
    }
  };

  const handleKMLUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && mapComponentRef.current) {
      setActiveTool(null);
      mapComponentRef.current.setDrawTool(null);
      mapComponentRef.current.loadKML(file);
    }
  };

  const startClipping = async () => {
    if (!mapComponentRef.current || !exportData) return;
    setStep('PROCESSING');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result = await mapComponentRef.current.getMapCanvas();
      if (!result) throw new Error();

      const { canvas, extent } = result;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const tiffBuffer = UTIF.encodeImage(imgData.data, canvas.width, canvas.height);
      const minCorner = proj4('EPSG:3857', 'EPSG:4326', [extent[0], extent[1]]);
      const maxCorner = proj4('EPSG:3857', 'EPSG:4326', [extent[2], extent[3]]);
      const tfw = [
        ((maxCorner[0] - minCorner[0]) / canvas.width).toFixed(12), "0.00", "0.00",
        (-( (maxCorner[1] - minCorner[1]) / canvas.height)).toFixed(12),
        minCorner[0].toFixed(12), maxCorner[1].toFixed(12)
      ].join('\n');
      
      const prj = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

      const zip = new JSZip();
      const baseName = `SIG_Clipping_${Date.now()}`;
      zip.file(`${baseName}.tif`, tiffBuffer);
      zip.file(`${baseName}.tfw`, tfw);
      zip.file(`${baseName}.prj`, prj);

      const blob = await zip.generateAsync({ type: 'blob' });
      setZipBlob(blob);
      setFileName(`${baseName}.zip`);
      setStep('DONE');
    } catch {
      setStep('IDLE');
      alert("خطأ في المعالجة");
    }
  };

  const downloadFile = () => {
    if (!zipBlob) return;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
    setStep('IDLE');
    setExportData(null);
  };

  const resetAll = () => {
    mapComponentRef.current?.clearAll();
    mapComponentRef.current?.setDrawTool(null);
    setExportData(null);
    setStep('IDLE');
    setActiveTool(null);
    setZipBlob(null);
  };

  return (
    <div className="w-screen h-screen flex bg-slate-950 text-white font-sans overflow-hidden">
      {/* Sidebar - Right Side */}
      <div className="w-96 bg-slate-900/50 backdrop-blur-2xl border-l border-white/10 flex flex-col p-6 z-20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30">
            <i className="fas fa-satellite"></i>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">GeoMapper Pro</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em]">Moroccan SIG Suite</p>
          </div>
        </div>

        {/* Tools Section */}
        <div className="space-y-6 flex-grow">
          <div>
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-4">أدوات التحديد والرفع</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => toggleTool('Rectangle')}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${activeTool === 'Rectangle' ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20' : 'bg-slate-800/50 border-white/5 hover:bg-slate-800'}`}
              >
                <i className="fas fa-vector-square text-xl"></i>
                <span className="text-xs font-bold">مستطيل</span>
              </button>
              <button 
                onClick={() => toggleTool('Polygon')}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${activeTool === 'Polygon' ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/20' : 'bg-slate-800/50 border-white/5 hover:bg-slate-800'}`}
              >
                <i className="fas fa-draw-polygon text-xl"></i>
                <span className="text-xs font-bold">مضلع</span>
              </button>
            </div>
          </div>

          <div className="pt-4">
            <input type="file" accept=".kml" className="hidden" ref={fileInputRef} onChange={handleKMLUpload} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all"
            >
              <i className="fas fa-file-import text-lg"></i>
              <span>رفع ملف KML</span>
            </button>
          </div>

          {/* Workflow Controller */}
          <div className="pt-8 border-t border-white/5">
            {step === 'IDLE' && (
              <div className="bg-slate-800/30 rounded-3xl p-6 text-center border border-white/5">
                <p className="text-slate-400 text-sm leading-relaxed">قم برفع ملف أو استخدام أدوات الرسم لتحديد المنطقة المطلوبة</p>
              </div>
            )}

            {step === 'SELECTED' && exportData && (
              <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                <div className="bg-indigo-600/10 rounded-3xl p-6 border border-indigo-500/20">
                  <h3 className="text-indigo-400 font-black text-sm mb-3">تفاصيل المنطقة</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between"><span>Lat:</span> <span className="text-white">{exportData.lat}</span></div>
                    <div className="flex justify-between"><span>Lng:</span> <span className="text-white">{exportData.lng}</span></div>
                    <div className="flex justify-between pt-2 border-t border-white/5"><span>Scale:</span> <span className="text-amber-400">{exportData.scale}</span></div>
                  </div>
                </div>
                <button 
                  onClick={startClipping}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 py-5 rounded-3xl font-black text-lg shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <i className="fas fa-cut"></i>
                  <span>بدء التقطيع</span>
                </button>
              </div>
            )}

            {step === 'PROCESSING' && (
              <div className="text-center py-10 space-y-6">
                <div className="w-20 h-20 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <div>
                  <h3 className="text-xl font-bold">جاري المعالجة</h3>
                  <p className="text-slate-400 text-sm">يتم الآن قص الصورة وتوليد ملفات الإسناد</p>
                </div>
              </div>
            )}

            {step === 'DONE' && (
              <div className="space-y-6 animate-in zoom-in duration-500">
                <div className="bg-emerald-500/10 rounded-3xl p-8 text-center border border-emerald-500/20">
                  <i className="fas fa-check-double text-4xl text-emerald-500 mb-4"></i>
                  <h3 className="text-xl font-black text-white">الملف جاهز</h3>
                  <p className="text-slate-400 text-xs mt-2">حزمة SIG كاملة (TIF + TFW + PRJ)</p>
                </div>
                <button 
                  onClick={downloadFile}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 py-5 rounded-3xl font-black text-lg shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all active:scale-95"
                >
                  <i className="fas fa-cloud-download-alt"></i>
                  <span>تنزيل الحزمة</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6">
           <button 
            onClick={resetAll}
            className="w-full text-slate-500 hover:text-red-400 py-3 text-xs font-bold uppercase tracking-widest transition-colors"
           >
             <i className="fas fa-refresh mr-2"></i> مسح الخريطة والبدء من جديد
           </button>
        </div>
      </div>

      {/* Main Map View */}
      <div className="flex-grow relative h-full">
        <MapComponent 
          ref={mapComponentRef} 
          onSelectionComplete={(data) => {
            setExportData(data);
            setStep('SELECTED');
            setActiveTool(null);
          }} 
        />
        
        {/* Map Overlays */}
        <div className="absolute top-8 left-8 bg-slate-900/80 backdrop-blur p-4 rounded-2xl border border-white/10 pointer-events-none">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-xs font-bold uppercase tracking-widest opacity-80">نظام القص الجغرافي النشط</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
