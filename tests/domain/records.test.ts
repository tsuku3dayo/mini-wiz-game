import { describe, expect, test } from 'vitest';
import { resolveTurn } from '../../src/domain/battle';
import { moveInDungeon } from '../../src/domain/explore';
import { normalizeRecords } from '../../src/domain/records';
import { SequenceRng } from '../../src/domain/rng';
import { deepFreeze } from '../helpers/deep-freeze';
import { dungeonState, openMap } from '../helpers/maps';

describe('実績を数える', () => {
  test('TC-0026-02 遭遇して逃げきると battles だけ +1。通常の敵に勝つと（遭遇の分のほかは）kills だけ +1', () => {
    const start = deepFreeze(dungeonState(openMap({ x: 4, y: 5 })));
    // 遭遇（1 ≦ 20、出現表 1 → スライム）→ 逃走（50 ≦ 54。速さ 5 と 3 で成功率 60%）
    const met = moveInDungeon(start, 'forward', new SequenceRng([1, 1])).state;
    expect(met.records).toEqual({ battles: 1, kills: 0, deaths: 0, laps: 1, bossKills: 0 });
    const fled = resolveTurn(met, 'flee', new SequenceRng([50])).state;
    expect(fled.records).toEqual({ battles: 1, kills: 0, deaths: 0, laps: 1, bossKills: 0 });

    // もう一度遭遇 → スライム（HP 12）を倒す：攻撃 3 回分の乱数（回避 100・ダメージ 2 → 6 ダメージ）と敵の攻撃、ドロップなし
    const met2 = moveInDungeon(fled, 'forward', new SequenceRng([1, 1])).state;
    expect(met2.records.battles).toBe(2);
    const t1 = resolveTurn(met2, 'attack', new SequenceRng([100, 2, 100, 0])).state;
    const won = resolveTurn(t1, 'attack', new SequenceRng([100, 2, 100])).state;
    expect(won.location).toBe('DUNGEON');
    expect(won.records).toEqual({ battles: 2, kills: 1, deaths: 0, laps: 1, bossKills: 0 });
  });

  test('TC-0026-03 normalizeRecords は項目ごとに直し、オブジェクトでない値は初期値', () => {
    expect(normalizeRecords({ battles: -1, kills: 1.5, deaths: '2', laps: 0, bossKills: 3 })).toEqual({ battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 3 });
    for (const raw of [null, 'x', undefined, 42, [1, 2]]) {
      expect(normalizeRecords(raw)).toEqual({ battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 0 });
    }
  });
});
