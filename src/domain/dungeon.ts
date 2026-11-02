// 1 階分の壁・最短歩数・違反の列挙・移動と回転・座標の補助（仕様書 §3.2、§3.3、§4.1、§24.3）
import { DUNGEON_SIZE } from './constants';
import type { DungeonData, Facing, Position } from './game-state';
import type { Rng } from './rng';

export type MoveAction = 'forward' | 'backward' | 'turnLeft' | 'turnRight';

export interface MoveResult {
  dungeon: DungeonData;
  moved: boolean;
  bumped: boolean;
}

/** 方向の列挙順（乱数で方向を選ぶときもこの順。仕様書 §3.2） */
export const FACINGS: readonly Facing[] = ['N', 'E', 'S', 'W'];
export const BIT: Readonly<Record<Facing, number>> = { N: 1, E: 2, S: 4, W: 8 };
export const DELTA: Readonly<Record<Facing, { dx: number; dy: number }>> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};
export const LEFT: Readonly<Record<Facing, Facing>> = { N: 'W', W: 'S', S: 'E', E: 'N' };
export const RIGHT: Readonly<Record<Facing, Facing>> = { N: 'E', E: 'S', S: 'W', W: 'N' };
export const BACK: Readonly<Record<Facing, Facing>> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const ALL_WALLS = 15;
/** ループを足すときに消す内部の壁の割合 */
const LOOP_RATIO = 0.1;

export const cellIndex = (p: Position, size = DUNGEON_SIZE): number => p.y * size + p.x;
export const cellAt = (index: number, size = DUNGEON_SIZE): Position => ({ x: index % size, y: Math.floor(index / size) });
export const step = (p: Position, dir: Facing): Position => ({ x: p.x + DELTA[dir].dx, y: p.y + DELTA[dir].dy });
export const samePosition = (a: Position | null, b: Position | null): boolean => !!a && !!b && a.x === b.x && a.y === b.y;
const inside = (p: Position, size: number): boolean => p.x >= 0 && p.y >= 0 && p.x < size && p.y < size;

/** 2 つのマスの間の壁を両側から消す */
function carve(walls: number[], p: Position, dir: Facing, size: number): void {
  const q = step(p, dir);
  walls[cellIndex(p, size)] &= ~BIT[dir];
  walls[cellIndex(q, size)] &= ~BIT[BACK[dir]];
}

/** 1 階分の壁（仕様書 §3.3）：全壁 → 再帰バックトラッカーの完全迷路 → 内部の残存壁の 10% を除いてループを足す */
export function generateFloorWalls(rng: Rng, size = DUNGEON_SIZE): number[] {
  const count = size * size;
  const walls = new Array<number>(count).fill(ALL_WALLS);

  // 完全迷路（明示的なスタック）
  const visited = new Array<boolean>(count).fill(false);
  const start = rng.int(0, count - 1);
  visited[start] = true;
  const stack = [start];
  while (stack.length > 0) {
    const cur = cellAt(stack[stack.length - 1], size);
    const options = FACINGS.filter((dir) => {
      const q = step(cur, dir);
      return inside(q, size) && !visited[cellIndex(q, size)];
    });
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    // 候補が 1 つでも int(0,0) を 1 回引く
    const dir = options[rng.int(0, options.length - 1)];
    carve(walls, cur, dir, size);
    const next = cellIndex(step(cur, dir), size);
    visited[next] = true;
    stack.push(next);
  }

  // ループ追加：内部に残る壁を y → x の順（同じマスでは E が先）に並べ、部分 Fisher–Yates で選んで消す
  const remaining: { p: Position; dir: Facing }[] = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const w = walls[y * size + x];
      if (x < size - 1 && w & BIT.E) remaining.push({ p: { x, y }, dir: 'E' });
      if (y < size - 1 && w & BIT.S) remaining.push({ p: { x, y }, dir: 'S' });
    }
  }
  const removeCount = Math.floor(remaining.length * LOOP_RATIO);
  for (let i = 0; i < removeCount; i += 1) {
    const j = rng.int(i, remaining.length - 1);
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    carve(walls, remaining[i].p, remaining[i].dir, size);
  }
  return walls;
}

/** from から各マスへの最短歩数（到達できないマスは −1） */
export function bfsDistances(walls: readonly number[], from: Position, size = DUNGEON_SIZE): number[] {
  const dist = new Array<number>(size * size).fill(-1);
  const start = cellIndex(from, size);
  dist[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const cur = cellAt(queue[head], size);
    for (const dir of FACINGS) {
      if (walls[queue[head]] & BIT[dir]) continue;
      const q = step(cur, dir);
      if (!inside(q, size)) continue;
      const qi = cellIndex(q, size);
      if (dist[qi] !== -1) continue;
      dist[qi] = dist[queue[head]] + 1;
      queue.push(qi);
    }
  }
  return dist;
}

/** 外周・両側の一致・長さの違反を列挙する（空なら正しい） */
export function wallViolations(walls: readonly number[], size = DUNGEON_SIZE): string[] {
  const out: string[] = [];
  if (walls.length !== size * size) {
    out.push(`walls の長さが ${walls.length}（${size * size} であるべき）`);
    return out;
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const w = walls[y * size + x];
      if (y === 0 && !(w & BIT.N)) out.push(`(${x},${y}) の北が外周なのに壁がない`);
      if (y === size - 1 && !(w & BIT.S)) out.push(`(${x},${y}) の南が外周なのに壁がない`);
      if (x === 0 && !(w & BIT.W)) out.push(`(${x},${y}) の西が外周なのに壁がない`);
      if (x === size - 1 && !(w & BIT.E)) out.push(`(${x},${y}) の東が外周なのに壁がない`);
      if (x < size - 1 && !!(w & BIT.E) !== !!(walls[y * size + x + 1] & BIT.W)) out.push(`(${x},${y}) の東と隣の西が合わない`);
      if (y < size - 1 && !!(w & BIT.S) !== !!(walls[(y + 1) * size + x] & BIT.N)) out.push(`(${x},${y}) の南と隣の北が合わない`);
    }
  }
  return out;
}

/** 移動・回転（仕様書 §4.1）。壁があれば動かない（bumped）。ほかの階の壁は見ない */
export function move(d: DungeonData, action: MoveAction): MoveResult {
  const { player } = d;
  if (action === 'turnLeft' || action === 'turnRight') {
    const facing = action === 'turnLeft' ? LEFT[player.facing] : RIGHT[player.facing];
    return { dungeon: { ...d, player: { ...player, facing } }, moved: false, bumped: false };
  }
  const dir = action === 'forward' ? player.facing : BACK[player.facing];
  const walls = d.floors[d.floor - 1].walls;
  if (walls[cellIndex(player, d.width)] & BIT[dir]) return { dungeon: d, moved: false, bumped: true };
  const to = step(player, dir);
  return { dungeon: { ...d, player: { ...to, facing: player.facing } }, moved: true, bumped: false };
}
