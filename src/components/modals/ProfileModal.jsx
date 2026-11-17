import { X, Pencil, Users, Award, LogOut, Cloud } from 'lucide-react';
import { AVATARS } from '../../data/constants';
import { effectiveStreak } from '../../lib/progress';
import { useHintWallet } from '../../lib/hints';

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '';
  const [name, domain] = email.split('@');
  return `${name.slice(0, 1)}•••••@${domain}`;
};

/** Google "G" logosu (resmi renkler) */
const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.9 6.2C12.5 13.6 17.8 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z" />
    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.2C1 16.6 0 20.2 0 24s1 7.4 2.7 10.8l7.9-6.2z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.2C6.6 42.6 14.6 48 24 48z" />
  </svg>
);

/**
 * Profil: avatar seçimi, kullanıcı adı, Google ile giriş / çıkış ve kısa özet.
 * Ana menüdeki profil düğmesinden açılır.
 */
export const ProfileModal = ({ isOpen, onClose, theme, user, username, userAvatar, onSelectAvatar, stats = {}, onLogin, onLogout, onRename, onOpenFriends, onOpenAchievements }) => {
  const wallet = useHintWallet();
  if (!isOpen) return null;

  const loggedIn = !!user;
  const played = stats.dailyPlayed || 0;
  const winRate = played > 0 ? Math.round(((stats.dailyWins || 0) / played) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div
        className={`${theme.panel} w-full max-w-md max-h-[94vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 text-white shadow-2xl animate-in slide-in-from-bottom-6 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-14 px-5 flex items-center justify-between border-b border-white/10 sticky top-0 bg-inherit z-10">
          <h2 className="text-lg font-black">Profil</h2>
          <button onClick={onClose} aria-label="Kapat" className="p-1.5 -mr-1.5 hover:bg-white/10 rounded-full"><X size={22} /></button>
        </div>

        <div className="p-5 pb-7">
          {/* Kimlik */}
          <div className="flex items-center gap-4">
            <div className="relative flex-none">
              <div className="w-20 h-20 rounded-3xl bg-white/10 border-2 border-white/15 flex items-center justify-center text-5xl">{userAvatar.icon}</div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-yellow-400 text-black flex items-center justify-center shadow"><Pencil size={13} strokeWidth={3} /></div>
            </div>
            <div className="min-w-0 flex-1">
              {loggedIn ? (
                <>
                  <div className="text-[10px] uppercase tracking-widest text-green-400 font-bold">✓ Hesap kayıtlı</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-xl font-black truncate">{username}</div>
                    <button onClick={onRename} className="flex-none text-[11px] px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 font-bold flex items-center gap-1"><Pencil size={10} /> Değiştir</button>
                  </div>
                  <div className="text-[11px] opacity-60 mt-0.5 truncate">{maskEmail(user.email)}</div>
                </>
              ) : (
                <>
                  <div className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Misafir oyuncu</div>
                  <div className="text-xl font-black truncate">{username}</div>
                  <div className="text-[11px] opacity-60 mt-0.5">Kalıcı bir isim için giriş yap</div>
                </>
              )}
            </div>
          </div>

          {/* Kayıt durumu */}
          {loggedIn ? (
            <div className="mt-5 rounded-2xl p-3.5 border border-green-500/30 bg-green-500/10 text-[12px] flex items-center gap-2.5">
              <Cloud size={20} className="text-green-300 flex-none" />
              <span>İlerlemen, serin ve ipuçların Google hesabına yedekleniyor.</span>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl p-4 border border-yellow-400/40 bg-gradient-to-br from-yellow-400/15 to-amber-600/10">
              <div className="font-black">💾 İlerlemeni kaybetme</div>
              <ul className="text-[12px] opacity-85 mt-1.5 space-y-0.5">
                <li>✓ Serin, istatistiklerin ve ipuçların yedeklenir</li>
                <li>✓ Telefon değişse de kaldığın yerden devam</li>
                <li>✓ Sıralamada kendi seçtiğin isimle görün</li>
              </ul>
              <button onClick={onLogin} className="mt-3 w-full bg-white text-slate-800 rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
                <GoogleG /> Google ile giriş yap
              </button>
            </div>
          )}

          {/* Avatar */}
          <h3 className="mt-5 text-xs font-black uppercase tracking-widest opacity-60 mb-2">Avatar seç</h3>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((av) => {
              const active = av.id === userAvatar.id;
              return (
                <button
                  key={av.id}
                  onClick={() => onSelectAvatar(av)}
                  aria-label={`Avatar ${av.icon}`}
                  aria-pressed={active}
                  className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-90 ${active ? 'ring-2 ring-yellow-400 bg-yellow-400/20' : 'bg-black/30 hover:bg-white/10'}`}
                >
                  {av.icon}
                </button>
              );
            })}
          </div>

          {/* Özet */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 py-2"><div className="text-xl font-black">🔥 {effectiveStreak(stats)}</div><div className="text-[10px] opacity-60">Seri</div></div>
            <div className="rounded-xl bg-white/5 py-2"><div className="text-xl font-black">{winRate}%</div><div className="text-[10px] opacity-60">Galibiyet</div></div>
            <div className="rounded-xl bg-white/5 py-2"><div className="text-xl font-black">💡 {wallet}</div><div className="text-[10px] opacity-60">İpucu</div></div>
          </div>

          {loggedIn && (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">
                <button onClick={onOpenFriends} className="rounded-xl bg-white/5 border border-white/10 py-2.5 flex items-center justify-center gap-1.5 hover:bg-white/10"><Users size={16} className="text-pink-300" /> Arkadaşlar</button>
                <button onClick={onOpenAchievements} className="rounded-xl bg-white/5 border border-white/10 py-2.5 flex items-center justify-center gap-1.5 hover:bg-white/10"><Award size={16} className="text-yellow-300" /> Başarımlar</button>
              </div>
              <button onClick={onLogout} className="mt-5 mx-auto flex items-center gap-1.5 text-xs font-bold text-red-300/80 hover:text-red-300"><LogOut size={14} /> Çıkış yap</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
