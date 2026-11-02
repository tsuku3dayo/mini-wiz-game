import { afterEach, describe, expect, test, vi } from 'vitest';
import { createGameApi } from '../../src/api/game-api';
import { GameError, type GameApi } from '../../src/api/types';
import type { GameStateData } from '../../src/domain/game-state';
import { SeededRng, SequenceRng, SwappableRng, type Rng } from '../../src/domain/rng';
import { createFakeStorage, type FakeStorage } from '../helpers/fake-storage';
import { LOCATIONS, makeItem, makeState } from '../helpers/fixtures';
import { battleState, dungeonState, openMap } from '../helpers/maps';
import { recordingRng } from '../helpers/rng';

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

describe('迷宮を探索する（ゲーム API）', () => {
  test('TC-0013-03 出発 → 宿屋へ戻る → もう一度出発 すると、2 回目の迷宮は 1 回目と違う', async () => {
    const { api } = setup({ game: storedGame(makeState('INN')) });
    await api.enterDungeon();
    const first = await api.debugDungeon();
    expect(first.floor).toBe(1);
    expect(first.player).toEqual({ ...first.up, facing: 'N' });
    await api.returnToInn();
    await api.enterDungeon();
    const second = await api.debugDungeon();
    expect({ walls: second.walls, up: second.up, down: second.down }).not.toEqual({ walls: first.walls, up: first.up, down: first.down });
  });

  test('TC-0038-03 debugDungeon は今の階の全マス（未踏破・ボスを含む）を返し、ふつうの結果にはそれらが入らない', async () => {
    const d = openMap({ x: 9, y: 2, facing: 'N' }, {}, 5);
    const { api } = setup({ game: storedGame(dungeonState(d)) });
    const debug = await api.debugDungeon();
    expect(debug).toEqual({
      floor: 5,
      player: { x: 9, y: 2, facing: 'N' },
      walls: d.floors[4].walls,
      up: { x: 0, y: 9 },
      down: null,
      boss: { x: 9, y: 0 },
      visited: d.floors[4].visited,
    });
    const view = (await api.move({ action: 'turnLeft' })).state;
    const text = JSON.stringify(view);
    for (const key of ['"walls":[', '"boss":', '"up":', '"down":', '"visited":', '"floors":', '"revision":', '"schemaVersion":', '"updatedAt":']) {
      expect(text).not.toContain(key);
    }
    expect(Object.keys(view.dungeon!).sort()).toEqual(['depths', 'facing', 'floor', 'map', 'underfoot']);
    expect(view.dungeon!.map.cells.every((c) => c === null)).toBe(true);

    // ゲームがなければ 404、ダンジョンがなければ 409「ダンジョンに いません」
    expect((await caught(setup().api.debugDungeon())).status).toBe(404);
    const inn = await caught(setup({ game: storedGame(makeState('INN')) }).api.debugDungeon());
    expect({ status: inn.status, error: inn.error, message: inn.message }).toEqual({ status: 409, error: 'invalid_state', message: 'ダンジョンに いません' });
  });
});

describe('保存の失敗と競合（迷宮の操作）', () => {
  test('TC-0012-03 書く直前の読み直しで revision が進んでいたら、move は 409 conflict で、保存はほかのタブの値のまま', async () => {
    const { api, store } = setup({ game: storedGame(dungeonState(openMap({ x: 4, y: 5 })), 3) });
    const other = storedGame(dungeonState(openMap({ x: 2, y: 2 })), 4);
    store.onRead = (name, n) => { if (name === 'game' && n === 2) store.put('game', other); };
    const err = await caught(api.move({ action: 'forward' }));
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 409, error: 'conflict', message: '他の操作と競合しました' });
    expect(JSON.parse(store.raw('game')!)).toEqual(other);
  });

  test('TC-0012-05 書けなければ move は 500 storage_error で保存は変わらない。セーブが書けなければ前のセーブが残る', async () => {
    const { api, store } = setup({ game: storedGame(dungeonState(openMap({ x: 4, y: 5 }))) });
    store.failWrites.add('game');
    const before = store.raw('game');
    const err = await caught(api.move({ action: 'forward' }));
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 500, error: 'storage_error', message: '保存できませんでした' });
    expect(store.raw('game')).toBe(before);

    const inn = setup({ game: storedGame(makeState('INN')), save: storedSave() });
    inn.store.failWrites.add('save');
    const saveBefore = inn.store.raw('save');
    const e2 = await caught(inn.api.save());
    expect({ status: e2.status, error: e2.error }).toEqual({ status: 500, error: 'storage_error' });
    expect(inn.store.raw('save')).toBe(saveBefore);
  });
});

