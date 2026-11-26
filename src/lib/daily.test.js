import { describe, it, expect } from 'vitest';
import { dailyPuzzleId, difficultyOfSteps, toDailyPuzzle, puzzleIdOf } from './daily';
import { progressId } from './gameProgress';

describe('günlük bulmaca zorlukları', () => {
  it('zor eski kimliği korur, kolay ayrı kimlik alır', () => {
    expect(dailyPuzzleId('2026-11-25', 'zor')).toBe('2026-11-25');
    expect(dailyPuzzleId('2026-11-25', 'kolay')).toBe('2026-11-25-kolay');
  });

  it('4 adım ve altı kolay, 5 ve üstü zor', () => {
    expect(difficultyOfSteps(3)).toBe('kolay');
    expect(difficultyOfSteps(4)).toBe('kolay');
    expect(difficultyOfSteps(5)).toBe('zor');
    expect(difficultyOfSteps(6)).toBe('zor');
  });

  it('kolay ve zor bulmacanın kayıt anahtarları çakışmaz', () => {
    const data = { baslangic: 'kale', bitis: 'masa', optimal_adim: 3 };
    const kolay = toDailyPuzzle(data, '2026-11-25', 'kolay');
    const zor = toDailyPuzzle({ ...data, optimal_adim: 5 }, '2026-11-25', 'zor');
    expect(kolay.start).toBe('KALE');
    expect(progressId(kolay)).toBe('2026-11-25-kolay');
    expect(progressId(zor)).toBe('2026-11-25');
    expect(puzzleIdOf(kolay)).toBe('2026-11-25-kolay');
    // Eski kayıtlar (puzzleId alanı olmayan) tarihle eşleşmeye devam eder
    expect(puzzleIdOf({ type: 'daily', date: '2026-11-20' })).toBe('2026-11-20');
  });
});
