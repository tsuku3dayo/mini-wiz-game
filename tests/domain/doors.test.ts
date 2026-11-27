// 扉と宝箱（仕様書 §3.4〜§3.6、§4.11、§8.4。v1.25。TC-0041）
import { describe, expect, test } from 'vitest';
import { cellIndex, bfsDistances } from '../../src/domain/dungeon';
import { deadEnds, doorSide, openChest, openDoor, placeDoors } from '../../src/domain/doors';
import { InvalidStateError } from '../../src/domain/errors';
import { useStairs, moveInDungeon } from '../../src/domain/explore';
import type { DungeonData, GameStateData } from '../../src/domain/game-state';
import { SequenceRng } from '../../src/domain/rng';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeItem, makeState } from '../helpers/fixtures';
import { dungeonState, noRng, openMap, withDoor } from '../helpers/maps';

/** 409 invalid_state を投げ、文言が message であることを確かめる */
function expectInvalid(fn: () => unknown, message: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(InvalidStateError);
    expect((e as InvalidStateError).message).toBe(message);
    return;
  }
  throw new Error('例外が出なかった');
}

/** (4,4) を南だけ開いた行き止まりにして扉を置き、扉の前 (4,5) に立つ */
function doorScene(content: 'down' | 'boss' | 'enemy' | 'chest', opts: { floor?: number; facing?: 'N' | 'E' | 'S' | 'W'; state?: 'closed' | 'chest' | 'gone' } = {}): GameStateData {
  const floor = opts.floor ?? 1;
  const d = withDoor(openMap({ x: 4, y: 5, facing: opts.facing ?? 'N' }, {}, floor), floor, 44, 'S', content, opts.state ?? 'closed');
  // 下り階段・ボスの扉なら、そのマスを目標にする
  const floors = d.floors.map((f, i) => (i !== floor - 1 ? f
    : content === 'down' ? { ...f, down: { x: 4, y: 4 } }
      : content === 'boss' ? { ...f, boss: { x: 4, y: 4 } } : f));
  return dungeonState({ ...d, floors } as DungeonData);
}

const doorOf = (s: GameStateData) => s.dungeon!.floors[s.dungeon!.floor - 1].doors[0];

