// SaveSlotMenu：セーブのスロットの一覧（仕様書 §11.5「スロットの一覧」、TD-0003 §4。v1.14）
// タイトルの「つづきから」（load）と宿屋の「セーブ」（save）で共通。見出し付きのウィンドウの中に、もどる／スロット1〜3 の CommandMenu
import type { SaveSlot, SaveSlotSummary } from '../../api/types';
import { SAVE_SLOT_NUMBERS, slotLabel } from '../../logic/save-slots';
import { commandMenu, type CommandMenu } from './command-menu';
import { gameWindow } from './game-window';

export interface SaveSlotMenuOptions {
  title: 'つづきから' | 'セーブ';
  slots: readonly (SaveSlotSummary | null)[];
  /** load：空きは無効（理由なし）。save：どれも選べる */
  mode: 'load' | 'save';
  initialSlot: SaveSlot;
  onPick: (slot: SaveSlot) => void;
  onBack: () => void;
  disabled?: boolean;
}

export interface SaveSlotMenu {
  el: HTMLElement;
  menu: CommandMenu;
  setDisabled(disabled: boolean): void;
  destroy(): void;
}

export function saveSlotMenu(opts: SaveSlotMenuOptions): SaveSlotMenu {
  const menu = commandMenu({
    label: opts.title,
    items: [
      { label: 'もどる', onSelect: opts.onBack },
      ...SAVE_SLOT_NUMBERS.map((slot, i) => {
        const summary = opts.slots[i] ?? null;
        return {
          label: slotLabel(slot, summary),
          // つづきから：空きのスロットは無効（選んでも何も出さない）
          disabled: opts.mode === 'load' && !summary,
          onSelect: () => opts.onPick(slot),
        };
      }),
    ],
    // 先頭は「もどる」なので、スロット n は index n
    initialIndex: opts.initialSlot,
    autoFocus: !opts.disabled,
    trapFocus: true,
    onCancel: opts.onBack,
    disabled: opts.disabled,
  });
  const win = gameWindow({ title: opts.title, className: 'save-slot-window', testId: 'save-slot-window' }, menu.el);
  return {
    el: win.el,
    menu,
    setDisabled: (disabled) => menu.update({ disabled }),
    destroy: () => win.destroy(),
  };
}
