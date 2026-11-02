// 名前の規則（画面の側。仕様書 §11.5「名前入力」）。ゲーム API と同じ規則（domain/character.ts の validateName）を画面向けに包む
import { normalizeName, validateName } from '../domain/character';
import { NAME_MAX_LENGTH } from '../domain/constants';
import { ValidationError } from '../domain/errors';

export const NAME_MAX = NAME_MAX_LENGTH;

export interface NameCheck {
  /** 入力欄の下に出すエラーの文。空のときは出さない（null） */
  error: string | null;
  /** 決定が有効か（応答待ちかどうかは画面が別に見る） */
  canSubmit: boolean;
  /** 決定が無効なときの理由（有効なら null） */
  reason: string | null;
  /** 正規化したあとの文字数（コードポイント）。右下の「{文字数}/8」に使う */
  length: number;
}

/** 文字数をコードポイントで数える（サロゲートペアは 1 文字） */
export function countChars(raw: string): number {
  return [...raw].length;
}

export function checkName(raw: string): NameCheck {
  const length = countChars(normalizeName(raw));
  try {
    validateName(raw);
    return { error: null, canSubmit: true, reason: null, length };
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    const message = e.details[0]?.message ?? e.message;
    // 空のときはエラーを出さないが、決定は無効（理由は「名前を入力してください」）
    return { error: length === 0 ? null : message, canSubmit: false, reason: message, length };
  }
}
