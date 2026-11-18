import { describe, it, expect } from 'vitest';
import { createRowDeleteGuard } from './rowDeleteGuard';

describe('rowDeleteGuard', () => {
  it('ilk basış silmez, ayrı ikinci basış siler', () => {
    const g = createRowDeleteGuard();
    expect(g.confirm(1000)).toBe(false);
    expect(g.confirm(1600)).toBe(true);
  });
  it('basılı tutma / hızlı basışlar silmez', () => {
    const g = createRowDeleteGuard();
    g.touch(0);
    for (let t = 80; t <= 2000; t += 80) expect(g.confirm(t)).toBe(false);
  });
  it('harf sildikten hemen sonra gelen basış silmez', () => {
    const g = createRowDeleteGuard();
    g.touch(1000);
    expect(g.confirm(1100)).toBe(false);
    expect(g.confirm(1900)).toBe(true);
  });
  it('çok geç gelen ikinci basış yeniden kurar', () => {
    const g = createRowDeleteGuard();
    expect(g.confirm(0)).toBe(false);
    expect(g.confirm(6000)).toBe(false);
    expect(g.confirm(6500)).toBe(true);
  });
});
