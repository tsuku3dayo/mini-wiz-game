import { describe, expect, test } from 'vitest';
import type { ItemView, Rarity } from '../../src/api/types';
import { ORDER_LABELS, itemTier, sortItems } from '../../src/logic/sort-items';
import { deepFreeze } from '../helpers/deep-freeze';

const item = (id: number, itemId: string, name: string, value: number, rarity: Rarity = 'N'): ItemView =>
  ({ id, itemId, name, slot: 'weapon', rarity, stat: 'attack', stats: ['attack'], value });

// 段階・補正値・名前・id の比べ方がそれぞれ効く並び（入力は新しい順でもない、ばらばらの順）
const items = deepFreeze([
  item(1, 'weapon1', 'ショートソード', 2, 'R'),
  item(2, 'weapon4', 'ロングソード', 9, 'R'),
  item(3, 'weapon4', 'ロングソード', 12, 'SR'),
  item(4, 'armor4', 'プレートメイル', 9, 'SR'),
  item(5, 'weapon1', 'ショートソード', 2, 'N'),
  item(6, 'accessory8', 'ソロモンのゆびわ', 15, 'LG'),
  item(7, 'weapon4', 'ロングソード', 9, 'SR'),
]);

describe('装備の並び順', () => {
  test('TC-0028-08 強い順：段階の高い順 → 補正値の大きい順 → 名前の五十音順 → id の大きい順。レアリティは比べない。入力は変えない', () => {
    const before = items.map((i) => i.id);
    const sorted = sortItems(items, 'strong');
    // 段階 8 → 段階 4（補正 12 → 9。9 どうしは プレートメイル が ロングソード より先、ロングソード 9 の 2 個は id の大きい 7 が先、SR と R は比べない）→ 段階 1（id の大きい順）
    expect(sorted.map((i) => i.id)).toEqual([6, 3, 4, 7, 2, 5, 1]);
    expect('プレートメイル'.localeCompare('ロングソード', 'ja')).toBeLessThan(0);
    expect(items.map((i) => i.id)).toEqual(before);
    expect(sorted).not.toBe(items);
    expect(itemTier(items[5])).toBe(8);
    expect(ORDER_LABELS.strong).toBe('つよい じゅん');
  });

  test('TC-0029-02 弱い順：段階の低い順 → 補正値の小さい順 → 名前の五十音の逆順 → id の大きい順のまま。入力は変えない', () => {
    const before = items.map((i) => i.id);
    const sorted = sortItems(items, 'weak');
    // 段階 1（同じものは id の大きい 5 が先）→ 段階 4（補正 9：ロングソード が プレートメイル より先（逆順）、ロングソード 9 の 2 個は 7 が先のまま → 補正 12）→ 段階 8
    expect(sorted.map((i) => i.id)).toEqual([5, 1, 7, 2, 4, 3, 6]);
    expect(items.map((i) => i.id)).toEqual(before);
    expect(ORDER_LABELS.weak).toBe('よわい じゅん');
  });
});
