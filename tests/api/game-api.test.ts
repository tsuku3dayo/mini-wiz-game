import { afterEach, describe, expect, test, vi } from 'vitest';
import { createGameApi } from '../../src/api/game-api';
import { GameError, type GameApi } from '../../src/api/types';
import { toSaveData, type GameStateData } from '../../src/domain/game-state';
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

/** 所持品つきの状態の材料：装備 2 枠・所持品 2 個・nextId 10（読み込みの補正で変わらないよう、段階で出るレアリティと範囲の値にする） */
const GEAR = {
  equipped: { weapon: makeItem(1, 'weapon3', 'R', 9), armor: null, shield: null, accessory: makeItem(2, 'accessory8', 'LG', 20) },
  items: [makeItem(3, 'weapon1', 'R', 2), makeItem(4, 'armor1', 'N', 1)],
  nextId: 10,
  pending: null,
};

/** n 個の所持品（ショートソード［N］を先頭に、残りはクロースアーマー［N］） */
const fullItems = (n: number) => Array.from({ length: n }, (_, i) => makeItem(i + 1, i === 0 ? 'weapon1' : 'armor1', 'N', 1));

/** Lv12・累計 1584 で、残り HP 1 のボスを倒す乱数（成長 3 回分・ボスのドロップ：エクスカリバー［LG］） */
const BOSS_KILL = [100, 0, ...Array.from({ length: 15 }, (_, i) => [8, 2, 1, 1, 1][i % 5]), 1, 0, 8, 1, 20];
const bossState = (overrides: Partial<GameStateData> = {}) =>
  battleState('necromancer', 1, { level: 12, exp: 1584, speed: 30, maxHp: 120, hp: 100, maxMp: 40, mp: 30, ...overrides });

