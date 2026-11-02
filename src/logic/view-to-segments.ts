// 疑似3D の線分と文字（仕様書 §11.5「疑似3D 一人称ビュー」）。座標は viewBox（320 × 240）の値
import type { DepthView, StairsView } from '../api/types';

export const VIEW_W = 320;
export const VIEW_H = 240;
/** 奥行きの枠 k の左上（右下は (320 − x_k, 240 − y_k)） */
export const FRAME_X = [0, 40, 80, 110, 130] as const;
export const FRAME_Y = [0, 30, 60, 82, 97] as const;

export type SegmentKind = 'left' | 'right' | 'side-left' | 'side-right' | 'front';

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: SegmentKind;
  depth: number;
}

export interface ViewLabel {
  x: number;
  y: number;
  text: string;
}

const STAIRS_TEXT: Readonly<Record<Exclude<StairsView, null>, string>> = {
  down: '↓ くだり階段',
  up: '↑ のぼり階段',
  entrance: '↑ 入口',
};

/** 段ごとの見え方から、引く線と文字を作る。左側の式で作り、右側は x を 320 − x にして左右反転する */
export function viewToSegments(depths: readonly DepthView[]): { lines: Segment[]; labels: ViewLabel[] } {
  const lines: Segment[] = [];
  const labels: ViewLabel[] = [];
  const H = VIEW_H;
  depths.slice(0, 4).forEach((d, k) => {
    const x0 = FRAME_X[k];
    const y0 = FRAME_Y[k];
    const x1 = FRAME_X[k + 1];
    const y1 = FRAME_Y[k + 1];
    const add = (ax: number, ay: number, bx: number, by: number, kind: SegmentKind) =>
      lines.push({ x1: ax, y1: ay, x2: bx, y2: by, kind, depth: k });

    for (const side of ['left', 'right'] as const) {
      const fx = (x: number) => (side === 'left' ? x : VIEW_W - x);
      if (d[side] === 'wall') {
        add(fx(x0), y0, fx(x1), y1, side);
        add(fx(x0), H - y0, fx(x1), H - y1, side);
        add(fx(x1), y1, fx(x1), H - y1, side);
      } else {
        const kind = side === 'left' ? 'side-left' : 'side-right';
        add(fx(x0), y1, fx(x1), y1, kind);
        add(fx(x0), H - y1, fx(x1), H - y1, kind);
        // 横道の先が壁なら、縦線を 2 本
        if ((side === 'left' ? d.leftFront : d.rightFront) === 'wall') {
          add(fx(x1), y1, fx(x1), H - y1, kind);
          add(fx(x0), y1, fx(x0), H - y1, kind);
        }
      }
    }
    if (d.front === 'wall') {
      add(x1, y1, VIEW_W - x1, y1, 'front');
      add(VIEW_W - x1, y1, VIEW_W - x1, H - y1, 'front');
      add(VIEW_W - x1, H - y1, x1, H - y1, 'front');
      add(x1, H - y1, x1, y1, 'front');
    }
    // 段 0（足元）の階段は描かない
    if (k >= 1 && d.stairs) labels.push({ x: VIEW_W / 2, y: ((H - y0) + (H - y1)) / 2, text: STAIRS_TEXT[d.stairs] });
  });
  return { lines, labels };
}
