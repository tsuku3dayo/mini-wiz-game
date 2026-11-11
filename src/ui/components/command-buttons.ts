// CommandButtons：狭い画面の戦闘のコマンド。横 1 列のボタン（仕様書 §11.5「狭い画面のコマンドのボタン」、TD-0003 §4。v1.14）
// CommandMenu と同じ形の引数・update を持ち、戦闘の画面は狭い画面でこれを、広い画面で CommandMenu を使う
import { clampCursor, initialCursor } from '../../logic/menu-model';
import { el } from '../dom';
import type { MenuItem } from './command-menu';

export interface CommandButtonsOptions {
  label: string;
  items: MenuItem[];
  initialIndex?: number;
  autoFocus?: boolean;
  onDisabledSelect?: (reason: string) => void;
  /** 全体を無効にする（応答待ち・逐次表示中など。押しても理由を出さない） */
  disabled?: boolean;
}

export interface CommandButtons {
  el: HTMLElement;
  readonly cursor: number;
  update(next: { items?: MenuItem[]; disabled?: boolean }): void;
  focus(): void;
  destroy(): void;
}

/** ← ↑ は前（左）、→ ↓ は次（右）。端で止まる */
const STEP: Record<string, number> = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

export function commandButtons(opts: CommandButtonsOptions): CommandButtons {
  let items = opts.items;
  let disabled = !!opts.disabled;
  let cursor = initialCursor(items, opts.initialIndex);
  const box = el('div', { class: 'command-buttons', role: 'menu', 'aria-label': opts.label });
  let buttons: HTMLButtonElement[] = [];

  /** ボタンを作る（数が変わったときだけ。押す要素を作り直さないため、ふだんは paint で書き替える） */
  function render() {
    buttons = items.map((_, i) => {
      const b = el('button', { type: 'button', class: 'wiz-button command-button', role: 'menuitem' });
      b.addEventListener('click', () => {
        setCursor(i, true);
        select();
      });
      b.addEventListener('focus', () => {
        if (cursor !== i) setCursor(i, false);
      });
      return b;
    });
    box.replaceChildren(...buttons);
    paint();
  }

  /** 文字・押せるか・カーソル・tabindex を書き替える */
  function paint() {
    if (disabled) box.setAttribute('aria-disabled', 'true');
    else box.removeAttribute('aria-disabled');
    buttons.forEach((b, i) => {
      const item = items[i];
      const label = item?.label ?? '';
      if (typeof label === 'string') {
        if (b.textContent !== label) b.textContent = label;
      } else if (b.firstChild !== label) {
        b.replaceChildren(label);
      }
      if (item?.disabled) b.setAttribute('aria-disabled', 'true');
      else b.removeAttribute('aria-disabled');
      const active = i === cursor;
      b.classList.toggle('active', active);
      b.tabIndex = active ? 0 : -1;
    });
  }

  function setCursor(index: number, focus = true) {
    const hadFocus = box.contains(document.activeElement);
    cursor = clampCursor(index, items.length);
    paint();
    if (focus || hadFocus) buttons[cursor]?.focus({ preventScroll: true });
  }

  function select() {
    if (disabled) return;
    const item = items[cursor];
    if (!item) return;
    if (item.disabled) {
      if (item.disabledReason) opts.onDisabledSelect?.(item.disabledReason);
      return;
    }
    item.onSelect?.();
  }

  box.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const step = STEP[e.key];
    if (step !== undefined) {
      e.preventDefault();
      setCursor(cursor + step, true);
      return;
    }
    // ボタンの既定の動き（Enter・Space で click）に任せず、ここで 1 回だけ決める
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();
    }
  });
  // Space はキーを離したときにも click を出すので、既定の動きを止める
  box.addEventListener('keyup', (e) => {
    if (e.key === ' ') e.preventDefault();
  });

  render();
  if (opts.autoFocus && !disabled) queueMicrotask(() => buttons[cursor]?.focus({ preventScroll: true }));

  return {
    el: box,
    get cursor() { return cursor; },
    update(next) {
      const hadFocus = box.contains(document.activeElement);
      if (next.disabled !== undefined) disabled = next.disabled;
      if (next.items) {
        const sameCount = next.items.length === items.length;
        items = next.items;
        cursor = clampCursor(cursor, items.length);
        if (sameCount) paint();
        else render();
      } else {
        paint();
      }
      if (hadFocus) buttons[cursor]?.focus({ preventScroll: true });
    },
    focus: () => buttons[cursor]?.focus({ preventScroll: true }),
    destroy: () => box.remove(),
  };
}
