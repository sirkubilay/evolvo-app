// Sıralama botları — günlük listede canlılık hissi için.
// Tamamen deterministik: aynı gün için herkes aynı bot skorlarını görür, gün içinde
// her bot kendi "oynama saatinden" sonra listede belirir. Puanlar 780–920 arası.

// Gerçekçi oyuncu adı havuzu — her gün bu havuzdan farklı 14 kişi "oynar".
const NAME_POOL = ["ahmet_k", "mehmet34", "ayse_yilmaz", "zeynepp", "elifcan", "burak06", "emre_tr", "cansu_07", "selinay", "mert1903", "deniz_k", "ece_nur", "baris35", "kaan_59", "irem_s", "gizem88", "oguzhan", "tugba_a", "onur_16", "merve_kaya", "serkan_61", "yasin_42", "busra23", "furkan_10", "esra_b", "hakanc", "sevgi_m", "umut_44", "damla_", "yunus_35", "aslihan", "berkay07", "sude_k", "erenn", "ceren_t", "volkan_01", "sinem_y", "tolga_34", "nazli_e", "alperen", "dilara_06", "kerem_9", "buse_ak", "ozan_27", "pinar_d", "ilker55", "gamze_s", "cagri_t", "yagmur_", "arda_k", "melis34", "sefa_16", "ezgi_n", "gokhan_k", "hilal_y", "batuhan", "begum_s", "caner_33", "nisa_", "tarik_b", "ozge_k", "emirhan_", "bahar_c", "ugur_06", "seda_kr", "koray_t", "asli_m", "cem_42", "elif_ozt", "hasan_ky", "beyza_a", "fatih_63", "nur_sena", "enes_tr", "dilan_k", "anil_35", "sila_g", "volkan_te", "zehra_k", "serdar_s", "irmak_", "cihan_55", "tuba_e", "efe_kaan", "aleyna_", "murat_06", "nehir_s", "yusuf_k", "merve34", "kubra_a", "erdem_y", "ilayda_", "sinan_t", "eylul_k", "bora_16", "cansu_d", "ali_riza", "songul_m", "doruk_a", "hande_k", "orkun_35", "gulsah_", "bertan_k", "ebru_t", "mustafa_k", "feyza_", "okan_42", "rabia_s", "taylan_", "busra_k"];
const AVATARS = ["🦊", "🐼", "🦁", "🦄", "🦉", "🐸", "🚀", "👻", "👽", "🤖", "🦖", "🐙", "🦋", "🐱", "🐶", "🐢", "🐯", "🐧", "🐉", "👤"];
const BOTS_PER_DAY = 14;

const BOT_NAMES_LOWER = new Set(NAME_POOL.map((n) => n.toLocaleLowerCase("tr-TR")));
const isBotName = (name) => BOT_NAMES_LOWER.has(String(name || "").toLocaleLowerCase("tr-TR"));

/** O günün bot kadrosu: havuzdan tarih tohumlu, tekrarsız seçim. */
function botsOfDay(dateStr) {
  const ranked = NAME_POOL.map((n) => ({ n, r: rand(`${dateStr}|pick|${n}`) })).sort((a, b) => a.r - b.r);
  return ranked.slice(0, BOTS_PER_DAY).map(({ n }) => ({
    name: n,
    avatar: AVATARS[Math.floor(rand(`${n}|avatar`) * AVATARS.length)],
  }));
}

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
  return botsOfDay(dateStr).map((b) => {
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
  const totals = new Map();
  for (const day of days) {
    for (const b of botsOfDay(day)) {
      const r = botDay(b, day, now);
      if (!r) continue;
      const t = totals.get(b.name) || { name: b.name, avatar: b.avatar, score: 0, gamesPlayed: 0, bot: true };
      t.score += r.score; t.gamesPlayed++;
      totals.set(b.name, t);
    }
  }
  return [...totals.values()];
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
