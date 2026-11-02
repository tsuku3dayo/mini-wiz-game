import { describe, expect, test } from 'vitest';
import { SeededRng, SequenceRng, SwappableRng } from '../../src/domain/rng';

// 確認 ID のない、テストの道具としての乱数の決まり（仕様書 §23.2、§23.3）
describe('テスト用の乱数', () => {
  test('SequenceRng は与えた値を順に返し、尽きた・範囲外・余りを例外にする', () => {
    const rng = new SequenceRng([3, 1]);
    expect(rng.int(1, 5)).toBe(3);
    expect(rng.remaining).toBe(1);
    expect(() => rng.assertExhausted()).toThrow();
    expect(() => rng.int(2, 5)).toThrow();
    expect(rng.int(1, 1)).toBe(1);
    rng.assertExhausted();
    expect(() => rng.int(1, 5)).toThrow();
  });

  test('SwappableRng は既定で SeededRng(1) と同じ値を返し、中身を入れ替えられる', () => {
    const swap = new SwappableRng();
    const seeded = new SeededRng(1);
    for (let i = 0; i < 5; i += 1) expect(swap.int(1, 100)).toBe(seeded.int(1, 100));
    swap.inner = new SequenceRng([10, 11]);
    expect(swap.chance(0.1)).toBe(true);
    expect(swap.chance(0.1)).toBe(false);
  });
});
