// Sınırsız mod ipucu cüzdanı: başlangıçta UNLIMITED_START_HINTS, her UNLIMITED_BONUS_EVERY yeni bölümde
// +UNLIMITED_BONUS_HINTS, satın alınan paketler ve ödüllü reklamlar da buraya eklenir.
// Değişince 'evolvo-hints' olayı yayınlanır; arayüz useHintWallet ile dinler.
import { useEffect, useState } from 'react';
import { UNLIMITED_START_HINTS, UNLIMITED_BONUS_EVERY, UNLIMITED_BONUS_HINTS } from '../data/constants';

const WALLET_KEY = 'evolvo_hint_wallet';
const SOLVED_KEY = 'evolvo_unlimited_solved';
const EVENT = 'evolvo-hints';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* depolama kapalı */ } };

export const getHintWallet = () => {
  const v = read(WALLET_KEY);
  if (v === null) { write(WALLET_KEY, UNLIMITED_START_HINTS); return UNLIMITED_START_HINTS; }
  return Math.max(0, Number(v) || 0);
};

const setWallet = (n) => {
  write(WALLET_KEY, Math.max(0, n));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: Math.max(0, n) }));
};

export const addHints = (n) => setWallet(getHintWallet() + n);

/** Bir ipucu harcar; cüzdan boşsa false döner. */
export const spendHint = () => {
  const n = getHintWallet();
  if (n <= 0) return false;
  setWallet(n - 1);
  return true;
};

/** Sınırsız modda İLK KEZ çözülen bölüm sonrası çağrılır; bonus verildiyse verilen miktarı döner. */
export const recordUnlimitedSolved = () => {
  const solved = (Number(read(SOLVED_KEY)) || 0) + 1;
  write(SOLVED_KEY, solved);
  if (solved % UNLIMITED_BONUS_EVERY === 0) {
    addHints(UNLIMITED_BONUS_HINTS);
    return UNLIMITED_BONUS_HINTS;
  }
  return 0;
};

/** Bir sonraki bonusa kaç bölüm kaldığı. */
export const solvedUntilBonus = () => UNLIMITED_BONUS_EVERY - ((Number(read(SOLVED_KEY)) || 0) % UNLIMITED_BONUS_EVERY);

export const useHintWallet = () => {
  const [n, setN] = useState(getHintWallet);
  useEffect(() => {
    const h = (e) => setN(e.detail);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return n;
};
