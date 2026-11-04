// 入れ替え（#/swap。仕様書 §8.7「入れ替えの画面」、§11.5「入れ替え」、GUI-0006 §3、TD-0004 §6）
// GameFrame（いれかえ）→ ウィンドウ（もちものが いっぱいだ）［おちている：ItemLabel・段階ごとの中身］→ メッセージ欄（5 行）
// 段階：2 択（Esc では閉じない）→ 一覧（よわい じゅん）→ ひろう確認／2 択 → あきらめる確認
import type { ItemView } from '../../api/types';
import { itemName } from '../../logic/item-text';
import { commandMenu, type CommandMenu } from '../components/command-menu';
import { confirmMenu } from '../components/confirm-menu';
import { errorPanel } from '../components/error-panel';
import { gameFrame } from '../components/game-frame';
import { gameWindow } from '../components/game-window';
import { itemLabel } from '../components/item-label';
import { itemList, type ItemFilter, type ItemList } from '../components/item-list';
import { messageLog } from '../components/message-log';
import { el } from '../dom';
import type { ScreenContext } from '../router';

type Stage = { kind: 'choice'; cursor: number } | { kind: 'list' } | { kind: 'take'; item: ItemView } | { kind: 'abandon' };

export function mountSwap(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { store, api, command, queue } = ctx;
  const state = store.game.state;
  if (!state?.pendingDrop) return { destroy: () => root.replaceChildren() };
  const drop: ItemView = state.pendingDrop;

  // 画面に固有の状態
  let stage: Stage = { kind: 'choice', cursor: 0 };
  let filter: ItemFilter = 'all';
  let returnId: number | null = null;

  let choice: CommandMenu | null = null;
  let list: ItemList | null = null;
  let confirm: ReturnType<typeof confirmMenu> | null = null;
  let panel: { el: HTMLElement; destroy(): void } | null = null;

  const stageSlot = el('div', { class: 'swap-stage' });
  const win = gameWindow({ title: 'もちものが いっぱいだ', testId: 'swap-window' },
    el('p', { class: 'swap-drop', 'data-testid': 'swap-drop' }, el('span', { class: 'swap-drop-lead' }, 'おちている：'), itemLabel({ item: drop })),
    stageSlot);
  const log = messageLog({ queue, command, rows: 5 });
  const logSlot = el('div', { class: 'swap-log-slot' }, log.el);
  const frame = gameFrame({ name: 'いれかえ' }, win.el, logSlot);
  root.replaceChildren(frame.el);

  const locked = () => store.game.state?.location !== 'SWAP' || command.locked || command.fatal !== null;

  function setStage(next: Stage) {
    stage = next;
    draw();
  }

  function draw() {
    const inv = store.game.state?.inventory;
    if (!inv) return;
    choice?.destroy();
    list?.destroy();
    confirm?.destroy();
    choice = null;
    list = null;
    confirm = null;
    const s = stage;
    if (s.kind === 'choice') {
      choice = commandMenu({
        label: 'いれかえ',
        items: [
          { label: 'ひろう（すてるものを えらぶ）', onSelect: () => setStage({ kind: 'list' }) },
          { label: 'あきらめる', onSelect: () => setStage({ kind: 'abandon' }) },
        ],
        initialIndex: s.cursor,
        autoFocus: !locked(),
        disabled: locked(),
      });
      stageSlot.replaceChildren(choice.el);
    } else if (s.kind === 'list') {
      list = itemList({
        items: inv.items,
        order: 'weak',
        filter,
        initialItemId: returnId,
        disabled: locked(),
        onSelect: (item) => setStage({ kind: 'take', item }),
        onBack: () => {
          returnId = null;
          setStage({ kind: 'choice', cursor: 0 });
        },
        onFilterChange: (f) => { filter = f; },
      });
      stageSlot.replaceChildren(list.el);
    } else if (s.kind === 'take') {
      const t = s.item;
      confirm = confirmMenu({
        text: `${itemName(t)}を すてて ${itemName(drop)}を ひろいますか？`,
        framed: false,
        disabled: locked(),
        onYes: () => void command.run(() => api.lootTake({ discardId: t.id })),
        onNo: () => {
          returnId = t.id;
          setStage({ kind: 'list' });
        },
      });
      stageSlot.replaceChildren(confirm.el);
    } else {
      confirm = confirmMenu({
        text: `${itemName(drop)}を あきらめますか？`,
        framed: false,
        disabled: locked(),
        onYes: () => void command.run(() => api.lootAbandon()),
        onNo: () => setStage({ kind: 'choice', cursor: 1 }),
      });
      stageSlot.replaceChildren(confirm.el);
    }
  }

  function onChange() {
    const isLocked = locked();
    const wasDisabled = choice?.el.getAttribute('aria-disabled') === 'true';
    choice?.update({ disabled: isLocked });
    // 開いたときにドロップの行を出している途中だったら、出し終えたところでフォーカスを置く
    if (choice && wasDisabled && !isLocked && !root.contains(document.activeElement)) choice.focus();
    list?.update({ disabled: isLocked });
    confirm?.setDisabled(isLocked);
    if (command.fatal && !panel) {
      panel = errorPanel({ onRetry: () => void command.retry() });
      logSlot.replaceChildren(panel.el);
    } else if (!command.fatal && panel) {
      panel.destroy();
      panel = null;
      logSlot.replaceChildren(log.el);
    }
  }
  const offStore = store.subscribe(onChange);
  const offCommand = command.subscribe(onChange);
  draw();
  onChange();

  return {
    destroy() {
      offStore();
      offCommand();
      choice?.destroy();
      list?.destroy();
      confirm?.destroy();
      log.destroy();
      panel?.destroy();
      root.replaceChildren();
    },
  };
}
