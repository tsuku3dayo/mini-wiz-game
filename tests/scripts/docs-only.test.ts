import { describe, expect, test } from 'vitest';
import { decide, diffArgs, isDocFile, isDocsOnly } from '../../scripts/docs-only.mjs';

const ZERO = '0000000000000000000000000000000000000000';

describe('文書だけの判定（仕様書 §30.6）', () => {
  test('TC-0039-01 docs/ の中といちばん上の .md だけを文書とみなし、すべて文書のときだけ文書だけとする', () => {
    for (const file of ['docs/a.md', 'docs/requests/bgm-listen/main.ts', 'docs/requests/monster/x.png', 'README.md', 'CLAUDE.md']) {
      expect(isDocFile(file), file).toBe(true);
    }
    for (const file of ['src/main.ts', '.github/workflows/test.yml', 'package.json', 'e2e/notes.md', 'docs.md.ts', 'documents/a.md']) {
      expect(isDocFile(file), file).toBe(false);
    }
    expect(isDocsOnly(['docs/a.md', 'README.md'])).toBe(true);
    expect(isDocsOnly(['docs/a.md', 'src/main.ts'])).toBe(false);
    expect(isDocsOnly([])).toBe(false);
  });

  test('TC-0039-02 PR は共通の祖先から、push は前後で比べ、決められない・一覧が取れないときは文書だけとしない', () => {
    expect(diffArgs({ event: 'pull_request', base: 'b1', head: 'h1' })).toEqual(['b1...h1']);
    expect(diffArgs({ event: 'push', before: 'a1', sha: 's1' })).toEqual(['a1', 's1']);
    expect(diffArgs({ event: 'push', before: '', sha: 's1' })).toBeNull();
    expect(diffArgs({ event: 'push', before: ZERO, sha: 's1' })).toBeNull();
    expect(diffArgs({ event: 'push', before: 'a1' })).toBeNull();
    expect(diffArgs({ event: 'pull_request', base: 'b1' })).toBeNull();
    expect(diffArgs({ event: 'workflow_dispatch', before: 'a1', sha: 's1' })).toBeNull();

    let called = false;
    expect(decide({ event: 'push', before: ZERO, sha: 's1' }, () => { called = true; return ['docs/a.md']; })).toBe(false);
    expect(called).toBe(false);
    expect(decide({ event: 'push', before: 'a1', sha: 's1' }, () => { throw new Error('git が失敗'); })).toBe(false);

    const seen: string[][] = [];
    const list = (files: string[]) => (args: string[]) => { seen.push(args); return files; };
    expect(decide({ event: 'pull_request', base: 'b1', head: 'h1' }, list(['docs/a.md']))).toBe(true);
    expect(decide({ event: 'pull_request', base: 'b1', head: 'h1' }, list(['docs/a.md', 'src/main.ts']))).toBe(false);
    expect(decide({ event: 'push', before: 'a1', sha: 's1' }, list([]))).toBe(false);
    expect(seen).toEqual([['b1...h1'], ['b1...h1'], ['a1', 's1']]);
  });
});
