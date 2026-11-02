import { describe, expect, test } from 'vitest';
import { SeededRng, SequenceRng, SwappableRng } from '../../src/domain/rng';

describe('乱数の決まり', () => {
  test('TC-0018-08 SeededRng(1) の int(1,100) を 10 回引くと 63, 1, 53, 99, 97, 29, 62, 73, 43, 100', () => {
    const rng = new SeededRng(1);
    expect(Array.from({ length: 10 }, () => rng.int(1, 100))).toEqual([63, 1, 53, 99, 97, 29, 62, 73, 43, 100]);
  });

  test('TC-0018-09 chance(0.1) は int が 10 なら真・11 なら偽。1 回で乱数を 1 個だけ使う', () => {
    const rng = new SequenceRng([10, 11]);
    expect(rng.chance(0.1)).toBe(true);
    expect(rng.remaining).toBe(1);
    expect(rng.chance(0.1)).toBe(false);
    rng.assertExhausted();
  });
});

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
