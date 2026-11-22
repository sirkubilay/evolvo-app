import { getAnalytics, isSupported, logEvent, setUserProperties, setUserId } from 'firebase/analytics';
import { Capacitor } from '@capacitor/core';

// Firebase Analytics (GA4). Web ve Android (Capacitor WebView) aynı akışa düşer;
// ayrımı `platform` kullanıcı özelliğiyle yapıyoruz: 'android' | 'web'.
let analyticsPromise = null;

export function initAnalytics(app) {
  if (analyticsPromise) return analyticsPromise;
  if (import.meta.env.DEV || !app?.options?.measurementId) {
    analyticsPromise = Promise.resolve(null);
    return analyticsPromise;
  }
  analyticsPromise = isSupported()
    .then((ok) => {
      if (!ok) return null;
      const analytics = getAnalytics(app);
      const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web';
      setUserProperties(analytics, { platform });
      logEvent(analytics, 'app_launch', { platform });
      return analytics;
    })
    .catch(() => null);
  return analyticsPromise;
}

export function trackEvent(name, params) {
  if (!analyticsPromise) return;
  analyticsPromise.then((a) => {
    if (a) {
      try { logEvent(a, name, params); } catch { /* yoksay */ }
    }
  });
}

export function setAnalyticsUser(uid) {
  if (!analyticsPromise) return;
  analyticsPromise.then((a) => {
    if (a) {
      try { setUserId(a, uid || null); } catch { /* yoksay */ }
    }
  });
}
