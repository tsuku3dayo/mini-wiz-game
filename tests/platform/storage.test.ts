import { describe, expect, test } from 'vitest';
import { createLocalStorage } from '../../src/platform/storage';

/** メモリの Storage。setItem で例外を投げるキーを指定できる */
function memoryStorage(failKeys: string[] = []): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k); },
    setItem: (k, v) => {
      if (failKeys.includes(k)) throw new Error('QuotaExceededError');
      map.set(k, v);
    },
  };
}

// 確認 ID のない、localStorage の包みの決まり（仕様書 §21.7、ADR-0006）
describe('localStorage の読み書き', () => {
  test('キーに識別子を付け、読めない値・使えないときは失敗を返し、例外を外に出さない', () => {
    const mem = memoryStorage();
    const s = createLocalStorage('mini-wiz-game', () => mem);
    expect(s.read('game')).toEqual({ ok: false, reason: 'missing' });
    expect(s.write('game', { a: 1 })).toBe(true);
    expect(mem.getItem('mini-wiz-game-game')).toBe('{"a":1}');
    expect(s.read('game')).toEqual({ ok: true, value: { a: 1 } });
    mem.setItem('mini-wiz-game-game', '{broken');
    expect(s.read('game')).toEqual({ ok: false, reason: 'unreadable' });
    expect(s.remove('game')).toBe(true);

    const broken = createLocalStorage('mini-wiz-game', () => { throw new Error('SecurityError'); });
    expect(broken.read('game')).toEqual({ ok: false, reason: 'unavailable' });
    expect(broken.write('game', 1)).toBe(false);
    expect(broken.writeAll([['game', 1]])).toBe(false);
  });

  test('writeAll は途中で失敗したら、書く前の値に戻して false', () => {
    const mem = memoryStorage(['mini-wiz-game-save']);
    mem.setItem('mini-wiz-game-game', '"old"');
    const s = createLocalStorage('mini-wiz-game', () => mem);
    expect(s.writeAll([['game', 'new'], ['save', 'new']])).toBe(false);
    expect(mem.getItem('mini-wiz-game-game')).toBe('"old"');
    expect(mem.getItem('mini-wiz-game-save')).toBeNull();
  });

  test('migrateStorage は版がなければ 1 を書く', () => {
    const mem = memoryStorage();
    createLocalStorage('mini-wiz-game', () => mem).migrateStorage();
    expect(mem.getItem('mini-wiz-game-schema')).toBe('1');
  });
});
