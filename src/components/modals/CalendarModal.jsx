import { useState } from 'react';
import { X, Calendar as CalendarIcon, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { getStartDate } from '../../data/constants';

export const CalendarModal = ({ isOpen, onClose, theme, colors, onSelectDate }) => {
   const [currentDate, setCurrentDate] = useState(new Date()); 
   if (!isOpen) return null;
   const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
   const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); 
   const startOffset = firstDay === 0 ? 6 : firstDay - 1;
   const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
   
   const startDateObj = getStartDate();

   const changeMonth = (dir) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(currentDate.getMonth() + dir);
      if (newDate < startDateObj || newDate > new Date()) return;
      setCurrentDate(newDate);
   };
   return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
         <div className={`${theme.panel} w-full max-w-md rounded-3xl p-6 border ${theme.panelBorder} shadow-2xl`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight"><CalendarIcon /> GEÇMİŞ</h2><button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X /></button></div>
            <div className="flex justify-between items-center mb-6 px-4 bg-black/10 p-2 rounded-xl shadow-inner border border-white/5"><button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"><ChevronLeft /></button><span className="font-bold text-lg text-white/90">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span><button onClick={() => changeMonth(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"><ChevronRightIcon /></button></div>
            <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2 font-bold opacity-50 uppercase tracking-widest">{['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => <div key={d}>{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-2">
               {[...Array(startOffset)].map((_, i) => <div key={`empty-${i}`} />)}
               {[...Array(daysInMonth)].map((_, i) => {
                  const day = i + 1;
                  const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const isPast = dateObj >= startDateObj && !(dateObj > new Date());
                  
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  
                  return (
                    <button 
                      key={day} 
                      disabled={!isPast} 
                      onClick={() => { if(onSelectDate) onSelectDate(dateStr); }} 
                      className={`aspect-square flex flex-col items-center justify-center rounded-lg font-bold text-sm transition-all ${isPast ? `${colors.success} hover:brightness-110 shadow-inner` : `${theme.emptyCell} opacity-30 cursor-not-allowed`}`}
                    >
                      {day}
                    </button>
                  );
               })}
            </div>
         </div>
      </div>
   );
};

