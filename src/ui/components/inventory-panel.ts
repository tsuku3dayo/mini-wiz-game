// InventoryPanel：もちもの画面（画面名「もちもの」。仕様書 §8.7「もちもの画面」、§11.7、GUI-0006 §2、TD-0004 §7）
// ウィンドウ「もちもの」：「もちもの 23／50」→ ItemList（よわい じゅん）。個体を選ぶとウィンドウを確認に替える
// メッセージ欄は置かない。結果の文はキューに入る（command が入れる）。続けられないエラーは一番下に ErrorPanel
import type { InventoryView, ItemView } from '../../api/types';
import { itemName } from '../../logic/item-text';
import { el } from '../dom';
import { confirmMenu } from './confirm-menu';
import type { PanelDeps } from './equipment-panel';
import { errorPanel } from './error-panel';
import { gameFrame } from './game-frame';
import { gameWindow } from './game-window';
import { itemList, type ItemFilter, type ItemList } from './item-list';

/** 「もちもの 23／50」。満杯なら末尾に「！」 */
export function countLine(inv: Pick<InventoryView, 'count' | 'capacity'>): HTMLElement {
  const full = inv.count >= inv.capacity;
  return el('p', { class: 'wiz-item-count', 'data-full': full ? 'true' : null, 'data-testid': 'item-count' },
    `もちもの ${inv.count}／${inv.capacity}${full ? '！' : ''}`);
}

export function inventoryPanel(deps: PanelDeps): { el: HTMLElement; destroy(): void } {
  const { store, api, command } = deps;

  // 画面に固有の状態
  let filter: ItemFilter = 'all';
  /** 確認の対象（null なら一覧） */
  let target: ItemView | null = null;
  /** 一覧に戻ったときにカーソルを置く個体 */
  let returnId: number | null = null;

  let list: ItemList | null = null;
  let confirm: ReturnType<typeof confirmMenu> | null = null;
  let panel: { el: HTMLElement; destroy(): void } | null = null;
  const windowSlot = el('div', { class: 'inventory-slot' });
  const errorSlot = el('div', { class: 'item-screen-error' });
  const frame = gameFrame({ name: 'もちもの' }, windowSlot, errorSlot);

  const locked = () => command.locked || command.fatal !== null;

  function draw() {
    const state = store.game.state;
    if (!state) return;
    list?.destroy();
    confirm?.destroy();
    list = null;
    confirm = null;
    if (target) {
      const t = target;
      confirm = confirmMenu({
        text: `${itemName(t)}を すてますか？`,
        disabled: locked(),
        onYes: () => {
          void command.run(() => api.discard({ itemId: t.id })).then((result) => {
            target = null;
            returnId = result ? null : t.id;
            draw();
          });
        },
        onNo: () => {
          target = null;
          returnId = t.id;
          draw();
        },
      });
      windowSlot.replaceChildren(confirm.el);
      return;
    }
    list = itemList({
      items: state.inventory.items,
      order: 'weak',
      filter,
      initialItemId: returnId,
      disabled: locked(),
      onSelect: (item) => {
        target = item;
        draw();
      },
      onBack: deps.onClose,
      onFilterChange: (f) => { filter = f; },
    });
    windowSlot.replaceChildren(gameWindow({ title: 'もちもの', testId: 'inventory-window' }, countLine(state.inventory), list.el).el);
  }

  function renderError() {
    if (command.fatal && !panel) {
      panel = errorPanel({ onRetry: () => void command.retry() });
      errorSlot.replaceChildren(panel.el);
    } else if (!command.fatal && panel) {
      panel.destroy();
      panel = null;
    }
  }

  // 取り直しなどで所持品が変わったら、一覧を作り直す（確認を出しているあいだは替えない）
  let lastState = store.game.state;
  const offStore = store.subscribe(() => {
    if (store.game.state === lastState) return;
    lastState = store.game.state;
    if (!target) draw();
  });
  const offCommand = command.subscribe(() => {
    list?.update({ disabled: locked() });
    confirm?.setDisabled(locked());
    renderError();
  });
  draw();
  renderError();

  return {
    el: frame.el,
    destroy() {
      offStore();
      offCommand();
      list?.destroy();
      confirm?.destroy();
      frame.destroy();
    },
  };
}
