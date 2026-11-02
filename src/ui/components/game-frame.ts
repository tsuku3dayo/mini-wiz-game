// GameFrame：画面の外枠（<main> と画面名の <h1>。仕様書 §11.3）
import { el } from '../dom';

export interface GameFrameOptions {
  name: string;
  /** ダンジョン・戦闘：狭い画面では画面名を見た目で隠す（読み上げには残す） */
  hideNameOnNarrow?: boolean;
}

export interface GameFrame {
  el: HTMLElement;
  setChildren(...children: (Node | null | false)[]): void;
  setName(name: string): void;
  destroy(): void;
}

export function gameFrame(opts: GameFrameOptions, ...children: (Node | null | false)[]): GameFrame {
  const h1 = el('h1', { class: opts.hideNameOnNarrow ? 'wiz-frame-name hide-on-narrow' : 'wiz-frame-name' }, opts.name);
  const content = el('div', { class: 'wiz-frame-content' });
  const main = el('main', { class: 'wiz-frame' }, h1, content);
  const setChildren = (...nodes: (Node | null | false)[]) => content.replaceChildren(...nodes.filter((n): n is Node => !!n));
  setChildren(...children);
  return {
    el: main,
    setChildren,
    setName: (name) => { h1.textContent = name; },
    destroy: () => main.remove(),
  };
}

/** 2 カラム（広い画面は左右、狭い画面は縦積み）。stretch で左右の高さをそろえる */
export function columns(left: (Node | null | false)[], right: (Node | null | false)[], stretch = false): HTMLElement {
  const col = (side: 'left' | 'right', nodes: (Node | null | false)[]) =>
    el('div', { class: 'wiz-column', 'data-testid': `column-${side}` }, ...nodes);
  return el('div', { class: stretch ? 'wiz-columns stretch' : 'wiz-columns' }, col('left', left), col('right', right));
}
