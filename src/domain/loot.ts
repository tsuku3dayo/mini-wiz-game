// ドロップ・所持品（仕様書 §8.4、§8.5）
// 抽選・追加・入れ替えは TASK-0014 で足す
import type { InventoryData } from './game-state';

/** 空の所持品（装備なし・持ち物なし・nextId 1） */
export function emptyInventory(): InventoryData {
  return {
    equipped: { weapon: null, armor: null, shield: null, accessory: null },
    items: [],
    nextId: 1,
    pending: null,
  };
}
