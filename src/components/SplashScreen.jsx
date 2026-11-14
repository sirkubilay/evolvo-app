import { useState, useEffect } from 'react';

export const SplashScreen = ({ onDone }) => {
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 2400);
    const t2 = setTimeout(onDone, 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const R = 78;
  const circ = +(2 * Math.PI * R).toFixed(1);
  const mtnPath = "M46,122 L70,68 L85,87 L100,34 L116,84 L132,60 L154,122 Z";

  return (
    <>
      <style>{`
        @keyframes spl-ring { from{stroke-dashoffset:${circ}} to{stroke-dashoffset:0} }
        @keyframes spl-rise { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spl-fade { from{opacity:0} to{opacity:1} }
        @keyframes spl-glow {
          0%,100% { filter:drop-shadow(0 0 10px rgba(201,162,39,.45)); }
          50%      { filter:drop-shadow(0 0 28px rgba(220,180,60,.75)); }
        }
        .s-ring { stroke-dasharray:${circ}; stroke-dashoffset:${circ};
                  animation:spl-ring 1.2s ease-in-out .3s forwards; }
        .s-mtn  { animation:spl-rise .65s cubic-bezier(.22,1,.36,1) .2s both; }
        .s-t1   { opacity:0; animation:spl-fade .5s ease 1.4s forwards; }
        .s-t2   { opacity:0; animation:spl-fade .5s ease 1.6s forwards; }
        .s-sep  { opacity:0; animation:spl-fade .4s ease 1.35s forwards; }
        .s-gold { animation:spl-glow 3s ease-in-out 1.6s infinite; }
      `}</style>
      <div
        className={`fixed inset-0 flex items-center justify-center z-[9999] transition-opacity duration-500 ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: '#001f3f' }}
      >
        <svg width="290" height="290" viewBox="0 0 200 200">
          <defs>
            <linearGradient id="sGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#e8bc4e"/>
              <stop offset="50%"  stopColor="#b8880e"/>
              <stop offset="100%" stopColor="#e8bc4e"/>
            </linearGradient>
            <clipPath id="sMtnClip">
              <path d="M46,122 L70,68 L85,87 L100,34 L116,84 L132,60 L154,122 Z"/>
            </clipPath>
          </defs>

          {/* Dağ gövdesi — glow yok, arka planla birebir aynı renk */}
          <g className="s-mtn">
            <path d={mtnPath} fill="#001f3f"/>
            <polygon points="100,34 90,55 110,55"  fill="white" opacity="0.95" clipPath="url(#sMtnClip)"/>
            <polygon points="70,68 61,83 79,83"    fill="white" opacity="0.80" clipPath="url(#sMtnClip)"/>
            <polygon points="132,60 123,74 141,74" fill="white" opacity="0.80" clipPath="url(#sMtnClip)"/>
          </g>

          {/* Altın elemanlar — glow sadece bunlara uygulanıyor */}
          <g className="s-gold">
            <circle cx="100" cy="100" r={R} fill="none"
              stroke="url(#sGold)" strokeWidth="2.2" className="s-ring"/>
            <path d="M46,122 L70,68 L85,87 L100,34 L116,84 L132,60 L154,122"
              fill="none" stroke="url(#sGold)" strokeWidth="2.5"
              strokeLinejoin="round" strokeLinecap="round" className="s-mtn"/>
          </g>

          <line x1="68" y1="133" x2="132" y2="133"
            stroke="url(#sGold)" strokeWidth="0.8" opacity="0.55" className="s-sep"/>

          <text x="100" y="147" textAnchor="middle"
            fontFamily="'Arial Black',Impact,sans-serif"
            fontWeight="900" fontSize="14" letterSpacing="5"
            fill="white" className="s-t1">ALTAY</text>

          <text x="100" y="159" textAnchor="middle"
            fontFamily="'Arial Black',Impact,sans-serif"
            fontWeight="400" fontSize="6.5" letterSpacing="3.5"
            fill="url(#sGold)" className="s-t2">INTERACTIVE</text>
        </svg>
      </div>
    </>
  );
};
