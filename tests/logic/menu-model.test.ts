import { describe, expect, test } from 'vitest';
import { clampCursor, initialCursor, moveCursor } from '../../src/logic/menu-model';

const items = [{}, { disabled: true }, {}, {}];

describe('メニューのカーソル', () => {
  test('TC-0010-01 端で止まり、無効の項目にも止まる。初めは initialIndex か最初の有効な項目。範囲の外は最後へ寄る', () => {
    // 先頭で ↑・末尾で ↓ は動かない
    expect(moveCursor(0, 'ArrowUp', 4)).toBe(0);
    expect(moveCursor(3, 'ArrowDown', 4)).toBe(3);
    // 無効の項目（index 1）にも止まる
    expect(moveCursor(0, 'ArrowDown', 4)).toBe(1);
    expect(moveCursor(2, 'ArrowUp', 4)).toBe(1);
    // 初めのカーソル
    expect(initialCursor(items, 2)).toBe(2);
    expect(initialCursor([{ disabled: true }, {}, {}])).toBe(1);
    expect(initialCursor([{ disabled: true }, { disabled: true }])).toBe(0);
    expect(initialCursor(items)).toBe(0);
    // 項目が減って範囲の外になったら最後へ
    expect(clampCursor(4, 3)).toBe(2);
    expect(clampCursor(1, 3)).toBe(1);
    expect(initialCursor([{}, {}], 5)).toBe(1);
  });

  test('TC-0010-09 閉じ込めありのとき Tab は ↓、Shift+Tab は ↑ と同じで端で止まる。閉じ込めなしはブラウザに任せる', () => {
    expect(moveCursor(0, 'Tab', 3, true)).toBe(1);
    expect(moveCursor(2, 'Tab', 3, true)).toBe(2);
    expect(moveCursor(1, 'ShiftTab', 3, true)).toBe(0);
    expect(moveCursor(0, 'ShiftTab', 3, true)).toBe(0);
    expect(moveCursor(0, 'Tab', 3, false)).toBeNull();
    expect(moveCursor(0, 'ShiftTab', 3)).toBeNull();
  });
});
