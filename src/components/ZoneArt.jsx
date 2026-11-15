// Sınırsız mod bölge illüstrasyonları.
// Her bölge: defs (gradyanlar), sky (bölüm boyunca dağılan ortam süsleri) ve ground (alttaki ana manzara).
// Bölüm arka planı viewBox 400×1700, banner aynı "ground"u kırparak kullanır.

const W = 400;
const H = 1700;
const G = 1330; // manzaranın başladığı yükseklik

/* ---------- küçük yardımcı şekiller ---------- */
const Fish = ({ x, y, s = 1, c1, c2, flip = false, cls = '', delay = 0 }) => (
  <g transform={`translate(${x},${y}) scale(${flip ? -s : s},${s})`}>
    <g className={cls} style={{ animationDelay: `${delay}s` }}>
      <path d="M0,0 C7,-9 20,-9 27,0 C20,9 7,9 0,0 Z" fill={c1} />
      <path d="M25,0 L36,-8 L33,0 L36,8 Z" fill={c2} />
      <path d="M11,-6 Q15,-11 19,-6 Z" fill={c2} />
      <path d="M10,-6 Q12,0 10,6" stroke={c2} strokeWidth="1.2" fill="none" opacity="0.7" />
      <circle cx="5" cy="-1.5" r="1.8" fill="#0b1020" />
      <circle cx="5.5" cy="-2" r="0.6" fill="#fff" />
    </g>
  </g>
);

const Leaf = ({ x, y, r = 0, s = 1, c }) => (
  <path d="M0,0 Q12,-9 32,0 Q12,9 0,0 Z" fill={c} transform={`translate(${x},${y}) rotate(${r}) scale(${s})`} />
);

const Palm = ({ x, y, h = 120, lean = 18, c = '#0f3d2e', trunk = '#5b3a1e', s = 1 }) => {
  const tx = x + lean;
  const ty = y - h;
  return (
    <g>
      <path d={`M${x},${y} Q${x + lean * 0.2},${y - h * 0.55} ${tx},${ty}`} stroke={trunk} strokeWidth={7 * s} fill="none" strokeLinecap="round" />
      {[-160, -125, -95, -60, -25, 10].map((r, i) => (
        <path key={i} d="M0,0 Q22,-14 52,4 Q24,-4 0,0 Z" fill={c} transform={`translate(${tx},${ty}) rotate(${r}) scale(${s})`} />
      ))}
      <circle cx={tx} cy={ty + 3} r={4 * s} fill="#3b2410" />
    </g>
  );
};

const Pine = ({ x, y, h = 70, c = '#0b2a2a', snow }) => (
  <g>
    <rect x={x - 2.5} y={y - 10} width="5" height="12" fill="#2a1a10" />
    {[0, 1, 2].map((i) => {
      const top = y - h + i * (h * 0.25);
      const w = h * (0.28 + i * 0.12);
      return (
        <g key={i}>
          <path d={`M${x},${top} L${x - w},${top + h * 0.42} L${x + w},${top + h * 0.42} Z`} fill={c} />
          {snow && <path d={`M${x},${top} L${x - w * 0.45},${top + h * 0.19} Q${x},${top + h * 0.25} ${x + w * 0.45},${top + h * 0.19} Z`} fill="#f1f5f9" opacity="0.9" />}
        </g>
      );
    })}
  </g>
);

const Stars = ({ pts, c = '#fff', cls = 'za-twinkle' }) => pts.map(([x, y, r = 1.2], i) => (
  <circle key={i} cx={x} cy={y} r={r} fill={c} className={cls} style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
));

const Cloud = ({ x, y, s = 1, c = '#fff', o = 0.12 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o} fill={c}>
    <ellipse cx="0" cy="0" rx="34" ry="13" />
    <ellipse cx="-18" cy="4" rx="20" ry="10" />
    <ellipse cx="20" cy="3" rx="22" ry="11" />
    <ellipse cx="2" cy="-9" rx="18" ry="11" />
  </g>
);

const Camel = ({ x, y, s = 1, c }) => (
  <path transform={`translate(${x},${y}) scale(${s})`} fill={c}
    d="M0,0 C2,-8 8,-12 12,-10 C14,-19 22,-19 24,-10 C27,-12 30,-10 32,-6 L37,-17 L42,-18 L43,-15 L39,-13 L35,-2 C35,0 34,1 32,1 L32,13 L30,13 L30,2 L26,2 L26,13 L24,13 L24,2 L10,2 L10,13 L8,13 L8,2 L5,2 L5,13 L3,13 L3,1 C1,1 0,0.5 0,0 Z" />
);

const Pyramid = ({ x, y, w, h, lit, shade, lines }) => (
  <g>
    <path d={`M${x},${y - h} L${x - w},${y} L${x + w * 0.22},${y} Z`} fill={lit} />
    <path d={`M${x},${y - h} L${x + w * 0.22},${y} L${x + w},${y} Z`} fill={shade} />
    {[0.25, 0.5, 0.75].map((t) => (
      <path key={t} d={`M${x - w * t},${y - h * (1 - t)} L${x + w * 0.22 * t},${y - h * (1 - t)}`} stroke={lines} strokeWidth="1" opacity="0.35" />
    ))}
  </g>
);

const Column = ({ x, y, h, c, broken }) => (
  <g fill={c}>
    <rect x={x - 11} y={y - 6} width="22" height="6" />
    <rect x={x - 8} y={y - h} width="16" height={h - 6} />
    {[-4, 0, 4].map((d) => <rect key={d} x={x + d - 0.6} y={y - h + 2} width="1.2" height={h - 10} fill="#000" opacity="0.18" />)}
    {broken
      ? <path d={`M${x - 8},${y - h} L${x - 3},${y - h - 6} L${x + 2},${y - h - 1} L${x + 8},${y - h - 8} L${x + 8},${y - h} Z`} />
      : <><rect x={x - 12} y={y - h - 7} width="24" height="7" /><path d={`M${x - 12},${y - h - 3} q-3,-4 0,-7 M${x + 12},${y - h - 3} q3,-4 0,-7`} stroke={c} strokeWidth="2" fill="none" /></>}
  </g>
);

