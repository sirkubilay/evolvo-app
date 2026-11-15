// Oyuncu ilerlemesi: istatistikler, günlük seri ve başarımlar.
// Saf fonksiyonlar — React'ten bağımsız, böylece test edilebilir ve bulutla birleştirilebilir.
import { ACHIEVEMENTS, UNLIMITED_START_HINTS } from '../data/constants';

export const STATS_KEY = 'evolvo_stats';
export const WORDS_KEY = 'evolvo_words';

/** Yerel saatle YYYY-MM-DD (günlük bulmacanın kimliğiyle aynı format). */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (key, n) => {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
};
const isYesterday = (key, today) => !!key && addDays(key, 1) === today;

export const DEFAULT_STATS = {
  played: 0,
  wins: 0,
  hintsUsed: 0,
  dictionaryLookups: 0,
  // Günlük bulmaca serisi (Wordle mantığı: bir gün kaçırırsan veya kaybedersen sıfırlanır)
  currentStreak: 0,
  maxStreak: 0,
  lastDailyWinDate: null,
  // Herhangi bir modda üst üste oynanan gün sayısı
  playStreak: 0,
  maxPlayStreak: 0,
  lastPlayDate: null,
  // Hiç kaybetmeden geçen gün serisi
  noLossStreak: 0,
  lastNoLossDate: null,
  lastLossDate: null,
  lastSaturday: null,
  // Sadece günlük (online) bulmaca: Wordle tarzı istatistik ekranı için
  dailyPlayed: 0,
  dailyWins: 0,
  // En kısa çözüme göre fazladan hamle → kaç kez ("0" = en kısa yoldan, "4" = 4 ve üstü)
  dailyDist: {},
  lastDailyExtra: null,
  // Sınırsız mod ipucu cüzdanı = hintsEarned - hintsSpent. İkisi de sadece artar; böylece bulutla
  // birleştirirken "büyük olanı al" kuralı iki cihazda da doğru bakiyeyi verir (satın alınanlar kaybolmaz).
  hintsEarned: UNLIMITED_START_HINTS,
  hintsSpent: 0,
  unlimitedSolved: 0,
  shares: 0,
  avatarChanges: 0,
  uniqueWords: 0,
  // id -> açıldığı tarih (ISO)
  achievements: {},
  updatedAt: 0,
};

export const loadStats = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_KEY) || 'null');
    return { ...DEFAULT_STATS, ...(saved || {}), achievements: { ...(saved?.achievements || {}) }, dailyDist: { ...(saved?.dailyDist || {}) } };
  } catch {
    return { ...DEFAULT_STATS, achievements: {}, dailyDist: {} };
  }
};

/** Fazladan hamle sayısını dağılım kovasına çevirir (0..4, 4 = "4+"). */
export const extraBucket = (moves, optimal) => String(Math.min(4, Math.max(0, (moves || 0) - (optimal || moves || 0))));

export const saveStats = (stats) => {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* depolama kapalı olabilir */ }
};

/** Ekranda gösterilecek seri: son galibiyet dün veya bugün değilse seri bitmiştir. */
export const effectiveStreak = (stats, today = dayKey()) =>
  stats.lastDailyWinDate === today || isYesterday(stats.lastDailyWinDate, today) ? stats.currentStreak : 0;

/** Bugünün günlük bulmacası zaten kazanıldı mı? (bildirim metni için) */
export const playedDailyToday = (stats, today = dayKey()) => stats.lastDailyWinDate === today;

/** Daha önce yazılmamış kelimeleri sayar; sayıyı döner. */
export const recordWords = (words) => {
  try {
    const set = new Set(JSON.parse(localStorage.getItem(WORDS_KEY) || '[]'));
    words.forEach((w) => set.add(w));
    localStorage.setItem(WORDS_KEY, JSON.stringify([...set]));
    return set.size;
  } catch {
    return 0;
  }
};

/**
 * Bir oyun bitişini istatistiklere işler.
 * game: { win, hints, score, time, moves, maxMoves, invalidAttempts, isTodaysDaily, uniqueWords }
 */
