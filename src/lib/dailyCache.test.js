import { describe, it, expect, beforeEach } from 'vitest';
import { getCachedPuzzle, cachePuzzle } from './dailyCache';

const mem = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};
const p = (date, difficulty) => ({ type: 'daily', date, difficulty, puzzleId: difficulty === 'kolay' ? `${date}-kolay` : date, start: 'KALE', target: 'MASA' });

describe('günlük bulmaca önbelleği', () => {
  let s;
  beforeEach(() => { s = mem(); });

  it('kaydedilen bulmaca kimliğiyle geri okunur', () => {
    cachePuzzle(p('2026-11-27', 'kolay'), ['2026-11-26', '2026-11-27'], s);
    expect(getCachedPuzzle('2026-11-27-kolay', s).start).toBe('KALE');
    expect(getCachedPuzzle('2026-11-27', s)).toBeNull();
  });

  it('bugün/yarın dışındaki eski günler temizlenir', () => {
    cachePuzzle(p('2026-11-25', 'zor'), ['2026-11-25', '2026-11-26'], s);
    cachePuzzle(p('2026-11-27', 'zor'), ['2026-11-26', '2026-11-27'], s);
    expect(getCachedPuzzle('2026-11-25', s)).toBeNull();
    expect(getCachedPuzzle('2026-11-27', s)).not.toBeNull();
  });

  it('bozuk kayıt uygulamayı düşürmez', () => {
    s.setItem('evolvo_daily_cache', '{bozuk');
    expect(getCachedPuzzle('2026-11-27', s)).toBeNull();
  });
});
