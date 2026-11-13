import { describe, expect, test } from 'vitest';
import { conformItem, ITEMS, valueRange, type ItemId, type Rarity } from '../../src/domain/items';
import { SequenceRng } from '../../src/domain/rng';
import { rollDrop } from '../../src/domain/loot';
import { deepFreeze } from '../helpers/deep-freeze';
import { recordingRng } from '../helpers/rng';

type Row = [name: string, stats: string[], ranges: string];
// 仕様書 §8.2 の 4 つの表（段階順。v1.21）。範囲は「低い方 高い方」（段階 8 は LG だけ）
const SPEC: Record<string, Row[]> = {
  weapon: [['ショートソード', ['attack'], 'N1-2 R3-4'], ['スピア', ['attack'], 'N3-4 R5-6'], ['バトルアックス', ['attack'], 'N5-8 R9-12'], ['ロングソード', ['attack'], 'R8-12 SR13-18'],
    ['バスタードソード', ['attack'], 'R10-15 SR16-21'], ['ミスリルソード', ['attack'], 'SR18-24 UR25-33'], ['ムラサメブレード', ['attack'], 'SR22-30 UR31-40'], ['エクスカリバー', ['attack'], 'LG40-68']],
  armor: [['クロースアーマー', ['defense'], 'N1-2 R3-4'], ['レザーアーマー', ['defense'], 'N2-4 R5-6'], ['チェインメイル', ['defense'], 'N4-6 R7-10'], ['プレートメイル', ['defense'], 'R7-9 SR10-13'],
    ['ナイトアーマー', ['defense'], 'R9-13 SR14-18'], ['ミスリルメイル', ['defense'], 'SR15-21 UR22-29'], ['ドラゴンメイル', ['defense'], 'SR19-25 UR26-34'], ['オリハルコンアーマー', ['defense'], 'LG35-60']],
  shield: [['ウッドシールド', ['evasion'], 'N1-2 R3-4'], ['レザーシールド', ['evasion'], 'N2-3 R4-6'], ['アイアンシールド', ['evasion'], 'N3-4 R5-6'], ['カイトシールド', ['evasion'], 'R4-7 SR8-11'],
    ['ナイトシールド', ['evasion'], 'R6-8 SR9-12'], ['ミスリルシールド', ['evasion'], 'SR10-13 UR14-18'], ['ドラゴンシールド', ['evasion'], 'SR12-16 UR17-23'], ['イージス', ['evasion'], 'LG23-35']],
  accessory: [['ライフアミュレット', ['maxHp'], 'N2-4 R5-7'], ['マナブレスレット', ['maxMp'], 'N1-2 R3-4'], ['ガードリング', ['defense'], 'R4-7 SR8-11'], ['パワーリング', ['attack'], 'R8-12 SR13-18'],
    ['ウィンドブーツ', ['evasion'], 'R4-7 SR8-11'], ['ミスリルアンクレット', ['defense'], 'SR15-21 UR22-29'], ['ドラゴンハート', ['attack'], 'SR18-24 UR25-33'],
    ['ソロモンのゆびわ', ['attack', 'defense', 'evasion'], 'LG25-33']],
};

/** 'N1-2 R3-4' → [['N', [1, 2]], ['R', [3, 4]]] */
const parse = (s: string) => s.split(' ').map((t) => {
  const [, r, lo, hi] = /^([A-Z]+)(\d+)-(\d+)$/.exec(t)!;
  return [r as Rarity, [Number(lo), Number(hi)]] as const;
});

describe('装備のマスタとレアリティ', () => {
  test('TC-0027-01 マスタは 32 種で、ID・名前・部位・段階・能力・出るレアリティ・範囲が仕様書 §8.2 の表と一致。ソロモンのゆびわだけ能力が 3 つ。すばやさを上げる種類はない', () => {
    expect(Object.keys(ITEMS)).toHaveLength(32);
    for (const [slot, rows] of Object.entries(SPEC)) {
      rows.forEach(([name, stats, ranges], i) => {
        const id = `${slot}${i + 1}` as ItemId;
        const m = ITEMS[id];
        const spec = parse(ranges);
        expect({ slot: m.slot, tier: m.tier, name: m.name, stats: m.stats, rarities: m.rarities, ranges: m.ranges }, id)
          .toEqual({ slot, tier: i + 1, name, stats, rarities: spec.map(([r]) => r), ranges: spec.map(([, v]) => v) });
      });
    }
    expect(ITEMS.accessory8.stats).toEqual(['attack', 'defense', 'evasion']);
    expect(Object.values(ITEMS).filter((m) => m.stats.includes('speed'))).toEqual([]);
  });

  test('TC-0027-02 補正値は種類・レアリティの範囲から int(lo, hi) で選ぶ。エクスカリバー［LG］は 40〜68、ロングソード［SR］は int(13, 18)。valueRange が 32 種で §8.2 の表と一致', () => {
    // ボスのドロップ（部位 0・段階 8・レアリティ）のあとの補正値の乱数が、そのまま補正値になる
    const boss = (v: number) => rollDrop('necromancer', new SequenceRng([1, 0, 8, 1, v]))!;
    expect([boss(40).value, boss(68).value]).toEqual([40, 68]);
    expect(() => rollDrop('necromancer', new SequenceRng([1, 0, 8, 1, 39]))).toThrow();
    // オークロードの段階 4・高い方：ロングソード［SR］は int(13, 18)
    const rng = recordingRng(new SequenceRng([1, 0, 4, 81, 13]));
    expect(rollDrop('orc', rng)).toEqual({ itemId: 'weapon4', rarity: 'SR', value: 13 });
    expect(rng.calls.at(-1)).toMatchObject({ min: 13, max: 18 });
    for (const [slot, rows] of Object.entries(SPEC)) {
      rows.forEach(([, , ranges], i) => {
        const id = `${slot}${i + 1}` as ItemId;
        for (const [r, v] of parse(ranges)) expect(valueRange(id, r), `${id} ${r}`).toEqual(v);
      });
    }
  });

  test('TC-0029-10 conformItem は乱数なしで、出ないレアリティを近い方へ（値は換算しない）・範囲の外を範囲へ直す。もう一度通しても同じ', () => {
    const cases = [
      [{ id: 1, itemId: 'weapon4', rarity: 'N', value: 5 }, { rarity: 'R', value: 8 }],
      [{ id: 2, itemId: 'weapon1', rarity: 'LG', value: 30 }, { rarity: 'R', value: 4 }],
      [{ id: 3, itemId: 'accessory3', rarity: 'N', value: 2 }, { rarity: 'R', value: 4 }],
      [{ id: 4, itemId: 'weapon8', rarity: 'LG', value: 78 }, { rarity: 'LG', value: 68 }],
      [{ id: 5, itemId: 'armor5', rarity: 'SR', value: 99 }, { rarity: 'SR', value: 18 }],
    ] as const;
    for (const [before, want] of cases) {
      const after = conformItem(deepFreeze({ ...before }));
      expect(after, before.itemId).toEqual({ ...before, ...want });
      expect(conformItem(after)).toBe(after);
    }
    const ok = { id: 6, itemId: 'shield2' as const, rarity: 'N' as const, value: 3 };
    expect(conformItem(ok)).toBe(ok);
  });
});
