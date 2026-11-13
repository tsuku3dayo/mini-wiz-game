// アイコンを作る（仕様書 §30.5、TD-0005 §2.1）。npm run icons で public/icons/ に書き、生成物をコミットする
// v1.22：敵の絵 necromancer.png の (26, −16)・一辺 198 の正方形を、点のまま（最も近い点）各大きさにする
// 外部ライブラリは使わず、PNG は node:zlib（inflateSync・deflateSync・crc32）で読み書きする
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/icons');
const SOURCE = path.join(root, 'public/enemies/necromancer.png');

export const BG = [0x0b, 0x0a, 0x0f];
/** 切り抜き（元の絵の座標）：左上 (CROP_X, CROP_Y)、一辺 CROP_SIZE。上の 16 行は絵の外 */
export const CROP_X = 26;
export const CROP_Y = -16;
export const CROP_SIZE = 198;
/** maskable は図柄を 0.7 倍にして中央に置く（512 では一辺 358・左上 77） */
export const MASKABLE_SCALE = 0.7;

/** PNG（8 ビットの RGB・RGBA）を読む。{ width, height, rgba }（rgba は 1 点 4 バイト） */
export function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('PNG ではない');
  let pos = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      const depth = data[8]; colorType = data[9];
      if (depth !== 8 || (colorType !== 2 && colorType !== 6) || data[12] !== 0) throw new Error('8 ビットの RGB・RGBA（インターレースなし）だけ読める');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const raw = inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? px[y * stride + i - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + i] : 0;
      const c = i >= bpp && y > 0 ? px[(y - 1) * stride + i - bpp] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new Error(`知らないフィルタ ${filter}`);
      px[y * stride + i] = v & 0xff;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    for (let k = 0; k < 3; k++) rgba[i * 4 + k] = px[i * bpp + k];
    rgba[i * 4 + 3] = bpp === 4 ? px[i * bpp + 3] : 255;
  }
  return { width, height, rgba };
}

/** 元の絵の点 (sx, sy) を背景 #0B0A0F に重ねた RGB。絵の外は背景 */
export function sourceRgb(src, sx, sy) {
  if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) return [...BG];
  const i = (sy * src.width + sx) * 4;
  const a = src.rgba[i + 3] / 255;
  return [0, 1, 2].map((k) => Math.round(BG[k] + (src.rgba[i + k] - BG[k]) * a));
}

/** 一辺 size のアイコンの RGB（1 点 3 バイト）。図柄は一辺 art の正方形を中央に置く（maskable のとき size より小さい） */
export function iconRgb(src, size, art = size) {
  const off = Math.floor((size - art) / 2);
  const rgb = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ax = x - off, ay = y - off;
      const c = ax < 0 || ay < 0 || ax >= art || ay >= art
        ? BG
        : sourceRgb(src, CROP_X + Math.floor((ax * CROP_SIZE) / art), CROP_Y + Math.floor((ay * CROP_SIZE) / art));
      rgb.set(c, (y * size + x) * 3);
    }
  }
  return rgb;
}

/** RGB（1 点 3 バイト）を 8 ビット RGB の PNG に（フィルタ 0） */
export function encodePng(size, rgb) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8 ビット・RGB
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** 5 つのファイル { 名前: Buffer } を作る（書かない）。テストはこれとコミットしたファイルを比べる（TC-0002-08） */
export function renderIcons(source = fs.readFileSync(SOURCE)) {
  const src = decodePng(source);
  const icon512 = encodePng(512, iconRgb(src, 512));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" style="image-rendering:pixelated" href="data:image/png;base64,${icon512.toString('base64')}"/></svg>\n`;
  return {
    'icon-192.png': encodePng(192, iconRgb(src, 192)),
    'icon-512.png': icon512,
    'icon-maskable-512.png': encodePng(512, iconRgb(src, 512, Math.round(512 * MASKABLE_SCALE))),
    'apple-touch-icon.png': encodePng(180, iconRgb(src, 180)),
    'icon.svg': Buffer.from(svg),
  };
}

// 直接動かしたときだけ書く（テストから読み込んだときは書かない）
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(out, { recursive: true });
  for (const [name, data] of Object.entries(renderIcons())) {
    fs.writeFileSync(path.join(out, name), data);
    console.log(`${name}  ${data.length} バイト`);
  }
}
