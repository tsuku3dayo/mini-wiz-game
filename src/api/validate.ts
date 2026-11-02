// 操作の引数の検査（仕様書 §22.1、§22.2。v1.0 の DTO と同じ規則）。違反は ValidationError
// 移動・階段・戦闘・装備の引数は、その操作を作る TASK で足す
import { validateName } from '../domain/character';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** startGame の name。文字列でなければ空として扱い、validateName の文言を返す。正規化後の名前を返す */
export function validateStartGame(input: unknown): string {
  const name = isObject(input) && typeof input.name === 'string' ? input.name : '';
  return validateName(name);
}
