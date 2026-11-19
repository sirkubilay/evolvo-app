import { useEffect, useState } from 'react';
import { X, Users, Copy, Share2, UserPlus, Trash2, Loader2, Trophy, Gift } from 'lucide-react';
import { claimPendingInviteHints, INVITE_REWARD } from '../../lib/invite';
import {
  addFriend, friendErrorMessage, getFriends, getFriendsLeaderboard, inviteText, removeFriend,
} from '../../lib/friends';
import { shareText } from '../../lib/share';

const PERIODS = [
  { id: 'daily', label: 'Günlük' },
  { id: 'weekly', label: 'Haftalık' },
  { id: 'monthly', label: 'Aylık' },
];

/**
 * Arkadaşlar: kendi kodun, kodla ekleme, liste ve sadece arkadaşlar arası sıralama.
 * Giriş yapmamış oyuncuya giriş butonu gösterir.
 */
export const FriendsModal = ({ isOpen, onClose, theme, user, username, puzzleId, onLogin, showFeedback, initialCode, onRecordShare, openTab }) => {
  // Davet linkiyle gelindiyse kod kutusu dolu ve "Arkadaşlarım" sekmesi açık başlar
  const [tab, setTab] = useState(() => (initialCode ? 'friends' : 'ranking'));
  const [period, setPeriod] = useState('daily');
  const [me, setMe] = useState(null); // { code, friends }
  const [board, setBoard] = useState(null); // { key, scores, notPlayed }
  const [codeInput, setCodeInput] = useState(initialCode || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const boardKey = `${period}|${puzzleId}|${reloadKey}`;
  const loading = !!user && board?.key !== boardKey;

  useEffect(() => {
    if (!isOpen || !user) return undefined;
    let alive = true;
    getFriends()
      .then((r) => { if (alive) { setMe(r); setError(null); } })
      .catch((e) => { if (alive) setError(friendErrorMessage(e)); });
    getFriendsLeaderboard(period, puzzleId)
      .then((r) => { if (alive) setBoard({ ...r, key: boardKey }); })
      .catch((e) => { if (alive) { setError(friendErrorMessage(e)); setBoard({ key: boardKey, scores: [], notPlayed: [] }); } });
    return () => { alive = false; };
  }, [isOpen, user, period, puzzleId, boardKey]);

  // Profildeki "Arkadaşını davet et" kartından açılınca doğrudan kod sekmesine geç
  // (React'in önerdiği "render sırasında durum ayarlama" kalıbı: pencere her açılışta bir kez)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen && openTab) setTab(openTab);
  }

  const reload = () => setReloadKey((k) => k + 1);

  if (!isOpen) return null;

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!codeInput.trim()) return;
    setBusy(true);
    try {
      const res = await addFriend(codeInput.trim());
      if (res.reward > 0) {
        const got = await claimPendingInviteHints();
        showFeedback(`${res.friend.username} eklendi! 🎁 İkiniz de +${got || res.reward} ipucu kazandınız`, 'success');
      } else {
        showFeedback(res.status === 'exists' ? `${res.friend.username} zaten arkadaşın.` : `${res.friend.username} eklendi! 🎉`, 'success');
      }
      setCodeInput('');
      reload();
    } catch (err) {
      showFeedback(friendErrorMessage(err), 'error');
    }
    setBusy(false);
  };

  const handleRemove = async (friend) => {
    setBusy(true);
    try {
      await removeFriend(friend.uid);
      showFeedback(`${friend.username} listeden çıkarıldı.`, 'info');
      reload();
    } catch (err) {
      showFeedback(friendErrorMessage(err), 'error');
    }
    setBusy(false);
  };

  const handleShare = async () => {
    if (!me?.code) return;
    const text = inviteText(me.code);
    try {
      if (await shareText(text)) { onRecordShare?.(); return; }
    } catch { /* kullanıcı paylaşımı iptal etti */ }
    navigator.clipboard?.writeText(text).then(() => showFeedback('Davet metni kopyalandı!', 'success'));
  };

  const copyCode = () => navigator.clipboard?.writeText(me.code).then(() => showFeedback('Kod kopyalandı!', 'success'));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-md rounded-3xl p-6 border ${theme.panelBorder} shadow-2xl text-white flex flex-col max-h-[88vh]`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-2"><Users className="text-pink-400" /> Arkadaşlar</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><X /></button>
        </div>

        {!user ? (
          <div className="text-center py-8">
            <p className="opacity-70 mb-6">Arkadaş ekleyip onlarla yarışmak için Google ile giriş yap.</p>
            <button onClick={() => { onClose(); onLogin(); }} className="bg-green-600 hover:bg-green-500 px-8 py-4 rounded-2xl font-black">GİRİŞ YAP</button>
          </div>
        ) : (
          <>
            <div className="flex p-1 bg-white/5 rounded-xl mb-4 border border-white/5 flex-shrink-0">
              {[{ id: 'ranking', label: 'Sıralama' }, { id: 'friends', label: `Arkadaşlarım${me ? ` (${me.friends.length})` : ''}` }].map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${tab === t.id ? 'bg-white/10 shadow' : 'text-white/40'}`}>{t.label}</button>
              ))}
            </div>

            {error && <div className="bg-red-900/30 text-red-300 text-sm p-3 rounded-xl mb-3 text-center">{error}</div>}

            {tab === 'ranking' ? (
              <div className="flex flex-col min-h-0">
                <div className="flex gap-2 mb-3 flex-shrink-0">
                  {PERIODS.map((p) => (
                    <button key={p.id} onClick={() => setPeriod(p.id)} className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded-lg border ${period === p.id ? 'border-pink-400/60 bg-pink-500/10' : 'border-white/10 text-white/50'}`}>{p.label}</button>
                  ))}
                </div>
                <div className="overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-pink-400" /></div>
                  ) : board?.scores?.length ? (
                    board.scores.map((r) => {
                      const isMe = r.name?.toLowerCase() === username?.toLowerCase();
                      return (
                        <div key={r.lowerCaseName} className={`flex items-center justify-between p-3 rounded-xl border ${isMe ? 'border-green-500/40 bg-green-500/10' : r.rank === 1 ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-white/5 bg-white/5'}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-6 text-center font-black ${r.rank <= 3 ? 'text-yellow-400' : 'opacity-50'}`}>{r.rank === 1 ? <Trophy size={16} className="inline" /> : r.rank}</span>
                            <span className="text-2xl">{r.avatar}</span>
                            <span className={`font-bold truncate ${isMe ? 'text-green-400' : ''}`}>{r.name}</span>
                          </div>
                          <span className="font-black whitespace-nowrap">{r.score} <span className="text-[10px] opacity-50">PUAN</span></span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 opacity-50 italic text-sm">Bu dönemde henüz kimse oynamadı.</div>
                  )}
                  {!loading && board?.notPlayed?.length > 0 && (
                    <p className="text-[11px] opacity-40 text-center pt-2">Henüz oynamayanlar: {board.notPlayed.join(', ')}</p>
                  )}
                  {!loading && me && me.friends.length === 0 && (
                    <button onClick={() => setTab('friends')} className="w-full mt-2 py-3 rounded-xl border border-dashed border-pink-400/40 text-pink-300 text-sm font-bold">+ İlk arkadaşını ekle</button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                <div className="rounded-xl px-3 py-2.5 bg-gradient-to-r from-pink-500/20 to-purple-600/15 border border-pink-400/30 text-[12px] flex items-center gap-2">
                  <Gift size={18} className="text-pink-300 flex-none" />
                  <span>Arkadaşın senin kodunu eklerse <b>ikiniz de +{INVITE_REWARD} ipucu</b> kazanırsınız. İlk eklediğin kodda sen de kazanırsın.</span>
                </div>
                <div className="bg-black/20 rounded-2xl p-4 border border-white/5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Senin Kodun</p>
                  <p className="text-3xl font-black tracking-widest text-pink-300 mb-3">{me?.code || '······'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button disabled={!me} onClick={copyCode} className="py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold flex items-center justify-center gap-2"><Copy size={16} /> Kopyala</button>
                    <button disabled={!me} onClick={handleShare} className="py-2.5 rounded-xl bg-pink-600 text-sm font-bold flex items-center justify-center gap-2"><Share2 size={16} /> Davet Et</button>
                  </div>
                </div>

                <form onSubmit={handleAdd} className="flex gap-2">
                  <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder="EVO-XXXXXX" maxLength={10}
                    className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-xl px-3 py-3 font-black tracking-widest text-center outline-none focus:border-pink-400" />
                  <button type="submit" disabled={busy || !codeInput.trim()} className="px-4 rounded-xl bg-green-600 disabled:opacity-40 font-bold flex items-center gap-1">
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> Ekle</>}
                  </button>
                </form>

                <div className="space-y-2">
                  {me?.friends?.length ? me.friends.map((f) => (
                    <div key={f.uid} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="font-bold">{f.username}</span>
                      <button disabled={busy} onClick={() => handleRemove(f)} className="p-2 text-white/40 hover:text-red-400" title="Çıkar"><Trash2 size={16} /></button>
                    </div>
                  )) : (
                    <p className="text-center text-sm opacity-50 py-4">Henüz arkadaşın yok. Kodunu paylaş ya da bir arkadaşının kodunu gir.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
