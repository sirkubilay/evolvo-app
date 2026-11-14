import { useEffect } from 'react';
import { hapticSuccess } from '../lib/native';

const SHOW_MS = 3500;

/** Yeni açılan başarımı ekranın üstünde kısa süre gösterir; dokununca başarımlar ekranını açar. */
export const AchievementToast = ({ achievement, onDone, onOpen }) => {
  useEffect(() => {
    if (!achievement) return undefined;
    hapticSuccess();
    const t = setTimeout(onDone, SHOW_MS);
    return () => clearTimeout(t);
  }, [achievement, onDone]);

  if (!achievement) return null;
  return (
    <button
      key={achievement.id}
      onClick={onOpen}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] w-[calc(100%-2rem)] max-w-sm flex items-center gap-3 p-3 pr-4 rounded-2xl bg-gradient-to-r from-yellow-500/95 to-amber-600/95 text-black shadow-2xl shadow-yellow-500/30 border border-yellow-300 animate-in fade-in slide-in-from-top-4 duration-300 text-left"
    >
      <span className="w-12 h-12 flex-shrink-0 flex items-center justify-center text-3xl bg-black/15 rounded-xl">{achievement.icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-widest opacity-70">Başarım Açıldı!</span>
        <span className="block font-black text-base truncate">{achievement.title}</span>
      </span>
      <span className="text-xs font-black bg-black/20 px-2 py-1 rounded-md">+{achievement.xp} XP</span>
    </button>
  );
};
