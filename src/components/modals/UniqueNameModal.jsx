import { useState } from 'react';
import { getFirestore, doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { Loader2 } from 'lucide-react';

export const UniqueNameModal = ({ isOpen, tempUser, onComplete, theme, colors }) => {
  const [chosenName, setChosenName] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSaveName = async (e) => {
    e.preventDefault();
    setError(null);
    const nameToSave = chosenName.trim();

    if (nameToSave.length < 3 || nameToSave.length > 12) {
      setError("İsminiz 3 ile 12 karakter arasında olmalı!");
      return;
    }

    setIsChecking(true);
    try {
      const db = getFirestore(getApp());
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', nameToSave));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Bu efsanevi isim zaten alınmış. Başka bir tane dene!");
        setIsChecking(false);
        return;
      }

      await setDoc(doc(db, 'users', tempUser.uid), {
        username: nameToSave,
        createdAt: new Date().toISOString()
      }, { merge: true }); // merge: ilerleme ve arkadaş verisini silmesin

      setIsChecking(false);
      onComplete(nameToSave);

    } catch (err) {
      console.error("İsim kontrol hatası:", err);
      setError("Sunucuya bağlanılamadı, lütfen tekrar dene.");
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <div className={`${theme.panel} w-full max-w-md rounded-[2rem] p-8 border ${theme.panelBorder} shadow-2xl animate-in zoom-in`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-green-500/20">
            <span className="text-3xl">👑</span>
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Efsaneler Arasına Katıl</h2>
          <p className="opacity-60 text-sm mt-2 font-medium">Bu senin kalıcı ve eşsiz ismin olacak. Liderlik tablosunda herkes bu ismi görecek!</p>
        </div>

        <form onSubmit={handleSaveName} className="space-y-4">
          <input 
            autoFocus
            type="text" 
            value={chosenName}
            onChange={(e) => setChosenName(e.target.value)}
            placeholder="Örn: KralSulo" 
            className={`w-full bg-black/20 border ${theme.panelBorder} text-white rounded-2xl py-4 px-4 text-center font-black text-xl outline-none focus:border-green-500 transition-all shadow-inner`}
          />
          
          {error && (
            <div className="bg-red-900/30 text-red-400 p-3 rounded-xl text-sm font-bold border border-red-900/50 text-center animate-pulse shadow-inner">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isChecking}
            className={`w-full ${colors.btnPrimary} py-4 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center shadow-xl`}
          >
            {isChecking ? <Loader2 className="animate-spin" /> : "BU İSMİ BANA REZERVE ET!"}
          </button>
        </form>
      </div>
    </div>
  );
};

