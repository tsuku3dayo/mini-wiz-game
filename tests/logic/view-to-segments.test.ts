import { describe, expect, test } from 'vitest';
import type { DepthView } from '../../src/api/types';
import { describeView, locationText } from '../../src/logic/describe-view';
import { viewToSegments } from '../../src/logic/view-to-segments';

const wall = (over: Partial<DepthView> = {}): DepthView => ({ left: 'wall', right: 'wall', front: 'wall', stairs: null, ...over });
const open = (over: Partial<DepthView> = {}): DepthView => ({ left: 'wall', right: 'wall', front: 'open', stairs: null, ...over });
const pick = (r: ReturnType<typeof viewToSegments>, kind: string, depth: number) =>
  r.lines.filter((l) => l.kind === kind && l.depth === depth).map(({ x1, y1, x2, y2 }) => [x1, y1, x2, y2]);

describe('疑似3D の線分', () => {
  test('TC-0014-04 枠の座標（x = 0,40,80,110,130／y = 0,30,60,82,97）の線分を返す', () => {
    // 段 0：左右が壁・正面が壁 → 左の 3 本・右の 3 本・正面（枠 1）の 4 辺
    const r0 = viewToSegments([wall()]);
    expect(pick(r0, 'left', 0)).toEqual([[0, 0, 40, 30], [0, 240, 40, 210], [40, 30, 40, 210]]);
    expect(pick(r0, 'right', 0)).toEqual([[320, 0, 280, 30], [320, 240, 280, 210], [280, 30, 280, 210]]);
    expect(pick(r0, 'front', 0)).toEqual([[40, 30, 280, 30], [280, 30, 280, 210], [280, 210, 40, 210], [40, 210, 40, 30]]);
    expect(r0.lines).toHaveLength(10);

    // 4 段の一直線。段 3 の正面は枠 4（130, 97）
    const r4 = viewToSegments([open(), open(), open(), wall()]);
    expect(pick(r4, 'left', 1)).toEqual([[40, 30, 80, 60], [40, 210, 80, 180], [80, 60, 80, 180]]);
    expect(pick(r4, 'left', 2)).toEqual([[80, 60, 110, 82], [80, 180, 110, 158], [110, 82, 110, 158]]);
    expect(pick(r4, 'left', 3)).toEqual([[110, 82, 130, 97], [110, 158, 130, 143], [130, 97, 130, 143]]);
    expect(pick(r4, 'front', 3)).toEqual([[130, 97, 190, 97], [190, 97, 190, 143], [190, 143, 130, 143], [130, 143, 130, 97]]);
    expect(r4.lines.filter((l) => l.kind === 'front')).toHaveLength(4);

    // 横道：左が通路なら 2 本（side-left）。横道の先が壁なら、さらに縦線 2 本
    const side = viewToSegments([wall({ left: 'open', leftFront: 'open', right: 'open', rightFront: 'wall' })]);
    expect(pick(side, 'side-left', 0)).toEqual([[0, 30, 40, 30], [0, 210, 40, 210]]);
    expect(pick(side, 'side-right', 0)).toEqual([[320, 30, 280, 30], [320, 210, 280, 210], [280, 30, 280, 210], [320, 30, 320, 210]]);
  });

  test('段 1 以上の階段は文字（中央・段の下の中ほど）、段 0 の階段は描かない', () => {
    const r = viewToSegments([open({ stairs: 'entrance' }), open({ stairs: 'down' }), wall({ stairs: 'up' })]);
    expect(r.labels).toEqual([
      { x: 160, y: (210 + 180) / 2, text: '↓ くだり階段' },
      { x: 160, y: (180 + 158) / 2, text: '↑ のぼり階段' },
    ]);
    expect(viewToSegments([open(), wall({ stairs: 'entrance' })]).labels[0].text).toBe('↑ 入口');
  });
});

// 確認 ID のない、説明文の決まり（仕様書 §11.5「疑似3D の説明文」）
describe('疑似3D の説明文と階の表示', () => {
  test('例の文と、正面・わかれみち・階段・足元', () => {
    expect(describeView({
      floor: 3, facing: 'N', underfoot: 'down',
      depths: [open({ left: 'open', leftFront: 'wall', stairs: 'down' }), open(), wall()],
    })).toBe('3F 北を向いている。前方 2 マス先は かべ。左に わかれみち。足元に くだり階段。');
    expect(describeView({ floor: 1, facing: 'E', underfoot: 'entrance', depths: [wall({ right: 'open' })] }))
      .toBe('1F 東を向いている。前方は かべ。右に わかれみち。ここは入口。');
    expect(describeView({ floor: 2, facing: 'S', underfoot: null, depths: [open(), open(), open({ stairs: 'up' }), open()] }))
      .toBe('2F 南を向いている。前方は 3 マス先まで つうろ。2 マス先に のぼり階段。');
    expect(locationText(3, 'W')).toBe('3F　西');
  });
});
