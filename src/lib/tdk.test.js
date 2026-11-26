import { describe, it, expect } from 'vitest';
import { flattenTr, isTdkEntryFor } from './tdk';
import { toDailyPuzzle } from './daily';

describe('şapkalı harfler', () => {
  it('düzleştirilir, büyük/küçük harf korunur', () => {
    expect(flattenTr('KÂĞIT')).toBe('KAĞIT');
    expect(flattenTr('ADEDÎ')).toBe('ADEDİ');
    expect(flattenTr('mahkûm')).toBe('mahkum');
    expect(flattenTr('KALEM')).toBe('KALEM');
  });

  it('TDK "kâğıt" maddesi, oyuncunun yazdığı "kağıt" için kabul edilir', () => {
    // sozluk.gov.tr/gts?ara=kağıt gerçek cevabının ilgili alanları
    const data = [{ madde: 'kâğıt', madde_duz: 'kâgit', ozel_mi: '0' }];
    expect(isTdkEntryFor(data, 'kağıt')).toBe(true);
    expect(isTdkEntryFor(data, 'kağır')).toBe(false);
  });

  it('özel isim maddeleri kabul edilmez', () => {
    expect(isTdkEntryFor([{ madde: 'Ankara', ozel_mi: '1' }], 'ankara')).toBe(false);
  });

  it('eski bulmacadaki şapkalı başlangıç/bitiş düz gösterilir', () => {
    const p = toDailyPuzzle({ baslangic: 'kâğıt', bitis: 'bekâr', optimal_adim: 5 }, '2026-01-01', 'zor');
    expect(p.start).toBe('KAĞIT');
    expect(p.target).toBe('BEKAR');
  });
});
