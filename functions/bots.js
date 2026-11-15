// Sıralama botları — günlük listede canlılık hissi için.
// Tamamen deterministik: aynı gün için herkes aynı bot skorlarını görür, gün içinde
// her bot kendi "oynama saatinden" sonra listede belirir. Puanlar 780–920 arası.

const BOTS = [
  { name: "kelimeci34", avatar: "🦊" },
  { name: "Zeynep_K", avatar: "🦋" },
  { name: "mavikus", avatar: "🐧" },
  { name: "Emre_06", avatar: "🦁" },
  { name: "harfavcisi", avatar: "🦉" },
  { name: "Selin", avatar: "🐱" },
  { name: "bulmacakurdu", avatar: "🐼" },
  { name: "Mert35", avatar: "🚀" },
  { name: "ElifNur", avatar: "🦄" },
  { name: "sozlukçu", avatar: "🐢" },
  { name: "Burak_T", avatar: "🐯" },
  { name: "yaprak_", avatar: "🐸" },
  { name: "Cansu07", avatar: "🐙" },
  { name: "kartal16", avatar: "🐉" },
];

const BOT_NAMES_LOWER = new Set(BOTS.map((b) => b.name.toLocaleLowerCase("tr-TR")));
const isBotName = (name) => BOT_NAMES_LOWER.has(String(name || "").toLocaleLowerCase("tr-TR"));

// Basit deterministik hash → [0,1)
function rand(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const TR_OFFSET_MS = 3 * 3600 * 1000;
const trNow = () => new Date(Date.now() + TR_OFFSET_MS); // UTC alanları = Türkiye saati
const ymd = (d) => d.toISOString().slice(0, 10);

/** Bir botun belirli bir gündeki sonucu; o gün oynamadıysa ya da saati gelmediyse null. */
function botDay(bot, dateStr, now = trNow()) {
  const today = ymd(now);
  if (dateStr > today) return null;
  if (rand(`${bot.name}|${dateStr}|play`) > 0.82) return null; // her gün ~%82 oynar
  const minute = Math.floor(rand(`${bot.name}|${dateStr}|min`) * 1380) + 20; // 00:20–23:20
  if (dateStr === today && now.getUTCHours() * 60 + now.getUTCMinutes() < minute) return null;
  const score = 780 + Math.floor(rand(`${bot.name}|${dateStr}|score`) * 141); // 780–920
  const time = 35 + Math.floor(rand(`${bot.name}|${dateStr}|time`) * 120);
  return { score, time };
}

/** Günlük bulmaca (puzzleId = YYYY-MM-DD) için bot skorları. */
function botsForDay(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];
  return BOTS.map((b) => {
    const r = botDay(b, dateStr);
    return r && { name: b.name, avatar: b.avatar, score: r.score, time: r.time, steps: 0, bot: true };
  }).filter(Boolean);
}

/** Haftalık (pazartesi başlangıç) / aylık toplamlar — dönemin bugüne kadarki günleri. */
function botsForPeriod(period) {
  const now = trNow();
  const start = new Date(now);
  if (period === "weekly") start.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  else start.setUTCDate(1);
  const days = [];
  for (const d = new Date(start); ymd(d) <= ymd(now); d.setUTCDate(d.getUTCDate() + 1)) days.push(ymd(d));
  return BOTS.map((b) => {
    let score = 0; let gamesPlayed = 0;
    for (const day of days) {
      const r = botDay(b, day, now);
      if (r) { score += r.score; gamesPlayed++; }
    }
    return gamesPlayed && { name: b.name, avatar: b.avatar, score, gamesPlayed, bot: true };
  }).filter(Boolean);
}

/**
 * Gerçek ilk 10 + botları birleştirip yeni ilk 10'u, oyuncunun sırasını da botlara göre düzeltir.
 * realTop: [{name, score, time?, ...}] (puana göre sıralı), user: {score, time?, rank} | null
 */
function mergeWithBots(realTop, user, bots) {
  const cmp = (a, b) => (b.score - a.score) || ((a.time ?? 0) - (b.time ?? 0));
  const merged = [...realTop.filter((s) => !isBotName(s.name)), ...bots].sort(cmp).slice(0, 10)
    .map((s, i) => { const { bot, lowerCaseName, ...rest } = s; return { ...rest, rank: i + 1 }; });
  let mergedUser = null;
  if (user) {
    const botsAbove = bots.filter((b) => cmp(b, user) < 0).length;
    mergedUser = { ...user, rank: (user.rank || 1) + botsAbove };
  }
  return { topScores: merged, userScore: mergedUser };
}

module.exports = { botsForDay, botsForPeriod, mergeWithBots, isBotName };
