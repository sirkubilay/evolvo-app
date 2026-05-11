import { useState } from 'react';
import { X } from 'lucide-react';

const LeaderboardModal = ({ isOpen, onClose, theme, colors, userAvatar, username, leaderboardData = {}, onTabChange }) => {
  const [activeTab, setActiveTab] = useState('daily');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Hem eski array formatını hem yeni obje formatını destekle
  const currentList = Array.isArray(leaderboardData)
    ? leaderboardData
    : (leaderboardData[activeTab] || []);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
       <div className={`${theme.panel} w-full max-w-md rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">SIRALAMA</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button>
          </div>
          <div className="flex p-1 bg-white/5 rounded-xl mb-6 shadow-inner border border-white/5">
            {['daily', 'weekly', 'monthly'].map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
              >
                {tab === 'daily' ? 'Günlük' : tab === 'weekly' ? 'Haftalık' : 'Aylık'}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20">
             {currentList.length > 0 ? (
                currentList.map((data, i) => (
                  <div key={i} className={`flex justify-between items-center p-4 rounded-xl border ${i === 0 ? 'bg-yellow-500/20 border-yellow-500/50 shadow-yellow-500/10' : theme.emptyCell} shadow-inner`}>
                     <div className="flex items-center gap-4">
                        <span className={`font-black w-5 text-center text-lg ${i < 3 ? 'text-yellow-400' : 'opacity-60'}`}>{i + 1}</span>
                        <div className="flex items-center gap-2">
                           <div className="text-3xl shadow-sm">{data.name === username ? userAvatar.icon : (data.avatar || '👤')}</div>
                           <span className={`font-bold ${data.name === username ? 'text-green-400' : 'text-white'}`}>{data.name}</span>
                        </div>
                     </div>
                     <span className="font-black text-lg text-white/90 tracking-tight">{data.score} Puan</span>
                  </div>
                ))
             ) : (
                <div className="text-center py-12 opacity-40 italic bg-black/10 rounded-xl border border-white/5 shadow-inner">
                   Henüz skor yok. İlk sen ol!
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default LeaderboardModal;
