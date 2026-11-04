import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ENEMIES } from '../../src/domain/constants';

// 敵の絵のそろい（仕様書 §13.5）。置き忘れ・名前の打ち間違いは画面では「名前だけ」に戻るだけなので、ここで突き合わせる
const dir = join(process.cwd(), 'public', 'enemies');
const MD5: Record<string, string> = {
  slime: '5f9c66ddc977d96bb6f1cacde5fe3fdf',
  goblin: '6c4fbda366c766f4be1300913503f455',
  skeleton: '6755e98e650fdb9088f4dbe86bdfe032',
  orc: 'cbbdb07380d25f350f5034c5a528cadc',
  darkKnight: '3d6b07f209c1e271c60e8ac979fbe922',
  necromancer: '1a7644d8b548af4adbd4b7d5b5c8c492',
};

describe('敵の絵のファイル', () => {
  test('TC-0033-05 種類ごとの PNG があり、256×256・8 ビット RGBA で、MD5 が仕様書の表と同じ。余分なファイルはない', () => {
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
      expect(b[25], `${kind} カラータイプ`).toBe(6);
      expect(createHash('md5').update(b).digest('hex'), kind).toBe(MD5[kind]);
    }
    const pngs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')).sort();
    expect(pngs).toEqual(kinds.map((k) => `${k}.png`).sort());
  });
});
