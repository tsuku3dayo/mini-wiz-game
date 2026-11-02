import { afterEach, describe, expect, test, vi } from 'vitest';
import { createGameApi } from '../../src/api/game-api';
import { GameError } from '../../src/api/types';
import type { GameStateData } from '../../src/domain/game-state';
import { SwappableRng } from '../../src/domain/rng';
import { createFakeStorage, type FakeStorage } from '../helpers/fake-storage';
import { LOCATIONS, makeItem, makeState } from '../helpers/fixtures';

const NOW = '2026-11-02T01:23:45.678Z';
const CHARACTER = { name: 'アルド', level: 4, exp: 150, hp: 12, maxHp: 55, mp: 3, maxMp: 17, attack: 9, defense: 8, speed: 8 };
const RECORDS = { battles: 9, kills: 7, deaths: 1, laps: 1, bossKills: 0 };
const INVENTORY = {
  equipped: { weapon: makeItem(1, 'weapon2', 'N', 3), armor: null, shield: null, accessory: null },
  items: [makeItem(2, 'armor1', 'N', 1), makeItem(3, 'shield1', 'R', 2)],
  nextId: 5,
  pending: { item: makeItem(4, 'weapon1', 'N', 1), thenClear: false },
};

function storedGame(state: GameStateData, revision = 3, schemaVersion = 5) {
  return { ...state, schemaVersion, revision, updatedAt: '2026-11-01T00:00:00.000Z' };
}

/** オブジェクトから項目を抜いたものを返す（古い版・壊れた値を作るため） */
function without(obj: object, ...keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));
}

function storedSave(schemaVersion = 3) {
  return { schemaVersion, ...CHARACTER, inventory: { ...INVENTORY, pending: null }, records: RECORDS, savedAt: '2026-11-01T00:00:00.000Z' };
}

function setup(initial: Record<string, unknown> = {}): { api: ReturnType<typeof createGameApi>; store: FakeStorage } {
  const store = createFakeStorage(initial);
  return { api: createGameApi({ store, rng: new SwappableRng(), now: () => NOW }), store };
}

/** reject した GameError を取り出す */
async function caught(p: Promise<unknown>): Promise<GameError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(GameError);
    return e as GameError;
  }
  throw new Error('reject しなかった');
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('名前を付けてキャラクターを作る', () => {
  test('TC-0007-03 startGame は名前の違反を 400 validation_error（details つき）で reject し、保存は変わらない', async () => {
    const { api, store } = setup({ game: storedGame(makeState('INN')), save: storedSave() });
    const before = [store.raw('game'), store.raw('save')];
    const cases: [string, string][] = [
      ['', '名前を入力してください'],
      ['   ', '名前を入力してください'],
      ['ゆうしゃアルド12', '名前は1〜8文字で入力してください'],
      ['ゆうしゃ😀', 'つかえない もじが ふくまれています'],
    ];
    for (const [name, message] of cases) {
      const err = await caught(api.startGame({ name }));
      expect({ status: err.status, error: err.error, message: err.message, details: err.details }).toEqual({
        status: 400, error: 'validation_error', message: '入力が正しくありません', details: [{ field: 'name', message }],
      });
    }
    expect([store.raw('game'), store.raw('save')]).toEqual(before);
  });

  test('TC-0007-09 startGame は前の状態を上書きし（revision は前 + 1）、セーブを読みも書きもしない。メッセージは 1 行', async () => {
    const { api, store } = setup({ game: storedGame(makeState('DUNGEON', CHARACTER), 4), save: storedSave() });
    const save = store.raw('save');
    const r = await api.startGame({ name: ' ゆうしゃ ' });
    expect(r.messages).toEqual([{ text: 'ゆうしゃの ぼうけんが はじまった', tone: 'normal' }]);
    expect(r.state).toMatchObject({ location: 'INN', character: { name: 'ゆうしゃ', level: 1, hp: 30, maxHp: 30 } });
    const game = JSON.parse(store.raw('game')!);
    expect(game).toMatchObject({ name: 'ゆうしゃ', level: 1, location: 'INN', dungeon: null, revision: 5, schemaVersion: 5, updatedAt: NOW });
    expect(store.log.filter((l) => l.name === 'save')).toEqual([]);
    expect(store.raw('save')).toBe(save);

    // 前がなければ revision 0
    const fresh = setup();
    await fresh.api.startGame({ name: 'あ' });
    expect(JSON.parse(fresh.store.raw('game')!).revision).toBe(0);
  });
});

