import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { getApp } from "firebase/app";
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { getFunctions, httpsCallable } from 'firebase/functions';
import html2canvas from 'html2canvas';
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  Play, Trophy, ChevronRight, Menu, X, 
  Info, Star, Lightbulb, Delete, User, 
  BarChart2, HelpCircle, Calendar as CalendarIcon, Medal, Swords, Moon, Eye, 
  CheckCircle2, AlertCircle, Loader2, Book, ChevronLeft, ChevronRight as ChevronRightIcon,
  Timer, Coffee, Sunrise, Sunset, Sparkles, Crosshair, Plus, Minus, Copy, Share2, Brain, Link as LinkIcon, Twitter, MessageCircle, Settings, Mail, Infinity as InfinityIcon, Map as MapIcon, Lock, Download
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
    @keyframes altayBrandIn { from{opacity:0} to{opacity:0.35} }
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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};
const app = initializeApp(firebaseConfig);

function MountainMini({ size = 18 }) {
  return (
    <svg viewBox="-1 -2 62 46" width={size} height={Math.round(size * 44 / 60)} fill="none">
      <path d="M 0,42 L 13,17 L 21,29 L 31,0 L 41,22 L 50,11 L 60,42 Z" fill="#C9A84C" fillOpacity="0.3" />
      <path d="M 0,42 L 13,17 L 21,29 L 31,0 L 41,22 L 50,11 L 60,42" stroke="#C9A84C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 26,8 L 31,0 L 36,8 L 31,6 Z" fill="white" opacity="0.9" />
    </svg>
  );
}

