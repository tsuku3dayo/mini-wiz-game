import { describe, expect, test } from 'vitest';
import { resolveTurn } from '../../src/domain/battle';
import { ENEMIES } from '../../src/domain/constants';
import { effectiveStats } from '../../src/domain/equipment';
import type { GameStateData, InventoryData } from '../../src/domain/game-state';
import { SeededRng } from '../../src/domain/rng';
import { makeItem } from '../helpers/fixtures';
import { battleState } from '../helpers/maps';

/** 平均の成長（最大HP +10・最大MP +3・こうげき／ぼうぎょ／すばやさ +1.5（切り捨て））の Lv n */
function averageCharacter(level: number): Partial<GameStateData> {
  const up = level - 1;
  const stat = 5 + Math.floor(up * 1.5);
  const maxHp = 30 + up * 10;
  const maxMp = 10 + up * 3;
  return { level, hp: maxHp, maxHp, mp: maxMp, maxMp, attack: stat, defense: stat, speed: stat };
}

/** 模擬戦：HP が上限の 40% 以下で MP があればヒール、それ以外は攻撃。ボスに勝ったか・負けたか・ターンの上限（500）で決着がつかなかったか */
function fight(start: GameStateData, seed: number): 'win' | 'lose' | 'draw' {
  const rng = new SeededRng(seed);
  let state = start;
  for (let turn = 0; turn < 500; turn += 1) {
    const maxHp = effectiveStats(state).maxHp;
    const command = state.hp * 10 <= maxHp * 4 && state.mp >= 3 ? 'heal' : 'attack';
    const r = resolveTurn(state, command, rng);
    if (r.outcome === 'victory') return 'win';
    if (r.outcome === 'defeat') return 'lose';
    state = r.state;
  }
  return 'draw';
}

/** シード 1〜200 で勝った割合と、上限で決着がつかなかった回数 */
const simulate = (start: GameStateData) => {
  let wins = 0;
  let draws = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    const result = fight(start, seed);
    if (result === 'win') wins += 1;
    if (result === 'draw') draws += 1;
  }
  return { rate: wins / 200, draws };
};

/** weapon7［SR］+26・armor7［SR］+22・shield7［SR］かいひ +14・accessory7［SR］ドラゴンハート こうげき +21 を装備した Lv n（HP は最大。v1.21） */
function gearedCharacter(level: number): GameStateData {
  const inventory: InventoryData = {
    equipped: {
      weapon: makeItem(1, 'weapon7', 'SR', 26),
      armor: makeItem(2, 'armor7', 'SR', 22),
      shield: makeItem(3, 'shield7', 'SR', 14),
      accessory: makeItem(4, 'accessory7', 'SR', 21),
    },
    items: [],
    nextId: 5,
    pending: null,
  };
  const base = averageCharacter(level);
  return battleState('necromancer', ENEMIES.necromancer.maxHp, { ...base, inventory });
}

describe('ボスの強さの釣り合い', () => {
  test('TC-0024-08 装備なしの Lv45（平均の成長）はボスに勝つ割合が 20% 以下。weapon7［SR］+26・armor7［SR］+22・shield7［SR］+14・accessory7［SR］+21 を装備した Lv38 は 80% 以上、同じ装備の Lv32 は 20% 以下（v1.21）。どの模擬戦もターンの上限 500 までに決着がつく', () => {
    const bare = simulate(battleState('necromancer', ENEMIES.necromancer.maxHp, averageCharacter(45)));
    const lv38 = simulate(gearedCharacter(38));
    const lv32 = simulate(gearedCharacter(32));
    expect(bare.rate, `装備なし Lv45：${bare.rate}`).toBeLessThanOrEqual(0.2);
    expect(lv38.rate, `装備あり Lv38：${lv38.rate}`).toBeGreaterThanOrEqual(0.8);
    expect(lv32.rate, `装備あり Lv32：${lv32.rate}`).toBeLessThanOrEqual(0.2);
    expect([bare.draws, lv38.draws, lv32.draws], '上限 500 ターンで決着しなかった回数').toEqual([0, 0, 0]);
  });
});
