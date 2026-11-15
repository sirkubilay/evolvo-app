import { useState, useEffect, useRef } from 'react';
import { ZoneSceneBg, ZoneBannerArt, ZoneArtStyles } from '../components/ZoneArt';
import { Play, X, Star, HelpCircle, CheckCircle2, ChevronLeft, Infinity as InfinityIcon, Lock } from 'lucide-react';

export const UnlimitedMenuPage = ({ onBack, progress, scores, userAvatar, setUserAvatar, onPlay }) => {
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
      const zoneNumber = zoneIndex + 1;
      return (
        <div className="w-full my-2 px-3 pointer-events-none">
          <div className="relative overflow-hidden rounded-2xl" style={{ height: 110, background: `linear-gradient(135deg, ${zone.bannerFrom} 0%, ${zone.bannerTo} 100%)` }}>
            {/* Arka plan ışık huzmesi */}
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 120%, ${zone.bannerAccent}22 0%, transparent 65%)` }}/>
            {/* Tematik SVG silüet */}
            <ZoneBannerArt name={zone.name} />
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
            </div>
            {/* Alt şerit */}
            <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${zone.bannerAccent}60, transparent)` }}/>
          </div>
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

            <ZoneArtStyles />
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
                            <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="relative h-full w-full max-w-[520px] mx-auto sm:[mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"><ZoneSceneBg name={zone.name} /></div></div>
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
