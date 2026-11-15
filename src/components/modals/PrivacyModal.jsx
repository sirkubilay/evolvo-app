import { useState } from 'react';
import { X } from 'lucide-react';

export const PrivacyModal = ({ isOpen, onClose, theme }) => {
  const [activeTab, setActiveTab] = useState('privacy');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-2xl rounded-3xl p-6 md:p-8 border ${theme.panelBorder} shadow-2xl flex flex-col max-h-[85vh]`} onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-400">Sözleşmeler & Gizlilik</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
        </div>

        <div className="flex p-1 bg-white/5 rounded-xl mb-6 shadow-inner border border-white/5 flex-shrink-0 overflow-x-auto scrollbar-none">
          {[
            { id: 'privacy', label: 'Gizlilik (KVKK)' },
            { id: 'cookies', label: 'Çerez Politikası' },
            { id: 'terms', label: 'Kullanım Koşulları' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 text-xs font-bold uppercase whitespace-nowrap rounded-lg transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow' : 'text-white/50 hover:text-white/80'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto pr-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 text-sm leading-relaxed text-white/80 font-medium">
          {activeTab === 'privacy' && (
            <div className="animate-in fade-in">
              <h3 className="text-lg font-bold text-white mb-2">1. Kişisel Verilerin İşlenmesi ve Korunması (KVKK)</h3>
              <p>EVOLVO ("Oyun"), oyuncu deneyimini geliştirmek ve rekabetçi bir ortam sunmak amacıyla kısıtlı miktarda kişisel veri toplamaktadır.</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Toplanan Veriler:</strong> Google ile giriş yaptığınızda Google UID (Benzersiz Kimlik), Ad/Soyad ve E-posta adresiniz arka planda güvenli veritabanımıza (Firebase) aktarılır. Ekranda oluşturduğunuz "Kullanıcı Adı" liderlik tablosu için herkese açık şekilde yayınlanır.</li>
                <li><strong>Kullanım Amacı:</strong> Bu veriler sadece oyun içi skorlarınızı kaydetmek, hileleri önlemek (reCAPTCHA) ve cihazlar arası ilerlemenizi eşitlemek için kullanılır.</li>
                <li><strong>Veri Paylaşımı:</strong> Hesap verileriniz satılmaz veya pazarlama amacıyla 3. şahıslarla paylaşılmaz. Android uygulamasında reklamlar Google AdMob ile sunulur; AdMob reklam kimliği gibi cihaz verilerini işleyebilir. Ayrıntılar: altaygaming.com/evolvo/gizlilik</li>
                <li><strong>Veri Silme:</strong> Hesabınızı ve skorlarınızı sistemden tamamen sildirmek isterseniz iletişim kanallarımız üzerinden bizimle irtibata geçebilirsiniz.</li>
              </ul>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="animate-in fade-in">
              <h3 className="text-lg font-bold text-white mb-2">2. Çerezler ve Yerel Depolama (Local Storage)</h3>
              <p>Oyunumuz, deneyiminizi kesintisiz kılmak için tarayıcınızın yerel depolama özelliklerini kullanır. İzleme (tracking) veya pazarlama çerezleri kullanılmaz.</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Oyun İçi Tercihler:</strong> Koyu mod, renk körlüğü modu ayarlarınız tarayıcınıza kaydedilir.</li>
                <li><strong>Geçici Veriler:</strong> Günlük bulmaca sayacınız ve misafir olarak oynadığınızda size atanan rastgele kullanıcı adı yerel depolamada tutulur. Çerezleri temizlediğinizde bu veriler sıfırlanır.</li>
              </ul>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="animate-in fade-in">
              <h3 className="text-lg font-bold text-white mb-2">3. Kullanım Koşulları ve Oyun Kuralları</h3>
              <p>EVOLVO'yu oynayarak aşağıdaki temel kuralları kabul etmiş sayılırsınız:</p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li><strong>Adil Oyun:</strong> Otomatik botlar, makrolar veya üçüncü parti yazılımlar kullanılarak liderlik tablosunun manipüle edilmesi yasaktır. Tespit edilen şüpheli skorlar sistemden silinir.</li>
                <li><strong>Kullanıcı Adları:</strong> Nefret söylemi, küfür, ayrımcılık veya yasadışı içerik barındıran kullanıcı adları oluşturmak yasaktır. Bu tür hesaplar uyarısız engellenebilir.</li>
                <li><strong>Sözlük Kaynağı:</strong> Oyun içi kelimeler ve anlamları Türk Dil Kurumu (TDK) Güncel Türkçe Sözlük altyapısından sağlanmaktadır. TDK'nın veri tabanındaki güncellemeler oyun içine yansıyabilir.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 flex-shrink-0">
          <button onClick={onClose} className="w-full bg-white/10 hover:bg-white/20 py-4 rounded-xl font-bold text-white transition-all active:scale-95">
            OKUDUM VE ANLADIM
          </button>
        </div>

      </div>
    </div>
  );
};
