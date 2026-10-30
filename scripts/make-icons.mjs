// アイコンを作る（仕様書 §30.5、TD-0005 §2.1）。npm run icons で public/icons/ に書き、生成物をコミットする
// 外部ライブラリは使わず、PNG は node:zlib（deflateSync・crc32）で組み立てる
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/icons');

const BG = [0x0b, 0x0a, 0x0f];
const LINE = [0xe8, 0xdc, 0xc0];
const GOLD = [0xc9, 0xa2, 0x27];
// 疑似3D の奥行きの枠（仕様書 §11.5：x = 0,40,80,110,130 / 320）を正方形に合わせた割合
const FRAMES = [0, 40, 80, 110, 130].map((x) => x / 320);
const MARGIN = 0.08; // 図柄の外側の余白（一辺に対する割合）
const LINE_W = 1 / 48; // 線の太さ（一辺に対する割合）
const DIAMOND = 0.06; // ひし形の半分の対角線（一辺に対する割合）

/** 図柄の線分とひし形（0〜1 の座標）。scale は maskable のための縮小 */
function shapes(scale) {
  const c = 0.5;
  const map = (v) => c + (v - c) * scale;
  const inner = (f) => MARGIN + f * (1 - 2 * MARGIN);
  const segs = [];
  for (const f of FRAMES) {
    const a = map(inner(f)), b = map(1 - inner(f));
    segs.push([a, a, b, a], [b, a, b, b], [b, b, a, b], [a, b, a, a]);
  }
  // 四隅を結ぶ線（外の枠の角 → いちばん奥の枠の角）
  const o0 = map(inner(0)), o1 = map(1 - inner(0));
  const i0 = map(inner(FRAMES[4])), i1 = map(1 - inner(FRAMES[4]));
  segs.push([o0, o0, i0, i0], [o1, o0, i1, i0], [o1, o1, i1, i1], [o0, o1, i0, i1]);
  return { segs, lineW: LINE_W * scale, diamond: { cx: c, cy: c, r: DIAMOND * scale } };
}

function distToSeg(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** 一辺 size の RGB の画素（行の先頭にフィルターの 0 を付けた形） */
function render(size, scale) {
  const { segs, lineW, diamond } = shapes(scale);
  const raw = Buffer.alloc(size * (size * 3 + 1));
  const half = (lineW * size) / 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      // ひし形（金）が線より上
      const dd = (Math.abs(px - diamond.cx * size) + Math.abs(py - diamond.cy * size)) - diamond.r * size;
      const gold = Math.max(0, Math.min(1, 0.5 - dd));
      let d = Infinity;
      for (const s of segs) d = Math.min(d, distToSeg(px, py, s.map((v) => v * size)));
      const line = Math.max(0, Math.min(1, half + 0.5 - d));
      const i = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) {
        const base = BG[c] + (LINE[c] - BG[c]) * line;
        raw[i + c] = Math.round(base + (GOLD[c] - base) * gold);
      }
    }
  }
  return raw;
}

function png(size, scale) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8 ビット・RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size, scale), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function svg() {
  const { segs, lineW, diamond } = shapes(1);
  const n = (v) => +(v * 512).toFixed(2);
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const lines = segs.map((s) => `<line x1="${n(s[0])}" y1="${n(s[1])}" x2="${n(s[2])}" y2="${n(s[3])}"/>`).join('');
  const { cx, cy, r } = diamond;
  const pts = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]].map(([x, y]) => `${n(x)},${n(y)}`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${hex(BG)}"/><g stroke="${hex(LINE)}" stroke-width="${n(lineW)}" stroke-linecap="round">${lines}</g><polygon points="${pts}" fill="${hex(GOLD)}"/></svg>\n`;
}

fs.mkdirSync(out, { recursive: true });
const files = [
  ['icon-192.png', png(192, 1)],
  ['icon-512.png', png(512, 1)],
  ['icon-maskable-512.png', png(512, 0.7)], // 切り抜かれても欠けないよう 0.7 倍
  ['apple-touch-icon.png', png(180, 1)],
  ['icon.svg', Buffer.from(svg())],
];
for (const [name, data] of files) {
  fs.writeFileSync(path.join(out, name), data);
  console.log(`${name}  ${data.length} バイト`);
}
