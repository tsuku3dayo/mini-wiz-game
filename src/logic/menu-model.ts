// CommandMenu のカーソルの動き（仕様書 §11.4）。DOM を使わない

export interface MenuItemState {
  disabled?: boolean;
}

export type MenuKey = 'ArrowDown' | 'ArrowUp' | 'Tab' | 'ShiftTab';

/** 初めのカーソル：initialIndex があればその位置、なければ最初の有効な項目（全部無効なら 0） */
export function initialCursor(items: readonly MenuItemState[], initialIndex?: number): number {
  if (items.length === 0) return 0;
  if (initialIndex !== undefined) return clampCursor(initialIndex, items.length);
  const first = items.findIndex((i) => !i.disabled);
  return first === -1 ? 0 : first;
}

/** 項目が減ってカーソルが範囲の外になったら、最後の項目へ寄せる */
export function clampCursor(cursor: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(cursor, 0), count - 1);
}

/**
 * キーで動かした次のカーソル。端で止まる（ループしない）。無効の項目にも止まる。
 * Tab・Shift+Tab は閉じ込め（trapFocus）のときだけ ↓・↑ と同じに動き、そうでなければ null（ブラウザに任せる）
 */
export function moveCursor(cursor: number, key: MenuKey, count: number, trapFocus = false): number | null {
  if ((key === 'Tab' || key === 'ShiftTab') && !trapFocus) return null;
  const step = key === 'ArrowDown' || key === 'Tab' ? 1 : -1;
  return clampCursor(cursor + step, count);
}
