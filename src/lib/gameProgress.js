// Yarım kalan oyunun ilerlemesi: hamleler, kullanılan ipuçları, kilitli (ipucu) satırlar.
// Uygulama kapatılıp açılınca oyun kaldığı yerden devam eder; ipucu hakkı ve
// ipucuyla gelen satırlar sıfırlanmaz.

/**
 * Bulmacanın kayıt kimliği (evolvo_played_/history_/timer_ anahtarlarıyla aynı).
 * Günlük bulmacada zorluğa göre ayrışır: zor = 'YYYY-MM-DD' (eski anahtar), kolay = 'YYYY-MM-DD-kolay'.
 */
export const progressId = (puzzleData) =>
  puzzleData?.type === 'unlimited'
    ? `unlimited_${puzzleData.length}_${puzzleData.level}`
    : (puzzleData?.puzzleId || puzzleData?.date || new Date().toLocaleDateString('tr-TR'));

const keyOf = (id) => `evolvo_progress_${id}`;

/**
 * Kayıtlı ilerlemeyi döndürür; yoksa, bulmaca bitmişse ya da başka bir
 * bulmacaya aitse null.
 */
export const loadProgress = (puzzleData, storage = globalThis.localStorage) => {
  if (!puzzleData || puzzleData.type === 'custom') return null;
  const id = progressId(puzzleData);
  try {
    if (storage.getItem(`evolvo_played_${id}`)) return null;
    const raw = storage.getItem(keyOf(id));
    if (raw) {
      const p = JSON.parse(raw);
      if (!Array.isArray(p.history) || p.history[0] !== puzzleData.start) return null;
      return {
        history: p.history,
        hintsUsed: Math.max(0, Number(p.hintsUsed) || 0),
        bonusHints: Math.max(0, Number(p.bonusHints) || 0),
        locked: Array.isArray(p.locked) && p.locked.length ? p.locked : [0],
      };
    }
    // Eski sürüm: sınırsız modda yalnızca hamleler kaydediliyordu
    const legacy = puzzleData.type === 'unlimited' && storage.getItem(`evolvo_history_${id}`);
    if (legacy) {
      const history = JSON.parse(legacy);
      if (Array.isArray(history) && history[0] === puzzleData.start && history.length > 1) {
        return { history, hintsUsed: 0, bonusHints: 0, locked: [0] };
      }
    }
  } catch { /* bozuk kayıt: sıfırdan başla */ }
  return null;
};

export const saveProgress = (puzzleData, progress, storage = globalThis.localStorage) => {
  if (!puzzleData || puzzleData.type === 'custom') return;
  try {
    storage.setItem(keyOf(progressId(puzzleData)), JSON.stringify(progress));
  } catch { /* depolama dolu/kapalı */ }
};

export const clearProgress = (puzzleData, storage = globalThis.localStorage) => {
  try {
    storage.removeItem(keyOf(progressId(puzzleData)));
  } catch { /* yoksay */ }
};
