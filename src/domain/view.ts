// 視界（疑似3D）・地図・階段の種類（仕様書 §4.7、§4.10、§22.5）
// 見せない情報（未踏破のマスの壁・ほかの階・ボスの位置・マップ全体）は返さない
import { BIT, cellIndex, LEFT, RIGHT, samePosition, step } from './dungeon';
import type { DungeonData, Facing, FloorData, Position } from './game-state';

export type Side = 'wall' | 'open';
export type StairsView = 'up' | 'down' | 'entrance' | null;

export interface DepthView {
  left: Side;
  right: Side;
  front: Side;
  leftFront?: Side;
  rightFront?: Side;
  stairs: StairsView;
}

export interface DungeonView {
  floor: number;
  facing: Facing;
  underfoot: StairsView;
  depths: DepthView[];
}

export interface AutoMapCell {
  walls: { n: boolean; e: boolean; s: boolean; w: boolean };
  stairs: StairsView;
}

export interface AutoMapView {
  width: number;
  height: number;
  cells: (AutoMapCell | null)[];
  player: Position;
}

/** 奥へ見る段の最大（深さ 0〜3 の 4 段） */
export const MAX_DEPTH = 3;

/** そのマスの階段の種類。1F の up は入口。ボスは区別しない（null） */
export function stairsAt(f: FloorData, floor: number, p: Position): StairsView {
  if (samePosition(f.up, p)) return floor === 1 ? 'entrance' : 'up';
  if (samePosition(f.down, p)) return 'down';
  return null;
}

const side = (walls: readonly number[], p: Position, dir: Facing, size: number): Side =>
  walls[cellIndex(p, size)] & BIT[dir] ? 'wall' : 'open';

/** 今の位置と向きから、奥へ最大 4 段の見え方。正面が壁の段で止まる */
export function toFirstPersonView(d: DungeonData): DungeonView {
  const f = d.floors[d.floor - 1];
  const { facing } = d.player;
  const size = d.width;
  const depths: DepthView[] = [];
  let cur: Position = { x: d.player.x, y: d.player.y };
  for (let k = 0; k <= MAX_DEPTH; k += 1) {
    const left = side(f.walls, cur, LEFT[facing], size);
    const right = side(f.walls, cur, RIGHT[facing], size);
    const front = side(f.walls, cur, facing, size);
    const depth: DepthView = { left, right, front, stairs: stairsAt(f, d.floor, cur) };
    // 横が開いているときだけ、隣のマスの正面の境界を付ける（壁のときはキーを付けない）
    if (left === 'open') depth.leftFront = side(f.walls, step(cur, LEFT[facing]), facing, size);
    if (right === 'open') depth.rightFront = side(f.walls, step(cur, RIGHT[facing]), facing, size);
    depths.push(depth);
    if (front === 'wall') break;
    cur = step(cur, facing);
  }
  return { floor: d.floor, facing, underfoot: depths[0].stairs, depths };
}

/** 今の階の地図。未踏破のマスは null。踏破済みのマスは四方の壁と階段 */
export function toAutoMapView(d: DungeonData): AutoMapView {
  const f = d.floors[d.floor - 1];
  const cells = f.visited.map((seen, i): AutoMapCell | null => {
    if (!seen) return null;
    const w = f.walls[i];
    const p = { x: i % d.width, y: Math.floor(i / d.width) };
    return {
      walls: { n: !!(w & BIT.N), e: !!(w & BIT.E), s: !!(w & BIT.S), w: !!(w & BIT.W) },
      stairs: stairsAt(f, d.floor, p),
    };
  });
  return { width: d.width, height: d.height, cells, player: { x: d.player.x, y: d.player.y } };
}
