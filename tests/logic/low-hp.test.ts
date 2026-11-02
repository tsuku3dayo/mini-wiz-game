import { describe, expect, test } from 'vitest';
import { isHpWarning, isLowHp } from '../../src/logic/low-hp';

describe('HP の警告と体力わずか', () => {
  test('TC-0019-10 HP の警告は HP ≦ 最大HP × 0.25（最大 40 で 10 は真・11 は偽、最大 46 で 11 は真・12 は偽）', () => {
    expect([isHpWarning(10, 40), isHpWarning(11, 40), isHpWarning(11, 46), isHpWarning(12, 46)]).toEqual([true, false, true, false]);
  });

  test('TC-0019-12 体力わずかは HP × 5 ≦ 最大HP（最大 46 で 9 は真・10 は偽、最大 50 で 10 は真・11 は偽、HP 0 は真）', () => {
    expect([isLowHp(9, 46), isLowHp(10, 46), isLowHp(10, 50), isLowHp(11, 50), isLowHp(0, 30)]).toEqual([true, false, true, false, true]);
  });
});
