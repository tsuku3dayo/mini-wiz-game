// ConfirmMenu：確認のウィンドウ（仕様書 §11.4）。初めは「いいえ」、Esc＝いいえ、閉じ込めあり
import { el } from '../dom';
import { commandMenu, type CommandMenu } from './command-menu';
import { gameWindow } from './game-window';

export interface ConfirmMenuOptions {
  text: string;
  onYes: () => void;
  onNo: () => void;
  disabled?: boolean;
  /** false なら「かくにん」のウィンドウで包まず、文とメニューだけを返す（入れ替えの画面のウィンドウの中に置く） */
  framed?: boolean;
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
  const text = el('p', { class: 'wiz-confirm-text' }, opts.text);
  const root = opts.framed === false
    ? el('div', { class: 'wiz-confirm', 'data-testid': 'confirm' }, text, menu.el)
    : gameWindow({ title: 'かくにん', className: 'wiz-confirm', testId: 'confirm' }, text, menu.el).el;
  return {
    el: root,
    menu,
    setDisabled: (d) => menu.update({ disabled: d }),
    destroy: () => root.remove(),
  };
}
