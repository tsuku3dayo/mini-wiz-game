import { describe, expect, test } from 'vitest';
import { ENCOUNTER_TABLE, ENEMIES } from '../../src/domain/constants';
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
    expect(r.state.battle).toEqual({ enemy: { kind: 'skeleton', hp: 42 }, isBoss: false });
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

describe('敵に遭遇する', () => {
  test('TC-0018-01 何もないマスへ前進・後退すると、[20, n] で遭遇（BATTLE・battles +1・「…が あらわれた！」）、[21] では遭遇せず乱数 1 個', () => {
    for (const action of ['forward', 'backward'] as const) {
      const start = deepFreeze(dungeonState(openMap({ x: 4, y: 5 }, {}, 3)));
      const hit = moveInDungeon(start, action, new SequenceRng([20, 31]));
      expect(hit.state.location).toBe('BATTLE');
      expect(hit.state.records.battles).toBe(start.records.battles + 1);
      expect(hit.messages).toEqual([{ text: 'スケルトンが あらわれた！', tone: 'normal' }]);
      const rng = new SequenceRng([21]);
      const miss = moveInDungeon(start, action, rng);
      rng.assertExhausted();
      expect(miss.state.location).toBe('DUNGEON');
      expect(miss.messages).toEqual([]);
    }
  });

  test('TC-0018-02 回転・壁・階段で着く・宿屋へ戻る・階段や入口のマスへ歩いて入る、では乱数を引かず遭遇しない', () => {
    const at = (x: number, y: number, facing: 'N' | 'E' | 'S' | 'W' = 'N', floor = 1) => deepFreeze(dungeonState(openMap({ x, y, facing }, {}, floor)));
    expect(moveInDungeon(at(4, 4), 'turnLeft', noRng()).state.location).toBe('DUNGEON');
    expect(moveInDungeon(at(4, 0), 'forward', noRng()).messages).toEqual([{ text: 'かべだ', tone: 'normal' }]);
    expect(useStairs(at(9, 0), 'down').state.location).toBe('DUNGEON');
    expect(returnToInn(at(0, 9)).state.location).toBe('INN');
    // 入口 (0,9)・下り階段 (9,0)・2F の上り階段 (0,9) へ歩いて入る
    expect(moveInDungeon(at(0, 8), 'backward', noRng()).state.location).toBe('DUNGEON');
    expect(moveInDungeon(at(9, 1), 'forward', noRng()).state.location).toBe('DUNGEON');
    expect(moveInDungeon(at(1, 9, 'W', 2), 'forward', noRng()).state.location).toBe('DUNGEON');
  });

  test('TC-0018-03 10,000 回の遭遇判定で遭遇は 18%〜22%、各階の敵の割合は出現表 ±2.5 ポイント', () => {
    const rng = new SeededRng(2026);
    for (let floor = 1; floor <= 5; floor += 1) {
      const state = deepFreeze(dungeonState(openMap({ x: 4, y: 4 }, {}, floor)));
      const counts: Record<string, number> = {};
      let hits = 0;
      for (let i = 0; i < 10_000; i += 1) {
        const r = checkEncounter(state, rng);
        if (r.state.battle) {
          hits += 1;
          counts[r.state.battle.enemy.kind] = (counts[r.state.battle.enemy.kind] ?? 0) + 1;
        }
      }
      expect(hits / 10_000, `${floor}F の遭遇率`).toBeGreaterThanOrEqual(0.18);
      expect(hits / 10_000, `${floor}F の遭遇率`).toBeLessThanOrEqual(0.22);
      for (const [kind, rate] of ENCOUNTER_TABLE[floor]) {
        const share = ((counts[kind] ?? 0) / hits) * 100;
        expect(Math.abs(share - rate), `${floor}F の ${kind}`).toBeLessThanOrEqual(2.5);
      }
    }
  });

  test('TC-0018-04 pickEnemy の境目：1F 70/71、2F〜4F 30/31・80/81、5F 40/41', () => {
    const pick = (floor: number, r: number) => pickEnemy(floor, new SequenceRng([r]));
    expect([pick(1, 70), pick(1, 71)]).toEqual(['slime', 'goblin']);
    expect([pick(2, 30), pick(2, 31), pick(2, 80), pick(2, 81)]).toEqual(['slime', 'goblin', 'goblin', 'skeleton']);
    expect([pick(3, 30), pick(3, 31), pick(3, 80), pick(3, 81)]).toEqual(['goblin', 'skeleton', 'skeleton', 'orc']);
    expect([pick(4, 30), pick(4, 31), pick(4, 80), pick(4, 81)]).toEqual(['skeleton', 'orc', 'orc', 'darkKnight']);
    expect([pick(5, 40), pick(5, 41)]).toEqual(['orc', 'darkKnight']);
    expect(ENEMIES[pick(5, 40)].name).toBe('オークロード');
  });
});