describe('エラーの形（ゲーム API）', () => {
  test('TC-0012-02 §10.3 の表で許されない場所から呼ぶと 409 invalid_state。保存（revision を含む）は同じ', async () => {
    const ops: [string, (api: GameApi) => Promise<unknown>, string[]][] = [
      ['rest', (a) => a.rest(), ['INN']],
      ['save', (a) => a.save(), ['INN']],
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
        const { api, store } = setup({ game: storedGame(makeState(location, { inventory: { ...GEAR, pending: location === 'SWAP' ? makeState('SWAP').inventory.pending : null } })), save: storedSave() });
        const before = [store.raw('game'), store.raw('save')];
        const err = await caught(call(api));
        expect({ op: name, location, status: err.status, error: err.error }).toEqual({ op: name, location, status: 409, error: 'invalid_state' });
        expect([store.raw('game'), store.raw('save')]).toEqual(before);
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
    check(await caught(setup().api.load()), 404, 'save_not_found');
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
    check(await caught(setup({ save: { ...storedSave(), schemaVersion: 9 } }).api.load()), 500, 'internal_error');
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
    await api.save();
    const save = JSON.parse(store.raw('save')!);
    expect(save.inventory).toEqual({ ...GEAR, pending: null });
    await api.discard({ itemId: 3 });
    await api.unequip({ slot: 'weapon' });
    const r = await api.load();
    expect(r.state.inventory.equipped.weapon!.id).toBe(1);
    expect(r.state.inventory.items.map((i) => i.id)).toEqual([4, 3]);
    expect(JSON.parse(store.raw('game')!).inventory).toEqual({ ...GEAR, pending: null });
    expect(toSaveData(makeState('SWAP')).inventory.pending).toBeNull();

    const boss = setupWith({ game: storedGame(bossState()) }, new SequenceRng(BOSS_KILL));
    await boss.api.battle({ command: 'attack' });
    expect(JSON.parse(boss.store.raw('save')!).inventory.pending).toBeNull();
  });

  test('TC-0029-09 倒れても装備・所持品・nextId は同じ。startGame では装備なし・所持品 0・nextId 1', async () => {
    const { api, store } = setupWith({ game: storedGame(battleState('goblin', 18, { hp: 1, inventory: GEAR })) }, new SequenceRng([100, 0]));
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
    expect(store.raw('save')).toBeNull();
    const done = await api.lootAbandon();
    expect(done.state.location).toBe('CLEARED');
    expect(done.messages.at(-1)!.text).toBe('ダンジョンに 平和が もどった');
    expect(done.state.records.laps).toBe(2);
    const save = JSON.parse(store.raw('save')!);
    expect(save.records).toMatchObject({ laps: 2, bossKills: 1 });
    expect(save.inventory.pending).toBeNull();
    expect(save.level).toBe(15);
  });
});

describe('ボスとクリアの自動セーブ（ゲーム API）', () => {
  test('TC-0024-04 ボスを倒すと、セーブがクリア時点の値で上書きされる（Lv15・2584・LG の個体・pending null・laps 2・bossKills 1）。autoSaved は true', async () => {
    const { api, store } = setupWith({ game: storedGame(bossState()), save: storedSave() }, new SequenceRng(BOSS_KILL));
    const r = await api.battle({ command: 'attack' });
    expect(r.state.location).toBe('CLEARED');
    const save = JSON.parse(store.raw('save')!);
    const game = JSON.parse(store.raw('game')!);
    expect(save).toMatchObject({ name: 'ゆうしゃ', level: 15, exp: 2584, hp: game.hp, maxHp: game.maxHp, mp: game.mp, maxMp: game.maxMp, attack: game.attack, defense: game.defense, speed: game.speed });
    expect(save.inventory.items.at(-1)).toMatchObject({ itemId: 'weapon8', rarity: 'LG' });
    expect(save.inventory.pending).toBeNull();
    expect(save.records).toMatchObject({ laps: 2, bossKills: 1 });
    expect((await api.getGame()).state!.clear).toEqual({ autoSaved: true });
  });

  test('TC-0024-06 ボスを倒す操作でセーブかプレイ中状態が書けないと 500 で、両方とも前のまま。入れ替えで CLEARED になるときも同じ', async () => {
    for (const key of ['save', 'game']) {
      const { api, store } = setupWith({ game: storedGame(bossState()), save: storedSave() }, new SequenceRng(BOSS_KILL));
      store.failWrites.add(key);
      const before = [store.raw('game'), store.raw('save')];
      const err = await caught(api.battle({ command: 'attack' }));
      expect({ key, status: err.status, error: err.error }).toEqual({ key, status: 500, error: 'storage_error' });
      expect([store.raw('game'), store.raw('save')]).toEqual(before);
    }
    const pending = { item: makeItem(70, 'weapon8', 'LG', 60), thenClear: true };
    for (const [key, call] of [['save', (a: GameApi) => a.lootTake({ discardId: 1 })], ['game', (a: GameApi) => a.lootAbandon()]] as const) {
      const swap = makeState('SWAP', { dungeon: null, inventory: { equipped: GEAR.equipped, items: fullItems(50), nextId: 71, pending } });
      const { api, store } = setup({ game: storedGame(swap), save: storedSave() });
      store.failWrites.add(key);
      const before = [store.raw('game'), store.raw('save')];
      expect((await caught(call(api))).error).toBe('storage_error');
      expect([store.raw('game'), store.raw('save')]).toEqual(before);
    }
  });
});

describe('実績（ゲーム API）', () => {
  test('TC-0026-01 初期の実績で 5F のボスのマスに入り、1 戦目で倒すと { battles 1, kills 1, deaths 0, laps 2, bossKills 1 }', async () => {
    // こうげき 300・速さ 30 のキャラクター：先攻・回避 100（外れ）・ダメージ 0 → 290 ダメージで撃破。
    // Lv1 → Lv9 の成長 8 回（40 個）→ ボスのドロップ 5 個（部位 0・段階 8・レアリティ・補正値の元 20）
    const state = dungeonState(openMap({ x: 9, y: 1 }, {}, 5), { attack: 300, speed: 30 });
    const growth = Array.from({ length: 8 * 5 }, (_, i) => [8, 2, 1, 1, 1][i % 5]);
    const { api } = setupWith({ game: storedGame(state) }, new SequenceRng([100, 0, ...growth, 1, 0, 8, 1, 20]));
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

// 速さ（TC-0037-01。TST-0001 §7：目標 100ms の 3 倍まで許す）
describe('操作の速さ', () => {
  test('TC-0037-01 どの操作も、所持品 50 個・踏破済みの多い 5F の重い状態で、呼び出しから結果まで 300ms 未満', async () => {
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
    await saver.api.save();
    const save = JSON.parse(saver.store.raw('save')!) as Record<string, unknown>;
    const cases: [string, Record<string, unknown>, (a: GameApi) => Promise<unknown>][] = [
      ['startGame', {}, (a) => a.startGame({ name: 'ゆうしゃ' })],
      ['getGame', { game: storedGame(deep()), save: save }, (a) => a.getGame()],
      ['getSave', { save: save }, (a) => a.getSave()],
      ['rest', { game: storedGame(makeState('INN', heavy)) }, (a) => a.rest()],
      ['save', { game: storedGame(makeState('INN', heavy)) }, (a) => a.save()],
      ['load', { save: save }, (a) => a.load()],
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