import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { bfsDistances, cellIndex, generateFloorWalls, wallViolations } from '../../src/domain/dungeon';
import { floorViolations, generateFloors } from '../../src/domain/floors';
import { SeededRng, SequenceRng } from '../../src/domain/rng';

/** CI では時間の基準を 3 倍まで許す（TST-0001 §7） */
const SLOW = process.env.CI ? 3 : 1;

// 扉は { cell, side, content, state } の順のキー（v1.25）
const shape = (floors: { walls: number[]; up: unknown; down: unknown; boss: unknown; doors: unknown }[]) =>
  floors.map(({ walls, up, down, boss, doors }) => ({ walls, up, down, boss, doors }));

describe('5 階層の迷宮', () => {
  test('TC-0013-04 シード 1〜1,000 のどの階も不変条件を満たす（外周・両側の壁・全マス到達・階段とボス・目標が最遠で 5 歩以上）', () => {
    for (let seed = 1; seed <= 1000; seed += 1) {
      const d = generateFloors(new SeededRng(seed));
      expect(d.floors).toHaveLength(5);
      d.floors.forEach((f, i) => {
        const v = floorViolations(f, i + 1);
        if (v.length > 0) throw new Error(`シード ${seed} の ${i + 1}F：${v.join('／')}`);
      });
    }
  });

  test('TC-0013-05 同じシードなら同じ 5 階層。シード 1〜100 の 1F はすべて違い、同じ出撃の 5 階も互いに違う', () => {
    expect(generateFloors(new SeededRng(42))).toEqual(generateFloors(new SeededRng(42)));
    const firsts = new Set<string>();
    for (let seed = 1; seed <= 100; seed += 1) {
      const d = generateFloors(new SeededRng(seed));
      firsts.add(JSON.stringify(d.floors[0].walls));
      const own = new Set(d.floors.map((f) => JSON.stringify(f.walls)));
      expect(own.size, `シード ${seed}`).toBe(5);
    }
    expect(firsts.size).toBe(100);
  });

  test('TC-0013-06 生成 1 回は 50ms 未満、1,000 回の合計は 10 秒未満', () => {
    let worst = 0;
    const start = performance.now();
    for (let seed = 1; seed <= 1000; seed += 1) {
      const t = performance.now();
      generateFloors(new SeededRng(seed));
      worst = Math.max(worst, performance.now() - t);
    }
    const total = performance.now() - start;
    expect(worst).toBeLessThan(50 * SLOW);
    expect(total).toBeLessThan(10_000 * SLOW);
  });

  test('TC-0013-07 SeededRng(2026) の参考値：初期位置 (9,1) 北向き、続けて引く値 284376、形（扉を含む）の SHA-256 の先頭 49843f9097299880、扉は 5 階とも 5 つ', () => {
    const rng = new SeededRng(2026);
    const d = generateFloors(rng);
    expect(d.player).toEqual({ x: 9, y: 1, facing: 'N' });
    expect(d.floor).toBe(1);
    expect(rng.int(1, 1000000)).toBe(284376);
    const hash = createHash('sha256').update(JSON.stringify(shape(d.floors))).digest('hex');
    expect(hash.slice(0, 16)).toBe('49843f9097299880');
    expect(d.floors.map((f) => f.doors.length)).toEqual([5, 5, 5, 5, 5]);
  });
});

