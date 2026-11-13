// Skor paylaşımı: Android'de sistemin paylaşım menüsü (görsel + metin), web'de Web Share / yedekler.
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { isNative } from './native';
import { PLAY_STORE_LIVE, PLAY_STORE_URL, WEB_URL } from '../data/constants';

/** Paylaşım metninin sonuna eklenecek linkler. Play linki, uygulama herkese açılınca eklenir. */
export const shareLinks = () => (PLAY_STORE_LIVE ? `🌐 ${WEB_URL}\n📱 Android: ${PLAY_STORE_URL}` : WEB_URL);

const canvasToBase64 = (canvas) => canvas.toDataURL('image/png').split(',')[1];

/**
 * Görseli ve metni paylaşır. Başarılı olursa true döner.
 * fallbackUrl: web'de dosya paylaşımı desteklenmezse açılacak adres (ör. wa.me).
 */
export const shareImage = async ({ canvas, text, fileName = 'evolvo-skor.png', fallbackUrl }) => {
  if (isNative()) {
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: canvasToBase64(canvas),
      directory: Directory.Cache,
    });
    await Share.share({ text, files: [uri], dialogTitle: 'Skorunu paylaş' });
    return true;
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text });
    return true;
  }
  if (fallbackUrl) {
    window.open(fallbackUrl, '_blank');
    return true;
  }
  return false;
};

/** Sadece metin paylaşımı (link, Twitter yedeği vb.). */
export const shareText = async (text) => {
  if (isNative()) {
    await Share.share({ text, dialogTitle: 'Paylaş' });
    return true;
  }
  if (navigator.share) {
    await navigator.share({ text });
    return true;
  }
  return false;
};

/** Görseli kaydet: Android'de paylaşım menüsü üzerinden ("Galeriye kaydet"/"Dosyalara kaydet"), web'de indirme. */
export const saveImage = async (canvas, fileName) => {
  if (isNative()) return shareImage({ canvas, text: '', fileName });
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL();
  link.click();
  return true;
};
