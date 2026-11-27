// 視界（疑似3D）・地図・階段の種類（仕様書 §4.7、§4.10、§22.5）
// 見せない情報（未踏破のマスの壁・ほかの階・ボスの位置・マップ全体）は返さない
import { BACK, BIT, cellIndex, LEFT, RIGHT, samePosition, step } from './dungeon';
import type { DungeonData, Facing, FloorData, Position } from './game-state';

export type Side = 'wall' | 'open' | 'door';   // 'door' は v1.25
export type AheadView = 'door' | 'chest' | null;   // v1.25
export type StairsView = 'up' | 'down' | 'entrance' | null;

export interface DepthView {
  left: Side;
  right: Side;
  front: Side;
  leftFront?: Side;
  rightFront?: Side;
  stairs: StairsView;
  chest?: true;   // 段のマスに残っている宝箱（v1.25）
}

export interface DungeonView {
  floor: number;
  facing: Facing;
  underfoot: StairsView;
  ahead: AheadView;
  depths: DepthView[];
}

export interface AutoMapCell {
  walls: { n: boolean; e: boolean; s: boolean; w: boolean };
  doors: { n: boolean; e: boolean; s: boolean; w: boolean };   // 閉じた扉の辺（v1.25）
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

/** p から dir の方向の辺が、閉じた扉か（扉のマスは辺の向こう側にも、p 自身にもありうる） */
function closedDoor(f: FloorData, p: Position, dir: Facing, size: number): boolean {
  const here = cellIndex(p, size);
  const there = cellIndex(step(p, dir), size);
  return f.doors.some((x) => x.state === 'closed' && ((x.cell === there && x.side === BACK[dir]) || (x.cell === here && x.side === dir)));
}

const side = (f: FloorData, p: Position, dir: Facing, size: number): Side =>
  f.walls[cellIndex(p, size)] & BIT[dir] ? 'wall' : closedDoor(f, p, dir, size) ? 'door' : 'open';

const hasChest = (f: FloorData, p: Position, size: number): boolean =>
  f.doors.some((x) => x.state === 'chest' && x.cell === cellIndex(p, size));

/** 今の位置と向きから、奥へ最大 4 段の見え方。正面が壁の段で止まる */
export function toFirstPersonView(d: DungeonData): DungeonView {
  const f = d.floors[d.floor - 1];
  const { facing } = d.player;
  const size = d.width;
  const depths: DepthView[] = [];
  let cur: Position = { x: d.player.x, y: d.player.y };
  for (let k = 0; k <= MAX_DEPTH; k += 1) {
    const left = side(f, cur, LEFT[facing], size);
    const right = side(f, cur, RIGHT[facing], size);
    const front = side(f, cur, facing, size);
    const depth: DepthView = { left, right, front, stairs: stairsAt(f, d.floor, cur) };
    // 横が開いているときだけ、隣のマスの正面の境界を付ける（壁・扉のときはキーを付けない）
    if (left === 'open') depth.leftFront = side(f, step(cur, LEFT[facing]), facing, size);
    if (right === 'open') depth.rightFront = side(f, step(cur, RIGHT[facing]), facing, size);
    if (hasChest(f, cur, size)) depth.chest = true;
    depths.push(depth);
    if (front !== 'open') break;
    cur = step(cur, facing);
  }
  const ahead: AheadView = depths[0].front === 'door' ? 'door' : depths[0].front === 'open' && depths[1]?.chest ? 'chest' : null;
  return { floor: d.floor, facing, underfoot: depths[0].stairs, ahead, depths };
}

/** 今の階の地図。未踏破のマスは null。踏破済みのマスは四方の壁と階段 */
export function toAutoMapView(d: DungeonData): AutoMapView {
  const f = d.floors[d.floor - 1];
  const cells = f.visited.map((seen, i): AutoMapCell | null => {
    if (!seen) return null;
    const w = f.walls[i];
    const p = { x: i % d.width, y: Math.floor(i / d.width) };
    return {
      walls: { n: !!(w & BIT.N) || closedDoor(f, p, 'N', d.width), e: !!(w & BIT.E) || closedDoor(f, p, 'E', d.width), s: !!(w & BIT.S) || closedDoor(f, p, 'S', d.width), w: !!(w & BIT.W) || closedDoor(f, p, 'W', d.width) },
      doors: { n: closedDoor(f, p, 'N', d.width), e: closedDoor(f, p, 'E', d.width), s: closedDoor(f, p, 'S', d.width), w: closedDoor(f, p, 'W', d.width) },
      stairs: stairsAt(f, d.floor, p),
    };
  });
  return { width: d.width, height: d.height, cells, player: { x: d.player.x, y: d.player.y } };
}
