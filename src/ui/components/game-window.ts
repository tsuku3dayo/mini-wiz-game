// GameWindow：二重線のウィンドウ（仕様書 §11.3）
import { el } from '../dom';

export type WindowVariant = 'default' | 'danger';

export interface GameWindowOptions {
  title?: string;
  variant?: WindowVariant;
  /** 1 行のステータス用（狭い画面で見出しの下の余白を詰める。TD-0003 §4） */
  compact?: boolean;
  testId?: string;
  className?: string;
}

export interface GameWindow {
  el: HTMLElement;
  /** 中身を入れる所 */
  body: HTMLElement;
  setVariant(variant: WindowVariant): void;
  setChildren(...children: (Node | null | false)[]): void;
  destroy(): void;
}

let titleSeq = 0;

export function gameWindow(opts: GameWindowOptions = {}, ...children: (Node | null | false)[]): GameWindow {
  const titleId = opts.title ? `wiz-window-title-${++titleSeq}` : null;
  const heading = opts.title
    ? el('h2', { class: 'wiz-window-title', id: titleId }, el('span', { 'aria-hidden': 'true' }, '【 '), opts.title, el('span', { 'aria-hidden': 'true' }, ' 】'))
    : null;
  const body = el('div', { class: 'wiz-window-body' });
  const section = el('section', {
    class: ['wiz-window', opts.title ? 'has-title' : '', opts.compact ? 'compact' : '', opts.className ?? ''].filter(Boolean).join(' '),
    'aria-labelledby': titleId,
    'data-variant': opts.variant ?? 'default',
    'data-testid': opts.testId,
  }, heading, body);

  const setChildren = (...nodes: (Node | null | false)[]) => body.replaceChildren(...nodes.filter((n): n is Node => !!n));
  setChildren(...children);

  return {
    el: section,
    body,
    setVariant: (variant) => { section.dataset.variant = variant; },
    setChildren,
    destroy: () => section.remove(),
  };
}
