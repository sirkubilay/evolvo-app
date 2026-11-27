// Günlük bulmacanın iki zorluğu. Sunucudaki functions/puzzleIds.js ile aynı kimlik düzeni:
// zor = 'YYYY-MM-DD' (eski kimlik), kolay = 'YYYY-MM-DD-kolay'.

import { flattenTr } from './tdk';

export const DIFFICULTIES = {
  kolay: { label: 'Kolay', hint: '4 adım ve altı' },
  zor: { label: 'Zor', hint: '5 adım ve üstü' },
};
// Güncel düzen: her gün TEK bulmaca (en kısa çözüm 3–5 adım), kimliği 'YYYY-MM-DD' (= 'zor' anahtarı).
// 'kolay' (YYYY-MM-DD-kolay) yalnızca 27–28 Kasım 2026'daki eski bulmacalar için tanınıyor.
export const DIFFICULTY_ORDER = ['zor'];
/** Kolay sayılan en uzun optimal çözüm (adım). */
export const KOLAY_MAX_STEPS = 4;

export const dailyPuzzleId = (date, difficulty) => (difficulty === 'kolay' ? `${date}-kolay` : date);

/** Bulmacanın gerçek zorluğu en kısa çözümün uzunluğundan çıkar (eski tek-bulmacalı günler için de doğru). */
export const difficultyOfSteps = (optimalSteps) => (optimalSteps && optimalSteps <= KOLAY_MAX_STEPS ? 'kolay' : 'zor');

/** apiDailyPuzzle cevabını oyunun bulmaca nesnesine çevirir. */
export const toDailyPuzzle = (data, date, difficulty) => ({
  type: 'daily',
  date,
  difficulty,
  puzzleId: dailyPuzzleId(date, difficulty),
  // Eski bulmacalarda şapkalı kelime olabilir; oyuncu Â/Î/Û yazamadığı için düz hali kullanılır
  start: flattenTr(data.baslangic.toLocaleUpperCase('tr-TR')),
  target: flattenTr(data.bitis.toLocaleUpperCase('tr-TR')),
  solution: null,
  optimalSteps: data.optimal_adim || 5,
});

/** Günlük bulmacanın kayıt/sıralama kimliği (puzzleId yoksa eski düzen: tarih). */
export const puzzleIdOf = (puzzleData) => puzzleData?.puzzleId || puzzleData?.date;
