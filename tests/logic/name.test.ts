import { describe, expect, test } from 'vitest';
import { checkName, countChars } from '../../src/logic/name';

describe('名前の規則（画面）', () => {
  test('TC-0007-05 空はエラーを出さず決定は無効、違反は §2.1 の文言、規則に合えば決定が有効。文字数はコードポイント', () => {
    // 空・空白のみ：エラーを出さない・決定は無効・理由は「名前を入力してください」
    for (const raw of ['', '   ', '　']) {
      expect(checkName(raw)).toEqual({ error: null, canSubmit: false, reason: '名前を入力してください', length: 0 });
    }
    // 9 文字以上
    const long = checkName('ゆうしゃアルド12');
    expect(long).toMatchObject({ error: '名前は1〜8文字で入力してください', canSubmit: false, reason: '名前は1〜8文字で入力してください', length: 9 });
    // 記号を含む
    for (const raw of ['a<b', 'ゆうしゃ😀']) {
      expect(checkName(raw)).toMatchObject({ error: 'つかえない もじが ふくまれています', canSubmit: false, reason: 'つかえない もじが ふくまれています' });
    }
    // 規則に合う
    for (const raw of ['ゆうしゃ', ' ゆうしゃ　', 'Al do', '𠮷'.repeat(8)]) {
      expect(checkName(raw)).toMatchObject({ error: null, canSubmit: true, reason: null });
    }
    // 文字数をコードポイントで数える
    expect(countChars('𠮷𠮷')).toBe(2);
    expect(checkName('𠮷𠮷').length).toBe(2);
    expect(checkName(' ゆうしゃ　').length).toBe(4);
  });
});
