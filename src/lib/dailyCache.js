// Günlük bulmacaların cihazdaki kopyası. Bulmaca sunucuda bir gün önceden (23:30) hazırlandığı için
// uygulama yarının bulmacalarını önceden indirir; gece yarısı ve sonraki açılışlarda bulmaca ağ
// beklenmeden anında açılır, arka planda tazelenir. Çözüm yolu zaten sunucudan gelmiyor.

const KEY = 'evolvo_daily_cache';

const read = (storage) => {
  try {
    const v = JSON.parse(storage.getItem(KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

/** Kayıtlı bulmaca (puzzleId ile), yoksa null. */
export const getCachedPuzzle = (puzzleId, storage = globalThis.localStorage) => read(storage)[puzzleId] || null;

/**
 * Bulmacayı kaydeder; `keepDates` dışındaki günlerin kayıtları silinir (önbellek büyümesin).
 * keepDates: ['YYYY-MM-DD', ...] — genelde bugün ve yarın.
 */
export const cachePuzzle = (puzzle, keepDates, storage = globalThis.localStorage) => {
  if (!puzzle?.puzzleId || !puzzle?.date) return;
  try {
    const all = read(storage);
    all[puzzle.puzzleId] = puzzle;
    for (const [id, p] of Object.entries(all)) {
      if (!keepDates.includes(p?.date)) delete all[id];
    }
    storage.setItem(KEY, JSON.stringify(all));
  } catch { /* depolama dolu/kapalı: önbelleksiz devam */ }
};
