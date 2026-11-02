// ErrorPanel：続けられないエラー（仕様書 §11.9）
import { el } from '../dom';
import { commandMenu } from './command-menu';
import { gameWindow } from './game-window';

export function errorPanel(opts: { onRetry: () => void }): { el: HTMLElement; destroy(): void } {
  const menu = commandMenu({ label: 'エラー', items: [{ label: '再試行', onSelect: opts.onRetry }], autoFocus: true });
  const win = gameWindow({ title: 'エラー', variant: 'danger', testId: 'error-panel' },
    el('p', { role: 'alert', class: 'wiz-error-text' }, 'きろくを よみかき できません'), menu.el);
  return { el: win.el, destroy: () => win.destroy() };
}
