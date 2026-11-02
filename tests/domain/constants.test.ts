import { describe, expect, test } from 'vitest';
import { ENCOUNTER_TABLE, ENEMIES, type EnemyKind } from '../../src/domain/constants';

describe('敵の表', () => {
  test('TC-0018-07 敵 6 種の能力値・経験値と、出現表に出る階が仕様書 §6 の表のとおり。各階の合計は 100', () => {
    const stats = (k: EnemyKind) => { const e = ENEMIES[k]; return [e.name, e.maxHp, e.attack, e.defense, e.speed, e.exp]; };
    expect(stats('slime')).toEqual(['スライム', 12, 4, 2, 3, 4]);
    expect(stats('goblin')).toEqual(['ゴブリン', 18, 6, 3, 6, 10]);
    expect(stats('skeleton')).toEqual(['スケルトン', 26, 9, 6, 5, 18]);
    expect(stats('orc')).toEqual(['オーク', 48, 16, 10, 5, 30]);
    expect(stats('darkKnight')).toEqual(['ダークナイト', 70, 24, 16, 10, 50]);
    expect(stats('necromancer')).toEqual(['暗黒のネクロマンサー', 260, 34, 20, 14, 1000]);

    const floorsOf = (k: EnemyKind) => [1, 2, 3, 4, 5].filter((f) => ENCOUNTER_TABLE[f].some(([kind]) => kind === k));
    expect(floorsOf('slime')).toEqual([1, 2]);
    expect(floorsOf('goblin')).toEqual([1, 2, 3]);
    expect(floorsOf('skeleton')).toEqual([2, 3, 4]);
    expect(floorsOf('orc')).toEqual([3, 4, 5]);
    expect(floorsOf('darkKnight')).toEqual([4, 5]);
    expect(floorsOf('necromancer')).toEqual([]);
    for (const f of [1, 2, 3, 4, 5]) expect(ENCOUNTER_TABLE[f].reduce((s, [, rate]) => s + rate, 0)).toBe(100);
  });
});
