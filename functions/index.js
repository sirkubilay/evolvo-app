// Gerekli Firebase modüllerini içe aktar (v2)
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore"); // <-- YENİ SATIR: Bu, 'increment' için gereklidir
const fs = require('fs'); // Dosya okumak için
const path = require('path'); // Dosya yollarını birleştirmek için
const { onSchedule } = require("firebase-functions/v2/scheduler"); // Zamanlayıcı için

// --- Global Ayarlar (v2) ---
// Bölgeyi Firebase projenin bölgesine göre ayarla (örn: "europe-west1", "us-central1")
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

// --- Firebase Admin SDK Başlatma ---
admin.initializeApp();

// --- Firestore Veritabanı Referansı ---
const db = admin.firestore();
const { botsForDay, botsForPeriod, mergeWithBots, isBotName } = require("./bots");

function getWeekId(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getMonthId(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// --- saveScore Fonksiyonu (YENİ YAPI) ---
// Oyuncunun skorunu "scores" koleksiyonuna kaydeder.
// functions/index.js -> saveScore fonksiyonunu bununla değiştir:

// index.js -> exports.saveScore TAM HALİ
exports.saveScore = onCall(async (request) => {
    const data = request.data;
    // hintsUsed parametresini ekledik
    const { playerName, uid, wordHistory, time, puzzleId, dateString, avatar, recaptchaToken, hintsUsed } = data;

    // --- 1. reCAPTCHA DOĞRULAMASI ---
    if (!recaptchaToken) {
        throw new HttpsError("permission-denied", "Güvenlik doğrulaması eksik.");
    }
    const SECRET_KEY = process.env.RECAPTCHA_SECRET; // functions/.env içinde (git dışı)
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${SECRET_KEY}&response=${recaptchaToken}`;

    try {
        const response = await fetch(verifyUrl, { method: 'POST' });
        const captchaData = await response.json();
        logger.info("GOOGLE RECAPTCHA CEVABI:", captchaData);
        if (!captchaData.success) {
            logger.error("CAPTCHA Başarısız. Sebepler:", captchaData['error-codes']);
            throw new HttpsError("permission-denied", "Bot şüphesi (Geçersiz Anahtar).");
        }
        
        // Localhost'ta çalıştığımız için eşiği 0.5'ten 0.2'ye düşürdük (daha toleranslı)
        if (captchaData.score < 0.5) {
            logger.warn(`Düşük Skor (${captchaData.score}): Bot Engellendi.`);
            throw new HttpsError("permission-denied", "Bot şüphesi (Skor çok düşük).");
        }
    } catch (e) {
        if (e.code === 'permission-denied') throw e;
        logger.error("reCAPTCHA Hatası:", e);
    }

    // --- 2. VERİ DOĞRULAMA ---
    if (!wordHistory || !Array.isArray(wordHistory) || wordHistory.length < 2) {
        throw new HttpsError("invalid-argument", "Geçersiz oyun verisi.");
    }

    const puzzleRef = db.collection("puzzles").doc(dateString);
    const puzzleDoc = await puzzleRef.get();
    
    if (!puzzleDoc.exists) {
        throw new HttpsError("not-found", "Bulmaca sunucuda bulunamadı.");
    }
    const puzzleData = puzzleDoc.data();

    // A. Başlangıç ve Bitiş Kontrolü
    const playerStart = wordHistory[0].toLowerCase();
    const playerEnd = wordHistory[wordHistory.length - 1].toLowerCase();
    const dbStart = puzzleData.baslangic.toLowerCase();
    const dbEnd = puzzleData.bitis.toLowerCase();

    if (playerStart !== dbStart || playerEnd !== dbEnd) {
         throw new HttpsError("failed-precondition", "Başlangıç veya bitiş kelimesi hatalı.");
    }

    // B. Sözlük ve Zincir Kontrolü
    const harfSayisi = puzzleData.harf_sayisi;
    let sozluk;
    try {
        const sozlukDosyasi = `sozluk_${harfSayisi}harfli.txt`;
        const sozlukYolu = path.join(__dirname, sozlukDosyasi);
        const sozlukData = fs.readFileSync(sozlukYolu, 'utf-8');
        sozluk = new Set(sozlukData.split(/\r?\n/).map(k => k.trim().toLowerCase()));
    } catch (e) {
        throw new HttpsError("internal", "Sunucu sözlük hatası.");
    }

    for (let i = 0; i < wordHistory.length; i++) {
        const currentWord = wordHistory[i].toLowerCase();
        if (!sozluk.has(currentWord)) {
            throw new HttpsError("invalid-argument", `Geçersiz kelime: ${currentWord}`);
        }
        if (i > 0) {
            const prevWord = wordHistory[i - 1].toLowerCase();
            let diffCount = 0;
            for (let j = 0; j < harfSayisi; j++) {
                if (currentWord[j] !== prevWord[j]) diffCount++;
            }
            if (diffCount !== 1) {
                throw new HttpsError("invalid-argument", "Zincir kuralı ihlali.");
            }
        }
    }

    // --- 3. YENİ PUAN HESAPLAMA ---
    const steps = wordHistory.length - 1;
    const optimalSteps = puzzleData.optimal_adim;
    // 1. Zaman Puanı: Saniye başı 1 puan düş (Eskisi 2 idi)
    let timePoints = Math.max(0, 1000 - time * 1);
    
    // 2. Adım Puanı
    let stepPoints = 0;
    const extraSteps = steps - optimalSteps;
    
    if (extraSteps <= 0) stepPoints = 1000;
    else if (extraSteps === 1) stepPoints = 900;
    else if (extraSteps === 2) stepPoints = 800;
    else if (extraSteps === 3) stepPoints = 700;
    else if (extraSteps === 4) stepPoints = 600;
    else stepPoints = 250;

    // 3. Temel Puan: %50 Zaman, %50 Adım
    let baseScore = Math.floor(timePoints * 0.60 + stepPoints * 0.40);
    const used = hintsUsed || 0;
    let penalty = used * 150;
    
    // Final Puan (0'ın altına düşemez)
    const calculatedScore = Math.max(0, baseScore - penalty);
    
    // --- 4. KAYIT ---
    const lowerCasePlayerName = playerName.toLowerCase();
    const userAvatar = avatar || '👤';
    const scoresCol = db.collection("scores");

    const q = scoresCol.where("puzzleId", "==", puzzleId).where("lowerCaseName", "==", lowerCasePlayerName).limit(1);
    const querySnapshot = await q.get();

    if (!querySnapshot.empty) {
        const existingScore = querySnapshot.docs[0].data().score;
        return { status: "exists", message: `Zaten skorun var (${existingScore}).`, realScore: existingScore };
    }

    await scoresCol.add({
        name: playerName,
        lowerCaseName: lowerCasePlayerName,
        uid: uid, 
        avatar: userAvatar,
        steps: steps,
        time: time,
        score: calculatedScore, 
        puzzleId: puzzleId,
        hintsUsed: hintsUsed || 0, // İpucu bilgisini de kaydet
        createdAt: FieldValue.serverTimestamp(), 
    });

    // Liderlik tablosu güncelleme (Aynı kalıyor)
    const weekId = getWeekId(new Date()); 
    const monthId = getMonthId(new Date());
    const aggregateData = {
        score: FieldValue.increment(calculatedScore), // İŞTE BÜTÜN DÜĞÜMÜ ÇÖZEN SATIR!
        gamesPlayed: FieldValue.increment(1),
        name: playerName,
        lowerCaseName: lowerCasePlayerName,
        uid: uid,
        avatar: userAvatar
    };
    const batch = db.batch();
    batch.set(db.doc(`leaderboards/${weekId}/players/${lowerCasePlayerName}`), aggregateData, { merge: true });
    batch.set(db.doc(`leaderboards/${monthId}/players/${lowerCasePlayerName}`), aggregateData, { merge: true });
    await batch.commit();

    return { status: "success", message: "Skor kaydedildi.", realScore: calculatedScore };
});

// --- YENİ EKLENEN FONKSİYON: getHint (Güvenli İpucu) ---
exports.getHint = onCall(async (request) => {
    try {
        const { dateString, wordHistory } = request.data;
        
        if (!dateString) {
            throw new HttpsError("invalid-argument", "Tarih bilgisi eksik.");
        }

        const puzzleRef = db.collection("puzzles").doc(dateString);
        const doc = await puzzleRef.get();

        if (!doc.exists) {
            throw new HttpsError("not-found", "Bulmaca veritabanında bulunamadı.");
        }

        const puzzleData = doc.data();
        
        // HATA KORUMASI: Çözüm yolu veritabanında var mı?
        if (!puzzleData || !Array.isArray(puzzleData.cozum_yolu)) {
            logger.error(`HATA: ${dateString} tarihli bulmacada 'cozum_yolu' dizisi yok!`);
            throw new HttpsError("data-loss", "Bu bulmacanın çözüm verisi eksik.");
        }

        const cozumYolu = puzzleData.cozum_yolu;
        
        // Kullanıcının en son doğru bildiği yeri bul
        let lastValidIndex = 0; 
        
        if (wordHistory && Array.isArray(wordHistory)) {
            // Sondan başa doğru tara, ilk eşleşen kelime bizim referans noktamızdır
            for (let i = wordHistory.length - 1; i >= 0; i--) {
                const guess = (wordHistory[i] || "").toLowerCase();
                const foundIndex = cozumYolu.indexOf(guess);
                
                if (foundIndex !== -1) {
                    lastValidIndex = foundIndex;
                    break;
                }
            }
        }

        // Bir sonraki adımı hesapla
        const nextIndex = lastValidIndex + 1;
        
        // Eğer zaten sonuna geldiyse
        if (nextIndex >= cozumYolu.length) {
            return { hintWord: cozumYolu[cozumYolu.length - 1], keepCount: cozumYolu.length - 1 };
        }

        return { 
            hintWord: cozumYolu[nextIndex], 
            keepCount: lastValidIndex 
        };

    } catch (error) {
        logger.error("getHint Fonksiyonunda Kritik Hata:", error);
        // İstemciye temiz hata gönder
        throw new HttpsError("internal", "İpucu üretilirken sunucu hatası oluştu.");
    }
});

// --- getLeaderboard Fonksiyonu (YENİ YAPI) ---
// "scores" koleksiyonundan ilgili bulmaca için liderlik tablosunu çeker.
exports.getLeaderboard = onCall(async (request) => {
    const data = request.data;
    logger.info("getLeaderboard v2 (Tek Koleksiyon) data:", data);
    const { puzzleId } = data;
    // Uzun misafir isimleri (ör. "Yırtıcı_Boğa_953") listeyi bozmasın: geçersiz isim yok sayılır
    const rawName = data.currentPlayerName;
    const currentPlayerName = (typeof rawName === 'string' && rawName.length <= 30) ? rawName : null;

    if (!puzzleId || typeof puzzleId !== 'string' || puzzleId.length < 3) {
        throw new HttpsError("invalid-argument", "Geçersiz bulmaca ID.");
    }

    // --- DEĞİŞİKLİK 4: Tek bir "scores" koleksiyonu kullan ---
    const scoresCol = db.collection("scores");
    
    const currentPlayerNameLower = currentPlayerName ? currentPlayerName.toLowerCase() : null;
    let userScoreData = null;
    let userRank = null;
    let topScores = [];

    try {
        // --- DEĞİŞİKLİK 5: Top 10 sorgusuna "puzzleId" filtresi (where) ekle ---
        const topQuery = scoresCol
            .where("puzzleId", "==", puzzleId) // <-- YENİ FİLTRE
            .orderBy("score", "desc")
            .orderBy("time", "asc")
            .limit(10);
            
        const topSnapshot = await topQuery.get();

        let rank = 1;
        topSnapshot.forEach(doc => {
            const scoreData = doc.data();
            if (scoreData && scoreData.score !== undefined && scoreData.time !== undefined && scoreData.steps !== undefined && scoreData.name) {
                const currentEntry = {
                    rank: rank, name: scoreData.name, score: scoreData.score,
                    steps: scoreData.steps, time: scoreData.time,avatar: scoreData.avatar || '👤',
                };
                topScores.push(currentEntry);
                if (currentPlayerNameLower && scoreData.lowerCaseName === currentPlayerNameLower) {
                    userRank = rank; userScoreData = scoreData;
                    logger.info(`Oyuncu (${currentPlayerName}) Top 10'da bulundu, sıra: ${rank}`);
                }
                rank++;
            } else {
                 logger.warn("Top 10 sorgusunda eksik/hatalı veri atlandı:", doc.id, scoreData);
            }
        });

        if (currentPlayerNameLower && !userScoreData) {
            // 1. Oyuncunun kendi skorunu al
            const userQuery = scoresCol
                .where("puzzleId", "==", puzzleId)
                .where("lowerCaseName", "==", currentPlayerNameLower)
                .limit(1);
            const userSnapshot = await userQuery.get();

            if (!userSnapshot.empty) {
                userScoreData = userSnapshot.docs[0].data();
                logger.info(`Oyuncunun (${currentPlayerName}) skoru bulundu (Top 10 dışında): ${userScoreData.score}`);

                // 2. Oyuncudan daha YÜKSEK skoru olanları VEYA skoru EŞİT ama süresi DAHA DÜŞÜK olanları say
                // (Bu kısım iki ayrı sorgu gerektirir, basitlik adına sadece skora göre sayalım)
                const higherScoresQuery = scoresCol
                    .where("puzzleId", "==", puzzleId)
                    .where("score", ">", userScoreData.score);

                const countSnapshot = await higherScoresQuery.count().get();
                const playersWithHigherScore = countSnapshot.data().count;

                // 3. Sırayı hesapla (Daha iyi skoru olanlar + 1)
                userRank = playersWithHigherScore + 1;
                logger.info(`Oyuncunun sırası hesaplandı: ${userRank}`);

            } else {
                logger.info(`Oyuncunun (${currentPlayerName}) bu bulmaca için skoru bulunamadı.`);
            }
        }

        logger.info(`Liderlik tablosu başarıyla çekildi: ${puzzleId}`);
        return mergeWithBots(topScores, userScoreData ? {
            name: userScoreData.name, score: userScoreData.score,
            steps: userScoreData.steps, time: userScoreData.time, rank: userRank
        } : null, botsForDay(puzzleId));

    } catch (error) {
        logger.error("Firestore'dan liderlik tablosu çekilirken HATA (Tek Koleksiyon):", error);
        
        // --- DEĞİŞİKLİK 7: Hata mesajı artık 3 alanlı bir index bekliyor ---
        if (error.code === 'failed-precondition' && error.message.includes("index")) {
             logger.error("!!! ÖNEMLİ: Firebase Index Hatası: 'getLeaderboard' sorgusu için index eksik.");
             logger.error("!!! GEREKEN İNDEX: Koleksiyon: 'scores', Alanlar: 'puzzleId' (Artan), 'score' (Azalan), 'time' (Artan)");
             logger.error("!!! LÜTFEN BU İNDEKSİ FIREBASE KONSOLUNDAN MANUEL OLUŞTURUN.");
             throw new HttpsError(
                "failed-precondition",
                "Liderlik tablosu veritabanı index'i hazırlanıyor. Lütfen birkaç dakika sonra tekrar deneyin (L2).",
             );
        }
        throw new HttpsError(
            "internal",
            "Liderlik tablosu alınırken bir sunucu hatası oluştu.",
        );
    }
});
// 'leaderboards' koleksiyonundan haftalık/aylık toplamları çeker.
exports.getAggregateLeaderboard = onCall(async (request) => {
    const data = request.data;
    const { period, currentPlayerName } = data; // 'weekly' veya 'monthly'
    
    // Not: Sizin sisteminiz 'playerName' kullandığı için, biz de 'uid' yerine 'playerName' kullanıyoruz.
    const currentPlayerNameLower = currentPlayerName ? currentPlayerName.toLowerCase() : null;

    if (!period || (period !== 'weekly' && period !== 'monthly')) {
        throw new HttpsError("invalid-argument", "Period ('weekly' veya 'monthly') gereklidir.");
    }

    const now = new Date();
    let periodId;

    // 1. Hangi dönemin ID'sini alacağımıza karar ver
    if (period === 'weekly') {
        periodId = getWeekId(now);
    } else {
        periodId = getMonthId(now);
    }

    // 2. İlgili koleksiyonun referansı
    // (örn: leaderboards/2025-W46/players)
    const collectionRef = db.collection(`leaderboards/${periodId}/players`);

    try {
        // 3. Top 10 skoru çek
        const snapshot = await collectionRef
            .orderBy("score", "desc") // Puana göre büyükten küçüğe sırala
            .limit(10) // İlk 10'u al
            .get();

        const topScores = [];
        let rank = 1;
        snapshot.forEach((doc) => {
            const data = doc.data();
            topScores.push({
                rank: rank++,
                name: data.name,
                score: data.score,
                gamesPlayed: data.gamesPlayed,
                lowerCaseName: data.lowerCaseName,
                avatar: data.avatar || '👤',
            });
        });

        // 4. Oyuncunun kendi skorunu bul
        let userScore = null;
        if (currentPlayerNameLower) {
            // Önce Top 10 listesinde var mı diye bak
            const userInTop10 = topScores.find(s => s.lowerCaseName === currentPlayerNameLower);

            if (userInTop10) {
                userScore = userInTop10; // Zaten Top 10'da
            } else {
                // Top 10'da değilse, veritabanından ayrıca çek ve sırasını hesapla
                const userDoc = await collectionRef.doc(currentPlayerNameLower).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    
                    // Oyuncudan daha yüksek puana sahip olanları say
                    const higherScoresQuery = collectionRef
                        .where("score", ">", data.score);
                        
                    const countSnapshot = await higherScoresQuery.count().get();
                    const playersWithHigherScore = countSnapshot.data().count;

                    const calculatedRank = playersWithHigherScore + 1;
                    logger.info(`Aggregate rank for ${data.name} is ${calculatedRank}`);

                    userScore = {
                        rank: calculatedRank, // HESAPLANAN SIRAYI GÖNDER
                        name: data.name,
                        score: data.score,
                        gamesPlayed: data.gamesPlayed,
                    };
                }
            }
        }
        
        logger.info(`Aggregate Liderlik Tablosu (${period}) başarıyla çekildi.`);
        return mergeWithBots(topScores, userScore, botsForPeriod(period));

    } catch (error) {
        // Bu sorgu için de index gerekebilir:
        // 'leaderboards/{periodId}/players' koleksiyonunda 'totalScore' (desc)
        logger.error(`Aggregate Liderlik Tablosu (${period}) alınırken HATA:`, error);
        if (error.code === 'failed-precondition' && error.message.includes("index")) {
             logger.error("!!! ÖNEMLİ: Firebase Index Hatası: 'getAggregateLeaderboard' sorgusu için index eksik.");
             logger.error("!!! GEREKEN İNDEX: Koleksiyon Grubu: 'players', Alanlar: 'totalScore' (Azalan)");
             throw new HttpsError("failed-precondition", "Liderlik tablosu veritabanı index'i hazırlanıyor (L3).");
        }
        throw new HttpsError("internal", "Liderlik tablosu alınırken sunucu hatası oluştu.");
    }
});
exports.getPuzzle = onCall(async (request) => {
    const data = request.data;
    const dateString = data.dateString; // YYYY-AA-GG formatında tarih

    if (!dateString) {
        throw new HttpsError("invalid-argument", "Tarih bilgisi eksik.");
    }

    try {
        const puzzleRef = db.collection("puzzles").doc(dateString);
        const doc = await puzzleRef.get();

        if (!doc.exists) {
            logger.warn(`Bulmaca bulunamadı: ${dateString}`);
            throw new HttpsError("not-found", "Belirtilen tarih için bulmaca bulunamadı.");
        } else {
            logger.info(`Bulmaca başarıyla çekildi: ${dateString}`);
            
            // --- GÜVENLİK DÜZENLEMESİ ---
            const puzzleData = doc.data();

            if (puzzleData.cozum_yolu) {
                delete puzzleData.cozum_yolu;
            }
            return puzzleData;
            // ---------------------------
        }
    } catch (error) {
        logger.error(`Bulmaca çekilirken HATA: ${dateString}`, error);
        throw new HttpsError("internal", "Bulmaca alınırken sunucu hatası oluştu.");
    }
});

