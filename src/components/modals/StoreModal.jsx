import { useEffect, useState } from 'react';
import { X, Ban, Loader2, Lightbulb, ShoppingBag, Check } from 'lucide-react';
import { getStorePrices, purchaseRemoveAds, purchaseHintPack } from '../../lib/monetization';
import { useHintWallet } from '../../lib/hints';
import { HINT_PACKS, REMOVE_ADS_PRODUCT_ID } from '../../data/constants';

const PACK_STYLE = {
  hints_5: { label: '5 İpucu', tag: null },
  hints_10: { label: '10 İpucu', tag: 'Popüler' },
  hints_20: { label: '20 İpucu', tag: 'En avantajlı' },
};

/** Mağaza: "Reklamları Kaldır" (tek seferlik) + ipucu paketleri (tüketilebilir). Ödeme Google Play üzerinden. */
export const StoreModal = ({ isOpen, onClose, adsRemoved, onAdsRemoved, theme, showFeedback }) => {
  const [prices, setPrices] = useState({});
  const [busy, setBusy] = useState(null);
  const wallet = useHintWallet();

  useEffect(() => {
    if (!isOpen) return undefined;
    let alive = true;
    getStorePrices().then((p) => { if (alive) setPrices(p); });
    return () => { alive = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const report = (result, okMsg) => {
    if (result === 'ok') showFeedback(okMsg, 'success');
    else if (result === 'pending') showFeedback('Ödeme onay bekliyor; onaylanınca hesabına eklenecek.', 'info');
    else if (result === 'error') showFeedback('Satın alma tamamlanamadı.', 'error');
  };

  const buyRemoveAds = async () => {
    setBusy('ads');
    const r = await purchaseRemoveAds();
    setBusy(null);
    if (r === 'ok') onAdsRemoved();
    report(r, 'Teşekkürler! Bölüm arası reklamlar kaldırıldı 💛');
  };

  const buyPack = async (pack) => {
    setBusy(pack.id);
    const r = await purchaseHintPack(pack);
    setBusy(null);
    report(r, `+${pack.count} ipucu hesabına eklendi! 💡`);
  };


  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center sm:p-6 bg-black/75 backdrop-blur-md" onClick={() => !busy && onClose()}>
      <div
        className={`${theme.panel} w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6 border ${theme.panelBorder} shadow-2xl text-white animate-in slide-in-from-bottom-6 duration-300`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2"><ShoppingBag size={22} className="text-yellow-400" /> Mağaza</h2>
          <button onClick={onClose} disabled={!!busy} aria-label="Kapat" className="p-1.5 hover:bg-white/10 rounded-full"><X size={20} /></button>
        </div>

        {/* İpucu paketleri */}
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-black uppercase tracking-widest opacity-70">İpucu paketleri</h3>
          <span className="text-xs font-bold bg-yellow-400/15 text-yellow-300 px-2.5 py-1 rounded-full flex items-center gap-1"><Lightbulb size={12} fill="currentColor" /> {wallet} ipucun var</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mb-2">
          {HINT_PACKS.map((pack) => {
            const st = PACK_STYLE[pack.id];
            return (
              <button key={pack.id} onClick={() => buyPack(pack)} disabled={!!busy}
                className={`relative rounded-2xl p-3 pt-4 border flex flex-col items-center gap-1 active:scale-95 transition-all disabled:opacity-60 ${st.tag ? 'border-yellow-400/60 bg-yellow-400/10' : 'border-white/10 bg-white/5'}`}>
                {st.tag && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black uppercase bg-yellow-400 text-black px-2 py-0.5 rounded-full">{st.tag}</span>}
                <Lightbulb size={26} className="text-yellow-400" fill="currentColor" />
                <span className="font-black text-sm">{st.label}</span>
                <span className="text-xs font-bold opacity-80 min-h-[1rem]">{busy === pack.id ? <Loader2 size={14} className="animate-spin" /> : (prices[pack.id] || '—')}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] opacity-50 mb-6">İpuçları sınırsız modda kullanılır. Günlük bulmacada sıralama adil kalsın diye her bulmacada 1 ücretsiz ipucu var.</p>

        {/* Reklamları kaldır */}
        <h3 className="text-xs font-black uppercase tracking-widest opacity-70 mb-2.5">Reklamları kaldır</h3>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-yellow-500/15 to-amber-600/10 p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 text-black flex items-center justify-center"><Ban size={22} /></div>
            <div>
              <p className="font-black">Reklamsız sınırsız mod</p>
              <p className="text-xs opacity-70">Sınırsız modda bölümler arasında çıkan reklamlar tamamen kalkar. Tek seferlik ödeme, abonelik yok.</p>
            </div>
          </div>
          {adsRemoved ? (
            <div className="w-full py-3 rounded-xl font-black text-sm bg-green-600/20 text-green-300 flex items-center justify-center gap-2"><Check size={18} /> SATIN ALINDI</div>
          ) : (
            <button onClick={buyRemoveAds} disabled={!!busy} className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black py-3.5 rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60">
              {busy === 'ads' ? <Loader2 className="animate-spin" /> : `SATIN AL${prices[REMOVE_ADS_PRODUCT_ID] ? ` · ${prices[REMOVE_ADS_PRODUCT_ID]}` : ''}`}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
