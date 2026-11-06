import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ENEMIES } from '../../src/domain/constants';

// 敵の絵のそろい（仕様書 §13.5）。置き忘れ・名前の打ち間違いは画面では「名前だけ」に戻るだけなので、ここで突き合わせる
const dir = join(process.cwd(), 'public', 'enemies');
const MD5: Record<string, string> = {
  slime: 'd93b44dfa7d63c1da1e3e4b12c4b6a74',
  goblin: '16a4dc7c54cedf92e762f3f7e9136b8f',
  skeleton: '9df2f42322c0b8fe44a1d911d73a643a',
  orc: '4f769408998fe5060cb04f2c97986716',
  darkKnight: '45c25616dad075cd9d9fef3888d42e90',
  necromancer: 'bb0343f58c663e01b63221ecb291795e',
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
