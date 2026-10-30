import { describe, expect, test } from 'vitest';
import { versionLabel } from '../../src/logic/version';

describe('版の表記', () => {
  test('TC-0006-02 package.json の version の先頭 2 つに v を付ける', () => {
    expect(versionLabel('1.0.0')).toBe('v1.0');
    expect(versionLabel('1.2.3')).toBe('v1.2');
  });
});
