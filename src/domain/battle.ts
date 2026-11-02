// 戦闘（仕様書 §5）
// 戦闘の始まり（startBattle）は、歩いて遭遇するのに要るので TASK-0008 で前倒しした。
// ダメージ・行動順・1 ターンの解決などは TASK-0010 以降で足す
import { ENEMIES, HEAL, type EnemyKind } from './constants';
import type { GameStateData, StepResult } from './game-state';
import { countBattle } from './records';

/** 戦闘開始（仕様書 §5.1。乱数を使わない）：場所 BATTLE、敵の HP は最大、battles +1 */
export function startBattle(state: GameStateData, kind: EnemyKind): StepResult {
  const isBoss = kind === 'necromancer';
  const enemy = ENEMIES[kind];
  return {
    state: {
      ...state,
      location: 'BATTLE',
      battle: { enemy: { kind, hp: enemy.maxHp }, isBoss },
      records: countBattle(state.records),
    },
    messages: [isBoss
      ? { text: `${enemy.name}が あらわれた！`, tone: 'normal', effect: 'bossAppear' }
      : { text: `${enemy.name}が あらわれた！`, tone: 'normal' }],
  };
}

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
