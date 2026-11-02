// テスト用のマップ
import type { DungeonData, Facing } from '../../src/domain/game-state';

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
  }));
  return { width: size, height: size, floors, floor, player: { x: player.x, y: player.y, facing: player.facing ?? 'N' }, ...extra };
}