/** 乱数を差し替えた API（引いた乱数を記録する） */
function setupWith(initial: Record<string, unknown>, inner: Rng) {
  const store = createFakeStorage(initial);
  const rng = recordingRng(inner);
  return { api: createGameApi({ store, rng: new SwappableRng(rng), now: () => NOW }), store, rng };
}

describe('戦闘とヒール（ゲーム API）', () => {
  test('TC-0015-05 結果に見せない情報がない。dungeon は 5 つのキーと今の階の 100 マス、battle は 5 つのキー。5F のボスは視界の stairs でも null', async () => {
    const d = openMap({ x: 9, y: 3, facing: 'N' }, {}, 5);
    const { api } = setupWith({ game: storedGame(dungeonState(d)) }, new SequenceRng([100, 20, 50]));
    // 敵の HP（ダークナイト 70・ゴブリン 18 から減った 14）が出ないことも見る
    const hidden = ['"revision":', '"schemaVersion":', '"updatedAt":', '"floors":', '"walls":[', '"visited":', '"boss":', '"hp":70', '"hp":14'];
    const check = (view: unknown) => {
      const text = JSON.stringify(view);
      for (const key of hidden) expect(text, key).not.toContain(key);
    };
    const game = (await api.getGame()).state!;
    check(game);
    expect(Object.keys(game.dungeon!).sort()).toEqual(['depths', 'facing', 'floor', 'map', 'underfoot']);
    expect(game.dungeon!.map.cells).toHaveLength(100);
    expect(game.dungeon!.map.cells.every((c) => c === null)).toBe(true);
    // ボスのマス (9,0) が視界の奥にあっても stairs は null
    expect(game.dungeon!.depths.map((x) => x.stairs)).toEqual([null, null, null, null]);

    // 前進（100：遭遇なし）→ 後退で 20 → 遭遇（50：5F ではダークナイト）→ 戦闘の結果
    expect(JSON.stringify(game)).not.toContain('"hp":70');
    check((await api.move({ action: 'forward' })).state);
    const met = await api.move({ action: 'backward' });
    expect(met.state.location).toBe('BATTLE');
    expect(met.state.battle!.enemyKind).toBe('darkKnight');
    check(met.state);
    expect(Object.keys(met.state.battle!).sort()).toEqual(['canFlee', 'canHeal', 'enemyKind', 'enemyName', 'isBoss']);
    const stairsApi = setup({ game: storedGame(dungeonState(openMap({ x: 9, y: 0 }))) }).api;
    check((await stairsApi.stairs({ direction: 'down' })).state);
    const fight = setupWith({ game: storedGame(battleState('goblin', 18)) }, new SequenceRng([100, 0, 100, 0]));
    const turn = await fight.api.battle({ command: 'attack' });
    check(turn.state);
    expect(Object.keys(turn.state.battle!).sort()).toEqual(['canFlee', 'canHeal', 'enemyKind', 'enemyName', 'isBoss']);
  });

  test('TC-0020-06 ボス戦で flee は 409「にげられない！」。保存（revision を含む）は同じで、乱数は進まない', async () => {
    const { api, store, rng } = setupWith({ game: storedGame(battleState('necromancer', 200), 6) }, new SeededRng(1));
    const before = store.raw('game');
    const err = await caught(api.battle({ command: 'flee' }));
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 409, error: 'invalid_state', message: 'にげられない！' });
    expect(store.raw('game')).toBe(before);
    expect(rng.calls).toHaveLength(0);
  });

  test('TC-0021-02 MP 2 で戦闘のヒール・ダンジョンのヒールは 409「MP が たりない」。保存は同じで、乱数を引かない', async () => {
    const cases = [
      { state: battleState('slime', 12, { mp: 2 }), call: (api: GameApi) => api.battle({ command: 'heal' }) },
      { state: dungeonState(openMap(), { mp: 2, hp: 10 }), call: (api: GameApi) => api.heal() },
    ];
    for (const c of cases) {
      const { api, store, rng } = setupWith({ game: storedGame(c.state) }, new SeededRng(1));
      const before = store.raw('game');
      const err = await caught(c.call(api));
      expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 409, error: 'invalid_state', message: 'MP が たりない' });
      expect(store.raw('game')).toBe(before);
      expect(rng.calls).toHaveLength(0);
    }
  });

  test('TC-0023-02 倒れる操作では経験値が増えず、所持品と nextId は同じ（ドロップなし）。セーブも同じ', async () => {
    const inventory = { ...INVENTORY, pending: null };
    const state = battleState('goblin', 18, { hp: 1, exp: 9, inventory });
    // ゴブリン（速さ 6）が先：回避の 100（外れ）・ダメージ 0 → 4 ダメージで倒れる
    const { api, store } = setupWith({ game: storedGame(state), save: storedSave() }, new SequenceRng([100, 0]));
    const save = store.raw('save');
    const r = await api.battle({ command: 'attack' });
    expect(r.state.location).toBe('INN');
    expect(r.state.character.exp).toBe(9);
    const game = JSON.parse(store.raw('game')!);
    expect(game.inventory).toEqual(inventory);
    expect(game.inventory.nextId).toBe(5);
    expect(store.raw('save')).toBe(save);
  });
});

