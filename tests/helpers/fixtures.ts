// テスト用の状態の見本
import type { GameStateData, ItemInstance, Location } from '../../src/domain/game-state';
import type { ItemId, Rarity } from '../../src/domain/items';
import { emptyInventory } from '../../src/domain/loot';
import { initialRecords } from '../../src/domain/records';
import { openMap } from './maps';

export const LOCATIONS: readonly Location[] = ['INN', 'DUNGEON', 'BATTLE', 'SWAP', 'CLEARED'];

export function makeItem(id: number, itemId: ItemId, rarity: Rarity, value: number): ItemInstance {
  return { id, itemId, rarity, value };
}

/** 場所ごとの状態。名前「ゆうしゃ」、Lv1 の初期値から overrides で変える */
export function makeState(location: Location = 'INN', overrides: Partial<GameStateData> = {}): GameStateData {
  const withDungeon = location === 'DUNGEON' || location === 'BATTLE' || location === 'SWAP';
  const inventory = emptyInventory();
  if (location === 'SWAP') {
    inventory.pending = { item: makeItem(1, 'weapon1', 'N', 1), thenClear: false };
    inventory.nextId = 2;
  }
  return {
    name: 'ゆうしゃ',
    level: 1,
    exp: 0,
    hp: 30,
    maxHp: 30,
    mp: 10,
    maxMp: 10,
    attack: 5,
    defense: 5,
    speed: 5,
    location,
    dungeon: withDungeon ? openMap() : null,
    battle: location === 'BATTLE' ? { enemy: { kind: 'slime', hp: 12 }, isBoss: false } : null,
    inventory,
    records: initialRecords(),
    saveSlot: null,
    ...overrides,
  };
}
