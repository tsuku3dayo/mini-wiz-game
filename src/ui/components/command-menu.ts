// CommandMenu：▶ カーソルで選ぶ縦の一覧（仕様書 §11.4）
import { clampCursor, initialCursor, moveCursor, type MenuKey } from '../../logic/menu-model';
import { el } from '../dom';

export interface MenuItem {
  label: string | Node;
  disabled?: boolean;
  /** 無効のまま決定されたときに onDisabledSelect へ渡す理由 */
  disabledReason?: string;
  onSelect?: () => void;
}

export interface CommandMenuOptions {
  label: string;
  items: MenuItem[];
  initialIndex?: number;
  autoFocus?: boolean;
  trapFocus?: boolean;
  onCancel?: () => void;
  onDisabledSelect?: (reason: string) => void;
  /** 指定すると、その高さで縦にスクロールする（CSS の値） */
  maxHeight?: string;
  /** メニュー全体を無効にする */
  disabled?: boolean;
  /** カーソル（▶）の行が替わったとき（装備画面の のうりょく の変化） */
  onCursorChange?: (index: number) => void;
}

export interface CommandMenu {
  el: HTMLUListElement;
  readonly cursor: number;
  update(next: { items?: MenuItem[]; disabled?: boolean }): void;
  setCursor(index: number, focus?: boolean): void;
  focus(): void;
  destroy(): void;
}

const KEYS: Record<string, MenuKey> = { ArrowDown: 'ArrowDown', ArrowUp: 'ArrowUp' };

export function commandMenu(opts: CommandMenuOptions): CommandMenu {
  let items = opts.items;
  let disabled = !!opts.disabled;
  let cursor = initialCursor(items, opts.initialIndex);
  const ul = el('ul', { class: 'wiz-menu', role: 'menu', 'aria-label': opts.label });
  if (opts.maxHeight) {
    ul.style.maxHeight = opts.maxHeight;
    ul.classList.add('scroll');
  }

  /** 項目の行を作り直す（項目が変わったときだけ） */
  function render() {
    if (disabled) ul.setAttribute('aria-disabled', 'true');
    else ul.removeAttribute('aria-disabled');
    const rows = items.map((item, i) => {
      const li = el('li', {
        class: 'wiz-menu-item',
        role: 'menuitem',
        'aria-disabled': item.disabled ? 'true' : null,
      }, el('span', { class: 'wiz-cursor', 'aria-hidden': 'true' }));
      li.append(typeof item.label === 'string' ? document.createTextNode(item.label) : item.label);
      li.addEventListener('click', () => {
        setCursor(i, true);
        select();
      });
      li.addEventListener('focus', () => {
        if (cursor !== i) setCursor(i, false);
      });
      return li;
    });
    ul.replaceChildren(...rows);
    paint();
  }

  /**
   * カーソルの印・色・tabindex だけを書き替える。行の要素は作り直さない
   * （押し始めのフォーカスで作り直すと、押し終わりが別の要素になり、クリックが届かないため）
   */
  function paint() {
    Array.from(ul.children).forEach((row, i) => {
      const active = i === cursor;
      row.classList.toggle('active', active);
      row.setAttribute('tabindex', active ? '0' : '-1');
      const mark = row.firstElementChild;
      if (mark) mark.textContent = active ? '▶' : '　';
    });
  }

  function rowAt(i: number): HTMLElement | undefined {
    return ul.children[i] as HTMLElement | undefined;
  }

  function setCursor(index: number, focus = true) {
    const hadFocus = ul.contains(document.activeElement);
    const prev = cursor;
    cursor = clampCursor(index, items.length);
    paint();
    if (cursor !== prev) opts.onCursorChange?.(cursor);
    const row = rowAt(cursor);
    if (row && (focus || hadFocus)) {
      row.focus({ preventScroll: true });
      row.scrollIntoView?.({ block: 'nearest' });
    }
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

  ul.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    const key = e.key === 'Tab' ? (e.shiftKey ? 'ShiftTab' : 'Tab') : KEYS[e.key];
    if (key) {
      const next = moveCursor(cursor, key, items.length, !!opts.trapFocus);
      if (next === null) return;
      e.preventDefault();
      setCursor(next, true);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();
      return;
    }
    if (e.key === 'Escape' && opts.onCancel && !disabled) {
      e.preventDefault();
      opts.onCancel();
    }
  });

  render();
  if (opts.autoFocus && !disabled) queueMicrotask(() => rowAt(cursor)?.focus({ preventScroll: true }));

  return {
    el: ul,
    get cursor() { return cursor; },
    update(next) {
      if (next.items) items = next.items;
      if (next.disabled !== undefined) disabled = next.disabled;
      const hadFocus = ul.contains(document.activeElement);
      cursor = clampCursor(cursor, items.length);
      if (next.items) {
        render();
      } else {
        // 無効・有効だけが変わったときは、行を作り直さない
        if (disabled) ul.setAttribute('aria-disabled', 'true');
        else ul.removeAttribute('aria-disabled');
      }
      if (hadFocus) rowAt(cursor)?.focus({ preventScroll: true });
    },
    setCursor,
    focus: () => rowAt(cursor)?.focus({ preventScroll: true }),
    destroy: () => ul.remove(),
  };
}
