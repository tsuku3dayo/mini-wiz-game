// 装備の表示文字列（仕様書 §8.7「アイテムの表示文字列」、§11.7「ItemLabel」）
import type { ItemView, Rarity, Slot, StatKey } from '../api/types';

export const STAT_NAMES: Readonly<Record<StatKey, string>> = {
  attack: 'こうげき', defense: 'ぼうぎょ', speed: 'すばやさ', maxHp: 'さいだいHP', maxMp: 'さいだいMP',
};
/** のうりょくの行の並び */
export const STAT_ORDER: readonly StatKey[] = ['attack', 'defense', 'speed', 'maxHp', 'maxMp'];

export const SLOT_NAMES: Readonly<Record<Slot, string>> = {
  weapon: 'ぶき', armor: 'よろい', shield: 'たて', accessory: 'アクセ',
};
/** 枠の一覧・しぼりこみの並び */
export const SLOT_ORDER: readonly Slot[] = ['weapon', 'armor', 'shield', 'accessory'];

/** 読み上げのランク名 */
export const RARITY_SPOKEN: Readonly<Record<Rarity, string>> = {
  N: 'ノーマル', R: 'レア', SR: 'エスアール', UR: 'ユーアール', LG: 'レジェンド',
};

type ItemLike = Pick<ItemView, 'name' | 'rarity' | 'stats' | 'value'>;

/** 「バトルアックス［SR］」 */
export function itemName(i: Pick<ItemView, 'name' | 'rarity'>): string {
  return `${i.name}［${i.rarity}］`;
}

/** 能力ごとの「こうげき +10」 */
export function bonusTexts(i: Pick<ItemView, 'stats' | 'value'>): string[] {
  return i.stats.map((s) => `${STAT_NAMES[s]} +${i.value}`);
}

/** 「バトルアックス［SR］ こうげき +10」 */
export function itemText(i: ItemLike): string {
  return [itemName(i), ...bonusTexts(i)].join(' ');
}

/** 「バトルアックス、エスアール、こうげき プラス 10」 */
export function itemSpoken(i: ItemLike): string {
  return [i.name, RARITY_SPOKEN[i.rarity], ...i.stats.map((s) => `${STAT_NAMES[s]} プラス ${i.value}`)].join('、');
}
