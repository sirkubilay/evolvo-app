import { X } from 'lucide-react';

const HowToPlayModal = ({ isOpen, onClose, theme, colors }) => {
  if (!isOpen) return null;
  const steps = [
    "Amaç, \"Başlangıç\" kelimesinden \"Bitiş\" kelimesine ulaşmaktır.",
    "Her adımda, bir önceki kelimenin sadece 1 harfini değiştirebilirsiniz.",
    "Girdiğiniz her kelime, sözlükte bulunan geçerli bir Türkçe kelime olmalıdır.",
    "En az adımda ve en kısa sürede bitiş kelimesine ulaşarak Liderlik Tablosu'na girin!",
    "Takılırsanız, 'Sil' tuşu (⌫) aktif satır boşken bir önceki adıma geri dönmenizi sağlar.",
    "Zorlandığınızda ampul (💡) ikonuna tıklayarak ipucu alabilirsiniz (Maks. 3 Hak). Her ipucu 150 puan düşer."
  ];
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
       <div className={`${theme.panel} w-full max-w-lg rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">NASIL OYNANIR?</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button>
          </div>
          <ul className="space-y-4 font-medium opacity-80">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-4 items-start bg-black/10 p-4 rounded-xl shadow-inner border border-white/5">
                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm mt-0.5">{i+1}</div>
                <p className="text-sm leading-relaxed text-white/90">{s}</p>
              </div>
            ))}
          </ul>
          <button onClick={onClose} className="w-full mt-8 bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-white shadow-xl transition-all active:scale-95">ANLADIM</button>
       </div>
    </div>
  );
};

export default HowToPlayModal;
