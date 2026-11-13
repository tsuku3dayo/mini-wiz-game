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
  /** 出るレアリティ（低い方 80%, 高い方 20%）。段階 8 は LG だけ（仕様書 §8.3。v1.21） */
  rarities: readonly Rarity[];
  /** rarities と同じ順の補正値の範囲 [lo, hi]（仕様書 §8.2。v1.21） */
  ranges: readonly (readonly [number, number])[];
}

export const SLOTS: readonly Slot[] = ['weapon', 'armor', 'shield', 'accessory'];
/** 並び（近さの判定に使う）：N → R → SR → UR → LG */
export const RARITIES: readonly Rarity[] = ['N', 'R', 'SR', 'UR', 'LG'];
export const RARITY_ORDER: Readonly<Record<Rarity, number>> = { N: 0, R: 1, SR: 2, UR: 3, LG: 4 };
/** 段階ごとに出るレアリティ（低い方, 高い方）。段階 8 は LG だけ。種類の rarities の既定（ガードリングだけ例外） */
const TIER_RARITIES: Readonly<Record<number, readonly Rarity[]>> = {
  1: ['N', 'R'], 2: ['N', 'R'], 3: ['N', 'R'],
  4: ['R', 'SR'], 5: ['R', 'SR'],
  6: ['SR', 'UR'], 7: ['SR', 'UR'],
  8: ['LG'],
};
export const HIGH_RARITY_FROM = 81;
export const INVENTORY_CAPACITY = 50;

const item = (slot: Slot, tier: number, name: string, stats: readonly StatKey[], ranges: readonly (readonly [number, number])[], rarities: readonly Rarity[] = TIER_RARITIES[tier]): ItemMaster =>
  ({ slot, tier, name, stats, rarities, ranges });

/** 装備のマスタ 32 種（仕様書 §8.2。v1.21 で補正値をレアリティごとの範囲に改めた） */
export const ITEMS: Readonly<Record<ItemId, ItemMaster>> = {
  weapon1: item('weapon', 1, 'ショートソード', ['attack'], [[1, 2], [3, 4]]),
  weapon2: item('weapon', 2, 'スピア', ['attack'], [[3, 4], [5, 6]]),
  weapon3: item('weapon', 3, 'バトルアックス', ['attack'], [[5, 8], [9, 12]]),
  weapon4: item('weapon', 4, 'ロングソード', ['attack'], [[8, 12], [13, 18]]),
  weapon5: item('weapon', 5, 'バスタードソード', ['attack'], [[10, 15], [16, 21]]),
  weapon6: item('weapon', 6, 'ミスリルソード', ['attack'], [[18, 24], [25, 33]]),
  weapon7: item('weapon', 7, 'ムラサメブレード', ['attack'], [[22, 30], [31, 40]]),
  weapon8: item('weapon', 8, 'エクスカリバー', ['attack'], [[40, 68]]),
  armor1: item('armor', 1, 'クロースアーマー', ['defense'], [[1, 2], [3, 4]]),
  armor2: item('armor', 2, 'レザーアーマー', ['defense'], [[2, 4], [5, 6]]),
  armor3: item('armor', 3, 'チェインメイル', ['defense'], [[4, 6], [7, 10]]),
  armor4: item('armor', 4, 'プレートメイル', ['defense'], [[7, 9], [10, 13]]),
  armor5: item('armor', 5, 'ナイトアーマー', ['defense'], [[9, 13], [14, 18]]),
  armor6: item('armor', 6, 'ミスリルメイル', ['defense'], [[15, 21], [22, 29]]),
  armor7: item('armor', 7, 'ドラゴンメイル', ['defense'], [[19, 25], [26, 34]]),
  armor8: item('armor', 8, 'オリハルコンアーマー', ['defense'], [[35, 60]]),
  shield1: item('shield', 1, 'ウッドシールド', ['evasion'], [[1, 2], [3, 4]]),
  shield2: item('shield', 2, 'レザーシールド', ['evasion'], [[2, 3], [4, 6]]),
  shield3: item('shield', 3, 'アイアンシールド', ['evasion'], [[3, 4], [5, 6]]),
  shield4: item('shield', 4, 'カイトシールド', ['evasion'], [[4, 7], [8, 11]]),
  shield5: item('shield', 5, 'ナイトシールド', ['evasion'], [[6, 8], [9, 12]]),
  shield6: item('shield', 6, 'ミスリルシールド', ['evasion'], [[10, 13], [14, 18]]),
  shield7: item('shield', 7, 'ドラゴンシールド', ['evasion'], [[12, 16], [17, 23]]),
  shield8: item('shield', 8, 'イージス', ['evasion'], [[23, 35]]),
  accessory1: item('accessory', 1, 'ライフアミュレット', ['maxHp'], [[2, 4], [5, 7]]),
  accessory2: item('accessory', 2, 'マナブレスレット', ['maxMp'], [[1, 2], [3, 4]]),
  // ガードリングだけ、段階 3 でも R／SR で出る（仕様書 §8.3。v1.21）
  accessory3: item('accessory', 3, 'ガードリング', ['defense'], [[4, 7], [8, 11]], ['R', 'SR']),
  accessory4: item('accessory', 4, 'パワーリング', ['attack'], [[8, 12], [13, 18]]),
  accessory5: item('accessory', 5, 'ウィンドブーツ', ['evasion'], [[4, 7], [8, 11]]),
  accessory6: item('accessory', 6, 'ミスリルアンクレット', ['defense'], [[15, 21], [22, 29]]),
  accessory7: item('accessory', 7, 'ドラゴンハート', ['attack'], [[18, 24], [25, 33]]),
  // ソロモンのゆびわだけ、同じ補正値を こうげき・ぼうぎょ・かいひ の 3 つに足す（仕様書 §8.2。v1.21）
  accessory8: item('accessory', 8, 'ソロモンのゆびわ', ['attack', 'defense', 'evasion'], [[25, 33]]),
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

/** 補正値の範囲 [lo, hi]（その種類で出ないレアリティなら、いちばん近い出るものの範囲） */
export function valueRange(itemId: ItemId, rarity: Rarity): [number, number] {
  const m = ITEMS[itemId];
  const i = m.rarities.indexOf(rarity);
  const [lo, hi] = m.ranges[i >= 0 ? i : m.rarities.indexOf(nearestRarity(itemId, rarity))];
  return [lo, hi];
}

/** その種類で出るレアリティのうち、N→LG の並びで最も近いもの。距離が同じなら低い方（rarities の先） */
function nearestRarity(itemId: ItemId, rarity: Rarity): Rarity {
  const allowed = ITEMS[itemId].rarities;
  if (allowed.includes(rarity)) return rarity;
  const distance = (r: Rarity) => Math.abs(RARITY_ORDER[r] - RARITY_ORDER[rarity]);
  return allowed.reduce((best, r) => (distance(r) < distance(best) ? r : best));
}

/** 古い個体を種類の出るレアリティと範囲に合わせる。乱数なし・冪等（仕様書 §8.3。v1.21 で倍率の換算をやめた） */
export function conformItem(i: ItemInstance): ItemInstance {
  const rarity = nearestRarity(i.itemId, i.rarity);
  const [lo, hi] = valueRange(i.itemId, rarity);
  const value = Math.min(hi, Math.max(lo, i.value));
  return rarity === i.rarity && value === i.value ? i : { ...i, rarity, value };
}
