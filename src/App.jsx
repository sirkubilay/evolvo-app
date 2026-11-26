import './styles/injectStyles';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithPopup, signInWithCredential, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { Play, Trophy, Menu, X, Star, ShoppingBag, CheckCircle2, AlertCircle, Loader2, Route as RouteIcon } from 'lucide-react';
import { AVATARS, generateRandomName, THEMES, COLOR_BLIND_THEME, GOOGLE_WEB_CLIENT_ID } from './data/constants';
import { app } from './firebase';
import { setAnalyticsUser } from './lib/analytics';
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
import { claimPendingInviteHints } from './lib/invite';
import { ProfileModal } from './components/modals/ProfileModal';
import { CalendarModal } from './components/modals/CalendarModal';
import { DefinitionModal } from './components/modals/DefinitionModal';
import { PrivacyModal } from './components/modals/PrivacyModal';
import { ContactModal } from './components/modals/ContactModal';
import { Logo } from './components/Logo';
import { AchievementToast } from './components/AchievementToast';
import { useProgress } from './lib/useProgress';
import { loadStats, dayKey } from './lib/progress';
import { DIFFICULTIES, DIFFICULTY_ORDER, dailyPuzzleId, toDailyPuzzle, puzzleIdOf } from './lib/daily';
import { getCachedPuzzle, cachePuzzle } from './lib/dailyCache';
import { FriendsModal } from './components/modals/FriendsModal';
import { takeFriendCodeFromUrl } from './lib/friends';
import { existsInTdk, flattenTr } from './lib/tdk';
import { soundEnabled, setSoundEnabled } from './lib/sound';
import { StoreModal } from './components/modals/StoreModal';
import { recordUnlimitedSolved, claimDailyHintGift } from './lib/hints';
import { initMonetization, adsRemoved, needsPrivacyOptions, showPrivacyOptions, maybeShowInterstitial, recoverHintPurchases } from './lib/monetization';
import {
  scheduleReminders, maybeAskForReview, shouldAskNotifications, notificationsEnabled,
  enableNotifications, disableNotifications,
} from './lib/native';

