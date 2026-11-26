// Oyun sesleri (doğru / yanlış cevap, satır onayı) ve menüdeki "Ses" ayarı.
// Ayar cihazda kalıcı; varsayılan açık.

const KEY = 'evolvo_sound';

export const soundEnabled = () => {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
};

export const setSoundEnabled = (on) => {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* depolama kapalı */ }
};

const playFile = (src) => {
  if (!soundEnabled()) return;
  try { new Audio(src).play().catch(() => {}); } catch { /* ses desteklenmiyor */ }
};

export const playSuccessSound = () => playFile('/success.mp3');
export const playErrorSound = () => playFile('/error.mp3');

/** Kısa "pop" sesi (geçerli kelime girildiğinde). */
export const playPopSound = () => {
  if (!soundEnabled()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch { /* ses desteklenmiyor */ }
};