describe('扉の置き方', () => {
  test('TC-0041-01 deadEnds は開いた辺が 1 つのマスを番号順に返し、up のマスは除く。doorSide はその開いた辺', () => {
    let d = openMap({ x: 0, y: 9 });
    d = withDoor(d, 1, 44, 'S', 'chest');
    d = withDoor(d, 1, 11, 'E', 'chest');
    d = withDoor(d, 1, 90, 'N', 'chest'); // up のマス (0,9)
    const walls = d.floors[0].walls;
    expect(deadEnds(walls, 90)).toEqual([11, 44]);
    expect(deadEnds(walls, 0)).toEqual([11, 44, 90]);
    expect(doorSide(walls, 44)).toBe('S');
    expect(doorSide(walls, 11)).toBe('E');
    // 外周だけが壁の地図には行き止まりがない
    expect(deadEnds(openMap().floors[0].walls, 90)).toEqual([]);
  });

  test('TC-0041-02 placeDoors：目標は行き止まりのうち最遠、ほかは 敵・宝箱・敵・宝箱（5F は宝箱 4）。足りなければ減り、行き止まりがない・近すぎるときは目標は全マスの最遠で扉なし', () => {
    let d = openMap({ x: 0, y: 9 });
    for (const cell of [11, 13, 15, 17, 31, 33]) d = withDoor(d, 1, cell, 'S', 'chest');
    const walls = d.floors[0].walls;
    const up = 90;
    const dist = bfsDistances(walls, { x: 0, y: 9 });
    const dead = deadEnds(walls, up);
    const max = Math.max(...dead.map((i) => dist[i]));
    const cands = dead.filter((i) => dist[i] === max);
    // 目標の乱数 0、ほかの扉の乱数 i（入れ替えなし）→ 目標は cands[0]、ほかは残りの先頭 4 つ
    const rng = new SequenceRng([0, 0, 1, 2, 3]);
    const r = placeDoors(walls, up, dist, false, 5, rng);
    rng.assertExhausted();
    const rest = dead.filter((i) => i !== cands[0]);
    expect(r.target).toBe(cands[0]);
    expect(r.doors.map((x) => [x.cell, x.content, x.state, x.side])).toEqual([
      [cands[0], 'down', 'closed', 'S'],
      [rest[0], 'enemy', 'closed', 'S'],
      [rest[1], 'chest', 'closed', 'S'],
      [rest[2], 'enemy', 'closed', 'S'],
      [rest[3], 'chest', 'closed', 'S'],
    ]);
    // 5F：ボスと宝箱 4
    const last = placeDoors(walls, up, dist, true, 5, new SequenceRng([0, 0, 1, 2, 3]));
    expect(last.doors.map((x) => x.content)).toEqual(['boss', 'chest', 'chest', 'chest', 'chest']);

    // 行き止まりが 3 つなら扉 3 つ（下り階段・敵・宝箱）。乱数は 1 ＋ 2 個
    let d3 = openMap({ x: 0, y: 9 });
    for (const cell of [11, 15, 17]) d3 = withDoor(d3, 1, cell, 'S', 'chest');
    const w3 = d3.floors[0].walls;
    const rng3 = new SequenceRng([0, 0, 1]);
    const r3 = placeDoors(w3, up, bfsDistances(w3, { x: 0, y: 9 }), false, 5, rng3);
    rng3.assertExhausted();
    expect(r3.doors.map((x) => x.content)).toEqual(['down', 'enemy', 'chest']);

    // 行き止まりがない：全マスの最遠（openMap では (9,0) だけ）に扉なし、乱数 1 個
    const w0 = openMap().floors[0].walls;
    const rng0 = new SequenceRng([0]);
    const r0 = placeDoors(w0, up, bfsDistances(w0, { x: 0, y: 9 }), false, 5, rng0);
    rng0.assertExhausted();
    expect(r0).toEqual({ target: cellIndex({ x: 9, y: 0 }), doors: [] });

    // 行き止まりが 1 つで up から 1 歩（5 歩未満）：目標は扉なしで全マスの最遠、行き止まりには敵の扉
    const near = withDoor(openMap(), 1, 80, 'S', 'chest').floors[0].walls;
    const rngN = new SequenceRng([0, 0]);
    const rN = placeDoors(near, up, bfsDistances(near, { x: 0, y: 9 }), false, 5, rngN);
    rngN.assertExhausted();
    expect(rN.target).toBe(cellIndex({ x: 9, y: 0 }));
    expect(rN.doors.map((x) => [x.cell, x.content])).toEqual([[80, 'enemy']]);
  });
});

