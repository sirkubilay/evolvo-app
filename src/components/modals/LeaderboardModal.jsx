import { useState } from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { DIFFICULTIES, DIFFICULTY_ORDER } from '../../lib/daily';

// Günlük sekmesi zorluğa göre ayrı (kolay / zor); haftalık ve aylık ikisinin toplamı.
export const LeaderboardModal = ({ isOpen, onClose, theme, userAvatar, username, leaderboardData = {}, onTabChange, onOpenFriends, isLoading = false, defaultDifficulty = 'zor' }) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [difficulty, setDifficulty] = useState(defaultDifficulty);

  // Her açılışta günlük sekme + oynanan bulmacanın zorluğu (açılışta günlük tablo çekiliyor)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (isOpen) { setActiveTab('daily'); setDifficulty(defaultDifficulty); }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab, difficulty);
  };
  const handleDifficultyChange = (d) => {
    setDifficulty(d);
    if (onTabChange) onTabChange('daily', d);
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
       <div className={`${theme.panel} w-full max-w-md rounded-3xl p-5 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-black italic uppercase tracking-tighter">SIRALAMA</h2><div className="flex items-center gap-2">{onOpenFriends && <button onClick={onOpenFriends} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/15 border border-pink-400/30 text-pink-300 text-xs font-bold"><Users size={14} /> Arkadaşlar</button>}<button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button></div></div>

          <div className="flex p-1 bg-white/5 rounded-xl mb-4 shadow-inner border border-white/5">
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

          {activeTab === 'daily' ? (
            <div className="flex justify-center gap-2 mb-3">
              {DIFFICULTY_ORDER.map((d) => (
                <button
                  key={d}
                  onClick={() => handleDifficultyChange(d)}
                  className={`px-4 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all ${difficulty === d
                    ? (d === 'kolay' ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200' : 'bg-amber-500/20 border-amber-400/50 text-amber-200')
                    : 'border-white/10 text-white/40 hover:text-white/70'}`}
                >
                  {DIFFICULTIES[d].label}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-[11px] opacity-40 mb-3">Kolay ve zor bulmacaların toplam puanı</p>
          )}

          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20">
             {isLoading && currentScores.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-yellow-400" /></div>
             ) : currentScores.length > 0 ? (
               <>
                {currentScores.map((data, i) => {
                  const me = username && data.name?.toLowerCase() === username.toLowerCase();
                  const medal = ['🥇', '🥈', '🥉'][i];
                  return (
                    <div key={`${data.name}-${i}`} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border ${me ? 'border-green-500/40 bg-green-500/10' : i === 0 ? 'bg-yellow-500/15 border-yellow-500/40' : 'border-white/5 bg-white/[0.04]'}`}>
                      <span className={`w-7 text-center font-black tabular-nums ${medal ? 'text-base' : 'text-sm opacity-60'}`}>{medal || data.rank || i + 1}</span>
                      <span className="text-xl leading-none">{me ? userAvatar.icon : (data.avatar || '👤')}</span>
                      <span className={`flex-1 min-w-0 truncate text-sm font-semibold ${me ? 'text-green-400' : 'text-white/90'}`}>{data.name}</span>
                      <span className="font-black text-sm tabular-nums text-white/90">{data.score}<span className="text-[10px] font-bold opacity-50 ml-0.5">P</span></span>
                    </div>
                  );
                })}
                {!userInTopList && userScore && (
                  <>
                    <div className="text-center leading-none py-0.5 opacity-30 text-xs tracking-widest">• • •</div>
                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-green-500/40 bg-green-500/10">
                      <span className="text-xl leading-none">{userAvatar.icon}</span>
                      <span className="flex-1 min-w-0 truncate text-sm font-semibold text-green-400"><b className="font-black text-white tabular-nums">{userScore.rank}.</b> {userScore.name}</span>
                      <span className="font-black text-sm tabular-nums text-white/90">{userScore.score}<span className="text-[10px] font-bold opacity-50 ml-0.5">P</span></span>
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

