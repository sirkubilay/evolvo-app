import { useState, useEffect } from 'react';

// Altay Gaming açılış animasyonu: altın çember çizilir, içinde gece gökyüzü önünde katmanlı,
// karlı bir dağ yükselir; ardından stüdyo adı belirir.
const STARS = [
  [62, 38, 0.9], [78, 30, 0.6], [128, 32, 0.8], [142, 46, 0.5], [54, 56, 0.5],
  [118, 24, 0.6], [150, 60, 0.7], [70, 50, 0.4], [136, 20, 0.4], [92, 26, 0.5],
];

export const SplashScreen = ({ onDone }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 2600);
    const t2 = setTimeout(onDone, 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const R = 74;
  const circ = +(2 * Math.PI * R).toFixed(1);

  return (
    <>
      <style>{`
        @keyframes spl-ring { from{stroke-dashoffset:${circ}} to{stroke-dashoffset:0} }
        @keyframes spl-rise { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spl-fade { from{opacity:0} to{opacity:1} }
        @keyframes spl-twinkle { 0%,100%{opacity:.25} 50%{opacity:1} }
        @keyframes spl-shine { 0%{transform:translateX(-60px)} 100%{transform:translateX(80px)} }
        @keyframes spl-glow { 0%,100%{filter:drop-shadow(0 0 8px rgba(226,183,72,.35))} 50%{filter:drop-shadow(0 0 22px rgba(226,183,72,.7))} }
        .s-ring  { stroke-dasharray:${circ}; stroke-dashoffset:${circ}; animation:spl-ring 1.1s ease-in-out .2s forwards; }
        .s-sky   { opacity:0; animation:spl-fade .8s ease .35s forwards; }
        .s-far   { animation:spl-rise .9s cubic-bezier(.22,1,.36,1) .45s both; }
        .s-mid   { animation:spl-rise .9s cubic-bezier(.22,1,.36,1) .6s both; }
        .s-main  { animation:spl-rise 1s cubic-bezier(.22,1,.36,1) .75s both; }
        .s-mist  { opacity:0; animation:spl-fade 1s ease 1.1s forwards; }
        .s-star  { opacity:0; animation:spl-twinkle 2.4s ease-in-out infinite; }
        .s-shine { animation:spl-shine 1.6s ease-in-out 1.4s both; }
        .s-t1    { opacity:0; animation:spl-fade .6s ease 1.5s forwards; }
        .s-t2    { opacity:0; animation:spl-fade .6s ease 1.75s forwards; }
        .s-gold  { animation:spl-glow 3s ease-in-out 1.4s infinite; }
      `}</style>
      <div
        className={`fixed inset-0 flex items-center justify-center z-[9999] transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: 'radial-gradient(circle at 50% 40%, #0b2a52 0%, #001f3f 45%, #00142a 100%)' }}
      >
        <svg width="300" height="300" viewBox="0 0 200 200" role="img" aria-label="Altay Gaming">
          <defs>
            <linearGradient id="sGold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f1cf72" />
              <stop offset=".5" stopColor="#b98a1c" />
              <stop offset="1" stopColor="#f1cf72" />
            </linearGradient>
            <linearGradient id="sSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#081a3a" />
              <stop offset=".65" stopColor="#14335f" />
              <stop offset="1" stopColor="#3a5a86" />
            </linearGradient>
            <linearGradient id="sFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4a6b97" />
              <stop offset="1" stopColor="#2b4a74" />
            </linearGradient>
            <linearGradient id="sMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2a4870" />
              <stop offset="1" stopColor="#13294a" />
            </linearGradient>
            <linearGradient id="sLit" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5d7fa8" />
              <stop offset="1" stopColor="#1d3a62" />
            </linearGradient>
            <linearGradient id="sShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a3357" />
              <stop offset="1" stopColor="#0a1c36" />
            </linearGradient>
            <linearGradient id="sSnow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#c9d8ea" />
            </linearGradient>
            <linearGradient id="sMist" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7d9cc4" stopOpacity="0" />
              <stop offset="1" stopColor="#9fb8d8" stopOpacity=".55" />
            </linearGradient>
            <linearGradient id="sShineG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset=".5" stopColor="#fff" stopOpacity=".55" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id="sCircle"><circle cx="100" cy="86" r={R - 1.5} /></clipPath>
            <clipPath id="sSnowClip">
              <path d="M100,34 L86,58 L91,56 L89,64 L96,59 L100,66 L104,60 L110,65 L111,57 L116,60 Z" />
            </clipPath>
          </defs>

          {/* Çember içindeki manzara */}
          <g clipPath="url(#sCircle)">
            <rect className="s-sky" x="20" y="10" width="160" height="160" fill="url(#sSky)" />
            {STARS.map(([x, y, r], i) => (
              <circle key={i} className="s-star" cx={x} cy={y} r={r} fill="#fff" style={{ animationDelay: `${0.8 + i * 0.25}s` }} />
            ))}

            {/* Uzak sıradağ */}
            <path className="s-far" fill="url(#sFar)" opacity=".75"
              d="M20,118 L42,92 L54,100 L72,80 L88,94 L104,86 L124,70 L142,88 L156,82 L180,104 L180,170 L20,170 Z" />

            {/* Orta sıradağ */}
            <path className="s-mid" fill="url(#sMid)"
              d="M20,130 L38,108 L50,114 L64,100 L76,110 L140,104 L152,96 L166,108 L180,118 L180,170 L20,170 Z" />

            {/* Ana zirve: aydınlık yamaç + gölge yamaç + kar */}
            <g className="s-main">
              <path fill="url(#sShade)" d="M100,34 L118,64 L128,60 L146,84 L158,92 L180,138 L180,172 L94,172 L98,104 L94,84 L99,62 Z" />
              <path fill="url(#sLit)" d="M20,146 L50,102 L62,108 L78,82 L88,74 L100,34 L99,62 L94,84 L98,104 L94,172 L20,172 Z" />
              {/* Sırt ve kaya çizgileri */}
              <path d="M100,34 L99,62 L94,84 L98,104 L95,140" fill="none" stroke="#0a1a33" strokeOpacity=".35" strokeWidth=".8" />
              <path d="M78,82 L84,96 M128,60 L124,78 M146,84 L140,100 M62,108 L68,118" fill="none" stroke="#0a1a33" strokeOpacity=".3" strokeWidth=".7" strokeLinecap="round" />
              {/* Kar örtüsü */}
              <path fill="url(#sSnow)" d="M100,34 L86,58 L91,56 L89,64 L96,59 L100,66 L104,60 L110,65 L111,57 L116,60 Z" />
              <path fill="#a9bdd6" opacity=".55" d="M100,34 L116,60 L111,57 L110,65 L104,60 L100,66 Z" />
              <path fill="#eef4fb" opacity=".85" d="M128,60 L122,68 L126,67 L128,72 L131,66 L134,69 Z" />
              <path fill="#eef4fb" opacity=".8" d="M78,82 L73,90 L77,88 L79,92 L82,87 Z" />
              {/* Zirvede ışık parlaması */}
              <g clipPath="url(#sSnowClip)">
                <rect className="s-shine" x="70" y="30" width="24" height="40" fill="url(#sShineG)" transform="skewX(-20)" />
              </g>
            </g>

            {/* Etekte sis */}
            <rect className="s-mist" x="20" y="118" width="160" height="56" fill="url(#sMist)" />
          </g>

          {/* Altın çember */}
          <g className="s-gold">
            <circle cx="100" cy="86" r={R} fill="none" stroke="url(#sGold)" strokeWidth="2.2" className="s-ring" />
          </g>

          {/* Stüdyo adı */}
          <text x="100" y="180" textAnchor="middle" fontFamily="'Arial Black',Impact,system-ui,sans-serif"
            fontWeight="900" fontSize="15" letterSpacing="6" fill="#ffffff" className="s-t1">ALTAY</text>
          <text x="100" y="194" textAnchor="middle" fontFamily="system-ui,'Segoe UI',sans-serif"
            fontWeight="700" fontSize="7.5" letterSpacing="5.5" fill="url(#sGold)" className="s-t2">GAMING</text>
        </svg>
      </div>
    </>
  );
};
