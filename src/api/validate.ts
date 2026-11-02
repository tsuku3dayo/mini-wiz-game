// 操作の引数の検査（仕様書 §22.1、§22.2。v1.0 の DTO と同じ規則）。違反は ValidationError
// 装備の引数は、その操作を作る TASK で足す
import type { BattleCommand } from '../domain/battle';
import { validateName } from '../domain/character';
import type { MoveAction } from '../domain/dungeon';
import { ValidationError } from '../domain/errors';
import type { StairsDirection } from '../domain/explore';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** startGame の name。文字列でなければ空として扱い、validateName の文言を返す。正規化後の名前を返す */
export function validateStartGame(input: unknown): string {
  const name = isObject(input) && typeof input.name === 'string' ? input.name : '';
  return validateName(name);
}

/**
 * 列挙の引数を 1 つ検査する。違反の文は v1.0 の DTO（class-validator の IsIn）の既定の文と同じにした
 * （仕様書に文言の決まりがないため。TD-0002 v1.4 §1.5）
 */
function oneOf<T extends string>(input: unknown, field: string, values: readonly T[]): T {
  const v = isObject(input) ? input[field] : undefined;
  if (typeof v === 'string' && (values as readonly string[]).includes(v)) return v as T;
  throw new ValidationError([{ field, message: `${field} must be one of the following values: ${values.join(', ')}` }]);
}

export const MOVE_ACTIONS: readonly MoveAction[] = ['forward', 'backward', 'turnLeft', 'turnRight'];
export const STAIRS_DIRECTIONS: readonly StairsDirection[] = ['down', 'up'];

export const BATTLE_COMMANDS: readonly BattleCommand[] = ['attack', 'heal', 'flee'];
export const validateBattle = (input: unknown): BattleCommand => oneOf(input, 'command', BATTLE_COMMANDS);

export const validateMove =(input: unknown): MoveAction => oneOf(input, 'action', MOVE_ACTIONS);
export const validateStairs = (input: unknown): StairsDirection => oneOf(input, 'direction', STAIRS_DIRECTIONS);
