import { describe, expect, test } from 'vitest';
import { conformItem, ITEMS, RARITY_BY_TIER, valueRange, type ItemId, type Rarity } from '../../src/domain/items';
import { deepFreeze } from '../helpers/deep-freeze';

// 仕様書 §8.2 の 4 つの表（段階順）
const SPEC: Record<string, [string, string, number, number][]> = {
  weapon: [['ショートソード', 'attack', 1, 2], ['スピア', 'attack', 3, 4], ['バトルアックス', 'attack', 5, 8], ['ロングソード', 'attack', 7, 10],
    ['バスタードソード', 'attack', 9, 13], ['ミスリルソード', 'attack', 12, 16], ['ムラサメブレード', 'attack', 15, 20], ['エクスカリバー', 'attack', 20, 26]],
  armor: [['クロースアーマー', 'defense', 1, 2], ['レザーアーマー', 'defense', 2, 4], ['チェインメイル', 'defense', 4, 6], ['プレートメイル', 'defense', 6, 8],
    ['ナイトアーマー', 'defense', 8, 11], ['ミスリルメイル', 'defense', 10, 14], ['ドラゴンメイル', 'defense', 13, 17], ['オリハルコンアーマー', 'defense', 17, 22]],
  shield: [['ウッドシールド', 'evasion', 1, 2], ['レザーシールド', 'evasion', 2, 3], ['アイアンシールド', 'evasion', 3, 4], ['カイトシールド', 'evasion', 4, 6],
    ['ナイトシールド', 'evasion', 5, 7], ['ミスリルシールド', 'evasion', 7, 9], ['ドラゴンシールド', 'evasion', 8, 11], ['イージス', 'evasion', 11, 14]],
  accessory: [['ガードリング', 'defense', 1, 3], ['パワーリング', 'attack', 1, 3], ['ウィンドブーツ', 'speed', 2, 4], ['ライフアミュレット', 'maxHp', 10, 20],
    ['マナブレスレット', 'maxMp', 4, 8], ['ミスリルアンクレット', 'defense', 3, 5], ['ドラゴンハート', 'attack', 3, 5], ['ソロモンのゆびわ', 'attack', 5, 8]],
};

// 仕様書 §8.3「種類ごとに取りうる補正値」の表：[低い方, 高い方]（段階 8 は LG だけ）
const RANGES: Record<string, [number, number][]> = {
  weapon1: [[1, 2], [1, 2]], weapon2: [[3, 4], [3, 4]], weapon3: [[5, 8], [6, 9]], weapon4: [[8, 12], [10, 15]],
  weapon5: [[10, 15], [13, 19]], weapon6: [[18, 24], [24, 32]], weapon7: [[22, 30], [30, 40]], weapon8: [[60, 78]],
  armor1: [[1, 2], [1, 2]], armor2: [[2, 4], [2, 4]], armor3: [[4, 6], [4, 7]], armor4: [[7, 9], [9, 12]],
  armor5: [[9, 13], [12, 16]], armor6: [[15, 21], [20, 28]], armor7: [[19, 25], [26, 34]], armor8: [[51, 66]],
  shield1: [[1, 2], [1, 2]], shield2: [[2, 3], [2, 3]], shield3: [[3, 4], [3, 4]], shield4: [[4, 7], [6, 9]],
  shield5: [[6, 8], [7, 10]], shield6: [[10, 13], [14, 18]], shield7: [[12, 16], [16, 22]], shield8: [[33, 42]],
  accessory1: [[1, 3], [1, 3]], accessory2: [[1, 3], [1, 3]], accessory3: [[2, 4], [2, 4]], accessory4: [[12, 24], [15, 30]],
  accessory5: [[4, 9], [6, 12]], accessory6: [[4, 7], [6, 10]], accessory7: [[4, 7], [6, 10]], accessory8: [[15, 24]],
};

describe('装備のマスタとレアリティ', () => {
  test('TC-0027-01 マスタは 32 種で、ID・名前・部位・段階・能力・幅が仕様書 §8.2 の表と一致。ソロモンのゆびわだけ能力が 2 つ', () => {
    expect(Object.keys(ITEMS)).toHaveLength(32);
    for (const [slot, rows] of Object.entries(SPEC)) {
      rows.forEach(([name, stat, min, max], i) => {
        const id = `${slot}${i + 1}` as ItemId;
        const m = ITEMS[id];
        expect({ slot: m.slot, tier: m.tier, name: m.name, stat: m.stats[0], min: m.min, max: m.max }, id).toEqual({ slot, tier: i + 1, name, stat, min, max });
        expect(m.stats, id).toHaveLength(id === 'accessory8' ? 2 : 1);
      });
    }
    expect(ITEMS.accessory8.stats).toEqual(['attack', 'defense']);
  });

  test('TC-0027-02 補正値は floor(v × 倍率×10 ÷ 10)。エクスカリバー［LG］は 60〜78、ロングソード［SR］は 10・12・13・15。32 種の範囲が §8.3 の表と一致', () => {
    const v = (_id: ItemId, r: Rarity, base: number) => Math.floor((base * { N: 10, R: 12, SR: 15, UR: 20, LG: 30 }[r]) / 10);
    expect([v('weapon8', 'LG', 20), v('weapon8', 'LG', 26)]).toEqual([60, 78]);
    expect([7, 8, 9, 10].map((b) => v('weapon4', 'SR', b))).toEqual([10, 12, 13, 15]);
    for (const [id, ranges] of Object.entries(RANGES)) {
      const rarities = RARITY_BY_TIER[ITEMS[id as ItemId].tier];
      expect(rarities.map((r) => valueRange(id as ItemId, r)), id).toEqual(ranges);
    }
  });

  test('TC-0029-10 conformItem は乱数なしで、出ないレアリティを近い方へ・範囲の外を範囲へ直す。もう一度通しても同じ', () => {
    const a = conformItem(deepFreeze({ id: 1, itemId: 'weapon4' as const, rarity: 'N' as const, value: 8 }));
    expect(a).toEqual({ id: 1, itemId: 'weapon4', rarity: 'R', value: 9 });
    const b = conformItem(deepFreeze({ id: 2, itemId: 'weapon1' as const, rarity: 'LG' as const, value: 30 }));
    expect(b).toEqual({ id: 2, itemId: 'weapon1', rarity: 'R', value: 2 });
    const c = conformItem(deepFreeze({ id: 3, itemId: 'armor5' as const, rarity: 'SR' as const, value: 99 }));
    expect(c).toEqual({ id: 3, itemId: 'armor5', rarity: 'SR', value: 16 });
    for (const x of [a, b, c]) expect(conformItem(x)).toBe(x);
    const ok = { id: 4, itemId: 'shield2' as const, rarity: 'N' as const, value: 3 };
    expect(conformItem(ok)).toBe(ok);
  });
});
