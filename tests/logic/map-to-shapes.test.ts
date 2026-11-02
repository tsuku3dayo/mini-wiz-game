import { describe, expect, test } from 'vitest';
import type { AutoMapCell, AutoMapView } from '../../src/api/types';
import { describeMap, mapToShapes } from '../../src/logic/map-to-shapes';

const cell = (walls: Partial<AutoMapCell['walls']> = {}, stairs: AutoMapCell['stairs'] = null): AutoMapCell =>
  ({ walls: { n: false, e: false, s: false, w: false, ...walls }, stairs });

function map(entries: Record<number, AutoMapCell>, player: { x: number; y: number }): AutoMapView {
  const cells = Array.from({ length: 100 }, (_, i) => entries[i] ?? null);
  return { width: 10, height: 10, cells, player };
}

describe('自動地図の図形', () => {
  test('TC-0015-03 外枠・踏破済みのマスの塗り・壁のある辺・記号（↓↑入と向きの矢印）。現在地は矢印だけ', () => {
    const m = map({
      90: cell({ s: true, w: true }, 'entrance'), // (0,9)
      80: cell({ w: true }), // (0,8)
      9: cell({ n: true, e: true }, 'down'), // (9,0)
      45: cell({ e: true }, 'up'), // (5,4)：現在地
    }, { x: 5, y: 4 });
    const s = mapToShapes(m, 'N');
    expect(s.frame).toEqual({ x: 0.5, y: 0.5, width: 159, height: 159 });
    expect(s.cells).toEqual([
      { x: 144, y: 0, size: 16 },
      { x: 80, y: 64, size: 16 },
      { x: 0, y: 128, size: 16 },
      { x: 0, y: 144, size: 16 },
    ]);
    expect(s.walls).toEqual(expect.arrayContaining([
      { x1: 0, y1: 160, x2: 16, y2: 160 }, // (0,9) の南
      { x1: 0, y1: 144, x2: 0, y2: 160 }, // (0,9) の西
      { x1: 144, y1: 0, x2: 160, y2: 0 }, // (9,0) の北
      { x1: 96, y1: 64, x2: 96, y2: 80 }, // (5,4) の東
    ]));
    expect(s.walls).toHaveLength(6);
    expect(s.symbols).toEqual([
      { x: 152, y: 8, text: '↓', kind: 'stairs' },
      { x: 8, y: 152, text: '入', kind: 'stairs' },
      { x: 88, y: 72, text: '▲', kind: 'player' },
    ]);
    // 数字の文字はない
    expect(s.symbols.every((x) => !/\d/.test(x.text))).toBe(true);

    const arrows = (['N', 'E', 'S', 'W'] as const).map((f) => mapToShapes(m, f).symbols.at(-1)!.text);
    expect(arrows).toEqual(['▲', '▶', '▼', '◀']);
    // 2F の上り階段は「↑」
    expect(mapToShapes(map({ 0: cell({}, 'up') }, { x: 5, y: 5 }), 'N').symbols[0].text).toBe('↑');
    expect(describeMap(m, 1)).toBe('1F の地図。踏破済み 4 マス。');
  });
});
