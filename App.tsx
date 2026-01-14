
import React, { useState, useCallback, useRef } from 'react';
import MapComponent from './components/MapComponent';
import { MapElement } from './types';
import { generateCSV } from './services/geoService';

const App: React.FC = () => {
  const [elements, setElements] = useState<MapElement[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [coordsInput, setCoordsInput] = useState({ lat: '', lng: '' });
  const mapControlRef = useRef<{ flyTo: (lat: number, lng: number) => void } | null>(null);

  const handleElementCreated = useCallback((el: MapElement) => {
    setElements(prev => [el, ...prev]);
  }, []);

  const downloadAll = () => {
    if (elements.length === 0) return;
    const csv = generateCSV(elements);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `بيانات_نظم_المعلومات_${Date.now()}.csv`;
    link.click();
  };

  const handleGoTo = () => {
    const lat = parseFloat(coordsInput.lat);
    const lng = parseFloat(coordsInput.lng);
    if (!isNaN(lat) && !isNaN(lng) && mapControlRef.current) {
      mapControlRef.current.flyTo(lat, lng);
    } else {
      alert("يرجى إدخال إحداثيات صالحة");
    }
  };

  const clearAll = () => {
    if (confirm("سيتم حذف جميع البيانات المرسومة. هل تريد الاستمرار؟")) {
      setElements([]);
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans text-slate-900 bg-slate-50 overflow-hidden" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm z-[1001]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white text-xl shadow-md">
            <i className="fas fa-globe-africa"></i>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">جيومابر برو <span className="text-blue-600">SIG</span></h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">منصة البنية التحتية للمملكة المغربية</p>
          </div>
        </div>
        <div className="hidden md:flex gap-6 items-center">
          <div className="flex flex-col items-start border-r pr-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase">نظام الإسقاط</span>
            <span className="text-xs font-bold text-slate-700">ميرشيش / لامبرت المغرب</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">حالة الخادم</p>
            <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> متصل
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Toggle (Mobile) */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 right-4 z-[1001] bg-white p-3 rounded-full shadow-lg border md:hidden text-blue-600"
        >
          <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`}></i>
        </button>

        {/* Sidebar Panel (Right Side) */}
        <aside className={`
          fixed inset-y-0 right-0 z-[2000] w-full max-w-sm bg-white shadow-2xl border-l flex flex-col transition-transform duration-300 transform
          md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}>
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-6">
              {/* Navigation Tools */}
              <section className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-[11px] font-bold text-slate-500 mb-3 flex items-center gap-2">
                  <i className="fas fa-location-arrow text-blue-500"></i> الملاحة الدقيقة
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={coordsInput.lat}
                      onChange={(e) => setCoordsInput({...coordsInput, lat: e.target.value})}
                      placeholder="خط العرض (Y)" 
                      className="w-full pr-8 pl-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <i className="fas fa-map-marker-alt absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={coordsInput.lng}
                      onChange={(e) => setCoordsInput({...coordsInput, lng: e.target.value})}
                      placeholder="خط الطول (X)" 
                      className="w-full pr-8 pl-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <i className="fas fa-map-pin absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
                  </div>
                </div>
                <button 
                  onClick={handleGoTo}
                  className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-black transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  انتقل إلى الإحداثيات
                </button>
              </section>

              {/* Elements Explorer */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                    <i className="fas fa-list-ul text-blue-500"></i> الطبقات والعناصر المرسومة
                  </h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                    {elements.length} عناصر
                  </span>
                </div>
                
                <div className="space-y-2">
                  {elements.length === 0 ? (
                    <div className="py-12 text-center bg-white border border-dashed rounded-xl border-slate-200">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-draw-polygon text-slate-300 text-xl"></i>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">استخدم أدوات الرسم على الخريطة</p>
                    </div>
                  ) : (
                    elements.map(el => (
                      <div key={el.id} className="group p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-300 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-sm text-slate-800">{el.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <i className="fas fa-map-marker-alt text-red-400"></i> {el.location}
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${
                            el.type === 'polygon' ? 'bg-emerald-50 text-emerald-600' :
                            el.type === 'line' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-600'
                          }`}>
                            {el.type === 'polygon' ? 'مساحة' : el.type === 'line' ? 'مسار' : 'نقطة'}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                          <div className="bg-slate-50 p-1.5 rounded">
                            <span className="text-slate-400 block mb-0.5 font-bold">الإحداثيات الجغرافية</span>
                            <span className="text-slate-700 font-mono truncate block">{el.coordinates.wgs84}</span>
                          </div>
                          <div className="bg-slate-50 p-1.5 rounded">
                            <span className="text-slate-400 block mb-0.5 font-bold">القياس الميداني</span>
                            <span className="text-slate-900 font-bold block">
                              {el.type === 'polygon' ? `${el.measurements.areaHectares} هكتار` : 
                               el.type === 'line' ? `${el.measurements.lengthKm} كلم` : 'نقطة تثبيت'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Footer Actions */}
              <div className="pt-4 border-t space-y-3">
                <button 
                  onClick={downloadAll}
                  disabled={elements.length === 0}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3.5 rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className="fas fa-file-export"></i> تصدير البيانات بصيغة CSV
                </button>
                <button 
                  onClick={clearAll}
                  className="w-full text-slate-400 hover:text-red-500 py-2 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <i className="fas fa-trash-alt"></i> مسح جميع الرسومات
                </button>
              </div>
            </div>
          </div>

          <footer className="p-4 bg-slate-50 border-t text-[10px] text-slate-400 flex justify-between items-center">
            <span className="font-bold">جليط مصطفى | jilitsig@gmail.com</span>
            <span className="px-2 py-0.5 bg-slate-200 rounded text-slate-600 font-mono">v2.5.1-SIG</span>
          </footer>
        </aside>

        {/* Map Area */}
        <div className="flex-1 relative">
           <MapComponent 
            onElementCreated={handleElementCreated} 
            elements={elements} 
            ref={mapControlRef}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
