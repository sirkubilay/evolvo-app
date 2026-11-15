import { X, Mail } from 'lucide-react';

export const ContactModal = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-md rounded-3xl p-8 border ${theme.panelBorder} shadow-2xl animate-in zoom-in`} onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-black italic text-blue-400 uppercase tracking-tighter">İLETİŞİM</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="text-center space-y-6">
          <p className="text-sm font-medium opacity-80 leading-relaxed text-white">
            Önerileriniz, hata bildirimleriniz veya işbirlikleri için bizimle e-posta yoluyla iletişime geçebilirsiniz.
          </p>
          
          {/* mailto: etiketi tıklandığında otomatik mail uygulamasını açar */}
          <a 
            href="mailto:info@altaygaming.com" 
            className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-2xl font-bold text-white transition-all active:scale-95 w-full justify-center border border-white/5 shadow-inner"
          >
            <Mail size={24} className="text-blue-400" />
            <span className="tracking-wide">info@altaygaming.com</span>
          </a>
        </div>

      </div>
    </div>
  );
};
