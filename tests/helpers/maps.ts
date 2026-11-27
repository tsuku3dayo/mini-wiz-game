// テスト用のマップ・ダンジョンの状態・決まった値の乱数
import type { EnemyKind } from '../../src/domain/constants';
import type { DoorData, DungeonData, Facing, FloorData, GameStateData } from '../../src/domain/game-state';
import { BaseRng } from '../../src/domain/rng';
import { makeState } from './fixtures';

/**
 * 外周だけが壁の 10×10。上り (0,9)、下り (9,0)、5F は下りの代わりにボス (9,0)（仕様書 §24.3 の openMap）。
 * extra でダンジョンの項目を上書きできる
 */
export function openMap(
  player: { x: number; y: number; facing?: Facing } = { x: 0, y: 9 },
  extra: Partial<DungeonData> = {},
  floor = 1,
): DungeonData {
  const size = 10;
  const walls = Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    return (y === 0 ? 1 : 0) | (x === size - 1 ? 2 : 0) | (y === size - 1 ? 4 : 0) | (x === 0 ? 8 : 0);
  });
  const floors = Array.from({ length: 5 }, (_, i) => ({
    walls: [...walls],
    up: { x: 0, y: 9 },
    down: i === 4 ? null : { x: 9, y: 0 },
    boss: i === 4 ? { x: 9, y: 0 } : null,
    visited: new Array<boolean>(size * size).fill(false),
    doors: [] as FloorData['doors'],
  }));
  return { width: size, height: size, floors, floor, player: { x: player.x, y: player.y, facing: player.facing ?? 'N' }, ...extra };
}

/** ダンジョンにいる状態（名前「ゆうしゃ」・Lv1。fixtures の makeState と同じ初期値）。dungeon を差し替え、overrides で変える */
export function dungeonState(dungeon: DungeonData = openMap(), overrides: Partial<GameStateData> = {}): GameStateData {
  return makeState('DUNGEON', { dungeon, ...overrides });
}

/** 戦闘中の状態（1F の (4,4) 北向き）。敵の種類と残り HP、ボス戦かを指定する */
export function battleState(
  kind: EnemyKind,
  enemyHp: number,
  overrides: Partial<GameStateData> = {},
  isBoss = kind === 'necromancer',
): GameStateData {
  return makeState('BATTLE', {
    dungeon: openMap({ x: 4, y: 4 }),
    battle: { enemy: { kind, hp: enemyHp }, isBoss },
    ...overrides,
  });
}

/** いつも同じ値を返す乱数（範囲の外なら端に寄せる）。constantRng(100) は遭遇しない、constantRng(1) は必ず遭遇する */
export function constantRng(value: number): BaseRng & { calls: number } {
  return new (class extends BaseRng {
    calls = 0;
    int(min: number, max: number): number {
      this.calls += 1;
      return Math.min(max, Math.max(min, value));
    }
  })();
}

/** 引くと例外を投げる乱数（乱数を引かないことを確かめる） */
export function noRng(): BaseRng {
  return new (class extends BaseRng {
    int(): number {
      throw new Error('乱数を引いた');
    }
  })();
}

/** 壁を 1 本足す（両側から） */
export function addWall(d: DungeonData, floor: number, x: number, y: number, dir: Facing): DungeonData {
  const bits = { N: 1, E: 2, S: 4, W: 8 } as const;
  const back = { N: 'S', S: 'N', E: 'W', W: 'E' } as const;
  const delta = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] } as const;
  const [dx, dy] = delta[dir];
  const walls = [...d.floors[floor - 1].walls];
  walls[y * d.width + x] |= bits[dir];
  const nx = x + dx;
  const ny = y + dy;
  if (nx >= 0 && ny >= 0 && nx < d.width && ny < d.height) walls[ny * d.width + nx] |= bits[back[dir]];
  return { ...d, floors: d.floors.map((f, i) => (i === floor - 1 ? { ...f, walls } : f)) };
}

const OPP: Record<Facing, Facing> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const BITS: Record<Facing, number> = { N: 1, E: 2, S: 4, W: 8 };
const DXY: Record<Facing, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

/**
 * 扉つきの地図（v1.25。TC-0041）：floor の階の cell を、open の辺だけ開いた行き止まりにし（両側の壁をそろえる）、
 * そこに扉 { cell, side: open, content, state } を置く
 */
export function withDoor(d: DungeonData, floor: number, cell: number, open: Facing, content: DoorData['content'], state: DoorData['state'] = 'closed'): DungeonData {
  const floors = d.floors.map((f, i) => {
    if (i !== floor - 1) return f;
    const walls = [...f.walls];
    const x = cell % 10;
    const y = Math.floor(cell / 10);
    for (const dir of ['N', 'E', 'S', 'W'] as Facing[]) {
      if (dir === open) continue;
      walls[cell] |= BITS[dir];
      const nx = x + DXY[dir][0];
      const ny = y + DXY[dir][1];
      if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) walls[ny * 10 + nx] |= BITS[OPP[dir]];
    }
    return { ...f, walls, doors: [...f.doors, { cell, side: open, content, state }] };
  });
  return { ...d, floors };
}
