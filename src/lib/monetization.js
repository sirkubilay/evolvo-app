// Reklamlar (AdMob) ve "Reklamları Kaldır" satın alması. Sadece Android'de çalışır.
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { isNative } from './native';
import { ADMOB, INTERSTITIAL_EVERY, REMOVE_ADS_PRODUCT_ID } from '../data/constants';

const ADS_REMOVED_KEY = 'evolvo_ads_removed';
const LEVEL_COUNT_KEY = 'evolvo_levels_since_ad';

const pref = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* yok say */ } },
};

let initPromise = null;
let canRequestAds = false;
let privacyOptionsRequired = false;
let interstitialReady = false;

export const adsRemoved = () => pref.get(ADS_REMOVED_KEY) === '1';
const setAdsRemoved = (on) => pref.set(ADS_REMOVED_KEY, on ? '1' : '0');

const opts = (adId) => ({ adId, isTesting: ADMOB.USE_TEST_ADS });

const preloadInterstitial = async () => {
  if (!canRequestAds || adsRemoved() || interstitialReady) return;
  try {
    await AdMob.prepareInterstitial(opts(ADMOB.INTERSTITIAL_ID));
    interstitialReady = true;
  } catch { interstitialReady = false; }
};

/**
 * Uygulama açılışında bir kez: satın alma durumunu doğrular, AB/İngiltere kullanıcılarından
 * gerekiyorsa reklam onayı (UMP) ister ve reklamları başlatır.
 */
export const initMonetization = () => {
  if (!isNative()) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await refreshPurchaseState();
    try {
      await AdMob.initialize({ initializeForTesting: ADMOB.USE_TEST_ADS });
      let info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
        info = await AdMob.showConsentForm();
      }
      canRequestAds = info.canRequestAds;
      privacyOptionsRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
      preloadInterstitial();
    } catch (e) {
      console.warn('AdMob başlatılamadı:', e);
    }
  })();
  return initPromise;
};

/** Menüde "Reklam gizlilik tercihleri" gösterilmeli mi (AB kullanıcıları için zorunlu). */
export const needsPrivacyOptions = () => privacyOptionsRequired;
export const showPrivacyOptions = () => AdMob.showPrivacyOptionsForm().catch(() => {});

/**
 * Ödüllü reklam: izlenirse true döner. "Reklamları Kaldır" alan oyuncu reklam izlemeden ödülü alır.
 */
export const watchRewardedAd = async () => {
  if (!isNative()) return false;
  if (adsRemoved()) return true;
  await initMonetization();
  if (!canRequestAds) return false;
  try {
    await AdMob.prepareRewardVideoAd(opts(ADMOB.REWARDED_ID));
    const reward = await AdMob.showRewardVideoAd();
    return !!reward;
  } catch (e) {
    console.warn('Ödüllü reklam gösterilemedi:', e);
    return false;
  }
};

/** Sınırsız modda her INTERSTITIAL_EVERY bölümde bir geçiş reklamı (yüklenmişse). */
export const maybeShowInterstitial = async () => {
  if (!isNative() || adsRemoved()) return;
  const count = Number(pref.get(LEVEL_COUNT_KEY) || 0) + 1;
  if (count < INTERSTITIAL_EVERY || !interstitialReady) {
    pref.set(LEVEL_COUNT_KEY, String(count));
    return;
  }
  pref.set(LEVEL_COUNT_KEY, '0');
  interstitialReady = false;
  try {
    await AdMob.showInterstitial();
  } catch { /* reklam yoksa oyun devam etsin */ }
  preloadInterstitial();
};

// ---------- Reklamları Kaldır ----------

const ownsRemoveAds = (purchases) =>
  purchases.some((p) => p.productIdentifier === REMOVE_ADS_PRODUCT_ID && (p.purchaseState === undefined || p.purchaseState === '1'));

/** Play'den mevcut satın almaları okur (yeni cihaz, iade vb. durumlar için). */
export const refreshPurchaseState = async () => {
  if (!isNative()) return adsRemoved();
  try {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    setAdsRemoved(ownsRemoveAds(purchases));
  } catch { /* çevrimdışı: son bilinen durumu koru */ }
  return adsRemoved();
};

export const getRemoveAdsPrice = async () => {
  if (!isNative()) return null;
  try {
    const { product } = await NativePurchases.getProduct({ productIdentifier: REMOVE_ADS_PRODUCT_ID, productType: PURCHASE_TYPE.INAPP });
    return product?.priceString || null;
  } catch {
    return null;
  }
};

/** 'ok' | 'pending' | 'cancelled' | 'error' */
export const purchaseRemoveAds = async () => {
  try {
    const tx = await NativePurchases.purchaseProduct({
      productIdentifier: REMOVE_ADS_PRODUCT_ID,
      productType: PURCHASE_TYPE.INAPP,
      autoAcknowledgePurchases: true,
    });
    if (tx.purchaseState === '0') return 'pending';
    setAdsRemoved(true);
    return 'ok';
  } catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    return msg.includes('cancel') ? 'cancelled' : 'error';
  }
};

export const restoreRemoveAds = async () => {
  try { await NativePurchases.restorePurchases(); } catch { /* yok say */ }
  return refreshPurchaseState();
};
