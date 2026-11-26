// Günlük bulmaca kimlikleri ve dönem (hafta/ay) hesapları.
// Her gün iki bulmaca var: "zor" (5+ optimal adım) eski kimlikle `YYYY-MM-DD`,
// "kolay" (≤4 optimal adım) `YYYY-MM-DD-kolay`. Eski uygulama sürümleri `YYYY-MM-DD`'yi
// istemeye devam ettiği için zor bulmaca o kimlikte kaldı.
//
// Haftalık/aylık toplamlar artık skorun KAYDEDİLDİĞİ saate göre değil, bulmacanın TARİHİNE göre
// hesaplanıyor; böylece haftalık puan = o haftanın günlük puanlarının toplamı olur. (Önceden sunucu
// UTC saatini kullandığından Pazartesi 00:00–03:00 arası oynanan bulmaca bir önceki haftaya, ayın 1'i
// gece oynanan bir önceki aya yazılıyordu; geçmiş bulmacalar da içinde bulunulan haftaya ekleniyordu.)

const KOLAY_SUFFIX = "-kolay";
const DAILY_ID_RE = /^(\d{4}-\d{2}-\d{2})(-kolay)?$/;

/** 'YYYY-MM-DD' veya 'YYYY-MM-DD-kolay' → { date, difficulty } ; geçersizse null. */
function parsePuzzleId(id) {
    const m = typeof id === "string" ? DAILY_ID_RE.exec(id) : null;
    if (!m) return null;
    return { date: m[1], difficulty: m[2] ? "kolay" : "zor" };
}

const puzzleIdFor = (date, difficulty) => (difficulty === "kolay" ? `${date}${KOLAY_SUFFIX}` : date);

const utcDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

/** ISO hafta kimliği (Pazartesi başlangıç), ör. '2026-W48'. */
function weekIdOf(dateStr) {
    const d = utcDate(dateStr);
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

const monthIdOf = (dateStr) => dateStr.slice(0, 7);

/** Türkiye saatine göre bugünün tarihi (YYYY-MM-DD). */
const trToday = (now = Date.now()) => new Date(now + 3 * 3600 * 1000).toISOString().slice(0, 10);

/** Dönemin başından `today`e kadar olan günler (YYYY-MM-DD). */
function daysOfPeriod(period, today = trToday()) {
    const end = utcDate(today);
    const start = new Date(end);
    if (period === "weekly") start.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
    else start.setUTCDate(1);
    const days = [];
    for (const d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10));
    return days;
}

const periodIdOf = (period, dateStr) => (period === "weekly" ? weekIdOf(dateStr) : monthIdOf(dateStr));

module.exports = { KOLAY_SUFFIX, parsePuzzleId, puzzleIdFor, weekIdOf, monthIdOf, trToday, daysOfPeriod, periodIdOf };
