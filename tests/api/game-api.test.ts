import { afterEach, describe, expect, test, vi } from 'vitest';
import { createGameApi } from '../../src/api/game-api';
import { GameError, type GameApi } from '../../src/api/types';
import { GAME_SCHEMA_VERSION, SAVE_SCHEMA_VERSION, toSaveData, type GameStateData } from '../../src/domain/game-state';
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
  items: [makeItem(2, 'armor1', 'N', 1), makeItem(3, 'shield1', 'R', 3)],
  nextId: 5,
  pending: { item: makeItem(4, 'weapon1', 'N', 1), thenClear: false },
};

// 保存の版は今の版（古い版で書くと、読み込みでアクセの ID が付け替わる。TD-0002 §1.9）
function storedGame(state: GameStateData, revision = 3, schemaVersion = GAME_SCHEMA_VERSION) {
  return { ...state, schemaVersion, revision, updatedAt: '2026-11-01T00:00:00.000Z' };
}

/** オブジェクトから項目を抜いたものを返す（古い版・壊れた値を作るため） */
function without(obj: object, ...keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));
}

function storedSave(schemaVersion = SAVE_SCHEMA_VERSION) {
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
    const { api, store } = setup({ game: storedGame(makeState('INN')), 'save-1': storedSave() });
    const before = [store.raw('game'), store.raw('save-1')];
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
    expect([store.raw('game'), store.raw('save-1')]).toEqual(before);
  });

  test('TC-0007-09 startGame は前の状態を上書きし（revision は前 + 1）、セーブを読みも書きもしない。メッセージは 1 行', async () => {
    const { api, store } = setup({ game: storedGame(makeState('DUNGEON', CHARACTER), 4), 'save-1': storedSave() });
    const save = store.raw('save-1');
    const r = await api.startGame({ name: ' ゆうしゃ ' });
    expect(r.messages).toEqual([{ text: 'ゆうしゃの ぼうけんが はじまった', tone: 'normal' }]);
    expect(r.state).toMatchObject({ location: 'INN', character: { name: 'ゆうしゃ', level: 1, hp: 30, maxHp: 30 } });
    const game = JSON.parse(store.raw('game')!);
    expect(game).toMatchObject({ name: 'ゆうしゃ', level: 1, location: 'INN', dungeon: null, revision: 5, schemaVersion: GAME_SCHEMA_VERSION, updatedAt: NOW });
    expect(store.log.filter((l) => l.name.startsWith('save'))).toEqual([]);
    expect(store.raw('save-1')).toBe(save);

    // 前がなければ revision 0
    const fresh = setup();
    await fresh.api.startGame({ name: 'あ' });
    expect(JSON.parse(fresh.store.raw('game')!).revision).toBe(0);
  });
});

