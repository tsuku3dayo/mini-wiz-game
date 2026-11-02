import { describe, expect, test } from 'vitest';
import { cellIndex } from '../../src/domain/dungeon';
import { InvalidStateError } from '../../src/domain/errors';
import { checkEncounter, enterDungeon, moveInDungeon, pickEnemy, returnToInn, useStairs, visitCurrent } from '../../src/domain/explore';
import type { GameStateData } from '../../src/domain/game-state';
import { SeededRng, SequenceRng } from '../../src/domain/rng';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeItem, makeState } from '../helpers/fixtures';
import { addWall, constantRng, dungeonState, noRng, openMap } from '../helpers/maps';

/** 409 invalid_state を投げ、文言が message であることを確かめる */
function expectInvalid(fn: () => unknown, message: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(InvalidStateError);
    expect({ status: (e as InvalidStateError).status, code: (e as InvalidStateError).code, message: (e as Error).message })
      .toEqual({ status: 409, code: 'invalid_state', message });
    return;
  }
  throw new Error('投げなかった');
}

const visitedCount = (s: GameStateData, floor: number) => s.dungeon!.floors[floor - 1].visited.filter(Boolean).length;

describe('宿屋から迷宮へ出発する', () => {
  test('TC-0013-01 INN で出発すると、5 階の迷宮の 1F の入口に北向きで立つ。踏破は入口だけ、HP・MP はそのまま', () => {
    const state = deepFreeze(makeState('INN', { hp: 10, mp: 4 }));
    const r = enterDungeon(state, new SeededRng(5));
    const d = r.state.dungeon!;
    expect(r.state).toMatchObject({ location: 'DUNGEON', battle: null, hp: 10, mp: 4 });
    expect(d.floors).toHaveLength(5);
    expect(d.floors.every((f) => f.walls.length === 100)).toBe(true);
    expect(d.floor).toBe(1);
    expect(d.player).toEqual({ ...d.floors[0].up, facing: 'N' });
    expect(d.floors.map((f) => f.visited.flatMap((v, i) => (v ? [i] : [])))).toEqual([[cellIndex(d.floors[0].up)], [], [], [], []]);
    expect(r.messages).toEqual([{ text: 'ダンジョンに ふみこんだ', tone: 'normal' }]);
  });

  test('TC-0013-02 INN 以外で出発すると 409「その操作は いまは できない」で、状態は変わらない', () => {
    for (const location of ['DUNGEON', 'BATTLE', 'SWAP', 'CLEARED'] as const) {
      const state = deepFreeze(makeState(location));
      expectInvalid(() => enterDungeon(state, noRng()), 'その操作は いまは できない');
    }
  });
});

describe('迷宮を歩く', () => {
  test('TC-0014-01 前進・後退は向きを変えず、回転は位置を変えない。壁の方向へは進まず「かべだ」', () => {
    const start = deepFreeze(dungeonState(openMap({ x: 4, y: 5, facing: 'E' })));
    const p = (s: GameStateData) => s.dungeon!.player;

    expect(p(moveInDungeon(start, 'forward', constantRng(100)).state)).toEqual({ x: 5, y: 5, facing: 'E' });
    expect(p(moveInDungeon(start, 'backward', constantRng(100)).state)).toEqual({ x: 3, y: 5, facing: 'E' });
    const left = moveInDungeon(start, 'turnLeft', noRng());
    expect(p(left.state)).toEqual({ x: 4, y: 5, facing: 'N' });
    expect(left.messages).toEqual([]);
    expect(p(moveInDungeon(start, 'turnRight', noRng()).state)).toEqual({ x: 4, y: 5, facing: 'S' });

    // 外周の壁・内側の壁にぶつかる：位置も向きも踏破記録も変わらず、乱数を引かない
    const edge = deepFreeze(dungeonState(openMap({ x: 9, y: 5, facing: 'E' })));
    const bump = moveInDungeon(edge, 'forward', noRng());
    expect(bump.state).toBe(edge);
    expect(bump.messages).toEqual([{ text: 'かべだ', tone: 'normal' }]);
    const walled = deepFreeze(dungeonState(addWall(openMap({ x: 4, y: 5, facing: 'N' }), 1, 4, 5, 'S')));
    expect(moveInDungeon(walled, 'backward', noRng()).messages).toEqual([{ text: 'かべだ', tone: 'normal' }]);
  });

  test('別のマスへ移ると踏破済みになり、遭遇判定で int(1,100) を 1 個引く（遭遇しない値）', () => {
    const start = deepFreeze(dungeonState(openMap({ x: 4, y: 5 })));
    const rng = new SequenceRng([21]);
    const r = moveInDungeon(start, 'forward', rng);
    rng.assertExhausted();
    expect(r.messages).toEqual([]);
    expect(r.state.dungeon!.floors[0].visited[cellIndex({ x: 4, y: 4 })]).toBe(true);
    expect(visitedCount(r.state, 1)).toBe(1);
  });

  test('移動先で遭遇しても、そのマスは踏破済みになる。3F で [20, 31] はスケルトン、battles +1', () => {
    const start = deepFreeze(dungeonState(openMap({ x: 4, y: 5 }, {}, 3)));
    const r = moveInDungeon(start, 'forward', new SequenceRng([20, 31]));
    expect(r.state.location).toBe('BATTLE');
    expect(r.state.battle).toEqual({ enemy: { kind: 'skeleton', hp: 26 }, isBoss: false });
    expect(r.state.records.battles).toBe(1);
    expect(r.messages).toEqual([{ text: 'スケルトンが あらわれた！', tone: 'normal' }]);
    expect(r.state.dungeon!.floors[2].visited[cellIndex({ x: 4, y: 4 })]).toBe(true);
  });
});

