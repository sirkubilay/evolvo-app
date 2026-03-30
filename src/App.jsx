import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { getApp } from "firebase/app";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, Trophy, ChevronRight, Menu, X, 
  Info, Star, Lightbulb, Delete, User, 
  BarChart2, HelpCircle, Calendar as CalendarIcon, Medal, Swords, Moon, Eye, 
  CheckCircle2, AlertCircle, Loader2, Book, ChevronLeft, ChevronRight as ChevronRightIcon,
  Timer, Coffee, Sunrise, Sunset, Sparkles, Crosshair, Plus, Minus, Copy, Share2, Brain, Link as LinkIcon, Twitter, MessageCircle, Settings, Mail
} from 'lucide-react';
const injectStyles = () => {
  if (typeof document === 'undefined' || document.getElementById('evolvo-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'evolvo-global-styles';
  style.innerHTML = `
    .shadow-blue-500\\/30 { box-shadow: 0 0 20px 2px rgba(59, 130, 246, 0.3); }
    .shadow-green-500\\/30 { box-shadow: 0 0 20px 2px rgba(34, 197, 94, 0.3); }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } 
    .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
    
    @keyframes flip-letter { 0% { transform: rotateX(-90deg); opacity: 0; } 100% { transform: rotateX(0); opacity: 1; } }
    .animate-flip-letter { animation: flip-letter 0.5s ease-out both; backface-visibility: hidden; }
    
    @keyframes flip-correct { 
       0% { transform: rotateX(0deg); background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: white;} 
       49% { background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: transparent;}
       50% { transform: rotateX(-90deg); background-color: #16a34a; border-color: #15803d; color: transparent; } 
       51% { color: white; }
       100% { transform: rotateX(0deg); background-color: #16a34a; border-color: #15803d; color: white; } 
    }
    .animate-flip-correct { animation: flip-correct 0.6s ease-in-out forwards !important; backface-visibility: hidden; }
    
    .scrollbar-thin::-webkit-scrollbar { width: 4px; }
    .scrollbar-thumb-white\\/10::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
  `;
  document.head.appendChild(style);
};
injectStyles();
// --- MOCK VERİLER & SÖZLÜK ---
const TURKISH_DICTIONARY_MOCK = [
  "YATAK", "YASAK", "YANAK", "YANIK", "TANIK", "SANIK", "SADIK", "SAZIK", "KAZIK", "KAZAK",
  "EVRAK", "EVRAT", "EVKAT", "EUKAT", "KUKAT", "KONAT", "KONAK", 
  "KONUK", "KONUT", "KOMUT", "VURAK", "DURAK", "DORAK", "KORAK", "TARAK", "YARAK", "BARAK", "KABAK", "TABAK",
  "KALEM", "KELAM", "SELAM", "SALAM", "SALIM", "SALIK", "BALIK"
];

const getStartDate = () => new Date(2025, 10, 1);

const ACHIEVEMENTS = [
  { id: 1, title: "İlk Adım", desc: "İlk oyununu tamamla.", icon: '👣', xp: 10, category: 'easy' },
  { id: 2, title: "Meraklı Kedi", desc: "Bir kelimenin anlamına bak.", icon: '📖', xp: 10, category: 'easy' },
  { id: 3, title: "Yardım Eli", desc: "İlk kez ipucu kullan.", icon: '💡', xp: 10, category: 'easy' },
  { id: 4, title: "Gece Kuşu", desc: "Koyu modu aktif et.", icon: '🌙', xp: 10, category: 'easy' },
  { id: 5, title: "Kendini Göster", desc: "Bir avatar seç.", icon: '👤', xp: 10, category: 'easy' },
  { id: 6, title: "Hız Tutkunu", desc: "Bulmacayı 60 saniyenin altında bitir.", icon: '⏱️', xp: 25, category: 'medium' },
  { id: 7, title: "Sözlük Kurdu", desc: "Hiç ipucu kullanmadan kazan.", icon: '📚', xp: 25, category: 'medium' },
  { id: 8, title: "İstikrarlı", desc: "3 gün üst üste oyna.", icon: '📅', xp: 25, category: 'medium' },
  { id: 9, title: "Keskin Nişancı", desc: "Hatalı kelime girmeden bitir.", icon: '🎯', xp: 25, category: 'medium' },
  { id: 10, title: "Erkenci Kuş", desc: "Sabah 06:00 - 09:00 arası oyna.", icon: '🌅', xp: 25, category: 'medium' },
  { id: 11, title: "Efsane", desc: "Tam 1000 puan al (Optimal + 0 sn).", icon: '🏆', xp: 50, category: 'hard' },
  { id: 12, title: "Maratoncu", desc: "30 gün üst üste oyna.", icon: '🏅', xp: 50, category: 'hard' },
  { id: 13, title: "Zamanı Durduran", desc: "30 saniyenin altında bitir.", icon: '⚡', xp: 50, category: 'hard' },
  { id: 14, title: "Kelime Hazinesi", desc: "Toplam 100 farklı kelime türet.", icon: '🧠', xp: 50, category: 'hard' },
  { id: 15, title: "Yenilmez", desc: "10 gün boyunca hiç kaybetme.", icon: '🛡️', xp: 50, category: 'hard' },
  { id: 16, title: "Bukalemun", desc: "10 farklı avatar değiştir.", icon: '🎨', xp: 75, category: 'expert' },
  { id: 17, title: "Gece Yarısı Ekspresi", desc: "Gece 00:00 - 01:00 arası oyna.", icon: '🦉', xp: 75, category: 'expert' },
  { id: 18, title: "Sosyalleşme", desc: "Skorunu 5 kez paylaş.", icon: '🔗', xp: 75, category: 'expert' },
  { id: 19, title: "Evrimleşmiş Zihin", desc: "Toplam 500 bulmaca çöz.", icon: '🚀', xp: 100, category: 'expert' },
  { id: 20, title: "Hatasız Kul Olmaz", desc: "Son hakkınla oyunu kazan.", icon: '⚠️', xp: 75, category: 'expert' },
  { id: 21, title: "Kahve Molası", desc: "Öğle arasında (12:00-13:00) oyna.", icon: '☕', xp: 20, category: 'bonus' },
  { id: 22, title: "Hafta Sonu Keyfi", desc: "Cumartesi ve Pazar oyna.", icon: '😊', xp: 20, category: 'bonus' },
  { id: 23, title: "Dedektif", desc: "50 kelimenin anlamına bak.", icon: '🕵️', xp: 40, category: 'bonus' },
  { id: 24, title: "Seri Katil", desc: "7 günlük galibiyet serisi yap.", icon: '🔥', xp: 60, category: 'bonus' },
  { id: 25, title: "EVOLVO Ustası", desc: "Tüm başarımları tamamla.", icon: '👑', xp: 500, category: 'bonus' },
];

const AVATARS = [
  { id: 1, icon: '👤', label: 'Default' },
  { id: 2, icon: '🐱', label: 'Kedi' },
  { id: 3, icon: '🐶', label: 'Köpek' },
  { id: 4, icon: '👻', label: 'Hayalet' },
  { id: 5, icon: '🚀', label: 'Roket' },
  { id: 6, icon: '⚡', label: 'Yıldırım' },
  { id: 7, icon: '👑', label: 'Taç' },
  { id: 8, icon: '💀', label: 'Kuru Kafa' },
  { id: 9, icon: '😎', label: 'Gülen Yüz' },
  { id: 10, icon: '❤️', label: 'Kalp' },
  { id: 11, icon: '⭐', label: 'Yıldız' },
  { id: 12, icon: '🔥', label: 'Ateş' },
  { id: 13, icon: '💎', label: 'Elmas' },
  { id: 14, icon: '🎮', label: 'Oyun' },
  { id: 15, icon: '🐠', label: 'Balık' },
  { id: 16, icon: '🐦', label: 'Kuş' },
  { id: 17, icon: '🐰', label: 'Tavşan' },
  { id: 18, icon: '🐢', label: 'Kaplumbağa' },
  { id: 19, icon: '💼', label: 'İş' },
  { id: 20, icon: '🎓', label: 'Mezun' },
  { id: 21, icon: '🎨', label: 'Sanat' },
  { id: 22, icon: '🎵', label: 'Müzik' },
  { id: 23, icon: '📷', label: 'Kamera' },
  { id: 24, icon: '🦄', label: 'Unicorn' },
  { id: 25, icon: '🦖', label: 'Dinozor' },
  { id: 26, icon: '🐙', label: 'Ahtapot' },
  { id: 27, icon: '🦋', label: 'Kelebek' },
  { id: 28, icon: '🍄', label: 'Mantar' },
  { id: 29, icon: '🍕', label: 'Pizza' },
  { id: 30, icon: '⚽', label: 'Futbol' }, // DÜZELTİLDİ!
];

const ADJECTIVES = ["Hızlı", "Cesur", "Bilge", "Çılgın", "Gizemli", "Zehirli", "Vahşi", "Gölge", "Parlak", "Buzlu", "Ateşli", "Sessiz", "Kayıp", "Efsane", "Yırtıcı", "Demir", "Çelik", "Uçan", "Altın", "Bordo"];
const NOUNS = ["Dinozor", "Porsuk", "Baykuş", "Kedi", "Kaplan", "Kurt", "Şahin", "Ejderha", "Yılan", "Panter", "Akrep", "Kartal", "Boğa", "Ayı", "Timsah", "Kuzgun", "Anka", "Korsan", "Ninja", "Robot"];

const generateRandomName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${adj}_${noun}_${num}`;
};

const THEMES = {
  standard: {
    bg: "bg-[#001f3f]",
    text: "text-white",
    panel: "bg-[#00162d]",
    panelBorder: "border-white/10",
    key: "bg-[#1e3a5f]",
    keyText: "text-white",
    keyActive: "bg-[#2a4d7d]",
    success: "bg-green-600 border-green-800",
    error: "bg-red-900/50 border-red-500 text-red-100",
    btnPrimary: "bg-green-600 hover:bg-green-500 text-white",
    btnSecondary: "bg-white/5 hover:bg-white/10 text-white",
    emptyCell: "bg-white/5 border-white/10",
    logoSuccess: "bg-green-600",
    logoError: "bg-red-600"
  },
  dark: {
    bg: "bg-black",
    text: "text-gray-100",
    panel: "bg-gray-900",
    panelBorder: "border-gray-800",
    key: "bg-gray-800",
    keyText: "text-white",
    keyActive: "bg-gray-700",
    success: "bg-green-700 border-green-900",
    error: "bg-red-900/80 border-red-700 text-red-100",
    btnPrimary: "bg-green-700 hover:bg-green-600 text-white",
    btnSecondary: "bg-gray-800 hover:bg-gray-700 text-white",
    emptyCell: "bg-gray-800 border-gray-700",
    logoSuccess: "bg-green-700",
    logoError: "bg-red-700"
  }
};

const COLOR_BLIND_THEME = {
  success: "bg-blue-600 border-blue-800 text-white",
  error: "bg-orange-600 border-orange-800 text-white",
  logoSuccess: "bg-blue-600",
  logoError: "bg-orange-600"
};

const firebaseConfig = {
  apiKey: "AIzaSyAV9IqH01Msun0mlLdl0ALnhuzWCgnfuhk",
  authDomain: "evolvogame-21a23.firebaseapp.com",
  projectId: "evolvogame-21a23",
  storageBucket: "evolvogame-21a23.firebasestorage.app",
  messagingSenderId: "64945678615",
  appId: "1:64945678615:web:8937018a5056c50f306f52",
  measurementId: "G-60CHDCVBPD"
};
const app = initializeApp(firebaseConfig);

const App = () => {
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
  const [userAvatar, setUserAvatar] = useState(AVATARS[0]);
  const [darkMode, setDarkMode] = useState(false);
  const [colorBlindMode, setColorBlindMode] = useState(false);
  const [sozlukSeti, setSozlukSeti] = useState(new Set());
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [activePuzzle, setActivePuzzle] = useState(null); 
  const [isPuzzleLoading, setIsPuzzleLoading] = useState(true); 
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
  
  const [stats, setStats] = useState(() => {
    try {
      const savedStats = localStorage.getItem('evolvo_stats');
      return savedStats ? JSON.parse(savedStats) : {
        played: 0, wins: 0, currentStreak: 0, maxStreak: 0, dictionaryLookups: 0, hintsUsed: 0
      };
    } catch(e) {
      return { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, dictionaryLookups: 0, hintsUsed: 0 };
    }
  });
  
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
      fetchLeaderboard();
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

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const functions = getFunctions(getApp(), 'europe-west1');
      const getLeaderboardFn = httpsCallable(functions, 'getLeaderboard');
      
      const todayStr = new Date().toISOString().split('T')[0];
      const currentPuzzleId = activePuzzle ? activePuzzle.date : todayStr;

      const result = await getLeaderboardFn({
        puzzleId: currentPuzzleId, 
        currentPlayerName: username
      });
      setLeaderboardData(result.data.topScores || []);
    } catch (error) {
      console.error("Liderlik tablosu çekilemedi:", error);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const handleGoogleLogin = async () => {
    const auth = getAuth();
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
          showFeedback(`Tekrar hoş geldin, efsane ${dbUsername}!`, "success");
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

  const updateStats = (type, payload) => {
    setStats(prev => {
      const newStats = { ...prev };
      
      if (type === 'game_end') {
        newStats.played += 1;
        newStats.hintsUsed += payload.hints;
        if (payload.win) {
          newStats.wins += 1;
          newStats.currentStreak += 1;
          if (newStats.currentStreak > newStats.maxStreak) {
            newStats.maxStreak = newStats.currentStreak;
          }
          
          setLeaderboardData(prevL => {
             const newEntry = { name: username || "Misafir", score: payload.score, avatar: userAvatar, date: new Date().toISOString() };
             const newData = [...prevL, newEntry].sort((a, b) => b.score - a.score).slice(0, 20);
             localStorage.setItem('evolvo_leaderboard', JSON.stringify(newData));
             return newData;
          });
        } else {
          newStats.currentStreak = 0;
        }
      } else if (type === 'dictionary') {
        newStats.dictionaryLookups += 1;
      }

      localStorage.setItem('evolvo_stats', JSON.stringify(newStats));
      return newStats;
    });
  };

  const handleStartCustomGame = (puzzleData) => {
    setActivePuzzle(puzzleData);
    setCurrentPage('game');
  };

  const globalDefinitionModal = (
    <DefinitionModal word={modalState.definition} onClose={() => toggleModal('definition', null)} theme={theme} />
  );

  if (isPuzzleLoading) {
    return (
      <div className="min-h-screen bg-[#001f3f] flex flex-col items-center justify-center text-white">
        <Loader2 size={64} className="animate-spin text-green-500 mb-6" />
        <h2 className="text-2xl font-black italic animate-pulse">EVOLVO BAĞLANIYOR...</h2>
      </div>
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
          key={activePuzzle.type + activePuzzle.date + activePuzzle.start}
          username={username}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
          onBack={() => setCurrentPage('landing')}
          theme={theme}
          colors={currentColors}
          toggleModal={toggleModal}
          modalState={modalState}
          settings={{ darkMode, setDarkMode, colorBlindMode, setColorBlindMode, stats }}
          updateStats={updateStats}
          puzzleData={activePuzzle} 
          leaderboardData={leaderboardData}
          onStartCustomGame={handleStartCustomGame}
          onLoadPastPuzzle={loadPastPuzzle}
          user={user}
          onLogout={handleLogout}
          message={message}
          showFeedback={showFeedback}
          onLogin={handleGoogleLogin}
          checkTDK={checkTDK}
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

      <LeaderboardModal isOpen={modalState.leaderboard} onClose={() => toggleModal('leaderboard', false)} theme={theme} colors={currentColors} leaderboardData={leaderboardData} userAvatar={userAvatar} username={username} />
      <HowToPlayModal isOpen={modalState.howToPlay} onClose={() => toggleModal('howToPlay', false)} theme={theme} colors={currentColors} />
      <CalendarModal isOpen={modalState.calendar} onClose={() => toggleModal('calendar', false)} theme={theme} colors={currentColors} onSelectDate={loadPastPuzzle} />
      <StatsModal isOpen={modalState.stats} onClose={() => toggleModal('stats', false)} theme={theme} colors={currentColors} stats={stats} />
      <AchievementsModal isOpen={modalState.achievements} onClose={() => toggleModal('achievements', false)} theme={theme} colors={currentColors} />
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

      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} toggleModal={toggleModal} settings={{ darkMode, setDarkMode, colorBlindMode, setColorBlindMode }} theme={theme} user={user} onLogout={handleLogout} onLogin={handleGoogleLogin} />

      <section className="flex-1 flex flex-col justify-center pb-12 md:pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className={`inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full mb-6 md:mb-8 animate-bounce`}>
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold tracking-wide uppercase">Günün Kelime Zinciri Hazır!</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black mb-6 tracking-tighter uppercase italic leading-none">
            Kelimeleri <br className="hidden md:block" />
            <span className={colorBlindMode ? 'text-blue-500' : 'text-green-500'}>Evrimleştir</span>
          </h1>
          
          <p className="text-lg md:text-2xl text-blue-200/80 mb-8 md:mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
            Başlangıç kelimesinden hedef kelimeye sadece birer harf değiştirerek ulaşabilir misin?
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button onClick={() => setCurrentPage('game')} className={`${currentColors.btnPrimary} px-10 py-5 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-xl`}>
              <Play fill="currentColor" size={24} /> HEMEN OYNA
            </button>
            <button onClick={() => toggleModal('leaderboard', true)} className={`${currentColors.btnSecondary} px-10 py-5 rounded-3xl font-bold text-xl flex items-center justify-center gap-3 transition-all`}>
              <Trophy size={24} className="text-yellow-500" /> Sıralama
            </button>
          </div>
        </div>
      </section>

      <footer className={`py-8 text-center border-t ${theme.panelBorder} opacity-60 text-sm mt-auto`}>
        <p>© 2026 Evolvo. Tüm hakları saklıdır.</p>
        <div className="flex justify-center gap-4 mt-2 font-bold text-xs uppercase tracking-widest">
          <button onClick={() => toggleModal('privacy', true)} className="hover:underline">Gizlilik & KVKK</button>
          <button onClick={() => toggleModal('contact', true)} className="hover:underline">İletişim</button>
        </div>
      </footer>
    </div>
  );
};

// --- OYUN SAYFASI ---
const GamePage = ({ onBack, username, userAvatar, setUserAvatar, theme, colors, toggleModal, modalState, settings, updateStats, puzzleData, onStartCustomGame, onLoadPastPuzzle, user, onLogout, message, showFeedback, onLogin, checkTDK, leaderboardData }) => {
  const [history, setHistory] = useState([puzzleData.start]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [winningRowAnimation, setWinningRowAnimation] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [lockedIndices, setLockedIndices] = useState([0]); 
  const [rowAnimation, setRowAnimation] = useState(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [scoreDetails, setScoreDetails] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  
  const playSuccessSound = () => { try { new Audio('/success.mp3').play().catch(e=>console.log(e)); } catch(e){} };
  const playErrorSound = () => { try { new Audio('/error.mp3').play().catch(e=>console.log(e)); } catch(e){} };
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
    const today = new Date().toLocaleDateString('tr-TR');
    const isPlayedToday = localStorage.getItem(`evolvo_played_${today}`);
    
    if (isPlayedToday === 'true') {
      setIsGameOver(true); // Oynadıysa direkt klavyeyi kilitle
    }
  }, []);
  // skipSound parametresi eklendi (ikinci kez çalmaması için)
  const calculateAndFinish = async (finalHistory, didWin, skipSound = false) => {
    localStorage.removeItem(`evolvo_timer_${puzzleData.date}`);
    setIsGameOver(true);
    setIsWon(didWin);
    
    // 🔥 İŞTE BURASI: Oyun bittiği an (kazansa da kaybetse de) tarayıcıya not düşüyoruz!
    const today = new Date().toLocaleDateString('tr-TR');
    localStorage.setItem(`evolvo_played_${today}`, 'true');
    
    let score = 0;
    const hintsUsed = 3 - hintsLeft;

    if (didWin) {
        const stepsUsed = finalHistory.length - 1;
        const optimal = puzzleData.optimalSteps || Math.max(1, stepsUsed - 2); 
        const diff = stepsUsed - optimal;

        let wordScore = 800;
        if (diff <= 0) wordScore = 1000;
        else if (diff === 1) wordScore = 900;

        const timeScore = Math.max(0, 1000 - timer);
        const weightedScore = (wordScore * 0.4) + (timeScore * 0.6);
        const penalty = hintsUsed * 150;
        score = Math.max(0, Math.floor(weightedScore - penalty));
        
        showFeedback("TEBRİKLER!", "success");
        if(!skipSound) playSuccessSound(); 

        try {
          if (!executeRecaptcha) {
               console.error("reCAPTCHA henüz yüklenmedi!");
               return;
           }
           const recaptchaToken = await executeRecaptcha("saveScore")
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
             recaptchaToken: recaptchaToken 
           });
           showFeedback("Skor Liderlik Tablosuna Kaydedildi! 🏆", "success");
        } catch (err) {
           console.error("Skor kaydedilirken hata:", err);
           showFeedback("Skor buluta kaydedilemedi.", "error");
        }
    } else {
        showFeedback("Hakkınız bitti", "error");
        playErrorSound(); 
    }

    setScoreDetails({ total: score, penalty: hintsUsed * 150 });
    updateStats('game_end', { win: didWin, hints: hintsUsed, score: score });
  };

  const handleHint = async (e) => {
    if (e && e.currentTarget) e.currentTarget.blur();
    if (puzzleData.type === 'custom') {
      showFeedback("Bu modda ipucu kapalıdır.", "info");
      return;
    }
    if (isGameOver || hintsLeft <= 0) return;

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
        playErrorSound(); 
        return; 
      }
      if (!isOneLetterDifferent(previousWord, currentGuess)) {
        showFeedback("Geçersiz Kelime", "error");
        playErrorSound();
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      // 🔥 İŞTE YENİ EKLENEN KISIM: KELİME TEKRARI KONTROLÜ 🔥
      if (history.includes(currentGuess)) {
        showFeedback("Bu kelimeyi zaten kullandın!", "error");
        playErrorSound();
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      setIsLoading(true);
      const isValid = await checkTDK(currentGuess);
      setIsLoading(false);

      if (!isValid) {
        showFeedback("Geçersiz Kelime", "error");
        playErrorSound();
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
            setHistory(p => p.slice(0, -1));
          } else {
            showFeedback("Bu satır kilitli", "info");
            setRowAnimation('shake');
            setTimeout(() => setRowAnimation(null), 500);
          }
        }
      }
    } else if (currentGuess.length < wordLength && /^[A-ZÇĞİÖŞÜ]$/.test(key)) {
      setCurrentGuess(p => p + key);
    }
  }, [currentGuess, history, isGameOver, isLoading, winningRowAnimation, lockedIndices, maxMoves, timer, hintsLeft, wordLength]);

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
    if (puzzleData.type === 'daily') updateStats('dictionary'); 
  };

  const handleSocialShare = (platform) => {
    const shareText = `🧩 EVOLVO MEYDAN OKUMASI 🧩\n\nKelimelerle aran nasıl? Sana özel bir bulmaca hazırladım!\n\n🚀 Başlangıç: ${puzzleData.start}\n🏁 Hedef: ${puzzleData.target}\n\nBakalım bu zinciri çözebilecek misin? 👇`;
    const shareUrl = window.location.href; 
    
    if (platform === 'copy') {
      try {
        navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        showFeedback("Panoya kopyalandı!", "success");
      } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = `${shareText}\n${shareUrl}`;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try { document.execCommand('copy'); showFeedback("Panoya kopyalandı!", "success"); } 
        catch (err) { showFeedback("Kopyalama başarısız", "error"); }
        document.body.removeChild(textArea);
      }
    } else if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`, '_blank');
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    }
    setShareOpen(false);
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
      <LeaderboardModal isOpen={modalState.leaderboard} onClose={() => toggleModal('leaderboard', false)} theme={theme} colors={colors} userAvatar={userAvatar} username={username} leaderboardData={leaderboardData} />
      <HowToPlayModal isOpen={modalState.howToPlay} onClose={() => toggleModal('howToPlay', false)} theme={theme} colors={colors} />
      <CalendarModal isOpen={modalState.calendar} onClose={() => toggleModal('calendar', false)} theme={theme} colors={colors} />
      <StatsModal isOpen={modalState.stats} onClose={() => toggleModal('stats', false)} theme={theme} colors={colors} stats={settings.stats || {}} />
      <AchievementsModal isOpen={modalState.achievements} onClose={() => toggleModal('achievements', false)} theme={theme} colors={colors} />
      <AvatarModal isOpen={modalState.avatar} onClose={() => toggleModal('avatar', false)} theme={theme} colors={colors} userAvatar={userAvatar} username={username} onSelect={(av) => { setUserAvatar(av); toggleModal('avatar', false); }} />

      <div className={`flex-none z-20 ${settings.darkMode ? 'bg-black' : 'bg-[#001f3f]'}`}>
         <header className={`px-4 py-3 flex items-center justify-between border-b ${theme.panelBorder} ${settings.darkMode ? 'bg-black/95' : 'bg-[#001f3f]/95'} backdrop-blur-md`}>
            <div onClick={() => toggleModal('avatar', true)} className={`flex items-center gap-1 sm:gap-2 ${settings.darkMode ? 'bg-gray-800' : 'bg-white/10'} px-2 sm:px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity max-w-[110px] sm:max-w-[200px]`}>
               <div className="text-lg sm:text-xl flex items-center justify-center flex-shrink-0">{userAvatar.icon}</div>
               <span className="font-bold text-[10px] sm:text-xs truncate">{username}</span>
            </div>
            
            <div onClick={onBack} className="cursor-pointer transform hover:scale-105 transition-transform absolute left-1/2 -translate-x-1/2">
               <Logo colors={colors} />
            </div>
            
            <button onClick={() => setIsSideMenuOpen(true)} className={`p-2 hover:bg-white/10 rounded-lg transition-colors`}>
               <Menu size={24} />
            </button>
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

         <div className="w-full max-w-md mx-auto px-4 pb-4 pt-1">
            <div className="flex items-center justify-between gap-2 text-center">
               <div className={`flex-1 ${theme.emptyCell} rounded-xl p-2`}>
                  <span className="text-[9px] opacity-50 uppercase tracking-widest block">Başlangıç</span>
                  <span className="text-lg font-black tracking-tight">{puzzleData.start}</span>
               </div>
               <div className="relative">
                  <button onClick={handleHint} disabled={hintsLeft <= 0 || isGameOver || puzzleData.type === 'custom'} className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${hintsLeft > 0 && puzzleData.type !== 'custom' ? 'bg-yellow-500 hover:bg-yellow-400 text-[#001f3f]' : 'bg-gray-500 cursor-not-allowed opacity-50'}`}>
                     <Lightbulb size={20} />
                  </button>
                  {puzzleData.type === 'daily' && <span className={`absolute -bottom-2 -right-2 text-[9px] font-bold px-1.5 rounded-full border ${theme.panelBorder} ${hintsLeft > 0 ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'}`}>x{hintsLeft}</span>}
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
                  
                  {isWon && puzzleData.type === 'daily' && (
                     <div className="mb-6 animate-in zoom-in duration-500">
                        <span className="block text-xs uppercase font-bold opacity-60 mb-2">TOPLAM PUAN</span>
                        <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 tracking-tighter drop-shadow-lg">
                           {scoreDetails?.total || 0}
                        </span>
                     </div>
                  )}

                  {isWon && puzzleData.type === 'custom' && (
                     <div className="relative">
                       <button onClick={() => setShareOpen(!shareOpen)} className={`w-full ${colors.btnPrimary} py-4 rounded-xl font-black text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mb-4`}>
                          <Share2 /> MEYDAN OKUMAYI PAYLAŞ
                       </button>
                       {shareOpen && (
                         <div className="absolute bottom-full left-0 w-full mb-2 bg-[#00162d] border border-white/10 rounded-xl p-2 shadow-xl flex flex-col gap-1 animate-in zoom-in z-50">
                            <button onClick={() => handleSocialShare('copy')} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-sm font-bold text-left"><LinkIcon size={16}/> Link Kopyala</button>
                            <button onClick={() => handleSocialShare('whatsapp')} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-sm font-bold text-left text-green-400"><MessageCircle size={16}/> WhatsApp</button>
                            <button onClick={() => handleSocialShare('twitter')} className="flex items-center gap-3 p-3 hover:bg-white/10 rounded-lg text-sm font-bold text-left text-blue-400"><Twitter size={16}/> Twitter</button>
                         </div>
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
    </div>
  );
};

// --- YEPYENİ: MEYDAN OKUMA OLUŞTURUCU SAYFASI ---
const ChallengePage = ({ onBack, theme, colors, checkTDK, toggleModal }) => {
  const [wordLength, setWordLength] = useState(5);
  const [history, setHistory] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rowAnimation, setRowAnimation] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Modal State'leri
  const [moves, setMoves] = useState(0);
  const [shareLink, setShareLink] = useState(null);

  const showFeedback = (msg, type = "info") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 2500);
  };

  const encodeData = (data) => btoa(unescape(encodeURIComponent(JSON.stringify(data))));

  const handleKeyPress = useCallback(async (key) => {
    if (finalizeOpen || isLoading) return;

    if (key === 'Enter') {
      if (currentGuess.length !== wordLength) {
        showFeedback(`${wordLength} harfli olmalı!`, "error");
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      if (history.length > 0) {
        const previousWord = history[history.length - 1];
        let diffCount = 0;
        for (let i = 0; i < previousWord.length; i++) {
          if (previousWord[i] !== currentGuess[i]) diffCount++;
        }
        if (diffCount !== 1) {
          showFeedback("Sadece 1 harf değiştirebilirsiniz!", "error");
          setRowAnimation('shake');
          setTimeout(() => setRowAnimation(null), 500);
          return;
        }
      }

      // 🔥 İŞTE YENİ EKLENEN KISIM: MEYDAN OKUMADA KELİME TEKRARI KONTROLÜ 🔥
      if (history.includes(currentGuess)) {
        showFeedback("Bu kelimeyi zaten kullandın!", "error");
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      setIsLoading(true);
      const isValid = await checkTDK(currentGuess);
      setIsLoading(false);

      if (!isValid) {
        showFeedback("Geçersiz Kelime", "error");
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      setHistory(prev => [...prev, currentGuess]);
      setCurrentGuess("");

    } else if (key === 'Delete' || key === 'Backspace') {
      if (currentGuess.length > 0) {
        setCurrentGuess(p => p.slice(0, -1));
      } else if (history.length > 0) {
        setHistory(p => p.slice(0, -1));
      }
    } else if (currentGuess.length < wordLength && /^[A-ZÇĞİÖŞÜ]$/.test(key)) {
      setCurrentGuess(p => p + key);
    }
  }, [currentGuess, history, finalizeOpen, isLoading, wordLength, checkTDK]);

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

  const handleGenerateLink = () => {
    const minMoves = history.length - 1;
    const puzzleData = {
      type: 'custom',
      date: new Date().toISOString(),
      start: history[0],
      target: history[history.length - 1],
      solution: history,
      optimalSteps: minMoves,
      maxMoves: moves
    };
    const encoded = encodeData(puzzleData);
    const generatedLink = `${window.location.origin}${window.location.pathname}?challenge=${encoded}`;
    setShareLink(generatedLink);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(`🧩 EVOLVO MEYDAN OKUMASI 🧩\n\n🚀 Başlangıç: ${history[0]}\n🏁 Hedef: ${history[history.length - 1]}\n\nBu zinciri çözebilecek misin? 👇\n${text}`)
      .then(() => showFeedback("Link kopyalandı!", "success"))
      .catch(() => showFeedback("Kopyalanamadı", "error"));
  };

  const keyboardRows = [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'Enter']
  ];

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden ${theme.bg} ${theme.text}`}>
      <header className={`px-4 py-3 flex items-center justify-between border-b ${theme.panelBorder} bg-black/40 backdrop-blur-md z-20`}>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft size={24} /></button>
        <h2 className="text-lg font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 flex items-center gap-2 drop-shadow-lg"><Swords size={20} className="text-blue-400"/> MEYDAN OKUMA KUR</h2>
        <div className="w-8"></div>
      </header>

      <div className="relative h-10 w-full flex items-center justify-center z-20"> 
        {message && (
            <div className={`absolute top-1 px-4 py-2 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center gap-2 font-bold text-xs border ${message.type === 'success' ? colors.success : colors.error}`}>
              {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {message.text}
            </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto px-4 w-full flex flex-col items-center relative pb-64 pt-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
         <div className="w-full max-w-md mx-auto space-y-2">
            
            <div className="text-center mb-6 mt-2 animate-in fade-in slide-in-from-top-4">
                <h3 className="text-2xl font-black italic uppercase tracking-widest text-blue-100 drop-shadow-md">Zinciri Oluştur</h3>
                <p className="text-xs font-medium opacity-60 mt-1">Kelimeleri evrimleştirerek kendi bulmacanı tasarla.</p>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl mb-8 ${theme.panel} border ${theme.panelBorder} shadow-lg animate-in fade-in zoom-in`}>
              <span className="opacity-60 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Settings size={16}/> Harf Sayısı</span>
              {history.length === 0 ? (
                <div className="flex items-center gap-4">
                  <button onClick={() => setWordLength(Math.max(4, wordLength - 1))} className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-90"><Minus size={18}/></button>
                  <span className="text-3xl font-black text-blue-400 drop-shadow-md">{wordLength}</span>
                  <button onClick={() => setWordLength(Math.min(7, wordLength + 1))} className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-90"><Plus size={18}/></button>
                </div>
              ) : (
                <span className="text-3xl font-black text-green-400 px-4 drop-shadow-md">{wordLength}</span>
              )}
            </div>

            {history.map((word, idx) => (
               <div key={idx} className="relative flex items-center justify-center w-fit mx-auto">
                  <div className="flex gap-1 sm:gap-1.5 z-10" style={{ perspective: '1000px' }}>
                     {word.split('').map((char, i) => (
                        <div key={i} 
                             className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center text-lg md:text-xl font-black rounded-lg border-2 ${idx === 0 ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-green-600 border-green-700 text-white shadow-sm'}`}
                             style={idx === history.length - 1 && idx !== 0 ? { 
                               animation: `flip-letter 0.5s ease-out both`, 
                               animationDelay: `${i * 150}ms` 
                             } : {}}
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
                  <div className="flex gap-1 sm:gap-1.5 z-10" style={{ perspective: '1000px' }}>
                     {[...Array(wordLength)].map((_, i) => (
                        <div key={i} 
                          className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center text-lg md:text-xl font-black rounded-lg border-2 ${rowAnimation === 'shake' ? colors.errorBg + ' ' + colors.errorBorder : (winningRowAnimation ? 'bg-green-600 border-green-700 text-white shadow-green-500/30 shadow-lg' : 'bg-white/5 border-white/10 shadow-inner')}`}
                          style={winningRowAnimation ? { 
                            animation: `flip-correct 0.6s ease-in-out forwards`,
                            animationDelay: `${i * 150}ms`,
                            backfaceVisibility: 'hidden'
                          } : {}}
                        >
                           {isLoading && i === Math.floor(wordLength/2) ? <Loader2 className="animate-spin text-green-500" /> : (
                              currentGuess[i] ? currentGuess[i] : (i === currentGuess.length ? <span className="animate-pulse opacity-50 font-light text-2xl md:text-3xl">|</span> : "")
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {history.length >= 4 && !finalizeOpen && (
               <button onClick={() => { setMoves(history.length - 1); setFinalizeOpen(true); }} className={`mt-10 w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 py-4 rounded-xl font-black text-lg shadow-2xl shadow-blue-500/20 animate-in zoom-in transition-transform active:scale-95`}>
                   BULMACAYI BİTİR VE PAYLAŞ
               </button>
            )}
         </div>
      </main>

      <div className={`fixed bottom-0 left-0 w-full bg-black/40 backdrop-blur-xl p-1 pb-4 border-t ${theme.panelBorder} z-30 animate-in slide-in-from-bottom-8`}>
         <div className="max-w-xl mx-auto space-y-1">
            {keyboardRows.map((row, i) => (
               <div key={i} className="flex justify-center gap-1">
                  {row.map(key => (
                     <button 
                        key={key} 
                        onPointerDown={(e) => { 
                           e.preventDefault(); 
                           handleKeyPress(key === 'Enter' ? 'Enter' : key === 'Backspace' ? 'Backspace' : key); 
                        }} 
                        className={`h-11 md:h-12 flex-1 rounded-md font-bold text-sm md:text-base transition-colors shadow-sm ${key === 'Enter' ? `px-2 md:px-3 ${colors.btnPrimary}` : key === 'Ö' || key === 'Ç' ? 'flex-[0.8]' : ''} ${key !== 'Enter' ? `${theme.key} ${theme.keyText} hover:brightness-110 active:scale-95` : ''}`}
                     >
                        {key}
                     </button>
                  ))}
                  {i === 2 && (
                     <button 
                        key="backspace" 
                        onPointerDown={(e) => { 
                           e.preventDefault(); 
                           handleKeyPress('Backspace'); 
                        }} 
                        className="h-11 md:h-12 px-3 md:px-4 bg-red-900/50 text-red-100 rounded-md flex items-center justify-center hover:bg-red-900/70 transition-colors active:scale-95 shadow-sm"
                     >
                        <Delete size={20} />
                     </button>
                  )}
               </div>
            ))}
         </div>
      </div>

      {finalizeOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className={`${theme.panel} w-full max-w-md rounded-[2rem] p-8 border ${theme.panelBorder} shadow-2xl animate-in zoom-in duration-300 relative`}>
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 uppercase tracking-tighter">SON ADIM</h2>
                {!shareLink && <button onClick={() => setFinalizeOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>}
             </div>

             <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
               <label className="text-xs font-bold uppercase opacity-60 tracking-widest block text-center">Oyuncuya Verilecek Hak</label>
               <div className={`flex items-center justify-between mt-4`}>
                 <button type="button" onClick={() => setMoves(Math.max(history.length - 1, moves - 1))} className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors active:scale-90"><Minus size={20}/></button>
                 <div className="text-center">
                    <span className="text-6xl font-black text-white leading-none tracking-tighter drop-shadow-lg">{moves}</span>
                    <span className="block text-[10px] text-blue-400 font-bold opacity-80 mt-2 uppercase">MİNİMUM: {history.length - 1} HAK</span>
                 </div>
                 <button type="button" onClick={() => setMoves(moves + 1)} className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors active:scale-90"><Plus size={20}/></button>
               </div>
             </div>

             {!shareLink ? (
               <button onClick={handleGenerateLink} className={`w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-4 rounded-xl font-black text-lg transition-transform active:scale-95 shadow-lg shadow-blue-500/20`}>
                 LİNK OLUŞTUR
               </button>
             ) : (
               <div className="space-y-3 animate-in zoom-in">
                 <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-xs font-mono break-all text-green-400 shadow-inner max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                   {shareLink}
                 </div>
                 <button onClick={() => copyToClipboard(shareLink)} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-500/20"><Copy size={20}/> LİNKİ KOPYALA</button>
                 <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`🧩 EVOLVO MEYDAN OKUMASI 🧩\n\n🚀 Başlangıç: ${history[0]}\n🏁 Hedef: ${history[history.length - 1]}\n\nBu zinciri çözebilecek misin? 👇\n${shareLink}`)}`, '_blank')} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-500/20"><MessageCircle size={20}/> WHATSAPP İLE GÖNDER</button>
                 <button onClick={onBack} className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-xl font-bold mt-4 transition-colors">ANA SAYFAYA DÖN</button>
               </div>
             )}
          </div>
        </div>
      )}
      
      <style>{`
        .shadow-blue-500\\/30 { box-shadow: 0 0 20px 2px rgba(59, 130, 246, 0.3); }
        .shadow-green-500\\/30 { box-shadow: 0 0 20px 2px rgba(34, 197, 94, 0.3); }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        
        @keyframes flip-letter { 0% { transform: rotateX(-90deg); opacity: 0; } 100% { transform: rotateX(0); opacity: 1; } }
        /* İŞTE DÜZELEN KISIM: forwards yerine both yazıldı */
        .animate-flip-letter { animation: flip-letter 0.5s ease-out both; backface-visibility: hidden; }
        
        @keyframes flip-correct { 
           0% { transform: rotateX(0deg); background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: white;} 
           50% { transform: rotateX(-90deg); background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: white; } 
           50.1% { transform: rotateX(-90deg); background-color: #16a34a; border-color: #166534; color: white; }
           100% { transform: rotateX(0deg); background-color: #16a34a; border-color: #166534; color: white; } 
        }
        .animate-flip-correct { animation: flip-correct 0.6s ease-in-out forwards; backface-visibility: hidden; }
        
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thumb-white\\/10::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

// --- DİĞER MODALLAR ---
const AchievementsModal = ({ isOpen, onClose, theme, colors }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-lg rounded-[2rem] p-6 border border-white/10 text-white shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-black flex items-center gap-2 italic text-yellow-400"><Medal /> BAŞARIMLAR</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X /></button>
        </div>
        
        <div className="overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
          {ACHIEVEMENTS.map((ach) => (
            <div key={ach.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all group shadow-inner">
              <div className={`w-12 h-12 text-2xl flex items-center justify-center rounded-xl bg-gradient-to-br ${ach.category === 'easy' ? 'from-green-500/20 to-green-900/20 text-green-400' : ach.category === 'medium' ? 'from-blue-500/20 to-blue-900/20 text-blue-400' : ach.category === 'hard' ? 'from-purple-500/20 to-purple-900/20 text-purple-400' : 'from-yellow-500/20 to-yellow-900/20 text-yellow-400'} shadow-lg`}>
                {ach.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm md:text-base group-hover:text-yellow-400 transition-colors">{ach.title}</h3>
                <p className="text-xs opacity-60 mt-0.5">{ach.desc}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-black opacity-40 bg-white/10 px-2 py-1 rounded-md">{ach.xp} XP</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AvatarModal = ({ isOpen, onClose, onSelect, theme, colors, userAvatar, username }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-sm rounded-[2rem] p-6 border border-white/10 text-white shadow-2xl flex flex-col max-h-[80vh]`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-black italic">Profil & Avatar</h2>
           <button onClick={onClose} className="transition-colors hover:text-red-500"><X size={24} /></button>
        </div>
        
        {username && userAvatar && (
           <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl p-4 mb-6 border border-white/5 shadow-inner">
              <div className="text-5xl mb-2 drop-shadow-lg">{userAvatar.icon}</div>
              <span className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">Mevcut İsmin</span>
              <span className="font-black text-xl text-green-400 break-all text-center">{username}</span>
           </div>
        )}

        <h3 className="text-xs font-bold opacity-50 uppercase tracking-widest mb-3">Yeni Avatar Seç</h3>
        <div className="grid grid-cols-4 gap-4 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/20">
          {AVATARS.map((av) => (
            <button key={av.id} onClick={() => onSelect(av)} className="aspect-square flex items-center justify-center bg-white/5 rounded-2xl hover:bg-white/20 hover:scale-110 transition-all border border-transparent hover:border-green-500 text-3xl shadow-inner">{av.icon}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatsModal = ({ isOpen, onClose, stats, theme, colors }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const diff = tomorrow - now;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;
  const winRate = stats.played > 0 ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-md rounded-[2rem] p-8 border border-white/10 text-white shadow-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black flex items-center gap-2 italic uppercase tracking-tighter"><BarChart2 className="text-green-400" /> İSTATİSTİKLER</h2><button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X /></button></div>
        <div className="grid grid-cols-4 gap-4 text-center mb-8 bg-black/20 p-4 rounded-2xl border border-white/5 shadow-inner">
          {[{ label: 'OYNANAN', val: stats.played }, { label: 'KAZANMA ORANI', val: `%${winRate}` }, { label: 'MEVCUT SERİ', val: stats.currentStreak }, { label: 'EN UZUN SERİ', val: stats.maxStreak }].map((s, i) => (
            <div key={i} className="flex flex-col items-center"><span className="text-4xl font-black text-blue-100">{s.val}</span><span className="text-[9px] font-bold opacity-60 mt-1.5 leading-tight uppercase tracking-widest">{s.label}</span></div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 text-center mb-8 border-t border-white/10 pt-6">
           <div className="flex flex-col"><span className="text-4xl font-black text-green-100">{stats.dictionaryLookups || 0}</span><span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Sözlük Bakma</span></div>
           <div className="flex flex-col"><span className="text-4xl font-black text-yellow-100">{stats.hintsUsed}</span><span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">İpucu</span></div>
        </div>
        <div className="bg-black/20 rounded-2xl p-6 text-center border border-white/5 shadow-inner"><p className="text-[10px] font-bold uppercase opacity-60 mb-2 tracking-widest">SONRAKİ EVOLVO</p><div className="text-5xl font-mono font-bold text-green-400 tracking-wider shadow-green-500/20 drop-shadow-md">{timeLeft}</div></div>
      </div>
    </div>
  );
};

const SideMenu = ({ isOpen, onClose, toggleModal, settings, theme, user, onLogout, onLogin }) => {
  const items = [
    { icon: <BarChart2 size={18} className="text-green-400" />, label: "İstatistikler", action: 'stats' },
    { icon: <Medal size={18} className="text-blue-400" />, label: "Başarımlar", action: 'achievements' },
    { icon: <HelpCircle size={18} className="text-red-400" />, label: "Nasıl Oynanır?", action: 'howToPlay' },
    { icon: <Trophy size={18} className="text-yellow-400" />, label: "Liderlik Tablosu", action: 'leaderboard' },
    { icon: <CalendarIcon size={18} className="text-orange-400" />, label: "Geçmiş Bulmacalar", action: 'calendar' },
    { icon: <Swords size={18} className="text-gray-300" />, label: "Meydan Oku", action: 'challenge' },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-80 ${theme.panel} border-l ${theme.panelBorder} z-[110] shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 flex justify-between items-center border-b ${theme.panelBorder} flex-none">
          <Logo colors={theme} />
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
           {user ? (
             <button onClick={() => { onLogout(); onClose(); }} className={`w-full flex items-center gap-4 p-4 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl font-bold text-sm transition-all flex-shrink-0 mb-4 shadow-inner`}>
               <div className="font-bold text-lg">X</div> Çıkış Yap
             </button>
           ) : (
             <button onClick={() => { if(onLogin) onLogin(); onClose(); }} className={`w-full flex items-center gap-4 p-4 ${theme.key} text-white rounded-xl font-bold text-sm hover:brightness-105 transition-all flex-shrink-0 mb-4 shadow-inner`}>
               <div className="text-blue-400 font-bold text-lg">G</div> İlerlemeyi Kaydet
             </button>
           )}

           {items.map((item, i) => (
             <button key={i} onClick={() => { if(item.action) toggleModal(item.action, true); onClose(); }} className={`w-full flex items-center gap-4 p-4 ${theme.key} text-white rounded-xl font-bold text-sm hover:brightness-105 transition-all flex-shrink-0 shadow-inner`}>
               {item.icon} {item.label}
             </button>
           ))}

           <div className="border-t border-white/5 my-4 pt-4 space-y-2">
             <div className={`flex items-center justify-between p-4 ${theme.key} rounded-xl shadow-inner`}>
               <div className="flex items-center gap-3"><Moon size={18} /><span className="font-bold text-sm text-white">Koyu Mod</span></div>
               <button onClick={() => settings.setDarkMode(!settings.darkMode)} className={`w-12 h-6 rounded-full relative transition-colors ${settings.darkMode ? 'bg-green-500' : 'bg-gray-400'}`}>
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.darkMode ? 'right-1' : 'left-1'}`} />
               </button>
             </div>
             
             <div className={`flex items-center justify-between p-4 ${theme.key} rounded-xl shadow-inner`}>
               <div className="flex items-center gap-3"><Eye size={18} /><span className="font-bold text-sm text-white">Renk Körlüğü</span></div>
               <button onClick={() => settings.setColorBlindMode(!settings.colorBlindMode)} className={`w-12 h-6 rounded-full relative transition-colors ${settings.colorBlindMode ? 'bg-blue-500' : 'bg-gray-400'}`}>
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.colorBlindMode ? 'right-1' : 'left-1'}`} />
               </button>
             </div>
           </div>
        </div>
      </div>
    </>
  );
};

const LeaderboardModal = ({ isOpen, onClose, theme, colors, userAvatar, username, leaderboardData = [] }) => {
  const [activeTab, setActiveTab] = useState('daily'); 

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
       <div className={`${theme.panel} w-full max-w-md rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black italic uppercase tracking-tighter">SIRALAMA</h2><button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button></div>
          
          <div className="flex p-1 bg-white/5 rounded-xl mb-6 shadow-inner border border-white/5">
            {['daily', 'weekly', 'monthly'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
              >
                {tab === 'daily' ? 'Günlük' : tab === 'weekly' ? 'Haftalık' : 'Aylık'}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20">
             {leaderboardData.length > 0 ? (
                leaderboardData.map((data, i) => (
                  <div key={i} className={`flex justify-between items-center p-4 rounded-xl border ${i === 0 ? 'bg-yellow-500/20 border-yellow-500/50 shadow-yellow-500/10' : theme.emptyCell} shadow-inner`}>
                     <div className="flex items-center gap-4">
                        <span className={`font-black w-5 text-center text-lg ${i < 3 ? 'text-yellow-400' : 'opacity-60'}`}>{i + 1}</span>
                        <div className="flex items-center gap-2">
                           <div className="text-3xl shadow-sm">
                              {data.name === username ? userAvatar.icon : (data.avatar || '👤')}
                           </div>
                           <span className={`font-bold ${data.name === username ? 'text-green-400' : 'text-white'}`}>{data.name}</span>
                        </div>
                     </div>
                     <span className="font-black text-lg text-white/90 tracking-tight">{data.score} Puan</span>
                  </div>
                ))
             ) : (
                <div className="text-center py-12 opacity-40 italic bg-black/10 rounded-xl border border-white/5 shadow-inner">
                   Henüz skor yok. İlk sen ol!
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

const HowToPlayModal = ({ isOpen, onClose, theme, colors }) => {
   if (!isOpen) return null;
   const steps = ["Amaç, \"Başlangıç\" kelimesinden \"Bitiş\" kelimesine ulaşmaktır.", "Her adımda, bir önceki kelimenin sadece 1 harfini değiştirebilirsiniz.", "Girdiğiniz her kelime, sözlükte bulunan geçerli bir Türkçe kelime olmalıdır.", "En az adımda ve en kısa sürede bitiş kelimesine ulaşarak Liderlik Tablosu'na girin!", "Takılırsanız, 'Sil' tuşu (⌫) aktif satır boşken bir önceki adıma geri dönmenizi sağlar.", "Zorlandığınızda ampul (💡) ikonuna tıklayarak ipucu alabilirsiniz (Maks. 3 Hak). Her ipucu 150 puan düşer."];
   return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
         <div className={`${theme.panel} w-full max-w-lg rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black italic uppercase tracking-tighter">NASIL OYNANIR?</h2><button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button></div>
            <ul className="space-y-4 font-medium opacity-80">{steps.map((s, i) => (<div key={i} className="flex gap-4 items-start bg-black/10 p-4 rounded-xl shadow-inner border border-white/5"><div className="flex-shrink-0 w-7 h-7 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm mt-0.5">{i+1}</div><p className="text-sm leading-relaxed text-white/90">{s}</p></div>))}</ul>
            <button onClick={onClose} className="w-full mt-8 bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-white shadow-xl transition-all active:scale-95">ANLADIM</button>
         </div>
      </div>
   );
};

const UniqueNameModal = ({ isOpen, tempUser, onComplete, theme, colors }) => {
  const [chosenName, setChosenName] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSaveName = async (e) => {
    e.preventDefault();
    setError(null);
    const nameToSave = chosenName.trim();

    if (nameToSave.length < 3 || nameToSave.length > 12) {
      setError("İsminiz 3 ile 12 karakter arasında olmalı!");
      return;
    }

    setIsChecking(true);
    try {
      const db = getFirestore(getApp());
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', nameToSave));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Bu efsanevi isim zaten alınmış. Başka bir tane dene!");
        setIsChecking(false);
        return;
      }

      await setDoc(doc(db, 'users', tempUser.uid), {
        username: nameToSave,
        createdAt: new Date().toISOString()
      });

      setIsChecking(false);
      onComplete(nameToSave);

    } catch (err) {
      console.error("İsim kontrol hatası:", err);
      setError("Sunucuya bağlanılamadı, lütfen tekrar dene.");
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <div className={`${theme.panel} w-full max-w-md rounded-[2rem] p-8 border ${theme.panelBorder} shadow-2xl animate-in zoom-in`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-green-500/20">
            <span className="text-3xl">👑</span>
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Efsaneler Arasına Katıl</h2>
          <p className="opacity-60 text-sm mt-2 font-medium">Bu senin kalıcı ve eşsiz ismin olacak. Liderlik tablosunda herkes bu ismi görecek!</p>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          <input 
            autoFocus
            type="text" 
            value={chosenName}
            onChange={(e) => setChosenName(e.target.value)}
            placeholder="Örn: KralSulo" 
            className={`w-full bg-black/20 border ${theme.panelBorder} text-white rounded-2xl py-4 px-4 text-center font-black text-xl outline-none focus:border-green-500 transition-all shadow-inner`}
          />
          
          {error && (
            <div className="bg-red-900/30 text-red-400 p-3 rounded-xl text-sm font-bold border border-red-900/50 text-center animate-pulse shadow-inner">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isChecking}
            className={`w-full ${colors.btnPrimary} py-4 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center shadow-xl`}
          >
            {isChecking ? <Loader2 className="animate-spin" /> : "BU İSMİ BANA REZERVE ET!"}
          </button>
        </form>
      </div>
    </div>
  );
};

const CalendarModal = ({ isOpen, onClose, theme, colors, onSelectDate }) => {
   const [currentDate, setCurrentDate] = useState(new Date()); 
   if (!isOpen) return null;
   const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
   const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); 
   const startOffset = firstDay === 0 ? 6 : firstDay - 1;
   const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
   
   const startDateObj = getStartDate();

   const changeMonth = (dir) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(currentDate.getMonth() + dir);
      if (newDate < startDateObj || newDate > new Date()) return;
      setCurrentDate(newDate);
   };
   return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
         <div className={`${theme.panel} w-full max-w-md rounded-3xl p-6 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight"><CalendarIcon /> GEÇMİŞ</h2><button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button></div>
            <div className="flex justify-between items-center mb-6 px-4 bg-black/10 p-2 rounded-xl shadow-inner border border-white/5"><button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"><ChevronLeft /></button><span className="font-bold text-lg text-white/90">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span><button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"><ChevronRightIcon /></button></div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2 font-bold opacity-50 uppercase tracking-widest">{['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => <div key={d}>{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-2">
               {[...Array(startOffset)].map((_, i) => <div key={`empty-${i}`} />)}
               {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const isPast = dateObj >= startDateObj && !(dateObj > new Date());
                  
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  
                  return (
                    <button 
                      key={day} 
                      disabled={!isPast} 
                      onClick={() => { if(onSelectDate) onSelectDate(dateStr); }} 
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg font-bold text-sm transition-all ${isPast ? `${colors.success} hover:brightness-110 shadow-inner` : `${theme.emptyCell} opacity-30 cursor-not-allowed`}`}
                    >
                      {day}
                    </button>
                  );
               })}
            </div>
         </div>
      </div>
   );
};

const dictionaryCache = {};

const DefinitionModal = ({ word, onClose, theme }) => {
  const [definition, setDefinition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!word) return;
    
    // Kelimenin küçük harfli halini alıyoruz ki büyük/küçük harf farkından dolayı hafızayı kaçırmayalım
    const safeWord = word.toLocaleLowerCase('tr-TR');

    // 🔥 2. ADIM: KONTROL - Kelime hafızada var mı? Varsa interneti bekleme, direkt yapıştır!
    if (dictionaryCache[safeWord]) {
      setDefinition(dictionaryCache[safeWord]);
      setLoading(false);
      return; // Fonksiyonu burada kes, aşağı inip TDK'ya boşuna istek atma
    }

    // 🔥 3. ADIM: HAFIZADA YOKSA - Mecbur TDK'ya soracağız
    setLoading(true);
    fetch(`https://sozluk.gov.tr/gts?ara=${safeWord}`)
      .then(res => res.json())
      .then(data => { 
        let resultText = "Anlam bulunamadı.";
        
        // Gelen verinin içi dolu mu diye güvenlik kontrolü yapıyoruz
        if (Array.isArray(data) && data.length > 0 && data[0].anlamlarListe && data[0].anlamlarListe.length > 0) { 
          resultText = data[0].anlamlarListe[0].anlam; 
        }
        
        // 🔥 4. ADIM: KAYIT - TDK'dan gelen cevabı hafızaya yaz ki adam bir dahakine tıklayınca fişek gibi açılsın
        dictionaryCache[safeWord] = resultText;
        
        setDefinition(resultText);
        setLoading(false); 
      })
      .catch(() => { 
        setDefinition("Bağlantı hatası."); 
        setLoading(false); 
      });
  }, [word]);

  if (!word) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
       <div className={`${theme.panel} w-full max-w-sm rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl animate-in zoom-in`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="text-xs font-bold opacity-50 uppercase tracking-widest">KELİME</span>
              <h2 className="text-3xl font-black tracking-tight mt-1 text-white">{word}</h2>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-black/10 rounded-full transition-colors"><X size={20}/></button>
          </div>
          <div className={`p-4 rounded-xl bg-black/20 min-h-[100px] flex items-center border border-white/5 shadow-inner`}>
            {loading ? (
              <div className="flex items-center gap-2 opacity-50"><Loader2 className="animate-spin text-green-500" /> Yükleniyor...</div>
            ) : (
              <p className="font-medium leading-relaxed italic text-white/90">"{definition}"</p>
            )}
          </div>
          <div className="mt-4 text-right">
            <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest text-white/60">KAYNAK: TDK GÜNCEL TÜRKÇE SÖZLÜK</span>
          </div>
       </div>
    </div>
  );
};
const PrivacyModal = ({ isOpen, onClose, theme }) => {
  const [activeTab, setActiveTab] = useState('privacy');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-2xl rounded-3xl p-6 md:p-8 border ${theme.panelBorder} shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400">Sözleşmeler & Gizlilik</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl mb-6 shadow-inner border border-white/5 flex-shrink-0 overflow-x-auto scrollbar-none">
          {[
            { id: 'privacy', label: 'Gizlilik (KVKK)' },
            { id: 'cookies', label: 'Çerez Politikası' },
            { id: 'terms', label: 'Kullanım Koşulları' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 text-xs font-bold uppercase whitespace-nowrap rounded-lg transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow' : 'text-white/50 hover:text-white/80'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto pr-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 text-sm leading-relaxed text-white/80 font-medium">
          {activeTab === 'privacy' && (
            <div className="animate-in fade-in">
              <h3 className="text-lg font-bold text-white mb-2">1. Kişisel Verilerin İşlenmesi ve Korunması (KVKK)</h3>
              <p>EVOLVO ("Oyun"), oyuncu deneyimini geliştirmek ve rekabetçi bir ortam sunmak amacıyla kısıtlı miktarda kişisel veri toplamaktadır.</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Toplanan Veriler:</strong> Google ile giriş yaptığınızda Google UID (Benzersiz Kimlik), Ad/Soyad ve E-posta adresiniz arka planda güvenli veritabanımıza (Firebase) aktarılır. Ekranda oluşturduğunuz "Kullanıcı Adı" liderlik tablosu için herkese açık şekilde yayınlanır.</li>
                <li><strong>Kullanım Amacı:</strong> Bu veriler sadece oyun içi skorlarınızı kaydetmek, hileleri önlemek (reCAPTCHA) ve cihazlar arası ilerlemenizi eşitlemek için kullanılır.</li>
                <li><strong>Veri Paylaşımı:</strong> Kişisel verileriniz kesinlikle reklam, pazarlama veya ticari amaçlarla 3. şahıs veya kurumlarla paylaşılmaz.</li>
                <li><strong>Veri Silme:</strong> Hesabınızı ve skorlarınızı sistemden tamamen sildirmek isterseniz iletişim kanallarımız üzerinden bizimle irtibata geçebilirsiniz.</li>
              </ul>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="animate-in fade-in">
              <h3 className="text-lg font-bold text-white mb-2">2. Çerezler ve Yerel Depolama (Local Storage)</h3>
              <p>Oyunumuz, deneyiminizi kesintisiz kılmak için tarayıcınızın yerel depolama özelliklerini kullanır. İzleme (tracking) veya pazarlama çerezleri kullanılmaz.</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Oyun İçi Tercihler:</strong> Koyu mod, renk körlüğü modu ayarlarınız tarayıcınıza kaydedilir.</li>
                <li><strong>Geçici Veriler:</strong> Günlük bulmaca sayacınız ve misafir olarak oynadığınızda size atanan rastgele kullanıcı adı yerel depolamada tutulur. Çerezleri temizlediğinizde bu veriler sıfırlanır.</li>
              </ul>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="animate-in fade-in">
              <h3 className="text-lg font-bold text-white mb-2">3. Kullanım Koşulları ve Oyun Kuralları</h3>
              <p>EVOLVO'yu oynayarak aşağıdaki temel kuralları kabul etmiş sayılırsınız:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Adil Oyun:</strong> Otomatik botlar, makrolar veya üçüncü parti yazılımlar kullanılarak liderlik tablosunun manipüle edilmesi yasaktır. Tespit edilen şüpheli skorlar sistemden silinir.</li>
                <li><strong>Kullanıcı Adları:</strong> Nefret söylemi, küfür, ayrımcılık veya yasadışı içerik barındıran kullanıcı adları oluşturmak yasaktır. Bu tür hesaplar uyarısız engellenebilir.</li>
                <li><strong>Sözlük Kaynağı:</strong> Oyun içi kelimeler ve anlamları Türk Dil Kurumu (TDK) Güncel Türkçe Sözlük altyapısından sağlanmaktadır. TDK'nın veri tabanındaki güncellemeler oyun içine yansıyabilir.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex-shrink-0">
          <button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-xl font-bold text-white transition-all active:scale-95">
            OKUDUM VE ANLADIM
          </button>
        </div>

      </div>
    </div>
  );
};
const ContactModal = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-md rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl animate-in zoom-in`} onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black italic text-blue-400 uppercase tracking-tighter">İLETİŞİM</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="text-center space-y-6">
          <p className="text-sm font-medium opacity-80 leading-relaxed text-white">
            Önerileriniz, hata bildirimleriniz veya işbirlikleri için bizimle e-posta yoluyla iletişime geçebilirsiniz.
          </p>
          
          {/* mailto: etiketi tıklandığında otomatik mail uygulamasını açar */}
          <a 
            href="mailto:tr.evolvogame@gmail.com" 
            className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-bold text-white transition-all active:scale-95 w-full justify-center border border-white/5 shadow-inner"
          >
            <Mail size={24} className="text-blue-400" />
            <span className="tracking-wide">tr.evolvogame@gmail.com</span>
          </a>
        </div>

      </div>
    </div>
  );
};
const Logo = ({ colors }) => (
  <div className="flex items-center gap-1.5 font-black text-2xl tracking-tighter italic select-none">
    <span>E</span><span>V</span><span className={`w-7 h-7 flex items-center justify-center text-white not-italic text-lg rounded-md shadow-lg ${colors?.logoError ? colors.logoError : 'bg-red-600'}`}>O</span><span>L</span><span>V</span><span className={`w-7 h-7 flex items-center justify-center text-white not-italic text-lg rounded-md shadow-lg ${colors?.logoSuccess ? colors.logoSuccess : 'bg-green-600'}`}>O</span>
  </div>
);

export default App;