describe('セーブして、つづきから再開する', () => {
  test('TC-0009-01 INN で save({ slot: 2 }) すると save-2 に版 4 のセーブを書き、プレイ中の状態は saveSlot 2・revision + 1。slot の違反は 400、ほかの場所では 409', async () => {
    const state = makeState('INN', { ...CHARACTER, inventory: { ...INVENTORY, pending: null }, records: RECORDS });
    const { api, store } = setup({ game: storedGame(state, 3), 'save-1': storedSave(), 'save-3': storedSave() });
    const before = JSON.parse(store.raw('game')!);
    const others = [store.raw('save-1'), store.raw('save-3')];
    const r = await api.save({ slot: 2 });
    expect(r.messages).toEqual([{ text: 'スロット2に セーブしました', tone: 'success' }]);
    expect(JSON.parse(store.raw('save-2')!)).toEqual({
      schemaVersion: 4, ...CHARACTER, inventory: { ...INVENTORY, pending: null }, records: RECORDS, savedAt: NOW,
    });
    // プレイ中の状態は saveSlot と revision・updatedAt だけが変わる
    expect(JSON.parse(store.raw('game')!)).toEqual({ ...before, saveSlot: 2, revision: 4, updatedAt: NOW });
    expect(r.state.saveSlot).toBe(2);
    expect([store.raw('save-1'), store.raw('save-3')]).toEqual(others);

    // slot が 1〜3 でなければ 400（details つき）。何も書かない
    for (const input of [{ slot: 0 }, { slot: 4 }, { slot: '1' }, {}]) {
      const g = store.raw('game');
      const err = await caught(api.save(input as never));
      expect({ status: err.status, error: err.error, details: err.details }).toEqual({
        status: 400, error: 'validation_error', details: [{ field: 'slot', message: 'slot must be one of the following values: 1, 2, 3' }],
      });
      expect(store.raw('game')).toBe(g);
    }

    for (const location of ['DUNGEON', 'BATTLE', 'SWAP', 'CLEARED'] as const) {
      const other = setup({ game: storedGame(makeState(location)), 'save-1': storedSave() });
      const before = other.store.raw('save-1');
      const err = await caught(other.api.save({ slot: 1 }));
      expect({ status: err.status, error: err.error }).toEqual({ status: 409, error: 'invalid_state' });
      expect(other.store.raw('save-1')).toBe(before);
    }
  });

  test('TC-0009-03 load({ slot }) はどの場所からでもそのスロットの値で置き換えて宿屋から（saveSlot はそのスロット）。空きは 404、slot の違反は 400。getSaves は 3 つ', async () => {
    for (const location of LOCATIONS) {
      const { api, store } = setup({ game: storedGame(makeState(location), 7), 'save-3': storedSave() });
      const r = await api.load({ slot: 3 });
      expect(r.messages).toEqual([{ text: 'アルドは 宿屋で めをさました', tone: 'normal' }]);
      expect(r.state).toMatchObject({ location: 'INN', dungeon: null, battle: null, pendingDrop: null, records: RECORDS, saveSlot: 3 });
      expect(r.state.character).toMatchObject({ name: 'アルド', level: 4, hp: 12, mp: 3 });
      const game = JSON.parse(store.raw('game')!);
      expect(game).toMatchObject({ ...CHARACTER, location: 'INN', dungeon: null, battle: null, revision: 8, saveSlot: 3 });
      expect(game.inventory.pending).toBeNull();
    }
    const { api } = setup({ game: storedGame(makeState('INN')), 'save-1': storedSave() });
    const err = await caught(api.load({ slot: 2 }));
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 404, error: 'save_not_found', message: 'セーブデータが ありません' });
    const bad = await caught(api.load({ slot: 4 } as never));
    expect({ status: bad.status, error: bad.error }).toEqual({ status: 400, error: 'validation_error' });

    // getSaves：長さ 3。セーブがあれば要約、空き・読めない値は null
    const list = setup({ 'save-1': storedSave(), 'save-3': { ...storedSave(), name: 'ゆうしゃ', level: 12, savedAt: '2026-11-03T00:00:00.000Z' } });
    list.store.setRaw('save-2', '{broken');
    expect(await list.api.getSaves()).toEqual({
      slots: [
        { slot: 1, name: 'アルド', level: 4, savedAt: '2026-11-01T00:00:00.000Z' },
        null,
        { slot: 3, name: 'ゆうしゃ', level: 12, savedAt: '2026-11-03T00:00:00.000Z' },
      ],
    });
  });

  test('TC-0009-10 版 1・2 のゲーム状態は移した GameView、saveSlot は版 5 以下で持たなければ null・1〜3 ならその値。版 1〜3 のセーブは宿屋から。版 5 のセーブは 500 internal_error（v1.21 で版を 7・4 に）', async () => {
    // saveSlot（v1.14）：版 5 で持たない → null、移し替えで 1 を足した版 5・版 6 の 2 → その値、形違い → null
    const plain = without(storedGame(makeState('INN', CHARACTER), 1, 5), 'saveSlot');
    for (const [stored, want] of [
      [plain, null],
      [{ ...plain, saveSlot: 1 }, 1],
      [{ ...plain, schemaVersion: 6, saveSlot: 2 }, 2],
      [{ ...plain, schemaVersion: 6, saveSlot: 4 }, null],
      [{ ...plain, schemaVersion: 6, saveSlot: '3' }, null],
    ] as const) {
      expect((await setup({ game: stored }).api.getGame()).state!.saveSlot).toBe(want);
    }

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
      const { api } = setup({ 'save-1': storedSave(v) });
      const r = await api.load({ slot: 1 });
      expect(r.state).toMatchObject({ location: 'INN', character: { name: 'アルド', level: 4 }, records: { battles: 0, laps: 1 } });
      expect(r.state.inventory.count).toBe(v === 1 ? 0 : 2);
    }
    // 版 3：所持品・実績を読む（アクセの付け替えは TC-0009-13）
    const v3 = await setup({ 'save-1': storedSave(3) }).api.load({ slot: 1 });
    expect(v3.state).toMatchObject({ location: 'INN', records: { battles: 9, laps: 1 } });
    expect(v3.state.inventory.count).toBe(2);

    vi.spyOn(console, 'error').mockImplementation(() => {});
    const v5 = setup({ 'save-1': storedSave(5) });
    const err = await caught(v5.api.load({ slot: 1 }));
    expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 500, error: 'internal_error', message: '内部エラー' });
  });
});

describe('保存の失敗が分かる', () => {
  test('TC-0012-09 プレイ中の状態が壊れていたら getGame は null（warn 1 回、値は残る）。セーブが壊れていたらそのスロットは空き', async () => {
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
      store.setRaw('save-1', text);
      expect(await api.getSaves()).toEqual({ slots: [null, null, null] });
    }
  });
});

