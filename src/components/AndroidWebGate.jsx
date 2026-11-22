import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import '../firebase';
import { trackEvent } from '../lib/analytics';
import { PLAY_STORE_URL, PLAY_TEST_OPTIN_URL } from '../data/constants';

/**
 * Android tarayıcıdan gelen ziyaretçiyi web oyunu yerine Play'deki uygulamaya
 * yönlendirir. Kapalı test döneminde Play, etkileşimi yalnızca uygulamadan
 * ölçtüğü için Android oyuncularının web'de kalmaması gerekiyor.
 * iPhone ve masaüstü ziyaretçileri web'de oynamaya devam eder.
 */
export const shouldGateAndroidWeb = () => {
  if (import.meta.env.DEV || Capacitor.isNativePlatform()) return false;
  if (typeof navigator === 'undefined' || !/Android/i.test(navigator.userAgent || '')) return false;
  const path = window.location.pathname;
  if (path === '/privacy' || path.startsWith('/privacy')) return false;
  try {
    if (new URLSearchParams(window.location.search).has('web')) return false;
  } catch { /* yoksay */ }
  return true;
};

const readInviteCode = () => {
  try { return new URLSearchParams(window.location.search).get('arkadas'); } catch { return null; }
};

export function AndroidWebGate() {
  const [code] = useState(readInviteCode);
  const [copied, setCopied] = useState(false);

  useEffect(() => { trackEvent('android_web_gate_view', { has_invite: code ? 1 : 0 }); }, [code]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* yoksay */ }
  };

  return (
    <div className="min-h-screen bg-[#06071a] text-slate-200 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center">
        <img src="/favicon.webp" alt="" className="w-20 h-20 mx-auto rounded-2xl mb-5" />
        <h1 className="text-3xl font-black italic uppercase tracking-tight text-white">Evolvo</h1>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          Evolvo Android'de uygulama olarak oynanıyor. Şu an test sürecindeyiz, iki adımda katılabilirsin:
        </p>

        <div className="mt-7 space-y-3 text-left">
          <a
            href={PLAY_TEST_OPTIN_URL}
            onClick={() => trackEvent('android_web_gate_click', { target: 'optin' })}
            className="block rounded-2xl bg-white/5 border border-white/10 p-4 active:scale-[0.98] transition-all"
          >
            <span className="text-xs font-bold text-blue-300">1. ADIM</span>
            <span className="block mt-1 font-bold text-white">Teste katıl</span>
            <span className="block text-xs text-slate-400 mt-0.5">Açılan sayfada "Test kullanıcısı ol" düğmesine bas.</span>
          </a>
          <a
            href={PLAY_STORE_URL}
            onClick={() => trackEvent('android_web_gate_click', { target: 'store' })}
            className="block rounded-2xl bg-blue-600 p-4 active:scale-[0.98] transition-all"
          >
            <span className="text-xs font-bold text-blue-100">2. ADIM</span>
            <span className="block mt-1 font-bold text-white">Google Play'den indir</span>
            <span className="block text-xs text-blue-100/80 mt-0.5">Teste katıldıktan birkaç dakika sonra indirme açılır.</span>
          </a>
        </div>

        <p className="mt-4 text-xs text-slate-400 leading-relaxed">
          Teste katılamıyorsan Gmail adresini{' '}
          <a href="mailto:info@altaygaming.com?subject=Evolvo%20test" className="text-blue-300 underline">info@altaygaming.com</a>
          {' '}adresine gönder, seni ekleyelim.
        </p>

        {code && (
          <div className="mt-6 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4">
            <p className="text-sm text-amber-100">
              🎁 Uygulamada <strong>Arkadaşlar</strong> ekranına bu kodu yaz, ikiniz de +3 ipucu kazanın:
            </p>
            <button
              onClick={copyCode}
              className="mt-3 w-full rounded-xl bg-black/30 py-2.5 font-mono text-lg font-bold tracking-widest text-white"
            >
              {code}
            </button>
            <p className="mt-1.5 text-xs text-amber-100/70">{copied ? 'Kopyalandı ✓' : 'Kopyalamak için dokun'}</p>
          </div>
        )}

        <p className="mt-8 text-xs text-slate-500">
          <a href="/privacy.html" className="hover:underline">Gizlilik & KVKK</a>
        </p>
      </div>
    </div>
  );
}
