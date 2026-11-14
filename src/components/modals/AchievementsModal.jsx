import { X, Medal, Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '../../data/constants';
import { PROGRESS, totalXp } from '../../lib/progress';

const CATEGORY_STYLE = {
  easy: 'from-green-500/20 to-green-900/20 text-green-400',
  medium: 'from-blue-500/20 to-blue-900/20 text-blue-400',
  hard: 'from-purple-500/20 to-purple-900/20 text-purple-400',
};
const MAX_XP = ACHIEVEMENTS.reduce((sum, a) => sum + a.xp, 0);

export const AchievementsModal = ({ isOpen, onClose, theme, stats = {} }) => {
  if (!isOpen) return null;
  const unlocked = stats.achievements || {};
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  const xp = totalXp({ achievements: unlocked });
  // Açılanlar üstte, kalanlar kendi sırasında
  const sorted = [...ACHIEVEMENTS].sort((a, b) => (unlocked[b.id] ? 1 : 0) - (unlocked[a.id] ? 1 : 0));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-lg rounded-[2rem] p-6 border border-white/10 text-white shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-black flex items-center gap-2 italic text-yellow-400"><Medal /> BAŞARIMLAR</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X /></button>
        </div>

        <div className="mb-4 flex-shrink-0 bg-black/20 rounded-2xl p-4 border border-white/5">
          <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-2">
            <span>{unlockedCount} / {ACHIEVEMENTS.length} açıldı</span>
            <span className="text-yellow-400">{xp} / {MAX_XP} XP</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 transition-all" style={{ width: `${(xp / MAX_XP) * 100}%` }} />
          </div>
        </div>

        <div className="overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
          {sorted.map((ach) => {
            const done = !!unlocked[ach.id];
            const prog = !done && PROGRESS[ach.id] ? PROGRESS[ach.id](stats) : null;
            return (
              <div key={ach.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all shadow-inner ${done ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/5'}`}>
                <div className={`relative w-12 h-12 flex-shrink-0 text-2xl flex items-center justify-center rounded-xl bg-gradient-to-br ${CATEGORY_STYLE[ach.category] || 'from-yellow-500/20 to-yellow-900/20 text-yellow-400'} shadow-lg ${done ? '' : 'grayscale opacity-50'}`}>
                  {ach.icon}
                  {!done && <Lock size={14} className="absolute -bottom-1 -right-1 bg-black/70 rounded-full p-0.5 text-white/80" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-bold text-sm md:text-base ${done ? 'text-yellow-300' : ''}`}>{ach.title}</h3>
                  <p className="text-xs opacity-60 mt-0.5">{ach.desc}</p>
                  {prog && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400" style={{ width: `${Math.min(100, (prog[0] / prog[1]) * 100)}%` }} />
                      </div>
                      <span className="text-[10px] font-bold opacity-60">{Math.min(prog[0], prog[1])}/{prog[1]}</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-md ${done ? 'bg-yellow-500/30 text-yellow-200' : 'opacity-40 bg-white/10'}`}>{ach.xp} XP</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