describe('迷宮を探索する（ゲーム API）', () => {
  test('TC-0013-03 出発 → 宿屋へ戻る（マップは残る）→ セーブ → つづきから（マップを捨てる）→ もう一度出発 すると、2 回目の迷宮は 1 回目と違う（v1.22）', async () => {
    const { api } = setup({ game: storedGame(makeState('INN')) });
    await api.enterDungeon();
    const first = await api.debugDungeon();
    expect(first.floor).toBe(1);
    expect(first.player).toEqual({ ...first.up, facing: 'N' });
    await api.returnToInn();
    await api.save({ slot: 1 });
    await api.load({ slot: 1 });
    await api.enterDungeon();
    const second = await api.debugDungeon();
    expect({ walls: second.walls, up: second.up, down: second.down }).not.toEqual({ walls: first.walls, up: first.up, down: first.down });
  });

  test('TC-0017-06 歩いて 1F の入口で宿屋へ戻ると、結果にマップがなく debugDungeon は 409。もう一度出発すると同じマップ・踏破記録の 1F の入口に北向きで立つ（v1.22）', async () => {
    const d = openMap({ x: 0, y: 7, facing: 'S' });
    const { api, rng } = setupWith({ game: storedGame(dungeonState(d)) }, new SequenceRng([99]));
    await api.move({ action: 'forward' });
    await api.move({ action: 'forward' });
    const before = await api.debugDungeon();
    expect(before.player).toEqual({ x: 0, y: 9, facing: 'S' });
    expect(before.visited.filter(Boolean)).toHaveLength(2);
    const back = await api.returnToInn();
    expect(back.state.location).toBe('INN');
    expect(back.state.dungeon).toBeNull();
    expect((await api.getGame()).state!.dungeon).toBeNull();
    const e = await caught(api.debugDungeon());
    expect({ status: e.status, error: e.error, message: e.message }).toEqual({ status: 409, error: 'invalid_state', message: 'ダンジョンに いません' });
    const drawn = rng.calls.length;
    await api.enterDungeon();
    expect(rng.calls.length).toBe(drawn);
    const after = await api.debugDungeon();
    expect(after).toEqual({ ...before, player: { x: 0, y: 9, facing: 'N' } });
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

    const inn = setup({ game: storedGame(makeState('INN')), 'save-1': storedSave() });
    inn.store.failWrites.add('save-1');
    const saveBefore = inn.store.raw('save-1');
    const e2 = await caught(inn.api.save({ slot: 1 }));
    expect({ status: e2.status, error: e2.error }).toEqual({ status: 500, error: 'storage_error' });
    expect(inn.store.raw('save-1')).toBe(saveBefore);
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
    const fight = setupWith({ game: storedGame(battleState('goblin', 20)) }, new SequenceRng([100, 0, 100, 0]));
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
    const state = battleState('goblin', 20, { hp: 1, exp: 9, inventory });
    // ゴブリン（速さ 6）が先：回避の 100（外れ）・ダメージ 0 → 4 ダメージで倒れる
    const { api, store } = setupWith({ game: storedGame(state), 'save-1': storedSave(), 'save-2': storedSave(2) }, new SequenceRng([100, 0]));
    const saves = () => [store.raw('save-1'), store.raw('save-2'), store.raw('save-3')];
    const before = saves();
    const r = await api.battle({ command: 'attack' });
    expect(r.state.location).toBe('INN');
    expect(r.state.character.exp).toBe(9);
    const game = JSON.parse(store.raw('game')!);
    expect(game.inventory).toEqual(inventory);
    expect(game.inventory.nextId).toBe(5);
    // セーブはどのスロットも変わらない（v1.14：3 スロット）
    expect(saves()).toEqual(before);
  });
});

/** 所持品つきの状態の材料：装備 2 枠・所持品 2 個・nextId 10（読み込みの補正で変わらないよう、段階で出るレアリティと範囲の値にする） */
const GEAR = {
  equipped: { weapon: makeItem(1, 'weapon3', 'R', 9), armor: null, shield: null, accessory: makeItem(2, 'accessory8', 'LG', 30) },
  items: [makeItem(3, 'weapon1', 'R', 3), makeItem(4, 'armor1', 'N', 1)],
  nextId: 10,
  pending: null,
};

/** n 個の所持品（ショートソード［N］を先頭に、残りはクロースアーマー［N］） */
const fullItems = (n: number) => Array.from({ length: n }, (_, i) => makeItem(i + 1, i === 0 ? 'weapon1' : 'armor1', 'N', 1));

/** Lv12・累計 1584 で、残り HP 1 のボスを倒す乱数（ボスのドロップ：エクスカリバー［LG］。v1.14 から成長の乱数はない） */
// 補正値の乱数は、エクスカリバー［LG］の範囲 40〜68 の中（v1.21）
const BOSS_KILL = [100, 0, 1, 0, 8, 1, 50];
const bossState = (overrides: Partial<GameStateData> = {}) =>
  // ボス（速さ 50）より先に動く（v1.21）
  battleState('necromancer', 1, { level: 12, exp: 1584, speed: 50, maxHp: 120, hp: 100, maxMp: 40, mp: 30, ...overrides });

