import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { BG, CROP_SIZE, CROP_X, CROP_Y, decodePng, renderIcons, sourceRgb } from '../../scripts/make-icons.mjs';

const icons = path.resolve(__dirname, '../../public/icons');
const necro = decodePng(fs.readFileSync(path.resolve(__dirname, '../../public/enemies/necromancer.png')));

/** PNG の点 (x, y) の RGB */
function pixel(png: ReturnType<typeof decodePng>, x: number, y: number): number[] {
  const i = (y * png.width + x) * 4;
  return [png.rgba[i], png.rgba[i + 1], png.rgba[i + 2]];
}

/** 一辺 size の図柄の点 (x, y) が、切り抜きの最も近い点と同じ色 */
function expectCropped(png: ReturnType<typeof decodePng>, size: number, x: number, y: number, off = 0) {
  const sx = CROP_X + Math.floor(((x - off) * CROP_SIZE) / size);
  const sy = CROP_Y + Math.floor(((y - off) * CROP_SIZE) / size);
  expect(pixel(png, x, y), `(${x}, ${y})`).toEqual(sourceRgb(necro, sx, sy));
}

describe('アイコン（仕様書 v1.22 §30.5）', () => {
  test('TC-0002-08 renderIcons の 5 つがコミットしたファイルと同じで、ネクロマンサーの絵の (26, −16)・一辺 198 を点のまま切り抜いている', () => {
    const made = renderIcons();
    expect(Object.keys(made).sort()).toEqual(['apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'icon.svg']);
    for (const [name, data] of Object.entries(made)) {
      const committed = fs.readFileSync(path.join(icons, name));
      // icon.svg は文字のファイルなので、Windows の取り出しで改行が CRLF になることがある。改行をそろえて比べる
      if (name.endsWith('.svg')) expect(committed.toString().replace(/\r\n/g, '\n'), name).toBe(data.toString());
      else expect(committed.equals(data), name).toBe(true);
    }
    // 512・192・180：左上・上の端の行（絵の外＝背景）・中央・どくろのあたり・右下
    for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]] as const) {
      const png = decodePng(made[name]);
      expect([png.width, png.height]).toEqual([size, size]);
      expect(pixel(png, 0, 0)).toEqual(BG);
      expect(pixel(png, size - 1, 0)).toEqual(BG);
      for (const [fx, fy] of [[0, 0], [0.5, 0.02], [0.5, 0.5], [0.85, 0.2], [0.3, 0.4], [0.99, 0.99]]) {
        expectCropped(png, size, Math.floor(fx * size), Math.floor(fy * size));
      }
    }
    // 絵の色が入っている（全部が背景ではない）
    const big = decodePng(made['icon-512.png']);
    expect(pixel(big, 256, 256)).not.toEqual(BG);
    // maskable：中央の一辺 358（左上 (77, 77)）の外は背景、中は同じ切り抜き
    const mask = decodePng(made['icon-maskable-512.png']);
    for (const [x, y] of [[0, 0], [76, 256], [256, 76], [435, 256], [256, 435], [511, 511]]) {
      expect(pixel(mask, x, y), `(${x}, ${y})`).toEqual(BG);
    }
    for (const [x, y] of [[77, 77], [256, 256], [400, 150], [434, 434]]) expectCropped(mask, 358, x, y, 77);
    // icon.svg は 512 の PNG をそのまま入れている
    const svg = made['icon.svg'].toString();
    expect(svg).toContain(`href="data:image/png;base64,${made['icon-512.png'].toString('base64')}"`);
    expect(svg).toContain('image-rendering:pixelated');
  });
});