describe('セーブして、つづきから再開する', () => {
  test('TC-0009-01 INN で save すると版 3 のセーブを書き、プレイ中の状態は変えない。ほかの場所では 409', async () => {
    const state = makeState('INN', { ...CHARACTER, inventory: { ...INVENTORY, pending: null }, records: RECORDS });
    const { api, store } = setup({ game: storedGame(state) });
    const game = store.raw('game');
    const r = await api.save();
    expect(r.messages).toEqual([{ text: 'セーブしました', tone: 'success' }]);
    expect(JSON.parse(store.raw('save')!)).toEqual({
      schemaVersion: 3, ...CHARACTER, inventory: { ...INVENTORY, pending: null }, records: RECORDS, savedAt: NOW,
    });
    expect(store.raw('game')).toBe(game);

    for (const location of ['DUNGEON', 'BATTLE', 'SWAP', 'CLEARED'] as const) {
      const other = setup({ game: storedGame(makeState(location)), save: storedSave() });
      const before = other.store.raw('save');
      const err = await caught(other.api.save());
      expect({ status: err.status, error: err.error }).toEqual({ status: 409, error: 'invalid_state' });
      expect(other.store.raw('save')).toBe(before);
    }
  });

  test('TC-0009-03 load はどの場所からでもセーブの値で置き換えて宿屋から始める。セーブがなければ 404', async () => {
    for (const location of LOCATIONS) {
      const { api, store } = setup({ game: storedGame(makeState(location), 7), save: storedSave() });
      const r = await api.load();
      expect(r.messages).toEqual([{ text: 'アルドは 宿屋で めをさました', tone: 'normal' }]);
      expect(r.state).toMatchObject({ location: 'INN', dungeon: null, battle: null, pendingDrop: null, records: RECORDS });
      expect(r.state.character).toMatchObject({ name: 'アルド', level: 4, hp: 12, mp: 3 });
      const game = JSON.parse(store.raw('game')!);
      expect(game).toMatchObject({ ...CHARACTER, location: 'INN', dungeon: null, battle: null, revision: 8 });
      expect(game.inventory.pending).toBeNull();
    }
    const { api } = setup({ game: storedGame(makeState('INN')) });
    const err = await caught(api.load());
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 404, error: 'save_not_found', message: 'セーブデータが ありません' });
  });

  test('TC-0009-10 版 1・2 のゲーム状態は移した GameView、版 1・2 のセーブは宿屋から。版 4 のセーブは 500 internal_error', async () => {
    // 版 1・ダンジョンの中 → 宿屋に戻る。所持品・実績はない → 補う
    const v1Fields = without(makeState('DUNGEON', CHARACTER), 'inventory', 'records');
    const v1 = setup({ game: { ...v1Fields, schemaVersion: 1, revision: 2, updatedAt: '2026-01-01T00:00:00.000Z' } });
    const g1 = await v1.api.getGame();
    expect(g1.state).toMatchObject({ location: 'INN', dungeon: null, battle: null, records: { battles: 0, laps: 1 }, inventory: { count: 0 } });
    expect(g1.state!.character).toMatchObject({ name: 'アルド', level: 4 });

    // 版 2・宿屋
    const v2 = setup({ game: { ...CHARACTER, location: 'INN', dungeon: null, battle: null, schemaVersion: 2, revision: 0, updatedAt: '2026-01-01T00:00:00.000Z' } });
    expect((await v2.api.getGame()).state).toMatchObject({ location: 'INN', character: { name: 'アルド' }, inventory: { count: 0 }, records: { laps: 1 } });

    for (const v of [1, 2]) {
      const { api } = setup({ save: storedSave(v) });
      const r = await api.load();
      expect(r.state).toMatchObject({ location: 'INN', character: { name: 'アルド', level: 4 }, records: { battles: 0, laps: 1 } });
      expect(r.state.inventory.count).toBe(v === 1 ? 0 : 2);
    }

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const v4 = setup({ save: storedSave(4) });
    const err = await caught(v4.api.load());
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 500, error: 'internal_error', message: '内部エラー' });
  });
});