describe('エラーの形（ゲーム API）', () => {
  test('TC-0012-02 §10.3 の表で許されない場所から呼ぶと 409 invalid_state。保存（revision を含む）は同じ', async () => {
    const ops: [string, (api: GameApi) => Promise<unknown>, string[]][] = [
      ['rest', (a) => a.rest(), ['INN']],
      ['save', (a) => a.save({ slot: 1 }), ['INN']],
      ['enterDungeon', (a) => a.enterDungeon(), ['INN']],
      ['move', (a) => a.move({ action: 'forward' }), ['DUNGEON']],
      ['stairs', (a) => a.stairs({ direction: 'down' }), ['DUNGEON']],
      ['returnToInn', (a) => a.returnToInn(), ['DUNGEON']],
      ['heal', (a) => a.heal(), ['DUNGEON']],
      ['equip', (a) => a.equip({ itemId: 3 }), ['INN', 'DUNGEON']],
      ['unequip', (a) => a.unequip({ slot: 'weapon' }), ['INN', 'DUNGEON']],
      ['discard', (a) => a.discard({ itemId: 3 }), ['INN', 'DUNGEON']],
      ['battle', (a) => a.battle({ command: 'attack' }), ['BATTLE']],
      ['lootTake', (a) => a.lootTake({ discardId: 3 }), ['SWAP']],
      ['lootAbandon', (a) => a.lootAbandon(), ['SWAP']],
      ['continueGame', (a) => a.continueGame(), ['CLEARED']],
      ['quitGame', (a) => a.quitGame(), ['INN', 'CLEARED']],
    ];
    for (const [name, call, allowed] of ops) {
      for (const location of LOCATIONS.filter((l) => !allowed.includes(l))) {
        const { api, store } = setup({ game: storedGame(makeState(location, { inventory: { ...GEAR, pending: location === 'SWAP' ? makeState('SWAP').inventory.pending : null } })), 'save-1': storedSave() });
        const before = [store.raw('game'), store.raw('save-1')];
        const err = await caught(call(api));
        expect({ op: name, location, status: err.status, error: err.error }).toEqual({ op: name, location, status: 409, error: 'invalid_state' });
        expect([store.raw('game'), store.raw('save-1')]).toEqual(before);
      }
    }
  });

  test('TC-0012-04 どのエラーも GameError で status・error・message を持ち、details は 400 のときだけ', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const check = (e: GameError, status: number, error: string) => {
      expect(e).toBeInstanceOf(GameError);
      expect({ status: e.status, error: e.error }).toEqual({ status, error });
      expect(typeof e.message).toBe('string');
      if (error === 'validation_error') {
        expect(e.details!.length).toBeGreaterThan(0);
        for (const d of e.details!) expect(Object.keys(d).sort()).toEqual(['field', 'message']);
      } else {
        expect(e.details).toBeUndefined();
      }
    };
    const dungeon = () => setup({ game: storedGame(dungeonState(openMap({ x: 4, y: 5 }))) });
    check(await caught(dungeon().api.move({ action: 'jump' } as never)), 400, 'validation_error');
    check(await caught(setup().api.move({ action: 'forward' })), 404, 'game_not_found');
    check(await caught(setup().api.load({ slot: 1 })), 404, 'save_not_found');
    check(await caught(dungeon().api.rest()), 409, 'invalid_state');
    const conflict = dungeon();
    conflict.store.onRead = (name, n) => { if (name === 'game' && n === 2) conflict.store.put('game', storedGame(dungeonState(), 9)); };
    check(await caught(conflict.api.move({ action: 'forward' })), 409, 'conflict');
    const rule = await caught(setup({ game: storedGame(makeState('INN')) }).api.unequip({ slot: 'shield' }));
    check(rule, 409, 'rule_violation');
    expect(rule.message).toBe('なにも そうびしていない');
    const fail = dungeon();
    fail.store.failWrites.add('game');
    check(await caught(fail.api.move({ action: 'forward' })), 500, 'storage_error');
    check(await caught(setup({ 'save-1': { ...storedSave(), schemaVersion: 9 } }).api.load({ slot: 1 })), 500, 'internal_error');
  });
});

