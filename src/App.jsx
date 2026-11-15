import './styles/injectStyles';
import { useState, useEffect, useCallback } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Play, Trophy, Menu, X, Star, ShoppingBag, CheckCircle2, AlertCircle, Loader2, Infinity as InfinityIcon } from 'lucide-react';
import { AVATARS, generateRandomName, THEMES, COLOR_BLIND_THEME, GOOGLE_WEB_CLIENT_ID } from './data/constants';
import { app } from './firebase';
import { MountainMini } from './components/MountainMini';
import { SplashScreen } from './components/SplashScreen';
import { GamePage } from './pages/GamePage';
import { UnlimitedMenuPage } from './pages/UnlimitedMenuPage';
import { ChallengePage } from './pages/ChallengePage';
import { AchievementsModal } from './components/modals/AchievementsModal';
import { AvatarModal } from './components/modals/AvatarModal';
import { StatsModal } from './components/modals/StatsModal';
import { SideMenu } from './components/modals/SideMenu';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { HowToPlayModal } from './components/modals/HowToPlayModal';
import { UniqueNameModal } from './components/modals/UniqueNameModal';
import { CalendarModal } from './components/modals/CalendarModal';
import { DefinitionModal } from './components/modals/DefinitionModal';
import { PrivacyModal } from './components/modals/PrivacyModal';
import { ContactModal } from './components/modals/ContactModal';
import { Logo } from './components/Logo';
import { AchievementToast } from './components/AchievementToast';
import { useProgress } from './lib/useProgress';
import { loadStats, dayKey } from './lib/progress';
import { FriendsModal } from './components/modals/FriendsModal';
import { takeFriendCodeFromUrl } from './lib/friends';
import { StoreModal } from './components/modals/StoreModal';
import { recordUnlimitedSolved } from './lib/hints';
import { initMonetization, adsRemoved, needsPrivacyOptions, showPrivacyOptions, maybeShowInterstitial } from './lib/monetization';
import {
  scheduleReminders, maybeAskForReview, shouldAskNotifications, notificationsEnabled,
  enableNotifications, disableNotifications,
} from './lib/native';

const readPref = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writePref = (k, v) => { try { localStorage.setItem(k, v); } catch { /* depolama kapalı */ } };

const App = () => {
  const [showSplash, setShowSplash] = useState(() => Capacitor.isNativePlatform());
  const [message, setMessage] = useState(null);
  const showFeedback = (msg, type = "info") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 2500);
  };
  const [currentPage, setCurrentPage] = useState('landing');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [username, setUsername] = useState(() => {
    try {
      const savedName = localStorage.getItem('evolvo_guest_name');
      if (savedName) return savedName; 
      
      const newName = generateRandomName(); 
      localStorage.setItem('evolvo_guest_name', newName); 
      return newName;
    } catch(e) {
      return generateRandomName();
    }
  });
  const isNative = Capacitor.isNativePlatform();
  const [offlineProgress, setOfflineProgress] = useState(() => {
    try {
      const saved = localStorage.getItem('evolvo_offline_progress');
      return saved ? JSON.parse(saved) : { 4: 1, 5: 1, 6: 1 };
    } catch(e) {
      return { 4: 1, 5: 1, 6: 1 };
    }
  });

  // Haritadaki puanlarımızı (rozetlerimizi) tutan state
  const [offlineScores, setOfflineScores] = useState(() => {
    try {
      const saved = localStorage.getItem('evolvo_offline_scores');
      return saved ? JSON.parse(saved) : { 4: {}, 5: {}, 6: {} };
    } catch(e) {
      return { 4: {}, 5: {}, 6: {} };
    }
  });

  const handleUnlimitedWin = (length, level, finalScore, finalSteps, finalTime) => {
    const currentScores = JSON.parse(localStorage.getItem('evolvo_offline_scores') || '{}');
    if (!currentScores[length]) currentScores[length] = {};

    // İlk tamamlamada skoru kaydet; tekrar oynamalar mevcut skoru DEĞİŞTİRMEZ
    if (!currentScores[length][level]) {
      currentScores[length][level] = { score: finalScore, steps: finalSteps, time: finalTime };
      localStorage.setItem('evolvo_offline_scores', JSON.stringify(currentScores));
      setOfflineScores(currentScores);
      // Her UNLIMITED_BONUS_EVERY yeni bölümde ipucu cüzdanına bonus
      const bonus = recordUnlimitedSolved();
      if (bonus) setTimeout(() => showFeedback(`🎁 ${bonus} ipucu kazandın!`, 'success'), 1800);
    }

    setOfflineProgress(prev => {
      const newProg = { ...prev };
      if ((newProg[length] || 1) <= level) {
        newProg[length] = level + 1;
        localStorage.setItem('evolvo_offline_progress', JSON.stringify(newProg));
      }
      return newProg;
    });
  };

