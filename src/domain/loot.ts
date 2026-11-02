// ドロップ・所持品（仕様書 §8.4、§8.5）
// 抽選・追加・勝利時の反映は、戦闘に勝つ処理の中で乱数を引く順が決まっているので TASK-0010 で前倒しした（TD-0002 v1.5 §5）。
// 入れ替え（takeLoot・abandonLoot）は TASK-0014 で足す
import type { EnemyKind } from './constants';
import type { GameStateData, InventoryData, ItemInstance, Location, Message } from './game-state';
import { HIGH_RARITY_FROM, INVENTORY_CAPACITY, ITEMS, RARITY_BY_TIER, RARITY_MULTIPLIER, SLOTS, statName, type ItemId } from './items';
import type { Rng } from './rng';

export type Drop = Omit<ItemInstance, 'id'>;

export interface DropRule {
  rate: number; // 百分率
  tiers: [number, number]; // [最小, 最大]
  special?: { pct: number; tier: number };
}

/** ドロップ表（敵の種類だけで決まる。仕様書 §8.4） */
export const DROPS: Readonly<Record<EnemyKind, DropRule>> = {
  slime: { rate: 15, tiers: [1, 1] },
  goblin: { rate: 20, tiers: [1, 2] },
  skeleton: { rate: 25, tiers: [2, 3] },
  orc: { rate: 30, tiers: [3, 5] },
  darkKnight: { rate: 35, tiers: [5, 7], special: { pct: 5, tier: 8 } },
  necromancer: { rate: 100, tiers: [8, 8] },
};

/** 空の所持品（装備なし・持ち物なし・nextId 1） */
export function emptyInventory(): InventoryData {
  return {
    equipped: { weapon: null, armor: null, shield: null, accessory: null },
    items: [],
    nextId: 1,
    pending: null,
  };
}

/**
 * ドロップの抽選（乱数を引く順：落とすか → 特例 → 部位 → 段階 → レアリティ → 補正値の元）。
 * 落とさなければ null（以降の乱数は引かない）
 */
export function rollDrop(kind: EnemyKind, rng: Rng): Drop | null {
  const rule = DROPS[kind];
  if (rng.int(1, 100) > rule.rate) return null;
  let tier: number | null = null;
  if (rule.special && rng.int(1, 100) <= rule.special.pct) tier = rule.special.tier;
  const slot = SLOTS[rng.int(0, 3)];
  // 特例で段階が決まったときは、段階の乱数を引かない（ボスは 8〜8 でも 1 回引く）
  if (tier === null) tier = rng.int(rule.tiers[0], rule.tiers[1]);
  const choices = RARITY_BY_TIER[tier];
  const roll = rng.int(1, 100);
  const rarity = choices[roll >= HIGH_RARITY_FROM && choices.length > 1 ? 1 : 0];
  const itemId = `${slot}${tier}` as ItemId;
  const { min, max } = ITEMS[itemId];
  const value = Math.floor((rng.int(min, max) * RARITY_MULTIPLIER[rarity]) / 10);
  return { itemId, rarity, value };
}

/** ID を振り（所持品に入るかどうかにかかわらず nextId を進める）、空きがあれば末尾に加える */
export function addItem(inv: InventoryData, drop: Drop): { inv: InventoryData; item: ItemInstance; added: boolean } {
  const item: ItemInstance = { id: inv.nextId, ...drop };
  const next = { ...inv, nextId: inv.nextId + 1 };
  if (inv.items.length >= INVENTORY_CAPACITY) return { inv: next, item, added: false };
  return { inv: { ...next, items: [...inv.items, item] }, item, added: true };
}

/** ドロップの行：「{敵}は {名前}［{ランク}］（{能力} +{値}）を おとした！」。UR・LG は rareDrop */
export function dropMessage(enemyName: string, item: Drop): Message {
  const m = ITEMS[item.itemId];
  const bonus = m.stats.map((s) => `${statName(s)} +${item.value}`).join(' ');
  const text = `${enemyName}は ${m.name}［${item.rarity}］（${bonus}）を おとした！`;
  return item.rarity === 'UR' || item.rarity === 'LG'
    ? { text, tone: 'normal', rarity: item.rarity, effect: 'rareDrop' }
    : { text, tone: 'normal', rarity: item.rarity };
}

/** 勝利時の反映：落とさなければ next へ。空きがあれば加えて next へ、満杯なら SWAP（入れ替え待ち） */
export function applyDrop(state: GameStateData, enemyName: string, drop: Drop | null, next: Location): { state: GameStateData; messages: Message[] } {
  if (!drop) return { state: { ...state, location: next }, messages: [] };
  const r = addItem(state.inventory, drop);
  const messages = [dropMessage(enemyName, drop)];
  if (r.added) return { state: { ...state, location: next, inventory: r.inv }, messages };
  return {
    state: { ...state, location: 'SWAP', inventory: { ...r.inv, pending: { item: r.item, thenClear: next === 'CLEARED' } } },
    messages,
  };
}