describe('装備と所持品（ゲーム API）', () => {
  test('TC-0028-06 BATTLE・SWAP・CLEARED で equip・unequip・discard は 409「その操作は いまは できない」、保存は同じ', async () => {
    for (const location of ['BATTLE', 'SWAP', 'CLEARED'] as const) {
      for (const call of [(a: GameApi) => a.equip({ itemId: 3 }), (a: GameApi) => a.unequip({ slot: 'weapon' }), (a: GameApi) => a.discard({ itemId: 3 })]) {
        const { api, store } = setup({ game: storedGame(makeState(location, { inventory: { ...GEAR, pending: makeState(location).inventory.pending } })) });
        const before = store.raw('game');
        const err = await caught(call(api));
        expect({ status: err.status, error: err.error, message: err.message }).toEqual({ status: 409, error: 'invalid_state', message: 'その操作は いまは できない' });
        expect(store.raw('game')).toBe(before);
      }
    }
  });

  test('TC-0029-08 セーブに装備・所持品・nextId が入り、つづきからでその時点に戻る。SWAP から作ったセーブ・自動セーブの pending は null', async () => {
    const { api, store } = setup({ game: storedGame(makeState('INN', { inventory: GEAR })) });
    await api.save({ slot: 1 });
    const save = JSON.parse(store.raw('save-1')!);
    expect(save.inventory).toEqual({ ...GEAR, pending: null });
    await api.discard({ itemId: 3 });
    await api.unequip({ slot: 'weapon' });
    const r = await api.load({ slot: 1 });
    expect(r.state.inventory.equipped.weapon!.id).toBe(1);
    expect(r.state.inventory.items.map((i) => i.id)).toEqual([4, 3]);
    expect(JSON.parse(store.raw('game')!).inventory).toEqual({ ...GEAR, pending: null });
    expect(toSaveData(makeState('SWAP')).inventory.pending).toBeNull();

    const boss = setupWith({ game: storedGame(bossState()) }, new SequenceRng(BOSS_KILL));
    await boss.api.battle({ command: 'attack' });
    expect(JSON.parse(boss.store.raw('save-1')!).inventory.pending).toBeNull();
  });

  test('TC-0029-09 倒れても装備・所持品・nextId は同じ。startGame では装備なし・所持品 0・nextId 1', async () => {
    const { api, store } = setupWith({ game: storedGame(battleState('goblin', 20, { hp: 1, inventory: GEAR })) }, new SequenceRng([100, 0]));
    const r = await api.battle({ command: 'attack' });
    expect(r.state.location).toBe('INN');
    expect(JSON.parse(store.raw('game')!).inventory).toEqual(GEAR);
    await api.startGame({ name: 'あ' });
    expect(JSON.parse(store.raw('game')!).inventory).toEqual({ equipped: { weapon: null, armor: null, shield: null, accessory: null }, items: [], nextId: 1, pending: null });
  });

  test('TC-0029-11 マスタにない個体は警告して取り除き、形の違う個体は黙って捨てる。所持品 null は空。nextId は取り除いた個体の id + 1 以上', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const raw = {
      equipped: { weapon: { id: 20, itemId: 'weapon9', rarity: 'N', value: 1 }, armor: null, shield: null, accessory: null },
      items: [
        { id: 21, itemId: 'weapon9', rarity: 'N', value: 1 },
        { id: 1.5, itemId: 'weapon1', rarity: 'N', value: 1 },
        { id: 22, itemId: 'weapon1', rarity: 'N', value: 1.2 },
        { id: 23, itemId: 'weapon1', rarity: 'XX', value: 1 },
        { id: 5, itemId: 'weapon1', rarity: 'N', value: 1 },
      ],
      nextId: 3,
      pending: { item: { id: 30, itemId: 'weapon9', rarity: 'N', value: 1 }, thenClear: false },
    };
    const { api } = setup({ game: { ...storedGame(makeState('SWAP')), inventory: raw } });
    const g = (await api.getGame()).state!;
    expect(warn).toHaveBeenCalled();
    expect(g.inventory.equipped.weapon).toBeNull();
    expect(g.inventory.items.map((i) => i.id)).toEqual([5]);
    expect(g.pendingDrop).toBeNull();
    warn.mockRestore();

    const quiet = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const empty = setup({ game: { ...storedGame(makeState('INN')), inventory: null } });
    expect((await empty.api.getGame()).state!.inventory).toMatchObject({ count: 0, items: [] });
    expect(quiet).not.toHaveBeenCalled();
    // nextId は取り除いた個体（30）を含めて + 1 以上：次に拾うと 31
    const swap = setupWith({ game: { ...storedGame(battleState('slime', 1)), inventory: { ...raw, pending: null } } }, new SequenceRng([100, 0, 15, 0, 1, 1, 1]));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const won = await swap.api.battle({ command: 'attack' });
    expect(won.state.inventory.items[0].id).toBe(22);
  });
});