describe('扉をあける', () => {
  test('TC-0041-07 下り階段の扉：「とびらを あけた！」「おくに くだり階段が ある」で扉が gone。位置・向きは変わらず、前進して下りられる', () => {
    const s = deepFreeze(doorScene('down'));
    const r = openDoor(s);
    expect(r.messages).toEqual([{ text: 'とびらを あけた！', tone: 'normal' }, { text: 'おくに くだり階段が ある', tone: 'normal' }]);
    expect(doorOf(r.state).state).toBe('gone');
    expect(r.state.dungeon!.player).toEqual(s.dungeon!.player);
    const moved = moveInDungeon(r.state, 'forward', noRng());
    expect(moved.state.dungeon!.player).toMatchObject({ x: 4, y: 4 });
    expect(useStairs(moved.state, 'down').state.dungeon!.floor).toBe(2);
  });

  test('TC-0041-08 宝箱の扉は chest、openChest で「たからばこから …を てにいれた！」と 1 個。乱数は 部位 → 段階 → レアリティ → 補正値 の 4 個、段階はその階の元の敵', () => {
    const s = deepFreeze(doorScene('chest'));
    const opened = openDoor(s);
    expect(opened.messages).toEqual([{ text: 'とびらを あけた！', tone: 'normal' }, { text: 'たからばこを みつけた！', tone: 'normal' }]);
    expect(doorOf(opened.state).state).toBe('chest');
    // 1F：スライムの段階 1。部位 0（ぶき）・段階 1・レアリティ 50（N）・補正値 2
    const rng = new SequenceRng([0, 1, 50, 2]);
    const r = openChest(deepFreeze(opened.state), rng);
    rng.assertExhausted();
    expect(r.messages).toEqual([
      { text: 'たからばこを あけた！', tone: 'normal' },
      { text: 'たからばこから ショートソード［N］（こうげき +2）を てにいれた！', tone: 'normal', rarity: 'N' },
    ]);
    expect(doorOf(r.state).state).toBe('gone');
    expect(r.state.inventory.items).toEqual([{ id: 1, itemId: 'weapon1', rarity: 'N', value: 2 }]);
    expect(r.state.location).toBe('DUNGEON');

    // 5F：オークロードの段階 3〜5（段階 5 のアクセ＝ウィンドブーツ、81 で高い方の SR）。各階の段階の範囲の外は SequenceRng が止める
    const ur = openChest(openDoor(doorScene('chest', { floor: 5 })).state, new SequenceRng([3, 5, 81, 10]));
    expect(ur.messages[1]).toMatchObject({ rarity: 'SR' });
    expect(ur.state.inventory.items[0].itemId).toBe('accessory5');
    for (const [floor, lo, hi] of [[1, 1, 1], [2, 1, 2], [3, 1, 2], [4, 2, 3], [5, 3, 5]] as const) {
      expect(() => openChest(openDoor(doorScene('chest', { floor })).state, new SequenceRng([0, lo - 1, 50, 1]))).toThrow();
      expect(() => openChest(openDoor(doorScene('chest', { floor })).state, new SequenceRng([0, hi + 1, 50, 1]))).toThrow();
    }
  });

  test('TC-0041-09 所持品 50 個で宝箱を開けると SWAP（thenClear false）。宝箱は gone', () => {
    const items = Array.from({ length: 50 }, (_, i) => makeItem(i + 1, 'weapon1', 'N', 1));
    const s = doorScene('chest', { state: 'chest' });
    const full = { ...s, inventory: { ...s.inventory, items, nextId: 51 } };
    const r = openChest(deepFreeze(full), new SequenceRng([0, 1, 50, 2]));
    expect(r.state.location).toBe('SWAP');
    expect(r.state.inventory.pending).toMatchObject({ thenClear: false, item: { id: 51, itemId: 'weapon1' } });
    expect(doorOf(r.state).state).toBe('gone');
  });

  test('TC-0041-10 正面が扉・宝箱でないときと、DUNGEON 以外では 409。状態は変わらない', () => {
    expectInvalid(() => openDoor(deepFreeze(doorScene('chest', { facing: 'E' }))), 'ここには とびらは ない');
    expectInvalid(() => openDoor(deepFreeze(doorScene('chest', { state: 'chest' }))), 'ここには とびらは ない');
    expectInvalid(() => openChest(deepFreeze(doorScene('chest')), noRng()), 'ここには たからばこは ない');
    expectInvalid(() => openChest(deepFreeze(doorScene('chest', { state: 'chest', facing: 'W' })), noRng()), 'ここには たからばこは ない');
    const inn = makeState('INN');
    expectInvalid(() => openDoor(inn), 'その操作は いまは できない');
    expectInvalid(() => openChest(inn, noRng()), 'その操作は いまは できない');
  });

  test('TC-0041-12 敵の扉：「とびらを あけた！」「{扉の敵}が あらわれた！」で BATTLE、battle.door、battles +1、扉は closed のまま', () => {
    const names = { 1: 'ゴブリン', 2: 'スケルトン', 3: 'オークロード', 4: 'ダークナイト' } as const;
    for (const floor of [1, 2, 3, 4] as const) {
      const s = deepFreeze(doorScene('enemy', { floor }));
      const r = openDoor(s);
      expect(r.state.location).toBe('BATTLE');
      expect(r.state.battle).toMatchObject({ isBoss: false, door: 44 });
      expect(r.state.records.battles).toBe(s.records.battles + 1);
      expect(r.messages).toEqual([{ text: 'とびらを あけた！', tone: 'normal' }, { text: `${names[floor]}が あらわれた！`, tone: 'normal' }]);
      expect(doorOf(r.state).state).toBe('closed');
    }
  });

  test('TC-0041-15 5F のボスの扉：ボス戦（isBoss・bossAppear）。乱数を引かない', () => {
    const r = openDoor(deepFreeze(doorScene('boss', { floor: 5 })));
    expect(r.state.battle).toMatchObject({ enemy: { kind: 'necromancer', hp: 800 }, isBoss: true, door: 44 });
    expect(r.messages).toEqual([
      { text: 'とびらを あけた！', tone: 'normal' },
      { text: '暗黒のネクロマンサーが あらわれた！', tone: 'normal', effect: 'bossAppear' },
    ]);
  });
});
