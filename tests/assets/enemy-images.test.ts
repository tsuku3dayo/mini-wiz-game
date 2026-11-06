import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ENEMIES } from '../../src/domain/constants';

// 敵の絵のそろい（仕様書 §13.5）。置き忘れ・名前の打ち間違いは画面では「名前だけ」に戻るだけなので、ここで突き合わせる
const dir = join(process.cwd(), 'public', 'enemies');
const MD5: Record<string, string> = {
  slime: '54fd821a1a65086167e7f944908ca45b',
  goblin: '5786c7f1224d409b42f33e59e59ca1fb',
  skeleton: '5138ec2dd0fcf6aa1197729bc3ed50a0',
  orc: '26c758185fbac746728186b11635b4e2',
  darkKnight: 'a390b6283bc0014c4cb9b5dbaad5bbd0',
  necromancer: '7d48073ecad4ec8cfe622cf759945193',
};

describe('敵の絵のファイル', () => {
  test('TC-0033-05 種類ごとの PNG があり、128×128・8 ビット RGBA で、MD5 が仕様書の表と同じ。余分なファイルはない', () => {
    const kinds = Object.keys(ENEMIES).sort();
    expect(kinds).toEqual(Object.keys(MD5).sort());
    for (const kind of kinds) {
      const file = join(dir, `${kind}.png`);
      expect(existsSync(file), kind).toBe(true);
      const b = readFileSync(file);
      expect([...b.subarray(0, 8)], kind).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(b.subarray(12, 16).toString('ascii'), kind).toBe('IHDR');
      expect(b.readUInt32BE(16), kind).toBe(128);
      expect(b.readUInt32BE(20), kind).toBe(128);
      expect(b[24], `${kind} ビット深度`).toBe(8);
      expect(b[25], `${kind} カラータイプ`).toBe(6);
      expect(createHash('md5').update(b).digest('hex'), kind).toBe(MD5[kind]);
    }
    const pngs = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.png')).sort();
    expect(pngs).toEqual(kinds.map((k) => `${k}.png`).sort());
  });
});
