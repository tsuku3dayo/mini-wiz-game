// 装備込みの能力値・付け替え・はずす・捨てる（仕様書 §8.5）
import { InvalidStateError, RuleViolationError } from './errors';
import { assertLocation, type GameStateData, type InventoryData, type ItemInstance, type StepResult } from './game-state';
import { INVENTORY_CAPACITY, ITEMS, SLOTS, type Slot, type StatKey } from './items';

export type Stats = Record<StatKey, number>;

/** 4 枠それぞれについて、その種類の stats の各能力に value を足した合計 */
export function equipmentBonus(inv: InventoryData): Stats {
  const bonus: Stats = { attack: 0, defense: 0, speed: 0, evasion: 0, maxHp: 0, maxMp: 0 };
  for (const slot of SLOTS) {
    const it = inv.equipped[slot];
    if (!it) continue;
    for (const stat of ITEMS[it.itemId].stats) bonus[stat] += it.value;
  }
  return bonus;
}

/** 実効値 = 基礎値 + 装備の補正。かいひ は 素早さの実効値 ＋ たての補正（v1.16。TD-0002 §1.8） */
export function effectiveStats(state: GameStateData): Stats {
  const b = equipmentBonus(state.inventory);
  const speed = state.speed + b.speed;
  return {
    attack: state.attack + b.attack,
    defense: state.defense + b.defense,
    speed,
    evasion: speed + b.evasion,
    maxHp: state.maxHp + b.maxHp,
    maxMp: state.maxMp + b.maxMp,
  };
}

/** 「名前［R］」 */
export function itemLabel(i: Pick<ItemInstance, 'itemId' | 'rarity'>): string {
  return `${ITEMS[i.itemId].name}［${i.rarity}］`;
}

/** 付け替え・はずすのあと、今の HP・MP を新しい上限に切り詰める（HP は最低 1。上限が上がっても増やさない） */
function clampToMax(state: GameStateData): GameStateData {
  const eff = effectiveStats(state);
  return { ...state, hp: Math.max(1, Math.min(state.hp, eff.maxHp)), mp: Math.min(state.mp, eff.maxMp) };
}

/** 所持品からその ID の個体を探す。なければ「その もちものは ない」（装備中の ID も所持品にない） */
function findOwned(inv: InventoryData, id: number): ItemInstance {
  const it = inv.items.find((i) => i.id === id);
  if (!it) throw new RuleViolationError('その もちものは ない');
  return it;
}

/** 付け替え：選んだ個体を装備に入れ、前の個体があれば所持品の末尾に戻す（個数は変わらないので満杯でもできる） */
export function equip(state: GameStateData, itemId: number): StepResult {
  assertLocation(state, 'INN', 'DUNGEON');
  const inv = state.inventory;
  const it = findOwned(inv, itemId);
  const slot = ITEMS[it.itemId].slot;
  const before = inv.equipped[slot];
  const items = inv.items.filter((i) => i.id !== it.id);
  if (before) items.push(before);
  const next = clampToMax({ ...state, inventory: { ...inv, equipped: { ...inv.equipped, [slot]: it }, items } });
  return { state: next, messages: [{ text: `${itemLabel(it)}を そうびした`, tone: 'normal' }] };
}

/** はずす：所持品の末尾へ。空き枠・所持品が満杯ならできない */
export function unequip(state: GameStateData, slot: Slot): StepResult {
  assertLocation(state, 'INN', 'DUNGEON');
  const inv = state.inventory;
  const it = inv.equipped[slot];
  if (!it) throw new RuleViolationError('なにも そうびしていない');
  if (inv.items.length >= INVENTORY_CAPACITY) throw new RuleViolationError('もちものが いっぱいで はずせない');
  const next = clampToMax({ ...state, inventory: { ...inv, equipped: { ...inv.equipped, [slot]: null }, items: [...inv.items, it] } });
  return { state: next, messages: [{ text: `${itemLabel(it)}を はずした`, tone: 'normal' }] };
}

/** 捨てる：所持品から取り除く（装備に関係しないので HP・MP は切り詰めない） */
export function discard(state: GameStateData, itemId: number): StepResult {
  assertLocation(state, 'INN', 'DUNGEON');
  const inv = state.inventory;
  const it = findOwned(inv, itemId);
  return {
    state: { ...state, inventory: { ...inv, items: inv.items.filter((i) => i.id !== it.id) } },
    messages: [{ text: `${itemLabel(it)}を すてた`, tone: 'normal' }],
  };
}

/** 場所が SWAP で入れ替え待ちがあるか（なければ 409） */
export function assertPending(state: GameStateData): NonNullable<InventoryData['pending']> {
  assertLocation(state, 'SWAP');
  const p = state.inventory.pending;
  if (!p) throw new InvalidStateError();
  return p;
}
