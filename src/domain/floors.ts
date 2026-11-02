// 5 階層の生成と、1 階分の不変条件（仕様書 §3.4、§3.5）
import { DUNGEON_SIZE, FLOOR_COUNT } from './constants';
import { bfsDistances, cellAt, cellIndex, generateFloorWalls, samePosition, wallViolations } from './dungeon';
import type { DungeonData, FloorData } from './game-state';
import type { Rng } from './rng';

/** 目標（下り階段・ボス）までの最短歩数の下限 */
export const MIN_STAIRS_DISTANCE = 5;

/** 5 階層を作る。1 階あたり 110 個の整数乱数を引く。プレイヤーは 1F の入口に北向き */
export function generateFloors(rng: Rng): DungeonData {
  const size = DUNGEON_SIZE;
  const floors: FloorData[] = [];
  for (let n = 1; n <= FLOOR_COUNT; n += 1) {
    const walls = generateFloorWalls(rng, size);
    const up = cellAt(rng.int(0, size * size - 1), size);
    const dist = bfsDistances(walls, up, size);
    const max = Math.max(...dist);
    const farthest = dist.flatMap((d, i) => (d === max ? [i] : []));
    const target = cellAt(farthest[rng.int(0, farthest.length - 1)], size);
    const last = n === FLOOR_COUNT;
    floors.push({
      walls,
      up,
      down: last ? null : target,
      boss: last ? target : null,
      visited: new Array<boolean>(size * size).fill(false),
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
    const max = Math.max(...dist);
    const d = dist[cellIndex(target, size)];
    if (d !== max) out.push(`目標が up からいちばん遠いマスでない（${d} 歩、最遠 ${max} 歩）`);
    if (d < MIN_STAIRS_DISTANCE) out.push(`目標まで ${d} 歩（${MIN_STAIRS_DISTANCE} 歩以上であるべき）`);
    if (samePosition(target, f.up)) out.push('目標が up と同じマス');
  }
  return out;
}
