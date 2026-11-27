// 扉と宝箱（仕様書 §3.4〜§3.6、§4.1、§4.11。v1.25）
import { startBattle } from './battle';
import { DOOR_ENEMY } from './constants';
import { BIT, cellIndex, FACINGS, step, type MoveAction, BACK } from './dungeon';
import { InvalidStateError } from './errors';
import { assertLocation, type DoorContent, type DoorData, type DungeonData, type Facing, type FloorData, type GameStateData, type StepResult } from './game-state';
import { applyChest, rollChest } from './loot';
import type { Rng } from './rng';

/** 扉の中身を置く順（仕様書 §3.6）。先頭は目標（下り階段・ボス） */
export const DOOR_CONTENTS: Readonly<Record<'middle' | 'last', readonly DoorContent[]>> = {
  middle: ['down', 'enemy', 'chest', 'enemy', 'chest'],
  last: ['boss', 'chest', 'chest', 'chest', 'chest'],
};

const openSides = (w: number): Facing[] => FACINGS.filter((f) => !(w & BIT[f]));

/** 行き止まり（三方が壁）のマスの番号。up のマスは除く。番号の小さい順 */
export function deadEnds(walls: readonly number[], upIndex: number): number[] {
  return walls.flatMap((w, i) => (i !== upIndex && openSides(w).length === 1 ? [i] : []));
}

/** 行き止まりのマスの、ただ 1 つの開いた辺 */
export const doorSide = (walls: readonly number[], cell: number): Facing => openSides(walls[cell])[0];

/**
 * 目標（下り階段・ボス）と扉を選ぶ（仕様書 §3.4 の 3〜6）。dist は up からの歩数。
 * 目標で 1 個、ほかの扉の数だけ乱数を引く
 */
export function placeDoors(walls: readonly number[], upIndex: number, dist: readonly number[], last: boolean, minDistance: number, rng: Rng): { target: number; doors: DoorData[] } {
  const dead = deadEnds(walls, upIndex);
  const order = DOOR_CONTENTS[last ? 'last' : 'middle'];
  const doors: DoorData[] = [];
  const deadMax = dead.length > 0 ? Math.max(...dead.map((i) => dist[i])) : -1;
  let target: number;
  if (deadMax >= minDistance) {
    const cands = dead.filter((i) => dist[i] === deadMax);
    target = cands[rng.int(0, cands.length - 1)];
    doors.push({ cell: target, side: doorSide(walls, target), content: order[0], state: 'closed' });
  } else {
    // 行き止まりがない・どれも近すぎる：v1.24 までと同じく全マスの最遠に扉なしで置く
    const max = Math.max(...dist);
    const far = dist.flatMap((d, i) => (d === max ? [i] : []));
    target = far[rng.int(0, far.length - 1)];
  }
  const rest = dead.filter((i) => i !== target);
  const count = Math.min(order.length - 1, rest.length);
  for (let i = 0; i < count; i += 1) {
    const j = rng.int(i, rest.length - 1);
    [rest[i], rest[j]] = [rest[j], rest[i]];
    doors.push({ cell: rest[i], side: doorSide(walls, rest[i]), content: order[i + 1], state: 'closed' });
  }
  return { target, doors };
}

const doorAt = (f: FloorData, cell: number): DoorData | undefined => f.doors.find((d) => d.cell === cell);

/** from のマスから dir の方向の境界にある、閉じた扉（扉の前のマスから見たもの） */
export function closedDoorBetween(f: FloorData, from: number, dir: Facing, size: number): DoorData | undefined {
  const to = cellIndex(step({ x: from % size, y: Math.floor(from / size) }, dir), size);
  const d = doorAt(f, to);
  return d && d.state === 'closed' && d.side === BACK[dir] ? d : undefined;
}

/** そのマスに残っている宝箱 */
export const chestAt = (f: FloorData, cell: number): DoorData | undefined => {
  const d = doorAt(f, cell);
  return d && d.state === 'chest' ? d : undefined;
};

/** 進む先をふさぐもの（壁は見ない。壁は dungeon.ts の move が先に見る） */
export function blockedBy(d: DungeonData, action: MoveAction): 'door' | 'chest' | null {
  if (action === 'turnLeft' || action === 'turnRight') return null;
  const f = d.floors[d.floor - 1];
  const dir = action === 'forward' ? d.player.facing : BACK[d.player.facing];
  const here = cellIndex(d.player, d.width);
  if (closedDoorBetween(f, here, dir, d.width)) return 'door';
  if (f.walls[here] & BIT[dir]) return null;
  return chestAt(f, cellIndex(step(d.player, dir), d.width)) ? 'chest' : null;
}

/** 正面の扉・宝箱（仕様書 §4.1）。後ろ・左右は数えない */
export function aheadOf(d: DungeonData): { kind: 'door' | 'chest'; door: DoorData } | null {
  const f = d.floors[d.floor - 1];
  const here = cellIndex(d.player, d.width);
  const dir = d.player.facing;
  const door = closedDoorBetween(f, here, dir, d.width);
  if (door) return { kind: 'door', door };
  if (f.walls[here] & BIT[dir]) return null;
  const chest = chestAt(f, cellIndex(step(d.player, dir), d.width));
  return chest ? { kind: 'chest', door: chest } : null;
}

/** 今の階の、そのマスの扉の状態を変える */
export function setDoorState(d: DungeonData, cell: number, state: DoorData['state']): DungeonData {
  const floors = d.floors.map((f, n) => (n === d.floor - 1 ? { ...f, doors: f.doors.map((x) => (x.cell === cell ? { ...x, state } : x)) } : f));
  return { ...d, floors };
}

/** 扉をあける（仕様書 §4.11）。乱数・遭遇判定なし。位置・向きは変えない */
export function openDoor(state: GameStateData): StepResult {
  assertLocation(state, 'DUNGEON');
  const d = state.dungeon;
  if (!d) throw new InvalidStateError();
  const a = aheadOf(d);
  if (!a || a.kind !== 'door') throw new InvalidStateError('ここには とびらは ない');
  const opened = { text: 'とびらを あけた！', tone: 'normal' as const };
  const { door } = a;
  switch (door.content) {
    case 'down':
      return { state: { ...state, dungeon: setDoorState(d, door.cell, 'gone') }, messages: [opened, { text: 'おくに くだり階段が ある', tone: 'normal' }] };
    case 'chest':
      return { state: { ...state, dungeon: setDoorState(d, door.cell, 'chest') }, messages: [opened, { text: 'たからばこを みつけた！', tone: 'normal' }] };
    case 'enemy': {
      const r = startBattle(state, DOOR_ENEMY[d.floor] ?? 'goblin', { door: door.cell });
      return { state: r.state, messages: [opened, ...r.messages] };
    }
    case 'boss': {
      const r = startBattle(state, 'necromancer', { door: door.cell });
      return { state: r.state, messages: [opened, ...r.messages] };
    }
  }
}

/** 宝箱をあける（仕様書 §4.11・§8.4）。乱数 4 個 */
export function openChest(state: GameStateData, rng: Rng): StepResult {
  assertLocation(state, 'DUNGEON');
  const d = state.dungeon;
  if (!d) throw new InvalidStateError();
  const a = aheadOf(d);
  if (!a || a.kind !== 'chest') throw new InvalidStateError('ここには たからばこは ない');
  const item = rollChest(d.floor, rng);
  const base = { ...state, dungeon: setDoorState(d, a.door.cell, 'gone') };
  const r = applyChest(base, item);
  return { state: r.state, messages: [{ text: 'たからばこを あけた！', tone: 'normal' }, ...r.messages] };
}