describe('踏破記録とボス', () => {
  test('TC-0015-01 出発直後は入口だけ。歩くと（遭遇しても）踏破済み、回転・壁では変わらない。ボスのマスは記録しない。階を移っても前の階の記録は残る', () => {
    const entered = enterDungeon(deepFreeze(makeState('INN')), new SeededRng(9)).state;
    const d0 = entered.dungeon!;
    expect(d0.floors[0].visited.filter(Boolean)).toHaveLength(1);
    expect(d0.floors[0].visited[cellIndex(d0.floors[0].up)]).toBe(true);

    const start = deepFreeze(dungeonState(openMap({ x: 4, y: 5 })));
    const walked = moveInDungeon(start, 'forward', new SequenceRng([21])).state;
    expect(walked.dungeon!.floors[0].visited[cellIndex({ x: 4, y: 4 })]).toBe(true);
    const back = moveInDungeon(start, 'backward', new SequenceRng([1, 1])).state; // 遭遇しても踏破済み
    expect(back.location).toBe('BATTLE');
    expect(back.dungeon!.floors[0].visited[cellIndex({ x: 4, y: 6 })]).toBe(true);
    expect(moveInDungeon(start, 'turnLeft', noRng()).state.dungeon!.floors[0].visited).toEqual(start.dungeon!.floors[0].visited);
    const edge = deepFreeze(dungeonState(openMap({ x: 4, y: 0 })));
    expect(moveInDungeon(edge, 'forward', noRng()).state.dungeon!.floors[0].visited).toEqual(edge.dungeon!.floors[0].visited);

    const boss = moveInDungeon(deepFreeze(dungeonState(openMap({ x: 9, y: 1 }, {}, 5))), 'forward', noRng()).state;
    expect(boss.location).toBe('BATTLE');
    expect(boss.dungeon!.floors[4].visited[cellIndex({ x: 9, y: 0 })]).toBe(false);

    // 1F で 3 マス記録 → 2F へ降りて戻る → 1F の記録はそのまま
    let s = deepFreeze(dungeonState(openMap({ x: 9, y: 2 })));
    s = moveInDungeon(s, 'forward', new SequenceRng([21])).state;
    s = moveInDungeon(s, 'forward', noRng()).state; // 下り階段 (9,0)
    const before = s.dungeon!.floors[0].visited;
    const down = useStairs(s, 'down').state;
    const up = useStairs(down, 'up').state;
    expect(up.dungeon!.floors[0].visited).toEqual(before);
    expect(up.dungeon!.floors[1].visited.filter(Boolean)).toHaveLength(1);
  });

  test('TC-0024-01 5F でボスのマスへ前進すると、乱数を引かずに暗黒のネクロマンサー戦（isBoss・bossAppear）', () => {
    const r = moveInDungeon(deepFreeze(dungeonState(openMap({ x: 9, y: 1 }, {}, 5))), 'forward', noRng());
    expect(r.state.location).toBe('BATTLE');
    expect(r.state.battle).toEqual({ enemy: { kind: 'necromancer', hp: 800 }, isBoss: true });
    expect(r.messages).toEqual([{ text: '暗黒のネクロマンサーが あらわれた！', tone: 'normal', effect: 'bossAppear' }]);
  });

  test('TC-0025-04 周回数 9 でもボスの HP は 800。敵の能力値・経験値は周回数で変わらない', () => {
    const before = JSON.stringify(ENEMIES);
    const records = { battles: 50, kills: 40, deaths: 2, laps: 9, bossKills: 8 };
    const r = moveInDungeon(deepFreeze(dungeonState(openMap({ x: 9, y: 1 }, {}, 5), { records })), 'forward', noRng());
    expect(r.state.battle!.enemy.hp).toBe(800);
    expect(JSON.stringify(ENEMIES)).toBe(before);
    expect(ENEMIES.necromancer).toMatchObject({ maxHp: 800, attack: 60, defense: 40, speed: 30, exp: 1000 });
  });
});

// 確認 ID のない、遭遇と踏破記録の決まり（仕様書 §4.3、§4.6）
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
    expect(r.state.battle).toEqual({ enemy: { kind: 'necromancer', hp: 800 }, isBoss: true });
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
