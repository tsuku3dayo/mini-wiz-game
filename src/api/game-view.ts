// ルールの状態 → 画面に渡す GameView（仕様書 §22.4、§22.5、§22.7）
import { toBattleView } from '../domain/battle';
import { expForLevel } from '../domain/character';
import { HEAL } from '../domain/constants';
import { effectiveStats, equipmentBonus } from '../domain/equipment';
import type { GameStateData, InventoryData, ItemInstance } from '../domain/game-state';
import { INVENTORY_CAPACITY, ITEMS, SLOTS } from '../domain/items';
import { toAutoMapView, toFirstPersonView } from '../domain/view';
import type { GameView, InventoryView, ItemView } from './types';

export function toItemView(i: ItemInstance): ItemView {
  const m = ITEMS[i.itemId];
  return { id: i.id, itemId: i.itemId, name: m.name, slot: m.slot, rarity: i.rarity, stat: m.stats[0], stats: [...m.stats], value: i.value };
}

/** items は新しい順（内部の並びを逆にしたもの）。装備中は含まない */
export function toInventoryView(inv: InventoryData): InventoryView {
  const equipped = { weapon: null, armor: null, shield: null, accessory: null } as InventoryView['equipped'];
  for (const slot of SLOTS) {
    const it = inv.equipped[slot];
    equipped[slot] = it ? toItemView(it) : null;
  }
  return { equipped, items: [...inv.items].reverse().map(toItemView), count: inv.items.length, capacity: INVENTORY_CAPACITY };
}

/**
 * autoSaved は getGame だけが渡す（保存値の版が 3 以上で saveSlot があれば true）。
 * 操作の応答では saveSlot が null でないとき true（自動セーブは saveSlot のスロットに書く。v1.14）
 */
export function toGameView(state: GameStateData, opts: { autoSaved?: boolean } = {}): GameView {
  const eff = effectiveStats(state);
  const nextLevelExp = expForLevel(state.level + 1);
  return {
    location: state.location,
    character: {
      name: state.name,
      level: state.level,
      exp: state.exp,
      nextLevelExp,
      // やすむ までレベルは上がらないので、0 未満にならないよう止める（0 なら「やどで レベルアップ」。v1.14）
      expToNext: Math.max(0, nextLevelExp - state.exp),
      hp: state.hp,
      mp: state.mp,
      ...eff,
      base: { attack: state.attack, defense: state.defense, speed: state.speed, evasion: 0, maxHp: state.maxHp, maxMp: state.maxMp },
      bonus: equipmentBonus(state.inventory),
    },
    inventory: toInventoryView(state.inventory),
    records: { ...state.records },
    // 視界と、今の階の地図だけ（未踏破のマスの壁・ほかの階・ボスの位置は入れない。§22.5）
    dungeon: state.dungeon ? { ...toFirstPersonView(state.dungeon), map: toAutoMapView(state.dungeon) } : null,
    battle: toBattleView(state),
    clear: state.location === 'CLEARED' ? { autoSaved: opts.autoSaved ?? state.saveSlot !== null } : null,
    saveSlot: state.saveSlot,
    pendingDrop: state.location === 'SWAP' && state.inventory.pending ? toItemView(state.inventory.pending.item) : null,
    canHeal: state.location === 'DUNGEON' && state.mp >= HEAL.mpCost,
  };
}