/* ---------- bölgeler ---------- */
const ZONES_ART = {
  'Başlangıç': {
    defs: (p) => (
      <>
        <linearGradient id={`${p}h1`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22c55e" /><stop offset="1" stopColor="#14532d" /></linearGradient>
        <linearGradient id={`${p}h2`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#16a34a" /><stop offset="1" stopColor="#052e16" /></linearGradient>
        <radialGradient id={`${p}sun`}><stop offset="0" stopColor="#fef08a" /><stop offset="0.35" stopColor="#fde047" stopOpacity="0.6" /><stop offset="1" stopColor="#fde047" stopOpacity="0" /></radialGradient>
      </>
    ),
    sky: (p) => (
      <>
        <circle cx="330" cy="120" r="110" fill={`url(#${p}sun)`} opacity="0.55" />
        <Cloud x={70} y={260} s={1.3} o={0.1} />
        <Cloud x={320} y={560} s={1} o={0.08} />
        <Cloud x={60} y={900} s={1.1} o={0.08} />
        {[[40, 420, '#facc15'], [365, 760, '#f472b6'], [35, 1100, '#a78bfa'], [370, 1200, '#facc15']].map(([x, y, c], i) => (
          <g key={i} className="za-float" style={{ animationDelay: `${i * 1.3}s` }} transform={`translate(${x},${y})`} opacity="0.75">
            <ellipse cx="-5" cy="-3" rx="6" ry="4" fill={c} transform="rotate(-25,-5,-3)" />
            <ellipse cx="5" cy="-3" rx="6" ry="4" fill={c} transform="rotate(25,5,-3)" />
            <ellipse cx="-4" cy="3" rx="4" ry="3" fill={c} opacity="0.8" />
            <ellipse cx="4" cy="3" rx="4" ry="3" fill={c} opacity="0.8" />
            <rect x="-0.7" y="-6" width="1.4" height="11" rx="0.7" fill="#1f2937" />
          </g>
        ))}
      </>
    ),
    ground: (p) => (
      <>
        <path d={`M0,${G + 150} Q100,${G + 60} 210,${G + 130} T400,${G + 100} L400,${H} L0,${H} Z`} fill={`url(#${p}h1)`} opacity="0.55" />
        {[[60, G + 135, 52], [330, G + 115, 60]].map(([x, y, r], i) => (
          <g key={i}>
            <rect x={x - 4} y={y - 10} width="8" height="40" rx="3" fill="#3f2a14" />
            <circle cx={x} cy={y - 20} r={r * 0.6} fill="#15803d" />
            <circle cx={x - r * 0.35} cy={y - 8} r={r * 0.42} fill="#166534" />
            <circle cx={x + r * 0.35} cy={y - 10} r={r * 0.45} fill="#16a34a" />
          </g>
        ))}
        <path d={`M0,${G + 230} Q120,${G + 160} 240,${G + 220} T400,${G + 200} L400,${H} L0,${H} Z`} fill={`url(#${p}h2)`} />
        {Array.from({ length: 14 }, (_, i) => {
          const x = 18 + i * 28;
          const y = G + 245 + (i % 3) * 18;
          const c = ['#fde047', '#f9a8d4', '#ffffff', '#c4b5fd'][i % 4];
          return (
            <g key={i}>
              <path d={`M${x},${y + 14} L${x},${y}`} stroke="#166534" strokeWidth="1.5" />
              {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={x + 3.2 * Math.cos(a * Math.PI / 180)} cy={y + 3.2 * Math.sin(a * Math.PI / 180)} r="2.4" fill={c} />)}
              <circle cx={x} cy={y} r="1.6" fill="#f59e0b" />
            </g>
          );
        })}
        <g className="za-sway" style={{ transformOrigin: `200px ${G + 240}px` }}>
          <path d={`M200,${G + 240} Q198,${G + 210} 200,${G + 190}`} stroke="#4ade80" strokeWidth="3" fill="none" strokeLinecap="round" />
          <Leaf x={200} y={G + 205} r={-35} s={0.7} c="#4ade80" />
          <Leaf x={200} y={G + 196} r={-150} s={0.6} c="#22c55e" />
        </g>
      </>
    ),
  },

  'Çöl': {
    defs: (p) => (
      <>
        <radialGradient id={`${p}sun`}><stop offset="0" stopColor="#fff7d6" /><stop offset="0.25" stopColor="#fdba74" /><stop offset="0.6" stopColor="#f97316" stopOpacity="0.35" /><stop offset="1" stopColor="#f97316" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${p}d1`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f59e0b" /><stop offset="1" stopColor="#92400e" /></linearGradient>
        <linearGradient id={`${p}d2`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbbf24" /><stop offset="1" stopColor="#b45309" /></linearGradient>
        <linearGradient id={`${p}d3`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fcd34d" /><stop offset="1" stopColor="#d97706" /></linearGradient>
      </>
    ),
    sky: (p) => (
      <>
        <circle cx="300" cy="180" r="150" fill={`url(#${p}sun)`} opacity="0.7" />
        <circle cx="300" cy="180" r="38" fill="#fde68a" opacity="0.55" />
        {[[40, 380], [85, 395], [62, 372]].map(([x, y], i) => (
          <path key={i} d={`M${x - 7},${y} q7,-6 14,0 q-7,-3 -14,0`} stroke="#1c1917" strokeWidth="1.6" fill="none" opacity="0.45" className="za-float" style={{ animationDelay: `${i}s` }} />
        ))}
        {[600, 860, 1120].map((y, i) => (
          <path key={y} d={`M${i % 2 ? 300 : 20},${y} q20,-6 40,0 t40,0 t40,0`} stroke="#fde68a" strokeWidth="1.5" fill="none" opacity="0.12" />
        ))}
        <g opacity="0.55">
          <Pyramid x={350} y={1000} w={42} h={50} lit="#b45309" shade="#78350f" lines="#451a03" />
          <Camel x={20} y={760} s={0.9} c="#451a03" />
        </g>
      </>
    ),
    ground: (p) => (
      <>
        <g opacity="0.95">
          <Pyramid x={250} y={G + 175} w={120} h={150} lit="#f59e0b" shade="#9a3412" lines="#7c2d12" />
          <Pyramid x={95} y={G + 185} w={80} h={100} lit="#fbbf24" shade="#b45309" lines="#7c2d12" />
          <Pyramid x={355} y={G + 190} w={52} h={62} lit="#d97706" shade="#7c2d12" lines="#451a03" />
        </g>
        <path d={`M0,${G + 190} Q90,${G + 150} 190,${G + 185} T400,${G + 170} L400,${H} L0,${H} Z`} fill={`url(#${p}d1)`} />
        <g transform={`translate(0,${G + 182})`}>
          {[0, 46, 92].map((dx, i) => <Camel key={i} x={150 + dx} y={-4 - i * 2} s={0.85 - i * 0.08} c="#431407" />)}
        </g>
        <path d={`M0,${G + 255} Q110,${G + 205} 230,${G + 245} T400,${G + 230} L400,${H} L0,${H} Z`} fill={`url(#${p}d2)`} />
        {/* Vaha */}
        <Palm x={40} y={G + 262} h={95} lean={14} c="#14532d" s={0.9} />
        <Palm x={70} y={G + 266} h={70} lean={-12} c="#166534" s={0.75} />
        <ellipse cx="60" cy={G + 268} rx="48" ry="7" fill="#0ea5e9" opacity="0.55" />
        <path d={`M0,${G + 310} Q140,${G + 275} 270,${G + 305} T400,${G + 295} L400,${H} L0,${H} Z`} fill={`url(#${p}d3)`} />
        {/* Kaktüs */}
        <g fill="#15803d">
          <rect x="340" y={G + 225} width="12" height="70" rx="6" />
          <path d={`M340,${G + 262} h-10 a5,5 0 0 1 -5,-5 v-18 a5,5 0 0 1 10,0 v13 h5 z`} />
          <path d={`M352,${G + 250} h10 v-14 a5,5 0 0 1 10,0 v19 a5,5 0 0 1 -5,5 h-15 z`} />
        </g>
        {[[120, G + 330], [210, G + 345], [300, G + 335]].map(([x, y], i) => (
          <path key={i} d={`M${x},${y} q15,-5 30,0`} stroke="#92400e" strokeWidth="1.5" fill="none" opacity="0.5" />
        ))}
      </>
    ),
  },

  'Okyanus': {
    defs: (p) => (
      <>
        <linearGradient id={`${p}ray`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dd3fc" stopOpacity="0.35" /><stop offset="1" stopColor="#7dd3fc" stopOpacity="0" /></linearGradient>
        <linearGradient id={`${p}sand`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fcd9a0" /><stop offset="1" stopColor="#a16207" /></linearGradient>
        <radialGradient id={`${p}jelly`} cx="0.5" cy="0.3"><stop offset="0" stopColor="#f5d0fe" /><stop offset="1" stopColor="#c084fc" stopOpacity="0.4" /></radialGradient>
      </>
    ),
    sky: (p) => (
      <>
        {[[40, 70], [150, 50], [260, 80], [330, 60]].map(([x, w], i) => (
          <path key={i} d={`M${x},0 L${x + w},0 L${x + w * 2.4},900 L${x + w * 0.9},900 Z`} fill={`url(#${p}ray)`} opacity="0.6" />
        ))}
        {/* Balina */}
        <g opacity="0.35" className="za-swim-slow">
          <path d="M40,520 C70,470 190,470 230,505 C250,520 268,508 285,488 C283,512 290,528 300,540 C280,536 262,532 240,540 C200,570 80,575 40,520 Z" fill="#0c4a6e" />
          <circle cx="70" cy="515" r="3" fill="#e0f2fe" />
          <path d="M60,535 Q120,555 190,545" stroke="#e0f2fe" strokeWidth="2" fill="none" opacity="0.5" />
        </g>
        {/* Balık sürüleri */}
        {[[30, 260, 0], [70, 285, 1], [45, 300, 2], [95, 270, 0.5]].map(([x, y, d], i) => (
          <Fish key={`a${i}`} x={x} y={y} s={0.8} c1="#fbbf24" c2="#f97316" cls="za-swim" delay={d} />
        ))}
        {[[300, 760, 0], [335, 780, 1], [315, 800, 2]].map(([x, y, d], i) => (
          <Fish key={`b${i}`} x={x} y={y} s={0.9} c1="#38bdf8" c2="#0369a1" flip cls="za-swim" delay={d} />
        ))}
        {[[40, 1050, 0], [80, 1075, 1.5]].map(([x, y, d], i) => (
          <Fish key={`c${i}`} x={x} y={y} s={1} c1="#f472b6" c2="#be185d" cls="za-swim" delay={d} />
        ))}
        <Fish x={330} y={1180} s={1.2} c1="#fde047" c2="#1e3a8a" flip cls="za-swim" delay={0.7} />
        {/* Denizanası */}
        {[[350, 400], [45, 860]].map(([x, y], i) => (
          <g key={i} className="za-float" style={{ animationDelay: `${i * 2}s` }} opacity="0.7">
            <path d={`M${x - 16},${y} Q${x},${y - 26} ${x + 16},${y} Z`} fill={`url(#${p}jelly)`} />
            {[-10, -4, 2, 8].map((dx) => <path key={dx} d={`M${x + dx},${y} q-4,12 0,24 q4,10 0,20`} stroke="#e9d5ff" strokeWidth="1.2" fill="none" opacity="0.7" />)}
          </g>
        ))}
        {/* Kabarcıklar */}
        {[[30, 1250], [60, 1200], [370, 1150], [345, 1250], [20, 700], [380, 640], [360, 300]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3 + (i % 3) * 2} fill="none" stroke="#bae6fd" strokeWidth="1.3" opacity="0.6" className="za-rise" style={{ animationDelay: `${i * 1.1}s` }} />
        ))}
      </>
    ),
    ground: (p) => (
      <>
        <path d={`M0,${G + 260} Q100,${G + 225} 200,${G + 250} T400,${G + 240} L400,${H} L0,${H} Z`} fill={`url(#${p}sand)`} opacity="0.9" />
        {/* Yosunlar */}
        {[[20, 1.1], [52, 0.8], [365, 1], [385, 0.7], [250, 0.6]].map(([x, s], i) => (
          <path key={i} className="za-sway" style={{ transformOrigin: `${x}px ${G + 260}px`, animationDelay: `${i * 0.7}s` }}
            d={`M${x},${G + 260} q-12,${-40 * s} 0,${-80 * s} q12,${-40 * s} 0,${-80 * s}`} stroke={i % 2 ? '#16a34a' : '#15803d'} strokeWidth="6" fill="none" strokeLinecap="round" />
        ))}
        {/* Mercanlar */}
        <g fill="#fb7185">
          {[[110, 0], [130, -30], [92, -25], [118, -55]].map(([x, r], i) => (
            <rect key={i} x={x} y={G + 185} width="7" height={70 - i * 8} rx="3.5" transform={`rotate(${r} ${x} ${G + 255})`} />
          ))}
        </g>
        <g fill="#f97316">
          {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={300 + i * 10} cy={G + 240 - (i % 2) * 12} r={9 - (i % 2) * 2} />)}
        </g>
        <g fill="#a78bfa">
          {[-40, -15, 15, 40].map((r) => <rect key={r} x="198" y={G + 200} width="6" height="45" rx="3" transform={`rotate(${r} 201 ${G + 245})`} />)}
        </g>
        {/* Deniz yıldızı ve kabuk */}
        <path transform={`translate(160,${G + 285})`} fill="#f59e0b"
          d="M0,-14 L4,-4 L14,-4 L6,2 L9,12 L0,6 L-9,12 L-6,2 L-14,-4 L-4,-4 Z" />
        <path transform={`translate(340,${G + 295})`} d="M-12,6 Q0,-16 12,6 Z" fill="#fde68a" />
        {[-8, -3, 2, 7].map((dx) => <path key={dx} d={`M340,${G + 295} L${340 + dx},${G + 301}`} stroke="#d97706" strokeWidth="1" transform={`translate(0,0)`} />)}
        {/* Kaplumbağa */}
        <g transform={`translate(250,${G + 120})`} opacity="0.85" className="za-float">
          <ellipse cx="0" cy="0" rx="26" ry="17" fill="#15803d" />
          <path d="M-14,-8 L0,-12 L14,-8 L16,4 L0,10 L-16,4 Z" fill="#166534" stroke="#4ade80" strokeWidth="1" />
          <circle cx="32" cy="-2" r="7" fill="#65a30d" />
          <ellipse cx="-16" cy="-15" rx="12" ry="4" fill="#65a30d" transform="rotate(-25 -16 -15)" />
          <ellipse cx="14" cy="17" rx="12" ry="4" fill="#65a30d" transform="rotate(25 14 17)" />
        </g>
      </>
    ),
  },

  'Yanardağ': {
    defs: (p) => (
      <>
        <linearGradient id={`${p}rock`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#44201a" /><stop offset="1" stopColor="#120707" /></linearGradient>
        <radialGradient id={`${p}glow`} cy="0"><stop offset="0" stopColor="#fdba74" /><stop offset="0.4" stopColor="#f97316" stopOpacity="0.5" /><stop offset="1" stopColor="#dc2626" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${p}lava`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fde047" /><stop offset="1" stopColor="#dc2626" /></linearGradient>
      </>
    ),
    sky: () => (
      <>
        {[[200, 1180, 60], [150, 1080, 45], [240, 990, 70], [190, 880, 55]].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#44403c" opacity={0.22 - i * 0.03} className="za-float" style={{ animationDelay: `${i}s` }} />
        ))}
        {Array.from({ length: 18 }, (_, i) => (
          <circle key={i} cx={30 + ((i * 97) % 340)} cy={150 + ((i * 263) % 1050)} r={1.5 + (i % 3)} fill={i % 2 ? '#f97316' : '#fde047'} className="za-rise" style={{ animationDelay: `${(i % 6) * 1.2}s` }} opacity="0.75" />
        ))}
      </>
    ),
    ground: (p) => (
      <>
        <ellipse cx="200" cy={G + 40} rx="140" ry="90" fill={`url(#${p}glow)`} opacity="0.8" />
        <path d={`M0,${H} L0,${G + 210} L70,${G + 170} L160,${G + 40} L240,${G + 40} L320,${G + 160} L400,${G + 200} L400,${H} Z`} fill={`url(#${p}rock)`} />
        <path d={`M160,${G + 40} Q200,${G + 25} 240,${G + 40} Q200,${G + 55} 160,${G + 40} Z`} fill="#fb923c" />
        <path d={`M195,${G + 45} Q185,${G + 100} 200,${G + 140} Q215,${G + 190} 190,${G + 250} L205,${G + 250} Q230,${G + 190} 212,${G + 140} Q200,${G + 100} 210,${G + 45} Z`} fill={`url(#${p}lava)`} opacity="0.9" />
        <path d={`M228,${G + 50} Q250,${G + 110} 280,${G + 150} L288,${G + 145} Q260,${G + 105} 236,${G + 48} Z`} fill={`url(#${p}lava)`} opacity="0.75" />
        <path d={`M0,${H} L0,${G + 280} L90,${G + 250} L150,${G + 270} L260,${G + 245} L330,${G + 268} L400,${G + 250} L400,${H} Z`} fill="#0c0505" />
        <path d={`M0,${G + 310} Q120,${G + 300} 200,${G + 315} T400,${G + 305}`} stroke="#f97316" strokeWidth="3" fill="none" opacity="0.6" />
      </>
    ),
  },

  'Uzay': {
    defs: (p) => (
      <>
        <radialGradient id={`${p}pl`} cx="0.35" cy="0.35"><stop offset="0" stopColor="#c4b5fd" /><stop offset="1" stopColor="#4c1d95" /></radialGradient>
        <radialGradient id={`${p}moon`} cx="0.35" cy="0.35"><stop offset="0" stopColor="#f1f5f9" /><stop offset="1" stopColor="#64748b" /></radialGradient>
        <radialGradient id={`${p}neb`}><stop offset="0" stopColor="#a855f7" stopOpacity="0.4" /><stop offset="1" stopColor="#a855f7" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${p}neb2`}><stop offset="0" stopColor="#22d3ee" stopOpacity="0.3" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></radialGradient>
      </>
    ),
    sky: (p) => (
      <>
        <ellipse cx="80" cy="500" rx="160" ry="110" fill={`url(#${p}neb)`} />
        <ellipse cx="330" cy="950" rx="150" ry="120" fill={`url(#${p}neb2)`} />
        <Stars pts={Array.from({ length: 60 }, (_, i) => [(i * 53) % 400, (i * 131) % 1650, i % 5 === 0 ? 1.8 : 1])} />
        <g transform="translate(330,260)">
          <circle r="40" fill={`url(#${p}pl)`} />
          <ellipse rx="66" ry="14" fill="none" stroke="#ddd6fe" strokeWidth="3" opacity="0.8" transform="rotate(-18)" />
          <path d="M-38,10 Q0,22 38,-10" stroke="#ede9fe" strokeWidth="2" fill="none" opacity="0.25" />
        </g>
        <g transform="translate(55,1000)" className="za-float">
          <path d="M0,-30 Q10,-18 10,0 L10,18 L-10,18 L-10,0 Q-10,-18 0,-30 Z" fill="#e2e8f0" />
          <circle cy="-6" r="5" fill="#38bdf8" stroke="#475569" strokeWidth="1.5" />
          <path d="M-10,8 L-18,22 L-10,18 Z M10,8 L18,22 L10,18 Z" fill="#ef4444" />
          <path d="M-6,18 Q0,36 6,18 Z" fill="#f97316" />
        </g>
        <path d="M250,700 L330,670" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.5" className="za-twinkle" />
      </>
    ),
    ground: (p) => (
      <>
        <circle cx="200" cy={G + 520} r="330" fill={`url(#${p}moon)`} />
        {[[110, G + 240, 22], [260, G + 225, 14], [190, G + 290, 30], [320, G + 290, 18], [60, G + 320, 12]].map(([x, y, r], i) => (
          <g key={i}><ellipse cx={x} cy={y} rx={r} ry={r * 0.45} fill="#475569" opacity="0.6" /><ellipse cx={x} cy={y - 2} rx={r * 0.8} ry={r * 0.3} fill="#334155" opacity="0.6" /></g>
        ))}
        <g transform={`translate(220,${G + 205})`}>
          <line x1="0" y1="0" x2="0" y2="-40" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M0,-40 L24,-34 L0,-28 Z" fill="#ef4444" />
        </g>
      </>
    ),
  },

  'Everest': {
    defs: (p) => (
      <>
        <linearGradient id={`${p}m1`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64748b" /><stop offset="1" stopColor="#1e293b" /></linearGradient>
        <linearGradient id={`${p}m2`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#94a3b8" /><stop offset="1" stopColor="#334155" /></linearGradient>
        <linearGradient id={`${p}snow`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#cbd5e1" /></linearGradient>
      </>
    ),
    sky: () => (
      <>
        <path d="M0,400 Q100,360 200,410 T400,390" stroke="#a5f3fc" strokeWidth="18" fill="none" opacity="0.06" />
        <path d="M0,440 Q120,400 220,450 T400,420" stroke="#86efac" strokeWidth="12" fill="none" opacity="0.05" />
        <Cloud x={70} y={700} s={1.4} o={0.1} />
        <Cloud x={330} y={1000} s={1.2} o={0.09} />
        {Array.from({ length: 34 }, (_, i) => (
          <circle key={i} cx={(i * 71) % 400} cy={(i * 197) % 1600} r={1 + (i % 3) * 0.8} fill="#fff" opacity="0.6" className="za-fall" style={{ animationDelay: `${(i % 8) * 0.9}s` }} />
        ))}
      </>
    ),
    ground: (p) => (
      <>
        <path d={`M0,${G + 230} L90,${G + 80} L150,${G + 140} L250,${G - 20} L330,${G + 100} L400,${G + 60} L400,${H} L0,${H} Z`} fill={`url(#${p}m2)`} />
        <path d={`M250,${G - 20} L220,${G + 30} L238,${G + 24} L250,${G + 40} L262,${G + 22} L282,${G + 35} Z`} fill={`url(#${p}snow)`} />
        <path d={`M250,${G - 20} L330,${G + 100} L290,${G + 60} Z`} fill="#000" opacity="0.18" />
        <path d={`M90,${G + 80} L72,${G + 110} L88,${G + 104} L100,${G + 116} L112,${G + 100} Z`} fill={`url(#${p}snow)`} />
        <g transform={`translate(250,${G - 20})`}>
          <line x1="0" y1="0" x2="0" y2="-26" stroke="#e2e8f0" strokeWidth="1.5" />
          <path d="M0,-26 L16,-22 L0,-18 Z" fill="#ef4444" />
        </g>
        <path d={`M0,${G + 300} L60,${G + 200} L130,${G + 260} L210,${G + 170} L290,${G + 250} L400,${G + 190} L400,${H} L0,${H} Z`} fill={`url(#${p}m1)`} />
        <path d={`M210,${G + 170} L190,${G + 200} L205,${G + 196} L215,${G + 208} L228,${G + 192} Z`} fill="#f8fafc" opacity="0.9" />
        {[[30, G + 330], [70, G + 340], [110, G + 330], [300, G + 335], [345, G + 325], [380, G + 340]].map(([x, y], i) => (
          <Pine key={i} x={x} y={y} h={58 + (i % 3) * 14} c="#0f2a2e" snow />
        ))}
        <rect x="0" y={G + 335} width="400" height="40" fill="#e2e8f0" opacity="0.85" />
      </>
    ),
  },

  'Amazon': {
    defs: (p) => (
      <>
        <linearGradient id={`${p}riv`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2dd4bf" stopOpacity="0.7" /><stop offset="1" stopColor="#0f766e" /></linearGradient>
      </>
    ),
    sky: () => (
      <>
        {/* Sarmaşıklar */}
        {[[8, 0, 900], [392, 0, 700], [30, 0, 420], [370, 0, 1100]].map(([x, y0, len], i) => (
          <g key={i}>
            <path d={`M${x},${y0} Q${x + (i % 2 ? -18 : 18)},${len / 3} ${x},${len * 0.66} T${x},${len}`} stroke="#134e4a" strokeWidth="3" fill="none" />
            {Array.from({ length: Math.floor(len / 70) }, (_, k) => (
              <Leaf key={k} x={x} y={40 + k * 70} r={k % 2 ? 30 : 150} s={0.55} c={k % 2 ? '#15803d' : '#0f766e'} />
            ))}
          </g>
        ))}
        {/* Papağan */}
        <g transform="translate(330,520)" className="za-float">
          <ellipse cx="0" cy="0" rx="10" ry="16" fill="#ef4444" />
          <circle cx="0" cy="-16" r="8" fill="#ef4444" />
          <path d="M6,-17 Q14,-15 9,-9 Z" fill="#fde047" />
          <circle cx="2" cy="-18" r="1.5" fill="#000" />
          <path d="M-6,-2 Q-18,8 -10,22 L-2,10 Z" fill="#2563eb" />
          <path d="M-3,14 L-8,40 L2,16 Z" fill="#facc15" />
          <rect x="-24" y="16" width="44" height="3" rx="1.5" fill="#3f2a14" />
        </g>
        {/* Ateşböcekleri */}
        {Array.from({ length: 14 }, (_, i) => (
          <circle key={i} cx={50 + ((i * 89) % 300)} cy={200 + ((i * 151) % 1050)} r="2" fill="#fef08a" className="za-twinkle" style={{ animationDelay: `${(i % 5) * 0.8}s` }} />
        ))}
      </>
    ),
    ground: (p) => (
      <>
        {/* Arka ağaçlar */}
        {[[40, 90], [120, 120], [210, 100], [300, 130], [380, 95]].map(([x, h], i) => (
          <g key={i} opacity="0.75">
            <rect x={x - 5} y={G + 260 - h} width="10" height={h + 40} fill="#1c3b2f" />
            <ellipse cx={x} cy={G + 250 - h} rx={46} ry={34} fill="#15803d" />
            <ellipse cx={x - 22} cy={G + 262 - h} rx={28} ry={20} fill="#16a34a" />
            <ellipse cx={x + 24} cy={G + 258 - h} rx={30} ry={22} fill="#22c55e" />
            <ellipse cx={x + 6} cy={G + 238 - h} rx={18} ry={10} fill="#4ade80" opacity="0.6" />
          </g>
        ))}
        <path d={`M120,${H} Q170,${G + 300} 230,${G + 290} Q300,${G + 280} 280,${H} Z`} fill={`url(#${p}riv)`} />
        {/* Ön plan dev yapraklar */}
        {[[0, G + 330, -40, 2.4, '#166534'], [20, G + 360, -10, 2, '#15803d'], [400, G + 320, 210, 2.4, '#14532d'], [390, G + 365, 180, 2, '#166534'], [80, G + 370, -70, 1.6, '#22c55e'], [330, G + 370, 250, 1.6, '#16a34a']].map(([x, y, r, s, c], i) => (
          <g key={i} className="za-sway" style={{ transformOrigin: `${x}px ${y}px`, animationDelay: `${i * 0.5}s` }}>
            <Leaf x={x} y={y} r={r} s={s} c={c} />
            <path d={`M0,0 L30,0`} stroke="#052e16" strokeWidth="0.8" transform={`translate(${x},${y}) rotate(${r}) scale(${s})`} />
          </g>
        ))}
        <rect x="0" y={H - 30} width="400" height="30" fill="#14532d" />
        {[[95, G + 345, '#f43f5e'], [140, G + 352, '#facc15'], [300, G + 348, '#f97316'], [255, G + 356, '#ec4899']].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-5" rx="3.5" ry="6" fill={c} transform={`rotate(${a})`} />)}
            <circle r="2.2" fill="#fef08a" />
          </g>
        ))}
      </>
    ),
  },

  'Antik Uygarlık': {
    defs: (p) => (
      <>
        <linearGradient id={`${p}st`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fef3c7" /><stop offset="1" stopColor="#d6b77a" /></linearGradient>
        <radialGradient id={`${p}moon`}><stop offset="0" stopColor="#fef9c3" /><stop offset="0.5" stopColor="#fde68a" stopOpacity="0.3" /><stop offset="1" stopColor="#fde68a" stopOpacity="0" /></radialGradient>
      </>
    ),
    sky: (p) => (
      <>
        <circle cx="90" cy="220" r="110" fill={`url(#${p}moon)`} opacity="0.7" />
        <circle cx="90" cy="220" r="30" fill="#fef9c3" opacity="0.55" />
        <Stars pts={Array.from({ length: 24 }, (_, i) => [(i * 83) % 400, (i * 149) % 900, 1])} c="#fde68a" />
        {/* Amfora */}
        {[[355, 650, 1], [40, 1050, 0.85]].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${s})`} opacity="0.55">
            <path d="M-6,-30 L6,-30 L6,-24 Q20,-14 18,6 Q14,26 0,30 Q-14,26 -18,6 Q-20,-14 -6,-24 Z" fill="#c2410c" />
            <path d="M-6,-26 Q-16,-26 -14,-12 M6,-26 Q16,-26 14,-12" stroke="#c2410c" strokeWidth="3" fill="none" />
            <path d="M-17,0 L17,0 M-16,8 L16,8" stroke="#1c1917" strokeWidth="2" />
          </g>
        ))}
        {/* Defne */}
        <g transform="translate(340,1180)" opacity="0.5">
          <path d="M0,0 Q-30,-30 0,-60" stroke="#65a30d" strokeWidth="2" fill="none" />
          {[0, 1, 2, 3].map((k) => <Leaf key={k} x={-8 - k * 2} y={-12 - k * 12} r={200 + k * 10} s={0.4} c="#84cc16" />)}
        </g>
      </>
    ),
    ground: (p) => (
      <>
        {/* Tapınak */}
        <g fill={`url(#${p}st)`}>
          <path d={`M90,${G + 120} L200,${G + 60} L310,${G + 120} Z`} />
          <rect x="84" y={G + 120} width="232" height="12" />
          {[110, 150, 190, 230, 270, 290].slice(0, 5).map((x) => <Column key={x} x={x + 10} y={G + 260} h={128} c={`url(#${p}st)`} />)}
          <rect x="70" y={G + 260} width="260" height="10" />
          <rect x="58" y={G + 270} width="284" height="10" />
        </g>
        <path d={`M120,${G + 112} L200,${G + 72} L280,${G + 112} Z`} fill="#000" opacity="0.15" />
        <Column x={30} y={G + 310} h={70} c="#e7d3a6" broken />
        <Column x={372} y={G + 310} h={95} c="#e7d3a6" broken />
        <rect x="0" y={G + 300} width="400" height="80" fill="#78350f" opacity="0.6" />
        <path d={`M300,${G + 320} l26,-6 l10,8 l-30,6 z`} fill="#d6b77a" />
        {/* Zeytin ağacı */}
        <g transform={`translate(55,${G + 302})`}>
          <path d="M0,0 Q-4,-30 6,-55" stroke="#57534e" strokeWidth="6" fill="none" />
          <ellipse cx="6" cy="-66" rx="32" ry="18" fill="#4d7c0f" opacity="0.9" />
          <ellipse cx="-14" cy="-56" rx="18" ry="11" fill="#65a30d" opacity="0.9" />
        </g>
      </>
    ),
  },

  'Cennet Adaları': {
    defs: (p) => (
      <>
        <radialGradient id={`${p}sun`} cy="0.6"><stop offset="0" stopColor="#fef3c7" /><stop offset="0.3" stopColor="#fb923c" stopOpacity="0.7" /><stop offset="1" stopColor="#ec4899" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${p}sea`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f472b6" stopOpacity="0.6" /><stop offset="0.4" stopColor="#0891b2" /><stop offset="1" stopColor="#164e63" /></linearGradient>
      </>
    ),
    sky: () => (
      <>
        <Cloud x={80} y={300} s={1.4} c="#fbcfe8" o={0.14} />
        <Cloud x={320} y={650} s={1.1} c="#fbcfe8" o={0.12} />
        {[[50, 820], [80, 840], [340, 1050]].map(([x, y], i) => (
          <path key={i} d={`M${x - 8},${y} q8,-7 16,0 q-8,-3 -16,0`} stroke="#fdf2f8" strokeWidth="1.8" fill="none" opacity="0.6" className="za-float" style={{ animationDelay: `${i}s` }} />
        ))}
        {/* Hibiskus */}
        {[[360, 420, '#f43f5e'], [35, 1150, '#ec4899']].map(([x, y, c], i) => (
          <g key={i} transform={`translate(${x},${y})`} opacity="0.75">
            {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-10" rx="7" ry="11" fill={c} transform={`rotate(${a})`} />)}
            <circle r="4" fill="#fde047" />
            <path d="M0,0 L10,-16" stroke="#fde047" strokeWidth="1.5" />
          </g>
        ))}
      </>
    ),
    ground: (p) => (
      <>
        <circle cx="270" cy={G + 120} r="160" fill={`url(#${p}sun)`} />
        <circle cx="270" cy={G + 125} r="44" fill="#fde68a" opacity="0.9" />
        <rect x="0" y={G + 150} width="400" height={H - G - 150} fill={`url(#${p}sea)`} />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={250 - i * 6} y={G + 162 + i * 14} width={40 + i * 12} height="3" rx="1.5" fill="#fde68a" opacity={0.6 - i * 0.12} />)}
        {/* Yelkenli */}
        <g transform={`translate(330,${G + 150})`} className="za-float">
          <path d="M-18,0 L18,0 L12,8 L-12,8 Z" fill="#7c2d12" />
          <path d="M0,0 L0,-40 L20,-4 Z" fill="#fff7ed" />
          <path d="M-2,-4 L-2,-32 L-16,-4 Z" fill="#fed7aa" />
        </g>
        {/* Yunus */}
        <path transform={`translate(150,${G + 200})`} fill="#0e7490" d="M-30,8 Q-20,-20 10,-18 L16,-28 L18,-16 Q30,-10 32,2 Q20,-6 0,-4 Q-14,0 -22,14 Z" />
        {/* Ada */}
        <ellipse cx="90" cy={G + 300} rx="120" ry="30" fill="#fcd34d" />
        <ellipse cx="90" cy={G + 296} rx="110" ry="22" fill="#fde68a" />
        <Palm x={60} y={G + 292} h={140} lean={24} c="#065f46" s={1.1} />
        <Palm x={120} y={G + 295} h={100} lean={-18} c="#047857" s={0.9} />
        {[0, 1, 2].map((i) => <path key={i} d={`M${200 + i * 60},${G + 320 + i * 10} q15,-6 30,0`} stroke="#e0f2fe" strokeWidth="2" fill="none" opacity="0.5" />)}
      </>
    ),
  },

  'Galaksi': {
    defs: (p) => (
      <>
        <radialGradient id={`${p}core`}><stop offset="0" stopColor="#fff" /><stop offset="0.2" stopColor="#f0abfc" /><stop offset="0.6" stopColor="#7c3aed" stopOpacity="0.4" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${p}neb`}><stop offset="0" stopColor="#ec4899" stopOpacity="0.35" /><stop offset="1" stopColor="#ec4899" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${p}bh`}><stop offset="0.45" stopColor="#000" /><stop offset="0.55" stopColor="#fbbf24" /><stop offset="0.75" stopColor="#f97316" stopOpacity="0.4" /><stop offset="1" stopColor="#f97316" stopOpacity="0" /></radialGradient>
      </>
    ),
    sky: (p) => (
      <>
        <ellipse cx="320" cy="700" rx="170" ry="130" fill={`url(#${p}neb)`} />
        <Stars pts={Array.from({ length: 70 }, (_, i) => [(i * 61) % 400, (i * 113) % 1650, i % 6 === 0 ? 2 : 1])} c="#f5d0fe" />
        <g transform="translate(70,330)">
          <circle r="55" fill={`url(#${p}bh)`} />
          <ellipse rx="70" ry="12" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.6" transform="rotate(-15)" />
        </g>
        {[[260, 1000], [40, 1150]].map(([x, y], i) => (
          <path key={i} d={`M${x},${y} l70,-25`} stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" className="za-twinkle" style={{ animationDelay: `${i * 2}s` }} />
        ))}
      </>
    ),
    ground: (p) => (
      <>
        <g transform={`translate(200,${G + 170})`}>
          <circle r="190" fill={`url(#${p}core)`} opacity="0.75" />
          {[0, 1, 2, 3].map((k) => (
            <path key={k} d="M0,0 C40,-20 90,-10 120,30 C140,60 130,100 100,120" stroke={k % 2 ? '#c084fc' : '#22d3ee'} strokeWidth={4 - k * 0.6} fill="none" opacity="0.45" transform={`rotate(${k * 90}) scale(${1 - k * 0.08},0.5)`} />
          ))}
          <ellipse rx="22" ry="10" fill="#fff" opacity="0.9" />
        </g>
      </>
    ),
  },
};

// Banner'da gösterilecek manzara kesiti: [başlangıç (G'ye göre), yükseklik]
const BANNER_CROP = {
  'Başlangıç': [90, 230], 'Çöl': [10, 260], 'Okyanus': [100, 230], 'Yanardağ': [10, 260], 'Uzay': [170, 170],
  'Everest': [-30, 300], 'Amazon': [100, 270], 'Antik Uygarlık': [40, 280], 'Cennet Adaları': [90, 240], 'Galaksi': [40, 260],
};

const keyOf = (name) => `za${Object.keys(ZONES_ART).indexOf(name)}`;

/** Bölüm boyunca tam yükseklik arka plan (ortam süsleri + alttaki ana manzara). */
export const ZoneSceneBg = ({ name }) => {
  const art = ZONES_ART[name];
  if (!art) return null;
  const p = keyOf(name);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>{art.defs(`${p}s`)}</defs>
      <g opacity="0.45">{art.sky(`${p}s`)}</g>
      <g opacity="0.55">{art.ground(`${p}s`)}</g>
    </svg>
  );
};

/** Banner: aynı manzaranın kırpılmış hali. */
export const ZoneBannerArt = ({ name }) => {
  const art = ZONES_ART[name];
  if (!art) return null;
  const p = keyOf(name);
  const [cy, ch] = BANNER_CROP[name] || [0, 250];
  return (
    <div className="absolute inset-y-0 right-0 w-[62%] max-w-[300px] [mask-image:linear-gradient(to_right,transparent,black_45%)]">
      <svg viewBox={`0 ${G + cy} ${W} ${ch}`} preserveAspectRatio="xMidYMid slice" className="w-full h-full" aria-hidden="true">
        <defs>{art.defs(`${p}b`)}</defs>
        <g opacity="0.95">{art.ground(`${p}b`)}</g>
      </svg>
    </div>
  );
};

/** Animasyonlar — sayfada bir kez. */
export const ZoneArtStyles = () => (
  <style>{`
    @keyframes za-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
    @keyframes za-swim { 0% { transform: translateX(0) } 100% { transform: translateX(-40px) } }
    @keyframes za-swim-slow { 0%,100% { transform: translateX(0) } 50% { transform: translateX(30px) } }
    @keyframes za-rise { 0% { transform: translateY(0); opacity: 0 } 15% { opacity: .7 } 100% { transform: translateY(-160px); opacity: 0 } }
    @keyframes za-fall { 0% { transform: translateY(-40px); opacity: 0 } 15% { opacity: .7 } 100% { transform: translateY(160px); opacity: 0 } }
    @keyframes za-twinkle { 0%,100% { opacity: .25 } 50% { opacity: 1 } }
    @keyframes za-sway { 0%,100% { transform: rotate(-4deg) } 50% { transform: rotate(4deg) } }
    .za-float { animation: za-float 6s ease-in-out infinite; transform-box: fill-box }
    .za-swim { animation: za-swim 5s ease-in-out infinite alternate }
    .za-swim-slow { animation: za-swim-slow 16s ease-in-out infinite }
    .za-rise { animation: za-rise 7s linear infinite }
    .za-fall { animation: za-fall 8s linear infinite }
    .za-twinkle { animation: za-twinkle 3s ease-in-out infinite }
    .za-sway { animation: za-sway 5s ease-in-out infinite }
    @media (prefers-reduced-motion: reduce) {
      .za-float, .za-swim, .za-swim-slow, .za-rise, .za-fall, .za-twinkle, .za-sway { animation: none }
    }
  `}</style>
);
