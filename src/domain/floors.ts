// 5 階層の生成と、1 階分の不変条件（仕様書 §3.4、§3.5）
import { DUNGEON_SIZE, FLOOR_COUNT } from './constants';
import { bfsDistances, cellAt, cellIndex, generateFloorWalls, samePosition, wallViolations } from './dungeon';
import type { DungeonData, FloorData } from './game-state';
import type { Rng } from './rng';
import { deadEnds, doorSide, placeDoors } from './doors';

/** 目標（下り階段・ボス）までの最短歩数の下限 */
export const MIN_STAIRS_DISTANCE = 5;

/** 5 階層を作る。1 階あたり 110 個 ＋ ほかの扉の数（0〜4）の整数乱数を引く。プレイヤーは 1F の入口に北向き */
export function generateFloors(rng: Rng): DungeonData {
  const size = DUNGEON_SIZE;
  const floors: FloorData[] = [];
  for (let n = 1; n <= FLOOR_COUNT; n += 1) {
    const walls = generateFloorWalls(rng, size);
    const up = cellAt(rng.int(0, size * size - 1), size);
    const dist = bfsDistances(walls, up, size);
    const last = n === FLOOR_COUNT;
    // 目標（下り階段・ボス）と扉（v1.25。仕様書 §3.4 の 3〜6）
    const placed = placeDoors(walls, cellIndex(up, size), dist, last, MIN_STAIRS_DISTANCE, rng);
    const target = cellAt(placed.target, size);
    floors.push({
      walls,
      up,
      down: last ? null : target,
      boss: last ? target : null,
      visited: new Array<boolean>(size * size).fill(false),
      doors: placed.doors,
    });
  }
  const entrance = floors[0].up;
  floors[0] = { ...floors[0], visited: floors[0].visited.map((v, i) => v || i === cellIndex(entrance, size)) };
  return { width: size, height: size, floors, floor: 1, player: { ...entrance, facing: 'N' } };
}

/** 1 階分の不変条件の違反を列挙する（空なら正しい。仕様書 §3.5） */
export function floorViolations(f: FloorData, floor: number): string[] {
  const size = DUNGEON_SIZE;
  const out = wallViolations(f.walls, size);
  if (f.visited.length !== size * size) out.push(`visited の長さが ${f.visited.length}`);
  if (out.length > 0) return out;

  const dist = bfsDistances(f.walls, f.up, size);
  if (dist.some((d) => d < 0)) out.push('up から行けないマスがある');
  const last = floor === FLOOR_COUNT;
  if (last ? f.down !== null : f.down === null) out.push(last ? '5F に down がある' : 'down がない');
  if (last ? f.boss === null : f.boss !== null) out.push(last ? '5F に boss がない' : 'boss がある');
  const target = last ? f.boss : f.down;
  if (target) {
    const ti = cellIndex(target, size);
    const d = dist[ti];
    const doored = f.doors.some((x) => x.cell === ti && (x.content === 'down' || x.content === 'boss'));
    // 扉つきなら行き止まりのうち最遠、扉なしなら全マスの最遠（v1.25）
    const pool = doored ? deadEnds(f.walls, cellIndex(f.up, size)).map((i) => dist[i]) : dist;
    const max = Math.max(...pool);
    if (d !== max) out.push(`目標が up からいちばん遠いマスでない（${d} 歩、最遠 ${max} 歩）`);
    if (d < MIN_STAIRS_DISTANCE) out.push(`目標まで ${d} 歩（${MIN_STAIRS_DISTANCE} 歩以上であるべき）`);
    if (samePosition(target, f.up)) out.push('目標が up と同じマス');
  }
  out.push(...doorViolations(f, last));
  return out;
}

/** 扉の決まり（仕様書 §3.5。v1.25）：行き止まりの入口だけ・up でない・重ならない・side は開いた辺・中身の数・閉じている */
function doorViolations(f: FloorData, last: boolean): string[] {
  const size = DUNGEON_SIZE;
  const out: string[] = [];
  if (f.doors.length > 5) out.push(`扉が ${f.doors.length} 個`);
  const dead = new Set(deadEnds(f.walls, cellIndex(f.up, size)));
  const cells = new Set<number>();
  const count = { down: 0, boss: 0, enemy: 0, chest: 0 };
  for (const d of f.doors) {
    if (!dead.has(d.cell)) out.push(`扉 ${d.cell} が行き止まりでない`);
    else if (doorSide(f.walls, d.cell) !== d.side) out.push(`扉 ${d.cell} の side が開いた辺でない`);
    if (cells.has(d.cell)) out.push(`扉 ${d.cell} が重なっている`);
    cells.add(d.cell);
    if (d.state !== 'closed') out.push(`扉 ${d.cell} が閉じていない`);
    count[d.content] += 1;
  }
  const limit = last ? { down: 0, boss: 1, enemy: 0, chest: 4 } : { down: 1, boss: 0, enemy: 2, chest: 2 };
  for (const k of ['down', 'boss', 'enemy', 'chest'] as const) if (count[k] > limit[k]) out.push(`扉の ${k} が ${count[k]} 個`);
  const goal = f.doors.find((d) => d.content === 'down' || d.content === 'boss');
  const target = last ? f.boss : f.down;
  if (goal && (!target || goal.cell !== cellIndex(target, size))) out.push('目標の扉が目標のマスにない');
  return out;
}