// --- YENİ: Otomatik Günlük Bulmaca Üretici Fonksiyon ---
// motor.py'nin Node.js (JavaScript) versiyonu
// Cloud Scheduler ile her gün 00:01'de çalışacak şekilde ayarlandı (zaman dilimi Turkey)
// --- functions/index.js İÇİNDEKİ DEĞİŞECEK KISIM ---

// ESKİ KOD: exports.generateDailyPuzzle = onSchedule("every 24 hours", async (event) => {
// YENİ KOD (Aşağıdakini kopyalayıp eskisinin yerine yapıştırın):

exports.generateDailyPuzzle = onSchedule({
    schedule: "30 23 * * *",       // Her gün saat 23:30'da çalışır
    timeZone: "Europe/Istanbul",   // Türkiye saat dilimi
    retryConfig: { retryCount: 3 } // Hata olursa 3 kez daha dene
}, async (event) => {
    
    logger.info("Otomatik günlük bulmaca üretici tetiklendi (Ön-Üretim Modu).");

    // --- TARİH HESAPLAMA (YARIN İÇİN) ---
    // Şu an 5 Ocak 23:30 ise, biz 6 Ocak için bulmaca üretmeliyiz.
    const now = new Date();
    // Türkiye saati UTC+3 olduğu için ve sunucu UTC olabileceği için güvenli yol:
    // Mevcut zamana 25 saat ekle (24 saat + 1 saat güvenlik payı).
    // Böylece kesinlikle "Yarın"a geçeriz.
    const tomorrow = new Date(now.getTime() + (25 * 60 * 60 * 1000));
    
    const tarihStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD (Örn: 2026-01-06)
    
    logger.info(`Hedef Tarih (Yarın): ${tarihStr}`);

    // --- AYARLAR VE ÜRETİM (BURASI AYNI KALIYOR) ---
    const MIN_ADIM = 3;
    const MAX_ADIM = 6;
    const BONUS_HAK = 5;
    const harfSayisi = Math.floor(Math.random() * 3) + 4; // 4, 5, veya 6

    let sozluk;
    const sozlukDosyasi = `sozluk_${harfSayisi}harfli.txt`;

    try {
        const sozlukYolu = path.join(__dirname, sozlukDosyasi);
        const sozlukData = fs.readFileSync(sozlukYolu, 'utf-8');
        sozluk = new Set(sozlukData.split(/\r?\n/).map(k => k.trim()).filter(k => k.length === harfSayisi));
        
        if (sozluk.size === 0) {
            throw new Error(`Sözlük dosyası '${sozlukDosyasi}' boş veya okunamadı.`);
        }
    } catch (e) {
        logger.error(`Sözlük yüklenirken HATA: ${sozlukDosyasi}`, e);
        return null;
    }

    const sozluk_listesi = Array.from(sozluk);
    let denemeSayisi = 0;
    let uretilenBulmaca = null;

    // --- BFS ALGORİTMASI (AYNI KALIYOR) ---
    while (denemeSayisi < 20 && uretilenBulmaca === null) {
        denemeSayisi++;
        const baslangicKelimesi = sozluk_listesi[Math.floor(Math.random() * sozluk_listesi.length)];
        const kuyruk = [[baslangicKelimesi, 0]];
        const ebeveynHaritasi = new Map();
        ebeveynHaritasi.set(baslangicKelimesi, [null, 0]);
        const adimGruplari = {};
        const alfabe = 'abcçdefgğhıijklmnoöprsştuüvyzâîû';
        let aramaIndex = 0;

        while (aramaIndex < kuyruk.length) {
            const [mevcutKelime, mevcutAdim] = kuyruk[aramaIndex];
            aramaIndex++;
            if (mevcutAdim >= MAX_ADIM) continue;
            const mevcutKelimeList = mevcutKelime.split('');
            for (let i = 0; i < mevcutKelimeList.length; i++) {
                const orijinalHarf = mevcutKelimeList[i];
                for (const harf of alfabe) {
                    if (orijinalHarf === harf) continue;
                    mevcutKelimeList[i] = harf;
                    const potansiyelKomsu = mevcutKelimeList.join('');
                    if (sozluk.has(potansiyelKomsu) && !ebeveynHaritasi.has(potansiyelKomsu)) {
                        const yeniAdim = mevcutAdim + 1;
                        ebeveynHaritasi.set(potansiyelKomsu, [mevcutKelime, yeniAdim]);
                        kuyruk.push([potansiyelKomsu, yeniAdim]);
                        if (!adimGruplari[yeniAdim]) adimGruplari[yeniAdim] = [];
                        adimGruplari[yeniAdim].push(potansiyelKomsu);
                    }
                }
                mevcutKelimeList[i] = orijinalHarf;
            }
        }
        
        const gecerliAdimlar = [];
        for (let adim = MIN_ADIM; adim <= MAX_ADIM; adim++) {
            if (adimGruplari[adim] && adimGruplari[adim].length > 0) gecerliAdimlar.push(adim);
        }
        
        if (gecerliAdimlar.length > 0) {
            const secilenOptimalAdim = gecerliAdimlar[Math.floor(Math.random() * gecerliAdimlar.length)];
            const bitisKelimesi = adimGruplari[secilenOptimalAdim][Math.floor(Math.random() * adimGruplari[secilenOptimalAdim].length)];
            const hakSayisi = secilenOptimalAdim + BONUS_HAK;
            const cozumYolu = [];
            let gecerliKelime = bitisKelimesi;
            while (gecerliKelime !== null) {
                cozumYolu.push(gecerliKelime);
                const ebeveyn = ebeveynHaritasi.get(gecerliKelime);
                gecerliKelime = ebeveyn[0];
            }
            cozumYolu.reverse();
            uretilenBulmaca = {
                baslangic: baslangicKelimesi,
                bitis: bitisKelimesi,
                harf_sayisi: harfSayisi,
                optimal_adim: secilenOptimalAdim,
                hak_sayisi: hakSayisi,
                cozum_yolu: cozumYolu,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
        }
    }

    // --- KAYIT KISMI (DÜZENLENDİ) ---
    if (uretilenBulmaca) {
        try {
            // YARININ TARİHİ İLE KAYDET (tarihStr yukarıda hesaplandı)
            const puzzleRef = db.collection("puzzles").doc(tarihStr);
            await puzzleRef.set(uretilenBulmaca);
            logger.info(`BAŞARILI: Yarının (${tarihStr}) bulmacası şimdiden hazırlandı: ${uretilenBulmaca.baslangic} -> ${uretilenBulmaca.bitis}`);

            // 'latest' kısmını sildik çünkü 'latest' mantığı "şu an oynanan" demektir. 
            // Biz yarınkini ürettiğimiz için 'latest'ı güncellersek oyun yarına geçer.
            // O yüzden sadece tarihli ID ile kaydediyoruz.

        } catch (e) {
            logger.error(`Bulmaca (${tarihStr}) kaydedilirken HATA:`, e);
        }
    } else {
        logger.error(`${denemeSayisi} denemede uygun bulmaca üretilemedi!`);
    }
});
exports.createChallengeV2 = onCall(async (request) => {
    const { puzzlePath } = request.data;
    
    // 1. Veri Doğrulama
    if (!puzzlePath || !Array.isArray(puzzlePath) || puzzlePath.length < 2) {
        throw new HttpsError("invalid-argument", "Geçersiz bulmaca yolu.");
    }

    const harfSayisi = puzzlePath[0].length;
    if (harfSayisi < 3 || harfSayisi > 7) throw new HttpsError("invalid-argument", "Geçersiz harf sayısı.");

    // 2. Sözlüğü Yükle
    let sozluk;
    try {
        const sozlukDosyasi = `sozluk_${harfSayisi}harfli.txt`;
        const sozlukYolu = path.join(__dirname, sozlukDosyasi);
        const sozlukData = fs.readFileSync(sozlukYolu, 'utf-8');
        sozluk = new Set(sozlukData.split(/\r?\n/).map(k => k.trim()));
    } catch (err) {
        throw new HttpsError("internal", "Sözlük yüklenemedi.");
    }

    // 3. Adım Adım Kontrol (Güvenlik)
    // Kullanıcının gönderdiği her kelimenin sözlükte olup olmadığını
    // ve bir öncekiyle tek harf farkı olup olmadığını sunucuda tekrar kontrol ediyoruz.
    
    for (let i = 0; i < puzzlePath.length; i++) {
        const word = puzzlePath[i].toLowerCase();
        
        // A. Sözlükte var mı?
        if (!sozluk.has(word)) {
            throw new HttpsError("invalid-argument", `"${word}" kelimesi sözlükte yok! Hile yapma.`);
        }

        // B. Bir öncekiyle bağlantılı mı?
        if (i > 0) {
            const prevWord = puzzlePath[i - 1].toLowerCase();
            let diffCount = 0;
            for (let j = 0; j < harfSayisi; j++) {
                if (word[j] !== prevWord[j]) diffCount++;
            }
            if (diffCount !== 1) {
                throw new HttpsError("invalid-argument", `"${prevWord}" -> "${word}" geçişi hatalı!`);
            }
        }
    }

    // 4. Her şey doğruysa kaydet
    const startWord = puzzlePath[0];
    const endWord = puzzlePath[puzzlePath.length - 1];
    const optimalSteps = puzzlePath.length - 1; // Kullanıcının yaptığı adım sayısı optimal kabul edilir (veya daha iyisi olabilir ama oyuncu bunu başardı)

    try {
        const challengeData = {
            baslangic: startWord,
            bitis: endWord,
            harf_sayisi: harfSayisi,
            optimal_adim: optimalSteps,
            hak_sayisi: optimalSteps + 5, // Arkadaşına biraz avans verelim
            creatorPath: puzzlePath, // Oluşturanın yolunu saklayalım (belki ipucu için lazım olur)
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: 'user_generated'
        };
        
        const docRef = await db.collection("challenges").add(challengeData);
        return { id: docRef.id };

    } catch (err) {
        logger.error("ChallengeV2 Kayıt Hatası:", err);
        throw new HttpsError("internal", "Veritabanı hatası.");
    }
});
exports.getChallenge = onCall(async (request) => {
    const { id } = request.data;

    // 1. ID Kontrolü
    if (!id) {
        throw new HttpsError("invalid-argument", "Bulmaca ID'si gerekli.");
    }

    try {
        // 2. "challenges" Koleksiyonundan Oku
        // (createChallengeV2 fonksiyonu buraya kayıt yapıyor, o yüzden buradan okumalıyız)
        const docRef = db.collection("challenges").doc(id);
        const doc = await docRef.get();

        // 3. Bulunamadıysa Hata Fırlat
        if (!doc.exists) {
            logger.warn(`Challenge bulunamadı: ${id}`);
            throw new HttpsError("not-found", "İstenen bulmaca bulunamadı.");
        }

        // 4. Veriyi Döndür
        return doc.data();

    } catch (error) {
        logger.error("GetChallenge Hatası:", error);
        
        // Hatanın detayını kaybetmemek için fırlat
        if (error.code === 'not-found') throw error;
        
        throw new HttpsError("internal", "Bulmaca verisi çekilirken sunucu hatası.");
    }
});
// --- YENİ EKLENEN: React'in fetch ile çağırdığı Günlük Bulmaca API'si ---
exports.apiDailyPuzzle = onRequest({ cors: true }, async (req, res) => {
    const dateString = req.query.date;

    if (!dateString) {
        res.status(400).json({ error: "Tarih parametresi eksik!" });
        return;
    }

    try {
        const doc = await db.collection("puzzles").doc(dateString).get();

        if (!doc.exists) {
            res.status(404).json({ error: "Bu tarih için bulmaca bulunamadı." });
            return;
        }

        const puzzleData = doc.data();
        
        // Hile yapılmasın diye çözüm yolunu gizleyip öyle gönderiyoruz
        if (puzzleData.cozum_yolu) {
            delete puzzleData.cozum_yolu;
        }

        res.status(200).json(puzzleData);

    } catch (error) {
        logger.error("apiDailyPuzzle Çekilirken Hata:", error);
        res.status(500).json({ error: "Sunucu hatası." });
    }
});


// =====================================================================
// ARKADAŞLAR: arkadaş kodu, karşılıklı ekleme ve arkadaş liderlik tablosu
// Veri: users/{uid}.friendCode, users/{uid}.friends = [{ uid, username }]
//       friendCodes/{KOD} = { uid, username }  (istemci erişemez, sadece bu fonksiyonlar)
// =====================================================================
const crypto = require("crypto");
const FRIEND_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 0/O, 1/I karışmasın
const FRIEND_CODE_LEN = 6;
const MAX_FRIENDS = 50;

function normalizeFriendCode(input) {
    if (typeof input !== "string") return null;
    const code = input.toUpperCase().replace(/^EVO[-\s]?/, "").replace(/[^A-Z0-9]/g, "");
    if (code.length !== FRIEND_CODE_LEN) return null;
    for (const ch of code) if (!FRIEND_CODE_ALPHABET.includes(ch)) return null;
    return code;
}

function randomFriendCode() {
    const bytes = crypto.randomBytes(FRIEND_CODE_LEN);
    let out = "";
    for (let i = 0; i < FRIEND_CODE_LEN; i++) out += FRIEND_CODE_ALPHABET[bytes[i] % FRIEND_CODE_ALPHABET.length];
    return out;
}

function requireAuth(request) {
    if (!request.auth) throw new HttpsError("unauthenticated", "Arkadaş özellikleri için giriş yapmalısın.");
    return request.auth.uid;
}

async function getUsernameOrThrow(uid) {
    const snap = await db.doc(`users/${uid}`).get();
    const username = snap.exists ? snap.data().username : null;
    if (!username) throw new HttpsError("failed-precondition", "Önce bir kullanıcı adı seçmelisin.");
    return { snap, username };
}

/** Oyuncunun kodunu (yoksa oluşturarak) ve arkadaş listesini döner. */
exports.getFriends = onCall(async (request) => {
    const uid = requireAuth(request);
    const { snap, username } = await getUsernameOrThrow(uid);
    let code = snap.data().friendCode;

    if (!code) {
        for (let attempt = 0; attempt < 5 && !code; attempt++) {
            const candidate = randomFriendCode();
            try {
                await db.doc(`friendCodes/${candidate}`).create({ uid, username, createdAt: FieldValue.serverTimestamp() });
                code = candidate;
            } catch (e) {
                if (e.code !== 6 /* ALREADY_EXISTS: bu kod alınmış, yenisini dene */) throw e;
            }
        }
        if (!code) throw new HttpsError("internal", "Arkadaş kodu oluşturulamadı, tekrar dene.");
        await db.doc(`users/${uid}`).set({ friendCode: code }, { merge: true });
    }

    return { code: `EVO-${code}`, username, friends: snap.data().friends || [] };
});

/** Koda sahip oyuncuyu ekler; ekleme karşılıklıdır. */
exports.addFriend = onCall(async (request) => {
    const uid = requireAuth(request);
    const code = normalizeFriendCode(request.data && request.data.code);
    if (!code) throw new HttpsError("invalid-argument", "Geçersiz arkadaş kodu.");

    const codeSnap = await db.doc(`friendCodes/${code}`).get();
    if (!codeSnap.exists) throw new HttpsError("not-found", "Bu koda sahip oyuncu bulunamadı.");
    const friendUid = codeSnap.data().uid;
    if (friendUid === uid) throw new HttpsError("invalid-argument", "Kendi kodunu ekleyemezsin.");

    const meRef = db.doc(`users/${uid}`);
    const friendRef = db.doc(`users/${friendUid}`);

    return db.runTransaction(async (tx) => {
        const [me, friend] = await Promise.all([tx.get(meRef), tx.get(friendRef)]);
        const myName = me.exists ? me.data().username : null;
        const friendName = friend.exists ? friend.data().username : null;
        if (!myName) throw new HttpsError("failed-precondition", "Önce bir kullanıcı adı seçmelisin.");
        if (!friendName) throw new HttpsError("not-found", "Bu oyuncunun hesabı bulunamadı.");

        const myFriends = me.data().friends || [];
        const theirFriends = friend.data().friends || [];
        if (myFriends.some((f) => f.uid === friendUid)) {
            return { status: "exists", friend: { uid: friendUid, username: friendName } };
        }
        if (myFriends.length >= MAX_FRIENDS || theirFriends.length >= MAX_FRIENDS) {
            throw new HttpsError("resource-exhausted", `En fazla ${MAX_FRIENDS} arkadaş eklenebilir.`);
        }

        tx.set(meRef, { friends: [...myFriends, { uid: friendUid, username: friendName }] }, { merge: true });
        if (!theirFriends.some((f) => f.uid === uid)) {
            tx.set(friendRef, { friends: [...theirFriends, { uid, username: myName }] }, { merge: true });
        }
        return { status: "added", friend: { uid: friendUid, username: friendName } };
    });
});

/** Arkadaşlığı iki taraftan da siler. */
exports.removeFriend = onCall(async (request) => {
    const uid = requireAuth(request);
    const friendUid = request.data && request.data.uid;
    if (typeof friendUid !== "string" || !friendUid) throw new HttpsError("invalid-argument", "Geçersiz arkadaş.");

    const meRef = db.doc(`users/${uid}`);
    const friendRef = db.doc(`users/${friendUid}`);
    await db.runTransaction(async (tx) => {
        const [me, friend] = await Promise.all([tx.get(meRef), tx.get(friendRef)]);
        if (me.exists) tx.set(meRef, { friends: (me.data().friends || []).filter((f) => f.uid !== friendUid) }, { merge: true });
        if (friend.exists) tx.set(friendRef, { friends: (friend.data().friends || []).filter((f) => f.uid !== uid) }, { merge: true });
    });
    return { status: "removed" };
});

/** Oyuncu + arkadaşlarının sıralaması. period: 'daily' | 'weekly' | 'monthly' */
exports.getFriendsLeaderboard = onCall(async (request) => {
    const uid = requireAuth(request);
    const { period, puzzleId } = request.data || {};
    if (!["daily", "weekly", "monthly"].includes(period)) throw new HttpsError("invalid-argument", "Geçersiz dönem.");
    if (period === "daily" && (typeof puzzleId !== "string" || puzzleId.length < 3)) {
        throw new HttpsError("invalid-argument", "Geçersiz bulmaca ID.");
    }

    const { snap, username } = await getUsernameOrThrow(uid);
    const people = [{ uid, username }, ...(snap.data().friends || [])];
    const names = [...new Set(people.map((p) => p.username.toLowerCase()))];
    const rows = [];

    if (period === "daily") {
        for (let i = 0; i < names.length; i += 30) { // Firestore 'in' sınırı 30
            const chunk = names.slice(i, i + 30);
            const qs = await db.collection("scores").where("puzzleId", "==", puzzleId).where("lowerCaseName", "in", chunk).get();
            qs.forEach((d) => {
                const s = d.data();
                rows.push({ name: s.name, lowerCaseName: s.lowerCaseName, score: s.score, time: s.time, steps: s.steps, avatar: s.avatar || "👤" });
            });
        }
        rows.sort((a, b) => b.score - a.score || a.time - b.time);
    } else {
        const periodId = period === "weekly" ? getWeekId(new Date()) : getMonthId(new Date());
        const refs = names.map((n) => db.doc(`leaderboards/${periodId}/players/${n}`));
        const docs = refs.length ? await db.getAll(...refs) : [];
        docs.forEach((d) => {
            if (!d.exists) return;
            const s = d.data();
            rows.push({ name: s.name, lowerCaseName: s.lowerCaseName, score: s.score, gamesPlayed: s.gamesPlayed, avatar: s.avatar || "👤" });
        });
        rows.sort((a, b) => b.score - a.score);
    }

    const played = new Set(rows.map((r) => r.lowerCaseName));
    return {
        scores: rows.map((r, i) => ({ ...r, rank: i + 1 })),
        notPlayed: people.filter((p) => !played.has(p.username.toLowerCase())).map((p) => p.username),
    };
});

// ============================================================================
// KULLANICI ADI: benzersiz isim ayırtma (büyük/küçük harf duyarsız)
// İstemci diğer kullanıcıların belgelerini okuyamadığı için (firestore.rules) kontrol sunucuda yapılır.
// usernames/{küçükHarfİsim} = { uid, name } → isim kilidi.
// ============================================================================
const USERNAME_RE = /^[\p{L}0-9_]{3,12}$/u;

exports.claimUsername = onCall(async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "İsim seçmek için giriş yapmalısın.");
    const uid = request.auth.uid;
    const name = String(request.data?.name || "").trim();
    if (!USERNAME_RE.test(name)) {
        throw new HttpsError("invalid-argument", "İsim 3-12 karakter olmalı; sadece harf, rakam ve _ kullanılabilir.");
    }
    const lower = name.toLocaleLowerCase("tr-TR");
    if (isBotName(name)) throw new HttpsError("already-exists", "Bu efsanevi isim zaten alınmış. Başka bir tane dene!");

    // Kilit sisteminden önce alınmış eski isimler (usernames kaydı olmayanlar) için tek seferlik tarama
    const legacy = await db.collection("users").select("username").get();
    const takenByOther = legacy.docs.some((d) => d.id !== uid && typeof d.data().username === "string"
        && d.data().username.toLocaleLowerCase("tr-TR") === lower);
    if (takenByOther) throw new HttpsError("already-exists", "Bu efsanevi isim zaten alınmış. Başka bir tane dene!");

    await db.runTransaction(async (tx) => {
        const lockRef = db.collection("usernames").doc(lower);
        const userRef = db.doc(`users/${uid}`);
        const [lock, user] = await Promise.all([tx.get(lockRef), tx.get(userRef)]);
        if (lock.exists && lock.data().uid !== uid) {
            throw new HttpsError("already-exists", "Bu efsanevi isim zaten alınmış. Başka bir tane dene!");
        }
        // Eski ismin kilidini bırak
        const oldName = user.exists ? user.data().username : null;
        if (oldName && oldName.toLocaleLowerCase("tr-TR") !== lower) {
            tx.delete(db.collection("usernames").doc(oldName.toLocaleLowerCase("tr-TR")));
        }
        tx.set(lockRef, { uid, name, createdAt: FieldValue.serverTimestamp() });
        tx.set(userRef, {
            username: name,
            usernameLower: lower,
            ...(user.exists && user.data().createdAt ? {} : { createdAt: new Date().toISOString() }),
        }, { merge: true });
    });
    return { name };
});

