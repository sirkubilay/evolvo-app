// Android'e özgü özellikler (titreşim, yerel bildirim, mağaza değerlendirmesi).
// Web'de hepsi sessizce hiçbir şey yapmaz, böylece çağıran kod platform kontrolü yapmak zorunda kalmaz.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { InAppReview } from '@capacitor-community/in-app-review';
import { dayKey, effectiveStreak, playedDailyToday } from './progress';

export const isNative = () => Capacitor.isNativePlatform();

const pref = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* yok say */ } },
};

// ---------- Titreşim ----------
const safe = (fn) => { if (isNative()) fn().catch(() => {}); };
export const hapticTap = () => safe(() => Haptics.impact({ style: ImpactStyle.Light }));
export const hapticMove = () => safe(() => Haptics.impact({ style: ImpactStyle.Medium }));
export const hapticError = () => safe(() => Haptics.notification({ type: NotificationType.Error }));
export const hapticSuccess = () => safe(() => Haptics.notification({ type: NotificationType.Success }));

// ---------- Yerel bildirimler ----------
export const NOTIF_PREF = 'evolvo_notifications'; // 'on' | 'off' | null (henüz sorulmadı)
const MORNING_HOUR = 9;
const EVENING_HOUR = 20;
const DAYS_AHEAD = 7;

export const NOTIFICATION_TEXTS = {
  morning: {
    title: 'Bugünün bulmacası hazır 🧩',
    body: 'Yeni kelime zinciri seni bekliyor. Kaç hamlede çözeceksin?',
  },
  evening: (streak) => ({
    title: `🔥 ${streak} günlük serini kaybetme!`,
    body: 'Bugünün bulmacasını henüz çözmedin. Gece yarısına kadar vaktin var.',
  }),
};

export const notificationsEnabled = () => pref.get(NOTIF_PREF) === 'on';

const at = (base, addDays, hour) => {
  const d = new Date(base);
  d.setDate(d.getDate() + addDays);
  d.setHours(hour, 0, 0, 0);
  return d;
};

/**
 * Önümüzdeki günlerin bildirimlerini oyuncunun durumuna göre yeniden kurar.
 * Uygulama her açıldığında ve her günlük oyundan sonra çağrılır; eskileri silip yenilerini yazar.
 */
export const scheduleReminders = async (stats) => {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
    if (!notificationsEnabled()) return;

    const now = new Date();
    const playedToday = playedDailyToday(stats, dayKey(now));
    const streak = effectiveStreak(stats, dayKey(now));
    const list = [];

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const when = at(now, i, MORNING_HOUR);
      if (when <= now || (i === 0 && playedToday)) continue;
      list.push({ id: 100 + i, ...NOTIFICATION_TEXTS.morning, schedule: { at: when, allowWhileIdle: true } });
    }
    // Bu akşam: seri var ama bugün oynanmadıysa
    const tonight = at(now, 0, EVENING_HOUR);
    if (streak > 0 && !playedToday && tonight > now) {
      list.push({ id: 200, ...NOTIFICATION_TEXTS.evening(streak), schedule: { at: tonight, allowWhileIdle: true } });
    }
    // Yarın akşam: bugün oynadıysa seri yarın da geçerli olacak
    if (playedToday && streak > 0) {
      list.push({ id: 201, ...NOTIFICATION_TEXTS.evening(streak), schedule: { at: at(now, 1, EVENING_HOUR), allowWhileIdle: true } });
    }

    // isExactNotification:false → Android'in "Alarmlar ve hatırlatıcılar" iznini istemez, o ayar ekranını açmaz.
    // Hatırlatmanın birkaç dakika kayması sorun değil.
    list.forEach((n) => { n.smallIcon = 'ic_stat_evolvo'; n.iconColor = '#16a34a'; n.isExactNotification = false; });
    if (list.length) await LocalNotifications.schedule({ notifications: list });
  } catch (e) {
    console.warn('Bildirimler kurulamadı:', e);
  }
};

/** Sistem izin penceresini açar; sonucu kaydeder. true = izin verildi. */
export const enableNotifications = async (stats) => {
  if (!isNative()) return false;
  try {
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
    const ok = perm.display === 'granted';
    pref.set(NOTIF_PREF, ok ? 'on' : 'off');
    await scheduleReminders(stats);
    return ok;
  } catch {
    return false;
  }
};

export const disableNotifications = async (stats) => {
  pref.set(NOTIF_PREF, 'off');
  await scheduleReminders(stats);
};

/** İlk galibiyetten sonra bir kez izin istemek için. */
export const shouldAskNotifications = () => isNative() && pref.get(NOTIF_PREF) === null;

// ---------- Play Store değerlendirmesi ----------
const REVIEW_KEY = 'evolvo_review_asked';
const REVIEW_MIN_WINS = 3;
const REVIEW_COOLDOWN_DAYS = 60;

/**
 * Birkaç galibiyetten sonra Play'in kendi "puan ver" penceresini açar.
 * Google pencerenin gerçekten gösterilip gösterilmeyeceğine kendisi karar verir (kota var).
 */
export const maybeAskForReview = (stats) => {
  if (!isNative() || (stats.wins || 0) < REVIEW_MIN_WINS) return;
  const last = Number(pref.get(REVIEW_KEY) || 0);
  if (Date.now() - last < REVIEW_COOLDOWN_DAYS * 864e5) return;
  pref.set(REVIEW_KEY, String(Date.now()));
  // Kazanma ekranı animasyonu bitsin diye biraz bekle
  setTimeout(() => InAppReview.requestReview().catch(() => {}), 2500);
};