describe('階段で階を移る', () => {
  test('TC-0016-01 下り階段で降りると 2F の上り階段に同じ向きで立つ。上り階段で上ると 1F の下り階段に戻る。乱数を引かず、ほかは変わらない', () => {
    const start = deepFreeze(dungeonState(openMap({ x: 9, y: 0, facing: 'E' }), { hp: 12, mp: 3, exp: 15 }));
    const down = useStairs(start, 'down');
    const d2 = down.state.dungeon!;
    expect(d2.floor).toBe(2);
    expect(d2.player).toEqual({ x: 0, y: 9, facing: 'E' });
    expect(d2.floors[1].visited[cellIndex({ x: 0, y: 9 })]).toBe(true);
    expect(down.messages).toEqual([{ text: '2F に おりた', tone: 'normal' }]);
    expect(down.state).toMatchObject({ hp: 12, mp: 3, exp: 15, location: 'DUNGEON' });
    // 1F の踏破記録・壁・階段はそのまま
    expect(d2.floors[0]).toEqual(start.dungeon!.floors[0]);
    expect(d2.floors.map((f) => f.walls)).toEqual(start.dungeon!.floors.map((f) => f.walls));

    const up = useStairs(down.state, 'up');
    expect(up.state.dungeon!.floor).toBe(1);
    expect(up.state.dungeon!.player).toEqual({ x: 9, y: 0, facing: 'E' });
    expect(up.messages).toEqual([{ text: '1F に のぼった', tone: 'normal' }]);
    expect(up.state.dungeon!.floors[1].visited).toEqual(d2.floors[1].visited);
  });

  test('TC-0016-02 階段がない・5F で下り・1F の入口で上り・場所が違う、は 409 で状態は変わらない', () => {
    expectInvalid(() => useStairs(deepFreeze(dungeonState(openMap({ x: 4, y: 4 }))), 'down'), 'ここには くだり階段は ない');
    expectInvalid(() => useStairs(deepFreeze(dungeonState(openMap({ x: 9, y: 0 }, {}, 5))), 'down'), 'ここには くだり階段は ない');
    expectInvalid(() => useStairs(deepFreeze(dungeonState(openMap({ x: 0, y: 9 }))), 'up'), 'ここには のぼり階段は ない');
    expectInvalid(() => useStairs(deepFreeze(dungeonState(openMap({ x: 4, y: 4 }, {}, 3))), 'up'), 'ここには のぼり階段は ない');
    for (const location of ['INN', 'BATTLE', 'SWAP', 'CLEARED'] as const) {
      expectInvalid(() => useStairs(deepFreeze(makeState(location)), 'down'), 'その操作は いまは できない');
    }
  });
});

