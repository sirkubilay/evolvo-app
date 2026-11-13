import { Bell } from 'lucide-react';
import { NOTIFICATION_TEXTS } from '../../lib/native';

/** İlk galibiyetten sonra bir kez: sistem izin penceresinden önce neden sorduğumuzu açıklar. */
export const NotificationPrompt = ({ isOpen, onAccept, onDecline, theme }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[450] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className={`${theme.panel} w-full max-w-sm rounded-3xl p-6 border ${theme.panelBorder} shadow-2xl text-white animate-in slide-in-from-bottom-6 duration-300`}>
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center">
          <Bell size={28} />
        </div>
        <h2 className="text-xl font-black text-center uppercase italic tracking-tight mb-2">Serini Koru! 🔥</h2>
        <p className="text-sm text-center opacity-70 mb-5">Günde en fazla iki kısa hatırlatma gönderelim mi?</p>
        <div className="space-y-2 mb-6 text-sm">
          <div className="bg-black/20 rounded-xl p-3 border border-white/5">
            <span className="block text-[10px] font-bold opacity-50 uppercase tracking-widest mb-0.5">Her sabah 09:00</span>
            {NOTIFICATION_TEXTS.morning.title}
          </div>
          <div className="bg-black/20 rounded-xl p-3 border border-white/5">
            <span className="block text-[10px] font-bold opacity-50 uppercase tracking-widest mb-0.5">20:00 — sadece o gün oynamadıysan</span>
            {NOTIFICATION_TEXTS.evening(3).title}
          </div>
        </div>
        <button onClick={onAccept} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black text-white transition-all active:scale-95 mb-2">EVET, HATIRLAT</button>
        <button onClick={onDecline} className="w-full py-3 rounded-xl font-bold text-white/50 hover:text-white/80 text-sm">Şimdi değil</button>
      </div>
    </div>
  );
};
