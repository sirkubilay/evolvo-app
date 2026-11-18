import { X, Lightbulb, Book, Delete } from 'lucide-react';

// Wordle tarzı, görsel örnekli "Nasıl Oynanır" ekranı.
// changed: o satırda değişen harfin sırası; tone: kutu rengi.
const Tile = ({ ch, tone = 'move', changed = false, size = 'md' }) => {
  const tones = {
    start: 'bg-blue-600 border-blue-700 text-white',
    move: 'bg-green-600 border-green-700 text-white',
    empty: 'bg-white/5 border-white/15 text-white',
    bad: 'bg-red-600/80 border-red-700 text-white',
  };
  const dim = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-lg';
  return (
    <div className={`${dim} rounded-md border-2 font-black flex items-center justify-center relative ${tones[tone]} ${changed ? 'ring-2 ring-yellow-300 ring-offset-2 ring-offset-[#0d1829]' : ''}`}>
      {ch}
    </div>
  );
};

const Row = ({ word, tone, changedAt = -1, size }) => (
  <div className="flex gap-1">
    {[...word].map((c, i) => <Tile key={i} ch={c} tone={tone} changed={i === changedAt} size={size} />)}
  </div>
);

export const HowToPlayModal = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div
        className={`${theme.panel} w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl px-6 pt-5 pb-6 border ${theme.panelBorder} shadow-2xl text-white animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-2xl font-black tracking-tight">Nasıl Oynanır</h2>
          <button onClick={onClose} aria-label="Kapat" className="p-1.5 -mr-1.5 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <p className="text-base font-semibold mb-4 opacity-90">Başlangıç kelimesini, her adımda <span className="text-yellow-300">tek harf</span> değiştirerek bitiş kelimesine dönüştür.</p>

        <ul className="list-disc pl-5 space-y-1.5 text-sm opacity-85 mb-5">
          <li>Her adımda bir önceki kelimenin <b>yalnızca bir harfini</b> değiştir.</li>
          <li>Yazdığın her kelime sözlükte bulunan <b>geçerli bir Türkçe kelime</b> olmalı.</li>
          <li>Ne kadar <b>az hamle</b> ve <b>kısa sürede</b> bitirirsen o kadar çok puan alırsın.</li>
        </ul>

        <div className="border-t border-white/10 pt-4 mb-4">
          <h3 className="font-black text-sm mb-3">Örnek</h3>
          <p className="text-xs opacity-80">Hedef: <b>KAR</b> → <b>TAŞ</b></p>

          <div className="space-y-2.5 mt-3">
            <div className="flex items-center gap-3">
              <Row word="KAR" tone="start" />
              <p className="text-xs opacity-80">Başlangıç kelimesi <b>mavi</b>.</p>
            </div>
            <div className="flex items-center gap-3">
              <Row word="KAŞ" tone="move" changedAt={2} />
              <p className="text-xs opacity-80"><b className="text-yellow-300">R → Ş</b>. Tek harf değişti, <b>KAŞ</b> geçerli bir kelime.</p>
            </div>
            <div className="flex items-center gap-3">
              <Row word="TAŞ" tone="move" changedAt={0} />
              <p className="text-xs opacity-80"><b className="text-yellow-300">K → T</b>. Bitiş kelimesine <b>2 hamlede</b> ulaşıldı! 🎉</p>
            </div>
          </div>

          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="flex flex-col gap-1.5 shrink-0">
              <Row word="KAJ" tone="bad" size="sm" />
              <Row word="KIŞ" tone="bad" size="sm" />
            </div>
            <p className="text-xs opacity-85"><b>KAJ</b> olmaz, sözlükte yok. <b>KIŞ</b> da olmaz, KAR'dan <b>iki harf</b> birden değişiyor.</p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center shrink-0"><Lightbulb size={18} className="text-black" fill="currentColor" /></div>
            <p className="opacity-85 text-xs"><b>İpucu:</b> Takılırsan ampule dokun. Günlük bulmacada 1 ipucu hakkın var, Evrim Yolu'nda ipucu cüzdanın kullanılır (her 10 yeni bölümde +3). Her ipucu <b>150 puan</b> düşürür.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Book size={16} /></div>
            <p className="opacity-85 text-xs"><b>Sözlük:</b> Kelimenin yanındaki kitaba dokunarak anlamına bak.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0"><Delete size={16} /></div>
            <p className="opacity-85 text-xs"><b>Geri al:</b> Satır boşken silme tuşuna basarsan bir önceki adıma dönersin.</p>
          </div>
        </div>

        <p className="text-xs opacity-60 mt-5 border-t border-white/10 pt-4">Her gece yarısı yeni bir günlük bulmaca gelir. Günlük seriyi koru, arkadaşlarınla sıralamada yarış!</p>

        <button onClick={onClose} className="w-full mt-5 bg-green-600 hover:bg-green-500 py-3.5 rounded-xl font-black text-white shadow-lg transition-all active:scale-95">ANLADIM, OYNA!</button>
      </div>
    </div>
  );
};