describe('満杯の入れ替え（ゲーム API）', () => {
  test('TC-0030-02 SWAP のあいだ、ほかの操作は 409 で状態は変わらない。getGame の pendingDrop はいつも同じ個体', async () => {
    const { api, store } = setup({ game: storedGame(makeState('SWAP')) });
    const before = store.raw('game');
    const calls = [
      () => api.move({ action: 'forward' }), () => api.heal(), () => api.rest(), () => api.equip({ itemId: 1 }),
      () => api.unequip({ slot: 'weapon' }), () => api.discard({ itemId: 1 }), () => api.stairs({ direction: 'down' }), () => api.returnToInn(),
    ];
    for (const call of calls) expect((await caught(call())).error).toBe('invalid_state');
    expect(store.raw('game')).toBe(before);
    const a = (await api.getGame()).state!.pendingDrop!;
    const b = (await api.getGame()).state!.pendingDrop!;
    expect(a.id).toBe(b.id);
    expect(a).toEqual(b);
  });

  test('TC-0030-07 50 個のままボスを倒すと SWAP・laps 2・bossKills 1・クリアの行なし・セーブなし。あきらめると CLEARED・クリアの行・laps 2 のまま・セーブを書く', async () => {
    const inventory = { equipped: GEAR.equipped, items: fullItems(50), nextId: 60, pending: null };
    const { api, store } = setupWith({ game: storedGame(bossState({ inventory })) }, new SequenceRng(BOSS_KILL));
    const r = await api.battle({ command: 'attack' });
    expect(r.state.location).toBe('SWAP');
    expect(r.state.records).toMatchObject({ laps: 2, bossKills: 1 });
    expect(r.messages.some((m) => m.text === 'ダンジョンに 平和が もどった')).toBe(false);
    expect(store.raw('save-1')).toBeNull();
    const done = await api.lootAbandon();
    expect(done.state.location).toBe('CLEARED');
    expect(done.messages.at(-1)!.text).toBe('ダンジョンに 平和が もどった');
    expect(done.state.records.laps).toBe(2);
    const save = JSON.parse(store.raw('save-1')!);
    expect(save.records).toMatchObject({ laps: 2, bossKills: 1 });
    expect(save.inventory.pending).toBeNull();
    expect(save.level).toBe(12);
  });
});

describe('ボスとクリアの自動セーブ（ゲーム API）', () => {
  test('TC-0024-04 ボスを倒すと、最後に使ったスロット（saveSlot 2 → save-2）がクリア時点の値で上書きされ、ほかのスロットは同じ。autoSaved は true', async () => {
    const { api, store } = setupWith(
      { game: storedGame(bossState({ saveSlot: 2 })), 'save-1': storedSave(), 'save-2': storedSave(), 'save-3': storedSave() },
      new SequenceRng(BOSS_KILL),
    );
    const others = [store.raw('save-1'), store.raw('save-3')];
    const r = await api.battle({ command: 'attack' });
    expect(r.state.location).toBe('CLEARED');
    const save = JSON.parse(store.raw('save-2')!);
    const game = JSON.parse(store.raw('game')!);
    expect(save).toMatchObject({ name: 'ゆうしゃ', level: 12, exp: 2584, hp: game.hp, maxHp: game.maxHp, mp: game.mp, maxMp: game.maxMp, attack: game.attack, defense: game.defense, speed: game.speed });
    expect(save.inventory.items.at(-1)).toMatchObject({ itemId: 'weapon8', rarity: 'LG' });
    expect(save.inventory.pending).toBeNull();
    expect(save.records).toMatchObject({ laps: 2, bossKills: 1 });
    expect([store.raw('save-1'), store.raw('save-3')]).toEqual(others);
    expect(r.state.clear).toEqual({ autoSaved: true });
    expect((await api.getGame()).state!.clear).toEqual({ autoSaved: true });
  });

  test('TC-0024-06 ボスを倒す操作で書くスロットかプレイ中状態が書けないと 500 で、両方とも前のまま。入れ替えで CLEARED になるときも同じ', async () => {
    for (const key of ['save-2', 'game']) {
      const { api, store } = setupWith({ game: storedGame(bossState({ saveSlot: 2 })), 'save-2': storedSave() }, new SequenceRng(BOSS_KILL));
      store.failWrites.add(key);
      const before = [store.raw('game'), store.raw('save-1'), store.raw('save-2'), store.raw('save-3')];
      const err = await caught(api.battle({ command: 'attack' }));
      expect({ key, status: err.status, error: err.error }).toEqual({ key, status: 500, error: 'storage_error' });
      expect([store.raw('game'), store.raw('save-1'), store.raw('save-2'), store.raw('save-3')]).toEqual(before);
    }
    const pending = { item: makeItem(70, 'weapon8', 'LG', 60), thenClear: true };
    for (const [key, call] of [['save-1', (a: GameApi) => a.lootTake({ discardId: 1 })], ['game', (a: GameApi) => a.lootAbandon()]] as const) {
      const swap = makeState('SWAP', { dungeon: null, saveSlot: 1, inventory: { equipped: GEAR.equipped, items: fullItems(50), nextId: 71, pending } });
      const { api, store } = setup({ game: storedGame(swap), 'save-1': storedSave() });
      store.failWrites.add(key);
      const before = [store.raw('game'), store.raw('save-1')];
      expect((await caught(call(api))).error).toBe('storage_error');
      expect([store.raw('game'), store.raw('save-1')]).toEqual(before);
    }
  });

  test('TC-0024-09 自動セーブのスロット：saveSlot 3 なら save-3。なければ最初の空き（save-2）で saveSlot 2 に。3 つとも埋まって saveSlot がなければ書かず autoSaved は false', async () => {
    // saveSlot 3 → save-3
    const s3 = setupWith({ game: storedGame(bossState({ saveSlot: 3 })) }, new SequenceRng(BOSS_KILL));
    await s3.api.battle({ command: 'attack' });
    expect(JSON.parse(s3.store.raw('save-3')!).level).toBe(12);
    expect([s3.store.raw('save-1'), s3.store.raw('save-2')]).toEqual([null, null]);

    // saveSlot なし・スロット 1 が埋まり 2 が空き → save-2、プレイ中の状態の saveSlot が 2
    const s2 = setupWith({ game: storedGame(bossState()), 'save-1': storedSave() }, new SequenceRng(BOSS_KILL));
    const first = s2.store.raw('save-1');
    const r2 = await s2.api.battle({ command: 'attack' });
    expect(JSON.parse(s2.store.raw('save-2')!).records).toMatchObject({ laps: 2, bossKills: 1 });
    expect(s2.store.raw('save-1')).toBe(first);
    expect(JSON.parse(s2.store.raw('game')!).saveSlot).toBe(2);
    expect(r2.state).toMatchObject({ saveSlot: 2, clear: { autoSaved: true } });

    // 3 つとも埋まっていて saveSlot がない → どのスロットも変わらず、プレイ中の状態だけ（CLEARED）。autoSaved は false
    const full = setupWith(
      { game: storedGame(bossState()), 'save-1': storedSave(), 'save-2': storedSave(), 'save-3': storedSave() },
      new SequenceRng(BOSS_KILL),
    );
    const saves = () => [full.store.raw('save-1'), full.store.raw('save-2'), full.store.raw('save-3')];
    const before = saves();
    const r = await full.api.battle({ command: 'attack' });
    expect(saves()).toEqual(before);
    expect(JSON.parse(full.store.raw('game')!)).toMatchObject({ location: 'CLEARED', saveSlot: null });
    expect(r.state.clear).toEqual({ autoSaved: false });
    expect((await full.api.getGame()).state!.clear).toEqual({ autoSaved: false });
  });
});

