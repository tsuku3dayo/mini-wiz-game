import { describe, expect, test } from 'vitest';
import { resolveTurn } from '../../src/domain/battle';
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

/** 模擬戦：HP が上限の 40% 以下で MP があればヒール、それ以外は攻撃。ボスに勝ったか */
function fight(start: GameStateData, seed: number): boolean {
  const rng = new SeededRng(seed);
  let state = start;
  for (let turn = 0; turn < 500; turn += 1) {
    const maxHp = effectiveStats(state).maxHp;
    const command = state.hp * 10 <= maxHp * 4 && state.mp >= 3 ? 'heal' : 'attack';
    const r = resolveTurn(state, command, rng);
    if (r.outcome === 'victory') return true;
    if (r.outcome === 'defeat') return false;
    state = r.state;
  }
  return false;
}

const winRate = (start: GameStateData) => {
  let wins = 0;
  for (let seed = 1; seed <= 200; seed += 1) if (fight(start, seed)) wins += 1;
  return wins / 200;
};

describe('ボスの強さの釣り合い', () => {
  test('TC-0024-08 装備なしの Lv12（平均の成長）はボスに勝つ割合が 20% 以下。weapon5・armor5・shield5・accessory4 を装備した Lv11 は 80% 以上（v1.14 で Lv10 から Lv11 に）', () => {
    const bare = battleState('necromancer', 260, averageCharacter(12));
    const geared: InventoryData = {
      equipped: {
        weapon: makeItem(1, 'weapon5', 'R', 11),
        armor: makeItem(2, 'armor5', 'R', 9),
        shield: makeItem(3, 'shield5', 'R', 6),
        accessory: makeItem(4, 'accessory4', 'R', 15),
      },
      items: [],
      nextId: 5,
      pending: null,
    };
    const lv11 = averageCharacter(11);
    const equipped = battleState('necromancer', 260, { ...lv11, inventory: geared, hp: (lv11.maxHp ?? 0) + 15 });
    const bareRate = winRate(bare);
    const gearedRate = winRate(equipped);
    expect(bareRate, `装備なし Lv12：${bareRate}`).toBeLessThanOrEqual(0.2);
    expect(gearedRate, `装備あり Lv11：${gearedRate}`).toBeGreaterThanOrEqual(0.8);
  });
});