// 確認 ID のない、生成の決まり（仕様書 §3.3、§3.4）
describe('迷宮の生成の決まり', () => {
  test('1 階分の壁は 1 + 99 + 8 個の乱数を引き、全マスがつながる。内部の壁はちょうど 81 − 8 = 73 本残る', () => {
    // 引く回数を数える
    let calls = 0;
    const inner = new SeededRng(7);
    const counting = { int: (a: number, b: number) => { calls += 1; return inner.int(a, b); }, chance: () => false };
    const walls = generateFloorWalls(counting);
    expect(calls).toBe(108);
    expect(wallViolations(walls)).toEqual([]);
    expect(bfsDistances(walls, { x: 0, y: 0 }).every((d) => d >= 0)).toBe(true);
    let inside = 0;
    for (let i = 0; i < 100; i += 1) {
      if (i % 10 < 9 && walls[i] & 2) inside += 1;
      if (i < 90 && walls[i] & 4) inside += 1;
    }
    expect(inside).toBe(73);
  });

  test('5 階層で 550 個 ＋ ほかの扉の数の乱数を引き、1F の入口だけが踏破済み（v1.25）', () => {
    let calls = 0;
    const inner = new SeededRng(3);
    const d = generateFloors({ int: (a, b) => { calls += 1; return inner.int(a, b); }, chance: () => false });
    // 1 階 110 個 ＋ 目標以外の扉の数（0〜4）
    const others = d.floors.reduce((n, f) => n + f.doors.filter((x) => x.content !== 'down' && x.content !== 'boss').length, 0);
    expect(calls).toBe(550 + others);
    const seen = d.floors.map((f) => f.visited.filter(Boolean).length);
    expect(seen).toEqual([1, 0, 0, 0, 0]);
    expect(d.floors[0].visited[cellIndex(d.floors[0].up)]).toBe(true);
  });

  test('候補が 1 つでも int(0,0) を引く（SequenceRng の値の数が合う）', () => {
    // 値の数と範囲がずれると SequenceRng が例外を投げる。SeededRng の列を写して、同じ壁になることを確かめる
    const values: number[] = [];
    const inner = new SeededRng(11);
    const recorder = { int: (a: number, b: number) => { const v = inner.int(a, b); values.push(v); return v; }, chance: () => false };
    const expected = generateFloorWalls(recorder);
    const seq = new SequenceRng(values);
    expect(generateFloorWalls(seq)).toEqual(expected);
    seq.assertExhausted();
  });

  test('TC-0037-07 generateFloors はシード 1〜100 のどれも 150ms 未満（目標 50ms の 3 倍）。平均も記録する', () => {
    generateFloors(new SeededRng(0)); // JIT の準備（測らない）
    const times: number[] = [];
    for (let seed = 1; seed <= 100; seed += 1) {
      const t0 = performance.now();
      generateFloors(new SeededRng(seed));
      times.push(performance.now() - t0);
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`TC-0037-07 generateFloors：平均 ${avg.toFixed(2)}ms、最大 ${Math.max(...times).toFixed(2)}ms`);
    for (const [i, ms] of times.entries()) expect(ms, `シード ${i + 1}`).toBeLessThan(150);
  });
});

describe('扉の決まり（v1.25）', () => {
  test('TC-0041-03 シード 1〜1,000 の迷宮で扉の決まりに違反がなく、扉が 5 つの階が 99% 以上', () => {
    let five = 0;
    let total = 0;
    for (let seed = 1; seed <= 1000; seed += 1) {
      const d = generateFloors(new SeededRng(seed));
      d.floors.forEach((f, i) => {
        expect(floorViolations(f, i + 1), `seed ${seed} ${i + 1}F`).toEqual([]);
        if (f.doors.length === 5) five += 1;
        total += 1;
      });
    }
    expect(five / total).toBeGreaterThanOrEqual(0.99);
  });

  test('floorViolations は扉の違反を挙げる（行き止まりでない・重なり・開いた扉・数の多すぎ）', () => {
    const f = generateFloors(new SeededRng(2026)).floors[0];
    const first = f.doors[1];
    expect(floorViolations({ ...f, doors: [...f.doors, { ...first }] }, 1).join()).toContain('重なっている');
    expect(floorViolations({ ...f, doors: f.doors.map((x, i) => (i === 1 ? { ...x, state: 'gone' } : x)) }, 1).join()).toContain('閉じていない');
    expect(floorViolations({ ...f, doors: f.doors.map((x, i) => (i === 1 ? { ...x, cell: cellIndex(f.up) } : x)) }, 1).join()).toContain('行き止まりでない');
    expect(floorViolations({ ...f, doors: f.doors.map((x) => ({ ...x, content: 'enemy' as const })) }, 1).join()).toContain('enemy');
  });
});