const handleStartUnlimited = async (length, level) => {
    await maybeShowInterstitial(); // her INTERSTITIAL_EVERY bölümde bir (reklamsız sürümde hiç)
    setIsPuzzleLoading(true);
    try {
      const response = await fetch('/offline_puzzles.json');
      const data = await response.json();

      const levelData = data[length][level - 1];

      if (!levelData) {
        showFeedback("Bu kategorideki tüm bölümleri bitirdin! Yeni güncelleme bekle.", "success");
        setIsPuzzleLoading(false);
        return;
      }

      const levelKey = `unlimited_${length}_${level}`;
      const playStatus = localStorage.getItem(`evolvo_played_${levelKey}`);

      // Bölüm bitti (kazandı veya kaybetti) → oyun-sonu state'ini temizle, taze başlasın.
      // Puan evolvo_offline_scores'da kilitli kaldığı için silinmiyor.
      if (playStatus === 'won' || playStatus === 'lost') {
        localStorage.removeItem(`evolvo_played_${levelKey}`);
        localStorage.removeItem(`evolvo_history_${levelKey}`);
        localStorage.removeItem(`evolvo_today_stats_${levelKey}`);
      }
      // Yarım kalan (playStatus yok, history var) → history kalsın, useEffect restore eder.

      setActivePuzzle({
        ...levelData,
        type: 'unlimited',
        date: `offline_${length}_${level}`,
        length: length,
        level: level,
        start: levelData.start.toLocaleUpperCase('tr-TR'),
        target: levelData.target.toLocaleUpperCase('tr-TR'),
        optimalSteps: levelData.optimalSteps || 5,
        solution: levelData.solution
      });

      setGameKey(prev => prev + 1);
      setCurrentPage('game');

    } catch (error) {
      console.error("Offline puzzle hatası:", error);
      showFeedback("Bölüm verisi yüklenemedi.", "error");
    } finally {
      setIsPuzzleLoading(false);
    }
  };
  // Tercihler artık cihazda kalıcı (önceden her açılışta sıfırlanıyordu)
  const [userAvatar, setUserAvatarState] = useState(() => AVATARS.find(a => a.id === Number(readPref('evolvo_avatar_id'))) || AVATARS[0]);
  const [darkMode, setDarkModeState] = useState(() => readPref('evolvo_dark') === '1');
  const [colorBlindMode, setColorBlindModeState] = useState(() => readPref('evolvo_colorblind') === '1');
  const [sozlukSeti, setSozlukSeti] = useState(new Set());
  const [leaderboardData, setLeaderboardData] = useState({ daily: [], weekly: [], monthly: [], daily_user: null, weekly_user: null, monthly_user: null });
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [activePuzzle, setActivePuzzle] = useState(null); 
  const [isPuzzleLoading, setIsPuzzleLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showUniqueNameModal, setShowUniqueNameModal] = useState(false);
  const [tempUser, setTempUser] = useState(null); 
  
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const db = getFirestore(app);
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().username) {
             setUsername(userDocSnap.data().username);
          }
        } catch (e) {
           console.error("Otomatik giriş sırasında isim çekilemedi:", e);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);
  
  const [unlockedQueue, setUnlockedQueue] = useState([]);
  const handleUnlock = useCallback((achievement) => {
    setUnlockedQueue(q => [...q, achievement]);
  }, []);
  const { stats, recordGameEnd, recordEvent } = useProgress(user, handleUnlock);
  useEffect(() => {
    scheduleReminders(loadStats());
    initMonetization().then(() => { setAdsRemovedState(adsRemoved()); setPrivacyOptions(needsPrivacyOptions()); });
    // Google giriş eklentisi kullanılmadan önce bir kez kurulmalı; kurulmazsa signIn() uygulamayı çökertir.
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({ clientId: GOOGLE_WEB_CLIENT_ID, scopes: ['profile', 'email'], grantOfflineAccess: true })
        .catch((e) => console.warn('GoogleAuth kurulamadı:', e));
    }
  }, []);
  const [adsRemovedState, setAdsRemovedState] = useState(adsRemoved);
  const [privacyOptions, setPrivacyOptions] = useState(false);
  // Davet linki (?arkadas=EVO-XXXXXX) ile gelindiyse arkadaşlar penceresini kod dolu açar
  const [pendingFriendCode] = useState(takeFriendCodeFromUrl);
  useEffect(() => {
    if (pendingFriendCode) setModalState(prev => ({ ...prev, friends: true }));
  }, [pendingFriendCode]);

  const setUserAvatar = (av) => {
    setUserAvatarState(av);
    writePref('evolvo_avatar_id', String(av.id));
    recordEvent('avatar');
  };
  const setDarkMode = (on) => {
    setDarkModeState(on);
    writePref('evolvo_dark', on ? '1' : '0');
    if (on) recordEvent(null, { darkMode: true });
  };
  const setColorBlindMode = (on) => {
    setColorBlindModeState(on);
    writePref('evolvo_colorblind', on ? '1' : '0');
  };
  
  const [modalState, setModalState] = useState({
    leaderboard: false, howToPlay: false, calendar: false, stats: false, achievements: false, definition: null, avatar: false, challenge: false, privacy: false, contact: false
  });

  const theme = darkMode ? THEMES.dark : THEMES.standard;
  const currentColors = colorBlindMode ? { ...theme, ...COLOR_BLIND_THEME } : theme;

  const toggleModal = (modalName, isOpen) => {
    if (modalName === 'challenge') {
      setCurrentPage('challenge');
      setIsMenuOpen(false);
      return;
    }
    setModalState(prev => ({ ...prev, [modalName]: isOpen }));
    if (modalName === 'leaderboard' && isOpen) {
      fetchLeaderboard('daily');
    }
  };

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const response = await fetch('/sozluk.json'); 
        const data = await response.json();
        setSozlukSeti(new Set(data)); 
      } catch (error) {
        console.error("Sözlük yüklenemedi:", error);
      }
    };
    loadDictionary();
  }, []);

  const checkTDK = async (word) => {
    if (sozlukSeti.size === 0) return true; 
    return sozlukSeti.has(word.toLocaleUpperCase('tr-TR'));
  };

  const fetchLeaderboard = async (period = 'daily') => {
    setIsLoadingLeaderboard(true);
    try {
      const functions = getFunctions(getApp(), 'europe-west1');

      if (period === 'daily') {
        const getLeaderboardFn = httpsCallable(functions, 'getLeaderboard');
        const todayStr = new Date().toISOString().split('T')[0];
        const currentPuzzleId = activePuzzle ? activePuzzle.date : todayStr;
        const result = await getLeaderboardFn({ puzzleId: currentPuzzleId, currentPlayerName: username });
        setLeaderboardData(prev => ({
          ...prev,
          daily: result.data.topScores || [],
          daily_user: result.data.userScore || null,
        }));
      } else {
        const getAggregateFn = httpsCallable(functions, 'getAggregateLeaderboard');
        const result = await getAggregateFn({ period, currentPlayerName: username });
        setLeaderboardData(prev => ({
          ...prev,
          [period]: result.data.topScores || [],
          [`${period}_user`]: result.data.userScore || null,
        }));
      }
    } catch (error) {
      console.error("Liderlik tablosu çekilemedi:", error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleGoogleLogin = async () => {
    const auth = getAuth();

    if (Capacitor.isNativePlatform()) {
      try {
        const googleUser = await GoogleAuth.signIn();
        const idToken = googleUser.authentication.idToken;
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        const loggedInUser = result.user;

        const db = getFirestore(app);
        const userDocRef = doc(db, 'users', loggedInUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().username) {
            const dbUsername = userDocSnap.data().username;
            setUser(loggedInUser);
            setUsername(dbUsername);
            showFeedback(`Tekrar hoş geldin, ${dbUsername}!`, "success");
            setCurrentPage('game');
          } else {
            setTempUser(loggedInUser);
            setShowUniqueNameModal(true);
          }
        } catch (dbError) {
          console.error("Firestore Okuma Hatası:", dbError);
          setTempUser(loggedInUser);
          setShowUniqueNameModal(true);
        }
      } catch (error) {
        // Kullanıcı hesap seçiciyi kapattıysa (kod 12501) hata gösterme
        if (/cancel|12501/i.test(`${error?.message} ${error?.code}`)) return;
        console.error("Native Giriş Hatası:", error);
        showFeedback("Google girişi başarısız oldu.", "error");
      }
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const loggedInUser = result.user;

      const db = getFirestore(app);
      const userDocRef = doc(db, 'users', loggedInUser.uid);
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().username) {
          const dbUsername = userDocSnap.data().username;
          setUser(loggedInUser);
          setUsername(dbUsername);
          showFeedback(`Tekrar hoş geldin, ${dbUsername}!`, "success");
          setCurrentPage('game');
        } else {
          setTempUser(loggedInUser);
          setShowUniqueNameModal(true);
        }
      } catch (dbError) {
        console.error("Firestore Okuma Hatası:", dbError);
        setTempUser(loggedInUser);
        setShowUniqueNameModal(true);
      }
    } catch (error) {
      console.error("Giriş Hatası:", error);
      showFeedback("Google penceresi kapandı veya giriş başarısız oldu.", "error");
    }
  };

  const handleLogout = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      setUser(null);
      setUsername(generateRandomName());
      showFeedback("Hesaptan çıkış yapıldı.", "info"); 
      setCurrentPage('landing'); 
    } catch (error) {
      console.error("Çıkış Hatası:", error);
    }
  };

  const loadPastPuzzle = async (dateStr) => {
    setIsPuzzleLoading(true);
    try {
      const LIVE_API_URL = "https://europe-west1-evolvogame-21a23.cloudfunctions.net/apiDailyPuzzle";
      const response = await fetch(`${LIVE_API_URL}?date=${dateStr}`);
      
      if (!response.ok) throw new Error('Sunucu cevap vermedi');
      
      const data = await response.json();
      
      setActivePuzzle({
        type: 'daily',
        date: dateStr,
        start: data.baslangic.toLocaleUpperCase('tr-TR'),
        target: data.bitis.toLocaleUpperCase('tr-TR'),
        solution: null,
        optimalSteps: data.optimal_adim || 5
      });
      setGameKey(prev => prev + 1); // Sayfayı zorla yeniletme tetikleyicisi
      setCurrentPage('game');
      setCurrentPage('game');
      toggleModal('calendar', false);
      showFeedback(`Zaman yolculuğu başarılı! ${dateStr} bulmacası yüklendi.`, "success");
    } catch (error) {
      console.error("Geçmiş bulmaca hatası:", error);
      showFeedback("O güne ait bulmaca bulunamadı!", "error");
    } finally {
      setIsPuzzleLoading(false);
    }
  };

  useEffect(() => {
    const fetchDailyPuzzle = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const challengeData = urlParams.get('challenge');

      if (challengeData) {
        try {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(challengeData))));
          setActivePuzzle(decoded);
          setCurrentPage('game');
          setIsPuzzleLoading(false);
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        } catch (e) {
          console.error("Geçersiz veya bozuk meydan okuma linki", e);
        }
      }

      try {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const LIVE_API_URL = "https://europe-west1-evolvogame-21a23.cloudfunctions.net/apiDailyPuzzle";
        const response = await fetch(`${LIVE_API_URL}?date=${todayStr}`);
        
        if (!response.ok) throw new Error('Sunucu cevap vermedi');
        
        const data = await response.json();
        
        setActivePuzzle({
          type: 'daily',
          date: todayStr,
          start: data.baslangic.toLocaleUpperCase('tr-TR'),
          target: data.bitis.toLocaleUpperCase('tr-TR'),
          solution: null,
          optimalSteps: data.optimal_adim || 5
        });
      } catch (error) {
        console.warn("API Hatası, yedek bulmaca yükleniyor:", error);
        setActivePuzzle({
          type: 'daily',
          date: new Date().toISOString().split('T')[0],
          start: "EVRAK",
          target: "KONAK",
          solution: ["AVRAT", "KANAT", "KONAT", "KONAK"],
          optimalSteps: 5
        });
      } finally {
        setIsPuzzleLoading(false);
      }
    };

    fetchDailyPuzzle();
  }, []); 

  // GamePage'den gelen olaylar. 'game_end' payload'ı: { win, hints, score, time, moves, maxMoves,
  // invalidAttempts, isTodaysDaily, words }. Diğerleri: 'dictionary' | 'share'.
  // (Eski sürüm sınırsız mod skorlarını da yerel günlük tabloya ekliyordu; sunucu tablosu zaten doğru.)
  const updateStats = (type, payload) => {
    if (type !== 'game_end') { recordEvent(type); return; }
    const next = recordGameEnd(payload);
    scheduleReminders(next);
    if (payload.win) maybeAskForReview(next);
  };

  const [notificationsOn, setNotificationsOn] = useState(notificationsEnabled);
  const setNotifications = async (on) => {
    if (on) setNotificationsOn(await enableNotifications(stats));
    else { await disableNotifications(stats); setNotificationsOn(false); }
  };
  // Bildirimler varsayılan olarak açık: ilk açılışta (açılış animasyonu bitince) sistemin izin penceresi
  // doğrudan gelir. Android 12 ve öncesinde izin zaten verili olduğundan pencere bile çıkmaz.
  useEffect(() => {
    if (showSplash || !shouldAskNotifications()) return;
    const t = setTimeout(() => { enableNotifications(loadStats()).then(setNotificationsOn); }, 600);
    return () => clearTimeout(t);
  }, [showSplash]);

  const achievementToast = (
    <AchievementToast
      achievement={unlockedQueue[0]}
      onDone={() => setUnlockedQueue(q => q.slice(1))}
      onOpen={() => { setUnlockedQueue([]); toggleModal('achievements', true); }}
    />
  );

  const handleStartCustomGame = (puzzleData) => {
    setActivePuzzle(puzzleData);
    setCurrentPage('game');
  };

  const globalDefinitionModal = (
    <>
      <DefinitionModal word={modalState.definition} onClose={() => toggleModal('definition', null)} theme={theme} />
      {achievementToast}
      <FriendsModal
        isOpen={!!modalState.friends}
        onClose={() => toggleModal('friends', false)}
        theme={theme}
        user={user}
        username={username}
        puzzleId={activePuzzle?.type === 'daily' ? activePuzzle.date : dayKey()}
        onLogin={handleGoogleLogin}
        showFeedback={showFeedback}
        initialCode={pendingFriendCode}
        onRecordShare={() => recordEvent('share')}
      />
      <StoreModal isOpen={!!modalState.store} onClose={() => toggleModal('store', false)} adsRemoved={adsRemovedState} onAdsRemoved={() => setAdsRemovedState(true)} theme={theme} showFeedback={showFeedback} />
    </>
  );

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  if (window.location.pathname === '/privacy') {
    return (
      <div style={{background:'#06071a',minHeight:'100vh',color:'#cbd5e1',fontFamily:'sans-serif',padding:'0 16px 60px'}}>
        <div style={{maxWidth:720,margin:'0 auto'}}>
          <header style={{display:'flex',alignItems:'center',gap:12,padding:'24px 0 20px',borderBottom:'1px solid rgba(255,255,255,0.08)',marginBottom:36}}>
            <span style={{fontSize:22,fontWeight:900,fontStyle:'italic',color:'#fff',textTransform:'uppercase',letterSpacing:-1}}>Evolvo</span>
            <span style={{color:'rgba(255,255,255,0.2)'}}>|</span>
            <a href="/" style={{color:'#60a5fa',textDecoration:'none',fontSize:14,fontWeight:600}}>Ana Sayfa</a>
          </header>
          <h1 style={{fontSize:28,fontWeight:900,color:'#fff',marginBottom:8,textTransform:'uppercase'}}>Gizlilik Politikası &amp; Kullanım Koşulları</h1>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:40}}>Son güncelleme: Mayıs 2026 · Türkiye</p>

          <section style={{marginBottom:40}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#93c5fd',marginBottom:12,textTransform:'uppercase'}}>1. Kişisel Verilerin İşlenmesi ve Korunması (KVKK)</h2>
            <p style={{marginBottom:10,fontSize:14,lineHeight:1.7}}>EVOLVO oyunu, oyuncu deneyimini geliştirmek amacıyla kısıtlı miktarda kişisel veri toplamaktadır.</p>
            <ul style={{paddingLeft:20,fontSize:14,lineHeight:1.7}}>
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Toplanan Veriler:</strong> Google ile giriş yaptığınızda Google UID, ad/soyad ve e-posta adresiniz Firebase'e aktarılır. Kullanıcı adınız liderlik tablosu için herkese açık görünür.</li>
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Kullanım Amacı:</strong> Veriler yalnızca skor kaydı, hile önleme (reCAPTCHA) ve cihazlar arası ilerleme eşitleme için kullanılır.</li>
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Veri Paylaşımı:</strong> Hesap verileriniz satılmaz veya pazarlama amacıyla paylaşılmaz. Android uygulamasındaki reklamlar Google AdMob ile sunulur; ayrıntılar için <a href="/privacy.html" style={{color:'#60a5fa'}}>tam gizlilik politikası</a>.</li>
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Veri Silme:</strong> KVKK kapsamındaki haklarınız için <a href="mailto:info@altaygaming.com" style={{color:'#60a5fa'}}>info@altaygaming.com</a> adresine yazabilirsiniz.</li>
            </ul>
          </section>

          <hr style={{border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',margin:'40px 0'}}/>

          <section style={{marginBottom:40}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#93c5fd',marginBottom:12,textTransform:'uppercase'}}>2. Çerezler ve Yerel Depolama</h2>
            <p style={{marginBottom:10,fontSize:14,lineHeight:1.7}}>Oyunumuz izleme veya pazarlama çerezi kullanmaz. Tarayıcı yerel depolaması yalnızca tercihleriniz ve oyun ilerlemesi için kullanılır.</p>
          </section>

          <hr style={{border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',margin:'40px 0'}}/>

          <section style={{marginBottom:40}}>
            <h2 style={{fontSize:18,fontWeight:800,color:'#93c5fd',marginBottom:12,textTransform:'uppercase'}}>3. Kullanım Koşulları</h2>
            <ul style={{paddingLeft:20,fontSize:14,lineHeight:1.7}}>
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Adil Oyun:</strong> Bot, makro veya üçüncü parti yazılım kullanımı yasaktır.</li>
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Kullanıcı Adları:</strong> Nefret söylemi, küfür veya ayrımcı içerik barındıran adlar yasaktır.</li>
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Sözlük Kaynağı:</strong> Kelimeler TDK Güncel Türkçe Sözlük'ten alınmaktadır.</li>
            </ul>
          </section>

          <hr style={{border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',margin:'40px 0'}}/>

          <section>
            <h2 style={{fontSize:18,fontWeight:800,color:'#93c5fd',marginBottom:12,textTransform:'uppercase'}}>4. İletişim</h2>
            <p style={{fontSize:14,lineHeight:1.7}}>E-posta: <a href="mailto:info@altaygaming.com" style={{color:'#60a5fa'}}>info@altaygaming.com</a></p>
          </section>

          <footer style={{marginTop:60,paddingTop:24,borderTop:'1px solid rgba(255,255,255,0.08)',textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.3)'}}>
            <p>© 2026 Evolvo — Altay Gaming. Tüm hakları saklıdır.</p>
            <p style={{marginTop:8}}><a href="/" style={{color:'#60a5fa',textDecoration:'none'}}>Ana Sayfa</a></p>
          </footer>
        </div>
      </div>
    );
  }

  if (isPuzzleLoading) {
    return (
      <div className="min-h-screen bg-[#001f3f] flex flex-col items-center justify-center text-white">
        <Loader2 size={64} className="animate-spin text-green-500 mb-6" />
        <h2 className="text-2xl font-black italic animate-pulse">EVOLVO BAĞLANIYOR...</h2>
      </div>
    );
  }
  if (currentPage === 'unlimited_menu') {
    return (
      <>
      {achievementToast}
      <UnlimitedMenuPage 
        onBack={() => setCurrentPage('landing')} 
        theme={theme} 
        progress={offlineProgress} 
        scores={offlineScores} 
        userAvatar={userAvatar}
        setUserAvatar={setUserAvatar}
        onPlay={(len, lvl) => handleStartUnlimited(len, lvl)}
      />
      </>
    );
  }
  if (currentPage === 'challenge') {
    return (
      <>
        {globalDefinitionModal}
        <ChallengePage 
          onBack={() => setCurrentPage('landing')} 
          theme={theme} 
          colors={currentColors} 
          checkTDK={checkTDK}
          toggleModal={toggleModal}
        />
      </>
    );
  }

  if (currentPage === 'game') {
    return (
      <>
        {globalDefinitionModal}
        <GamePage 
          key={`game_force_reload_${gameKey}`}
          username={username}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
          onBack={() => setCurrentPage('landing')}
          theme={theme}
          colors={currentColors}
          toggleModal={toggleModal}
          modalState={modalState}
          settings={{ darkMode, setDarkMode, colorBlindMode, setColorBlindMode, stats, notificationsOn, setNotifications, adsRemoved: adsRemovedState, onOpenStore: () => toggleModal('store', true), onPrivacyOptions: privacyOptions ? showPrivacyOptions : null }}
          updateStats={updateStats}
          puzzleData={activePuzzle} 
          leaderboardData={leaderboardData}
          onLoadPastPuzzle={loadPastPuzzle}
          user={user}
          onLogout={handleLogout}
          message={message}
          showFeedback={showFeedback}
          onLogin={handleGoogleLogin}
          checkTDK={checkTDK}
          onUnlimitedWin={handleUnlimitedWin}
          onBackToMap={() => setCurrentPage('unlimited_menu')}
          onNextLevel={(len, lvl) => handleStartUnlimited(len, lvl)}
          offlineProgress={offlineProgress}
          fetchLeaderboard={fetchLeaderboard}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} font-sans transition-colors duration-300 flex flex-col overflow-x-hidden pt-24 md:pt-32`}>
      {message && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 flex items-center gap-3 font-black text-sm text-white bg-black/80 backdrop-blur-md border border-white/20">
          {message.type === 'success' ? <CheckCircle2 className="text-green-500" size={20} /> : <AlertCircle className="text-red-500" size={20} />}
          {message.text}
        </div>
      )}

      <LeaderboardModal isOpen={modalState.leaderboard} onClose={() => toggleModal('leaderboard', false)} theme={theme} colors={currentColors} leaderboardData={leaderboardData} userAvatar={userAvatar} username={username} isLoading={isLoadingLeaderboard} onTabChange={fetchLeaderboard} onOpenFriends={() => { toggleModal('leaderboard', false); toggleModal('friends', true); }} />
      <HowToPlayModal isOpen={modalState.howToPlay} onClose={() => toggleModal('howToPlay', false)} theme={theme} colors={currentColors} />
      <CalendarModal isOpen={modalState.calendar} onClose={() => toggleModal('calendar', false)} theme={theme} colors={currentColors} onSelectDate={loadPastPuzzle} />
      <StatsModal isOpen={modalState.stats} onClose={() => toggleModal('stats', false)} theme={theme} colors={currentColors} stats={stats} />
      <AchievementsModal isOpen={modalState.achievements} onClose={() => toggleModal('achievements', false)} theme={theme} colors={currentColors} stats={stats} />
      <AvatarModal isOpen={modalState.avatar} onClose={() => toggleModal('avatar', false)} theme={theme} colors={currentColors} userAvatar={userAvatar} username={username} onSelect={(av) => { setUserAvatar(av); toggleModal('avatar', false); }} />
      {globalDefinitionModal}
      <UniqueNameModal 
        isOpen={showUniqueNameModal} 
        tempUser={tempUser} 
        theme={theme} 
        colors={currentColors}
        onComplete={(finalName) => {
          setUser(tempUser);
          setUsername(finalName);
          setShowUniqueNameModal(false);
          setTempUser(null);
          showFeedback(`Tapu alındı! Hoş geldin, ${finalName}!`, "success");
        }} 
      />
      <PrivacyModal isOpen={modalState.privacy} onClose={() => toggleModal('privacy', false)} theme={theme} />
      <ContactModal isOpen={modalState.contact} onClose={() => toggleModal('contact', false)} theme={theme} />  
      <nav className={`fixed top-0 w-full z-50 py-4 ${darkMode ? 'bg-black/90' : 'bg-[#001f3f]/90'} backdrop-blur-md shadow-sm transition-all`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="cursor-pointer" onClick={() => setCurrentPage('landing')}>
            <Logo colors={currentColors} />
          </div>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => toggleModal('howToPlay', true)} className="hover:opacity-75 font-bold text-xs tracking-widest uppercase">Nasıl Oynanır?</button>
            <button onClick={() => toggleModal('leaderboard', true)} className="hover:opacity-75 font-bold text-xs tracking-widest uppercase">Sıralama</button>
            
            {user ? (
              <div className="flex items-center gap-4">
                <div onClick={() => toggleModal('avatar', true)} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors">
                  <div className="text-xl">{userAvatar.icon}</div>
                  <span className="font-bold text-sm text-green-400">{username}</span>
                </div>
                <button onClick={handleLogout} className={`${currentColors.btnSecondary} px-6 py-2 rounded-full font-bold shadow-lg transition-transform active:scale-95`}>
                  Çıkış Yap
                </button>
              </div>
            ) : (
              <button onClick={handleGoogleLogin} className={`${currentColors.btnPrimary} px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transition-transform active:scale-95`}>
                Giriş Yap
              </button>
            )}
          </div>
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} toggleModal={toggleModal} settings={{ darkMode, setDarkMode, colorBlindMode, setColorBlindMode, notificationsOn, setNotifications, adsRemoved: adsRemovedState, onOpenStore: () => toggleModal('store', true), onPrivacyOptions: privacyOptions ? showPrivacyOptions : null }} theme={theme} user={user} onLogout={handleLogout} onLogin={handleGoogleLogin} />

      <section className="flex-1 flex flex-col justify-center pb-12 md:pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full mb-5 md:mb-8">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span>
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-90">Günün kelime zinciri hazır</span>
          </div>

          <h1 className="text-[2.6rem] md:text-6xl lg:text-8xl font-black mb-4 md:mb-6 tracking-tighter uppercase italic leading-[0.95]">
            Kelimeleri <br />
            <span className={colorBlindMode ? 'text-blue-500' : 'text-green-500'}>Evrimleştir</span>
          </h1>

          <p className="text-base md:text-2xl text-blue-200/75 mb-8 md:mb-12 max-w-md md:max-w-2xl mx-auto font-medium leading-relaxed">
            Başlangıç kelimesinden hedefe, her adımda tek harf değiştirerek ulaş.
          </p>

          <div className="w-full max-w-xs sm:max-w-sm mx-auto flex flex-col gap-2.5">
            <button onClick={() => setCurrentPage('game')} className={`${currentColors.btnPrimary} w-full py-3.5 rounded-2xl font-black text-base tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.97] shadow-lg shadow-green-900/30`}>
              <Play fill="currentColor" size={18} /> GÜNÜN BULMACASI
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              {isNative && (
                <button onClick={() => setCurrentPage('unlimited_menu')} className="py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white active:scale-[0.97] transition-all shadow-md shadow-purple-900/30">
                  <InfinityIcon size={16} /> Sınırsız
                </button>
              )}
              <button onClick={() => toggleModal('leaderboard', true)} className={`${isNative ? '' : 'col-span-2'} py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 bg-white/10 border border-white/10 active:scale-[0.97] transition-all`}>
                <Trophy size={16} className="text-yellow-400" /> Sıralama
              </button>
            </div>
            {isNative && (
              <button onClick={() => toggleModal('store', true)} className="py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 bg-yellow-400/10 border border-yellow-400/40 text-yellow-200 active:scale-[0.97] transition-all">
                <ShoppingBag size={16} className="text-yellow-400" /> Mağaza
              </button>
            )}
            <button onClick={() => toggleModal('howToPlay', true)} className="py-2 text-xs font-bold uppercase tracking-widest opacity-50 hover:opacity-80">Nasıl oynanır?</button>
          </div>
        </div>
      </section>

      <footer className={`py-8 text-center border-t ${theme.panelBorder} text-sm mt-auto`}>
        <div className="flex items-center justify-center gap-2 mb-3" style={{animation:'altayBrandIn 1s ease 0.7s forwards', opacity:0}}>
          <MountainMini size={14} />
          <span className="text-[11px] text-slate-400 tracking-[0.25em] font-medium">ALTAY GAMING</span>
        </div>
        <p className="opacity-50">© 2026 Evolvo. Tüm hakları saklıdır.</p>
        <div className="flex justify-center gap-4 mt-2 font-bold text-xs uppercase tracking-widest opacity-50">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Gizlilik & KVKK</a>
          <button onClick={() => toggleModal('contact', true)} className="hover:underline">İletişim</button>
        </div>
      </footer>
    </div>
  );
};

export default App;
