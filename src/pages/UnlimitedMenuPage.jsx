import { useState, useEffect, useRef } from 'react';
import { Play, X, Star, HelpCircle, CheckCircle2, ChevronLeft, Infinity as InfinityIcon, Lock } from 'lucide-react';

export const UnlimitedMenuPage = ({ onBack, theme, progress, scores, userAvatar, setUserAvatar, onPlay }) => {
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
