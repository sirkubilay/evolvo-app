import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { effectiveStreak, playedDailyToday } from '../../lib/progress';

// Wordle tarzı istatistik ekranı — SADECE günlük (online) bulmaca sayılır; sınırsız mod ve meydan okuma dahil değil.
const BUCKETS = [
  { key: '0', label: 'En kısa' },
  { key: '1', label: '+1' },
  { key: '2', label: '+2' },
  { key: '3', label: '+3' },
  { key: '4', label: '+4 ve üstü' },
];

const useCountdown = (active) => {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!active) return undefined;
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const d = next - now;
      const p = (n) => String(n).padStart(2, '0');
      setLeft(`${p(Math.floor(d / 3.6e6))}:${p(Math.floor((d % 3.6e6) / 6e4))}:${p(Math.floor((d % 6e4) / 1000))}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [active]);
  return left;
};

/** Oyuncunun günlük bulmaca istatistikleri (seri, galibiyet, hamle dağılımı). Profil ve oyun sonu ekranında kullanılır. */
export const StatsPanel = ({ stats = {}, compact = false }) => {
  const played = stats.dailyPlayed || 0;
  const wins = stats.dailyWins || 0;
  const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;
  const dist = stats.dailyDist || {};
  const maxCount = Math.max(1, ...BUCKETS.map((b) => dist[b.key] || 0));
  const highlight = playedDailyToday(stats) ? stats.lastDailyExtra : null;

  return (
    <>
      <div className={`grid grid-cols-4 gap-1 text-center ${compact ? 'mb-5' : 'mb-7'}`}>
        {[
          { label: 'Oynanan', val: played },
          { label: 'Galibiyet %', val: winRate },
          { label: 'Mevcut seri', val: effectiveStreak(stats) },
          { label: 'En uzun seri', val: stats.maxStreak || 0 },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center">
            <span className={`${compact ? 'text-2xl' : 'text-[2.1rem]'} leading-none font-black tabular-nums`}>{s.val}</span>
            <span className="text-[10px] leading-tight opacity-70 mt-1.5">{s.label}</span>
          </div>
        ))}
      </div>

      <h3 className="text-center text-xs font-black uppercase tracking-[0.2em] mb-3">Hamle dağılımı</h3>
      {wins === 0 ? (
        <p className="text-center text-xs opacity-50 mb-2">Henüz kazanılmış günlük bulmaca yok.</p>
      ) : (
        <div className="space-y-1.5">
          {BUCKETS.map((b) => {
            const n = dist[b.key] || 0;
            const pct = Math.max(7, Math.round((n / maxCount) * 100));
            const hot = highlight === b.key;
            return (
              <div key={b.key} className="flex items-center gap-2 text-xs">
                <span className="w-[4.5rem] text-right opacity-70 shrink-0">{b.label}</span>
                <div className="flex-1">
                  <div
                    className={`h-5 rounded-sm flex items-center justify-end px-1.5 font-black text-[11px] transition-all duration-700 ${hot ? 'bg-green-600' : 'bg-white/15'}`}
                    style={{ width: `${pct}%` }}
                  >
                    {n}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export const StatsModal = ({ isOpen, onClose, stats, theme }) => {
  const timeLeft = useCountdown(isOpen);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-sm rounded-3xl px-6 pt-5 pb-6 border border-white/10 text-white shadow-2xl animate-in zoom-in-95 duration-200`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end -mr-2 -mt-1">
          <button onClick={onClose} aria-label="Kapat" className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <h2 className="text-center text-sm font-black uppercase tracking-[0.2em] mb-1">İstatistikler</h2>
        <p className="text-center text-[10px] font-bold uppercase tracking-widest opacity-40 mb-5">Günlük bulmaca</p>

        <StatsPanel stats={stats} />

        <div className="border-t border-white/10 pt-4 mt-6 text-center">
          <p className="text-[10px] font-bold uppercase opacity-50 tracking-widest mb-1">Sonraki Evolvo</p>
          <div className="text-3xl font-black tabular-nums tracking-wide">{timeLeft}</div>
        </div>
      </div>
    </div>
  );
};
