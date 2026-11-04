// 装備の並び順（仕様書 §8.6）。表示だけで並べ替え、ゲーム API の並び（新しい順）は変えない
import type { ItemView } from '../api/types';

export type ItemOrder = 'strong' | 'weak';

export const ORDER_LABELS: Readonly<Record<ItemOrder, string>> = { strong: 'つよい じゅん', weak: 'よわい じゅん' };

type Sortable = Pick<ItemView, 'id' | 'itemId' | 'name' | 'value'>;

/** 段階（itemId の末尾の数字） */
export function itemTier(i: Pick<ItemView, 'itemId'>): number {
  const m = /(\d+)$/.exec(i.itemId);
  return m ? Number(m[1]) : 0;
}

/**
 * 強い順：段階の高い順 → 補正値の大きい順 → 名前の五十音順 → id の大きい順。
 * 弱い順：前の 3 つを逆にし、id の大きい順はそのまま。レアリティは比べない
 */
export function compareItems(order: ItemOrder): (a: Sortable, b: Sortable) => number {
  const sign = order === 'strong' ? 1 : -1;
  return (a, b) => {
    const byStrength = (itemTier(b) - itemTier(a)) || (b.value - a.value) || a.name.localeCompare(b.name, 'ja');
    return byStrength * sign || (b.id - a.id);
  };
}

/** 並べたコピーを返す（入力の配列は変えない） */
export function sortItems<T extends Sortable>(items: readonly T[], order: ItemOrder): T[] {
  return [...items].sort(compareItems(order));
}
