#!/usr/bin/env node
// Haftalık / aylık liderlik tablolarını günlük skorlardan (scores koleksiyonu) YENİDEN HESAPLAR.
//
// Neden: eski saveScore haftayı/ayı skorun kaydedildiği UTC saatine göre seçiyordu (Pazartesi
// 00:00–03:00 ve ayın 1'i gece oynananlar önceki döneme yazıldı; geçmiş bulmacalar içinde bulunulan
// haftaya eklendi) ve isim değişikliğinde toplamlar eski isimde kalıyordu. Bu script her dönemi
// "o dönemdeki bulmacaların günlük puanlarının toplamı" olacak şekilde baştan yazar.
//
// Kullanım (functions/ klasöründen):
//   node scripts/rebuild-leaderboards.js                 → sadece rapor (hiçbir şey yazmaz)
//   node scripts/rebuild-leaderboards.js --apply         → farkları düzeltir
//   node scripts/rebuild-leaderboards.js --since 2026-11 → yalnızca bu aydan itibaren (YYYY-MM)
//   node scripts/rebuild-leaderboards.js --fix-names     → eski isimde kalmış günlük skorları da
//                                                          oyuncunun güncel adına çevirir (--apply ile)
//
// Kimlik: `gcloud auth application-default login` ya da GOOGLE_APPLICATION_CREDENTIALS=servis-hesabı.json
// ÖNEMLİ: Yeni functions deploy edildikten SONRA ve oyunun sakin olduğu bir saatte çalıştır; okuma ile
// yazma arasında kaydedilen bir skor, yazılan toplamda eksik kalabilir (scripti tekrar çalıştırmak düzeltir).

const admin = require("firebase-admin");
const { parsePuzzleId, weekIdOf, monthIdOf } = require("../puzzleIds");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FIX_NAMES = args.includes("--fix-names");
const sinceIdx = args.indexOf("--since");
const SINCE = sinceIdx >= 0 ? args[sinceIdx + 1] : null; // 'YYYY-MM'
if (SINCE && !/^\d{4}-\d{2}$/.test(SINCE)) {
    console.error("--since YYYY-MM biçiminde olmalı");
    process.exit(1);
}

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "evolvogame-21a23" });
const db = admin.firestore();

const isRealUid = (uid) => typeof uid === "string" && uid.length > 0 && !uid.startsWith("guest_");
const tsMs = (t) => (t && typeof t.toMillis === "function" ? t.toMillis() : 0);

