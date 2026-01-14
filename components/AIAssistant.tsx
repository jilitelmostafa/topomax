
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MapElement } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

const AIAssistant: React.FC<{ elements: MapElement[] }> = ({ elements }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour ! Je suis votre assistant SIG spécialisé sur le Maroc. Comment puis-je vous aider aujourd'hui ? Je peux analyser vos mesures, parler des projections Lambert ou chercher des infos sur les villes." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const elementsSummary = elements.length > 0 
        ? `L'utilisateur a dessiné ${elements.length} éléments sur la carte du Maroc. Les derniers sont: ${elements.slice(0, 3).map(e => e.name + ' à ' + e.location).join(', ')}.`
        : "Aucun élément n'est encore dessiné.";

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: `Tu es un expert SIG (Système d'Information Géographique) travaillant pour GeoMapper Pro Maroc.
          Tes missions:
          1. Aider l'utilisateur avec ses mesures sur la carte.
          2. Expliquer les projections Lambert Maroc (Zone I à IV) et Merchich.
          3. Fournir des informations géographiques précises sur le Maroc (infrastructure, villes, topographie).
          Context actuel: ${elementsSummary}
          Réponds de manière professionnelle, courte et précise en français. Utilise le gras pour les chiffres importants.`,
          tools: [{ googleSearch: {} }]
        }
      });

      const text = response.text || "Désolé, je n'ai pas pu traiter votre demande.";
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

      setMessages(prev => [...prev, { role: 'assistant', content: text, sources }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Erreur de connexion avec l'IA. Vérifiez votre clé API." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 bg-indigo-600 text-white flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <i className="fas fa-microchip animate-pulse"></i>
        </div>
        <div>
          <p className="text-xs font-bold leading-none">SIG Assistant Engine</p>
          <p className="text-[10px] opacity-70">Propulsé par Gemini 3 Flash</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
              {m.sources && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sources Web:</p>
                  <div className="flex flex-wrap gap-1">
                    {m.sources.map((s, idx) => s.web && (
                      <a 
                        key={idx} 
                        href={s.web.uri} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                      >
                        <i className="fas fa-external-link-alt"></i> Source {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Posez une question SIG..."
            className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={isTyping}
            className="bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
        <p className="text-[9px] text-center text-slate-400 mt-2 font-medium">
          L'IA peut faire des erreurs. Vérifiez les mesures critiques.
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;
