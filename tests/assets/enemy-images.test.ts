import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ENEMIES } from '../../src/domain/constants';

// 敵の絵のそろい（仕様書 §13.5）。置き忘れ・名前の打ち間違いは画面では「名前だけ」に戻るだけなので、ここで突き合わせる
const dir = join(process.cwd(), 'public', 'enemies');
// v1.23：v6 から付属の情報を取り除いたもの（仕様書 §13.1・§13.3。v1.19〜v1.22 は v5 から）
const MD5: Record<string, string> = {
  slime: '58df9d892d76554ed89f82346ca21081',
  goblin: 'ce0feb1d59da9f4c15165f29264e0d79',
  skeleton: 'b7ec2c304ea02d3f3e285759798f2f8d',
  orc: '0db84f7d216036f495ea1c1613aa1d9b',
  darkKnight: 'f88bcc81b22f5e9bc9a4ba0e67743892',
  necromancer: '9b5503a0b3b32ee4fb60de8be9e46fed',
};

/** PNG のチャンクの種類を順に並べる */
function chunkTypes(b: Buffer): string[] {
  const types: string[] = [];
  let i = 8;
  while (i < b.length) {
    const len = b.readUInt32BE(i);
    types.push(b.toString('ascii', i + 4, i + 8));
    i += 12 + len;
  }
  return types;
}

describe('敵の絵のファイル', () => {
  test('TC-0033-05 種類ごとの PNG があり、256×256・8 ビット・RGB か RGBA・インタレースなし、チャンクは IHDR・IDAT・IEND だけで、MD5 が仕様書の表と同じ。余分なファイルはない', () => {
    const kinds = Object.keys(ENEMIES).sort();
    expect(kinds).toEqual(Object.keys(MD5).sort());
    for (const kind of kinds) {
      const file = join(dir, `${kind}.png`);
      expect(existsSync(file), kind).toBe(true);
      const b = readFileSync(file);
      expect([...b.subarray(0, 8)], kind).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(b.subarray(12, 16).toString('ascii'), kind).toBe('IHDR');
      expect(b.readUInt32BE(16), kind).toBe(256);
      expect(b.readUInt32BE(20), kind).toBe(256);
      expect(b[24], `${kind} ビット深度`).toBe(8);
      // v1.19：RGB（2）か RGBA（6）。v5・v6 ともスライムだけ RGB（v1.18 までは 6 だけ）
      expect([2, 6], `${kind} カラータイプ`).toContain(b[25]);
      expect(b[28], `${kind} インタレース`).toBe(0);
      // 付属の情報（EXIF・XMP など）を取り除いたこと
      expect(new Set(chunkTypes(b)), `${kind} チャンク`).toEqual(new Set(['IHDR', 'IDAT', 'IEND']));
      expect(createHash('md5').update(b).digest('hex'), kind).toBe(MD5[kind]);
    }
    const pngs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')).sort();
    expect(pngs).toEqual(kinds.map((k) => `${k}.png`).sort());
  });
});
