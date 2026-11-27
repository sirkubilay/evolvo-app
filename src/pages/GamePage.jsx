import { useState, useEffect, useCallback, useRef } from 'react';
import { getApp } from 'firebase/app';
import { loadProgress, saveProgress, clearProgress, progressId } from '../lib/gameProgress';
import { puzzleIdOf } from '../lib/daily';
import { playSuccessSound, playErrorSound, playPopSound } from '../lib/sound';
import { StarterOfferCard, starterOfferActive } from '../components/StarterOffer';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Trash2, Trophy, Menu, X, Star, BarChart2, HelpCircle, Lightbulb, Delete, CheckCircle2, AlertCircle, Loader2, Book, ChevronLeft, ChevronRight as ChevronRightIcon, Copy, Share2, Twitter, MessageCircle, Download } from 'lucide-react';
import { AchievementsModal } from '../components/modals/AchievementsModal';
import { AvatarModal } from '../components/modals/AvatarModal';
import { StatsModal } from '../components/modals/StatsModal';
import { SideMenu } from '../components/modals/SideMenu';
import { LeaderboardModal } from '../components/modals/LeaderboardModal';
import { HowToPlayModal } from '../components/modals/HowToPlayModal';
import { CalendarModal } from '../components/modals/CalendarModal';
import { DefinitionModal } from '../components/modals/DefinitionModal';
import { Logo } from '../components/Logo';
import { hapticTap, hapticMove, hapticError, isNative } from '../lib/native';
import { shareImage, saveImage, shareLinks } from '../lib/share';
import { drawShareCard } from '../lib/shareCard';
import { watchRewardedAd } from '../lib/monetization';
import { PLAY_STORE_LIVE, PLAY_STORE_URL, SHARE_URL, MAX_BONUS_HINTS, DAILY_HINTS } from '../data/constants';
import { dayKey } from '../lib/progress';
import { trackEvent } from '../lib/analytics';
import { useHintWallet, spendHint, addHints, startStarterOffer } from '../lib/hints';

