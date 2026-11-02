import { describe, expect, test } from 'vitest';
import type { GameView, Location, StairsView } from '../../src/api/types';
import { arrival } from '../../src/logic/arrival';

function view(location: Location, at?: { floor: number; x: number; y: number; facing?: 'N' | 'E'; underfoot: StairsView }): GameView {
  return {
    location,
    dungeon: at
      ? {
        floor: at.floor, facing: at.facing ?? 'N', underfoot: at.underfoot, depths: [],
        map: { width: 10, height: 10, cells: [], player: { x: at.x, y: at.y } },
      }
      : null,
  } as unknown as GameView;
}

describe('足元の案内', () => {
  test('TC-0016-05 階段・入口のマスに着いたときだけ 1 行。向きだけの変化・足元が null のときは出さない', () => {
    const line = (text: string) => ({ text, tone: 'normal' });
    // 前がダンジョンでない（宿屋から出発・戦闘のあと・状態なし）
    expect(arrival(view('INN'), view('DUNGEON', { floor: 1, x: 0, y: 9, underfoot: 'entrance' }))).toEqual(line('ここは入口だ'));
    expect(arrival(null, view('DUNGEON', { floor: 1, x: 0, y: 9, underfoot: 'entrance' }))).toEqual(line('ここは入口だ'));
    // x・y・階が変わった
    expect(arrival(view('DUNGEON', { floor: 1, x: 9, y: 1, underfoot: null }), view('DUNGEON', { floor: 1, x: 9, y: 0, underfoot: 'down' })))
      .toEqual(line('足元に くだり階段がある'));
    expect(arrival(view('DUNGEON', { floor: 1, x: 8, y: 0, underfoot: null }), view('DUNGEON', { floor: 1, x: 9, y: 0, underfoot: 'down' })))
      .toEqual(line('足元に くだり階段がある'));
    expect(arrival(view('DUNGEON', { floor: 1, x: 9, y: 0, underfoot: 'down' }), view('DUNGEON', { floor: 2, x: 9, y: 0, underfoot: 'up' })))
      .toEqual(line('足元に のぼり階段がある'));
    // 向きだけ変わった
    expect(arrival(view('DUNGEON', { floor: 1, x: 9, y: 0, underfoot: 'down' }), view('DUNGEON', { floor: 1, x: 9, y: 0, facing: 'E', underfoot: 'down' })))
      .toBeNull();
    // 足元が null・場所が DUNGEON でない
    expect(arrival(view('DUNGEON', { floor: 1, x: 4, y: 4, underfoot: null }), view('DUNGEON', { floor: 1, x: 4, y: 3, underfoot: null }))).toBeNull();
    expect(arrival(view('DUNGEON', { floor: 1, x: 0, y: 8, underfoot: null }), view('INN'))).toBeNull();
  });
});
