// ConfirmMenu：確認のウィンドウ（仕様書 §11.4）。初めは「いいえ」、Esc＝いいえ、閉じ込めあり
import { el } from '../dom';
import { commandMenu, type CommandMenu } from './command-menu';
import { gameWindow } from './game-window';

export interface ConfirmMenuOptions {
  text: string;
  onYes: () => void;
  onNo: () => void;
  disabled?: boolean;
}

export function confirmMenu(opts: ConfirmMenuOptions): { el: HTMLElement; menu: CommandMenu; setDisabled(d: boolean): void; destroy(): void } {
  const menu = commandMenu({
    label: 'かくにん',
    items: [
      { label: 'はい', onSelect: opts.onYes },
      { label: 'いいえ', onSelect: opts.onNo },
    ],
    initialIndex: 1,
    autoFocus: true,
    trapFocus: true,
    onCancel: opts.onNo,
    disabled: opts.disabled,
  });
  const win = gameWindow({ title: 'かくにん', className: 'wiz-confirm' }, el('p', { class: 'wiz-confirm-text' }, opts.text), menu.el);
  return {
    el: win.el,
    menu,
    setDisabled: (d) => menu.update({ disabled: d }),
    destroy: () => win.destroy(),
  };
}
