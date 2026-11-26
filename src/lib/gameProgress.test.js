import { describe, it, expect, beforeEach } from 'vitest';
import { loadProgress, saveProgress, clearProgress, progressId } from './gameProgress';

const memStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};

const daily = { type: 'daily', date: '2026-11-23', start: 'KALE' };
const unlimited = { type: 'unlimited', length: 4, level: 7, start: 'KASA', date: 'offline_4_7' };

describe('gameProgress', () => {
  let s;
  beforeEach(() => { s = memStorage(); });

  it('saves and restores history, hints and locked rows', () => {
    saveProgress(daily, { history: ['KALE', 'KALP', 'KARP'], hintsUsed: 1, bonusHints: 1, locked: [0, 2] }, s);
    expect(loadProgress(daily, s)).toEqual({ history: ['KALE', 'KALP', 'KARP'], hintsUsed: 1, bonusHints: 1, locked: [0, 2] });
  });

  it('ignores progress once the puzzle is finished', () => {
    saveProgress(daily, { history: ['KALE', 'KALP'], hintsUsed: 1, bonusHints: 0, locked: [0] }, s);
    s.setItem(`evolvo_played_${progressId(daily)}`, 'won');
    expect(loadProgress(daily, s)).toBeNull();
  });

  it('ignores progress for a different start word', () => {
    saveProgress(daily, { history: ['KALE', 'KALP'], hintsUsed: 0, bonusHints: 0, locked: [0] }, s);
    expect(loadProgress({ ...daily, start: 'MASA' }, s)).toBeNull();
  });

  it('falls back to the legacy unlimited history key', () => {
    s.setItem('evolvo_history_unlimited_4_7', JSON.stringify(['KASA', 'KASE']));
    expect(loadProgress(unlimited, s)).toEqual({ history: ['KASA', 'KASE'], hintsUsed: 0, bonusHints: 0, locked: [0] });
  });

  it('never stores challenge (custom) games', () => {
    const custom = { type: 'custom', start: 'KALE' };
    saveProgress(custom, { history: ['KALE', 'KALP'], hintsUsed: 0, bonusHints: 0, locked: [0] }, s);
    expect(loadProgress(custom, s)).toBeNull();
  });

  it('clearProgress removes the save', () => {
    saveProgress(unlimited, { history: ['KASA', 'KASE'], hintsUsed: 1, bonusHints: 0, locked: [0, 1] }, s);
    clearProgress(unlimited, s);
    expect(loadProgress(unlimited, s)).toBeNull();
  });
});
