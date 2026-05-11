export const TURKISH_DICTIONARY_MOCK = [
  "YATAK", "YASAK", "YANAK", "YANIK", "TANIK", "SANIK", "SADIK", "SAZIK", "KAZIK", "KAZAK",
  "EVRAK", "EVRAT", "EVKAT", "EUKAT", "KUKAT", "KONAT", "KONAK",
  "KONUK", "KONUT", "KOMUT", "VURAK", "DURAK", "DORAK", "KORAK", "TARAK", "YARAK", "BARAK", "KABAK", "TABAK",
  "KALEM", "KELAM", "SELAM", "SALAM", "SALIM", "SALIK", "BALIK"
];

export const getStartDate = () => new Date(2025, 10, 1);

export const ACHIEVEMENTS = [
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

export const AVATARS = [
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
  { id: 30, icon: '⚽', label: 'Futbol' },
];

const ADJECTIVES = ["Hızlı", "Cesur", "Bilge", "Çılgın", "Gizemli", "Zehirli", "Vahşi", "Gölge", "Parlak", "Buzlu", "Ateşli", "Sessiz", "Kayıp", "Efsane", "Yırtıcı", "Demir", "Çelik", "Uçan", "Altın", "Bordo"];
const NOUNS = ["Dinozor", "Porsuk", "Baykuş", "Kedi", "Kaplan", "Kurt", "Şahin", "Ejderha", "Yılan", "Panter", "Akrep", "Kartal", "Boğa", "Ayı", "Timsah", "Kuzgun", "Anka", "Korsan", "Ninja", "Robot"];

export const generateRandomName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${adj}_${noun}_${num}`;
};

export const THEMES = {
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

export const COLOR_BLIND_THEME = {
  success: "bg-blue-600 border-blue-800 text-white",
  error: "bg-orange-600 border-orange-800 text-white",
  logoSuccess: "bg-blue-600",
  logoError: "bg-orange-600"
};
