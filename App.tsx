
import React, { useState } from 'react';
import MapComponent from './components/MapComponent';

interface ExportData {
  x: string;
  y: string;
  scale: string;
  bounds: any;
}

const App: React.FC = () => {
  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    // Simulation of GIS processing and capturing
    setTimeout(() => {
      setIsDownloading(false);
      alert("تم تجهيز البيانات بنجاح. يرجى النقر بزر الفأرة الأيمن على الخريطة واختيار 'حفظ الصورة باسم' (Save Image As).");
    }, 1200);
  };

  const closeOverlay = () => setExportData(null);

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-slate-900 font-sans">
      <MapComponent onSelectionComplete={(data) => setExportData(data)} />

      {/* Instructions Prompt */}
      {!exportData && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-white/95 backdrop-blur shadow-2xl border border-blue-200 px-6 py-3 rounded-2xl flex items-center gap-4 animate-bounce">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
              <i className="fas fa-info-circle"></i>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">استخدم أداة التصدير (المربع) لتحديد منطقة التحميل</p>
              <p className="text-[10px] text-slate-500 font-medium">سيتم حساب إحداثيات Lambert المغربية تلقائياً</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Interface Overlay */}
      {exportData && (
        <div className="absolute inset-0 z-[2000] bg-white/90 backdrop-blur-md flex flex-col items-center justify-center custom-modal-font animate-in fade-in zoom-in-95 duration-300">
          <button 
            onClick={closeOverlay}
            className="absolute top-8 right-8 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-all active:scale-90 shadow-sm"
          >
            <i className="fas fa-times text-xl"></i>
          </button>

          <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 max-w-lg w-full text-center space-y-10">
            <div className="space-y-4">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-inner border border-blue-100/50">
                <i className="fas fa-map-marked-alt"></i>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">إحداثيات Lambert</h2>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 font-mono text-2xl text-blue-700 flex flex-col gap-2 shadow-sm">
                <div className="flex justify-between items-center px-4">
                  <span className="text-slate-400 text-sm font-sans font-bold">X (Easting)</span>
                  <span>{exportData.x}</span>
                </div>
                <div className="h-px bg-slate-200/50 w-full"></div>
                <div className="flex justify-between items-center px-4">
                  <span className="text-slate-400 text-sm font-sans font-bold">Y (Northing)</span>
                  <span>{exportData.y}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-slate-400 text-xs uppercase tracking-[0.2em] font-black">مقياس الرسم التقريبي</span>
              <p className="text-5xl font-extrabold text-slate-900">{exportData.scale}</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className={`relative overflow-hidden bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white w-full py-5 rounded-2xl text-xl font-bold shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 ${isDownloading ? 'cursor-not-allowed' : 'active:scale-[0.98]'}`}
              >
                {isDownloading ? (
                  <>
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>جاري التحويل...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    <span>تصدير ملف الصورة</span>
                  </>
                )}
              </button>
              <p className="text-slate-400 text-xs font-medium">
                <i className="fas fa-mouse-pointer mr-1"></i> الخطوة الأخيرة: انقر باليمين للحفظ بعد التحميل
              </p>
            </div>

            <div className="pt-6 border-t border-slate-50">
              <p className="text-red-500 text-xs font-bold flex items-center justify-center gap-2 bg-red-50 py-2 px-4 rounded-full">
                <i className="fas fa-exclamation-triangle"></i>
                أغلق هذه النافذة للعودة إلى وضع التحرير
              </p>
            </div>
          </div>
          
          <div className="mt-8 text-slate-400 text-xs font-bold tracking-widest uppercase opacity-60">
            GeoMapper Pro SIG v3.0 | Moroccan Mapping Solution
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
