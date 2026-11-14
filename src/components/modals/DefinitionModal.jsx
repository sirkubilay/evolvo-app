import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

// Oturum boyunca TDK cevaplarını hafızada tut (aynı kelimeye tekrar istek atma)
const dictionaryCache = {};

export const DefinitionModal = ({ word, onClose, theme }) => {
  const safeWord = word ? word.toLocaleLowerCase('tr-TR') : null;
  const [results, setResults] = useState({});
  const definition = safeWord ? (results[safeWord] ?? dictionaryCache[safeWord]) : null;
  const loading = !!safeWord && definition === undefined;

  useEffect(() => {
    if (!safeWord || dictionaryCache[safeWord] !== undefined) return undefined;
    let alive = true;
    fetch(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(safeWord)}`)
      .then(res => res.json())
      .then(data => {
        let resultText = "Anlam bulunamadı.";
        if (Array.isArray(data) && data.length > 0 && data[0].anlamlarListe && data[0].anlamlarListe.length > 0) {
          resultText = data[0].anlamlarListe[0].anlam;
        }
        dictionaryCache[safeWord] = resultText;
        if (alive) setResults(r => ({ ...r, [safeWord]: resultText }));
      })
      .catch(() => {
        // Hata önbelleğe yazılmaz; pencere yeniden açılınca tekrar denenir
        if (alive) setResults(r => ({ ...r, [safeWord]: "Bağlantı hatası." }));
      });
    return () => { alive = false; };
  }, [safeWord]);

  if (!word) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
       <div className={`${theme.panel} w-full max-w-sm rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl animate-in zoom-in`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs font-bold opacity-50 uppercase tracking-widest">KELİME</span>
              <h2 className="text-3xl font-black tracking-tight mt-1 text-white">{word}</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors"><X size={20}/></button>
          </div>
          <div className={`p-4 rounded-xl bg-black/20 min-h-[100px] flex items-center border border-white/5 shadow-inner`}>
            {loading ? (
              <div className="flex items-center gap-2 opacity-50"><Loader2 className="animate-spin text-green-500" /> Yükleniyor...</div>
            ) : (
              <p className="font-medium leading-relaxed italic text-white/90">"{definition}"</p>
            )}
          </div>
          <div className="mt-4 text-right">
            <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest text-white/60">KAYNAK: TDK GÜNCEL TÜRKÇE SÖZLÜK</span>
          </div>
       </div>
    </div>
  );
};
