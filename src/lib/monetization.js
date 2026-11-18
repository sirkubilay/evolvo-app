// Reklamlar (AdMob) ve "Reklamları Kaldır" satın alması. Sadece Android'de çalışır.
import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { isNative } from './native';
import { ADMOB, INTERSTITIAL_EVERY, REMOVE_ADS_PRODUCT_ID, HINT_PACKS, STARTER_PACK } from '../data/constants';
import { addHints } from './hints';

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
 * Ödüllü reklam (oyuncunun kendi isteğiyle izlediği +1 ipucu): izlenirse true döner.
 * "Reklamları Kaldır" sadece sınırsız moddaki zorunlu geçiş reklamlarını kaldırır, bunu değil.
 */
export const watchRewardedAd = async () => {
  if (!isNative()) return false;
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

// Başlangıç paketi de reklamları kaldırır.
const AD_FREE_PRODUCTS = new Set([REMOVE_ADS_PRODUCT_ID, STARTER_PACK.id]);
const owned = (p) => p.purchaseState === undefined || p.purchaseState === '1';
const ownsRemoveAds = (purchases) => purchases.some((p) => AD_FREE_PRODUCTS.has(p.productIdentifier) && owned(p));

const STARTER_OWNED_KEY = 'evolvo_starter_owned';
/** Bu Google hesabı başlangıç paketini aldı mı (son bilinen durum). */
export const starterOwned = () => pref.get(STARTER_OWNED_KEY) === '1';

/** Play'den mevcut satın almaları okur (yeni cihaz, iade vb. durumlar için). */
export const refreshPurchaseState = async () => {
  if (!isNative()) return adsRemoved();
  try {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    setAdsRemoved(ownsRemoveAds(purchases));
    pref.set(STARTER_OWNED_KEY, purchases.some((p) => p.productIdentifier === STARTER_PACK.id && owned(p)) ? '1' : '0');
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

// ---------- Mağaza: ipucu paketleri (tüketilebilir) ----------

/** { [ürünKimliği]: '₺29,90' } — Play'den güncel yerel fiyatlar. */
export const getStorePrices = async () => {
  if (!isNative()) return {};
  const ids = [REMOVE_ADS_PRODUCT_ID, STARTER_PACK.id, ...HINT_PACKS.map((p) => p.id)];
  try {
    const { products } = await NativePurchases.getProducts({ productIdentifiers: ids, productType: PURCHASE_TYPE.INAPP });
    return Object.fromEntries((products || []).map((p) => [p.identifier || p.productIdentifier, p.priceString]));
  } catch {
    return {};
  }
};

// Tüketilebilir ipucu paketleri şu sırayla teslim edilir:
//   1) Google Play satın almayı tamamlar (henüz onaylanmaz/tüketilmez)
//   2) Sunucu (verifyHintPurchase) jetonu Google'a sorar: gerçekten ödendi mi, daha önce kullanıldı mı
//   3) İpuçları cüzdana eklenir, ardından satın alma tüketilir (tekrar alınabilir olur)
// Uygulama arada kapanırsa ya da ödeme sonradan onaylanırsa (havale, operatör faturası),
// tüketilmemiş satın almalar her açılışta ve uygulamaya her dönüşte tekrar işlenir; ödeme kaybolmaz.
// Google, 3 gün içinde onaylanmayan satın almayı iade eder; bu yüzden tekrar deneme sürekli yapılır.

// Başlangıç paketi de aynı sunucu doğrulamasından geçer, ama tüketilmez: onaylanır (acknowledge) ve sonsuza dek sahiplenilir.
const HINT_PACK_BY_ID = Object.fromEntries([...HINT_PACKS, STARTER_PACK].map((p) => [p.id, p]));
const isOneTime = (id) => id === STARTER_PACK.id;
const inFlight = new Set();

/** 'ok' | 'pending' | 'retry' | 'invalid' */
const deliverHintPurchase = async (tx) => {
  const pack = HINT_PACK_BY_ID[tx.productIdentifier];
  const token = tx.purchaseToken || tx.transactionId;
  if (!pack || !token) return 'invalid';
  if (tx.purchaseState === '0') return 'pending';
  if (inFlight.has(token)) return 'retry';
  inFlight.add(token);
  try {
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const { getApp } = await import('firebase/app');
    const verify = httpsCallable(getFunctions(getApp(), 'europe-west1'), 'verifyHintPurchase');
    let res;
    try {
      res = (await verify({ productId: pack.id, purchaseToken: token })).data;
    } catch (e) {
      const code = String(e?.code || '');
      // Sahte/kullanılmış jeton: ipucu verme, ama kuyrukta takılı kalmasın diye tüket
      if (code.includes('not-found') || code.includes('failed-precondition')) {
        if (!isOneTime(pack.id)) NativePurchases.consumePurchase({ purchaseToken: token }).catch(() => {});
        return 'invalid';
      }
      return 'retry'; // ağ/sunucu sorunu → tüketme, sonra tekrar dene
    }
    if (res?.pending) return 'pending';
    if (!res?.ok) return 'retry';
    if (isOneTime(pack.id)) {
      // Sunucu jeton başına ipuçlarını bir kez verir (tekrar denemede count 0 gelir).
      if (res.count > 0) addHints(res.count);
      if (!tx.isAcknowledged) await NativePurchases.acknowledgePurchase({ purchaseToken: token }).catch(() => {});
      setAdsRemoved(true);
      pref.set(STARTER_OWNED_KEY, '1');
      return 'ok';
    }
    addHints(res.count || pack.count);
    await NativePurchases.consumePurchase({ purchaseToken: token }).catch(() => {});
    return 'ok';
  } finally {
    inFlight.delete(token);
  }
};

/**
 * Bekleyen/yarım kalmış ipucu satın almalarını teslim eder. Teslim edilen toplam ipucu sayısını döner.
 * Açılışta ve uygulamaya geri dönüldüğünde çağrılır.
 */
export const recoverHintPurchases = async () => {
  if (!isNative()) return 0;
  let delivered = 0;
  try {
    const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
    for (const tx of purchases || []) {
      if (!HINT_PACK_BY_ID[tx.productIdentifier]) continue;
      // Tek seferlik ürün onaylandıysa teslim edilmiştir; sadece onaylanmamışları işle.
      if (isOneTime(tx.productIdentifier) && tx.isAcknowledged) continue;
      if ((await deliverHintPurchase(tx)) === 'ok') delivered += HINT_PACK_BY_ID[tx.productIdentifier].count;
    }
  } catch { /* çevrimdışı: sonra tekrar */ }
  return delivered;
};

/** İpucu paketi satın alır; doğrulanınca ipuçlarını cüzdana ekler. 'ok' | 'pending' | 'cancelled' | 'error' */
export const purchaseHintPack = async (pack) => {
  let tx;
  try {
    tx = await NativePurchases.purchaseProduct({
      productIdentifier: pack.id,
      productType: PURCHASE_TYPE.INAPP,
      isConsumable: false,          // tüketmeyi sunucu doğrulamasından sonra kendimiz yapıyoruz
      autoAcknowledgePurchases: false,
    });
  } catch (e) {
    const msg = String(e?.message || e).toLowerCase();
    return msg.includes('cancel') ? 'cancelled' : 'error';
  }
  const r = await deliverHintPurchase({ ...tx, productIdentifier: tx.productIdentifier || pack.id });
  if (r === 'ok') return 'ok';
  if (r === 'invalid') return 'error';
  return 'pending'; // ödeme onayı ya da doğrulama bekleniyor → açılışta otomatik teslim edilir
};

/** Başlangıç paketini satın alır: 25 ipucu + reklamsız. 'ok' | 'pending' | 'cancelled' | 'error' */
export const purchaseStarterPack = () => purchaseHintPack(STARTER_PACK);
