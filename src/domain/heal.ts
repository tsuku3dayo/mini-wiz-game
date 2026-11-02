// ヒール（戦闘・ダンジョン共通。仕様書 §7.1）。乱数を使わない
import { HEAL } from './constants';
import { effectiveStats } from './equipment';
import { InvalidStateError } from './errors';
import { assertLocation, type GameStateData, type Message, type StepResult } from './game-state';

/** 今の MP が 3 以上か（実効値ではなく今の MP） */
export const canHeal = (s: { mp: number }): boolean => s.mp >= HEAL.mpCost;

/** 回復の計算：healed = max(0, min(30, 最大 HP（実効値）− 今の HP))、MP を 3 減らす。MP の検査は呼ぶ側 */
export function castHeal<S extends GameStateData>(s: S, maxHp: number): { state: S; message: Message } {
  const healed = Math.max(0, Math.min(HEAL.amount, maxHp - s.hp));
  return {
    state: { ...s, hp: s.hp + healed, mp: s.mp - HEAL.mpCost },
    message: { text: `${s.name}は ヒールを となえた！ HP が ${healed} かいふくした`, tone: 'success' },
  };
}

/** ダンジョンのヒール：DUNGEON のときだけ。位置・踏破記録・実績は変えない */
export function fieldHeal(state: GameStateData): StepResult {
  assertLocation(state, 'DUNGEON');
  if (!canHeal(state)) throw new InvalidStateError('MP が たりない');
  const r = castHeal(state, effectiveStats(state).maxHp);
  return { state: r.state, messages: [r.message] };
}