export const applyGameEnd = (prev, game, now = new Date()) => {
  const s = { ...prev, achievements: { ...prev.achievements }, dailyDist: { ...(prev.dailyDist || {}) } };
  const today = dayKey(now);

  s.played += 1;
  s.hintsUsed += game.hints || 0;
  if (game.win) s.wins += 1;
  if (typeof game.uniqueWords === 'number') s.uniqueWords = Math.max(s.uniqueWords, game.uniqueWords);

  // Oynama serisi (gün bazında, mod fark etmez)
  if (s.lastPlayDate !== today) {
    s.playStreak = isYesterday(s.lastPlayDate, today) ? s.playStreak + 1 : 1;
    s.lastPlayDate = today;
  }
  s.maxPlayStreak = Math.max(s.maxPlayStreak, s.playStreak);

  // Günlük bulmaca serisi — sadece BUGÜNÜN günlük bulmacası sayılır (geçmiş bulmacalar değil)
  if (game.isTodaysDaily) {
    s.dailyPlayed = (s.dailyPlayed || 0) + 1;
    if (game.win) {
      s.dailyWins = (s.dailyWins || 0) + 1;
      const b = extraBucket(game.moves, game.optimal);
      s.dailyDist[b] = (s.dailyDist[b] || 0) + 1;
      s.lastDailyExtra = b;
    } else {
      s.lastDailyExtra = null;
    }
    if (game.win) {
      if (s.lastDailyWinDate !== today) {
        s.currentStreak = isYesterday(s.lastDailyWinDate, today) ? s.currentStreak + 1 : 1;
        s.lastDailyWinDate = today;
      }
      s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
    } else {
      s.currentStreak = 0;
    }
  }

  // Kaybetmeden geçen günler
  if (!game.win) {
    s.noLossStreak = 0;
    s.lastLossDate = today;
  } else if (s.lastLossDate !== today && s.lastNoLossDate !== today) {
    s.noLossStreak = isYesterday(s.lastNoLossDate, today) ? s.noLossStreak + 1 : 1;
    s.lastNoLossDate = today;
  }

  // Hafta sonu takibi
  if (now.getDay() === 6) s.lastSaturday = today;

  return s;
};

/** Oyun dışı olaylar: 'dictionary' | 'share' | 'avatar' */
export const applyEvent = (prev, type) => {
  const s = { ...prev, achievements: { ...prev.achievements } };
  if (type === 'dictionary') s.dictionaryLookups += 1;
  if (type === 'share') s.shares += 1;
  if (type === 'avatar') s.avatarChanges += 1;
  return s;
};

/**
 * Hangi başarımların açılması gerektiğini hesaplar.
 * ctx: o an olan şeyle ilgili bilgi (son oyun, koyu mod açıldı mı vs.)
 */
const RULES = {
  1: (s) => s.wins >= 1,
  2: (s) => s.dictionaryLookups >= 1,
  3: (s) => s.hintsUsed >= 1,
  4: (s, c) => !!c.darkMode,
  5: (s) => s.avatarChanges >= 1,
  6: (s, c) => c.game?.win && c.game.time < 60,
  7: (s, c) => c.game?.win && c.game.hints === 0,
  8: (s) => s.maxPlayStreak >= 3,
  9: (s, c) => c.game?.win && c.game.invalidAttempts === 0,
  10: (s, c) => !!c.game && c.hour >= 6 && c.hour < 9,
  11: (s, c) => c.game?.win && c.game.score >= 980,
  12: (s) => s.maxPlayStreak >= 30,
  13: (s, c) => c.game?.win && c.game.time < 30,
  14: (s) => s.uniqueWords >= 100,
  15: (s) => s.noLossStreak >= 10,
  16: (s) => s.avatarChanges >= 10,
  17: (s, c) => !!c.game && c.hour === 0,
  18: (s) => s.shares >= 5,
  19: (s) => s.wins >= 500,
  20: (s, c) => c.game?.win && c.game.moves >= c.game.maxMoves,
  21: (s, c) => !!c.game && c.hour === 12,
  22: (s, c) => !!c.game && c.weekday === 0 && isYesterday(s.lastSaturday, c.today),
  23: (s) => s.dictionaryLookups >= 50,
  24: (s) => s.maxStreak >= 7,
};

