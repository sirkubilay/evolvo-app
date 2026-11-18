import { useState, useEffect, useCallback, useRef } from 'react';
import { createRowDeleteGuard } from '../lib/rowDeleteGuard';
import { X, Delete, Swords, CheckCircle2, AlertCircle, Loader2, Book, ChevronLeft, Plus, Minus, Copy, MessageCircle, Settings } from 'lucide-react';

export const ChallengePage = ({ onBack, theme, colors, checkTDK, toggleModal }) => {
  // Kitap ikonuna basınca kelimenin TDK anlamını göster (önceden tanımsızdı → çökme)
  const handleDictClick = (word) => toggleModal('definition', word);
  // (Kullanılmayan isWon/showShareToast state'leri kaldırıldı; bu iki değer bu ekranda hiç değişmiyor)
  const winningRowAnimation = null;
  const isGameOver = false;
  const [wordLength, setWordLength] = useState(5);
  const [history, setHistory] = useState([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const rowDeleteGuard = useRef(createRowDeleteGuard());
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rowAnimation, setRowAnimation] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Modal State'leri
  const [moves, setMoves] = useState(0);
  const [shareLink, setShareLink] = useState(null);

  const showFeedback = (msg, type = "info") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(null), 2500);
  };

  const encodeData = (data) => btoa(unescape(encodeURIComponent(JSON.stringify(data))));

  const handleKeyPress = useCallback(async (key) => {
    if (finalizeOpen || isLoading) return;

    if (key === 'Enter') {
      if (currentGuess.length !== wordLength) {
        showFeedback(`${wordLength} harfli olmalı!`, "error");
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      if (history.length > 0) {
        const previousWord = history[history.length - 1];
        let diffCount = 0;
        for (let i = 0; i < previousWord.length; i++) {
          if (previousWord[i] !== currentGuess[i]) diffCount++;
        }
        if (diffCount !== 1) {
          showFeedback("Sadece 1 harf değiştirebilirsiniz!", "error");
          setRowAnimation('shake');
          setTimeout(() => setRowAnimation(null), 500);
          return;
        }
      }

      // 🔥 İŞTE YENİ EKLENEN KISIM: MEYDAN OKUMADA KELİME TEKRARI KONTROLÜ 🔥
      if (history.includes(currentGuess)) {
        showFeedback("Bu kelimeyi zaten kullandın!", "error");
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      setIsLoading(true);
      const isValid = await checkTDK(currentGuess);
      setIsLoading(false);

      if (!isValid) {
        showFeedback("Geçersiz Kelime", "error");
        setRowAnimation('shake');
        setTimeout(() => setRowAnimation(null), 500);
        return;
      }

      setHistory(prev => [...prev, currentGuess]);
      setCurrentGuess("");

    } else if (key === 'Delete' || key === 'Backspace') {
      if (currentGuess.length > 0) {
        rowDeleteGuard.current.touch();
        setCurrentGuess(p => p.slice(0, -1));
      } else if (history.length > 0) {
        if (rowDeleteGuard.current.confirm()) setHistory(p => p.slice(0, -1));
      }
    } else if (currentGuess.length < wordLength && /^[A-ZÇĞİÖŞÜ]$/.test(key)) {
      rowDeleteGuard.current.touch();
      setCurrentGuess(p => p + key);
    }
  }, [currentGuess, history, finalizeOpen, isLoading, wordLength, checkTDK]);

  useEffect(() => {
    const handler = (e) => {
      const trKey = e.key.toLocaleUpperCase('tr-TR');
      if (trKey === 'ENTER') handleKeyPress('Enter');
      else if (trKey === 'BACKSPACE') handleKeyPress('Backspace');
      else if ("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ".includes(trKey)) handleKeyPress(trKey);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyPress]);

  const handleGenerateLink = () => {
    const minMoves = history.length - 1;
    const puzzleData = {
      type: 'custom',
      date: new Date().toISOString(),
      start: history[0],
      target: history[history.length - 1],
      solution: history,
      optimalSteps: minMoves,
      maxMoves: moves
    };
    const encoded = encodeData(puzzleData);
    const generatedLink = `${window.location.origin}${window.location.pathname}?challenge=${encoded}`;
    setShareLink(generatedLink);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(`🧩 EVOLVO MEYDAN OKUMASI 🧩\n\n🚀 Başlangıç: ${history[0]}\n🏁 Hedef: ${history[history.length - 1]}\n\nBu zinciri çözebilecek misin? 👇\n${text}`)
      .then(() => showFeedback("Link kopyalandı!", "success"))
      .catch(() => showFeedback("Kopyalanamadı", "error"));
  };

  const keyboardRows = [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'Enter']
  ];

  return (
    <div className={`h-screen flex flex-col font-sans overflow-hidden ${theme.bg} ${theme.text}`}>
      <header className={`px-4 py-3 flex items-center justify-between border-b ${theme.panelBorder} bg-black/40 backdrop-blur-md z-20`}>
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft size={24} /></button>
        <h2 className="text-lg font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 flex items-center gap-2 drop-shadow-lg"><Swords size={20} className="text-blue-400"/> MEYDAN OKUMA KUR</h2>
        <div className="w-8"></div>
      </header>

      <div className="relative h-10 w-full flex items-center justify-center z-20"> 
        {message && (
            <div className={`absolute top-1 px-4 py-2 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 flex items-center gap-2 font-bold text-xs border ${message.type === 'success' ? colors.success : colors.error}`}>
              {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {message.text}
            </div>
        )}
      </div>

      <main className="flex-1 overflow-y-auto px-4 w-full flex flex-col items-center relative pb-64 pt-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
         <div className="w-full max-w-md mx-auto space-y-2">
            
            <div className="text-center mb-6 mt-2 animate-in fade-in slide-in-from-top-4">
                <h3 className="text-2xl font-black italic uppercase tracking-widest text-blue-100 drop-shadow-md">Zinciri Oluştur</h3>
                <p className="text-xs font-medium opacity-60 mt-1">Kelimeleri evrimleştirerek kendi bulmacanı tasarla.</p>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl mb-8 ${theme.panel} border ${theme.panelBorder} shadow-lg animate-in fade-in zoom-in`}>
              <span className="opacity-60 text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Settings size={16}/> Harf Sayısı</span>
              {history.length === 0 ? (
                <div className="flex items-center gap-4">
                  <button onClick={() => setWordLength(Math.max(4, wordLength - 1))} className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-90"><Minus size={18}/></button>
                  <span className="text-3xl font-black text-blue-400 drop-shadow-md">{wordLength}</span>
                  <button onClick={() => setWordLength(Math.min(7, wordLength + 1))} className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-90"><Plus size={18}/></button>
                </div>
              ) : (
                <span className="text-3xl font-black text-green-400 px-4 drop-shadow-md">{wordLength}</span>
              )}
            </div>

            {history.map((word, idx) => (
               <div key={idx} className="relative flex items-center justify-center w-fit mx-auto">
                  <div className="flex gap-1 sm:gap-1.5 z-10" style={{ perspective: '1000px' }}>
                     {word.split('').map((char, i) => (
                        <div key={i} 
                             className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center text-lg md:text-xl font-black rounded-lg border-2 ${idx === 0 ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-green-600 border-green-700 text-white shadow-sm'}`}
                             style={idx === history.length - 1 && idx !== 0 ? { 
                               animation: `flip-letter 0.5s ease-out both`, 
                               animationDelay: `${i * 150}ms` 
                             } : {}}
                        >
                           {char}
                        </div>
                     ))}
                  </div>
                  <div className="absolute left-full ml-2 z-20 flex items-center h-full">
                     <button onClick={() => handleDictClick(word)} className={`p-2 rounded-lg opacity-40 hover:opacity-100 transition-opacity ${theme.emptyCell}`} title="Anlamını Gör"><Book size={16} /></button>
                  </div>
               </div>
            ))}

            {!isGameOver && (
               <div className={`relative flex items-center justify-center w-fit mx-auto transition-transform ${rowAnimation === 'shake' ? 'animate-shake' : ''}`}>
                  <div className="flex gap-1 sm:gap-1.5 z-10" style={{ perspective: '1000px' }}>
                     {[...Array(wordLength)].map((_, i) => (
                        <div key={i} 
                          className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center text-lg md:text-xl font-black rounded-lg border-2 ${rowAnimation === 'shake' ? colors.errorBg + ' ' + colors.errorBorder : (winningRowAnimation ? 'bg-green-600 border-green-700 text-white shadow-green-500/30 shadow-lg' : 'bg-white/5 border-white/10 shadow-inner')}`}
                          style={winningRowAnimation ? { 
                            animation: `flip-correct 0.6s ease-in-out forwards`,
                            animationDelay: `${i * 150}ms`,
                            backfaceVisibility: 'hidden'
                          } : {}}
                        >
                           {isLoading && i === Math.floor(wordLength/2) ? <Loader2 className="animate-spin text-green-500" /> : (
                              currentGuess[i] ? currentGuess[i] : (i === currentGuess.length ? <span className="animate-pulse opacity-50 font-light text-2xl md:text-3xl">|</span> : "")
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {history.length >= 4 && !finalizeOpen && (
               <button onClick={() => { setMoves(history.length - 1); setFinalizeOpen(true); }} className={`mt-10 w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 py-4 rounded-xl font-black text-lg shadow-2xl shadow-blue-500/20 animate-in zoom-in transition-transform active:scale-95`}>
                   BULMACAYI BİTİR VE PAYLAŞ
               </button>
            )}
         </div>
      </main>

      <div className={`fixed bottom-0 left-0 w-full bg-black/40 backdrop-blur-xl p-1 pb-4 border-t ${theme.panelBorder} z-30 animate-in slide-in-from-bottom-8`}>
         <div className="max-w-xl mx-auto space-y-1">
            {keyboardRows.map((row, i) => (
               <div key={i} className="flex justify-center gap-1">
                  {row.map(key => (
                     <button 
                        key={key} 
                        onPointerDown={(e) => { 
                           e.preventDefault(); 
                           handleKeyPress(key === 'Enter' ? 'Enter' : key === 'Backspace' ? 'Backspace' : key); 
                        }} 
                        className={`h-11 md:h-12 flex-1 rounded-md font-bold text-sm md:text-base transition-colors shadow-sm ${key === 'Enter' ? `px-2 md:px-3 ${colors.btnPrimary}` : key === 'Ö' || key === 'Ç' ? 'flex-[0.8]' : ''} ${key !== 'Enter' ? `${theme.key} ${theme.keyText} hover:brightness-110 active:scale-95` : ''}`}
                     >
                        {key}
                     </button>
                  ))}
                  {i === 2 && (
                     <button 
                        key="backspace" 
                        onPointerDown={(e) => { 
                           e.preventDefault(); 
                           handleKeyPress('Backspace'); 
                        }} 
                        className="h-11 md:h-12 px-3 md:px-4 bg-red-900/50 text-red-100 rounded-md flex items-center justify-center hover:bg-red-900/70 transition-colors active:scale-95 shadow-sm"
                     >
                        <Delete size={20} />
                     </button>
                  )}
               </div>
            ))}
         </div>
      </div>

      {finalizeOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className={`${theme.panel} w-full max-w-md rounded-[2rem] p-8 border ${theme.panelBorder} shadow-2xl animate-in zoom-in duration-300 relative`}>
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 uppercase tracking-tighter">SON ADIM</h2>
                {!shareLink && <button onClick={() => setFinalizeOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>}
             </div>

             <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
               <label className="text-xs font-bold uppercase opacity-60 tracking-widest block text-center">Oyuncuya Verilecek Hak</label>
               <div className={`flex items-center justify-between mt-4`}>
                 <button type="button" onClick={() => setMoves(Math.max(history.length - 1, moves - 1))} className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors active:scale-90"><Minus size={20}/></button>
                 <div className="text-center">
                    <span className="text-6xl font-black text-white leading-none tracking-tighter drop-shadow-lg">{moves}</span>
                    <span className="block text-[10px] text-blue-400 font-bold opacity-80 mt-2 uppercase">MİNİMUM: {history.length - 1} HAK</span>
                 </div>
                 <button type="button" onClick={() => setMoves(moves + 1)} className="p-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors active:scale-90"><Plus size={20}/></button>
               </div>
             </div>

             {!shareLink ? (
               <button onClick={handleGenerateLink} className={`w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 py-4 rounded-xl font-black text-lg transition-transform active:scale-95 shadow-lg shadow-blue-500/20`}>
                 LİNK OLUŞTUR
               </button>
             ) : (
               <div className="space-y-3 animate-in zoom-in">
                 <div className="p-4 bg-black/40 rounded-xl border border-white/10 text-xs font-mono break-all text-green-400 shadow-inner max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                   {shareLink}
                 </div>
                 <button onClick={() => copyToClipboard(shareLink)} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-blue-500/20"><Copy size={20}/> LİNKİ KOPYALA</button>
                 <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`🧩 EVOLVO MEYDAN OKUMASI 🧩\n\n🚀 Başlangıç: ${history[0]}\n🏁 Hedef: ${history[history.length - 1]}\n\nBu zinciri çözebilecek misin? 👇\n${shareLink}`)}`, '_blank')} className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-green-500/20"><MessageCircle size={20}/> WHATSAPP İLE GÖNDER</button>
                 <button onClick={onBack} className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-xl font-bold mt-4 transition-colors">ANA SAYFAYA DÖN</button>
               </div>
             )}
          </div>
        </div>
      )}
      
      <style>{`
        .shadow-blue-500\\/30 { box-shadow: 0 0 20px 2px rgba(59, 130, 246, 0.3); }
        .shadow-green-500\\/30 { box-shadow: 0 0 20px 2px rgba(34, 197, 94, 0.3); }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } } .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        
        @keyframes flip-letter { 0% { transform: rotateX(-90deg); opacity: 0; } 100% { transform: rotateX(0); opacity: 1; } }
        /* İŞTE DÜZELEN KISIM: forwards yerine both yazıldı */
        .animate-flip-letter { animation: flip-letter 0.5s ease-out both; backface-visibility: hidden; }
        
        @keyframes flip-correct { 
           0% { transform: rotateX(0deg); background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: white;} 
           50% { transform: rotateX(-90deg); background-color: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: white; } 
           50.1% { transform: rotateX(-90deg); background-color: #16a34a; border-color: #166534; color: white; }
           100% { transform: rotateX(0deg); background-color: #16a34a; border-color: #166534; color: white; } 
        }
        .animate-flip-correct { animation: flip-correct 0.6s ease-in-out forwards; backface-visibility: hidden; }
        
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thumb-white\\/10::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

// --- DİĞER MODALLAR ---
