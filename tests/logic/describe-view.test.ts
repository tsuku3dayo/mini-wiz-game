import { describe, expect, test } from 'vitest';
import type { DepthView } from '../../src/api/types';
import { describeView } from '../../src/logic/describe-view';

const wall = (over: Partial<DepthView> = {}): DepthView => ({ left: 'wall', right: 'wall', front: 'wall', stairs: null, ...over });
const open = (over: Partial<DepthView> = {}): DepthView => ({ left: 'wall', right: 'wall', front: 'open', stairs: null, ...over });

describe('疑似3D の説明文（仕様書 §11.5）', () => {
  test('TC-0036-07 向き → 正面の壁 → わかれみち（左・右）→ 先の階段 → 足元、の順でつなぐ', () => {
    // 例の視界
    expect(describeView({
      floor: 3, facing: 'N', underfoot: 'down',
      depths: [open({ left: 'open' }), open(), wall()],
    })).toBe('3F 北を向いている。前方 2 マス先は かべ。左に わかれみち。足元に くだり階段。');

    // 正面の壁の 3 つの言い方
    expect(describeView({ floor: 1, facing: 'E', underfoot: null, depths: [wall()] })).toBe('1F 東を向いている。前方は かべ。');
    expect(describeView({ floor: 1, facing: 'S', underfoot: null, depths: [open(), wall()] })).toBe('1F 南を向いている。前方 1 マス先は かべ。');
    expect(describeView({ floor: 1, facing: 'W', underfoot: null, depths: [open(), open(), open(), open()] }))
      .toBe('1F 西を向いている。前方は 3 マス先まで つうろ。');

    // すべてそろうときの順：左 → 右 → 先の階段（近い順）→ 足元（入口）
    expect(describeView({
      floor: 2, facing: 'N', underfoot: 'entrance',
      depths: [open({ right: 'open' }), open({ left: 'open', stairs: 'up' }), open({ stairs: 'down' }), wall()],
    })).toBe('2F 北を向いている。前方 3 マス先は かべ。左に わかれみち。右に わかれみち。1 マス先に のぼり階段。2 マス先に くだり階段。ここは入口。');

    // わかれみちは 2 段目まで（段 2 の横の通路は言わない）。足元ののぼり階段
    expect(describeView({ floor: 4, facing: 'S', underfoot: 'up', depths: [open(), open(), open({ left: 'open', right: 'open' }), wall()] }))
      .toBe('4F 南を向いている。前方 3 マス先は かべ。足元に のぼり階段。');
  });
});
