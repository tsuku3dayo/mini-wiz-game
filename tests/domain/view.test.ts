import { describe, expect, test } from 'vitest';
import { cellIndex, DELTA, FACINGS, LEFT, RIGHT } from '../../src/domain/dungeon';
import { generateFloors } from '../../src/domain/floors';
import type { DungeonData, Facing, Position } from '../../src/domain/game-state';
import { SeededRng } from '../../src/domain/rng';
import { toAutoMapView, toFirstPersonView } from '../../src/domain/view';
import { deepFreeze } from '../helpers/deep-freeze';
import { addWall, openMap } from '../helpers/maps';

const at = (p: Position, dir: Facing): Position => ({ x: p.x + DELTA[dir].dx, y: p.y + DELTA[dir].dy });

/** 視界が読むマス（通るマスと、横が開いているときの隣のマス） */
function seenCells(d: DungeonData): Set<number> {
  const v = toFirstPersonView(d);
  const seen = new Set<number>();
  let cur: Position = d.player;
  for (const depth of v.depths) {
    seen.add(cellIndex(cur));
    if (depth.left === 'open') seen.add(cellIndex(at(cur, LEFT[d.player.facing])));
    if (depth.right === 'open') seen.add(cellIndex(at(cur, RIGHT[d.player.facing])));
    cur = at(cur, d.player.facing);
  }
  return seen;
}

describe('疑似3D の視界', () => {
  test('TC-0014-06 視界は最大 4 段で正面の壁で止まる。視界の外のマスを変えても同じ。キーは floor・facing・underfoot・depths だけ', () => {
    // 外周に向かって立てば 1 段、一直線なら 4 段、2 マス先が壁なら 3 段
    expect(toFirstPersonView(openMap({ x: 4, y: 0, facing: 'N' })).depths).toHaveLength(1);
    expect(toFirstPersonView(openMap({ x: 4, y: 9, facing: 'N' })).depths).toHaveLength(4);
    expect(toFirstPersonView(addWall(openMap({ x: 4, y: 9, facing: 'N' }), 1, 4, 7, 'N')).depths).toHaveLength(3);

    for (let seed = 1; seed <= 50; seed += 1) {
      const base = generateFloors(new SeededRng(seed));
      for (let i = 0; i < 100; i += 1) {
        for (const facing of FACINGS) {
          const d = deepFreeze({ ...base, player: { x: i % 10, y: Math.floor(i / 10), facing } });
          const view = toFirstPersonView(d);
          expect(Object.keys(view).sort()).toEqual(['depths', 'facing', 'floor', 'underfoot']);
          expect(view.depths.length).toBeGreaterThanOrEqual(1);
          expect(view.depths.length).toBeLessThanOrEqual(4);
          // 最後の段だけ正面が壁になりうる（4 段目は開いていてもよい）
          view.depths.slice(0, -1).forEach((depth) => expect(depth.front).toBe('open'));
          if (view.depths.length < 4) expect(view.depths.at(-1)!.front).toBe('wall');

          // 視界の外のマスの壁をすべて反転しても、結果は同じ
          const seen = seenCells(d);
          const walls = d.floors[0].walls.map((w, j) => (seen.has(j) ? w : w ^ 15));
          const changed = { ...d, floors: [{ ...d.floors[0], walls }, ...d.floors.slice(1)] };
          expect(toFirstPersonView(changed)).toEqual(view);
        }
      }
    }
    // 2 万通りを調べるので、ほかのテストと同時に動くと 5 秒の既定を超えることがある
  }, 30_000);

  test('横が開いているときだけ leftFront・rightFront が付き、階段の種類が出る。ボスのマスは null', () => {
    const v = toFirstPersonView(openMap({ x: 0, y: 9, facing: 'N' }));
    expect(v.underfoot).toBe('entrance');
    expect(v.depths[0]).toEqual({ left: 'wall', right: 'open', front: 'open', rightFront: 'open', stairs: 'entrance' });
    expect('leftFront' in v.depths[0]).toBe(false);
    expect(toFirstPersonView(openMap({ x: 0, y: 9 }, {}, 2)).underfoot).toBe('up');
    expect(toFirstPersonView(openMap({ x: 9, y: 3, facing: 'N' })).depths[3].stairs).toBe('down');
    // 5F：ボスのマスが視界に入っても stairs は null
    expect(toFirstPersonView(openMap({ x: 9, y: 3, facing: 'N' }, {}, 5)).depths.map((d) => d.stairs)).toEqual([null, null, null, null]);
  });
});

describe('自動地図', () => {
  test('TC-0015-02 cells は 100 個で、未踏破は null、踏破済みは四方の壁と階段。player は x・y だけ', () => {
    const base = openMap({ x: 5, y: 5, facing: 'E' });
    const visited = base.floors[0].visited.map((_, i) => [cellIndex({ x: 0, y: 9 }), cellIndex({ x: 9, y: 0 }), cellIndex({ x: 4, y: 4 })].includes(i));
    // (4,4) の東に壁。隣 (5,4) は未踏破でも、その境界の壁を返す
    const walled = addWall(base, 1, 4, 4, 'E');
    const d = deepFreeze({ ...walled, floors: [{ ...walled.floors[0], visited }, ...walled.floors.slice(1)] });
    const map = toAutoMapView(d);
    expect(map.width).toBe(10);
    expect(map.height).toBe(10);
    expect(map.cells).toHaveLength(100);
    expect(map.cells.filter((c) => c !== null)).toHaveLength(3);
    expect(map.cells[cellIndex({ x: 0, y: 9 })]).toEqual({ walls: { n: false, e: false, s: true, w: true }, stairs: 'entrance' });
    expect(map.cells[cellIndex({ x: 9, y: 0 })]).toEqual({ walls: { n: true, e: true, s: false, w: false }, stairs: 'down' });
    expect(map.cells[cellIndex({ x: 4, y: 4 })]).toEqual({ walls: { n: false, e: true, s: false, w: false }, stairs: null });
    expect(map.cells[cellIndex({ x: 5, y: 4 })]).toBeNull();
    expect(map.player).toEqual({ x: 5, y: 5 });

    // 2F の上り階段は 'up'
    const d2 = openMap({ x: 0, y: 9 }, {}, 2);
    const v2 = d2.floors[1].visited.map((_, i) => i === cellIndex({ x: 0, y: 9 }));
    const m2 = toAutoMapView({ ...d2, floors: d2.floors.map((f, i) => (i === 1 ? { ...f, visited: v2 } : f)) });
    expect(m2.cells[cellIndex({ x: 0, y: 9 })]!.stairs).toBe('up');
  });
});
