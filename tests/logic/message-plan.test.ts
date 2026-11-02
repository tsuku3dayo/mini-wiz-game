import { describe, expect, test } from 'vitest';
import { appendLines, effectDuration, holdCount, LINE_INTERVAL_MS, MAX_LINES, waitAfter } from '../../src/logic/message-plan';

describe('メッセージの進め方', () => {
  test('TC-0011-01 演出のない行は 400ms、演出のある行は演出の長さ。持つ行は 7 行で、8 行目でいちばん古い行が消える', () => {
    expect(LINE_INTERVAL_MS).toBe(400);
    expect(waitAfter({})).toBe(400);
    expect(waitAfter({ effect: 'levelUp' })).toBe(1000);
    expect(waitAfter({ effect: 'rareDrop', rarity: 'UR' })).toBe(800);
    expect(waitAfter({ effect: 'rareDrop', rarity: 'LG' })).toBe(1200);
    expect(effectDuration('bossAppear')).toBe(1200);
    expect(effectDuration('bossDefeat')).toBe(600);
    expect(effectDuration('clear')).toBe(1500);

    expect(MAX_LINES).toBe(7);
    const seven = appendLines([], [1, 2, 3, 4, 5, 6, 7]);
    expect(seven).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(appendLines(seven, [8])).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });
});

// 確認 ID のない、遷移の保留の件数（仕様書 §11.8）
describe('遷移の保留の件数', () => {
  test('danger の行があれば最後の danger まで、なければ末尾の clear の行を除いた件数', () => {
    expect(holdCount([{ tone: 'normal' }, { tone: 'danger' }, { tone: 'normal' }])).toBe(2);
    expect(holdCount([{ tone: 'success' }, { tone: 'success', effect: 'clear' }])).toBe(1);
    expect(holdCount([{ tone: 'normal' }, { tone: 'normal' }])).toBe(2);
    expect(holdCount([])).toBe(0);
  });
});
