// Arkadaş kodu sistemi — sunucu fonksiyonlarına ince bir sarmalayıcı.
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { WEB_URL } from '../data/constants';

const call = async (name, data) => {
  const fn = httpsCallable(getFunctions(getApp(), 'europe-west1'), name);
  return (await fn(data)).data;
};

export const getFriends = () => call('getFriends');
export const addFriend = (code) => call('addFriend', { code });
export const removeFriend = (uid) => call('removeFriend', { uid });
export const getFriendsLeaderboard = (period, puzzleId) => call('getFriendsLeaderboard', { period, puzzleId });

/** Sunucu hatasını oyuncuya gösterilecek Türkçe mesaja çevirir. */
export const friendErrorMessage = (e) => e?.message && !/internal/i.test(e.code || '') ? e.message : 'Bir şeyler ters gitti, tekrar dene.';

export const PENDING_FRIEND_KEY = 'evolvo_pending_friend';

/** Davet linki: açan kişi giriş yapınca otomatik eklenir. */
export const inviteLink = (code) => `${WEB_URL}/?arkadas=${encodeURIComponent(code)}`;
export const inviteText = (code) =>
  `Evolvo'da arkadaşım ol, günlük bulmacada yarışalım! 🧩\n🎁 Arkadaşlar ekranında kodumu ekle, ikimiz de +3 ipucu kazanalım: ${code}\n${inviteLink(code)}`;

/** URL'de ?arkadas=KOD varsa alır ve adres çubuğundan temizler. */
export const takeFriendCodeFromUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('arkadas');
    if (!code) return null;
    params.delete('arkadas');
    const rest = params.toString();
    window.history.replaceState({}, document.title, window.location.pathname + (rest ? `?${rest}` : ''));
    return code;
  } catch {
    return null;
  }
};
