// 装備のマスタ・レアリティ（仕様書 §8.2、§8.3、§24.4）
import type { ItemInstance } from './game-state';

export type Slot = 'weapon' | 'armor' | 'shield' | 'accessory';
export type StatKey = 'attack' | 'defense' | 'speed' | 'evasion' | 'maxHp' | 'maxMp';
export type Rarity = 'N' | 'R' | 'SR' | 'UR' | 'LG';
type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type ItemId = `${Slot}${Tier}`;

export interface ItemMaster {
  slot: Slot;
  tier: number;
  name: string;
  stats: readonly StatKey[]; // 先頭が主な能力
  min: number;
  max: number;
}

export const SLOTS: readonly Slot[] = ['weapon', 'armor', 'shield', 'accessory'];
/** 並び（近さの判定に使う）：N → R → SR → UR → LG */
export const RARITIES: readonly Rarity[] = ['N', 'R', 'SR', 'UR', 'LG'];
export const RARITY_ORDER: Readonly<Record<Rarity, number>> = { N: 0, R: 1, SR: 2, UR: 3, LG: 4 };
/** 倍率×10（浮動小数の誤差を避けるため整数で持つ） */
export const RARITY_MULTIPLIER: Readonly<Record<Rarity, number>> = { N: 10, R: 12, SR: 15, UR: 20, LG: 30 };
/** 段階ごとに出るレアリティ（低い方, 高い方）。段階 8 は LG だけ */
export const RARITY_BY_TIER: Readonly<Record<number, readonly Rarity[]>> = {
  1: ['N', 'R'], 2: ['N', 'R'], 3: ['N', 'R'],
  4: ['R', 'SR'], 5: ['R', 'SR'],
  6: ['SR', 'UR'], 7: ['SR', 'UR'],
  8: ['LG'],
};
export const HIGH_RARITY_FROM = 81;
export const INVENTORY_CAPACITY = 50;

const item = (slot: Slot, tier: number, name: string, stats: readonly StatKey[], min: number, max: number): ItemMaster =>
  ({ slot, tier, name, stats, min, max });

export const ITEMS: Readonly<Record<ItemId, ItemMaster>> = {
  weapon1: item('weapon', 1, 'ショートソード', ['attack'], 1, 2),
  weapon2: item('weapon', 2, 'スピア', ['attack'], 3, 4),
  weapon3: item('weapon', 3, 'バトルアックス', ['attack'], 5, 8),
  weapon4: item('weapon', 4, 'ロングソード', ['attack'], 7, 10),
  weapon5: item('weapon', 5, 'バスタードソード', ['attack'], 9, 13),
  weapon6: item('weapon', 6, 'ミスリルソード', ['attack'], 12, 16),
  weapon7: item('weapon', 7, 'ムラサメブレード', ['attack'], 15, 20),
  weapon8: item('weapon', 8, 'エクスカリバー', ['attack'], 20, 26),
  armor1: item('armor', 1, 'クロースアーマー', ['defense'], 1, 2),
  armor2: item('armor', 2, 'レザーアーマー', ['defense'], 2, 4),
  armor3: item('armor', 3, 'チェインメイル', ['defense'], 4, 6),
  armor4: item('armor', 4, 'プレートメイル', ['defense'], 6, 8),
  armor5: item('armor', 5, 'ナイトアーマー', ['defense'], 8, 11),
  armor6: item('armor', 6, 'ミスリルメイル', ['defense'], 10, 14),
  armor7: item('armor', 7, 'ドラゴンメイル', ['defense'], 13, 17),
  armor8: item('armor', 8, 'オリハルコンアーマー', ['defense'], 17, 22),
  shield1: item('shield', 1, 'ウッドシールド', ['evasion'], 1, 2),
  shield2: item('shield', 2, 'レザーシールド', ['evasion'], 2, 3),
  shield3: item('shield', 3, 'アイアンシールド', ['evasion'], 3, 4),
  shield4: item('shield', 4, 'カイトシールド', ['evasion'], 4, 6),
  shield5: item('shield', 5, 'ナイトシールド', ['evasion'], 5, 7),
  shield6: item('shield', 6, 'ミスリルシールド', ['evasion'], 7, 9),
  shield7: item('shield', 7, 'ドラゴンシールド', ['evasion'], 8, 11),
  shield8: item('shield', 8, 'イージス', ['evasion'], 11, 14),
  accessory1: item('accessory', 1, 'ガードリング', ['defense'], 1, 3),
  accessory2: item('accessory', 2, 'パワーリング', ['attack'], 1, 3),
  accessory3: item('accessory', 3, 'ウィンドブーツ', ['speed'], 2, 4),
  accessory4: item('accessory', 4, 'ライフアミュレット', ['maxHp'], 10, 20),
  accessory5: item('accessory', 5, 'マナブレスレット', ['maxMp'], 4, 8),
  accessory6: item('accessory', 6, 'ミスリルアンクレット', ['defense'], 3, 5),
  accessory7: item('accessory', 7, 'ドラゴンハート', ['attack'], 3, 5),
  // ソロモンのゆびわだけ、同じ補正値を こうげき・ぼうぎょ の両方に足す（仕様書 §8.2）
  accessory8: item('accessory', 8, 'ソロモンのゆびわ', ['attack', 'defense'], 5, 8),
};

const STAT_NAMES: Readonly<Record<StatKey, string>> = {
  attack: 'こうげき', defense: 'ぼうぎょ', speed: 'すばやさ', evasion: 'かいひ', maxHp: 'さいだいHP', maxMp: 'さいだいMP',
};

export function statName(stat: StatKey): string {
  return STAT_NAMES[stat];
}

/** 32 種のどれかか */
export function isItemId(v: unknown): v is ItemId {
  return typeof v === 'string' && Object.hasOwn(ITEMS, v);
}

export function isRarity(v: unknown): v is Rarity {
  return typeof v === 'string' && (RARITIES as readonly string[]).includes(v);
}

/** 補正値の範囲 [floor(min×k/10), floor(max×k/10)] */
export function valueRange(itemId: ItemId, rarity: Rarity): [number, number] {
  const { min, max } = ITEMS[itemId];
  const k = RARITY_MULTIPLIER[rarity];
  return [Math.floor((min * k) / 10), Math.floor((max * k) / 10)];
}

/** 古い個体を段階のレアリティ表と範囲に合わせる。乱数なし・冪等（仕様書 §8.3） */
export function conformItem(i: ItemInstance): ItemInstance {
  const allowed = RARITY_BY_TIER[ITEMS[i.itemId].tier];
  let { rarity, value } = i;
  if (!allowed.includes(rarity)) {
    // N→LG の並びで最も近いもの。距離が同じなら低い方（allowed の先）を採る
    const distance = (r: Rarity) => Math.abs(RARITY_ORDER[r] - RARITY_ORDER[i.rarity]);
    const next = allowed.reduce((best, r) => (distance(r) < distance(best) ? r : best));
    value = Math.floor((value * RARITY_MULTIPLIER[next]) / RARITY_MULTIPLIER[rarity]);
    rarity = next;
  }
  const [lo, hi] = valueRange(i.itemId, rarity);
  value = Math.min(hi, Math.max(lo, value));
  return rarity === i.rarity && value === i.value ? i : { ...i, rarity, value };
}
