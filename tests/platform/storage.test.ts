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

  test('migrateStorage は版がなければ 2 を書く。版 2 なら何もしない', () => {
    const mem = memoryStorage();
    createLocalStorage('mini-wiz-game', () => mem).migrateStorage();
    expect(mem.getItem('mini-wiz-game-schema')).toBe('2');
    mem.setItem('mini-wiz-game-save', '{"name":"x"}');
    createLocalStorage('mini-wiz-game', () => mem).migrateStorage();
    expect(mem.getItem('mini-wiz-game-save')).toBe('{"name":"x"}');
    expect(mem.getItem('mini-wiz-game-save-1')).toBeNull();
  });
});

describe('セーブを 3 つに移す', () => {
  const SAVE = JSON.stringify({ schemaVersion: 3, name: 'アルド', level: 4, savedAt: '2026-11-01T00:00:00.000Z' });
  const GAME = { schemaVersion: 5, revision: 7, name: 'アルド', level: 4, location: 'INN', updatedAt: '2026-11-01T00:00:00.000Z' };

  test('TC-0009-12 版 1 の save を save-1 に同じ文字列で写し、プレイ中の状態に saveSlot: 1 を足して save を消し、版 2 にする。save がなければプレイ中の状態に触れない。途中で書けなければどれも前のまま版 1', () => {
    // save とプレイ中の状態がある
    const mem = memoryStorage();
    mem.setItem('mini-wiz-game-schema', '1');
    mem.setItem('mini-wiz-game-save', SAVE);
    mem.setItem('mini-wiz-game-game', JSON.stringify(GAME));
    createLocalStorage('mini-wiz-game', () => mem).migrateStorage();
    expect(mem.getItem('mini-wiz-game-save-1')).toBe(SAVE);
    expect(JSON.parse(mem.getItem('mini-wiz-game-game')!)).toEqual({ ...GAME, saveSlot: 1 });
    expect(mem.getItem('mini-wiz-game-save')).toBeNull();
    expect(mem.getItem('mini-wiz-game-schema')).toBe('2');

    // save がない：プレイ中の状態に触れない（saveSlot は null として読む）
    const noSave = memoryStorage();
    noSave.setItem('mini-wiz-game-schema', '1');
    noSave.setItem('mini-wiz-game-game', JSON.stringify(GAME));
    const gameText = noSave.getItem('mini-wiz-game-game');
    createLocalStorage('mini-wiz-game', () => noSave).migrateStorage();
    expect(noSave.getItem('mini-wiz-game-game')).toBe(gameText);
    expect(noSave.getItem('mini-wiz-game-save-1')).toBeNull();
    expect(noSave.getItem('mini-wiz-game-schema')).toBe('2');

    // 途中（プレイ中の状態）で書けない：どのキーも前のまま、版 1（次の起動でやり直す）
    for (const failKey of ['mini-wiz-game-game', 'mini-wiz-game-save-1']) {
      // 置いたあとで、そのキーの書き込みを失敗させる
      const failKeys: string[] = [];
      const fail = memoryStorage(failKeys);
      fail.setItem('mini-wiz-game-schema', '1');
      fail.setItem('mini-wiz-game-save', SAVE);
      fail.setItem('mini-wiz-game-game', JSON.stringify(GAME));
      failKeys.push(failKey);
      const before = ['schema', 'save', 'save-1', 'game'].map((k) => fail.getItem(`mini-wiz-game-${k}`));
      createLocalStorage('mini-wiz-game', () => fail).migrateStorage();
      expect(['schema', 'save', 'save-1', 'game'].map((k) => fail.getItem(`mini-wiz-game-${k}`)), failKey).toEqual(before);
    }
  });
});