const SplashScreen = ({ onDone }) => {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 2400);
    const t2 = setTimeout(onDone, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const R = 140;
  const circumference = +(2 * Math.PI * R).toFixed(1);

  return (
    <>
      <style>{`
        @keyframes splashMtnRise {
          from { opacity:0; transform:translateY(45px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes splashRingDraw {
          from { stroke-dashoffset: ${circumference}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes splashTextIn {
          from { opacity:0; letter-spacing:8px; }
          to   { opacity:1; letter-spacing:2px; }
        }
        @keyframes splashPulse {
          0%,100% { filter:drop-shadow(0 0 8px #b4530088); }
          50%     { filter:drop-shadow(0 0 22px #fde68acc); }
        }
        .spl-mtn-c { animation: splashMtnRise 0.7s cubic-bezier(.22,1,.36,1) 0.1s both; }
        .spl-mtn-l { animation: splashMtnRise 0.7s cubic-bezier(.22,1,.36,1) 0.35s both; }
        .spl-mtn-r { animation: splashMtnRise 0.7s cubic-bezier(.22,1,.36,1) 0.5s both; }
        .spl-ring  { stroke-dasharray:${circumference}; stroke-dashoffset:${circumference};
                     animation: splashRingDraw 1.3s ease-in-out 0.7s forwards; }
        .spl-text  { opacity:0; animation: splashTextIn 1s ease-out 1.8s forwards; }
        .spl-wrap  { animation: splashPulse 2.2s ease-in-out 2s infinite; }
      `}</style>
      <div className={`fixed inset-0 bg-[#06071a] flex items-center justify-center z-[9999] transition-opacity duration-600 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* SVG 340×340, ring cx=170 cy=155 r=140 → bottom=295
            Text "ALTAY" y=242 → corner (125,242): dist=√(45²+87²)=√(2025+7569)=√9594≈98 < 140 ✓
            Text "INTERACTIVE" y=262 → corner (118,262): dist=√(52²+107²)=√(2704+11449)=√14153≈119 < 140 ✓
            Ring bottom y=295 > text bottom 266 ✓ */}
        <svg width="300" height="300" viewBox="0 0 340 340" className="spl-wrap">
          <defs>
            <linearGradient id="splGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#fde68a"/>
              <stop offset="42%"  stopColor="#d97706"/>
              <stop offset="100%" stopColor="#fde68a"/>
            </linearGradient>
            <linearGradient id="splMtnC" x1="25%" y1="0%" x2="75%" y2="100%">
              <stop offset="0%"   stopColor="#f1f5f9"/>
              <stop offset="55%"  stopColor="#94a3b8"/>
              <stop offset="100%" stopColor="#334155"/>
            </linearGradient>
            <linearGradient id="splMtnS" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#cbd5e1"/>
              <stop offset="100%" stopColor="#2d3748"/>
            </linearGradient>
            <linearGradient id="splSnow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="#ffffff"/>
              <stop offset="100%" stopColor="#dbeafe"/>
            </linearGradient>
            <radialGradient id="splMist" cx="50%" cy="100%" r="55%">
              <stop offset="0%"   stopColor="#1e3a5f" stopOpacity="0.55"/>
              <stop offset="100%" stopColor="#06071a"  stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Ground mist */}
          <ellipse cx="170" cy="215" rx="120" ry="22" fill="url(#splMist)"/>

          {/* Left mountain */}
          <g className="spl-mtn-l">
            <polygon points="95,210 50,210 95,122" fill="url(#splMtnS)" opacity="0.75"/>
            <polygon points="95,122 78,156 112,156" fill="url(#splSnow)" opacity="0.86"/>
            <line x1="95" y1="122" x2="50" y2="210" stroke="#0f172a" strokeWidth="1" opacity="0.20"/>
          </g>

          {/* Right mountain */}
          <g className="spl-mtn-r">
            <polygon points="245,122 200,210 290,210" fill="url(#splMtnS)" opacity="0.75"/>
            <polygon points="245,122 228,156 262,156" fill="url(#splSnow)" opacity="0.86"/>
            <line x1="245" y1="122" x2="290" y2="210" stroke="#0f172a" strokeWidth="1" opacity="0.20"/>
          </g>

          {/* Center mountain — tallest */}
          <g className="spl-mtn-c">
            <polygon points="170,36 104,210 236,210" fill="url(#splMtnC)"/>
            <polygon points="170,36 236,210 170,210" fill="#0f172a" opacity="0.17"/>
            <path d="M170,36 Q154,60 142,84 Q155,74 170,77 Q185,74 198,84 Q186,60 170,36 Z" fill="url(#splSnow)" opacity="0.97"/>
            <path d="M170,36 Q162,53 156,68" stroke="white" strokeWidth="1.4" opacity="0.50" fill="none" strokeLinecap="round"/>
          </g>

          {/* Golden ring — draws itself */}
          <circle cx="170" cy="155" r={R} fill="none" stroke="url(#splGold)" strokeWidth="4" className="spl-ring"/>
          <circle cx="170" cy="155" r={R} fill="none" stroke="#fde68a" strokeWidth="1" opacity="0.20"/>

          {/* ALTAY — y=242, corner (125,242) dist≈98 < 140 ✓ */}
          <text x="170" y="242" textAnchor="middle"
            fontFamily="'Arial Black','Impact',sans-serif"
            fontWeight="900" fontSize="18" letterSpacing="5"
            fill="url(#splGold)" className="spl-text">ALTAY</text>

          {/* INTERACTIVE — y=262, corner (118,262) dist≈119 < 140 ✓ */}
          <text x="170" y="262" textAnchor="middle"
            fontFamily="'Arial Black','Impact',sans-serif"
            fontWeight="900" fontSize="12" letterSpacing="1.5"
            fill="url(#splGold)" className="spl-text" style={{ animationDelay: '1.95s' }}>INTERACTIVE</text>
        </svg>
      </div>
    </>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    if (!Capacitor.isNativePlatform()) return false;
    return !sessionStorage.getItem('evolvo_splash_shown');
  });
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
  const [userAvatar, setUserAvatar] = useState(AVATARS[0]);
  const [darkMode, setDarkMode] = useState(false);
  const [colorBlindMode, setColorBlindMode] = useState(false);
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
             const newDaily = [...(prevL.daily || []), newEntry].sort((a, b) => b.score - a.score).slice(0, 20);
             localStorage.setItem('evolvo_leaderboard', JSON.stringify(newDaily));
             return { ...prevL, daily: newDaily };
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

  if (showSplash) return <SplashScreen onDone={() => { sessionStorage.setItem('evolvo_splash_shown', '1'); setShowSplash(false); }} />;

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
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Veri Paylaşımı:</strong> Kişisel verileriniz hiçbir üçüncü tarafla reklam veya ticari amaçla paylaşılmaz.</li>
              <li style={{marginBottom:8}}><strong style={{color:'#e2e8f0'}}>Veri Silme:</strong> KVKK kapsamındaki haklarınız için <a href="mailto:tr.evolvogame@gmail.com" style={{color:'#60a5fa'}}>tr.evolvogame@gmail.com</a> adresine yazabilirsiniz.</li>
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
            <p style={{fontSize:14,lineHeight:1.7}}>E-posta: <a href="mailto:tr.evolvogame@gmail.com" style={{color:'#60a5fa'}}>tr.evolvogame@gmail.com</a></p>
          </section>

          <footer style={{marginTop:60,paddingTop:24,borderTop:'1px solid rgba(255,255,255,0.08)',textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.3)'}}>
            <p>© 2026 Evolvo — Altay Interactive. Tüm hakları saklıdır.</p>
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
      <UnlimitedMenuPage 
        onBack={() => setCurrentPage('landing')} 
        theme={theme} 
        progress={offlineProgress} 
        scores={offlineScores} 
        userAvatar={userAvatar}
        setUserAvatar={setUserAvatar}
        onPlay={(len, lvl) => handleStartUnlimited(len, lvl)}
      />
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

      <LeaderboardModal isOpen={modalState.leaderboard} onClose={() => toggleModal('leaderboard', false)} theme={theme} colors={currentColors} leaderboardData={leaderboardData} userAvatar={userAvatar} username={username} onTabChange={fetchLeaderboard} />
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
              <Trophy size={24} className="text-yellow-500" /> SIRALAMA
            </button>
          </div>

          {isNative && (
            <div className="mt-6 flex justify-center animate-in zoom-in duration-500">
              <button onClick={() => setCurrentPage('unlimited_menu')} className="w-full sm:w-auto bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 px-10 py-4 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-purple-500/30 text-white">
                <InfinityIcon size={24} /> SINIRSIZ MOD
              </button>
            </div>
          )}
        </div>
      </section>

      <footer className={`py-8 text-center border-t ${theme.panelBorder} text-sm mt-auto`}>
        <div className="flex items-center justify-center gap-2 mb-3" style={{animation:'altayBrandIn 1s ease 0.7s forwards', opacity:0}}>
          <MountainMini size={14} />
          <span className="text-[11px] text-slate-400 tracking-[0.25em] font-medium">ALTAY INTERACTIVE</span>
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

// --- OYUN SAYFASI ---
const GamePage = ({ onBack,onBackToMap,onUnlimitedWin,onNextLevel,username,offlineProgress, userAvatar, setUserAvatar, theme, colors, toggleModal, modalState, settings, updateStats, puzzleData, onStartCustomGame, onLoadPastPuzzle, user, onLogout, message, showFeedback, onLogin, checkTDK, leaderboardData, fetchLeaderboard }) => {
  const [history, setHistory] = useState([puzzleData.start]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [winningRowAnimation, setWinningRowAnimation] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const shareCardRef = useRef(null);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [lockedIndices, setLockedIndices] = useState([0]); 
  const [rowAnimation, setRowAnimation] = useState(null);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [scoreDetails, setScoreDetails] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const earnedStars = !scoreDetails?.total ? 0 : scoreDetails.total >= 800 ? 3 : scoreDetails.total >= 500 ? 2 : 1;
  
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
    const hintsUsed = 3 - hintsLeft;

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
    updateStats('game_end', { win: didWin, hints: hintsUsed, score: score });
  };

const handleHint = async (e) => {
    if (e && e.currentTarget) e.currentTarget.blur();
    if (puzzleData.type === 'custom') {
      showFeedback("Bu modda ipucu kapalıdır.", "info");
      return;
    }
    if (isGameOver || hintsLeft <= 0) return;

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

  const buildCanvas = () =>
    html2canvas(shareCardRef.current, { backgroundColor: '#070e1c', scale: 2, logging: false });

  const GAME_URL = 'https://tr.evolvogame.com';

  const handleShareWhatsApp = async () => {
    if (!shareCardRef.current) return;
    try {
      const canvas = await buildCanvas();
      canvas.toBlob(async (blob) => {
        const file = new File([blob], 'evolvo-skor.png', { type: 'image/png' });
        const caption = `🏆 EVOLVO — ${scoreDetails?.total || 0} Puan!\n${puzzleData.start} → ${puzzleData.target} | ${history.length - 1} hamle\n\nSen de çözebilir misin? 👇\n${GAME_URL}`;
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: caption });
        } else {
          window.open(`https://wa.me/?text=${encodeURIComponent(caption)}`, '_blank');
        }
      });
    } catch (e) { console.error(e); }
  };

  const handleShareTwitter = () => {
    const tweet = `🏆 EVOLVO'da ${scoreDetails?.total || 0} puan aldım!\n${puzzleData.start} → ${puzzleData.target} | ${history.length - 1} hamle | ${formatTime(timer)}\n\nSen de dene 👇`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(GAME_URL)}`, '_blank');
  };

  const handleShareCopyLink = () => {
    const text = `🏆 EVOLVO — ${scoreDetails?.total || 0} Puan!\n${puzzleData.start} → ${puzzleData.target} | ${history.length - 1} hamle\n\nSen de oyna: ${GAME_URL}`;
    navigator.clipboard.writeText(text)
      .then(() => showFeedback("Panoya kopyalandı!", "success"))
      .catch(() => showFeedback("Kopyalanamadı.", "error"));
  };

  const handleShareDownload = async () => {
    if (!shareCardRef.current) return;
    try {
      const canvas = await buildCanvas();
      const link = document.createElement('a');
      link.download = `evolvo-${scoreDetails?.total || 0}puan.png`;
      link.href = canvas.toDataURL();
      link.click();
      showFeedback("Resim indirildi!", "success");
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
      <AchievementsModal isOpen={modalState.achievements} onClose={() => toggleModal('achievements', false)} theme={theme} colors={colors} />
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
                    disabled={hintsLeft <= 0} 
                    className="p-3 bg-yellow-400 rounded-full hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                  >
                    <Lightbulb size={28} className="text-black" fill="currentColor" />
                  </button>
                  
                  {/* Kırmızı x3 Rozeti (Sadece hak varsa görünür) */}
                  {hintsLeft > 0 && (
                    <span className="absolute -bottom-1 -right-2 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-[#0B1121] shadow-md z-10">
                      x{hintsLeft}
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
          {[{ label: 'HAMLE', value: history.length - 1 }, { label: 'SÜRE', value: formatTime(timer) }, { label: 'İPUCU', value: 3 - hintsLeft }].map((s, i) => (
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
                  { label: 'İPUCU', value: 3 - hintsLeft }
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
const UnlimitedMenuPage = ({ onBack, theme, progress, scores, userAvatar, setUserAvatar, onPlay }) => {
    const [selectedLen, setSelectedLen] = useState(() => parseInt(localStorage.getItem('evolvo_offline_tab')) || 5);
    const [showAvatarSelect, setShowAvatarSelect] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const scrollContainerRef = useRef(null);
    const currentNodeRef = useRef(null);

    const currentLevel = progress[selectedLen] || 1;
    const categoryScores = scores[selectedLen] || {};
    const highestUnlocked = Math.ceil(currentLevel / 10) * 10;
    const TOTAL_LEVELS = 200;

    const avatars = [
        {icon:'👤',id:'1'},{icon:'🦊',id:'2'},{icon:'🐼',id:'3'},{icon:'🦁',id:'4'},
        {icon:'🦄',id:'5'},{icon:'🦉',id:'6'},{icon:'🐸',id:'7'},{icon:'🚀',id:'8'},
        {icon:'👻',id:'9'},{icon:'👽',id:'10'},{icon:'🤖',id:'11'},{icon:'🦖',id:'12'},
        {icon:'🐙',id:'13'},{icon:'🦋',id:'14'},{icon:'🐱',id:'15'},{icon:'🐶',id:'16'},
        {icon:'🐢',id:'17'},{icon:'🐯',id:'18'},{icon:'🐧',id:'19'},{icon:'🐉',id:'20'},
    ];

    // 10 zon × 20 seviye, her zon kendine özgü görsel kimlikle
    const ZONES = [
        { name:'Başlangıç',       emoji:'🌱', bg:'from-black via-green-950 to-emerald-900',    node:'from-green-500 to-emerald-700',    border:'border-green-400',   glow:'shadow-[0_0_22px_rgba(34,197,94,0.6)]',    text:'text-green-400',   sep:'border-green-600/40',   bannerFrom:'#052e16', bannerTo:'#14532d', bannerAccent:'#4ade80' },
        { name:'Çöl',             emoji:'🏜️', bg:'from-black via-amber-950 to-yellow-900',    node:'from-amber-500 to-yellow-600',     border:'border-amber-400',   glow:'shadow-[0_0_22px_rgba(245,158,11,0.6)]',   text:'text-amber-400',   sep:'border-amber-600/40',   bannerFrom:'#431407', bannerTo:'#78350f', bannerAccent:'#fbbf24' },
        { name:'Okyanus',         emoji:'🌊', bg:'from-black via-blue-950 to-cyan-900',       node:'from-blue-500 to-cyan-600',        border:'border-blue-400',    glow:'shadow-[0_0_22px_rgba(59,130,246,0.6)]',   text:'text-blue-400',    sep:'border-blue-600/40',    bannerFrom:'#082f49', bannerTo:'#0c4a6e', bannerAccent:'#38bdf8' },
        { name:'Yanardağ',        emoji:'🌋', bg:'from-black via-red-950 to-orange-900',      node:'from-red-500 to-orange-600',       border:'border-red-400',     glow:'shadow-[0_0_22px_rgba(239,68,68,0.6)]',    text:'text-red-400',     sep:'border-red-600/40',     bannerFrom:'#3b0000', bannerTo:'#7c1d06', bannerAccent:'#f97316' },
        { name:'Uzay',            emoji:'🌌', bg:'from-black via-indigo-950 to-purple-900',   node:'from-indigo-500 to-purple-600',    border:'border-indigo-400',  glow:'shadow-[0_0_22px_rgba(99,102,241,0.6)]',   text:'text-indigo-400',  sep:'border-indigo-600/40',  bannerFrom:'#020617', bannerTo:'#1e1b4b', bannerAccent:'#818cf8' },
        { name:'Everest',         emoji:'🏔️', bg:'from-black via-slate-900 to-sky-950',      node:'from-slate-400 to-sky-500',        border:'border-sky-300',     glow:'shadow-[0_0_22px_rgba(56,189,248,0.6)]',   text:'text-sky-300',     sep:'border-sky-600/40',     bannerFrom:'#0c1222', bannerTo:'#0f2744', bannerAccent:'#bae6fd' },
        { name:'Amazon',          emoji:'🌿', bg:'from-black via-teal-950 to-green-900',      node:'from-teal-500 to-green-700',       border:'border-teal-400',    glow:'shadow-[0_0_22px_rgba(20,184,166,0.6)]',   text:'text-teal-400',    sep:'border-teal-600/40',    bannerFrom:'#022c22', bannerTo:'#134e4a', bannerAccent:'#2dd4bf' },
        { name:'Antik Uygarlık',  emoji:'🏛️', bg:'from-black via-yellow-950 to-amber-900',  node:'from-yellow-500 to-amber-700',     border:'border-yellow-400',  glow:'shadow-[0_0_22px_rgba(234,179,8,0.6)]',    text:'text-yellow-400',  sep:'border-yellow-600/40',  bannerFrom:'#27160a', bannerTo:'#422006', bannerAccent:'#fde68a' },
        { name:'Cennet Adaları',  emoji:'🌺', bg:'from-black via-pink-950 to-rose-900',       node:'from-pink-500 to-rose-600',        border:'border-pink-400',    glow:'shadow-[0_0_22px_rgba(236,72,153,0.6)]',   text:'text-pink-400',    sep:'border-pink-600/40',    bannerFrom:'#1a0a1e', bannerTo:'#4c0519', bannerAccent:'#f472b6' },
        { name:'Galaksi',         emoji:'☄️', bg:'from-black via-purple-950 to-cyan-900',    node:'from-purple-500 to-cyan-600',      border:'border-purple-400',  glow:'shadow-[0_0_22px_rgba(168,85,247,0.6)]',   text:'text-purple-400',  sep:'border-purple-600/40',  bannerFrom:'#0d0020', bannerTo:'#1a0533', bannerAccent:'#c084fc' },
    ];

    const ZoneBanner = ({ zone, zoneIndex }) => {
      const silhouettes = {
        'Çöl': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-16 opacity-60">
            <defs>
              <radialGradient id="sun" cx="80%" cy="30%" r="15%"><stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0"/></radialGradient>
            </defs>
            <ellipse cx="320" cy="20" rx="22" ry="22" fill="url(#sun)" opacity="0.7"/>
            <path d="M0,80 Q40,30 80,55 Q120,20 160,50 Q200,15 240,45 Q280,25 320,52 Q360,30 400,55 L400,80 Z" fill={zone.bannerAccent} opacity="0.25"/>
            <path d="M0,80 Q50,45 100,65 Q150,40 200,60 Q250,38 300,62 Q350,42 400,65 L400,80 Z" fill={zone.bannerAccent} opacity="0.35"/>
            {/* Kaktüs */}
            <rect x="60" y="38" width="5" height="28" rx="2" fill={zone.bannerAccent} opacity="0.5"/>
            <rect x="48" y="48" width="17" height="4" rx="2" fill={zone.bannerAccent} opacity="0.5"/>
            <rect x="48" y="48" width="4" height="10" rx="2" fill={zone.bannerAccent} opacity="0.5"/>
            <rect x="190" y="42" width="4" height="24" rx="2" fill={zone.bannerAccent} opacity="0.4"/>
            <rect x="180" y="50" width="15" height="3" rx="2" fill={zone.bannerAccent} opacity="0.4"/>
            <rect x="180" y="50" width="3" height="8" rx="2" fill={zone.bannerAccent} opacity="0.4"/>
          </svg>
        ),
        'Okyanus': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-16 opacity-70">
            <path d="M0,50 Q25,35 50,50 Q75,65 100,50 Q125,35 150,50 Q175,65 200,50 Q225,35 250,50 Q275,65 300,50 Q325,35 350,50 Q375,65 400,50 L400,80 L0,80 Z" fill={zone.bannerAccent} opacity="0.2"/>
            <path d="M0,60 Q20,48 40,60 Q60,72 80,60 Q100,48 120,60 Q140,72 160,60 Q180,48 200,60 Q220,72 240,60 Q260,48 280,60 Q300,72 320,60 Q340,48 360,60 Q380,72 400,60 L400,80 L0,80 Z" fill={zone.bannerAccent} opacity="0.3"/>
            <path d="M0,70 Q15,64 30,70 Q45,76 60,70 Q75,64 90,70 Q105,76 120,70 Q135,64 150,70 Q165,76 180,70 Q195,64 210,70 Q225,76 240,70 Q255,64 270,70 Q285,76 300,70 Q315,64 330,70 Q345,76 360,70 Q375,64 390,70 Q395,73 400,70 L400,80 L0,80 Z" fill={zone.bannerAccent} opacity="0.45"/>
            {/* Balık */}
            <ellipse cx="100" cy="45" rx="10" ry="5" fill={zone.bannerAccent} opacity="0.3"/>
            <path d="M110,45 L122,40 L122,50 Z" fill={zone.bannerAccent} opacity="0.3"/>
            <ellipse cx="300" cy="38" rx="8" ry="4" fill={zone.bannerAccent} opacity="0.25"/>
            <path d="M308,38 L318,34 L318,42 Z" fill={zone.bannerAccent} opacity="0.25"/>
          </svg>
        ),
        'Yanardağ': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-16 opacity-65">
            <defs>
              <radialGradient id="lava" cx="50%" cy="100%" r="60%"><stop offset="0%" stopColor="#f97316" stopOpacity="0.6"/><stop offset="100%" stopColor="#7c1d06" stopOpacity="0"/></radialGradient>
            </defs>
            <path d="M0,80 L80,80 L160,20 L200,5 L240,20 L320,80 L400,80 Z" fill={zone.bannerAccent} opacity="0.15"/>
            <path d="M120,80 L170,35 L200,18 L230,35 L280,80 Z" fill={zone.bannerAccent} opacity="0.2"/>
            <path d="M155,80 L185,42 L200,28 L215,42 L245,80 Z" fill="#ef4444" opacity="0.25"/>
            <ellipse cx="200" cy="80" rx="80" ry="25" fill="url(#lava)"/>
            {/* Lav akıntısı */}
            <path d="M192,32 Q195,45 190,55 Q188,62 192,70" stroke="#f97316" strokeWidth="3" fill="none" opacity="0.5" strokeLinecap="round"/>
            <path d="M205,35 Q208,48 206,58 Q204,65 207,72" stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.4" strokeLinecap="round"/>
          </svg>
        ),
        'Uzay': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-70">
            {/* Yıldızlar */}
            {[[30,15],[80,8],[140,22],[200,10],[260,18],[320,6],[370,20],[50,35],[120,42],[280,38],[350,30],[160,5],[240,30]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r={i%3===0?1.5:1} fill={zone.bannerAccent} opacity={0.4+i%3*0.2}/>
            ))}
            {/* Gezegen */}
            <circle cx="320" cy="35" r="18" fill="#1e1b4b" stroke={zone.bannerAccent} strokeWidth="1" opacity="0.7"/>
            <ellipse cx="320" cy="35" rx="28" ry="7" fill="none" stroke={zone.bannerAccent} strokeWidth="1.5" opacity="0.5"/>
            {/* Nebula */}
            <ellipse cx="80" cy="40" rx="40" ry="20" fill={zone.bannerAccent} opacity="0.06"/>
          </svg>
        ),
        'Everest': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-full opacity-65">
            {/* Dağ silüeti */}
            <path d="M0,80 L60,80 L130,15 L160,5 L190,20 L240,80 Z" fill={zone.bannerAccent} opacity="0.12"/>
            <path d="M100,80 L200,10 L220,18 L280,80 Z" fill={zone.bannerAccent} opacity="0.18"/>
            <path d="M200,80 L280,20 L300,12 L320,20 L400,80 Z" fill={zone.bannerAccent} opacity="0.14"/>
            {/* Kar */}
            <path d="M130,15 Q145,10 160,5 Q175,10 190,20 L175,25 Q160,12 145,22 Z" fill="white" opacity="0.5"/>
            <path d="M200,10 Q210,7 220,10 Q230,7 238,15 L225,18 Q215,12 205,18 Z" fill="white" opacity="0.45"/>
            <path d="M280,20 Q290,14 300,12 Q310,14 318,20 L308,23 Q300,16 292,23 Z" fill="white" opacity="0.4"/>
            {/* Bulut */}
            <ellipse cx="60" cy="22" rx="22" ry="8" fill="white" opacity="0.12"/>
            <ellipse cx="350" cy="18" rx="18" ry="7" fill="white" opacity="0.1"/>
          </svg>
        ),
        'Amazon': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-16 opacity-65">
            {/* Orman tabanı */}
            <path d="M0,80 Q20,60 40,75 Q60,55 80,72 Q100,52 120,68 Q140,50 160,70 Q180,55 200,72 Q220,52 240,70 Q260,55 280,72 Q300,50 320,68 Q340,55 360,72 Q380,58 400,75 L400,80 Z" fill={zone.bannerAccent} opacity="0.3"/>
            {/* Ağaç silüetleri */}
            {[40,100,160,220,280,340].map((x,i) => (
              <g key={i} opacity="0.45">
                <rect x={x+3} y={55-(i%2)*5} width={4} height={20+(i%3)*5} rx="1" fill={zone.bannerAccent}/>
                <ellipse cx={x+5} cy={50-(i%2)*5} rx={12+(i%3)*3} ry={14+(i%2)*4} fill={zone.bannerAccent} opacity="0.7"/>
                <ellipse cx={x+8} cy={44-(i%2)*5} rx={8+(i%3)*2} ry={10+(i%2)*3} fill={zone.bannerAccent}/>
              </g>
            ))}
          </svg>
        ),
        'Antik Uygarlık': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-16 opacity-60">
            {/* Piramit */}
            <path d="M140,80 L200,18 L260,80 Z" fill={zone.bannerAccent} opacity="0.25"/>
            <path d="M155,80 L200,30 L245,80 Z" fill={zone.bannerAccent} opacity="0.15"/>
            {/* Sütunlar */}
            {[40,60,80,310,330,350].map((x,i) => (
              <g key={i} opacity="0.45">
                <rect x={x} y={30} width={7} height={50} fill={zone.bannerAccent}/>
                <rect x={x-3} y={28} width={13} height={5} rx="1" fill={zone.bannerAccent}/>
                <rect x={x-3} y={75} width={13} height={5} rx="1" fill={zone.bannerAccent}/>
              </g>
            ))}
            <rect x={30} y={75} width={50} height={5} fill={zone.bannerAccent} opacity="0.4"/>
            <rect x={298} y={75} width={65} height={5} fill={zone.bannerAccent} opacity="0.4"/>
            {/* Sfenks silüeti */}
            <path d="M50,75 Q65,55 80,60 Q90,58 100,65 L100,75 Z" fill={zone.bannerAccent} opacity="0.3"/>
          </svg>
        ),
        'Cennet Adaları': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-16 opacity-65">
            {/* Deniz */}
            <path d="M0,65 Q40,55 80,65 Q120,75 160,62 Q200,52 240,65 Q280,75 320,62 Q360,52 400,65 L400,80 L0,80 Z" fill={zone.bannerAccent} opacity="0.3"/>
            {/* Ada */}
            <ellipse cx="200" cy="72" rx="55" ry="12" fill="#854d0e" opacity="0.35"/>
            {/* Palmiye */}
            <line x1="200" y1="72" x2="200" y2="30" stroke="#92400e" strokeWidth="3" opacity="0.5"/>
            <path d="M200,32 Q185,22 170,28" stroke={zone.bannerAccent} strokeWidth="2" fill="none" opacity="0.6"/>
            <path d="M200,32 Q215,22 230,28" stroke={zone.bannerAccent} strokeWidth="2" fill="none" opacity="0.6"/>
            <path d="M200,35 Q185,28 172,34" stroke={zone.bannerAccent} strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M200,35 Q215,28 228,34" stroke={zone.bannerAccent} strokeWidth="2" fill="none" opacity="0.5"/>
            <path d="M200,38 Q190,32 180,38" stroke={zone.bannerAccent} strokeWidth="1.5" fill="none" opacity="0.4"/>
            {/* Güneş */}
            <circle cx="340" cy="20" r="12" fill="#fde68a" opacity="0.4"/>
            {/* Küçük ada */}
            <ellipse cx="320" cy="74" rx="25" ry="8" fill="#854d0e" opacity="0.25"/>
          </svg>
        ),
        'Galaksi': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-70">
            {/* Galaksi sarmalı */}
            <ellipse cx="200" cy="40" rx="80" ry="25" fill="none" stroke={zone.bannerAccent} strokeWidth="1" opacity="0.2"/>
            <ellipse cx="200" cy="40" rx="55" ry="17" fill="none" stroke={zone.bannerAccent} strokeWidth="1.5" opacity="0.25"/>
            <ellipse cx="200" cy="40" rx="30" ry="9" fill="none" stroke={zone.bannerAccent} strokeWidth="2" opacity="0.3"/>
            <circle cx="200" cy="40" r="6" fill={zone.bannerAccent} opacity="0.5"/>
            {/* Yıldızlar */}
            {[[20,10],[60,25],[100,8],[320,15],[360,30],[380,8],[140,35],[270,32],[80,55],[340,55]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r={i%4===0?2:1} fill={zone.bannerAccent} opacity={0.3+i%4*0.15}/>
            ))}
            {/* Kuyrukluyıldız */}
            <circle cx="60" cy="20" r="3" fill="white" opacity="0.5"/>
            <path d="M63,20 L95,28" stroke="white" strokeWidth="1.5" opacity="0.25" strokeLinecap="round"/>
          </svg>
        ),
        'Başlangıç': (
          <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full h-16 opacity-60">
            <path d="M0,80 Q40,55 80,70 Q120,48 160,65 Q200,45 240,65 Q280,48 320,68 Q360,52 400,70 L400,80 Z" fill={zone.bannerAccent} opacity="0.2"/>
            {/* Ağaç fidanı */}
            {[60,150,240,330].map((x,i) => (
              <g key={i} opacity="0.45">
                <line x1={x} y1={75} x2={x} y2={50-(i%2)*8} stroke={zone.bannerAccent} strokeWidth="2"/>
                <circle cx={x} cy={45-(i%2)*8} r={8+(i%3)*3} fill={zone.bannerAccent} opacity="0.6"/>
              </g>
            ))}
            {/* Küçük güneş */}
            <circle cx="200" cy="15" r="10" fill={zone.bannerAccent} opacity="0.3"/>
            {[0,45,90,135,180,225,270,315].map((a,i) => (
              <line key={i} x1={200 + 13*Math.cos(a*Math.PI/180)} y1={15 + 13*Math.sin(a*Math.PI/180)} x2={200 + 18*Math.cos(a*Math.PI/180)} y2={15 + 18*Math.sin(a*Math.PI/180)} stroke={zone.bannerAccent} strokeWidth="1.5" opacity="0.3"/>
            ))}
          </svg>
        ),
      };

      const zoneNumber = zoneIndex + 1;
      return (
        <div className="w-full my-2 px-3 pointer-events-none">
          <div className="relative overflow-hidden rounded-2xl" style={{ height: 110, background: `linear-gradient(135deg, ${zone.bannerFrom} 0%, ${zone.bannerTo} 100%)` }}>
            {/* Arka plan ışık huzmesi */}
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 120%, ${zone.bannerAccent}22 0%, transparent 65%)` }}/>
            {/* Tematik SVG silüet */}
            {silhouettes[zone.name] || null}
            {/* Üst şerit — parlak çizgi */}
            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${zone.bannerAccent}90, transparent)` }}/>
            {/* İçerik */}
            <div className="absolute inset-0 flex items-center justify-between px-5">
              <div className="flex items-center gap-3">
                <div className="text-4xl drop-shadow-lg leading-none">{zone.emoji}</div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50 mb-0.5">ZON {zoneNumber} · SEVİYE {(zoneIndex)*20+1}–{zoneIndex*20+20}</div>
                  <div className="text-xl font-black uppercase tracking-wide leading-tight" style={{ color: zone.bannerAccent, textShadow: `0 0 20px ${zone.bannerAccent}80` }}>{zone.name}</div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 opacity-60">
                <div className="text-[8px] font-black uppercase tracking-widest">Yeni Bölge</div>
                <div className="flex gap-0.5">
                  {[...Array(3)].map((_,i) => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: zone.bannerAccent, opacity: 0.4 + i*0.3 }}/>)}
                </div>
              </div>
            </div>
            {/* Alt şerit */}
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${zone.bannerAccent}60, transparent)` }}/>
          </div>
        </div>
      );
    };

    const ZoneSectionBg = ({ zone }) => {
      const ac = zone.bannerAccent;
      const svgs = {
        'Başlangıç': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {[60,140,230,310,370].map((x,i)=>(
              <g key={i} opacity="0.10">
                <line x1={x} y1={80+i*120} x2={x} y2={140+i*120} stroke={ac} strokeWidth="3"/>
                <circle cx={x} cy={80+i*120} r={14+i%3*4} fill={ac}/>
                <ellipse cx={x-12} cy={95+i*120} rx="9" ry="6" fill={ac} transform={`rotate(-30,${x-12},${95+i*120})`}/>
                <ellipse cx={x+12} cy={95+i*120} rx="9" ry="6" fill={ac} transform={`rotate(30,${x+12},${95+i*120})`}/>
              </g>
            ))}
            <circle cx="340" cy="55" r="30" fill={ac} opacity="0.07"/>
            {[0,45,90,135,180,225,270,315].map((a,i)=>(
              <line key={i} x1={340+33*Math.cos(a*Math.PI/180)} y1={55+33*Math.sin(a*Math.PI/180)} x2={340+44*Math.cos(a*Math.PI/180)} y2={55+44*Math.sin(a*Math.PI/180)} stroke={ac} strokeWidth="2" opacity="0.07"/>
            ))}
          </svg>
        ),
        'Çöl': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Sun */}
            <circle cx="350" cy="60" r="38" fill={ac} opacity="0.09"/>
            {[0,45,90,135,180,225,270,315].map((a,i)=>(
              <line key={i} x1={350+42*Math.cos(a*Math.PI/180)} y1={60+42*Math.sin(a*Math.PI/180)} x2={350+56*Math.cos(a*Math.PI/180)} y2={60+56*Math.sin(a*Math.PI/180)} stroke={ac} strokeWidth="2.5" opacity="0.08"/>
            ))}
            {/* Sand dunes */}
            <path d="M0,580 Q80,530 160,565 Q240,510 320,555 Q360,535 400,555 L400,700 L0,700 Z" fill={ac} opacity="0.10"/>
            <path d="M0,630 Q100,600 200,625 Q300,595 400,620 L400,700 L0,700 Z" fill={ac} opacity="0.08"/>
            {/* Cactus left */}
            <rect x="35" y="350" width="14" height="100" rx="5" fill={ac} opacity="0.10"/>
            <rect x="20" y="375" width="28" height="10" rx="5" fill={ac} opacity="0.10"/>
            <rect x="20" y="372" width="10" height="22" rx="4" fill={ac} opacity="0.10"/>
            <rect x="38" y="410" width="24" height="9" rx="4" fill={ac} opacity="0.10"/>
            <rect x="52" y="407" width="10" height="20" rx="4" fill={ac} opacity="0.10"/>
            {/* Pyramid */}
            <polygon points="280,430 240,550 320,550" fill={ac} opacity="0.09"/>
            <polygon points="310,490 290,550 330,550" fill={ac} opacity="0.07"/>
            {/* Camel silhouette (simple) */}
            <ellipse cx="100" cy="460" rx="35" ry="18" fill={ac} opacity="0.08"/>
            <ellipse cx="88" cy="445" rx="12" ry="22" fill={ac} opacity="0.08"/>
            <rect x="75" y="475" width="8" height="25" rx="3" fill={ac} opacity="0.08"/>
            <rect x="95" y="475" width="8" height="25" rx="3" fill={ac} opacity="0.08"/>
            <rect x="112" y="475" width="8" height="25" rx="3" fill={ac} opacity="0.08"/>
          </svg>
        ),
        'Okyanus': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Wave layers */}
            {[200,320,440,560,650].map((y,i)=>(
              <path key={i} d={`M0,${y} Q50,${y-20} 100,${y} Q150,${y+20} 200,${y} Q250,${y-20} 300,${y} Q350,${y+20} 400,${y}`} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.12"/>
            ))}
            {/* Fish */}
            {[[80,150],[280,300],[120,480],[320,550],[200,180]].map(([x,y],i)=>(
              <g key={i} opacity="0.10">
                <ellipse cx={x} cy={y} rx="18" ry="8" fill={ac}/>
                <polygon points={`${x+18},${y} ${x+30},${y-8} ${x+30},${y+8}`} fill={ac}/>
                <circle cx={x-8} cy={y-2} r="2" fill="black" opacity="0.4"/>
              </g>
            ))}
            {/* Bubbles */}
            {[[50,250],[150,380],[330,200],[260,480],[380,350]].map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r={3+i%3*2} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.13"/>
            ))}
            {/* Coral */}
            <path d="M30,660 L30,620 M30,640 L18,625 M30,640 L42,625" stroke={ac} strokeWidth="3" opacity="0.10" strokeLinecap="round"/>
            <path d="M370,650 L370,610 M370,625 L358,610 M370,625 L382,610" stroke={ac} strokeWidth="3" opacity="0.10" strokeLinecap="round"/>
          </svg>
        ),
        'Yanardağ': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Volcano */}
            <path d="M0,700 L120,700 L200,350 L280,700 L400,700 Z" fill={ac} opacity="0.07"/>
            <path d="M150,700 L200,420 L250,700 Z" fill={ac} opacity="0.08"/>
            {/* Lava glow */}
            <ellipse cx="200" cy="700" rx="100" ry="35" fill={ac} opacity="0.10"/>
            {/* Lava drips */}
            {[[188,380],[205,395],[215,370],[195,410]].map(([x,y],i)=>(
              <path key={i} d={`M${x},${y} Q${x-4},${y+18} ${x},${y+30} Q${x+4},${y+18} ${x},${y}`} fill={ac} opacity="0.13"/>
            ))}
            {/* Embers */}
            {[[100,200],[160,120],[220,160],[300,200],[340,140],[80,300],[360,280]].map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r={2+i%3} fill={ac} opacity={0.10+i%3*0.04}/>
            ))}
            {/* Smoke puffs */}
            {[190,205,218].map((x,i)=>(
              <circle key={i} cx={x} cy={330-i*25} r={12+i*6} fill={ac} opacity="0.05"/>
            ))}
          </svg>
        ),
        'Uzay': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Stars */}
            {[[20,40],[60,120],[100,20],[150,80],[200,30],[250,100],[300,50],[360,90],[40,200],[120,250],[200,180],[280,220],[350,160],[80,380],[200,350],[320,400],[50,520],[180,490],[300,560],[380,480]].map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r={i%5===0?2.5:i%3===0?1.5:1} fill={ac} opacity={0.08+i%4*0.04}/>
            ))}
            {/* Planet */}
            <circle cx="320" cy="180" r="30" fill={ac} opacity="0.07"/>
            <ellipse cx="320" cy="180" rx="48" ry="11" fill="none" stroke={ac} strokeWidth="2" opacity="0.10"/>
            {/* Nebula blobs */}
            <ellipse cx="80" cy="340" rx="50" ry="30" fill={ac} opacity="0.04"/>
            <ellipse cx="280" cy="500" rx="60" ry="35" fill={ac} opacity="0.04"/>
            {/* Comet */}
            <circle cx="60" cy="500" r="4" fill={ac} opacity="0.14"/>
            <path d="M64,498 L120,488" stroke={ac} strokeWidth="2" opacity="0.08" strokeLinecap="round"/>
          </svg>
        ),
        'Everest': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Distant mountains */}
            <path d="M0,700 L60,400 L130,500 L200,320 L270,480 L340,380 L400,460 L400,700 Z" fill={ac} opacity="0.06"/>
            {/* Snowflakes */}
            {[[40,80],[150,140],[280,60],[360,180],[90,300],[220,250],[310,380],[60,500],[200,450],[350,500]].map(([x,y],i)=>(
              <g key={i} opacity="0.09">
                {[0,60,120].map(a=>(
                  <line key={a} x1={x} y1={y-8} x2={x} y2={y+8} stroke={ac} strokeWidth="1.5" transform={`rotate(${a},${x},${y})`}/>
                ))}
                {[0,60,120].map(a=>(
                  <g key={`b${a}`} transform={`rotate(${a},${x},${y})`}>
                    <line x1={x} y1={y-5} x2={x-4} y2={y-9} stroke={ac} strokeWidth="1"/>
                    <line x1={x} y1={y-5} x2={x+4} y2={y-9} stroke={ac} strokeWidth="1"/>
                  </g>
                ))}
              </g>
            ))}
            {/* Clouds */}
            {[[80,120],[260,90],[350,200]].map(([x,y],i)=>(
              <g key={i} opacity="0.07">
                <ellipse cx={x} cy={y} rx="35" ry="14" fill={ac}/>
                <ellipse cx={x-18} cy={y+4} rx="20" ry="11" fill={ac}/>
                <ellipse cx={x+18} cy={y+4} rx="20" ry="11" fill={ac}/>
              </g>
            ))}
          </svg>
        ),
        'Amazon': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Big tree silhouettes */}
            {[[40,1],[160,0],[280,1],[360,0]].map(([x,off],i)=>(
              <g key={i} opacity="0.09">
                <rect x={x-3} y={450+off*20} width="6" height={250-off*10} rx="2" fill={ac}/>
                <ellipse cx={x} cy={440+off*20} rx={28+i%2*12} ry={45+i%2*15} fill={ac}/>
                <ellipse cx={x} cy={408+off*20} rx={18+i%2*8} ry={30+i%2*10} fill={ac}/>
              </g>
            ))}
            {/* Vines */}
            <path d="M0,100 Q30,180 10,280 Q-10,360 20,450" stroke={ac} strokeWidth="2" fill="none" opacity="0.08"/>
            <path d="M400,50 Q370,150 390,250 Q410,330 380,430" stroke={ac} strokeWidth="2" fill="none" opacity="0.08"/>
            {/* Leaves scattered */}
            {[[100,200],[200,320],[300,180],[150,480],[250,550]].map(([x,y],i)=>(
              <ellipse key={i} cx={x} cy={y} rx="12" ry="7" fill={ac} opacity="0.09" transform={`rotate(${i*35},${x},${y})`}/>
            ))}
            {/* Ground foliage */}
            <path d="M0,660 Q40,630 80,655 Q120,620 160,648 Q200,618 240,645 Q280,618 320,648 Q360,625 400,648 L400,700 L0,700 Z" fill={ac} opacity="0.09"/>
          </svg>
        ),
        'Antik Uygarlık': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Pyramid background */}
            <polygon points="200,100 90,550 310,550" fill={ac} opacity="0.07"/>
            <polygon points="200,180 130,550 270,550" fill={ac} opacity="0.05"/>
            {/* Columns */}
            {[30,65,310,345].map((x,i)=>(
              <g key={i} opacity="0.10">
                <rect x={x} y={200} width="12" height="350" fill={ac}/>
                <rect x={x-5} y={196} width="22" height="10" rx="1" fill={ac}/>
                <rect x={x-5} y={545} width="22" height="10" rx="1" fill={ac}/>
                <line x1={x+3} y1={210} x2={x+3} y2={545} stroke={ac} strokeWidth="1" opacity="0.4"/>
                <line x1={x+9} y1={210} x2={x+9} y2={545} stroke={ac} strokeWidth="1" opacity="0.4"/>
              </g>
            ))}
            {/* Eye of Horus */}
            <ellipse cx="200" cy="600" rx="22" ry="12" fill="none" stroke={ac} strokeWidth="2" opacity="0.10"/>
            <circle cx="200" cy="600" r="6" fill={ac} opacity="0.10"/>
            <path d="M178,612 L168,625 M222,612 L232,625" stroke={ac} strokeWidth="1.5" opacity="0.10"/>
            {/* Hieroglyph lines */}
            {[100,140,180,220].map((y,i)=>(
              <rect key={i} x="370" y={y} width={8+i%3*4} height="4" rx="1" fill={ac} opacity="0.08"/>
            ))}
          </svg>
        ),
        'Cennet Adaları': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Sun */}
            <circle cx="340" cy="60" r="32" fill={ac} opacity="0.09"/>
            {[0,40,80,120,160,200,240,280,320].map((a,i)=>(
              <line key={i} x1={340+36*Math.cos(a*Math.PI/180)} y1={60+36*Math.sin(a*Math.PI/180)} x2={340+50*Math.cos(a*Math.PI/180)} y2={60+50*Math.sin(a*Math.PI/180)} stroke={ac} strokeWidth="2" opacity="0.08"/>
            ))}
            {/* Ocean */}
            {[500,560,610,655].map((y,i)=>(
              <path key={i} d={`M0,${y} Q50,${y-15} 100,${y} Q150,${y+15} 200,${y} Q250,${y-15} 300,${y} Q350,${y+15} 400,${y}`} fill="none" stroke={ac} strokeWidth="1.5" opacity="0.10"/>
            ))}
            {/* Island */}
            <ellipse cx="160" cy="590" rx="70" ry="20" fill={ac} opacity="0.09"/>
            {/* Palm tree */}
            <path d="M160,590 Q155,510 158,460" stroke={ac} strokeWidth="4" fill="none" opacity="0.10" strokeLinecap="round"/>
            {[[-35,-30],[-25,-45],[5,-55],[35,-30],[25,-45]].map(([dx,dy],i)=>(
              <path key={i} d={`M158,460 Q${158+dx/2},${460+dy/2} ${158+dx},${460+dy}`} stroke={ac} strokeWidth="2.5" fill="none" opacity="0.10" strokeLinecap="round"/>
            ))}
            {/* Starfish */}
            <circle cx="300" cy="620" r="10" fill={ac} opacity="0.08"/>
            {[0,72,144,216,288].map((a,i)=>(
              <line key={i} x1={300} y1={620} x2={300+14*Math.cos(a*Math.PI/180)} y2={620+14*Math.sin(a*Math.PI/180)} stroke={ac} strokeWidth="3" opacity="0.08" strokeLinecap="round"/>
            ))}
          </svg>
        ),
        'Galaksi': (
          <svg width="100%" height="100%" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice" className="absolute inset-0">
            {/* Galaxy spiral */}
            {[110,85,60,40,22].map((rx,i)=>(
              <ellipse key={i} cx="200" cy="350" rx={rx*2} ry={rx} fill="none" stroke={ac} strokeWidth="1.5" opacity={0.05+i*0.02} transform={`rotate(${i*18},200,350)`}/>
            ))}
            <circle cx="200" cy="350" r="8" fill={ac} opacity="0.12"/>
            {/* Stars */}
            {[[20,50],[80,30],[140,80],[260,40],[330,70],[380,20],[50,150],[310,160],[100,260],[350,300],[30,420],[370,450],[150,560],[280,580],[60,660],[360,640]].map(([x,y],i)=>(
              <circle key={i} cx={x} cy={y} r={i%6===0?2:1} fill={ac} opacity={0.08+i%4*0.03}/>
            ))}
            {/* Comet */}
            <circle cx="80" cy="150" r="4" fill={ac} opacity="0.13"/>
            <path d="M84,148 L140,135" stroke={ac} strokeWidth="2" opacity="0.08" strokeLinecap="round"/>
            {/* Black hole ring */}
            <circle cx="320" cy="550" r="28" fill="none" stroke={ac} strokeWidth="3" opacity="0.08"/>
            <circle cx="320" cy="550" r="12" fill={ac} opacity="0.06"/>
          </svg>
        ),
      };
      return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {svgs[zone.name] || null}
        </div>
      );
    };

    useEffect(() => {
      if (currentNodeRef.current) {
        currentNodeRef.current.scrollIntoView({ behavior: 'instant', block: 'center' });
      }
    }, [selectedLen, currentLevel]);

    const getZone = (level) => ZONES[Math.min(Math.floor((level - 1) / 20), 9)];
    const currentZone = getZone(currentLevel);

    return (
        <div className={`h-screen flex flex-col font-sans overflow-hidden bg-gradient-to-b ${currentZone.bg} text-white transition-colors duration-1000`}>

            {/* Header */}
            <header className="px-4 py-3 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md z-20">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft size={24} /></button>
                    <button onClick={() => setShowInfo(true)} className="p-1 hover:bg-white/20 rounded-full text-white/50 transition-colors"><HelpCircle size={18} /></button>
                </div>
                <div className="flex flex-col items-center leading-tight">
                    <span className="text-base font-black italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">SINIRSIZ MOD</span>
                </div>
                <button onClick={() => setShowAvatarSelect(true)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 border border-white/20 text-2xl hover:scale-105 transition-transform">
                    {userAvatar.icon}
                </button>
            </header>

            {/* Info Modal — zorluk ipucu yok */}
            {showInfo && (
                <div className="absolute inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-3xl p-6 w-full max-w-sm border border-white/20 shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-black text-xl flex items-center gap-2"><InfinityIcon size={20} className="text-purple-400" /> Nasıl Oynanır?</h3>
                            <button onClick={() => setShowInfo(false)} className="p-1 hover:bg-white/10 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="space-y-3 mb-5 text-sm text-white/80">
                            <p>Her bölümde bir <b className="text-white">başlangıç</b> ve bir <b className="text-white">bitiş</b> kelimesi verilir.</p>
                            <p>Adım adım, sadece <b className="text-white">tek harf</b> değiştirerek bitiş kelimesine ulaşman gerekir.</p>
                            <p>Her yazdığın kelime <b className="text-white">geçerli bir Türkçe kelime</b> olmalıdır.</p>
                            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                                <p className="font-black text-white text-xs uppercase tracking-widest mb-1">Boss Bölümler 👑</p>
                                <p className="text-xs text-white/60">Her 10. bölüm boss bölümdür. Boss'u geçmeden sonraki 10'lu blok açılmaz. Önceki bölümlere her zaman dönebilirsin.</p>
                            </div>
                        </div>
                        <button onClick={() => setShowInfo(false)} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-3 rounded-xl font-bold active:scale-95 transition-transform">ANLADIM</button>
                    </div>
                </div>
            )}

            {/* Avatar Modal */}
            {showAvatarSelect && (
                <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-gray-900 rounded-3xl p-6 w-full max-w-sm border border-white/20 shadow-2xl">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-black text-xl">Avatarını Seç</h3>
                            <button onClick={() => setShowAvatarSelect(false)} className="p-2 bg-white/5 rounded-xl"><X size={20}/></button>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                            {avatars.map(avt => (
                                <button key={avt.id} onClick={() => { setUserAvatar(avt); setShowAvatarSelect(false); localStorage.setItem('evolvo_guest_avatar', JSON.stringify(avt)); }}
                                    className={`text-3xl aspect-square flex items-center justify-center rounded-2xl transition-all ${userAvatar.id === avt.id ? 'bg-purple-600/50 border-2 border-purple-400 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-black/30 hover:bg-white/10'}`}>
                                    {avt.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Harf Tabları */}
            <div className="flex gap-3 p-3 z-20 bg-black/30 border-b border-white/5">
                {[4, 5, 6].map(len => (
                    <button key={len} onClick={() => { setSelectedLen(len); localStorage.setItem('evolvo_offline_tab', len); }}
                        className={`flex-1 py-2.5 rounded-xl font-black text-sm transition-all ${selectedLen === len ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30 scale-105' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}>
                        <div>{len} HARFLİ</div>
                        <div className="text-[9px] font-bold opacity-60 mt-0.5">Bölüm {progress[len] || 1}</div>
                    </button>
                ))}
            </div>

            {/* Harita — 10 zon × 20 seviye, her zon kendi arka planıyla */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto flex flex-col w-full pb-36" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', overflowX: 'hidden' }}>
                {Array.from({ length: 10 }, (_, i) => 9 - i).map(zoneIndex => {
                    const zone = ZONES[zoneIndex];
                    const startLevel = zoneIndex * 20 + 1;
                    const endLevel = Math.min(zoneIndex * 20 + 20, TOTAL_LEVELS);
                    const zoneLevels = Array.from({ length: endLevel - startLevel + 1 }, (_, i) => endLevel - i);

                    return (
                        <div key={zoneIndex} className="w-full relative" style={{ background: `linear-gradient(to bottom, ${zone.bannerFrom}cc 0%, ${zone.bannerTo}aa 35%, ${zone.bannerTo}66 70%, ${zone.bannerFrom}33 100%)` }}>
                            <ZoneSectionBg zone={zone} />
                            <ZoneBanner zone={zone} zoneIndex={zoneIndex} />
                            <div className="flex flex-col items-center w-full pt-2 pb-4">
                                {zoneLevels.map(level => {
                                    const idx = level - 1;
                                    const levelScoreRaw = categoryScores[level];
                                    const levelScore = typeof levelScoreRaw === 'object' ? levelScoreRaw.score : (levelScoreRaw || 0);
                                    let earnedStars = 0;
                                    if (levelScore >= 800) earnedStars = 3;
                                    else if (levelScore >= 600) earnedStars = 2;
                                    else if (levelScore > 0) earnedStars = 1;
                                    const isBeaten   = level < currentLevel;
                                    const isCurrent  = level === currentLevel;
                                    const isUnlocked = level <= highestUnlocked;
                                    const isBoss     = level % 10 === 0;
                                    const offset     = Math.sin(idx * 0.8) * 72;

                                    return (
                                        <div key={level} ref={isCurrent ? currentNodeRef : null} className="flex flex-col items-center w-full my-3">
                                            <div className="flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                                                {isBoss && isUnlocked && !isBeaten && (
                                                    <div className={`mb-1.5 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${zone.text} bg-black/40 border ${zone.sep} animate-pulse`}>
                                                        👑 BOSS
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => isUnlocked && onPlay(selectedLen, level)}
                                                    disabled={!isUnlocked}
                                                    className={`relative z-10 flex items-center justify-center rounded-full border-4 transition-all active:scale-90
                                                        ${isCurrent    ? `w-20 h-20 border-white bg-gradient-to-br ${zone.node} ${zone.glow} animate-pulse`
                                                        : isBeaten     ? `w-11 h-11 border-white/20 bg-white/10 cursor-pointer hover:scale-105 hover:bg-white/20`
                                                        : isBoss && isUnlocked ? `w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-600 border-yellow-300 cursor-pointer hover:scale-110 shadow-[0_0_30px_rgba(245,158,11,0.7)]`
                                                        : isUnlocked   ? `w-[52px] h-[52px] bg-gradient-to-br ${zone.node} ${zone.border} cursor-pointer hover:scale-110 ${zone.glow}`
                                                        : 'w-11 h-11 border-white/20 bg-white/5 cursor-not-allowed opacity-50'}`}
                                                >
                                                    {isCurrent && (
                                                        <div className="absolute -top-12 animate-bounce text-4xl drop-shadow-[0_8px_8px_rgba(0,0,0,0.6)] z-20">
                                                            {userAvatar.icon}
                                                        </div>
                                                    )}
                                                    {isBeaten     ? <CheckCircle2 size={18} className="text-white/60" />
                                                    : isCurrent   ? <span className="font-black text-lg text-white">{level}</span>
                                                    : isBoss && isUnlocked ? <span className="text-xl">💀</span>
                                                    : isUnlocked  ? <span className="font-black text-sm text-white">{level}</span>
                                                    : <Lock size={14} className="text-white/20" />}
                                                </button>
                                                {isBeaten && earnedStars > 0 && (
                                                    <div className="mt-1 flex gap-0.5">
                                                        {[1, 2, 3].map(s => (
                                                            <Star key={s} size={10} className={s <= earnedStars ? 'text-yellow-400 fill-yellow-400 drop-shadow-md' : 'text-white/15'} />
                                                        ))}
                                                    </div>
                                                )}
                                                {categoryScores[level] && isBeaten && (
                                                    <div className="mt-0.5 text-[8px] font-bold text-yellow-300/60">
                                                        {typeof categoryScores[level] === 'object' ? categoryScores[level].score : (categoryScores[level] || 0)}P
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Alt Oyna Butonu */}
            <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-30 pointer-events-none">
                <div className="max-w-sm mx-auto space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${currentZone.text}`}>
                            {currentZone.emoji} {currentZone.name} • Bölüm {currentLevel}
                        </span>
                    </div>
                    <button onClick={() => onPlay(selectedLen, currentLevel)} className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:brightness-110 py-4 rounded-2xl font-black text-lg shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 pointer-events-auto`}>
                        <Play fill="currentColor" size={20} /> {currentLevel}. BÖLÜMÜ OYNA
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- YEPYENİ: MEYDAN OKUMA OLUŞTURUCU SAYFASI ---
const ChallengePage = ({ onBack, theme, colors, checkTDK, toggleModal }) => {
const [isWon, setIsWon] = useState(false);
const [winningRowAnimation, setWinningRowAnimation] = useState(null);
const [showShareToast, setShowShareToast] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
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

const LeaderboardModal = ({ isOpen, onClose, theme, colors, userAvatar, username, leaderboardData = {}, onTabChange }) => {
  const [activeTab, setActiveTab] = useState('daily');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const currentScores = Array.isArray(leaderboardData)
    ? leaderboardData
    : (leaderboardData[activeTab] || []);

  const userScore = !Array.isArray(leaderboardData)
    ? (leaderboardData[`${activeTab}_user`] || null)
    : null;

  const userInTopList = username && currentScores.some(
    s => s.name?.toLowerCase() === username?.toLowerCase()
  );

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md" onClick={onClose}>
       <div className={`${theme.panel} w-full max-w-md rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black italic uppercase tracking-tighter">SIRALAMA</h2><button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button></div>

          <div className="flex p-1 bg-white/5 rounded-xl mb-6 shadow-inner border border-white/5">
            {['daily', 'weekly', 'monthly'].map(tab => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${activeTab === tab ? 'bg-white/10 text-white shadow' : 'text-white/40 hover:text-white/70'}`}
              >
                {tab === 'daily' ? 'Günlük' : tab === 'weekly' ? 'Haftalık' : 'Aylık'}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20">
             {currentScores.length > 0 ? (
               <>
                {currentScores.map((data, i) => (
                  <div key={i} className={`flex justify-between items-center p-4 rounded-xl border ${i === 0 ? 'bg-yellow-500/20 border-yellow-500/50 shadow-yellow-500/10' : theme.emptyCell} shadow-inner`}>
                     <div className="flex items-center gap-4">
                        <span className={`font-black w-5 text-center text-lg ${i < 3 ? 'text-yellow-400' : 'opacity-60'}`}>{data.rank || i + 1}</span>
                        <div className="flex items-center gap-2">
                           <div className="text-3xl shadow-sm">{data.name === username ? userAvatar.icon : (data.avatar || '👤')}</div>
                           <span className={`font-bold ${data.name === username ? 'text-green-400' : 'text-white'}`}>{data.name}</span>
                        </div>
                     </div>
                     <span className="font-black text-lg text-white/90 tracking-tight">{data.score} Puan</span>
                  </div>
                ))}
                {!userInTopList && userScore && (
                  <>
                    <div className="text-center py-1 opacity-30 text-sm tracking-widest">• • •</div>
                    <div className="flex justify-between items-center p-4 rounded-xl border border-green-500/40 bg-green-500/10 shadow-inner">
                      <div className="flex items-center gap-4">
                        <span className="font-black w-5 text-center text-lg opacity-60">{userScore.rank}</span>
                        <div className="flex items-center gap-2">
                          <div className="text-3xl shadow-sm">{userAvatar.icon}</div>
                          <span className="font-bold text-green-400">{userScore.name}</span>
                        </div>
                      </div>
                      <span className="font-black text-lg text-white/90 tracking-tight">{userScore.score} Puan</span>
                    </div>
                  </>
                )}
               </>
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