async function main() {
    console.log(`Mod: ${APPLY ? "UYGULA" : "RAPOR (yazma yok)"}${SINCE ? `, ${SINCE} ve sonrası` : ""}${FIX_NAMES ? ", isimler düzeltilecek" : ""}`);

    // 1. Tüm günlük skorlar
    const scoresSnap = await db.collection("scores").get();
    console.log(`${scoresSnap.size} günlük skor okundu.`);

    // Kayıtlı oyuncuların güncel adı (isim değiştirenlerin eski skorları yeni ada toplanır)
    const uids = [...new Set(scoresSnap.docs.map((d) => d.data().uid).filter(isRealUid))];
    const currentName = new Map();
    for (let i = 0; i < uids.length; i += 300) {
        const docs = await db.getAll(...uids.slice(i, i + 300).map((u) => db.doc(`users/${u}`)));
        docs.forEach((d) => { if (d.exists && d.data().username) currentName.set(d.id, d.data().username); });
    }

    // Eski uygulama sürümleri skoru "başlangıç-bitiş" kimliğiyle (ör. 'boğa-bani') kaydediyordu:
    // puzzles koleksiyonundan bu kelime çiftinin hangi güne ait olduğunu bul.
    const legacyDate = new Map();
    (await db.collection("puzzles").get()).forEach((d) => {
        const p = d.data();
        const parsed = parsePuzzleId(d.id);
        if (!parsed || !p.baslangic || !p.bitis) return;
        const key = `${p.baslangic}-${p.bitis}`.toLocaleLowerCase("tr-TR");
        legacyDate.set(key, legacyDate.has(key) ? null : parsed.date); // birden fazla gün → belirsiz
    });
    const trDateOf = (t) => (tsMs(t) ? new Date(tsMs(t) + 3 * 3600 * 1000).toISOString().slice(0, 10) : null);
    const dateOfScore = (s) => {
        const parsed = parsePuzzleId(s.puzzleId);
        if (parsed) return { date: parsed.date, how: "id" };
        const d = typeof s.puzzleId === "string" ? legacyDate.get(s.puzzleId.toLocaleLowerCase("tr-TR")) : null;
        if (d) return { date: d, how: "eski-kimlik" };
        const c = trDateOf(s.createdAt); // son çare: kaydedildiği gün (Türkiye saati)
        return c ? { date: c, how: "kayıt-tarihi" } : null;
    };

    // 2. Beklenen toplamlar: periodId -> lowerName -> { score, gamesPlayed, name, uid, avatar, last }
    const expected = new Map();
    const nameFixes = [];
    const howCount = {};
    let skipped = 0;
    for (const doc of scoresSnap.docs) {
        const s = doc.data();
        const parsed = typeof s.score === "number" ? dateOfScore(s) : null;
        if (!parsed) { skipped++; continue; }
        howCount[parsed.how] = (howCount[parsed.how] || 0) + 1;
        // --since dönem bazında uygulanır (aşağıda): ay sınırını aşan bir haftanın tüm günleri sayılmalı

        const name = (isRealUid(s.uid) && currentName.get(s.uid)) || s.name;
        const lower = name.toLowerCase(); // saveScore ile aynı anahtar
        if (FIX_NAMES && (s.name !== name || s.lowerCaseName !== lower)) {
            nameFixes.push({ ref: doc.ref, from: s.name, name, lower });
        }
        const at = tsMs(s.createdAt);
        for (const pid of [weekIdOf(parsed.date), monthIdOf(parsed.date)]) {
            if (!expected.has(pid)) expected.set(pid, new Map());
            const players = expected.get(pid);
            const p = players.get(lower) || { score: 0, gamesPlayed: 0, name, uid: s.uid || null, avatar: s.avatar || "👤", last: -1 };
            if (p.uid && s.uid && p.uid !== s.uid && isRealUid(p.uid) && isRealUid(s.uid)) {
                console.warn(`  ! ${pid}/${lower}: iki farklı hesap aynı isimde (${p.uid}, ${s.uid}); toplamlar birleşti.`);
            }
            p.score += s.score;
            p.gamesPlayed += 1;
            if (at >= p.last) { p.last = at; p.avatar = s.avatar || p.avatar; if (isRealUid(s.uid)) p.uid = s.uid; }
            players.set(lower, p);
        }
    }
    console.log(`Tarih bulunan skorlar: ${JSON.stringify(howCount)}`);
    if (skipped) console.log(`${skipped} skor atlandı (tarihi bulunamadı ya da puanı yok).`);

    // 3. Mevcut dönemler (sadece alt koleksiyonu olan dönem belgeleri de listelenir)
    const periodRefs = await db.collection("leaderboards").listDocuments();
    const inScope = (pid) => !SINCE || (/^\d{4}-\d{2}$/.test(pid) ? pid >= SINCE : weekInScope(pid));
    const periods = new Set([...expected.keys(), ...periodRefs.map((r) => r.id)].filter(inScope));
    if (FIX_NAMES && SINCE) console.log("Not: --fix-names, --since'den bağımsız olarak tüm skorlara uygulanır.");

    const writes = [];
    let changedPlayers = 0;
    for (const pid of [...periods].sort()) {
        const want = expected.get(pid) || new Map();
        const have = new Map();
        (await db.collection(`leaderboards/${pid}/players`).get()).forEach((d) => have.set(d.id, d));

        const lines = [];
        for (const [lower, p] of want) {
            const cur = have.get(lower)?.data();
            if (!cur || cur.score !== p.score || cur.gamesPlayed !== p.gamesPlayed || cur.name !== p.name) {
                lines.push(`    ${p.name}: ${cur ? `${cur.score}P/${cur.gamesPlayed} oyun` : "yok"} → ${p.score}P/${p.gamesPlayed} oyun`);
                writes.push((b) => b.set(db.doc(`leaderboards/${pid}/players/${lower}`), {
                    score: p.score, gamesPlayed: p.gamesPlayed, name: p.name, lowerCaseName: lower,
                    uid: p.uid, avatar: p.avatar,
                }));
            }
        }
        for (const [lower, d] of have) {
            if (want.has(lower)) continue;
            const cur = d.data();
            lines.push(`    ${cur.name || lower}: ${cur.score}P/${cur.gamesPlayed} oyun → silinecek (bu döneme ait skoru yok)`);
            writes.push((b) => b.delete(d.ref));
        }
        if (lines.length) {
            changedPlayers += lines.length;
            console.log(`\n${pid} (${lines.length} düzeltme):`);
            lines.forEach((l) => console.log(l));
        }
    }

    if (FIX_NAMES && nameFixes.length) {
        console.log(`\n${nameFixes.length} günlük skor güncel isme çevrilecek:`);
        nameFixes.slice(0, 50).forEach((f) => console.log(`    ${f.from} → ${f.name}`));
        if (nameFixes.length > 50) console.log(`    … ve ${nameFixes.length - 50} tane daha`);
        nameFixes.forEach((f) => writes.push((b) => b.update(f.ref, { name: f.name, lowerCaseName: f.lower })));
    }

    console.log(`\nToplam: ${changedPlayers} tablo satırı, ${nameFixes.length} skor ismi, ${writes.length} yazma işlemi.`);
    if (!APPLY) {
        console.log("Rapor modu: hiçbir şey yazılmadı. Uygulamak için --apply ekle.");
        return;
    }
    for (let i = 0; i < writes.length; i += 400) {
        const batch = db.batch();
        writes.slice(i, i + 400).forEach((w) => w(batch));
        await batch.commit();
    }
    console.log("Uygulandı ✓");
}

// '2026-W48' haftasının Perşembe'si --since ayında ya da sonrasında mı (ISO hafta yılı ile tutarlı)
function weekInScope(pid) {
    const m = /^(\d{4})-W(\d{2})$/.exec(pid);
    if (!m) return true;
    const jan4 = new Date(Date.UTC(+m[1], 0, 4));
    const thursday = new Date(jan4);
    thursday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + 3 + (Number(m[2]) - 1) * 7);
    return thursday.toISOString().slice(0, 7) >= SINCE;
}

main().catch((e) => {
    console.error("HATA:", e);
    process.exit(1);
});