/** Sayaç tabanlı başarımlar için ilerleme (modalde çubuk göstermek için). */
export const PROGRESS = {
  8: (s) => [s.maxPlayStreak, 3],
  12: (s) => [s.maxPlayStreak, 30],
  14: (s) => [s.uniqueWords, 100],
  15: (s) => [s.noLossStreak, 10],
  16: (s) => [s.avatarChanges, 10],
  18: (s) => [s.shares, 5],
  19: (s) => [s.wins, 500],
  23: (s) => [s.dictionaryLookups, 50],
  24: (s) => [s.maxStreak, 7],
};

/** Yeni açılan başarımları ekler; { stats, unlocked: [achievement...] } döner. */
export const checkAchievements = (prev, ctx = {}, now = new Date()) => {
  const s = { ...prev, achievements: { ...prev.achievements } };
  const c = { ...ctx, hour: now.getHours(), weekday: now.getDay(), today: dayKey(now) };
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (a.id === 25 || s.achievements[a.id]) continue;
    if (RULES[a.id]?.(s, c)) {
      s.achievements[a.id] = now.toISOString();
      unlocked.push(a);
    }
  }
  const allOthers = ACHIEVEMENTS.filter((a) => a.id !== 25).every((a) => s.achievements[a.id]);
  if (allOthers && !s.achievements[25]) {
    s.achievements[25] = now.toISOString();
    unlocked.push(ACHIEVEMENTS.find((a) => a.id === 25));
  }
  return { stats: s, unlocked };
};

export const totalXp = (stats) =>
  ACHIEVEMENTS.filter((a) => stats.achievements[a.id]).reduce((sum, a) => sum + a.xp, 0);

/**
 * Yerel ve bulut ilerlemesini birleştirir (iki cihazda oynayan kullanıcı için).
 * Sayaçlarda büyük olan, başarımlarda birleşim, serilerde en son güncellenen kazanır.
 */
export const mergeStats = (local, cloud) => {
  if (!cloud) return local;
  const c = { ...DEFAULT_STATS, ...cloud };
  const max = (k) => Math.max(local[k] || 0, c[k] || 0);
  const later = (k) => ((local[k] || '') >= (c[k] || '') ? local[k] : c[k]);
  const newerDaily = (local.lastDailyWinDate || '') >= (c.lastDailyWinDate || '') ? local : c;
  const newerPlay = (local.lastPlayDate || '') >= (c.lastPlayDate || '') ? local : c;
  const newerNoLoss = (local.lastNoLossDate || '') >= (c.lastNoLossDate || '') ? local : c;
  return {
    ...local,
    played: max('played'),
    wins: max('wins'),
    hintsUsed: max('hintsUsed'),
    dictionaryLookups: max('dictionaryLookups'),
    shares: max('shares'),
    avatarChanges: max('avatarChanges'),
    uniqueWords: max('uniqueWords'),
    hintsEarned: Math.max(local.hintsEarned ?? UNLIMITED_START_HINTS, c.hintsEarned ?? UNLIMITED_START_HINTS),
    hintsSpent: max('hintsSpent'),
    unlimitedSolved: max('unlimitedSolved'),
    dailyPlayed: max('dailyPlayed'),
    dailyWins: max('dailyWins'),
    dailyDist: Object.fromEntries(['0', '1', '2', '3', '4'].map((k) => [k, Math.max(local.dailyDist?.[k] || 0, c.dailyDist?.[k] || 0)])),
    maxStreak: max('maxStreak'),
    maxPlayStreak: max('maxPlayStreak'),
    currentStreak: newerDaily.currentStreak,
    lastDailyWinDate: newerDaily.lastDailyWinDate,
    playStreak: newerPlay.playStreak,
    lastPlayDate: newerPlay.lastPlayDate,
    noLossStreak: newerNoLoss.noLossStreak,
    lastNoLossDate: newerNoLoss.lastNoLossDate,
    lastLossDate: later('lastLossDate'),
    lastSaturday: later('lastSaturday'),
    achievements: { ...(c.achievements || {}), ...local.achievements },
    updatedAt: Date.now(),
  };
};
