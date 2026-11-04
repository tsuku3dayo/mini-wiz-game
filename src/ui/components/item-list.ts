// ItemList：しぼりこみ付きの装備の一覧（仕様書 §8.7「一覧」、§11.7）。もちもの画面と入れ替えの画面で使う
// 上部：［◀］ しぼりこみ名 ［▶］ 並び順の表示。その下に CommandMenu（先頭は もどる）
// 高さは 8 行分（416px）でスクロール。狭い画面では画面に合わせる（fitItemList。TD-0003 §6）
import type { ItemView, Slot } from '../../api/types';
import { SLOT_NAMES, SLOT_ORDER } from '../../logic/item-text';
import { ORDER_LABELS, sortItems, type ItemOrder } from '../../logic/sort-items';
import { el, isWide } from '../dom';
import { commandMenu, type CommandMenu, type MenuItem } from './command-menu';
import { itemLabel } from './item-label';

export type ItemFilter = 'all' | Slot;

/**
 * 一覧の高さ（TD-0003 §6 の fitItemList）。ページが縦にはみ出さない高さにする（4 行分より小さくしない）。
 * 広い画面は 8 行分を上限にする。装備画面の候補の一覧でも使う
 */
export function fitItemList(list: HTMLElement): void {
  if (!list.isConnected) return;
  const over = () => document.documentElement.scrollHeight - window.innerHeight;
  const cap = isWide() ? WIDE_LIST_PX : 9999;
  list.style.maxHeight = `${cap}px`;
  const o = over();
  if (o <= 0) return;
  // 高さの端数で 1px はみ出すことがあるので、切り捨ててから、残りをもう一度引く
  list.style.maxHeight = `${Math.max(MIN_LIST_PX, Math.floor(list.getBoundingClientRect().height - o))}px`;
  const rest = over();
  if (rest > 0) list.style.maxHeight = `${Math.max(MIN_LIST_PX, Math.floor(list.getBoundingClientRect().height - rest))}px`;
}

const FILTERS: readonly ItemFilter[] = ['all', ...SLOT_ORDER];
const FILTER_NAMES: Readonly<Record<ItemFilter, string>> = { all: 'すべて', ...SLOT_NAMES };
/** 1 行の高さ（44px＋上下 4px）と、広い画面の一覧の高さ（8 行） */
const ROW_PX = 52;
const WIDE_LIST_PX = 8 * ROW_PX;
/** 狭い画面で縮めてよい下限（4 行分） */
const MIN_LIST_PX = 4 * ROW_PX;

export interface ItemListOptions {
  items: readonly ItemView[];
  order: ItemOrder;
  /** 初めのしぼりこみ（既定は すべて） */
  filter?: ItemFilter;
  /** 初めのカーソルを置く個体（なければ もどる の次） */
  initialItemId?: number | null;
  disabled?: boolean;
  onSelect: (item: ItemView) => void;
  onBack: () => void;
  onFilterChange?: (filter: ItemFilter) => void;
}

export interface ItemList {
  el: HTMLElement;
  menu: CommandMenu;
  readonly filter: ItemFilter;
  update(next: { items?: readonly ItemView[]; disabled?: boolean }): void;
  destroy(): void;
}

export function itemList(opts: ItemListOptions): ItemList {
  let items = opts.items;
  let filter: ItemFilter = opts.filter ?? 'all';
  let disabled = !!opts.disabled;

  const visible = () => sortItems(filter === 'all' ? items : items.filter((i) => i.slot === filter), opts.order);
  const menuItems = (list: ItemView[]): MenuItem[] => [
    { label: 'もどる', onSelect: opts.onBack },
    ...list.map((item) => ({ label: itemLabel({ item, showSlot: filter === 'all' }), onSelect: () => opts.onSelect(item) })),
  ];

  const filterButton = (dir: -1 | 1) => {
    const b = el('button', {
      class: 'wiz-button wiz-filter-button',
      type: 'button',
      tabindex: -1,
      'aria-label': dir < 0 ? 'まえの しぼりこみ' : 'つぎの しぼりこみ',
    }, dir < 0 ? '◀' : '▶');
    b.addEventListener('click', () => shift(dir));
    return b;
  };
  const name = el('span', { class: 'wiz-filter-name', 'aria-live': 'polite', 'data-testid': 'filter-name' }, FILTER_NAMES[filter]);
  const head = el('div', { class: 'wiz-item-filter' },
    filterButton(-1), name, filterButton(1),
    el('span', { class: 'wiz-order-label' }, ORDER_LABELS[opts.order]));
  const empty = el('p', { class: 'wiz-item-empty' }, 'なにも もっていない');

  const first = visible();
  const at = opts.initialItemId == null ? -1 : first.findIndex((i) => i.id === opts.initialItemId);
  const menu = commandMenu({
    label: 'もちもの',
    items: menuItems(first),
    initialIndex: at >= 0 ? at + 1 : first.length > 0 ? 1 : 0,
    autoFocus: !disabled,
    trapFocus: true,
    onCancel: opts.onBack,
    maxHeight: `${WIDE_LIST_PX}px`,
    disabled,
  });
  const root = el('div', { class: 'wiz-item-list' }, head, empty, menu.el);

  function draw(list: ItemView[]) {
    empty.hidden = list.length > 0;
    name.textContent = FILTER_NAMES[filter];
    scheduleFit();
  }

  /** しぼりこみを前・次に替え、メニューを作り直す（カーソルは もどる の次） */
  function shift(dir: -1 | 1) {
    if (disabled) return;
    filter = FILTERS[(FILTERS.indexOf(filter) + dir + FILTERS.length) % FILTERS.length];
    const list = visible();
    menu.update({ items: menuItems(list) });
    draw(list);
    menu.setCursor(list.length > 0 ? 1 : 0, true);
    opts.onFilterChange?.(filter);
  }

  // 一覧にフォーカスがあるとき、← → でしぼりこみを替える
  menu.el.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      shift(e.key === 'ArrowLeft' ? -1 : 1);
    }
  });

  let frame = 0;
  function scheduleFit() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fitItemList(menu.el));
  }
  window.addEventListener('resize', scheduleFit);
  draw(first);

  return {
    el: root,
    menu,
    get filter() { return filter; },
    update(next) {
      if (next.disabled !== undefined) disabled = next.disabled;
      if (next.items) {
        items = next.items;
        const list = visible();
        menu.update({ items: menuItems(list), disabled });
        draw(list);
      } else {
        menu.update({ disabled });
      }
    },
    destroy() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleFit);
      menu.destroy();
      root.remove();
    },
  };
}
