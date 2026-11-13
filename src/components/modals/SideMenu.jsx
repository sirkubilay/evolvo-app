import { Trophy, X, BarChart2, HelpCircle, Calendar as CalendarIcon, Medal, Swords, Moon, Eye, Bell, Users, Ban } from 'lucide-react';
import { isNative } from '../../lib/native';
import { Logo } from '../Logo';

const Toggle = ({ on, onToggle, color = 'bg-green-500' }) => (
  <button onClick={onToggle} className={`w-12 h-6 rounded-full relative transition-colors ${on ? color : 'bg-gray-400'}`}>
    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${on ? 'right-1' : 'left-1'}`} />
  </button>
);

export const SideMenu = ({ isOpen, onClose, toggleModal, settings, theme, user, onLogout, onLogin }) => {
  const items = [
    { icon: <BarChart2 size={18} className="text-green-400" />, label: "İstatistikler", action: 'stats' },
    { icon: <Medal size={18} className="text-blue-400" />, label: "Başarımlar", action: 'achievements' },
    { icon: <HelpCircle size={18} className="text-red-400" />, label: "Nasıl Oynanır?", action: 'howToPlay' },
    { icon: <Trophy size={18} className="text-yellow-400" />, label: "Liderlik Tablosu", action: 'leaderboard' },
    { icon: <Users size={18} className="text-pink-400" />, label: "Arkadaşlar", action: 'friends' },
    { icon: <CalendarIcon size={18} className="text-orange-400" />, label: "Geçmiş Bulmacalar", action: 'calendar' },
    { icon: <Swords size={18} className="text-gray-300" />, label: "Meydan Oku", action: 'challenge' },
  ];
  const native = isNative();

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-80 ${theme.panel} border-l ${theme.panelBorder} z-[110] shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-6 flex justify-between items-center border-b ${theme.panelBorder} flex-none">
          <Logo colors={theme} />
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><X /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
           {user ? (
             <button onClick={() => { onLogout(); onClose(); }} className={`w-full flex items-center gap-4 p-4 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl font-bold text-sm transition-all flex-shrink-0 mb-4 shadow-inner`}>
               <div className="font-bold text-lg">X</div> Çıkış Yap
             </button>
           ) : (
             <button onClick={() => { if(onLogin) onLogin(); onClose(); }} className={`w-full flex items-center gap-4 p-4 ${theme.key} text-white rounded-xl font-bold text-sm hover:brightness-105 transition-all flex-shrink-0 mb-4 shadow-inner`}>
               <div className="text-blue-400 font-bold text-lg">G</div> İlerlemeyi Kaydet
             </button>
           )}

           {items.map((item, i) => (
             <button key={i} onClick={() => { if(item.action) toggleModal(item.action, true); onClose(); }} className={`w-full flex items-center gap-4 p-4 ${theme.key} text-white rounded-xl font-bold text-sm hover:brightness-105 transition-all flex-shrink-0 shadow-inner`}>
               {item.icon} {item.label}
             </button>
           ))}

           {native && settings.onRemoveAds && !settings.adsRemoved && (
             <button onClick={() => { settings.onRemoveAds(); onClose(); }} className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 text-yellow-200 rounded-xl font-bold text-sm hover:brightness-110 transition-all flex-shrink-0">
               <Ban size={18} className="text-yellow-400" /> Reklamları Kaldır
             </button>
           )}

           <div className="border-t border-white/5 my-4 pt-4 space-y-2">
             {native && settings.setNotifications && (
               <div className={`flex items-center justify-between p-4 ${theme.key} rounded-xl shadow-inner`}>
                 <div className="flex items-center gap-3"><Bell size={18} /><span className="font-bold text-sm text-white">Günlük Hatırlatma</span></div>
                 <Toggle on={settings.notificationsOn} onToggle={() => settings.setNotifications(!settings.notificationsOn)} />
               </div>
             )}
             <div className={`flex items-center justify-between p-4 ${theme.key} rounded-xl shadow-inner`}>
               <div className="flex items-center gap-3"><Moon size={18} /><span className="font-bold text-sm text-white">Koyu Mod</span></div>
               <button onClick={() => settings.setDarkMode(!settings.darkMode)} className={`w-12 h-6 rounded-full relative transition-colors ${settings.darkMode ? 'bg-green-500' : 'bg-gray-400'}`}>
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.darkMode ? 'right-1' : 'left-1'}`} />
               </button>
             </div>
             
             <div className={`flex items-center justify-between p-4 ${theme.key} rounded-xl shadow-inner`}>
               <div className="flex items-center gap-3"><Eye size={18} /><span className="font-bold text-sm text-white">Renk Körlüğü</span></div>
               <button onClick={() => settings.setColorBlindMode(!settings.colorBlindMode)} className={`w-12 h-6 rounded-full relative transition-colors ${settings.colorBlindMode ? 'bg-blue-500' : 'bg-gray-400'}`}>
                 <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.colorBlindMode ? 'right-1' : 'left-1'}`} />
               </button>
             </div>
           </div>
        </div>
      </div>
    </>
  );
};

