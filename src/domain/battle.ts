// 戦闘（仕様書 §5）
// ダメージ・行動順・1 ターンの解決などは TASK-0010 以降で足す
import { ENEMIES, HEAL, type EnemyKind } from './constants';
import type { GameStateData } from './game-state';

/** 画面に返す戦闘の情報。敵の HP は含めない（キーはこの 5 つだけ） */
export interface BattleView {
  enemyKind: EnemyKind;
  enemyName: string;
  isBoss: boolean;
  canHeal: boolean;   // MP ≥ 3
  canFlee: boolean;   // ボス戦でない
}

export function toBattleView(state: GameStateData): BattleView | null {
  const b = state.battle;
  if (!b) return null;
  return {
    enemyKind: b.enemy.kind,
    enemyName: ENEMIES[b.enemy.kind].name,
    isBoss: b.isBoss,
    canHeal: state.mp >= HEAL.mpCost,
    canFlee: !b.isBoss,
  };
}
