// İstatistik + başarım durumunu yöneten hook. Giriş yapmış kullanıcıda Firestore'a yedekler.
import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { app } from '../firebase';
import {
  applyEvent, applyGameEnd, checkAchievements, loadStats, mergeStats, recordWords, saveStats,
} from './progress';

const SYNC_DELAY_MS = 2000;

export const useProgress = (user, onUnlock) => {
  const [stats, setStats] = useState(loadStats);
  const statsRef = useRef(stats);
  const syncTimer = useRef(null);
  const onUnlockRef = useRef(onUnlock);
  useEffect(() => { onUnlockRef.current = onUnlock; }, [onUnlock]);

  const pushToCloud = useCallback((s) => {
    if (!user) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const db = getFirestore(app);
      setDoc(doc(db, 'users', user.uid), { progress: s }, { merge: true })
        .catch((e) => console.warn('İlerleme buluta yazılamadı:', e));
    }, SYNC_DELAY_MS);
  }, [user]);

  const commit = useCallback((next, ctx) => {
    const { stats: checked, unlocked } = checkAchievements(next, ctx);
    checked.updatedAt = Date.now();
    statsRef.current = checked;
    saveStats(checked);
    setStats(checked);
    pushToCloud(checked);
    unlocked.forEach((a) => onUnlockRef.current?.(a));
    return checked;
  }, [pushToCloud]);

  /** game: { win, hints, score, time, moves, maxMoves, invalidAttempts, isTodaysDaily, words } */
  const recordGameEnd = useCallback((game) => {
    const uniqueWords = game.words?.length ? recordWords(game.words) : undefined;
    const next = applyGameEnd(statsRef.current, { ...game, uniqueWords });
    return commit(next, { game });
  }, [commit]);

  /** type: 'dictionary' | 'share' | 'avatar' | null; ctx: { darkMode } gibi ek bilgi */
  const recordEvent = useCallback((type, ctx = {}) => {
    const next = type ? applyEvent(statsRef.current, type) : statsRef.current;
    return commit(next, ctx);
  }, [commit]);

  // Giriş yapılınca: buluttakiyle birleştir, sonucu iki tarafa da yaz.
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(getFirestore(app), 'users', user.uid));
        if (cancelled) return;
        const merged = mergeStats(statsRef.current, snap.exists() ? snap.data().progress : null);
        commit(merged, {});
      } catch (e) {
        console.warn('Bulut ilerlemesi okunamadı:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [user, commit]);

  useEffect(() => () => clearTimeout(syncTimer.current), []);

  return { stats, recordGameEnd, recordEvent };
};
