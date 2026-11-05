import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { TITLE_IMAGE_HEIGHT, TITLE_IMAGE_URL, TITLE_IMAGE_WIDTH } from '../../src/logic/title-image';

// タイトル画像のファイル（仕様書 §13.6）。置き忘れ・取り違えは画面では文字のタイトルに戻るだけなので、ここで確かめる
describe('タイトル画像のファイル', () => {
  test('TC-0006-12 public/title/title.png があり、1080×720・8 ビット RGB の PNG で、MD5 が仕様書の値と同じ', () => {
    const file = join(process.cwd(), 'public', TITLE_IMAGE_URL);
    expect(existsSync(file)).toBe(true);
    const b = readFileSync(file);
    expect([...b.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(b.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect([b.readUInt32BE(16), b.readUInt32BE(20)]).toEqual([1080, 720]);
    expect([TITLE_IMAGE_WIDTH, TITLE_IMAGE_HEIGHT]).toEqual([1080, 720]);
    expect([b[24], b[25]]).toEqual([8, 2]);
    expect(createHash('md5').update(b).digest('hex')).toBe('b7bdabf36d32d509c17da90df9e73120');
  });
});