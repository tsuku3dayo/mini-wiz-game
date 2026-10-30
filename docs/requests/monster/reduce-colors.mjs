// Reduce an 8-bit RGBA, non-interlaced PNG to N colors (median cut). Fully transparent pixels stay transparent.
// usage: node reduce-colors.mjs <in.png> <out.png> <colors>
import fs from 'node:fs';
import zlib from 'node:zlib';

const [, , inPath, outPath, nArg] = process.argv;
const N = Number(nArg);
const buf = fs.readFileSync(inPath);

// --- decode ---
let pos = 8, width, height, idat = [];
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.subarray(pos + 8, pos + 8 + len);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0); height = data.readUInt32BE(4);
    const [depth, ctype, , , interlace] = data.subarray(8);
    if (depth !== 8 || ctype !== 6 || interlace !== 0) throw new Error(`unsupported: depth=${depth} ctype=${ctype} interlace=${interlace}`);
  } else if (type === 'IDAT') idat.push(data);
  pos += 12 + len;
}
const raw = zlib.inflateSync(Buffer.concat(idat));
const bpp = 4, stride = width * bpp;
const px = Buffer.alloc(height * stride);
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
for (let y = 0; y < height; y++) {
  const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
  for (let x = 0; x < stride; x++) {
    const r = raw[src + x], a = x >= bpp ? px[dst + x - bpp] : 0, b = y ? px[dst - stride + x] : 0, c = x >= bpp && y ? px[dst - stride + x - bpp] : 0;
    px[dst + x] = (r + [0, a, b, (a + b) >> 1, paeth(a, b, c)][f]) & 255;
  }
}

// --- median cut over opaque pixels ---
const opaque = [];
for (let i = 0; i < px.length; i += 4) if (px[i + 3] !== 0) opaque.push([px[i], px[i + 1], px[i + 2]]);
let boxes = [opaque];
while (boxes.length < N) {
  let best = -1, bestRange = -1, bestCh = 0;
  boxes.forEach((box, bi) => {
    if (box.length < 2) return;
    for (let ch = 0; ch < 3; ch++) {
      let lo = 255, hi = 0;
      for (const p of box) { if (p[ch] < lo) lo = p[ch]; if (p[ch] > hi) hi = p[ch]; }
      if (hi - lo > bestRange) { bestRange = hi - lo; best = bi; bestCh = ch; }
    }
  });
  if (best < 0 || bestRange === 0) break;
  const box = boxes[best].sort((p, q) => p[bestCh] - q[bestCh]);
  const mid = box.length >> 1;
  boxes.splice(best, 1, box.slice(0, mid), box.slice(mid));
}
const palette = boxes.map((box) => [0, 1, 2].map((ch) => Math.round(box.reduce((s, p) => s + p[ch], 0) / box.length)));

// --- map pixels; alpha becomes 0 or 255 ---
for (let i = 0; i < px.length; i += 4) {
  if (px[i + 3] === 0) { px[i] = px[i + 1] = px[i + 2] = 0; continue; }
  let bi = 0, bd = Infinity;
  palette.forEach((c, k) => { const d = (c[0] - px[i]) ** 2 + (c[1] - px[i + 1]) ** 2 + (c[2] - px[i + 2]) ** 2; if (d < bd) { bd = d; bi = k; } });
  [px[i], px[i + 1], px[i + 2]] = palette[bi]; px[i + 3] = 255;
}

// --- encode (filter 0, RGBA) ---
const rows = Buffer.alloc(height * (stride + 1));
for (let y = 0; y < height; y++) px.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); data.copy(out, 8); out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length); return out; };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr.set([8, 6, 0, 0, 0], 8);
fs.writeFileSync(outPath, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
console.log(`${outPath}: ${palette.length} colors`);
