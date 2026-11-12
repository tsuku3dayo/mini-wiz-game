import { describe, expect, test } from 'vitest';
import { appendLines, EFFECT_MS, effectDuration, ENCOUNTER_LOCK_MS, encounterLockMs, holdCount, LINE_INTERVAL_MS, MAX_LINES, planReduced, planSteps, RARE_DROP_LG_MS, waitAfter } from '../../src/logic/message-plan';

describe('メッセージの進め方', () => {
  test('TC-0011-01 演出のない行は 400ms、演出のある行は演出の長さ。持つ行は 7 行で、8 行目でいちばん古い行が消える', () => {
    expect(LINE_INTERVAL_MS).toBe(400);
    expect(waitAfter({})).toBe(400);
    expect(waitAfter({ effect: 'levelUp' })).toBe(1071);
    expect(waitAfter({ effect: 'rareDrop', rarity: 'UR' })).toBe(800);
    expect(waitAfter({ effect: 'rareDrop', rarity: 'LG' })).toBe(1200);
    expect(effectDuration('bossAppear')).toBe(2906);
    expect(effectDuration('bossDefeat')).toBe(1000);
    expect(effectDuration('clear')).toBe(5833);

    expect(MAX_LINES).toBe(7);
    const seven = appendLines([], [1, 2, 3, 4, 5, 6, 7]);
    expect(seven).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(appendLines(seven, [8])).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('演出の長さと計画', () => {
  test('TC-0031-06 EFFECT_MS は levelUp 1071・rareDrop 800（LG 1200）・bossAppear 2906・bossDefeat 1000・clear 5833（v1.10）。演出のない行のあとは 400ms、演出のある行のあとはその長さ待つ計画', () => {
    expect(EFFECT_MS).toEqual({ levelUp: 1071, rareDrop: 800, bossAppear: 2906, bossDefeat: 1000, clear: 5833 });
    expect(RARE_DROP_LG_MS).toBe(1200);
    const lines = [
      { text: 'a' },
      { text: 'b', effect: 'bossDefeat' as const },
      { text: 'c', effect: 'levelUp' as const },
      { text: 'd' },
      { text: 'e', effect: 'rareDrop' as const, rarity: 'UR' as const },
      { text: 'f', effect: 'rareDrop' as const, rarity: 'LG' as const },
      { text: 'g', effect: 'bossAppear' as const },
      { text: 'h', effect: 'clear' as const },
    ];
    expect(planSteps(lines).map((s) => [s.line.text, s.wait])).toEqual([
      ['a', 400], ['b', 1000], ['c', 1071], ['d', 400], ['e', 800], ['f', 1200], ['g', 2906], ['h', 5833],
    ]);
  });

  test('TC-0031-10 動きを減らす設定の計画は、行をすべて一度に出し、演出は最後の 1 つだけ（待ちはその長さ）。遷移の保留はしない', () => {
    const lines = [
      { text: 'a', effect: 'bossDefeat' as const },
      { text: 'b', effect: 'levelUp' as const },
      { text: 'c', effect: 'rareDrop' as const, rarity: 'LG' as const },
      { text: 'd' },
    ];
    const plan = planReduced(lines);
    expect(plan.show.map((l) => l.text)).toEqual(['a', 'b', 'c', 'd']);
    expect(plan.effectLine?.text).toBe('c');
    expect(plan.wait).toBe(1200);
    expect(plan.hold).toBe(0);
    expect(planReduced([{ text: 'x', tone: 'normal' as const, effect: undefined }])).toMatchObject({ effectLine: null, wait: 0, hold: 0 });
  });
});

// 確認 ID のない、遷移の保留の件数（仕様書 §11.8）
describe('遭遇の入力止め（v1.17）', () => {
  test('TC-0018-10 遭遇の入力止めの長さは、通常の敵 510ms・ボス 2906ms（ボス出現の演出と同じ）', () => {
    expect(ENCOUNTER_LOCK_MS).toEqual({ normal: 510, boss: EFFECT_MS.bossAppear });
    expect(encounterLockMs(false)).toBe(510);
    expect(encounterLockMs(true)).toBe(2906);
  });
});

describe('遷移の保留の件数', () => {
  test('danger の行があれば最後の danger まで、なければ末尾の clear の行を除いた件数', () => {
    expect(holdCount([{ tone: 'normal' }, { tone: 'danger' }, { tone: 'normal' }])).toBe(2);
    expect(holdCount([{ tone: 'success' }, { tone: 'success', effect: 'clear' }])).toBe(1);
    expect(holdCount([{ tone: 'normal' }, { tone: 'normal' }])).toBe(2);
    expect(holdCount([])).toBe(0);
  });
});
