import { useEffect, useState } from 'react';
import { X, Ban, Loader2, Lightbulb, Heart } from 'lucide-react';
import { getRemoveAdsPrice, purchaseRemoveAds, restoreRemoveAds } from '../../lib/monetization';

/** Tek seferlik "Reklamları Kaldır" satın alması (Google Play Faturalandırma). */
export const RemoveAdsModal = ({ isOpen, onClose, onPurchased, theme, showFeedback }) => {
  const [price, setPrice] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let alive = true;
    getRemoveAdsPrice().then((p) => { if (alive) setPrice(p); });
    return () => { alive = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const buy = async () => {
    setBusy(true);
    const result = await purchaseRemoveAds();
    setBusy(false);
    if (result === 'ok') { showFeedback('Teşekkürler! Reklamlar kaldırıldı 💛', 'success'); onPurchased(); onClose(); }
    else if (result === 'pending') showFeedback('Ödeme onay bekliyor; onaylanınca reklamlar kalkacak.', 'info');
    else if (result === 'error') showFeedback('Satın alma tamamlanamadı.', 'error');
  };

  const restore = async () => {
    setBusy(true);
    const owned = await restoreRemoveAds();
    setBusy(false);
    if (owned) { showFeedback('Satın alman geri yüklendi!', 'success'); onPurchased(); onClose(); }
    else showFeedback('Bu Google hesabında satın alma bulunamadı.', 'error');
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/75 backdrop-blur-md" onClick={() => !busy && onClose()}>
      <div className={`${theme.panel} w-full max-w-sm rounded-3xl p-6 border ${theme.panelBorder} shadow-2xl text-white`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end"><button onClick={onClose} disabled={busy} className="p-1 hover:bg-white/10 rounded-full"><X size={20} /></button></div>
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 text-black flex items-center justify-center"><Ban size={32} /></div>
        <h2 className="text-2xl font-black text-center italic uppercase tracking-tight mb-4">Reklamsız Evolvo</h2>
        <ul className="space-y-2 text-sm mb-6">
          <li className="flex items-center gap-3 bg-black/20 p-3 rounded-xl"><Ban size={16} className="text-yellow-400 flex-shrink-0" /> Bölüm arası reklamlar tamamen kalkar</li>
          <li className="flex items-center gap-3 bg-black/20 p-3 rounded-xl"><Lightbulb size={16} className="text-yellow-400 flex-shrink-0" /> Ek ipuçlarını reklam izlemeden al</li>
          <li className="flex items-center gap-3 bg-black/20 p-3 rounded-xl"><Heart size={16} className="text-yellow-400 flex-shrink-0" /> Tek seferlik ödeme, abonelik yok</li>
        </ul>
        <button onClick={buy} disabled={busy} className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60">
          {busy ? <Loader2 className="animate-spin" /> : `SATIN AL${price ? ` · ${price}` : ''}`}
        </button>
        <button onClick={restore} disabled={busy} className="w-full py-3 mt-2 text-xs font-bold text-white/50 hover:text-white/80 uppercase tracking-widest">Satın Almayı Geri Yükle</button>
      </div>
    </div>
  );
};