export const GamePage = ({ onBack,onBackToMap,onUnlimitedWin,onNextLevel,username,offlineProgress, userAvatar, setUserAvatar, theme, colors, toggleModal, modalState, settings, updateStats, puzzleData, onLoadPastPuzzle, user, onLogout, message, showFeedback, onLogin, checkTDK, leaderboardData, fetchLeaderboard, leaderboardDifficulty }) => {
  // Yarım kalan oyun varsa kaldığı yerden başla (hamleler, ipuçları, kilitli satırlar)
  const [initialProgress] = useState(() => loadProgress(puzzleData));
  const [history, setHistory] = useState(() => initialProgress?.history || [puzzleData.start]);
  const [currentGuess, setCurrentGuess] = useState("");
  // Boş satırda "Sil"e basınca son satırın altında "Satırı sil" onayı açılır
  const [pendingDelete, setPendingDelete] = useState(false);
  const [winningRowAnimation, setWinningRowAnimation] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // "Keskin Nişancı" başarımı için: bu oyunda girilen geçersiz kelime sayısı
  const invalidAttemptsRef = useRef(0);
  // İpuçları: günlük bulmacada bulmaca başına DAILY_HINTS (+ reklamla en fazla MAX_BONUS_HINTS),
  // sınırsız modda oyuncunun ortak cüzdanı (lib/hints.js).
  const isUnlimited = puzzleData.type === 'unlimited';
  const [hintsUsedCount, setHintsUsedCount] = useState(() => initialProgress?.hintsUsed || 0);
  const [bonusHints, setBonusHints] = useState(() => initialProgress?.bonusHints || 0);
  const wallet = useHintWallet();
  const hintsLeft = isUnlimited ? wallet : Math.max(0, DAILY_HINTS + bonusHints - hintsUsedCount);
  const [rewardSheetOpen, setRewardSheetOpen] = useState(false);
  const [rewardLoading, setRewardLoading] = useState(false);
  const canEarnHint = isNative() && puzzleData.type !== 'custom' && (isUnlimited || bonusHints < MAX_BONUS_HINTS);
  const [lockedIndices, setLockedIndices] = useState(() => initialProgress?.locked || [0]); 
  const [rowAnimation, setRowAnimation] = useState(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [scoreDetails, setScoreDetails] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePreview, setSharePreview] = useState(null);
  const earnedStars = !scoreDetails?.total ? 0 : scoreDetails.total >= 800 ? 3 : scoreDetails.total >= 500 ? 2 : 1;
  
  // Sesler lib/sound.js'te: menüdeki "Ses" kapalıysa çalmaz
  const markInvalid = () => {
    invalidAttemptsRef.current += 1;
    playErrorSound();
    hapticError();
  };
  
  const wordLength = puzzleData.start.length;
  const maxMoves = puzzleData.maxMoves || (puzzleData.optimalSteps ? puzzleData.optimalSteps + 5 : 15);
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  // Günlük bulmacada kolay/zor ayrı kimlikte; sınırsız modda eski anahtar (offline_X_Y) korunur
  const timerKey = `evolvo_timer_${puzzleData.puzzleId || puzzleData.date}`;
  const [timer, setTimer] = useState(() => {
    const savedTime = localStorage.getItem(timerKey);
    return savedTime ? parseInt(savedTime, 10) : 0;
  });

  useEffect(() => {
    if (puzzleData.type === 'custom' || isGameOver) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        const nextTime = prev + 1;
        localStorage.setItem(timerKey, nextTime);
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameOver, puzzleData.type, timerKey]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isOneLetterDifferent = (w1, w2) => {
    if (w1.length !== w2.length) return false;
    let diff = 0;
    for (let i = 0; i < w1.length; i++) if (w1[i] !== w2[i]) diff++;
    return diff === 1;
  };
useEffect(() => {
    const currentId = progressId(puzzleData);

    const playStatus = localStorage.getItem(`evolvo_played_${currentId}`);
    const savedHistoryStr = localStorage.getItem(`evolvo_history_${currentId}`);

    if (playStatus && savedHistoryStr) {
      // Oyun bitti (kazandı veya kaybetti) — sonuç ekranını göster
      const parsedHistory = JSON.parse(savedHistoryStr);

      if (parsedHistory[0] === puzzleData?.start) {
        setIsGameOver(true);
        setIsWon(playStatus === 'won');
        setHistory(parsedHistory);

        const savedStatsStr = localStorage.getItem(`evolvo_today_stats_${currentId}`);
        if (savedStatsStr) {
          const savedStats = JSON.parse(savedStatsStr);
          setTimer(savedStats.timer || 0);
          const actualScore = typeof savedStats.score === 'object' ? savedStats.score.score : (savedStats.score || 0);
          setScoreDetails({ total: actualScore, penalty: (savedStats.hintsUsed || 0) * 150 });
        }
      } else {
        localStorage.removeItem(`evolvo_played_${currentId}`);
        localStorage.removeItem(`evolvo_history_${currentId}`);
        localStorage.removeItem(`evolvo_today_stats_${currentId}`);
        localStorage.removeItem(`evolvo_timer_${currentId}`);
      }
    }
    // Yarım kalan oyun ilk state'te loadProgress ile yükleniyor.
  }, [puzzleData]);

  // Her değişiklikte ilerlemeyi kaydet: uygulama kapanınca hamleler ve ipucu hakkı kaybolmaz
  useEffect(() => {
    if (isGameOver || puzzleData.type === 'custom') return;
    if (localStorage.getItem(`evolvo_played_${progressId(puzzleData)}`)) return;
    saveProgress(puzzleData, { history, hintsUsed: hintsUsedCount, bonusHints, locked: lockedIndices });
  }, [history, hintsUsedCount, bonusHints, lockedIndices, isGameOver, puzzleData]);

  // Boş satırda "Sil"e basınca son yazılan satırın SOLUNDA çöp kutusu butonu çıkar; ona basınca
  // satır silinir. Başka bir yere dokununca ya da bir harfe basınca kaybolur.
  // Buton, açıldığı andaki satır sayısına bağlı: satır eklenir/silinirse kendiliğinden kaybolur.
  const showDeleteConfirm = pendingDelete === history.length && !isGameOver;
  useEffect(() => {
    if (!showDeleteConfirm) return undefined;
    const close = (e) => {
      if (e.target.closest?.('[data-delete-confirm],[data-game-keyboard]')) return;
      setPendingDelete(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [showDeleteConfirm]);


  const confirmRowDelete = () => {
    const lastIdx = history.length - 1;
    if (lastIdx > 0 && !lockedIndices.includes(lastIdx)) setHistory(p => p.slice(0, -1));
    setPendingDelete(false);
  };
  // skipSound parametresi eklendi (ikinci kez çalmaması için)
  const calculateAndFinish = async (finalHistory, didWin, skipSound = false) => {
    localStorage.removeItem(timerKey);
    clearProgress(puzzleData);
    setIsGameOver(true);
    setIsWon(didWin);
    
    // 1. DÜZELTME: Değişkenleri ve hesaplamaları EN ÜSTE aldık ki kod patlamasın.
    let score = 0;
    const hintsUsed = hintsUsedCount;

    if (didWin) {
        const stepsUsed = finalHistory.length - 1;
        const optimal = puzzleData.optimalSteps || Math.max(1, stepsUsed - 2); 
        const diff = stepsUsed - optimal;

        // Sunucudaki (functions/index.js → saveScore) formülün birebir aynısı; ekrandaki puan ile
        // sıralamaya yazılan puan farklı çıkmasın.
        const stepPoints = diff <= 0 ? 1000 : diff === 1 ? 900 : diff === 2 ? 800 : diff === 3 ? 700 : diff === 4 ? 600 : 250;
        const timePoints = Math.max(0, 1000 - timer);
        const baseScore = Math.floor(timePoints * 0.6 + stepPoints * 0.4);
        score = Math.max(0, baseScore - hintsUsed * 150);
        
        showFeedback("TEBRİKLER!", "success");
        if(!skipSound) playSuccessSound(); 

        if (puzzleData.type === 'unlimited') {
            // 1. SINIRSIZ MOD: Firebase'e kaydetme, sadece yerel ilerlemeyi artır
            onUnlimitedWin(puzzleData.length, puzzleData.level, score, finalHistory.length - 1, timer);
        } else {
            // 2. GÜNLÜK/ÖZEL MOD: Mevcut Firebase kayıt mantığı aynen kalsın
            try {
              if (!executeRecaptcha) {
                   console.error("reCAPTCHA henüz yüklenmedi!");
                   return;
               }
               const recaptchaToken = await executeRecaptcha("saveScore");
               const guvenliGecmis = finalHistory.map(kelime => kelime.toLocaleLowerCase('tr-TR'));
               const functions = getFunctions(getApp(), 'europe-west1');
               const saveScoreFn = httpsCallable(functions, 'saveScore');
               await saveScoreFn({
                 playerName: username,
                 uid: user ? user.uid : "guest_" + Date.now(), 
                 wordHistory: guvenliGecmis,
                 time: Number(timer),
                 puzzleId: puzzleIdOf(puzzleData),
                 dateString: puzzleIdOf(puzzleData),
                 avatar: userAvatar.icon,          
                 hintsUsed: hintsUsed,
                 score: score, // Puanı da gönderiyoruz
                 recaptchaToken: recaptchaToken 
               });
               showFeedback("Skor Liderlik Tablosuna Kaydedildi! 🏆", "success");
            } catch (err) {
               console.error("Skor kaydedilirken hata:", err);
               showFeedback("Skor buluta kaydedilemedi.", "error");
            }
        }
    } else {
        showFeedback("Hakkınız bitti", "error");
        playErrorSound(); 
    }

    // Restore key'i useEffect ile tutarlı: unlimited_X_Y / YYYY-MM-DD / YYYY-MM-DD-kolay
    const saveKey = progressId(puzzleData);

    trackEvent('game_end', {
      mode: puzzleData?.type === 'unlimited' ? 'unlimited' : 'daily',
      win: didWin ? 1 : 0,
      hints: hintsUsed,
      score: score,
    });
    localStorage.setItem(`evolvo_played_${saveKey}`, didWin ? 'won' : 'lost');
    localStorage.setItem(`evolvo_history_${saveKey}`, JSON.stringify(finalHistory));
    const todayStats = {
      score: score,
      timer: timer,
      hintsUsed: hintsUsed
    };
    localStorage.setItem(`evolvo_today_stats_${saveKey}`, JSON.stringify(todayStats));
    
    const finalStats = { score: score, timer: timer, hintsUsed: hintsUsed };
    localStorage.setItem("evolvo_last_stats", JSON.stringify(finalStats));  
    setScoreDetails({ total: score, penalty: hintsUsed * 150 });
    updateStats('game_end', {
      win: didWin,
      hints: hintsUsed,
      score: score,
      time: Number(timer),
      moves: finalHistory.length - 1,
      maxMoves,
      optimal: puzzleData.optimalSteps,
      invalidAttempts: invalidAttemptsRef.current,
      isTodaysDaily: puzzleData.type === 'daily' && puzzleData.date === dayKey(),
      words: finalHistory.slice(1),
    });
    // Wordle gibi: günün bulmacası bitince istatistikler kendiliğinden açılır
    if (puzzleData.type === 'daily' && puzzleData.date === dayKey()) {
      setTimeout(() => toggleModal('stats', true), 2200);
    }
  };

const handleHint = async (e) => {
    if (e && e.currentTarget) e.currentTarget.blur();
    if (puzzleData.type === 'custom') {
      showFeedback("Bu modda ipucu kapalıdır.", "info");
      return;
    }
    if (isGameOver) return;
    if (hintsLeft <= 0) {
      if (isUnlimited) startStarterOffer();
      if (canEarnHint || isUnlimited) setRewardSheetOpen(true);
      else showFeedback("Bu bulmacadaki ipucu hakkın bitti.", "info");
      return;
    }

    // SINIRSIZ MOD (ÇEVRİMDIŞI) İPUCU MANTIĞI
    if (puzzleData.type === 'unlimited') {
      const solution = puzzleData.solution;

      // History'de en yakın çözüm kelimesini bul (en güncel olandan geriye doğru tara)
      let backtrackIdx = -1;
      let nextWord = null;

      for (let i = history.length - 1; i >= 0; i--) {
        const posInSol = solution.indexOf(history[i]);
        if (posInSol !== -1 && posInSol < solution.length - 1) {
          backtrackIdx = i;
          nextWord = solution[posInSol + 1];
          break;
        }
      }

      if (nextWord !== null && backtrackIdx >= 0) {
        // Yanlış hamleler kesilir, çözüm yolundaki bir sonraki kelime eklenir
        const newHistory = [...history.slice(0, backtrackIdx + 1), nextWord];
        setHistory(newHistory);
        setCurrentGuess("");
        spendHint();
        setHintsUsedCount(c => c + 1);
        setLockedIndices(prev => {
          const filtered = prev.filter(idx => idx <= backtrackIdx);
          return [...filtered, backtrackIdx + 1];
        });
        showFeedback("İpucu Kullanıldı (-150 Puan)", "success");
        if (nextWord === puzzleData.target) {
          calculateAndFinish(newHistory, true, false);
        }
      } else {
        showFeedback("Bu noktadan ipucu verilemiyor.", "error");
      }
      return;
    }

    // --- BURADAN AŞAĞISI MEVCUT FIREBASE (ONLINE) İPUCU KODLARIN ---
    setIsLoading(true);
    try {
      const functions = getFunctions(getApp(), 'europe-west1');
      const getHintFn = httpsCallable(functions, 'getHint');
      const guvenliGecmis = history.map(kelime => kelime.toLocaleLowerCase('tr-TR'));
      const result = await getHintFn({
        dateString: puzzleIdOf(puzzleData),
        wordHistory: guvenliGecmis
      });
      
      const { hintWord, keepCount } = result.data;
      const upperHintWord = hintWord.toLocaleUpperCase('tr-TR');
      const newHistory = [...history.slice(0, keepCount + 1), upperHintWord];
      
      setHistory(newHistory);
      setCurrentGuess("");
      setHintsUsedCount(c => c + 1);
      setLockedIndices(prev => [...prev, newHistory.length - 1]);
      showFeedback("İpucu Kullanıldı (-150 Puan)", "success");

      if (upperHintWord === puzzleData.target) {
        calculateAndFinish(newHistory, true, false);
      }
    } catch (error) {
      console.error("İpucu alınamadı:", error);
      showFeedback(String(error?.code || '').includes('failed-precondition') ? error.message : "İpucu alınırken bir hata oluştu.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEarnHint = async () => {
    setRewardLoading(true);
    const ok = await watchRewardedAd();
    setRewardLoading(false);
    setRewardSheetOpen(false);
    if (ok) {
      if (isUnlimited) addHints(1); else setBonusHints(b => b + 1);
      showFeedback("+1 ipucu kazandın! Ampule dokun.", "success");
    } else {
      showFeedback("Şu an reklam yok, biraz sonra tekrar dene.", "error");
    }
  };

  const handleKeyPress = useCallback(async (key) => {
    if (isGameOver || isLoading || winningRowAnimation) return;
    // Açık silme butonu: "Sil" dışındaki her tuş onu kapatır
    setPendingDelete(false);

    if (key === 'Enter') {
      if (currentGuess.length !== wordLength) {
        showFeedback(`${wordLength} harfli olmalı!`, "error");
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }
      const previousWord = history[history.length - 1]; 
      const currentWord = currentGuess;
      let diffCount = 0;
      for (let i = 0; i < previousWord.length; i++) {
        if (previousWord[i] !== currentWord[i]) diffCount++;
      }
      if (diffCount !== 1) {
        showFeedback("Sadece 1 harf değiştirebilirsiniz!", "error");
        markInvalid(); 
        return; 
      }
      if (!isOneLetterDifferent(previousWord, currentGuess)) {
        showFeedback("Geçersiz Kelime", "error");
        markInvalid();
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      // 🔥 İŞTE YENİ EKLENEN KISIM: KELİME TEKRARI KONTROLÜ 🔥
      if (history.includes(currentGuess)) {
        showFeedback("Bu kelimeyi zaten kullandın!", "error");
        markInvalid();
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      setIsLoading(true);
      const isValid = await checkTDK(currentGuess);
      setIsLoading(false);

      if (!isValid) {
        showFeedback("Geçersiz Kelime", "error");
        markInvalid();
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      // --- İŞTE O KUSURSUZ GECİKMELİ KISIM ---
      const newHistory = [...history, currentGuess];

      if (currentGuess === puzzleData.target) {
        playSuccessSound();
        setWinningRowAnimation(true);
        
        setTimeout(() => {
          setWinningRowAnimation(false);
          setHistory(newHistory); 
          setCurrentGuess("");
          calculateAndFinish(newHistory, true, true); // true = sesi tekrar çalma
        }, 1500);
      } else {
        playPopSound();
        hapticMove();
        setHistory(newHistory);
        setCurrentGuess("");

        if (newHistory.length - 1 >= maxMoves) {
          calculateAndFinish(newHistory, false);
        }
      }

    } else if (key === 'Delete' || key === 'Backspace') {
      if (currentGuess.length > 0) {
        setCurrentGuess(p => p.slice(0, -1));
      } else {
        if (history.length > 1) {
          const lastIdx = history.length - 1;
          if (!lockedIndices.includes(lastIdx)) {
            setPendingDelete(history.length);
          } else {
            showFeedback("Bu satır kilitli", "info");
            setRowAnimation('shake');
            setTimeout(() => setRowAnimation(null), 500);
          }
        }
      }
    } else if (currentGuess.length < wordLength && /^[A-ZÇĞİÖŞÜ]$/.test(key)) {
      hapticTap();
      setCurrentGuess(p => p + key);
    }
  }, [currentGuess, history, isGameOver, isLoading, winningRowAnimation, lockedIndices, maxMoves, timer, hintsLeft, bonusHints, wordLength]);

  useEffect(() => {
    const handler = (e) => {
      const trKey = e.key.toLocaleUpperCase('tr-TR');
      if (trKey === 'ENTER') handleKeyPress('Enter');
      else if (trKey === 'BACKSPACE') handleKeyPress('Backspace');
      else if ("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".includes(trKey)) handleKeyPress(trKey);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyPress]);

  const handleDictClick = (word) => {
    toggleModal('definition', word);
    updateStats('dictionary');
  };

  const buildCanvas = () => drawShareCard({
    puzzle: puzzleData,
    moves: history.length - 1,
    time: formatTime(timer),
    hints: hintsUsedCount,
    score: scoreDetails?.total || 0,
    stars: earnedStars,
    username,
    avatarIcon: userAvatar?.icon,
    url: SHARE_URL,
  });

  const shareCaption = () =>
    `🏆 EVOLVO — ${scoreDetails?.total || 0} Puan!
${puzzleData.start} → ${puzzleData.target} | ${history.length - 1} hamle

Sen de çözebilir misin? 👇
${shareLinks()}`;

  const openShare = () => {
    try { setSharePreview(buildCanvas().toDataURL('image/png')); } catch (e) { console.error(e); }
    setShareModalOpen(true);
  };

  const afterShare = (ok) => { if (ok) updateStats('share'); };

  const handleShareWhatsApp = async () => {
    try {
      const canvas = await buildCanvas();
      const caption = shareCaption();
      afterShare(await shareImage({ canvas, text: caption, fallbackUrl: `https://wa.me/?text=${encodeURIComponent(caption)}` }));
    } catch (e) { console.error(e); }
  };

  const handleShareTwitter = () => {
    const tweet = `🏆 EVOLVO'da ${scoreDetails?.total || 0} puan aldım!
${puzzleData.start} → ${puzzleData.target} | ${history.length - 1} hamle | ${formatTime(timer)}

Sen de dene 👇`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(PLAY_STORE_LIVE ? PLAY_STORE_URL : SHARE_URL)}`, '_blank');
    afterShare(true);
  };

  const handleShareCopyLink = () => {
    navigator.clipboard.writeText(shareCaption())
      .then(() => { showFeedback("Panoya kopyalandı!", "success"); afterShare(true); })
      .catch(() => showFeedback("Kopyalanamadı.", "error"));
  };

  const handleShareDownload = async () => {
    try {
      const canvas = await buildCanvas();
      await saveImage(canvas, `evolvo-${scoreDetails?.total || 0}puan.png`);
      if (!isNative()) showFeedback("Resim indirildi!", "success");
    } catch (e) { console.error(e); }
  };

  // Wordle düzeni (Türkçe): Türkçede olmayan Q, W, X yok. Her harf tuşu aynı genişlikte; kısa sıralar
  // yarım tuşluk boşlukla ortalanır, Enter solda ve silme sağda 1,5 tuş genişliğinde.
  const keyboardRows = [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Enter', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'Backspace'],
  ];

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden ${theme.bg} ${theme.text}`}>
      <SideMenu isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} toggleModal={toggleModal} settings={settings} theme={theme} user={user} onLogout={onLogout} onLogin={onLogin} />
      <DefinitionModal word={modalState.definition} onClose={() => toggleModal('definition', null)} theme={theme} />
      <LeaderboardModal isOpen={modalState.leaderboard} onClose={() => toggleModal('leaderboard', false)} theme={theme} colors={colors} userAvatar={userAvatar} username={username} leaderboardData={leaderboardData} onTabChange={fetchLeaderboard} defaultDifficulty={leaderboardDifficulty} onOpenFriends={() => { toggleModal('leaderboard', false); toggleModal('friends', true); }} />
      <HowToPlayModal isOpen={modalState.howToPlay} onClose={() => toggleModal('howToPlay', false)} theme={theme} colors={colors} />
      <CalendarModal isOpen={modalState.calendar} onClose={() => toggleModal('calendar', false)} theme={theme} colors={colors} onSelectDate={onLoadPastPuzzle} />
      <StatsModal isOpen={modalState.stats} onClose={() => toggleModal('stats', false)} theme={theme} colors={colors} stats={settings.stats || {}} />
      <AchievementsModal isOpen={modalState.achievements} onClose={() => toggleModal('achievements', false)} theme={theme} colors={colors} stats={settings.stats || {}} />
      <AvatarModal isOpen={modalState.avatar} onClose={() => toggleModal('avatar', false)} theme={theme} colors={colors} userAvatar={userAvatar} username={username} onSelect={(av) => { setUserAvatar(av); toggleModal('avatar', false); }} />

      <div className={`flex-none z-20 ${settings.darkMode ? 'bg-black' : 'bg-[#001f3f]'}`}>
         {/* ÜST MENÜ — tek satır: geri | ? ... EVOLVO ... istatistik | menü */}
         <header className={`h-[52px] px-2 flex items-center justify-between border-b ${theme.panelBorder} ${settings.darkMode ? 'bg-black/95' : 'bg-[#001f3f]/95'} backdrop-blur-md relative`}>
            <div className="flex items-center z-10">
               <button onClick={puzzleData.type === 'unlimited' ? onBackToMap : onBack} aria-label={puzzleData.type === 'unlimited' ? 'Haritaya dön' : 'Ana sayfaya dön'} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <ChevronLeft size={24} />
               </button>
               <button onClick={() => toggleModal('howToPlay', true)} aria-label="Nasıl oynanır" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <HelpCircle size={22} />
               </button>
            </div>

            <button onClick={onBack} aria-label="Ana sayfaya dön" className="absolute left-1/2 -translate-x-1/2 px-2 py-1 transform hover:scale-105 active:scale-95 transition-transform">
               <Logo colors={colors} />
            </button>

            <div className="flex items-center z-10">
               <button onClick={() => toggleModal('leaderboard', true)} aria-label="Sıralama" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Trophy size={22} className="text-yellow-400" />
               </button>
               <button onClick={() => setIsSideMenuOpen(true)} aria-label="Menü" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <Menu size={24} />
               </button>
            </div>
         </header>

         {/* BİLGİ ŞERİDİ — normalde hak/süre; bildirim gelince aynı yerde mesaj (hiçbir şeyi kaydırmaz/kapatmaz) */}
         <div
            role="status"
            aria-live="polite"
            className={`h-[30px] w-full flex items-center justify-center gap-1.5 px-3 text-[12px] font-bold transition-colors duration-200 ${
              message
                ? message.type === 'success' ? 'bg-green-600 text-white' : message.type === 'error' ? 'bg-red-600 text-white' : 'bg-sky-600 text-white'
                : 'bg-white/[0.03] border-b border-white/5'
            }`}
         >
            {message ? (
              <span key={message.text} className="flex items-center gap-1.5 truncate animate-in fade-in slide-in-from-top-1">
                {message.type === 'success' ? <CheckCircle2 size={14} className="flex-none" /> : <AlertCircle size={14} className="flex-none" />}
                <span className="truncate">{message.text}</span>
              </span>
            ) : (
              <span className="flex gap-6 font-black uppercase tracking-wider text-[11px]">
                <span><span className="opacity-50">Hak </span>{history.length - 1} / {maxMoves}</span>
                <span className="tabular-nums"><span className="opacity-50">Süre </span>{formatTime(timer)}</span>
              </span>
            )}
         </div>

         {/* SINIRSIZ MOD BİLGİ BARI + sonraki bölüm */}
         {puzzleData.type === 'unlimited' && (() => {
            const nextLevel = parseInt(puzzleData.level) + 1;
            const isNextUnlocked = offlineProgress[puzzleData.length] >= nextLevel;
            const isNextBoss = nextLevel % 10 === 0;
            const isNextCompleted = offlineProgress[puzzleData.length] > nextLevel;
            // Sonraki bölüm açıksa göster; ama ilk kez gelinen Boss bölümüyse gizle
            const showNext = isNextUnlocked && !(isNextBoss && !isNextCompleted);
            return (
              <div className="relative w-full bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-purple-200 text-center py-1.5 text-[11px] font-black tracking-widest uppercase border-b border-purple-500/20">
                 {puzzleData.length} HARFLİ • {puzzleData.level}. BÖLÜM
                 {showNext && (
                   <button onClick={() => onNextLevel(puzzleData.length, nextLevel)} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 flex items-center gap-0.5 text-[10px] text-white">
                     Sonraki <ChevronRightIcon size={13} />
                   </button>
                 )}
              </div>
            );
         })()}

         <div className="w-full max-w-md mx-auto px-4 pb-2 pt-2.5">
            <div className="flex items-center justify-between gap-2 text-center">
               <div className={`flex-1 ${theme.emptyCell} rounded-xl px-2 py-1.5`}>
                  <span className="text-[9px] opacity-50 uppercase tracking-widest block">Başlangıç</span>
                  <span className="text-lg font-black tracking-tight leading-tight">{puzzleData.start}</span>
               </div>
              {/* İpucu: kelimelerle aynı boyda, kompakt */}
              <div className="relative mx-1 flex-none">
                <button
                  onClick={handleHint}
                  disabled={hintsLeft <= 0 && !canEarnHint}
                  aria-label="İpucu"
                  className="p-2 bg-yellow-400 rounded-full hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-md"
                >
                  <Lightbulb size={18} className="text-black" fill="currentColor" />
                </button>
                {hintsLeft > 0 ? (
                  <span className="absolute -bottom-1 -right-2 bg-red-600 text-white text-[9px] font-black px-1 rounded-full border-2 border-[#0B1121] shadow-md z-10">
                    x{hintsLeft}
                  </span>
                ) : canEarnHint && !isGameOver && (
                  <span className="absolute -bottom-1 -right-2 bg-purple-600 text-white text-[9px] font-black px-1 rounded-full border-2 border-[#0B1121] shadow-md z-10">
                    +1
                  </span>
                )}
              </div>
               <div className={`flex-1 ${theme.emptyCell} rounded-xl px-2 py-1.5`}>
                  <span className="text-[9px] opacity-50 uppercase tracking-widest block">Bitiş</span>
                  <span className="text-lg font-black tracking-tight leading-tight">{puzzleData.target}</span>
               </div>
            </div>
         </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 w-full flex flex-col items-center relative">
         <div className="max-w-md w-full space-y-1.5 pb-60 pt-2 flex flex-col"> 
            {history.map((word, idx) => (
               <div key={idx} className="relative flex items-center justify-center w-fit mx-auto">
                  <div className="flex gap-1 sm:gap-1.5 z-10">
                     {word.split('').map((char, i) => (
                        <div key={i} 
                             className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center text-lg md:text-xl font-black rounded-lg border-2 ${idx === 0 ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-green-600 border-green-700 text-white shadow-sm'} ${idx === history.length - 1 && idx !== 0 ? 'animate-flip-letter' : ''}`}
                             style={idx === history.length - 1 && idx !== 0 ? { animationDelay: `${i * 150}ms` } : {}}
                        >
                           {char}
                        </div>
                     ))}
                  </div>
                  {showDeleteConfirm && idx === history.length - 1 && idx > 0 && (
                     <div className="absolute right-full mr-2 z-20 flex items-center h-full">
                        <button
                           data-delete-confirm
                           onClick={confirmRowDelete}
                           aria-label="Satırı sil"
                           title="Satırı sil"
                           className="p-2 rounded-lg bg-red-600 border-2 border-red-400 text-white shadow-lg animate-in zoom-in duration-150 active:scale-90"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                  )}
                  <div className="absolute left-full ml-2 z-20 flex items-center h-full">
                     <button onClick={() => handleDictClick(word)} className={`p-2 rounded-lg opacity-40 hover:opacity-100 transition-opacity ${theme.emptyCell}`} title="Anlamını Gör"><Book size={16} /></button>
                  </div>
               </div>
            ))}

            {!isGameOver && (
               <div className={`relative flex items-center justify-center w-fit mx-auto transition-transform ${rowAnimation === 'shake' ? 'animate-shake' : ''}`}>
                  <div className="flex gap-1 sm:gap-1.5 z-10">
                     {[...Array(wordLength)].map((_, i) => (
                        <div key={i} 
                          className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center text-lg md:text-xl font-black rounded-lg border-2 ${winningRowAnimation ? 'animate-flip-correct shadow-green-500/30 shadow-lg' : (rowAnimation === 'shake' ? colors.errorBg + ' ' + colors.errorBorder : 'bg-white/5 border-white/10 shadow-inner')}`}
                          style={winningRowAnimation ? { animationDelay: `${i * 150}ms` } : {}}
                        >
                           {isLoading && i === Math.floor(wordLength/2) ? <Loader2 className="animate-spin text-green-500" /> : (
                              currentGuess[i] ? currentGuess[i] : (i === currentGuess.length ? <span className="animate-pulse opacity-50 font-light text-2xl md:text-3xl">|</span> : "")
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {isGameOver && (
               <div className={`${theme.panel} border ${theme.panelBorder} rounded-3xl p-8 text-center mt-8 animate-in zoom-in duration-300 shadow-2xl relative`}>
                  <h2 className={`text-4xl font-black italic mb-6 ${isWon ? (settings.colorBlindMode ? 'text-blue-500' : 'text-green-500') : (settings.colorBlindMode ? 'text-orange-500' : 'text-red-500')}`}>
                     {isWon ? (puzzleData.type === 'custom' ? "MEYDAN OKUMA TAMAM!" : "EVRİM TAMAMLANDI!") : "KAYBETTİN!"}
                  </h2>
{isWon && (
  <div className="flex flex-col items-center w-full mt-4 animate-in zoom-in duration-500">

    {/* SKOR + YILDIZLAR */}
    <div className="text-center mb-5">
      <div className="flex justify-center gap-1.5 mb-3">
        {[1,2,3].map(s => (
          <Star key={s} size={28} className={s <= earnedStars ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]' : 'text-white/15'} />
        ))}
      </div>
      <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-emerald-500 leading-none drop-shadow-lg">
        {scoreDetails?.total || 0}
      </span>
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mt-1">PUAN</p>
    </div>

    {/* PAYLAŞIM BUTONU */}
    <button
      onClick={openShare}
      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 py-4 rounded-xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
    >
      <Share2 size={20} /> SKORUNU PAYLAŞ
    </button>
    <button onClick={() => toggleModal('friends', 'invite')} className="w-full mt-2 py-2 text-[13px] font-bold text-pink-300 flex items-center justify-center gap-1.5 active:scale-95">
      🎁 Arkadaşını davet et, ikiniz de +3 ipucu kazanın
    </button>
    {puzzleData.type === 'daily' && (
      <button onClick={() => toggleModal('stats', true)} className="w-full mt-2.5 py-3 rounded-xl font-bold text-sm bg-white/10 border border-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all">
        <BarChart2 size={18} /> İSTATİSTİKLER
      </button>
    )}

  </div>
)}
                  
                  <div className="text-sm opacity-50 mt-4 font-medium leading-relaxed">
                     {puzzleData.type === 'daily' ? "Yarın yeni kelime zinciri için tekrar gel!" : "Arkadaşlarınla paylaşarak onlara meydan oku!"}
                  </div>
               </div>
            )}
         </div>
      </main>

      {!isGameOver && (
        <div data-game-keyboard className={`fixed bottom-0 left-0 w-full ${settings.darkMode ? 'bg-black' : 'bg-[#001f3f]'} p-1 pb-2 border-t ${theme.panelBorder} z-30`}>
           <div className="max-w-lg mx-auto space-y-[6px] px-1">
              {keyboardRows.map((row, i) => (
                 <div key={i} className="flex justify-center gap-[5px]">
                   {i === 0 && <div className="flex-[0.5]" />}
                   {row.map(key => {
                     const base = 'h-[54px] rounded-[5px] font-bold flex items-center justify-center select-none active:scale-95 transition-transform';
                     if (key === 'Enter') {
                       return <button key={key} onClick={() => handleKeyPress('Enter')} className={`${base} flex-[1.5] text-[11px] tracking-wide ${colors.btnPrimary}`}>ENTER</button>;
                     }
                     if (key === 'Backspace') {
                       return <button key={key} aria-label="Sil" onClick={() => handleKeyPress('Backspace')} className={`${base} flex-[1.5] ${theme.key} ${theme.keyText} hover:brightness-110`}><Delete size={22} /></button>;
                     }
                     return (
                       <button key={key} onClick={() => handleKeyPress(key)} className={`${base} flex-1 text-[17px] ${theme.key} ${theme.keyText} hover:brightness-110`}>
                         {key}
                       </button>
                     );
                   })}
                   {i === 0 && <div className="flex-[0.5]" />}
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* ÖDÜLLÜ REKLAM: +1 İPUCU */}
      {rewardSheetOpen && (
        <div className="fixed inset-0 z-[350] flex items-end justify-center bg-black/75 backdrop-blur-sm" onClick={() => !rewardLoading && setRewardSheetOpen(false)}>
          <div className="w-full max-w-md bg-[#0d1829] rounded-t-3xl p-6 pb-10 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-yellow-400 flex items-center justify-center"><Lightbulb size={28} className="text-black" fill="currentColor" /></div>
            <h3 className="font-black text-xl uppercase italic mb-1">İpuçların Bitti</h3>
            <p className="text-sm opacity-60 mb-6">
              {isUnlimited
                ? 'Kısa bir reklam izleyerek +1 ipucu kazan ya da mağazadan ipucu paketi al.'
                : 'Kısa bir reklam izle, bu bulmaca için +1 ipucu kazan.'} (Her ipucu −150 puan.)
            </p>
            {canEarnHint && (
              <button disabled={rewardLoading} onClick={handleEarnHint} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60">
                {rewardLoading ? <Loader2 className="animate-spin" /> : '🎬 İZLE, +1 İPUCU'}
              </button>
            )}
            {isUnlimited && starterOfferActive() && (
              <StarterOfferCard className="mt-5 mb-1" disabled={rewardLoading} onResult={(r) => {
                if (r === 'ok') { setRewardSheetOpen(false); showFeedback('+25 ipucu eklendi, reklamlar kaldırıldı! 💛', 'success'); }
                else if (r === 'pending') showFeedback('Ödeme onay bekliyor; onaylanınca eklenecek.', 'info');
                else if (r === 'error') showFeedback('Satın alma tamamlanamadı.', 'error');
              }} />
            )}
            {isUnlimited && isNative() && (
              <button disabled={rewardLoading} onClick={() => { setRewardSheetOpen(false); toggleModal('store', true); }} className="w-full mt-2.5 py-3.5 rounded-xl font-black text-base bg-yellow-400 text-black flex items-center justify-center gap-2 active:scale-95">
                💡 İPUCU PAKETİ AL
              </button>
            )}
            <button disabled={rewardLoading} onClick={() => setRewardSheetOpen(false)} className="w-full py-3 mt-2 text-sm font-bold text-white/50">Vazgeç</button>
          </div>
        </div>
      )}

      {/* PAYLAŞIM BOTTOM SHEET */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-[350] flex items-end justify-center bg-black/75 backdrop-blur-sm"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#0d1829] rounded-t-3xl p-6 pb-10 border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom-6 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Başlık */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-black text-lg uppercase tracking-widest text-white flex items-center gap-2">
                <Share2 size={18} className="text-purple-400" /> Paylaş
              </h3>
              <button onClick={() => setShareModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Kart Önizleme: paylaşılacak görselin birebir kendisi */}
            {sharePreview && (
              <img src={sharePreview} alt="Paylaşılacak skor kartı" className="w-full max-w-[300px] mx-auto rounded-2xl mb-5 border border-white/10 shadow-xl" />
            )}

            {/* Paylaşım Butonları */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm border transition-all active:scale-95"
                style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366', borderColor: 'rgba(37,211,102,0.3)' }}
              >
                <MessageCircle size={18} /> WhatsApp
              </button>
              <button
                onClick={handleShareTwitter}
                className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm bg-black/40 text-white border border-white/15 hover:bg-white/10 transition-all active:scale-95"
              >
                <Twitter size={18} /> Twitter / X
              </button>
              <button
                onClick={handleShareCopyLink}
                className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm bg-white/5 text-white/75 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
              >
                <Copy size={18} /> Link Kopyala
              </button>
              <button
                onClick={handleShareDownload}
                className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm bg-white/5 text-white/75 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
              >
                <Download size={18} /> İndir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