describe('保存の失敗が分かる', () => {
  test('TC-0012-09 プレイ中の状態が壊れていたら getGame は null（warn 1 回、値は残る）。セーブが壊れていたら getSave はなし', async () => {
    const noName = without(storedGame(makeState('INN')), 'name');
    for (const text of ['{broken', '42', JSON.stringify(noName)]) {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { api, store } = setup();
      store.setRaw('game', text);
      expect(await api.getGame()).toEqual({ state: null });
      expect(warn).toHaveBeenCalledTimes(1);
      expect(store.raw('game')).toBe(text);
      warn.mockRestore();
    }
    for (const text of ['{broken', '42', JSON.stringify({ schemaVersion: 3, name: 'x' })]) {
      const { api, store } = setup();
      store.setRaw('save', text);
      expect(await api.getSave()).toEqual({ exists: false, summary: null });
    }
  });
});

// 確認 ID のない、ゲーム API の決まり（仕様書 §21.5、§22.2）
describe('ゲーム API の骨組み', () => {
  test('getGame・getSave：なければ null となし、あれば GameView とセーブの要約', async () => {
    const empty = setup();
    expect(await empty.api.getGame()).toEqual({ state: null });
    expect(await empty.api.getSave()).toEqual({ exists: false, summary: null });
    const { api } = setup({ game: storedGame(makeState('INN', { ...CHARACTER, inventory: { ...INVENTORY, pending: null } })), save: storedSave() });
    const g = (await api.getGame()).state!;
    expect(g.character).toMatchObject({ attack: 12, base: { attack: 9 }, bonus: { attack: 3 }, nextLevelExp: 240, expToNext: 90 });
    expect(g.inventory.items.map((i) => i.id)).toEqual([3, 2]);
    expect(g.inventory.equipped.weapon).toEqual({ id: 1, itemId: 'weapon2', name: 'スピア', slot: 'weapon', rarity: 'N', stat: 'attack', stats: ['attack'], value: 3 });
    expect(await api.getSave()).toEqual({ exists: true, summary: { name: 'アルド', level: 4, savedAt: '2026-11-01T00:00:00.000Z' } });
  });

  test('rest は revision を 1 進めて書く。ゲームがなければ 404、書けなければ 500 storage_error で保存は変わらない', async () => {
    const { api, store } = setup({ game: storedGame(makeState('INN', { hp: 1 }), 3) });
    const r = await api.rest();
    expect(r.state.character.hp).toBe(30);
    expect(JSON.parse(store.raw('game')!)).toMatchObject({ hp: 30, revision: 4 });

    expect((await caught(setup().api.rest())).error).toBe('game_not_found');

    store.failWrites.add('game');
    const before = store.raw('game');
    const err = await caught(api.rest());
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 500, error: 'storage_error', message: '保存できませんでした' });
    expect(store.raw('game')).toBe(before);
  });

  test('quitGame は INN・CLEARED でプレイ中の状態を消す。ほかの場所では 409', async () => {
    for (const location of ['INN', 'CLEARED'] as const) {
      const { api, store } = setup({ game: storedGame(makeState(location)) });
      expect(await api.quitGame()).toBeUndefined();
      expect(store.raw('game')).toBeNull();
    }
    const { api, store } = setup({ game: storedGame(makeState('DUNGEON')) });
    expect((await caught(api.quitGame())).error).toBe('invalid_state');
    expect(store.raw('game')).not.toBeNull();
  });
});
