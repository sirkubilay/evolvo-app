// Sınırsız mod ipucu cüzdanı. Bakiye oyuncu istatistiklerinde tutulur (hintsEarned - hintsSpent) ve
// giriş yapan oyuncularda useProgress üzerinden buluta (Firestore users/{uid}.progress) yedeklenir:
// uygulama silinse veya telefon değişse de satın alınan ipuçları kaybolmaz.
// Başlangıç UNLIMITED_START_HINTS; her UNLIMITED_BONUS_EVERY yeni bölümde +UNLIMITED_BONUS_HINTS.
import { useEffect, useState } from 'react';
import { UNLIMITED_BONUS_EVERY, UNLIMITED_BONUS_HINTS } from '../data/constants';
import { loadStats, saveStats, dayKey } from './progress';

export const HINTS_EVENT = 'evolvo-stats-changed';
// Eski sürümlerin (1.8 öncesi) ayrı tuttuğu anahtarlar → tek seferlik taşıma
const LEGACY_WALLET = 'evolvo_hint_wallet';
const LEGACY_SOLVED = 'evolvo_unlimited_solved';

const readLegacy = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const dropLegacy = (k) => { try { localStorage.removeItem(k); } catch { /* yok say */ } };

const migrate = (s) => {
  const w = readLegacy(LEGACY_WALLET);
  if (w !== null) { s.hintsEarned = (s.hintsSpent || 0) + Math.max(0, Number(w) || 0); dropLegacy(LEGACY_WALLET); }
  const solved = readLegacy(LEGACY_SOLVED);
  if (solved !== null) { s.unlimitedSolved = Math.max(s.unlimitedSolved || 0, Number(solved) || 0); dropLegacy(LEGACY_SOLVED); }
  return s;
};

const balance = (s) => Math.max(0, (s.hintsEarned || 0) - (s.hintsSpent || 0));

/** İstatistikleri günceller, kaydeder ve useProgress'e (bulut yedeği) haber verir. */
const update = (fn) => {
  const s = migrate(loadStats());
  fn(s);
  s.updatedAt = Date.now();
  saveStats(s);
  window.dispatchEvent(new CustomEvent(HINTS_EVENT, { detail: s }));
  return s;
};

export const getHintWallet = () => {
  if (readLegacy(LEGACY_WALLET) !== null || readLegacy(LEGACY_SOLVED) !== null) return balance(update(() => {}));
  return balance(loadStats());
};

export const addHints = (n) => update((s) => { s.hintsEarned = (s.hintsEarned || 0) + n; });

/** Bir ipucu harcar; bakiye boşsa false döner. */
export const spendHint = () => {
  if (getHintWallet() <= 0) return false;
  update((s) => { s.hintsSpent = (s.hintsSpent || 0) + 1; });
  return true;
};

/** Sınırsız modda İLK KEZ çözülen bölüm sonrası çağrılır; bonus verildiyse miktarını döner. */
export const recordUnlimitedSolved = () => {
  let bonus = 0;
  update((s) => {
    s.unlimitedSolved = (s.unlimitedSolved || 0) + 1;
    if (s.unlimitedSolved % UNLIMITED_BONUS_EVERY === 0) {
      s.hintsEarned = (s.hintsEarned || 0) + UNLIMITED_BONUS_HINTS;
      bonus = UNLIMITED_BONUS_HINTS;
    }
  });
  return bonus;
};

/** Günde bir kez (ilk açılışta) +1 hediye ipucu. Verildiyse 1, bugün zaten verildiyse 0 döner. */
export const claimDailyHintGift = () => {
  const today = dayKey();
  if (loadStats().lastHintGift === today) return 0;
  update((s) => { s.lastHintGift = today; s.hintsEarned = (s.hintsEarned || 0) + 1; });
  return 1;
};

export const useHintWallet = () => {
  const [n, setN] = useState(getHintWallet);
  useEffect(() => {
    const h = (e) => setN(balance(e.detail));
    window.addEventListener(HINTS_EVENT, h);
    return () => window.removeEventListener(HINTS_EVENT, h);
  }, []);
  return n;
};
