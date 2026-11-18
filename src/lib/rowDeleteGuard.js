/**
 * Boş satırda "Sil"e basınca önceki satırın hemen silinmesini engeller.
 *
 * Oyuncu yazdığı harfleri silerken tuşa üst üste ya da basılı tutarak
 * basarsa, harfler bittiğinde fazladan gelen basışlar önceki satırı da
 * siliyordu. Artık önceki satırı silmek için satır boşken ayrı, bilinçli
 * ikinci bir basış gerekir:
 *   - Boş satırdaki ilk basış sadece "kurar" (oyuncuya uyarı gösterilir).
 *   - Kurulduktan sonra en az GAP_MS bekleyip MAX_MS içinde gelen basış siler.
 *   - Arka arkaya hızlı gelen (GAP_MS'den kısa) basışlar silmez, sadece kurar.
 */
const GAP_MS = 350;
const MAX_MS = 4000;

export const createRowDeleteGuard = () => {
  let armedAt = 0;
  let lastPress = 0;

  return {
    /** Satır boşken her "Sil" basışında çağrılır; true dönerse önceki satır silinebilir. */
    confirm(now = Date.now()) {
      const gap = now - lastPress;
      lastPress = now;
      if (armedAt && gap >= GAP_MS && now - armedAt <= MAX_MS) {
        armedAt = 0;
        return true;
      }
      armedAt = now;
      return false;
    },
    /** Harf silme/yazma gibi başka bir basışta çağrılır. */
    touch(now = Date.now()) {
      lastPress = now;
      armedAt = 0;
    },
  };
};
