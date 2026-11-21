// Yerel sözlükte (public/sozluk.json) bulunmayan kelimeleri canlı TDK Güncel
// Türkçe Sözlük'e sorar. Olumlu cevaplar cihazda kalıcı saklanır, böylece aynı
// kelime için tekrar istek atılmaz ve sonra çevrimdışıyken de kabul edilir.

const CACHE_KEY = 'evolvo_tdk_words';
const TIMEOUT_MS = 3000;

const missCache = new Set(); // bu oturumda TDK'nın "yok" dediği kelimeler

const loadHits = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

let hitCache = null;

const saveHit = (word) => {
  hitCache.add(word);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify([...hitCache]));
  } catch { /* depolama yoksa sadece bellekte kalsın */ }
};

/** TDK cevabında, aranan kelimenin kendisi (özel isim olmayan) bir madde var mı? */
export const isTdkEntryFor = (data, lowerWord) =>
  Array.isArray(data) &&
  data.some(e => e && e.ozel_mi !== '1' &&
    String(e.madde_duz || e.madde || '').toLocaleLowerCase('tr-TR') === lowerWord);

/**
 * @param {string} word Büyük ya da küçük harf, Türkçe.
 * @returns {Promise<boolean>} TDK'da varsa true; yoksa, ağ hatası ya da zaman aşımında false.
 */
export const existsInTdk = async (word) => {
  const lower = word.toLocaleLowerCase('tr-TR');
  if (!hitCache) hitCache = loadHits();
  if (hitCache.has(lower)) return true;
  if (missCache.has(lower)) return false;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://sozluk.gov.tr/gts?ara=${encodeURIComponent(lower)}`, { signal: ctrl.signal });
    const data = await res.json();
    if (isTdkEntryFor(data, lower)) {
      saveHit(lower);
      return true;
    }
    missCache.add(lower);
    return false;
  } catch {
    return false; // hata önbelleğe yazılmaz, sonraki denemede tekrar sorulur
  } finally {
    clearTimeout(timer);
  }
};
