// 戦闘（仕様書 §5、§9.1）：ダメージ・行動順・回避・逃走・1 ターンの解決・勝利・敗北
// ボスに勝ったときの処理（§9.1）は、1 ターンの解決が勝利まで返す決まりなので TASK-0010 で作った（確かめは TASK-0012）
import { gainExp } from './character';
import { ENEMIES, EVASION, FLEE, HEAL, type EnemyKind, type EnemyStats } from './constants';
import { effectiveStats } from './equipment';
import { InvalidStateError } from './errors';
import { assertLocation, type GameStateData, type Message, type StepResult } from './game-state';
import { canHeal, castHeal } from './heal';
import { applyDrop, rollDrop } from './loot';
import { countBattle, countBossKill, countDeath, countKill } from './records';
import type { Rng } from './rng';

export type BattleCommand = 'attack' | 'heal' | 'flee';
export type TurnOutcome = 'continue' | 'victory' | 'defeat' | 'fled';

export interface TurnResult extends StepResult {
  outcome: TurnOutcome;
}

export interface Combatant {
  attack: number;
  defense: number;
  speed: number;
  evasion: number; // プレイヤーは 素早さの実効値＋たての補正、敵は その敵の素早さ（v1.16）
}

/** 画面に返す戦闘の情報。敵の HP は含めない（キーはこの 5 つだけ） */
export interface BattleView {
  enemyKind: EnemyKind;
  enemyName: string;
  isBoss: boolean;
  canHeal: boolean;   // MP ≥ 3
  canFlee: boolean;   // ボス戦でない
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** damage = max(1, 攻撃力 − floor(防御力 ÷ 2) + int(0, 2)) */
export function damage(attack: number, defense: number, rng: Rng): number {
  return Math.max(1, attack - Math.floor(defense / 2) + rng.int(0, 2));
}

/** 行動順：プレイヤーの素早さ（実効値）≥ 敵ならプレイヤーが先 */
export function turnOrder(playerSpeed: number, enemySpeed: number): ('player' | 'enemy')[] {
  return playerSpeed >= enemySpeed ? ['player', 'enemy'] : ['enemy', 'player'];
}

/** 回避率（%）= clamp(受ける側のかいひ − 攻撃する側の速, 0, 90)（v1.16。かいひ は素早さを含む） */
export function evadeChance(defenderEvasion: number, attackerSpeed: number): number {
  return clamp(defenderEvasion - attackerSpeed, EVASION.min, EVASION.max);
}

/** 逃走成功率（%）= clamp(50 + (プレイヤー − 敵) × 5, 10, 90) */
export function fleeChance(playerSpeed: number, enemySpeed: number): number {
  return clamp(FLEE.base + (playerSpeed - enemySpeed) * FLEE.perSpeed, FLEE.min, FLEE.max);
}

/** 攻撃 1 回：回避の int(1,100) → 当たったときだけダメージの int(0,2) */
export function attack(attacker: Combatant, defender: Combatant, rng: Rng): { damage: number; evaded: boolean } {
  // 回避率 0% のときも、この乱数は 1 個引く（引く数をそろえる）
  if (rng.int(1, 100) <= evadeChance(defender.evasion, attacker.speed)) return { damage: 0, evaded: true };
  return { damage: damage(attacker.attack, defender.defense, rng), evaded: false };
}

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

/** 敗北：宿屋で目覚める。HP・MP は実効値の最大まで回復、deaths +1。経験値・ドロップなし */
export function onDefeat(state: GameStateData, messages: Message[]): TurnResult {
  const eff = effectiveStats(state);
  return {
    state: {
      ...state,
      location: 'INN',
      hp: eff.maxHp,
      mp: eff.maxMp,
      dungeon: null,
      battle: null,
      records: countDeath(state.records),
    },
    messages: [
      ...messages,
      { text: `${state.name}は たおれた…`, tone: 'danger' },
      { text: '気がつくと 宿屋に いた', tone: 'normal' },
    ],
    outcome: 'defeat',
  };
}

/** 勝利：通常の敵は「たおした → 経験値 → ドロップ」、ボスはさらに「平和が もどった」（§5.5、§9.1）。レベルは宿屋の やすむ で上がる（v1.14） */
function onVictory(state: GameStateData, kind: EnemyKind, messages: Message[], rng: Rng): TurnResult {
  const enemy = ENEMIES[kind];
  const isBoss = kind === 'necromancer';
  const out: Message[] = [
    ...messages,
    isBoss
      ? { text: `${enemy.name}を たおした！`, tone: 'success', effect: 'bossDefeat' }
      : { text: `${enemy.name}を たおした！`, tone: 'success' },
    { text: `経験値 ${enemy.exp} を かくとく`, tone: 'success' },
  ];
  const base: GameStateData = isBoss
    ? { ...state, dungeon: null, battle: null, records: countBossKill(state.records) }
    : { ...state, battle: null, records: countKill(state.records) };
  // 経験値を足すだけ（乱数を引かない）→ ドロップ
  const dropped = applyDrop(gainExp(base, enemy.exp),enemy.name, rollDrop(kind, rng), isBoss ? 'CLEARED' : 'DUNGEON');
  out.push(...dropped.messages);
  // 満杯で入れ替え待ちになったときは、クリアの行は入れ替えのあとで出す
  if (isBoss && dropped.state.location === 'CLEARED') out.push({ text: 'ダンジョンに 平和が もどった', tone: 'success', effect: 'clear' });
  return { state: dropped.state, messages: out, outcome: 'victory' };
}

/** 1 ターンの解決（§5.3）。継続・勝利・逃走成功・敗北のどれかの状態を返す（HP 0 の中間はない） */
export function resolveTurn(state: GameStateData, command: BattleCommand, rng: Rng): TurnResult {
  // 事前条件の検査順：場所 → 戦闘データ → ヒールの MP → ボス戦の逃走
  assertLocation(state, 'BATTLE');
  const battle = state.battle;
  if (!battle) throw new InvalidStateError();
  if (command === 'heal' && !canHeal(state)) throw new InvalidStateError('MP が たりない');
  if (command === 'flee' && battle.isBoss) throw new InvalidStateError('にげられない！');

  // 装備は戦闘中に変わらないので、実効値はターンの最初に 1 回だけ計算する
  const eff = effectiveStats(state);
  const kind = battle.enemy.kind;
  // 敵の かいひ は、その敵の素早さ（v1.16）
  const enemy: EnemyStats & Combatant = { ...ENEMIES[kind], evasion: ENEMIES[kind].speed };
  const player: Combatant = { attack: eff.attack, defense: eff.defense, speed: eff.speed, evasion: eff.evasion };
  const messages: Message[] = [];
  let cur = state;
  let enemyHp = battle.enemy.hp;

  /** 敵の攻撃 1 回。倒れたら敗北の結果を返す */
  const enemyActs = (): TurnResult | null => {
    const hit = attack(enemy, player, rng);
    if (hit.evaded) {
      messages.push({ text: `${cur.name}は ひらりと みをかわした！`, tone: 'normal' });
      return null;
    }
    messages.push({ text: `${enemy.name}の こうげき！ ${hit.damage} の ダメージを うけた！`, tone: 'normal' });
    cur = { ...cur, hp: Math.max(0, cur.hp - hit.damage) };
    return cur.hp === 0 ? onDefeat(cur, messages) : null;
  };

  if (command === 'flee') {
    if (rng.int(1, 100) <= fleeChance(eff.speed, enemy.speed)) {
      return { state: { ...cur, location: 'DUNGEON', battle: null }, messages: [{ text: 'うまく にげきれた', tone: 'normal' }], outcome: 'fled' };
    }
    // 失敗：素早さに関係なく、敵だけが攻撃 1 回
    messages.push({ text: 'にげられなかった！', tone: 'normal' });
    const lost = enemyActs();
    if (lost) return lost;
  } else {
    for (const actor of turnOrder(eff.speed, enemy.speed)) {
      if (actor === 'enemy') {
        const lost = enemyActs();
        if (lost) return lost;
      } else if (command === 'heal') {
        const r = castHeal(cur, eff.maxHp);
        cur = r.state;
        messages.push(r.message);
      } else {
        const hit = attack(player, enemy, rng);
        if (hit.evaded) {
          messages.push({ text: `${enemy.name}は ひらりと みをかわした！`, tone: 'normal' });
        } else {
          messages.push({ text: `${cur.name}の こうげき！ ${enemy.name}に ${hit.damage} の ダメージ！`, tone: 'normal' });
          enemyHp = Math.max(0, enemyHp - hit.damage);
          // 倒したら、その場で勝利（後の敵は行動しない）
          if (enemyHp === 0) return onVictory(cur, kind, messages, rng);
        }
      }
    }
  }
  return { state: { ...cur, battle: { ...battle, enemy: { kind, hp: enemyHp } } }, messages, outcome: 'continue' };
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
