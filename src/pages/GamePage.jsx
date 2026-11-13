import { useState, useEffect, useCallback, useRef } from 'react';
import { getApp } from 'firebase/app';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { getFunctions, httpsCallable } from 'firebase/functions';
import html2canvas from 'html2canvas';
import { Menu, X, Star, Lightbulb, Delete, CheckCircle2, AlertCircle, Loader2, Book, ChevronLeft, ChevronRight as ChevronRightIcon, Copy, Share2, Twitter, MessageCircle, Download } from 'lucide-react';
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
import { watchRewardedAd, adsRemoved } from '../lib/monetization';
import { PLAY_STORE_LIVE, PLAY_STORE_URL, WEB_URL, MAX_BONUS_HINTS } from '../data/constants';
import { dayKey } from '../lib/progress';

export const GamePage = ({ onBack,onBackToMap,onUnlimitedWin,onNextLevel,username,offlineProgress, userAvatar, setUserAvatar, theme, colors, toggleModal, modalState, settings, updateStats, puzzleData, onStartCustomGame, onLoadPastPuzzle, user, onLogout, message, showFeedback, onLogin, checkTDK, leaderboardData, fetchLeaderboard }) => {
  const [history, setHistory] = useState([puzzleData.start]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [winningRowAnimation, setWinningRowAnimation] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const shareCardRef = useRef(null);
  // "Keskin Nişancı" başarımı için: bu oyunda girilen geçersiz kelime sayısı
  const invalidAttemptsRef = useRef(0);
  const [hintsLeft, setHintsLeft] = useState(3);
  // Reklam izleyerek kazanılan ek ipuçları (ceza hesabı için kullanılan toplam = 3 + bonus - kalan)
  const [bonusHints, setBonusHints] = useState(0);
  const [rewardSheetOpen, setRewardSheetOpen] = useState(false);
  const [rewardLoading, setRewardLoading] = useState(false);
  const hintsUsedCount = 3 + bonusHints - hintsLeft;
  const canEarnHint = isNative() && puzzleData.type !== 'custom' && bonusHints < MAX_BONUS_HINTS;
  const [lockedIndices, setLockedIndices] = useState([0]); 
  const [rowAnimation, setRowAnimation] = useState(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [scoreDetails, setScoreDetails] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const earnedStars = !scoreDetails?.total ? 0 : scoreDetails.total >= 800 ? 3 : scoreDetails.total >= 500 ? 2 : 1;
  
  const playSuccessSound = () => { try { new Audio('/success.mp3').play().catch(e=>console.log(e)); } catch(e){} };
  const playErrorSound = () => { try { new Audio('/error.mp3').play().catch(e=>console.log(e)); } catch(e){} };
  const markInvalid = () => {
    invalidAttemptsRef.current += 1;
    playErrorSound();
    hapticError();
  };
  const playPopSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch(e) {}
  };
  
  const wordLength = puzzleData.start.length;
  const maxMoves = puzzleData.maxMoves || (puzzleData.optimalSteps ? puzzleData.optimalSteps + 5 : 15);
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  const [timer, setTimer] = useState(() => {
    const savedTime = localStorage.getItem(`evolvo_timer_${puzzleData.date}`);
    return savedTime ? parseInt(savedTime, 10) : 0;
  });

  useEffect(() => {
    if (puzzleData.type === 'custom' || isGameOver) return;
    const interval = setInterval(() => {
      setTimer(prev => {
        const nextTime = prev + 1;
        localStorage.setItem(`evolvo_timer_${puzzleData.date}`, nextTime);
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isGameOver, puzzleData.type, puzzleData.date]);

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
    const currentId = puzzleData?.type === 'unlimited'
        ? `unlimited_${puzzleData.length}_${puzzleData.level}`
        : (puzzleData?.date || new Date().toLocaleDateString('tr-TR'));

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
    } else if (!playStatus && savedHistoryStr && puzzleData?.type === 'unlimited') {
      // Sınırsız modda yarım kalan oyun — history'yi restore et, devam etsin
      try {
        const parsedHistory = JSON.parse(savedHistoryStr);
        if (parsedHistory[0] === puzzleData?.start && parsedHistory.length > 1) {
          setHistory(parsedHistory);
        }
      } catch (_) {}
    }
  }, [puzzleData]);
  // skipSound parametresi eklendi (ikinci kez çalmaması için)
  const calculateAndFinish = async (finalHistory, didWin, skipSound = false) => {
    localStorage.removeItem(`evolvo_timer_${puzzleData.date}`);
    setIsGameOver(true);
    setIsWon(didWin);
    
    // 1. DÜZELTME: Değişkenleri ve hesaplamaları EN ÜSTE aldık ki kod patlamasın.
    let score = 0;
    const hintsUsed = hintsUsedCount;

    if (didWin) {
        const stepsUsed = finalHistory.length - 1;
        const optimal = puzzleData.optimalSteps || Math.max(1, stepsUsed - 2); 
        const diff = stepsUsed - optimal;

        let wordScore = 800;
        if (diff <= 0) wordScore = 1000;
        else if (diff === 1) wordScore = 900;

        const timeScore = Math.max(0, 1000 - (timer * 0.6));
        const weightedScore = (wordScore * 0.6) + (timeScore * 0.4);
        const penalty = hintsUsed * 100;
        score = Math.max(0, Math.floor(weightedScore - penalty));
        
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
                 puzzleId: puzzleData.date,
                 dateString: puzzleData.date,
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

    // Sınırsız mod için restore key'i useEffect ile tutarlı: unlimited_X_Y
    const saveKey = puzzleData?.type === 'unlimited'
      ? `unlimited_${puzzleData.length}_${puzzleData.level}`
      : (puzzleData?.date || new Date().toLocaleDateString('tr-TR'));

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
      invalidAttempts: invalidAttemptsRef.current,
      isTodaysDaily: puzzleData.type === 'daily' && puzzleData.date === dayKey(),
      words: finalHistory.slice(1),
    });
  };

const handleHint = async (e) => {
    if (e && e.currentTarget) e.currentTarget.blur();
    if (puzzleData.type === 'custom') {
      showFeedback("Bu modda ipucu kapalıdır.", "info");
      return;
    }
    if (isGameOver) return;
    if (hintsLeft <= 0) {
      if (canEarnHint) setRewardSheetOpen(true);
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
        setHintsLeft(prev => prev - 1);
        setLockedIndices(prev => {
          const filtered = prev.filter(idx => idx <= backtrackIdx);
          return [...filtered, backtrackIdx + 1];
        });
        showFeedback("İpucu Kullanıldı (-150 Puan)", "success");
        if (nextWord !== puzzleData.target) {
          localStorage.setItem(`evolvo_history_unlimited_${puzzleData.length}_${puzzleData.level}`, JSON.stringify(newHistory));
        }
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
        dateString: puzzleData.date,
        wordHistory: guvenliGecmis 
      });
      
      const { hintWord, keepCount } = result.data;
      const upperHintWord = hintWord.toLocaleUpperCase('tr-TR');
      const newHistory = [...history.slice(0, keepCount + 1), upperHintWord];
      
      setHistory(newHistory);
      setCurrentGuess("");
      setHintsLeft(prev => prev - 1);
      setLockedIndices(prev => [...prev, newHistory.length - 1]);
      showFeedback("İpucu Kullanıldı (-150 Puan)", "success");

      if (upperHintWord === puzzleData.target) {
        calculateAndFinish(newHistory, true, false);
      }
    } catch (error) {
      console.error("İpucu alınamadı:", error);
      showFeedback("İpucu alınırken bir hata oluştu.", "error");
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
      setBonusHints(b => b + 1);
      setHintsLeft(h => h + 1);
      showFeedback("+1 ipucu kazandın! Ampule dokun.", "success");
    } else {
      showFeedback("Şu an reklam yok, biraz sonra tekrar dene.", "error");
    }
  };

  const handleKeyPress = useCallback(async (key) => {
    if (isGameOver || isLoading || winningRowAnimation) return;

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

        // Sınırsız modda yarım kalan oyunu kurtarmak için her hamlede history'yi kaydet
        if (puzzleData?.type === 'unlimited') {
          localStorage.setItem(`evolvo_history_unlimited_${puzzleData.length}_${puzzleData.level}`, JSON.stringify(newHistory));
        }

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
            setHistory(p => p.slice(0, -1));
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

  const buildCanvas = () =>
    html2canvas(shareCardRef.current, { backgroundColor: '#070e1c', scale: 2, logging: false });

  const shareCaption = () =>
    `🏆 EVOLVO — ${scoreDetails?.total || 0} Puan!
${puzzleData.start} → ${puzzleData.target} | ${history.length - 1} hamle

Sen de çözebilir misin? 👇
${shareLinks()}`;

  const afterShare = (ok) => { if (ok) updateStats('share'); };

  const handleShareWhatsApp = async () => {
    if (!shareCardRef.current) return;
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
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(PLAY_STORE_LIVE && isNative() ? PLAY_STORE_URL : WEB_URL)}`, '_blank');
    afterShare(true);
  };

  const handleShareCopyLink = () => {
    navigator.clipboard.writeText(shareCaption())
      .then(() => { showFeedback("Panoya kopyalandı!", "success"); afterShare(true); })
      .catch(() => showFeedback("Kopyalanamadı.", "error"));
  };

  const handleShareDownload = async () => {
    if (!shareCardRef.current) return;
    try {
      const canvas = await buildCanvas();
      await saveImage(canvas, `evolvo-${scoreDetails?.total || 0}puan.png`);
      if (!isNative()) showFeedback("Resim indirildi!", "success");
    } catch (e) { console.error(e); }
  };

  const keyboardRows = [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'Enter']
  ];

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden ${theme.bg} ${theme.text}`}>
      <SideMenu isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} toggleModal={toggleModal} settings={settings} theme={theme} user={user} onLogout={onLogout} onLogin={onLogin} />
      <DefinitionModal word={modalState.definition} onClose={() => toggleModal('definition', null)} theme={theme} />
      <LeaderboardModal isOpen={modalState.leaderboard} onClose={() => toggleModal('leaderboard', false)} theme={theme} colors={colors} userAvatar={userAvatar} username={username} leaderboardData={leaderboardData} onTabChange={fetchLeaderboard} />
      <HowToPlayModal isOpen={modalState.howToPlay} onClose={() => toggleModal('howToPlay', false)} theme={theme} colors={colors} />
      <CalendarModal isOpen={modalState.calendar} onClose={() => toggleModal('calendar', false)} theme={theme} colors={colors} />
      <StatsModal isOpen={modalState.stats} onClose={() => toggleModal('stats', false)} theme={theme} colors={colors} stats={settings.stats || {}} />
      <AchievementsModal isOpen={modalState.achievements} onClose={() => toggleModal('achievements', false)} theme={theme} colors={colors} stats={settings.stats || {}} />
      <AvatarModal isOpen={modalState.avatar} onClose={() => toggleModal('avatar', false)} theme={theme} colors={colors} userAvatar={userAvatar} username={username} onSelect={(av) => { setUserAvatar(av); toggleModal('avatar', false); }} />

      <div className={`flex-none z-20 ${settings.darkMode ? 'bg-black' : 'bg-[#001f3f]'}`}>
         <header className={`px-4 py-3 flex items-start justify-between border-b ${theme.panelBorder} ${settings.darkMode ? 'bg-black/95' : 'bg-[#001f3f]/95'} backdrop-blur-md relative`}>
            
            {/* SOL KISIM: Avatar Paneli ve Altında Geri Tuşu */}
            <div className="flex flex-col items-start gap-2 z-10 w-28 sm:w-32">
                <div onClick={() => toggleModal('avatar', true)} className={`flex items-center gap-1 sm:gap-2 ${settings.darkMode ? 'bg-gray-800' : 'bg-white/10'} px-2 sm:px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/20 transition-colors w-fit border border-white/5`}>
                   <div className="text-lg sm:text-xl flex items-center justify-center flex-shrink-0">{userAvatar.icon}</div>
                   <span className="font-bold text-[10px] sm:text-xs truncate max-w-[60px] sm:max-w-[100px]">{username}</span>
                </div>

                {puzzleData.type === 'unlimited' ? (
                    <button onClick={onBackToMap} className="p-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 w-fit border border-white/10 shadow-sm">
                        <ChevronLeft size={14} className="text-white"/>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">Harita</span>
                    </button>
                ) : (
                    <button onClick={onBack} className="p-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1.5 w-fit border border-white/10 shadow-sm">
                        <ChevronLeft size={14} className="text-white"/>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/80">Ana Sayfa</span>
                    </button>
                )}
            </div>

            {/* ORTA KISIM: Logo (Tam Ortalanmış) */}
            <div onClick={onBack} className="cursor-pointer transform hover:scale-105 transition-transform absolute left-1/2 -translate-x-1/2 top-3 z-10">
               <Logo colors={colors} />
            </div>
            
            {/* SAĞ KISIM: Menü ve Altında Sonraki Bölüm Tuşu */}
            <div className="flex flex-col items-end gap-2 z-10 w-28 sm:w-32">
                <button onClick={() => setIsSideMenuOpen(true)} className={`p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors`}>
                   <Menu size={24} />
                </button>

                {/* AKILLI SONRAKİ BÖLÜM OKU */}
                {puzzleData.type === 'unlimited' && (
                    (() => {
                        const nextLevel = parseInt(puzzleData.level) + 1;
                        // Sonraki bölümün kilidi açılmış mı?
                        const isNextUnlocked = offlineProgress[puzzleData.length] >= nextLevel;
                        // Sonraki bölüm bir Boss bölümü mü? (10, 20, 30...)
                        const isNextBoss = nextLevel % 10 === 0;
                        // Sonraki bölüm DAHA ÖNCE tamamlanmış mı?
                        const isNextCompleted = offlineProgress[puzzleData.length] > nextLevel;
                        
                        // KURAL: Eğer sonraki bölüm açıksa GÖSTER.
                        // AMA sonraki bölüm Boss ise ve daha TAMAMLANMAMIŞSA (ilk defa geliniyorsa) GİZLE.
                        const showNext = isNextUnlocked && !(isNextBoss && !isNextCompleted);

                        if (!showNext) return null;

                        return (
                            <button 
                                onClick={() => onNextLevel(puzzleData.length, nextLevel)} 
                                className="p-1.5 px-2 bg-gradient-to-r from-purple-600/50 to-blue-600/50 hover:from-purple-500 hover:to-blue-500 rounded-lg transition-colors flex items-center gap-1.5 w-fit border border-white/20 shadow-md animate-in fade-in zoom-in"
                            >
                                <span className="text-[9px] font-bold uppercase tracking-widest text-white">Sonraki</span>
                                <ChevronRightIcon size={14} className="text-white"/>
                            </button>
                        );
                    })()
                )}
            </div>
         </header>

         <div className="relative h-10 w-full flex items-center justify-center"> 
            {message && (
                <div className={`absolute top-1 z-30 px-4 py-2 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center gap-2 font-bold text-xs border ${message.type === 'success' ? colors.success : colors.error}`}>
                  {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {message.text}
                </div>
            )}
         </div>

         <div className={`py-1 flex justify-center gap-12 font-black text-xs uppercase tracking-tighter ${theme.bg}`}>
            <div className="text-center"><p className="opacity-50 mb-0.5">Hak</p><span className="text-lg">{history.length - 1} / {maxMoves}</span></div>
            <div className="text-center"><p className="opacity-50 mb-0.5">Süre</p><span className="text-lg font-variant-numeric">{formatTime(timer)}</span></div>
         </div>
         {/* SINIRSIZ MOD BİLGİ BARI */}
         {puzzleData.type === 'unlimited' && (
            <div className="w-full bg-gradient-to-r from-purple-900/60 to-indigo-900/60 text-purple-200 text-center py-1.5 text-[11px] font-black tracking-widest uppercase border-y border-purple-500/20 shadow-inner">
               {puzzleData.length} HARFLİ • {puzzleData.level}. BÖLÜM
            </div>
         )}
         <div className="w-full max-w-md mx-auto px-4 pb-4 pt-1">
            <div className="flex items-center justify-between gap-2 text-center">
               <div className={`flex-1 ${theme.emptyCell} rounded-xl p-2`}>
                  <span className="text-[9px] opacity-50 uppercase tracking-widest block">Başlangıç</span>
                  <span className="text-lg font-black tracking-tight">{puzzleData.start}</span>
               </div>
               {/* Orijinal tasarımlı İpucu Butonu ve Kırmızı Rozet */}
              <div className="flex flex-col items-center justify-center mx-4">
                <div className="relative">
                  <button 
                    onClick={handleHint} 
                    disabled={hintsLeft <= 0 && !canEarnHint} 
                    className="p-3 bg-yellow-400 rounded-full hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                  >
                    <Lightbulb size={28} className="text-black" fill="currentColor" />
                  </button>
                  
                  {/* Kırmızı x3 Rozeti (Sadece hak varsa görünür) */}
                  {hintsLeft > 0 ? (
                    <span className="absolute -bottom-1 -right-2 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#0B1121] shadow-md z-10">
                      x{hintsLeft}
                    </span>
                  ) : canEarnHint && !isGameOver && (
                    <span className="absolute -bottom-1 -right-2 bg-purple-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#0B1121] shadow-md z-10">
                      +1
                    </span>
                  )}
                </div>
              </div>
               <div className={`flex-1 ${theme.emptyCell} rounded-xl p-2`}>
                  <span className="text-[9px] opacity-50 uppercase tracking-widest block">Bitiş</span>
                  <span className="text-lg font-black tracking-tight">{puzzleData.target}</span>
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
      onClick={() => setShareModalOpen(true)}
      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 py-4 rounded-xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
    >
      <Share2 size={20} /> SKORUNU PAYLAŞ
    </button>

    {/* GİZLİ SKOR KARTI — html2canvas hedefi, tüm inline style */}
    <div style={{ position: 'fixed', left: -9999, top: 0 }}>
      <div ref={shareCardRef} style={{ width: 420, background: '#070e1c', padding: '32px 28px 28px', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', position: 'relative', fontFamily: 'sans-serif' }}>

        {/* BG gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(37,99,235,0.22) 0%,#070e1c 55%,rgba(16,185,129,0.18) 100%)' }} />
        <div style={{ position: 'absolute', top: -60, left: -60, width: 220, height: 220, background: 'rgba(59,130,246,0.28)', borderRadius: '50%', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -60, width: 220, height: 220, background: 'rgba(16,185,129,0.18)', borderRadius: '50%', filter: 'blur(70px)' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, position: 'relative', zIndex: 1 }}>
          {['E','V','O','L','V','O'].map((l, i) => (
            <div key={i} style={{ width: 40, height: 40, lineHeight: '40px', textAlign: 'center', fontWeight: 900, fontSize: 19, color: 'white', borderRadius: 9, margin: '0 3px', background: i === 2 ? '#dc2626' : i === 5 ? '#16a34a' : 'rgba(255,255,255,0.07)', border: i === 2 || i === 5 ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
              {l}
            </div>
          ))}
        </div>

        {/* Mode */}
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 22, position: 'relative', zIndex: 1 }}>
          {puzzleData?.type === 'unlimited' ? `${puzzleData.length} Harfli · Bölüm ${puzzleData.level}` : 'Günlük Meydan Okuma'}
        </div>

        {/* Word pair boxes */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {puzzleData.start.split('').map((c, i) => (
              <div key={i} style={{ width: 44, height: 44, lineHeight: '44px', textAlign: 'center', background: '#2563eb', borderRadius: 9, fontWeight: 900, fontSize: 19, color: 'white' }}>{c}</div>
            ))}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 24, margin: '0 14px', fontWeight: 300, lineHeight: '44px' }}>→</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {puzzleData.target.split('').map((c, i) => (
              <div key={i} style={{ width: 44, height: 44, lineHeight: '44px', textAlign: 'center', background: '#16a34a', borderRadius: 9, fontWeight: 900, fontSize: 19, color: 'white' }}>{c}</div>
            ))}
          </div>
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10, position: 'relative', zIndex: 1 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ fontSize: 26, color: s <= earnedStars ? '#facc15' : 'rgba(255,255,255,0.12)', textShadow: s <= earnedStars ? '0 0 12px rgba(250,204,21,0.6)' : 'none' }}>★</div>
          ))}
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', marginBottom: 22, position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 84, fontWeight: 900, color: '#4ade80', lineHeight: 1, textShadow: '0 0 40px rgba(74,222,128,0.45)' }}>
            {scoreDetails?.total || 0}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 5 }}>PUAN</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', width: '100%', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16, marginBottom: 18, position: 'relative', zIndex: 1 }}>
          {[{ label: 'HAMLE', value: history.length - 1 }, { label: 'SÜRE', value: formatTime(timer) }, { label: 'İPUCU', value: hintsUsedCount }].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: 'white', fontSize: 24, fontWeight: 900 }}>{s.value}</div>
              <div style={{ color: 'rgba(255,255,255,0.28)', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Player */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 22 }}>{userAvatar.icon}</span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: 700 }}>{username}</span>
        </div>

        {/* URL */}
        <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', position: 'relative', zIndex: 1, fontWeight: 600 }}>
          tr.evolvogame.com
        </div>
      </div>
    </div>

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
        <div className={`fixed bottom-0 left-0 w-full ${settings.darkMode ? 'bg-black' : 'bg-[#001f3f]'} p-1 pb-2 border-t ${theme.panelBorder} z-30`}>
           <div className="max-w-xl mx-auto space-y-1">
              {keyboardRows.map((row, i) => (
                 <div key={i} className="flex justify-center gap-1">
                   {row.map(key => (
                     <button key={key} onClick={() => handleKeyPress(key === 'Enter' ? 'Enter' : key === 'Backspace' ? 'Backspace' : key)} className={`h-11 md:h-12 flex-1 rounded-md font-bold text-sm md:text-base transition-colors shadow-sm ${key === 'Enter' ? `px-2 md:px-3 ${colors.btnPrimary}` : key === 'Ö' || key === 'Ç' ? 'flex-[0.8]' : ''} ${key !== 'Enter' ? `${theme.key} ${theme.keyText} hover:brightness-110 active:scale-95` : ''}`}>{key}</button>
                  ))}
                  {i === 2 && (
                     <button key="backspace" onClick={() => handleKeyPress('Backspace')} className="h-11 md:h-12 px-3 md:px-4 bg-red-900/50 text-red-100 rounded-md flex items-center justify-center hover:bg-red-900/70 transition-colors active:scale-95 shadow-sm"><Delete size={20} /></button>
                  )}
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
            <p className="text-sm opacity-60 mb-6">{adsRemoved() ? 'Reklamsız sürüm sende — ek ipucun hazır.' : 'Kısa bir reklam izle, +1 ipucu kazan.'} (İpucu yine −150 puan.)</p>
            <button disabled={rewardLoading} onClick={handleEarnHint} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60">
              {rewardLoading ? <Loader2 className="animate-spin" /> : (adsRemoved() ? '+1 İPUCU AL' : '🎬 İZLE, +1 İPUCU')}
            </button>
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

            {/* Kart Önizleme */}
            <div className="w-full bg-[#070e1c] rounded-2xl p-5 mb-5 border border-white/8 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-emerald-900/15 pointer-events-none" />

              {/* Logo + mod */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-0.5">
                  {['E','V','O','L','V','O'].map((l, i) => (
                    <div key={i} className={`w-6 h-6 flex items-center justify-center font-black text-xs text-white rounded-md ${i === 2 ? 'bg-red-600' : i === 5 ? 'bg-green-500' : ''}`}>{l}</div>
                  ))}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/35">
                  {puzzleData?.type === 'unlimited' ? `${puzzleData.length} Hrf · Blm ${puzzleData.level}` : 'Günlük'}
                </span>
              </div>

              {/* Kelime kutuları */}
              <div className="flex items-center justify-center gap-2 mb-4 relative z-10">
                <div className="flex gap-0.5">
                  {puzzleData.start.split('').map((c, i) => (
                    <div key={i} className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-black text-white text-xs">{c}</div>
                  ))}
                </div>
                <ChevronRightIcon size={14} className="text-white/25 flex-shrink-0" />
                <div className="flex gap-0.5">
                  {puzzleData.target.split('').map((c, i) => (
                    <div key={i} className="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center font-black text-white text-xs">{c}</div>
                  ))}
                </div>
              </div>

              {/* Yıldız + puan */}
              <div className="text-center mb-3 relative z-10">
                <div className="flex justify-center gap-1 mb-1.5">
                  {[1,2,3].map(s => (
                    <Star key={s} size={16} className={s <= earnedStars ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'} />
                  ))}
                </div>
                <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-green-300 to-emerald-500 leading-none">
                  {scoreDetails?.total || 0}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-white/35 mt-0.5">PUAN</div>
              </div>

              {/* İstatistikler */}
              <div className="flex justify-around border-t border-white/8 pt-3 relative z-10">
                {[
                  { label: 'HAMLE', value: history.length - 1 },
                  { label: 'SÜRE', value: formatTime(timer) },
                  { label: 'İPUCU', value: hintsUsedCount }
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-white font-black text-base">{s.value}</div>
                    <div className="text-[8px] uppercase tracking-widest text-white/30 font-bold">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* URL */}
              <div className="text-center mt-3 text-[9px] tracking-[0.3em] uppercase text-white/20 font-medium relative z-10">
                tr.evolvogame.com
              </div>
            </div>

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
