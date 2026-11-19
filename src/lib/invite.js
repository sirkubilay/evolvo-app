// Arkadaş daveti ödülü: bir oyuncu ilk kez birinin arkadaş kodunu eklediğinde ikisi de +3 ipucu kazanır
// (sunucu: addFriend). Ödüller sunucuda birikir; bu fonksiyon onları alıp cüzdana ekler.
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { addHints } from './hints';

export const INVITE_REWARD = 3;

/** Sunucuda biriken davet ipuçlarını cüzdana ekler; eklenen sayıyı döner. Giriş gerektirir. */
export const claimPendingInviteHints = async () => {
  try {
    const fn = httpsCallable(getFunctions(getApp(), 'europe-west1'), 'claimInviteHints');
    const { hints } = (await fn({})).data || {};
    if (hints > 0) addHints(hints);
    return hints || 0;
  } catch {
    return 0;
  }
};