const readPref = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const writePref = (k, v) => { try { localStorage.setItem(k, v); } catch { /* depolama kapalı */ } };
const DAILY_API_URL = "https://europe-west1-evolvogame-21a23.cloudfunctions.net/apiDailyPuzzle";

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
  // Geliştirme ortamında (tarayıcı) da uygulama menüsü telefondaki gibi görünsün
  const showAppUi = isNative || import.meta.env.DEV;
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
  // Bugünün iki günlük bulmacası (null = yükleniyor); kolay bulmaca henüz üretilmediyse kolay: null
  const [dailyPuzzles, setDailyPuzzles] = useState(null);
  const leaderboardDifficulty = activePuzzle?.type === 'daily' ? (activePuzzle.difficulty || 'zor') : 'zor';
  const [isPuzzleLoading, setIsPuzzleLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [showUniqueNameModal, setShowUniqueNameModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [tempUser, setTempUser] = useState(null); 
  
  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAnalyticsUser(currentUser.uid);
        setTimeout(() => claimPendingInviteHints().then((n) => { if (n) showFeedback(`🎁 Arkadaş davetinden +${n} ipucu kazandın!`, 'success'); }), 3000);
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
        setAnalyticsUser(null);
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
    // Google giriş eklentisi kullanılmadan önce bir kez kurulmalı; kurulmazsa signIn() uygulamayı çökertir.
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({ clientId: GOOGLE_WEB_CLIENT_ID, scopes: ['profile', 'email'], grantOfflineAccess: true })
        .catch((e) => console.warn('GoogleAuth kurulamadı:', e));
    }
    initMonetization().then(() => { setAdsRemovedState(adsRemoved()); setPrivacyOptions(needsPrivacyOptions()); });
    if (!Capacitor.isNativePlatform()) return undefined;
    // Günlük hediye ipucu (sınırsız mod cüzdanına) — açılış ekranı bitince haber ver
    const gift = (delay) => { if (claimDailyHintGift()) setTimeout(() => showFeedback('🎁 Günlük hediyen: +1 ipucu!', 'success'), delay); };
    gift(4000);
    // Onayı geciken ya da yarım kalan ipucu satın almalarını teslim et (açılışta ve uygulamaya her dönüşte)
    const recover = () => recoverHintPurchases().then((n) => { if (n) showFeedback(`💡 Satın aldığın ${n} ipucu hesabına eklendi!`, 'success'); });
    setTimeout(recover, 2500);
    // Arkadaşları bu oyuncunun kodunu eklediyse biriken davet ipuçları
    const inviteGift = () => {
      if (!getAuth().currentUser) return;
      claimPendingInviteHints().then((n) => { if (n) showFeedback(`🎁 Arkadaş davetinden +${n} ipucu kazandın!`, 'success'); });
    };
    const onVisible = () => { if (document.visibilityState === 'visible') { recover(); gift(800); inviteGift(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
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
    leaderboard: false, howToPlay: false, calendar: false, stats: false, achievements: false, definition: null, avatar: false, profile: false, challenge: false, privacy: false, contact: false
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
      fetchLeaderboard('daily', leaderboardDifficulty);
    }
  };

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const response = await fetch('/sozluk.json'); 
        const data = await response.json();
        // Şapkalı kelimeler düz haliyle de bulunsun (KÂĞIT → KAĞIT): klavyede Â/Î/Û yok
        setSozlukSeti(new Set(data.map(flattenTr)));
      } catch (error) {
        console.error("Sözlük yüklenemedi:", error);
      }
    };
    loadDictionary();
  }, []);

  const checkTDK = async (word) => {
    if (sozlukSeti.size === 0) return true;
    if (sozlukSeti.has(flattenTr(word.toLocaleUpperCase('tr-TR')))) return true;
    // Yerel listede eksik olabilir (ör. DART): canlı TDK'ya sor
    return existsInTdk(word);
  };

  const fetchLeaderboard = async (period = 'daily', difficulty = leaderboardDifficulty) => {
    const reqId = ++leaderboardReq.current; // geç gelen eski cevap yenisinin üstüne yazmasın
    setIsLoadingLeaderboard(true);
    try {
      const functions = getFunctions(getApp(), 'europe-west1');

      if (period === 'daily') {
        const getLeaderboardFn = httpsCallable(functions, 'getLeaderboard');
        // Açık bulmaca geçmiş bir günlükse o günün tablosu, değilse bugünün
        const date = activePuzzle?.type === 'daily' ? activePuzzle.date : dayKey();
        // Zorluk değişince eski zorluğun listesi bir an bile görünmesin
        setLeaderboardData(prev => ({ ...prev, daily: [], daily_user: null }));
        const result = await getLeaderboardFn({ puzzleId: dailyPuzzleId(date, difficulty), currentPlayerName: username });
        if (reqId !== leaderboardReq.current) return;
        setLeaderboardData(prev => ({
          ...prev,
          daily: result.data.topScores || [],
          daily_user: result.data.userScore || null,
        }));
      } else {
        const getAggregateFn = httpsCallable(functions, 'getAggregateLeaderboard');
        const result = await getAggregateFn({ period, currentPlayerName: username });
        if (reqId !== leaderboardReq.current) return;
        setLeaderboardData(prev => ({
          ...prev,
          [period]: result.data.topScores || [],
          [`${period}_user`]: result.data.userScore || null,
        }));
      }
    } catch (error) {
      console.error("Liderlik tablosu çekilemedi:", error);
    } finally {
      if (reqId === leaderboardReq.current) setIsLoadingLeaderboard(false);
    }
  };
  const leaderboardReq = useRef(0);
  // İsim değişince eski isimle çekilmiş tablolar atılır; açık tablo yeni isimle yeniden çekilir
  // (sunucu skorları yeni isme taşıdığı için değişiklik hemen görünür).
  const prevUsername = useRef(username);
  useEffect(() => {
    if (prevUsername.current === username) return;
    prevUsername.current = username;
    setLeaderboardData({ daily: [], weekly: [], monthly: [], daily_user: null, weekly_user: null, monthly_user: null });
    if (modalState.leaderboard) fetchLeaderboard('daily');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

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

  // Ağ hatası / sunucu soğuk başlangıcı için kısa aralıklarla yeniden dener. 404 (bulmaca yok) tekrar denenmez.
  const fetchDaily = async (dateStr, difficulty, attempts = 3) => {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 1000 * i));
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      try {
        const response = await fetch(`${DAILY_API_URL}?date=${dailyPuzzleId(dateStr, difficulty)}`, { signal: ctrl.signal });
        if (response.status === 404) throw Object.assign(new Error('Bulmaca yok'), { notFound: true });
        if (!response.ok) throw new Error(`Sunucu cevap vermedi (${response.status})`);
        return toDailyPuzzle(await response.json(), dateStr, difficulty);
      } catch (error) {
        lastError = error;
        if (error.notFound) break;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError;
  };

  // Bugünün bulmacaları. Yüklenemezse SAHTE bir yedek bulmaca gösterilmez (önceden EVRAK→KONAK
  // açılıyordu; ipucu ve skor gerçek bulmacaya göre çalıştığı için oyun bozuluyordu):
  // ana sayfada "tekrar dene" çıkar.
  const [dailyError, setDailyError] = useState(false);
  const dailyRetry = useRef(null);
  const tomorrowKey = () => { const d = new Date(); d.setDate(d.getDate() + 1); return dayKey(d); };

  // Bugünün bulmacaları: önce cihazdaki kopya (anında), sonra sunucudan tazelenir. Hiçbiri yoksa
  // arka planda giderek seyrelen aralıklarla tekrar denenir; "tekrar dene" ancak birkaç denemeden sonra çıkar.
  const loadTodayPuzzles = async ({ keepActive = false, attempt = 0 } = {}) => {
    clearTimeout(dailyRetry.current);
    const todayStr = dayKey();
    const keep = [todayStr, tomorrowKey()];
    const cached = {};
    DIFFICULTY_ORDER.forEach((d) => { cached[d] = getCachedPuzzle(dailyPuzzleId(todayStr, d)); });
    const showPuzzles = (set) => {
      setDailyError(false);
      setDailyPuzzles(set);
      if (!keepActive) setActivePuzzle((cur) => (cur && cur.type !== 'daily' ? cur : (set.zor || set.kolay)));
    };
    const hadCache = !!(cached.zor || cached.kolay);
    if (hadCache) showPuzzles(cached);
    else if (attempt === 0) setDailyPuzzles(null);

    const [kolay, zor] = await Promise.all(DIFFICULTY_ORDER.map((d) => fetchDaily(todayStr, d)
      .then((p) => { cachePuzzle(p, keep); return p; })
      .catch((error) => { console.warn(`${d} bulmaca yüklenemedi:`, error); return null; })));
    if (dayKey() !== todayStr) return; // bu arada gün değiştiyse yeni çağrı halleder

    if (kolay || zor) {
      const merged = { kolay: kolay || cached.kolay, zor: zor || cached.zor };
      if (hadCache) setDailyPuzzles(merged); // oyuncunun açık bulmacasına dokunma, sadece eksik zorluğu tamamla
      else showPuzzles(merged);
      return;
    }
    if (hadCache) return; // ağ yok ama cihazdaki bulmaca oynanabiliyor
    // İlk denemelerde butonlar "yükleniyor" kalır; ancak birkaç başarısız denemeden sonra hata gösterilir
    if (attempt >= 2) {
      setDailyPuzzles({ kolay: null, zor: null });
      setDailyError(true);
    }
    dailyRetry.current = setTimeout(() => loadTodayPuzzles({ keepActive, attempt: attempt + 1 }), Math.min(30000, 3000 * 2 ** attempt));
  };

  // Yarının bulmacaları sunucuda 23:30'da hazır: o saatten sonra önceden indirilir, gece yarısı anında açılır.
  const prefetchTomorrow = () => {
    const now = new Date();
    if (now.getHours() * 60 + now.getMinutes() < 23 * 60 + 32) return;
    const t = tomorrowKey();
    DIFFICULTY_ORDER.forEach((d) => {
      if (getCachedPuzzle(dailyPuzzleId(t, d))) return;
      fetchDaily(t, d, 2).then((p) => cachePuzzle(p, [dayKey(), t])).catch(() => { /* gece yarısı yine denenir */ });
    });
  };

  // Gün değişimi: uygulama öne gelince, 23:32'de (yarını önceden indir) ve gece yarısında (yeni güne geç)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !dailyPuzzles) return;
      prefetchTomorrow();
      const loadedDate = (dailyPuzzles.zor || dailyPuzzles.kolay)?.date;
      if (dailyError || (loadedDate && loadedDate !== dayKey())) loadTodayPuzzles({ keepActive: currentPage === 'game' });
    };
    document.addEventListener('visibilitychange', onVisible);
    const now = new Date();
    const at = (h, m, s = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, s) - now;
    const prefetchIn = at(23, 32);
    const prefetch = setTimeout(prefetchTomorrow, Math.max(0, prefetchIn));
    const midnight = setTimeout(() => loadTodayPuzzles({ keepActive: currentPage === 'game' }), at(24, 0, 1));
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(prefetch);
      clearTimeout(midnight);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyPuzzles, dailyError, currentPage]);

  const loadPastPuzzle = async (dateStr, difficulty = 'zor') => {
    setIsPuzzleLoading(true);
    try {
      setActivePuzzle(await fetchDaily(dateStr, difficulty));
      setGameKey(prev => prev + 1); // Sayfayı zorla yeniletme tetikleyicisi
      setCurrentPage('game');
      toggleModal('calendar', false);
      showFeedback(`Zaman yolculuğu başarılı! ${dateStr} ${DIFFICULTIES[difficulty].label.toLocaleLowerCase('tr-TR')} bulmacası yüklendi.`, "success");
    } catch (error) {
      console.error("Geçmiş bulmaca hatası:", error);
      showFeedback(difficulty === 'kolay' ? "O güne ait kolay bulmaca yok!" : "O güne ait bulmaca bulunamadı!", "error");
    } finally {
      setIsPuzzleLoading(false);
    }
  };

  /** Ana sayfadan / oyun sonundan bugünün kolay veya zor bulmacasını açar. */
  const playDaily = (difficulty) => {
    const puzzle = dailyPuzzles?.[difficulty];
    if (!puzzle) {
      showFeedback(!dailyPuzzles ? 'Bulmaca yükleniyor…' : dailyError ? 'Bulmaca yüklenemedi, tekrar dene.' : `${DIFFICULTIES[difficulty].label} bulmaca henüz hazır değil.`, "info");
      return;
    }
    setActivePuzzle(puzzle);
    setGameKey(prev => prev + 1);
    setCurrentPage('game');
  };

  useEffect(() => {
    const fetchDailyPuzzle = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const challengeData = urlParams.get('challenge');

      let challengeOpened = false;
      if (challengeData) {
        try {
          const decoded = JSON.parse(decodeURIComponent(escape(atob(challengeData))));
          setActivePuzzle(decoded);
          setCurrentPage('game');
          setIsPuzzleLoading(false);
          window.history.replaceState({}, document.title, window.location.pathname);
          challengeOpened = true;
        } catch (e) {
          console.error("Geçersiz veya bozuk meydan okuma linki", e);
        }
      }

      try {
        await loadTodayPuzzles({ keepActive: challengeOpened });
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
  // Doğru/yanlış cevap sesleri (menüdeki "Ses"); oyun sesleri her çalışta bu ayara bakar
  const [soundOn, setSoundOnState] = useState(soundEnabled);
  const setSoundOn = (on) => { setSoundEnabled(on); setSoundOnState(on); };
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
        openTab={modalState.friends === 'invite' ? 'friends' : null}
        onClose={() => toggleModal('friends', false)}
        theme={theme}
        user={user}
        username={username}
        puzzleId={activePuzzle?.type === 'daily' ? puzzleIdOf(activePuzzle) : dayKey()}
        onLogin={handleGoogleLogin}
        showFeedback={showFeedback}
        initialCode={pendingFriendCode}
        onRecordShare={() => recordEvent('share')}
      />
      <StoreModal isOpen={!!modalState.store} onClose={() => toggleModal('store', false)} adsRemoved={adsRemovedState} onAdsRemoved={() => setAdsRemovedState(true)} theme={theme} showFeedback={showFeedback} isLoggedIn={!!user} />
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

  // Bulmaca yoksa (ör. yüklenemediyse) oyun ekranı açılmaz; ana sayfa "tekrar dene" gösterir
  if (currentPage === 'game' && activePuzzle) {
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
          settings={{ darkMode, setDarkMode, colorBlindMode, setColorBlindMode, stats, notificationsOn, setNotifications, soundOn, setSoundOn, adsRemoved: adsRemovedState, onOpenStore: () => toggleModal('store', true), onPrivacyOptions: privacyOptions ? showPrivacyOptions : null }}
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
          leaderboardDifficulty={leaderboardDifficulty}
          onPlayDaily={playDaily}
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

      <LeaderboardModal isOpen={modalState.leaderboard} onClose={() => toggleModal('leaderboard', false)} theme={theme} colors={currentColors} leaderboardData={leaderboardData} userAvatar={userAvatar} username={username} isLoading={isLoadingLeaderboard} onTabChange={fetchLeaderboard} defaultDifficulty={leaderboardDifficulty} onOpenFriends={() => { toggleModal('leaderboard', false); toggleModal('friends', true); }} />
      <HowToPlayModal isOpen={modalState.howToPlay} onClose={() => toggleModal('howToPlay', false)} theme={theme} colors={currentColors} />
      <CalendarModal isOpen={modalState.calendar} onClose={() => toggleModal('calendar', false)} theme={theme} colors={currentColors} onSelectDate={loadPastPuzzle} defaultDifficulty={leaderboardDifficulty} />
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
      <UniqueNameModal
        isOpen={showRenameModal}
        rename
        theme={theme}
        colors={currentColors}
        onCancel={() => setShowRenameModal(false)}
        onComplete={(finalName) => {
          setUsername(finalName);
          setShowRenameModal(false);
          showFeedback(`İsmin artık ${finalName}!`, "success");
        }}
      />
      <ProfileModal
        isOpen={!!modalState.profile}
        onClose={() => toggleModal('profile', false)}
        theme={theme}
        user={user}
        username={username}
        userAvatar={userAvatar}
        onSelectAvatar={setUserAvatar}
        stats={stats}
        onLogin={() => { toggleModal('profile', false); handleGoogleLogin(); }}
        onLogout={() => { toggleModal('profile', false); handleLogout(); }}
        onRename={() => setShowRenameModal(true)}
        onOpenFriends={() => { toggleModal('profile', false); toggleModal('friends', 'invite'); }}
        onOpenAchievements={() => { toggleModal('profile', false); toggleModal('achievements', true); }}
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
                <div onClick={() => toggleModal('profile', true)} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors">
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
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => toggleModal('profile', true)}
              aria-label="Profil"
              className="flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full bg-white/10 border border-white/15 active:scale-95 transition-transform max-w-[150px]"
            >
              <span className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-lg flex-none">{userAvatar.icon}</span>
              <span className="text-xs font-bold truncate">{user ? username : 'Profil'}</span>
              {!user && <span className="w-2 h-2 rounded-full bg-yellow-400 flex-none" aria-label="İlerleme kaydedilmedi" />}
            </button>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Menü">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </nav>

      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} toggleModal={toggleModal} settings={{ darkMode, setDarkMode, colorBlindMode, setColorBlindMode, notificationsOn, setNotifications, soundOn, setSoundOn, adsRemoved: adsRemovedState, onOpenStore: () => toggleModal('store', true), onPrivacyOptions: privacyOptions ? showPrivacyOptions : null }} theme={theme} user={user} onLogout={handleLogout} onLogin={handleGoogleLogin} />

      <section className="flex-1 flex flex-col justify-center pb-12 md:pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full mb-5 md:mb-8">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span>
            <span className="inline-block text-[11px] font-bold tracking-widest uppercase opacity-90 animate-bounce">Günün kelime zinciri hazır</span>
          </div>

          <h1 className="text-[2.6rem] md:text-6xl lg:text-8xl font-black mb-4 md:mb-6 tracking-tighter uppercase italic leading-[0.95]">
            Kelimeleri <br />
            <span className={colorBlindMode ? 'text-blue-500' : 'text-green-500'}>Evrimleştir</span>
          </h1>

          <p className="text-base md:text-2xl text-blue-200/75 mb-8 md:mb-12 max-w-md md:max-w-2xl mx-auto font-medium leading-relaxed">
            Başlangıç kelimesinden hedefe, her adımda tek harf değiştirerek ulaş.
          </p>

          <div className="w-full max-w-xs sm:max-w-sm mx-auto flex flex-col gap-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-60 -mb-0.5">Günün bulmacası</p>
            <div className="grid grid-cols-2 gap-2.5">
              {DIFFICULTY_ORDER.map((d) => {
                const puzzle = dailyPuzzles?.[d];
                const loading = !dailyPuzzles;
                const played = puzzle && readPref(`evolvo_played_${puzzle.puzzleId}`);
                return (
                  <button
                    key={d}
                    onClick={() => playDaily(d)}
                    disabled={!puzzle && !loading}
                    className={`${d === 'zor' ? currentColors.btnPrimary : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'} w-full py-3 rounded-2xl font-black text-base tracking-wide flex flex-col items-center justify-center leading-tight transition-all active:scale-[0.97] shadow-lg shadow-green-900/30 disabled:opacity-40`}
                  >
                    <span className="flex items-center gap-1.5">
                      {played ? <CheckCircle2 size={16} /> : <Play fill="currentColor" size={15} />} {DIFFICULTIES[d].label.toLocaleUpperCase('tr-TR')}
                    </span>
                    <span className="text-[10px] font-bold opacity-80 normal-case tracking-normal">{puzzle || loading ? DIFFICULTIES[d].hint : dailyError ? 'Yüklenemedi' : 'Yarın hazır'}</span>
                  </button>
                );
              })}
            </div>
            {dailyError && (
              <button onClick={() => loadTodayPuzzles()} className="py-2.5 rounded-2xl font-bold text-sm bg-red-500/15 border border-red-400/40 text-red-200 active:scale-[0.97] transition-all">
                Bulmaca yüklenemedi — tekrar dene
              </button>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {showAppUi && (
                <button onClick={() => setCurrentPage('unlimited_menu')} className="py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 text-white active:scale-[0.97] transition-all shadow-md shadow-purple-900/30">
                  <RouteIcon size={16} /> Evrim Yolu
                </button>
              )}
              <button onClick={() => toggleModal('leaderboard', true)} className={`${showAppUi ? '' : 'col-span-2'} py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 bg-white/10 border border-white/10 active:scale-[0.97] transition-all`}>
                <Trophy size={16} className="text-yellow-400" /> Sıralama
              </button>
            </div>
            {showAppUi && (
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
