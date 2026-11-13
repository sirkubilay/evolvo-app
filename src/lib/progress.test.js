import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATS, applyGameEnd, applyEvent, checkAchievements, effectiveStreak, mergeStats, dayKey,
} from './progress';

const fresh = () => ({ ...DEFAULT_STATS, achievements: {} });
const day = (y, m, d, h = 15) => new Date(y, m - 1, d, h);
const daily = (win, extra = {}) => ({ win, hints: 0, score: 700, time: 120, moves: 5, maxMoves: 10, invalidAttempts: 1, isTodaysDaily: true, ...extra });

describe('günlük seri', () => {
  it('ardışık günlerde artar, aynı gün tekrar kazanınca artmaz', () => {
    let s = applyGameEnd(fresh(), daily(true), day(2026, 11, 10));
    s = applyGameEnd(s, daily(true), day(2026, 11, 10));
    expect(s.currentStreak).toBe(1);
    s = applyGameEnd(s, daily(true), day(2026, 11, 11));
    expect(s.currentStreak).toBe(2);
    expect(s.maxStreak).toBe(2);
  });

  it('bir gün atlanınca 1\'den başlar ve ekranda 0 görünür', () => {
    let s = applyGameEnd(fresh(), daily(true), day(2026, 11, 10));
    s = applyGameEnd(s, daily(true), day(2026, 11, 11));
    expect(effectiveStreak(s, '2026-11-12')).toBe(2); // dün kazandı, bugün hâlâ şansı var
    expect(effectiveStreak(s, '2026-11-13')).toBe(0); // bir gün kaçırdı
    s = applyGameEnd(s, daily(true), day(2026, 11, 13));
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(2);
  });

  it('günlük bulmacayı kaybedince sıfırlanır; sınırsız mod/geçmiş bulmaca seriyi etkilemez', () => {
    let s = applyGameEnd(fresh(), daily(true), day(2026, 11, 10));
    s = applyGameEnd(s, daily(false, { isTodaysDaily: false }), day(2026, 11, 11));
    expect(s.currentStreak).toBe(1);
    s = applyGameEnd(s, daily(false), day(2026, 11, 11));
    expect(s.currentStreak).toBe(0);
  });

  it('ay ve yıl geçişlerinde "dün" doğru hesaplanır', () => {
    let s = applyGameEnd(fresh(), daily(true), day(2026, 12, 31));
    s = applyGameEnd(s, daily(true), day(2027, 1, 1));
    expect(s.currentStreak).toBe(2);
  });
});

describe('başarımlar', () => {

  it('ilk galibiyet, ipuçsuz ve hatasız galibiyetleri açar', () => {
    const game = daily(true, { invalidAttempts: 0 });
    const s = applyGameEnd(fresh(), game, day(2026, 11, 10));
    const { unlocked } = checkAchievements(s, { game }, day(2026, 11, 10));
    const ids = unlocked.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining([1, 7, 9]));
    expect(ids).not.toContain(6); // 120 sn > 60 sn
  });

  it('bir başarım iki kez açılmaz', () => {
    const game = daily(true);
    let { stats } = checkAchievements(applyGameEnd(fresh(), game, day(2026, 11, 10)), { game }, day(2026, 11, 10));
    const second = checkAchievements(applyGameEnd(stats, game, day(2026, 11, 11)), { game }, day(2026, 11, 11));
    expect(second.unlocked.map((a) => a.id)).not.toContain(1);
  });

  it('saat tabanlı başarımlar oyun bitince kontrol edilir', () => {
    const game = daily(true);
    const s = applyGameEnd(fresh(), game, day(2026, 11, 10, 7));
    expect(checkAchievements(s, { game }, day(2026, 11, 10, 7)).unlocked.map((a) => a.id)).toContain(10);
    // Oyun olmadan (ör. sözlük bakma) saat başarımı açılmaz
    expect(checkAchievements(fresh(), {}, day(2026, 11, 10, 7)).unlocked.map((a) => a.id)).not.toContain(10);
  });

  it('hafta sonu: cumartesi + ertesi gün pazar', () => {
    const game = daily(true);
    let s = applyGameEnd(fresh(), game, day(2026, 11, 14)); // Cumartesi
    s = applyGameEnd(s, game, day(2026, 11, 15)); // Pazar
    expect(checkAchievements(s, { game }, day(2026, 11, 15)).unlocked.map((a) => a.id)).toContain(22);
  });

  it('sayaç olayları: 5 paylaşım ve koyu mod', () => {
    let s = fresh();
    for (let i = 0; i < 5; i++) s = applyEvent(s, 'share');
    const ids = checkAchievements(s, { darkMode: true }).unlocked.map((a) => a.id);
    expect(ids).toEqual(expect.arrayContaining([4, 18]));
  });

  it('7 günlük günlük seri "Seri Katil" açar', () => {
    let s = fresh();
    for (let d = 1; d <= 7; d++) s = applyGameEnd(s, daily(true), day(2026, 11, d));
    expect(checkAchievements(s, {}).unlocked.map((a) => a.id)).toContain(24);
  });
});

describe('bulut birleştirme', () => {
  it('sayaçlarda büyüğü, başarımlarda birleşimi, seride en yeniyi alır', () => {
    const local = { ...fresh(), played: 10, wins: 8, currentStreak: 2, lastDailyWinDate: '2026-11-12', achievements: { 1: 'a' } };
    const cloud = { ...fresh(), played: 30, wins: 5, currentStreak: 9, lastDailyWinDate: '2026-11-01', achievements: { 2: 'b' } };
    const m = mergeStats(local, cloud);
    expect(m.played).toBe(30);
    expect(m.wins).toBe(8);
    expect(m.currentStreak).toBe(2);
    expect(Object.keys(m.achievements).sort()).toEqual(['1', '2']);
  });

  it('bulutta kayıt yoksa yereli aynen döner', () => {
    const local = { ...fresh(), played: 3 };
    expect(mergeStats(local, null)).toBe(local);
  });
});

it('dayKey yerel tarih formatı', () => {
  expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
});
