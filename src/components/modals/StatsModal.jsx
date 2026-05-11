import { useState, useEffect } from 'react';
import { BarChart2, X } from 'lucide-react';

const StatsModal = ({ isOpen, onClose, stats, theme, colors }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - now;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-md rounded-[2rem] p-8 border border-white/10 text-white shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black flex items-center gap-2 italic uppercase tracking-tighter"><BarChart2 className="text-green-400" /> İSTATİSTİKLER</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X /></button>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center mb-8 bg-black/20 p-4 rounded-2xl border border-white/5 shadow-inner">
          {[{ label: 'OYNANAN', val: stats.played }, { label: 'KAZANMA ORANI', val: `%${winRate}` }, { label: 'MEVCUT SERİ', val: stats.currentStreak }, { label: 'EN UZUN SERİ', val: stats.maxStreak }].map((s, i) => (
            <div key={i} className="flex flex-col items-center"><span className="text-4xl font-black text-blue-100">{s.val}</span><span className="text-[9px] font-bold opacity-60 mt-1.5 leading-tight uppercase tracking-widest">{s.label}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 text-center mb-8 border-t border-white/10 pt-6">
           <div className="flex flex-col"><span className="text-4xl font-black text-green-100">{stats.dictionaryLookups || 0}</span><span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Sözlük Bakma</span></div>
           <div className="flex flex-col"><span className="text-4xl font-black text-yellow-100">{stats.hintsUsed}</span><span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">İpucu</span></div>
        </div>
        <div className="bg-black/20 rounded-2xl p-6 text-center border border-white/5 shadow-inner">
          <p className="text-[10px] font-bold uppercase opacity-60 mb-2 tracking-widest">SONRAKİ EVOLVO</p>
          <div className="text-5xl font-mono font-bold text-green-400 tracking-wider shadow-green-500/20 drop-shadow-md">{timeLeft}</div>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
