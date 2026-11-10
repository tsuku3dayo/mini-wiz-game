// 敵の絵 v4（背景が黒・透明なしの PNG）の、外側から続く真っ黒 (0,0,0) の点だけを透明にして、RGBA の PNG を作る
// Node.js の標準モジュール（fs・path・zlib）だけを使う。入力：8 ビット・RGB（カラータイプ 2）・インタレースなしの PNG
// 出力：8 ビット・RGBA（カラータイプ 6）。チャンクは IHDR・IDAT・IEND だけ（説明文などのチャンクは写さない）。各行のフィルタは 0（なし）、zlib の圧縮レベル 9
// 仕様書 §13.3（v1.11）。Node.js v24.0.0 で、仕様書 §13.1 の表の MD5 になる
// 使い方：node docs/requests/monster/make-transparent-v4.mjs docs/requests/monster public/enemies
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const FILES = [
  ['monster_slime_pixel256_v4.png', 'slime.png'],
  ['monster_goblin_pixel256_v4.png', 'goblin.png'],
  ['monster_skeleton_pixel256_v4.png', 'skeleton.png'],
  ['monster_orc_lord_pixel256_v4.png', 'orc.png'],
  ['monster_dark_knight_pixel256_v4.png', 'darkKnight.png'],
  ['monster_necromancer_pixel256_v4.png', 'necromancer.png'],
];

/** PNG を読む（8 ビット・RGB・インタレースなしだけ） */
function readRgb(file) {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 1, 4) !== 'PNG') throw new Error(`${file}：PNG でない`);
  let i = 8, w = 0, h = 0;
  const idat = [];
  while (i < b.length) {
    const len = b.readUInt32BE(i), type = b.toString('latin1', i + 4, i + 8), d = b.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4);
      if (d[8] !== 8 || d[9] !== 2 || d[12] !== 0) throw new Error(`${file}：8 ビット・RGB・インタレースなしでない`);
    }
    if (type === 'IDAT') idat.push(d);
    i += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 3, stride = w * bpp, px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const up = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a;
      else if (f === 2) v += up;
      else if (f === 3) v += (a + up) >> 1;
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      else if (f !== 0) throw new Error(`${file}：知らないフィルタ ${f}`);
      px[y * stride + x] = v & 255;
    }
  }
  return { w, h, px };
}

/** 外側（4 辺）から、上下左右につながる真っ黒の点を透明にした RGBA */
function clearOutside({ w, h, px }) {
  const rgba = Buffer.alloc(w * h * 4);
  for (let p = 0; p < w * h; p++) { px.copy(rgba, p * 4, p * 3, p * 3 + 3); rgba[p * 4 + 3] = 255; }
  const black = (p) => px[p * 3] === 0 && px[p * 3 + 1] === 0 && px[p * 3 + 2] === 0;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  let cleared = 0;
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    seen[p] = 1;
    if (!black(p)) continue;
    rgba[p * 4 + 3] = 0;
    cleared++;
    const x = p % w, y = (p - x) / w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  return { rgba, cleared };
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const v of buf) c = CRC[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const t = Buffer.from(type, 'latin1'), len = Buffer.alloc(4), crc = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function writeRgba(file, w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.writeFileSync(file, png);
  return png.length;
}

const [inDir, outDir] = process.argv.slice(2);
if (!inDir || !outDir) throw new Error('使い方：node make-transparent-v4.mjs <入力のフォルダ> <出力のフォルダ>');
for (const [src, dst] of FILES) {
  const img = readRgb(path.join(inDir, src));
  const { rgba, cleared } = clearOutside(img);
  const bytes = writeRgba(path.join(outDir, dst), img.w, img.h, rgba);
  console.log(`${dst}\t${img.w}x${img.h}\t透明にした点 ${cleared}\t${bytes} バイト`);
}
