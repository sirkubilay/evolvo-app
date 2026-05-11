import { X } from 'lucide-react';
import { AVATARS } from '../../constants';

const AvatarModal = ({ isOpen, onClose, onSelect, theme, colors, userAvatar, username }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div className={`${theme.panel} w-full max-w-sm rounded-[2rem] p-6 border border-white/10 text-white shadow-2xl flex flex-col max-h-[80vh]`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-black italic">Profil & Avatar</h2>
           <button onClick={onClose} className="transition-colors hover:text-red-500"><X size={24} /></button>
        </div>
        {username && userAvatar && (
           <div className="flex flex-col items-center justify-center bg-black/20 rounded-2xl p-4 mb-6 border border-white/5 shadow-inner">
              <div className="text-5xl mb-2 drop-shadow-lg">{userAvatar.icon}</div>
              <span className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">Mevcut İsmin</span>
              <span className="font-black text-xl text-green-400 break-all text-center">{username}</span>
           </div>
        )}
        <h3 className="text-xs font-bold opacity-50 uppercase tracking-widest mb-3">Yeni Avatar Seç</h3>
        <div className="grid grid-cols-4 gap-4 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/20">
          {AVATARS.map((av) => (
            <button key={av.id} onClick={() => onSelect(av)} className="aspect-square flex items-center justify-center bg-white/5 rounded-2xl hover:bg-white/20 hover:scale-110 transition-all border border-transparent hover:border-green-500 text-3xl shadow-inner">{av.icon}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AvatarModal;
