// 装備込みの能力値（仕様書 §8.5「能力値への反映」）
// 付け替え・はずす・捨てるは TASK-0014 で足す
import type { GameStateData, InventoryData } from './game-state';
import { ITEMS, SLOTS, type StatKey } from './items';

export type Stats = Record<StatKey, number>;

/** 4 枠それぞれについて、その種類の stats の各能力に value を足した合計 */
export function equipmentBonus(inv: InventoryData): Stats {
  const bonus: Stats = { attack: 0, defense: 0, speed: 0, maxHp: 0, maxMp: 0 };
  for (const slot of SLOTS) {
    const it = inv.equipped[slot];
    if (!it) continue;
    for (const stat of ITEMS[it.itemId].stats) bonus[stat] += it.value;
  }
  return bonus;
}

/** 実効値 = 基礎値 + 装備の補正 */
export function effectiveStats(state: GameStateData): Stats {
  const b = equipmentBonus(state.inventory);
  return {
    attack: state.attack + b.attack,
    defense: state.defense + b.defense,
    speed: state.speed + b.speed,
    maxHp: state.maxHp + b.maxHp,
    maxMp: state.maxMp + b.maxMp,
  };
}
