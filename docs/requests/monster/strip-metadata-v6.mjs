// 敵の絵 v6（v5 と同じ形。背景が真っ黒・透明なしの PNG）から、絵の点のデータ以外の付属のチャンクを取り除いて置く
// 残すのは IHDR・IDAT・IEND だけ。各チャンクのバイト（長さ・種類・中身・CRC）はそのまま写すので、絵の点は 1 つも変わらない
// 取り除くもの：sBIT・sRGB（0＝標準）・gAMA（45455＝標準の 1/2.2）・pHYs（解像度）・zTXt（EXIF：Picasa・画像の通し番号）・iTXt（XMP：向き）
// sRGB・gAMA は標準の値なので、取り除いてもブラウザでの色の見え方は変わらない（どちらもないとき、ブラウザは標準の色で出す）
// 仕様書 §13.3（v1.23。v1.19〜v1.22 の v5 は strip-metadata-v5.mjs）。zlib を使わないので、Node.js の版によらず仕様書 §13.1 の表の MD5 になる
// 使い方：node docs/requests/monster/strip-metadata-v6.mjs docs/requests/monster public/enemies
import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  ['monster_slime_pixel256_black_v6.png', 'slime.png'],
  ['monster_goblin_pixel256_black_v6.png', 'goblin.png'],
  ['monster_skeleton_pixel256_black_v6.png', 'skeleton.png'],
  ['monster_orc_lord_pixel256_black_v6.png', 'orc.png'],
  ['monster_dark_knight_pixel256_black_v6.png', 'darkKnight.png'],
  ['monster_necromancer_pixel256_black_v6.png', 'necromancer.png'],
];
const KEEP = new Set(['IHDR', 'IDAT', 'IEND']);
const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** 残すチャンクだけを並べた PNG を返す。取り除いたチャンクの種類も返す */
function strip(buf, name) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error(`${name}：PNG でない`);
  const parts = [SIGNATURE];
  const dropped = [];
  let i = 8;
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const chunk = buf.subarray(i, i + 12 + len);
    if (KEEP.has(type)) parts.push(chunk);
    else dropped.push(type);
    i += 12 + len;
    if (type === 'IEND') break;
  }
  return { out: Buffer.concat(parts), dropped };
}

const [from, to] = process.argv.slice(2);
if (!from || !to) throw new Error('使い方：node strip-metadata-v6.mjs <入力のフォルダ> <出力のフォルダ>');
for (const [src, dst] of FILES) {
  const { out, dropped } = strip(fs.readFileSync(path.join(from, src)), src);
  fs.writeFileSync(path.join(to, dst), out);
  console.log(`${src} → ${dst}（${out.length} バイト。取り除いた：${dropped.join('・') || 'なし'}）`);
}
