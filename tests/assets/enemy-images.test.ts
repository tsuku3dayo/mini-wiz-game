import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ENEMIES } from '../../src/domain/constants';

// 敵の絵のそろい（仕様書 §13.5）。置き忘れ・名前の打ち間違いは画面では「名前だけ」に戻るだけなので、ここで突き合わせる
const dir = join(process.cwd(), 'public', 'enemies');
// v1.19：v5 から付属の情報を取り除いたもの（仕様書 §13.1・§13.3）
const MD5: Record<string, string> = {
  slime: 'a3baa3f4e8e31ee1eb15298493eb1fb3',
  goblin: '97f222e3eb465c1c19c798013ad63bec',
  skeleton: '62ccdf6b00934945e0fb2ece6e487ea7',
  orc: '87b6cc60b7bca1204965453191d88a09',
  darkKnight: '76838481db67cd297fe57def85d51da7',
  necromancer: 'e41e2ee5a772951e609f1277b0c495b6',
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
      // v1.19：RGB（2）か RGBA（6）。v5 はスライムだけ RGB（v1.18 までは 6 だけ）
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
