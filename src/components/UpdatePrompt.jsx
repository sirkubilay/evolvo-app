import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AppUpdate, AppUpdateAvailability } from '@capawesome/capacitor-app-update';
import { Download } from 'lucide-react';

// Google Play'de daha yeni bir sürüm varsa açılışta "Yeni sürüm var" penceresi gösterir.
// Play'in kendi uygulama içi güncelleme bilgisini kullanır: güncelleme Play'de GERÇEKTEN
// yayındaysa çıkar (inceleme sürerken çıkmaz). Yalnızca Play'den yüklenmiş Android uygulamasında çalışır.
const SNOOZE_KEY = 'evolvo_update_snooze'; // "Sonra"ya basılan sürüm kodu: o sürüm için tekrar sorma

// Uygulama oturumu başına tek kontrol (sayfa değişince bileşen yeniden oluşsa da tekrar sorulmaz)
let check = null;
let dismissed = false;
const checkForUpdate = () => {
  if (!check) {
    check = Capacitor.getPlatform() !== 'android'
      ? Promise.resolve(null)
      : AppUpdate.getAppUpdateInfo()
        .then((info) => {
          if (info.updateAvailability !== AppUpdateAvailability.UPDATE_AVAILABLE) return null;
          const code = String(info.availableVersionCode || '');
          if (code && localStorage.getItem(SNOOZE_KEY) === code) return null;
          return { versionCode: code };
        })
        .catch(() => null); // Play dışından yüklenmiş ya da bilgi alınamadı: sessizce geç
  }
  return check;
};

export const UpdatePrompt = () => {
  const [available, setAvailable] = useState(null); // { versionCode }

  useEffect(() => {
    let cancelled = false;
    checkForUpdate().then((r) => { if (!cancelled && r && !dismissed) setAvailable(r); });
    return () => { cancelled = true; };
  }, []);

  if (!available) return null;

  const update = () => {
    AppUpdate.openAppStore().catch(() => {
      window.open('https://play.google.com/store/apps/details?id=com.altayinteractive.evolvo', '_blank');
    });
  };
  const later = () => {
    dismissed = true;
    try { if (available.versionCode) localStorage.setItem(SNOOZE_KEY, available.versionCode); } catch { /* yok say */ }
    setAvailable(null);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl p-6 bg-[#0b1630] border border-white/10 text-white text-center shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/20 border border-green-400/40 flex items-center justify-center mb-4">
          <Download className="text-green-300" size={28} />
        </div>
        <h2 className="text-xl font-black">Yeni sürüm hazır!</h2>
        <p className="text-sm opacity-70 mt-2">Evolvo'nun yeni sürümü Google Play'de. Yeni özellikler ve düzeltmeler için güncelle.</p>
        <button onClick={update} className="mt-5 w-full py-3.5 rounded-2xl font-black bg-green-500 hover:bg-green-400 text-black active:scale-[0.98] transition-all">
          GOOGLE PLAY'DE GÜNCELLE
        </button>
        <button onClick={later} className="mt-2 w-full py-2 text-sm font-bold opacity-60 hover:opacity-100">Sonra</button>
      </div>
    </div>
  );
};
