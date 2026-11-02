// 自動地図の図形（仕様書 §11.5「2D 自動地図」）。1 マス 16 × 16。座標・番号・ボスは描かない
import type { AutoMapView, Facing } from '../api/types';

export const MAP_CELL = 16;

export interface MapShapes {
  width: number;
  height: number;
  frame: { x: number; y: number; width: number; height: number };
  cells: { x: number; y: number; size: number }[];
  walls: { x1: number; y1: number; x2: number; y2: number }[];
  symbols: { x: number; y: number; text: string; kind: 'stairs' | 'player' }[];
}

const ARROW: Readonly<Record<Facing, string>> = { N: '▲', E: '▶', S: '▼', W: '◀' };
const STAIRS: Readonly<Record<'down' | 'up' | 'entrance', string>> = { down: '↓', up: '↑', entrance: '入' };

export function mapToShapes(map: AutoMapView, facing: Facing): MapShapes {
  const width = map.width * MAP_CELL;
  const height = map.height * MAP_CELL;
  const shapes: MapShapes = {
    width,
    height,
    frame: { x: 0.5, y: 0.5, width: width - 1, height: height - 1 },
    cells: [],
    walls: [],
    symbols: [],
  };
  const playerIndex = map.player.y * map.width + map.player.x;
  map.cells.forEach((cell, i) => {
    if (!cell) return;
    const x = (i % map.width) * MAP_CELL;
    const y = Math.floor(i / map.width) * MAP_CELL;
    const s = MAP_CELL;
    shapes.cells.push({ x, y, size: s });
    if (cell.walls.n) shapes.walls.push({ x1: x, y1: y, x2: x + s, y2: y });
    if (cell.walls.e) shapes.walls.push({ x1: x + s, y1: y, x2: x + s, y2: y + s });
    if (cell.walls.s) shapes.walls.push({ x1: x, y1: y + s, x2: x + s, y2: y + s });
    if (cell.walls.w) shapes.walls.push({ x1: x, y1: y, x2: x, y2: y + s });
    // 現在地のマスでは階段の記号を描かず、矢印だけ
    if (cell.stairs && i !== playerIndex) shapes.symbols.push({ x: x + s / 2, y: y + s / 2, text: STAIRS[cell.stairs], kind: 'stairs' });
  });
  shapes.symbols.push({
    x: map.player.x * MAP_CELL + MAP_CELL / 2,
    y: map.player.y * MAP_CELL + MAP_CELL / 2,
    text: ARROW[facing],
    kind: 'player',
  });
  return shapes;
}

/** 地図の説明（aria-label）：「{階}F の地図。踏破済み {N} マス。」 */
export function describeMap(map: AutoMapView, floor: number): string {
  return `${floor}F の地図。踏破済み ${map.cells.filter((c) => c !== null).length} マス。`;
}
