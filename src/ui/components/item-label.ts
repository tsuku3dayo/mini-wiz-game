// ItemLabel：装備 1 個体の 1 行表示（仕様書 §8.7、§11.7）
// ［部位］（任意・副文字色）→ 名前［ランク］（レアリティの色）→ 補正（能力ごとに別の要素、途中で折り返さない）
// 表示部分は aria-hidden。読み上げ用の文を見た目で隠して置く
import type { ItemView } from '../../api/types';
import { bonusTexts, itemName, itemSpoken, SLOT_NAMES } from '../../logic/item-text';
import { el } from '../dom';

export function itemLabel(opts: { item: ItemView; showSlot?: boolean }): HTMLElement {
  const { item } = opts;
  const shown = el('span', { class: 'wiz-item-shown', 'aria-hidden': 'true' },
    opts.showSlot ? el('span', { class: 'wiz-item-slot' }, `［${SLOT_NAMES[item.slot]}］`) : null,
    el('span', { class: `wiz-item-name rarity-${item.rarity.toLowerCase()}` }, itemName(item)),
    ...bonusTexts(item).map((t) => el('span', { class: 'wiz-item-bonus' }, t)));
  const spoken = el('span', { class: 'visually-hidden' }, (opts.showSlot ? `${SLOT_NAMES[item.slot]}、` : '') + itemSpoken(item));
  return el('span', { class: 'wiz-item-label', 'data-testid': 'item-label', 'data-item-id': item.id }, shown, spoken);
}