describe('入口から宿屋へ戻る', () => {
  test('TC-0017-01 1F の入口で戻ると、宿屋・ダンジョンと戦闘は null・「宿屋に もどった」。乱数は引かない', () => {
    const r = returnToInn(deepFreeze(dungeonState(openMap({ x: 0, y: 9 }))));
    expect(r.state).toMatchObject({ location: 'INN', dungeon: null, battle: null });
    expect(r.messages).toEqual([{ text: '宿屋に もどった', tone: 'normal' }]);
  });

  test('TC-0017-02 入口でない・2F の上り階段では「入口に いないため もどれません」、場所が違えば「その操作は いまは できない」', () => {
    expectInvalid(() => returnToInn(deepFreeze(dungeonState(openMap({ x: 4, y: 4 })))), '入口に いないため もどれません');
    expectInvalid(() => returnToInn(deepFreeze(dungeonState(openMap({ x: 0, y: 9 }, {}, 2)))), '入口に いないため もどれません');
    for (const location of ['INN', 'BATTLE'] as const) {
      expectInvalid(() => returnToInn(deepFreeze(makeState(location))), 'その操作は いまは できない');
    }
  });

  test('TC-0017-03 戻っても HP・MP・経験値・所持品・装備・実績はそのまま（回復しない）', () => {
    const inventory = {
      equipped: { weapon: makeItem(1, 'weapon2', 'N', 3), armor: null, shield: null, accessory: null },
      items: [makeItem(2, 'armor1', 'N', 1), makeItem(3, 'shield1', 'R', 2), makeItem(4, 'weapon1', 'N', 1)],
      nextId: 5,
      pending: null,
    };
    const records = { battles: 4, kills: 3, deaths: 0, laps: 1, bossKills: 0 };
    const start = deepFreeze(dungeonState(openMap({ x: 0, y: 9 }), { hp: 10, mp: 4, exp: 15, inventory, records }));
    const r = returnToInn(start);
    expect(r.state).toMatchObject({ hp: 10, maxHp: 30, mp: 4, maxMp: 10, exp: 15 });
    expect(r.state.inventory).toEqual(inventory);
    expect(r.state.records).toEqual(records);
  });
});

// 確認 ID のない、遭遇と踏破記録の決まり（仕様書 §4.3、§4.6。統計は TC-0018 で確かめる）
describe('遭遇と踏破記録', () => {
  test('pickEnemy は表の順に累積して選ぶ（境界の値）', () => {
    expect(pickEnemy(1, new SequenceRng([70]))).toBe('slime');
    expect(pickEnemy(1, new SequenceRng([71]))).toBe('goblin');
    expect(pickEnemy(3, new SequenceRng([30]))).toBe('goblin');
    expect(pickEnemy(3, new SequenceRng([80]))).toBe('skeleton');
    expect(pickEnemy(5, new SequenceRng([100]))).toBe('darkKnight');
  });

  test('階段・入口のマスでは乱数を引かず遭遇しない。ボスのマスでは必ずボス戦（bossAppear）で、踏破済みにならない', () => {
    for (const [p, floor] of [[{ x: 0, y: 9 }, 1], [{ x: 9, y: 0 }, 2]] as const) {
      const r = checkEncounter(deepFreeze(dungeonState(openMap(p, {}, floor))), noRng());
      expect(r.messages).toEqual([]);
      expect(r.state.location).toBe('DUNGEON');
    }
    const r = moveInDungeon(deepFreeze(dungeonState(openMap({ x: 9, y: 1 }, {}, 5))), 'forward', noRng());
    expect(r.state.battle).toEqual({ enemy: { kind: 'necromancer', hp: 260 }, isBoss: true });
    expect(r.messages).toEqual([{ text: '暗黒のネクロマンサーが あらわれた！', tone: 'normal', effect: 'bossAppear' }]);
    expect(r.state.dungeon!.floors[4].visited[cellIndex({ x: 9, y: 0 })]).toBe(false);
  });

  test('visitCurrent は入力を変えず、踏破済みのマスではそのまま返す', () => {
    const d = deepFreeze(openMap({ x: 3, y: 3 }));
    const once = visitCurrent(d);
    expect(once).not.toBe(d);
    expect(d.floors[0].visited[33]).toBe(false);
    expect(once.floors[0].visited[33]).toBe(true);
    expect(visitCurrent(once)).toBe(once);
  });
});
