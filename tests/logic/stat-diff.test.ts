import { describe, expect, test } from 'vitest';
import type { ItemView, Stats } from '../../src/api/types';
import { abilityRows, breakdownText, diffText, statDiff } from '../../src/logic/stat-diff';

/** 並びは こうげき・ぼうぎょ・すばやさ・かいひ・さいだいHP・さいだいMP（v1.14 で かいひ を足した） */
const stats = (attack: number, defense: number, speed: number, evasion: number, maxHp: number, maxMp: number): Stats =>
  ({ attack, defense, speed, evasion, maxHp, maxMp });
const weapon = (id: number, value: number): ItemView =>
  ({ id, itemId: 'weapon4', name: 'ロングソード', slot: 'weapon', rarity: 'R', stat: 'attack', stats: ['attack'], value });

describe('のうりょくの表示', () => {
  test('TC-0028-01 内訳は「実効値 = 基礎値 + 補正」。実効値と基礎値は 3 桁右詰め、補正は詰めない。並びは こうげき → ぼうぎょ → すばやさ → かいひ → さいだいHP → さいだいMP', () => {
    expect(breakdownText(30, 18, 12)).toBe(' 30 =  18 + 12');
    expect(breakdownText(22, 22, 0)).toBe(' 22 =  22 + 0');
    expect(breakdownText(135, 120, 15)).toBe('135 = 120 + 15');
    const rows = abilityRows({ effective: stats(30, 25, 22, 6, 135, 43), base: stats(18, 25, 22, 0, 120, 43), bonus: stats(12, 0, 0, 6, 15, 0) }, null);
    expect(rows.map((r) => r.name)).toEqual(['こうげき', 'ぼうぎょ', 'すばやさ', 'かいひ', 'さいだいHP', 'さいだいMP']);
    expect(rows.map((r) => r.text)).toEqual([' 30 =  18 + 12', ' 25 =  25 + 0', ' 22 =  22 + 0', '  6 =   0 + 6', '135 = 120 + 15', ' 43 =  43 + 0']);
    expect(rows.every((r) => r.change === null)).toBe(true);
  });

  test('TC-0028-10 statDiff は今の実効値から今の枠の value を引き候補の value を足す。上がる「↑」・下がる「↓」、変わらない能力は内訳のまま。はずすは引くだけ、もどるは変化なし', () => {
    const effective = stats(23, 10, 8, 0, 40, 12);
    const c = { effective, base: stats(18, 10, 8, 0, 40, 12), bonus: stats(5, 0, 0, 0, 0, 0) };
    const current = weapon(1, 5);
    // 23 − 5 + 10 = 28
    expect(statDiff(effective, current, weapon(2, 10))).toEqual(stats(28, 10, 8, 0, 40, 12));
    expect(statDiff(effective, current, null)).toEqual(stats(18, 10, 8, 0, 40, 12));
    expect(effective).toEqual(stats(23, 10, 8, 0, 40, 12));

    const up = abilityRows(c, { current, candidate: weapon(2, 10) });
    expect(up[0]).toMatchObject({ text: ' 23 →  28 ↑', change: 'up', spoken: 'こうげき 23 から 28、あがる' });
    expect(up.slice(1).map((r) => [r.text, r.change])).toEqual([[' 10 =  10 + 0', null], ['  8 =   8 + 0', null], ['  0 =   0 + 0', null], [' 40 =  40 + 0', null], [' 12 =  12 + 0', null]]);

    const down = abilityRows(c, { current, candidate: weapon(3, 2) });
    expect(down[0]).toMatchObject({ text: ' 23 →  20 ↓', change: 'down', spoken: 'こうげき 23 から 20、さがる' });

    // はずす：引くだけ
    const off = abilityRows(c, { current, candidate: null });
    expect(off[0]).toMatchObject({ text: ' 23 →  18 ↓', change: 'down' });
    // 同じ値の候補は変わらないので内訳のまま
    expect(abilityRows(c, { current, candidate: weapon(4, 5) })[0]).toMatchObject({ text: ' 23 =  18 + 5', change: null });
    // もどる：変化を出さない
    expect(abilityRows(c, null)[0]).toMatchObject({ text: ' 23 =  18 + 5', change: null });
    expect(diffText(5, 105)).toBe('  5 → 105 ↑');
  });
});