describe('実績（ゲーム API）', () => {
  test('TC-0026-01 初期の実績で 5F のボスのマスに入り、1 戦目で倒すと { battles 1, kills 1, deaths 0, laps 2, bossKills 1 }', async () => {
    // こうげき 900・速さ 50 のキャラクター：先攻（ボスも速さ 50）・回避 100（外れ）・ダメージ 0 → 900 − 0 ＝ 900 ダメージで撃破（ボスの HP 800・防御 0。v1.21）。
    // 経験値を足すだけ（成長の乱数なし。v1.14）→ ボスのドロップ 5 個（部位 0・段階 8・レアリティ・補正値 50）
    const state = dungeonState(openMap({ x: 9, y: 1 }, {}, 5), { attack: 900, speed: 50 });
    const { api } = setupWith({ game: storedGame(state) }, new SequenceRng(BOSS_KILL));
    const met = await api.move({ action: 'forward' });
    expect(met.state.battle).toMatchObject({ isBoss: true });
    const r = await api.battle({ command: 'attack' });
    expect(r.state.location).toBe('CLEARED');
    expect(r.state.records).toEqual({ battles: 1, kills: 1, deaths: 0, laps: 2, bossKills: 1 });
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
  test('getGame・getSaves：なければ null と空き 3 つ、あれば GameView とセーブの要約', async () => {
    const empty = setup();
    expect(await empty.api.getGame()).toEqual({ state: null });
    expect(await empty.api.getSaves()).toEqual({ slots: [null, null, null] });
    const { api } = setup({ game: storedGame(makeState('INN', { ...CHARACTER, inventory: { ...INVENTORY, pending: null } })), 'save-1': storedSave() });
    const g = (await api.getGame()).state!;
    expect(g.character).toMatchObject({ attack: 12, base: { attack: 9 }, bonus: { attack: 3 }, nextLevelExp: 240, expToNext: 90 });
    expect(g.inventory.items.map((i) => i.id)).toEqual([3, 2]);
    expect(g.inventory.equipped.weapon).toEqual({ id: 1, itemId: 'weapon2', name: 'スピア', slot: 'weapon', rarity: 'N', stat: 'attack', stats: ['attack'], value: 3 });
    expect(await api.getSaves()).toEqual({ slots: [{ slot: 1, name: 'アルド', level: 4, savedAt: '2026-11-01T00:00:00.000Z' }, null, null] });
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

// 速さ（TC-0037-01。TST-0001 §7：目標 100ms の 3 倍まで許す）
describe('操作の速さ', () => {
  test('TC-0037-01 どの操作も、所持品 50 個・踏破済みの多い 5F・3 スロットとも埋まった重い状態で、呼び出しから結果まで 300ms 未満', async () => {
    const items = Array.from({ length: 50 }, (_, i) => makeItem(i + 10, 'weapon1', 'N', 1));
    const inventory = {
      equipped: { weapon: makeItem(1, 'weapon6', 'UR', 28), armor: makeItem(2, 'armor4', 'R', 10), shield: null, accessory: null },
      items, nextId: 60, pending: null,
    };
    const heavy = { ...CHARACTER, level: 15, hp: 40, maxHp: 120, mp: 40, maxMp: 40, inventory };
    /** floor 階で player に立つ地図。その階はボスのマスを除いて全部踏破済み */
    const map = (floor: number, player: { x: number; y: number }) => {
      const d = openMap(player, {}, floor);
      d.floors[floor - 1].visited = d.floors[floor - 1].visited.map((_, j) => !(floor === 5 && j === 9));
      return d;
    };
    const deep = (overrides: Partial<GameStateData> = {}) => makeState('DUNGEON', { ...heavy, dungeon: map(5, { x: 5, y: 5 }), ...overrides });
    // セーブは、重い宿屋の状態から本物の save で作る
    const saver = setup({ game: storedGame(makeState('INN', heavy)) });
    await saver.api.save({ slot: 1 });
    const save = JSON.parse(saver.store.raw('save-1')!) as Record<string, unknown>;
    // 3 スロットとも埋まった保存（v1.14）
    const saves = { 'save-1': save, 'save-2': save, 'save-3': save };
    const cases: [string, Record<string, unknown>, (a: GameApi) => Promise<unknown>][] = [
      ['startGame', {}, (a) => a.startGame({ name: 'ゆうしゃ' })],
      ['getGame', { game: storedGame(deep()), ...saves }, (a) => a.getGame()],
      ['getSaves', saves, (a) => a.getSaves()],
      ['rest', { game: storedGame(makeState('INN', heavy)) }, (a) => a.rest()],
      ['save', { game: storedGame(makeState('INN', heavy)), ...saves }, (a) => a.save({ slot: 2 })],
      ['load', saves, (a) => a.load({ slot: 3 })],
      ['enterDungeon', { game: storedGame(makeState('INN', heavy)) }, (a) => a.enterDungeon()],
      ['move', { game: storedGame(deep()) }, (a) => a.move({ action: 'forward' })],
      ['stairs', { game: storedGame(deep({ dungeon: map(5, { x: 0, y: 9 }) })) }, (a) => a.stairs({ direction: 'up' })],
      ['returnToInn', { game: storedGame(deep({ dungeon: map(1, { x: 0, y: 9 }) })) }, (a) => a.returnToInn()],
      ['heal', { game: storedGame(deep()) }, (a) => a.heal()],
      ['battle', { game: storedGame(makeState('BATTLE', { ...heavy, dungeon: map(5, { x: 5, y: 5 }), battle: { enemy: { kind: 'darkKnight', hp: 1 }, isBoss: false } })) }, (a) => a.battle({ command: 'attack' })],
      ['equip', { game: storedGame(makeState('INN', heavy)) }, (a) => a.equip({ itemId: 10 })],
      ['unequip', { game: storedGame(makeState('INN', { ...heavy, inventory: { ...inventory, items: items.slice(1) } })) }, (a) => a.unequip({ slot: 'weapon' })],
      ['discard', { game: storedGame(makeState('INN', heavy)) }, (a) => a.discard({ itemId: 10 })],
      ['lootTake', { game: storedGame(makeState('SWAP', { ...heavy, dungeon: map(5, { x: 5, y: 5 }), inventory: { ...inventory, pending: { item: makeItem(70, 'weapon8', 'LG', 60), thenClear: false } } })) }, (a) => a.lootTake({ discardId: 10 })],
      ['lootAbandon', { game: storedGame(makeState('SWAP', { ...heavy, dungeon: map(5, { x: 5, y: 5 }), inventory: { ...inventory, pending: { item: makeItem(70, 'weapon8', 'LG', 60), thenClear: false } } })) }, (a) => a.lootAbandon()],
      ['continueGame', { game: storedGame(makeState('CLEARED', heavy)) }, (a) => a.continueGame()],
    ];
    const times: Record<string, number> = {};
    for (const [name, initial, call] of cases) {
      // 1 回目は JIT の準備として捨て、2 回目を測る（どちらも新しい保存から）
      let ms = 0;
      for (let round = 0; round < 2; round += 1) {
        const { api } = setup(structuredClone(initial));
        const t0 = performance.now();
        const result = await call(api);
        ms = performance.now() - t0;
        expect(result, name).toBeDefined();
      }
      times[name] = Math.round(ms * 100) / 100;
    }
    console.log('TC-0037-01 操作の時間（ms）', JSON.stringify(times));
    for (const [name, ms] of Object.entries(times)) expect(ms, name).toBeLessThan(300);
    expect(Object.keys(times)).toHaveLength(18);
  });
});