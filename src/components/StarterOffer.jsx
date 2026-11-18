import { useEffect, useState } from 'react';
import { Loader2, Lightbulb, Ban, Clock } from 'lucide-react';
import { starterOfferRemaining } from '../lib/hints';
import { starterOwned, purchaseStarterPack, getStorePrices } from '../lib/monetization';
import { isNative } from '../lib/native';
import { STARTER_PACK } from '../data/constants';

const fmt = (ms) => {
  const m = Math.floor(ms / 60000);
  return `${Math.floor(m / 60)} sa ${String(m % 60).padStart(2, '0')} dk`;
};

/** Başlangıç paketi teklifi şu an gösterilmeli mi. */
export const starterOfferActive = () => isNative() && !starterOwned() && starterOfferRemaining() > 0;

/**
 * Başlangıç paketi kartı (25 ipucu + reklamsız, tek seferlik, süreli).
 * Teklif yoksa hiçbir şey çizmez. onResult('ok' | 'pending' | 'error' | 'cancelled').
 */
export const StarterOfferCard = ({ onResult, disabled, className = '' }) => {
  const [left, setLeft] = useState(starterOfferRemaining);
  const [price, setPrice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(starterOwned);

  useEffect(() => {
    const t = setInterval(() => setLeft(starterOfferRemaining()), 30000);
    let alive = true;
    getStorePrices().then((p) => { if (alive) setPrice(p[STARTER_PACK.id] || null); });
    return () => { clearInterval(t); alive = false; };
  }, []);

  if (!isNative() || done || left <= 0) return null;

  const buy = async () => {
    setBusy(true);
    const r = await purchaseStarterPack();
    setBusy(false);
    if (r === 'ok') setDone(true);
    onResult?.(r);
  };

  return (
    <div className={`relative rounded-2xl border-2 border-yellow-400/70 bg-gradient-to-br from-yellow-400/20 via-amber-500/10 to-purple-600/20 p-4 text-left ${className}`}>
      <span className="absolute -top-2.5 left-4 text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-black px-2.5 py-0.5 rounded-full">Başlangıç paketi · tek seferlik</span>
      <div className="flex items-center justify-between gap-2 mt-1">
        <div>
          <p className="font-black text-lg leading-tight flex items-center gap-1.5"><Lightbulb size={18} className="text-yellow-400" fill="currentColor" /> {STARTER_PACK.count} İpucu</p>
          <p className="font-black text-sm leading-tight flex items-center gap-1.5 mt-0.5 text-green-300"><Ban size={15} /> + Reklamsız Evrim Yolu</p>
        </div>
        <div className="text-right text-[11px] font-bold text-yellow-200 flex items-center gap-1"><Clock size={13} /> {fmt(left)}</div>
      </div>
      <button onClick={buy} disabled={busy || disabled}
        className="mt-3 w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black py-3 rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60">
        {busy ? <Loader2 className="animate-spin" size={18} /> : `HEMEN AL${price ? ` · ${price}` : ''}`}
      </button>
    </div>
  );
};
