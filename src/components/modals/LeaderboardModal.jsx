import { useState } from 'react';
import { X, Users } from 'lucide-react';

export const LeaderboardModal = ({ isOpen, onClose, theme, userAvatar, username, leaderboardData = {}, onTabChange, onOpenFriends }) => {
  const [activeTab, setActiveTab] = useState('daily');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const currentScores = Array.isArray(leaderboardData)
    ? leaderboardData
    : (leaderboardData[activeTab] || []);

  const userScore = !Array.isArray(leaderboardData)
    ? (leaderboardData[`${activeTab}_user`] || null)
    : null;

  const userInTopList = username && currentScores.some(
    s => s.name?.toLowerCase() === username?.toLowerCase()
  );

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
       <div className={`${theme.panel} w-full max-w-md rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black italic uppercase tracking-tighter">SIRALAMA</h2><div className="flex items-center gap-2">{onOpenFriends && <button onClick={onOpenFriends} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/15 border border-pink-400/30 text-pink-300 text-xs font-bold"><Users size={14} /> Arkadaşlar</button>}<button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button></div></div>

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
             {currentScores.length > 0 ? (
               <>
                {currentScores.map((data, i) => (
                  <div key={i} className={`flex justify-between items-center p-4 rounded-xl border ${i === 0 ? 'bg-yellow-500/20 border-yellow-500/50 shadow-yellow-500/10' : theme.emptyCell} shadow-inner`}>
                     <div className="flex items-center gap-4">
                        <span className={`font-black w-5 text-center text-lg ${i < 3 ? 'text-yellow-400' : 'opacity-60'}`}>{data.rank || i + 1}</span>
                        <div className="flex items-center gap-2">
                           <div className="text-3xl shadow-sm">{data.name === username ? userAvatar.icon : (data.avatar || '👤')}</div>
                           <span className={`font-bold ${data.name === username ? 'text-green-400' : 'text-white'}`}>{data.name}</span>
                        </div>
                     </div>
                     <span className="font-black text-lg text-white/90 tracking-tight">{data.score} Puan</span>
                  </div>
                ))}
                {!userInTopList && userScore && (
                  <>
                    <div className="text-center py-1 opacity-30 text-sm tracking-widest">• • •</div>
                    <div className="flex justify-between items-center p-4 rounded-xl border border-green-500/40 bg-green-500/10 shadow-inner">
                      <div className="flex items-center gap-4">
                        <span className="font-black w-5 text-center text-lg opacity-60">{userScore.rank}</span>
                        <div className="flex items-center gap-2">
                          <div className="text-3xl shadow-sm">{userAvatar.icon}</div>
                          <span className="font-bold text-green-400">{userScore.name}</span>
                        </div>
                      </div>
                      <span className="font-black text-lg text-white/90 tracking-tight">{userScore.score} Puan</span>
                    </div>
                  </>
                )}
               </>
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