// --- Satın alma doğrulama (Google Play Developer API) ---
// İstemci ipucu paketini satın aldığında, ipuçlarını eklemeden önce satın alma jetonunu buraya gönderir.
// Jeton Google'a sorulur: gerçekten ödenmiş (purchaseState 0) ve henüz tüketilmemiş (consumptionState 0)
// olmalı. Tüketilene kadar aynı jeton tekrar doğrulanabilir (uygulama ipucunu eklemeden kapanırsa
// bir sonraki açılışta kurtarma için); tüketildikten sonra artık kabul edilmez.
const { GoogleAuth } = require("google-auth-library");
const PLAY_PACKAGE = "com.altayinteractive.evolvo";
const HINT_PRODUCTS = { hints_5: 5, hints_10: 10, hints_20: 20, starter_pack: 25 };
// Tek seferlik (tüketilmeyen) ürünler: ipuçları jeton başına yalnızca bir kez verilir, reklamları da kaldırır.
const ONE_TIME_PRODUCTS = new Set(["starter_pack"]);
const playAuth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/androidpublisher"] });

exports.verifyHintPurchase = onCall(async (request) => {
    const productId = String(request.data?.productId || "");
    const token = String(request.data?.purchaseToken || "");
    const count = HINT_PRODUCTS[productId];
    if (!count || token.length < 20 || token.length > 4096) {
        throw new HttpsError("invalid-argument", "Geçersiz satın alma.");
    }

    let purchase;
    try {
        const client = await playAuth.getClient();
        const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}`
            + `/purchases/products/${productId}/tokens/${encodeURIComponent(token)}`;
        purchase = (await client.request({ url })).data;
    } catch (e) {
        const status = e?.response?.status;
        logger.error("Play doğrulama hatası", { productId, status, msg: e?.message });
        if (status === 400 || status === 404 || status === 410) {
            throw new HttpsError("not-found", "Satın alma bulunamadı.");
        }
        // Yetki/ağ sorunu: istemci satın almayı tüketmeden bekletir, sonra tekrar dener.
        throw new HttpsError("unavailable", "Doğrulama şu an yapılamıyor.");
    }

    const oneTime = ONE_TIME_PRODUCTS.has(productId);
    const ok = purchase.purchaseState === 0 && (oneTime || purchase.consumptionState === 0);
    const ref = db.collection("purchases").doc(crypto.createHash("sha256").update(token).digest("hex"));

    if (oneTime && ok) {
        // Aynı jetonla ikinci kez ipucu verilmesin: teslimi işlem içinde işaretle.
        const granted = await db.runTransaction(async (t) => {
            const snap = await t.get(ref);
            const first = !snap.exists || !snap.data().delivered;
            t.set(ref, {
                productId, orderId: purchase.orderId || null, uid: request.auth?.uid || null,
                purchaseState: purchase.purchaseState, delivered: true,
                verifiedAt: FieldValue.serverTimestamp(), checks: FieldValue.increment(1),
            }, { merge: true });
            return first;
        });
        return { ok: true, count: granted ? count : 0 };
    }

    await ref.set({
        productId, orderId: purchase.orderId || null, uid: request.auth?.uid || null,
        purchaseState: purchase.purchaseState, consumptionState: purchase.consumptionState,
        verifiedAt: FieldValue.serverTimestamp(), checks: FieldValue.increment(1),
    }, { merge: true });

    if (purchase.purchaseState === 2) return { ok: false, pending: true };
    if (!ok) throw new HttpsError("failed-precondition", "Bu satın alma geçerli değil veya zaten kullanılmış.");
    return { ok: true, count };
});
