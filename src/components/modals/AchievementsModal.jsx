import { Medal, X } from 'lucide-react';
import { ACHIEVEMENTS } from '../../constants';

const AchievementsModal = ({ isOpen, onClose, theme, colors }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-lg rounded-[2rem] p-6 border border-white/10 text-white shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-black flex items-center gap-2 italic text-yellow-400"><Medal /> BAŞARIMLAR</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X /></button>
        </div>
        <div className="overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
          {ACHIEVEMENTS.map((ach) => (
            <div key={ach.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all group shadow-inner">
              <div className={`w-12 h-12 text-2xl flex items-center justify-center rounded-xl bg-gradient-to-br ${ach.category === 'easy' ? 'from-green-500/20 to-green-900/20 text-green-400' : ach.category === 'medium' ? 'from-blue-500/20 to-blue-900/20 text-blue-400' : ach.category === 'hard' ? 'from-purple-500/20 to-purple-900/20 text-purple-400' : 'from-yellow-500/20 to-yellow-900/20 text-yellow-400'} shadow-lg`}>
                {ach.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm md:text-base group-hover:text-yellow-400 transition-colors">{ach.title}</h3>
                <p className="text-xs opacity-60 mt-0.5">{ach.desc}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black opacity-40 bg-white/10 px-2 py-1 rounded-md">{ach.xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AchievementsModal;
