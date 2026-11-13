// 探索：出発・移動（踏破記録・遭遇判定）・階段・帰還・敵の選択（仕様書 §4.2〜§4.6、§5.1）
import { startBattle } from './battle';
import { ENCOUNTER_RATE, ENCOUNTER_TABLE, type EnemyKind } from './constants';
import { cellIndex, move, samePosition, type MoveAction } from './dungeon';
import { InvalidStateError } from './errors';
import { generateFloors } from './floors';
import { assertLocation, type DungeonData, type GameStateData, type StepResult } from './game-state';
import type { Rng } from './rng';

export type StairsDirection = 'down' | 'up';

/** 宿屋から出発する。残したマップがあれば 1F の入口・北向きから使い（乱数なし。v1.22）、なければ 5 階層を新しく作る。HP・MP は回復しない */
export function enterDungeon(state: GameStateData, rng: Rng): StepResult {
  assertLocation(state, 'INN');
  const kept = state.dungeon;
  const up = kept?.floors[0].up;
  const dungeon = kept && up ? { ...kept, floor: 1, player: { x: up.x, y: up.y, facing: 'N' as const } } : generateFloors(rng);
  return {
    state: { ...state, location: 'DUNGEON', dungeon, battle: null },
    messages: [{ text: 'ダンジョンに ふみこんだ', tone: 'normal' }],
  };
}

/** 今の位置を、今の階で踏破済みにする。ボスのマスと、踏破済みのマスではそのまま返す */
export function visitCurrent(d: DungeonData): DungeonData {
  const f = d.floors[d.floor - 1];
  const i = cellIndex(d.player, d.width);
  if (f.visited[i] || samePosition(f.boss, d.player)) return d;
  const visited = f.visited.map((v, j) => v || j === i);
  return { ...d, floors: d.floors.map((g, n) => (n === d.floor - 1 ? { ...g, visited } : g)) };
}

/** 出現表から 1 体選ぶ：int(1,100) を 1 個引き、表の順に累積して r ≦ 累積 の最初の敵 */
export function pickEnemy(floor: number, rng: Rng): EnemyKind {
  const table = ENCOUNTER_TABLE[floor];
  const r = rng.int(1, 100);
  let sum = 0;
  for (const [kind, rate] of table) {
    sum += rate;
    if (r <= sum) return kind;
  }
  return table[table.length - 1][0];
}

/** 今の位置の遭遇判定：ボスのマス → 必ずボス戦、階段・入口 → なし、chance(0.2) → 出現表の敵 */
export function checkEncounter(state: GameStateData, rng: Rng): StepResult {
  const d = state.dungeon;
  if (!d) throw new InvalidStateError();
  const f = d.floors[d.floor - 1];
  if (samePosition(f.boss, d.player)) return startBattle(state, 'necromancer');
  if (samePosition(f.up, d.player) || samePosition(f.down, d.player)) return { state, messages: [] };
  if (!rng.chance(ENCOUNTER_RATE)) return { state, messages: [] };
  return startBattle(state, pickEnemy(d.floor, rng));
}

/** 移動（仕様書 §4.2）：壁なら「かべだ」、回転は向きだけ、別のマスへ移ったら踏破記録 → 遭遇判定 */
export function moveInDungeon(state: GameStateData, action: MoveAction, rng: Rng): StepResult {
  assertLocation(state, 'DUNGEON');
  const d = state.dungeon;
  if (!d) throw new InvalidStateError();
  const r = move(d, action);
  if (r.bumped) return { state, messages: [{ text: 'かべだ', tone: 'normal' }] };
  if (!r.moved) return { state: { ...state, dungeon: r.dungeon }, messages: [] };
  return checkEncounter({ ...state, dungeon: visitCurrent(r.dungeon) }, rng);
}

/** 階段の昇降（仕様書 §4.4）。向きを変えず、着いたマスを踏破済みにする。乱数・遭遇判定なし */
export function useStairs(state: GameStateData, direction: StairsDirection): StepResult {
  assertLocation(state, 'DUNGEON');
  const d = state.dungeon;
  if (!d) throw new InvalidStateError();
  const f = d.floors[d.floor - 1];
  let to: number;
  if (direction === 'down') {
    if (!samePosition(f.down, d.player)) throw new InvalidStateError('ここには くだり階段は ない');
    to = d.floor + 1;
  } else {
    if (d.floor < 2 || !samePosition(f.up, d.player)) throw new InvalidStateError('ここには のぼり階段は ない');
    to = d.floor - 1;
  }
  const dest = d.floors[to - 1];
  const at = dest ? (direction === 'down' ? dest.up : dest.down) : null;
  if (!at) throw new InvalidStateError('その先には すすめない');
  const dungeon = visitCurrent({ ...d, floor: to, player: { x: at.x, y: at.y, facing: d.player.facing } });
  return {
    state: { ...state, dungeon },
    messages: [{ text: direction === 'down' ? `${to}F に おりた` : `${to}F に のぼった`, tone: 'normal' }],
  };
}

/** 1F の入口から宿屋へ戻る（仕様書 §4.5）。HP・MP・経験値・所持品はそのまま */
export function returnToInn(state: GameStateData): StepResult {
  assertLocation(state, 'DUNGEON');
  const d = state.dungeon;
  if (!d || d.floor !== 1 || !samePosition(d.floors[0].up, d.player)) {
    throw new InvalidStateError('入口に いないため もどれません');
  }
  return {
    state: { ...state, location: 'INN', battle: null },
    messages: [{ text: '宿屋に もどった', tone: 'normal' }],
  };
}