describe('周回する（ゲーム API）', () => {
  test('TC-0008-05 1F の入口から戻っても、クリアから宿屋へ行っても、HP・MP は回復しない', async () => {
    const back = setup({ game: storedGame(dungeonState(openMap({ x: 0, y: 9 }), { hp: 10, mp: 1 })) });
    const r1 = await back.api.returnToInn();
    expect(r1.state.character).toMatchObject({ hp: 10, mp: 1 });
    const clear = setup({ game: storedGame(makeState('CLEARED', { hp: 10, mp: 1 })) });
    const r2 = await clear.api.continueGame();
    expect(r2.state.character).toMatchObject({ hp: 10, mp: 1 });
  });

  test('TC-0025-01 CLEARED で continueGame すると宿屋へ。ほかは変わらず「ゆうしゃは 宿屋に もどった」、乱数なし。2 回目は 409 で周回数は増えない', async () => {
    const inventory = { ...INVENTORY, pending: null };
    const records = { battles: 30, kills: 25, deaths: 1, laps: 2, bossKills: 1 };
    const state = makeState('CLEARED', { level: 15, exp: 2584, hp: 40, maxHp: 120, mp: 5, maxMp: 40, inventory, records });
    const { api, store, rng } = setupWith({ game: storedGame(state) }, new SeededRng(1));
    const r = await api.continueGame();
    expect(r.messages).toEqual([{ text: 'ゆうしゃは 宿屋に もどった', tone: 'normal' }]);
    expect(r.state).toMatchObject({ location: 'INN', dungeon: null, records });
    expect(r.state.character).toMatchObject({ level: 15, exp: 2584, hp: 40, mp: 5 });
    expect(JSON.parse(store.raw('game')!).inventory).toEqual(inventory);
    expect(rng.calls).toHaveLength(0);
    const err = await caught(api.continueGame());
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 409, error: 'invalid_state', message: 'その操作は いまは できない' });
    expect(JSON.parse(store.raw('game')!).records.laps).toBe(2);
  });
});

// 確認 ID のない、迷宮の操作の決まり（仕様書 §22.2）
describe('迷宮の操作の引数と結果', () => {
  test('move・stairs の引数が違えば 400 validation_error（details つき）。結果の dungeon は視界と今の階の地図', async () => {
    const { api } = setup({ game: storedGame(dungeonState(openMap({ x: 0, y: 9 }))) });
    const bad = await caught(api.move({ action: 'jump' } as never));
    expect({ status: bad.status, error: bad.error, message: bad.message }).toEqual({ status: 400, error: 'validation_error', message: '入力が正しくありません' });
    expect(bad.details).toEqual([{ field: 'action', message: 'action must be one of the following values: forward, backward, turnLeft, turnRight' }]);
    const badStairs = await caught(api.stairs({} as never));
    expect(badStairs.details).toEqual([{ field: 'direction', message: 'direction must be one of the following values: down, up' }]);

    const r = await api.move({ action: 'forward' });
    expect(r.state.dungeon).toMatchObject({ floor: 1, facing: 'N', underfoot: null });
    expect(r.state.dungeon!.map.player).toEqual({ x: 0, y: 8 });
    expect(r.state.dungeon!.map.cells.filter((c) => c !== null)).toHaveLength(1);
    const stairs = await caught(api.stairs({ direction: 'up' }));
    expect({ status: stairs.status, message: stairs.message }).toEqual({ status: 409, message: 'ここには のぼり階段は ない' });
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
