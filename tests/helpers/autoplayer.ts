// 自動プレイヤー（仕様書 §29.2）：ゲーム API だけで遊ぶ。乱数を引かない（ゲーム API に渡した Rng だけで結果が決まる）
// - 今の階の全マスを debugDungeon で取り、幅優先探索で道を選ぶ（ボスのマスは、ボスに挑むとき以外は通らない）
// - HP 50% 未満で帰還（ダンジョンのヒールが使えれば先に使う）、戦闘中は 30% 未満でヒール
// - レベルで降りる階を決める（2F:Lv2、3F:Lv4、4F:Lv5、5F:Lv7、ボスは Lv9）
// - 拾った装備を部位ごとに強い方へ付け替え、満杯なら最弱と入れ替える
import type { DebugDungeon, Facing, GameApi, GameView, ItemView, MoveAction } from '../../src/api/types';

export interface PlayResult {
  battles: number;
  deaths: number;
  /** ボスを倒したときの Lv（周ごと） */
  bossLevels: number[];
  drops: number;
  calls: number;
  final: GameView;
}

const FACINGS: Facing[] = ['N', 'E', 'S', 'W'];
const DX: Record<Facing, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const BIT: Record<Facing, number> = { N: 1, E: 2, S: 4, W: 8 };

/** レベルで降りてよい最も深い階 */
function maxFloor(level: number): number {
  if (level >= 7) return 5;
  if (level >= 5) return 4;
  if (level >= 4) return 3;
  if (level >= 2) return 2;
  return 1;
}

const tierOf = (i: ItemView) => Number(i.itemId.slice(-1));
/** 強さ：段階 → 補正値 */
const stronger = (a: ItemView, b: ItemView | null) => !b || tierOf(a) > tierOf(b) || (tierOf(a) === tierOf(b) && a.value > b.value);

/** from から to への最短の道の、最初の一歩の向き（行けなければ null）。avoid のマスは通らない */
function firstStep(d: DebugDungeon, to: { x: number; y: number }, avoid: { x: number; y: number } | null): Facing | null {
  const size = 10;
  const idx = (x: number, y: number) => y * size + x;
  const start = idx(d.player.x, d.player.y);
  const goal = idx(to.x, to.y);
  if (start === goal) return null;
  const prev = new Map<number, [number, Facing]>();
  const queue = [start];
  const seen = new Set([start]);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === goal) break;
    const x = cur % size;
    const y = Math.floor(cur / size);
    for (const f of FACINGS) {
      if (d.walls[cur] & BIT[f]) continue;
      const nx = x + DX[f][0];
      const ny = y + DX[f][1];
      const n = idx(nx, ny);
      if (seen.has(n) || (avoid && avoid.x === nx && avoid.y === ny && n !== goal)) continue;
      seen.add(n);
      prev.set(n, [cur, f]);
      queue.push(n);
    }
  }
  if (!prev.has(goal)) return null;
  let at = goal;
  let dir: Facing = 'N';
  while (at !== start) {
    const [p, f] = prev.get(at)!;
    dir = f;
    at = p;
  }
  return dir;
}

/** 今の向きから dir を向くための操作 */
function turnTo(facing: Facing, dir: Facing): MoveAction | null {
  const diff = (FACINGS.indexOf(dir) - FACINGS.indexOf(facing) + 4) % 4;
  if (diff === 0) return null;
  return diff === 3 ? 'turnLeft' : 'turnRight';
}

/** laps 回ボスを倒すまで遊ぶ。resume なら新しく始めず、今のプレイ中の状態から続ける */
export async function play(api: GameApi, name: string, opts: { laps: number; maxCalls?: number; resume?: boolean }): Promise<PlayResult> {
  const result = { battles: 0, deaths: 0, bossLevels: [] as number[], drops: 0, calls: 0 };
  const maxCalls = opts.maxCalls ?? 300_000;
  let lapsDone = 0;
  /** 行ったり来たりで戦うときの、次の目的地（'down' か 'up'） */
  let roam: 'down' | 'up' = 'down';
  let state = opts.resume ? (await api.getGame()).state! : (await api.startGame({ name })).state;

  const call = async (fn: () => Promise<{ state: GameView; messages: { text: string }[] }>) => {
    result.calls += 1;
    if (result.calls > maxCalls) throw new Error(`自動プレイヤー：操作が ${maxCalls} 回を超えた（Lv${state.character.level}・${state.location}）`);
    const r = await fn();
    for (const m of r.messages) {
      if (m.text.endsWith('あらわれた！')) result.battles += 1;
      if (m.text.endsWith('を おとした！')) result.drops += 1;
      if (m.text.endsWith('たおれた…')) result.deaths += 1;
    }
    state = r.state;
  };

  const hpRate = () => state.character.hp / state.character.maxHp;

  while (lapsDone < opts.laps) {
    const c = state.character;
    switch (state.location) {
      case 'INN':
        if (c.hp < c.maxHp || c.mp < c.maxMp) await call(() => api.rest());
        await call(() => api.enterDungeon());
        roam = 'down';
        break;
      case 'CLEARED':
        lapsDone += 1;
        result.bossLevels.push(c.level);
        if (lapsDone < opts.laps) await call(() => api.continueGame());
        break;
      case 'SWAP': {
        const drop = state.pendingDrop!;
        const weakest = [...state.inventory.items].sort((a, b) => tierOf(a) - tierOf(b) || a.value - b.value)[0];
        if (weakest && stronger(drop, weakest)) await call(() => api.lootTake({ discardId: weakest.id }));
        else await call(() => api.lootAbandon());
        break;
      }
      case 'BATTLE': {
        const heal = hpRate() < 0.3 && state.battle!.canHeal;
        await call(() => api.battle({ command: heal ? 'heal' : 'attack' }));
        break;
      }
      case 'DUNGEON': {
        // 強い装備に付け替える
        const upgrade = state.inventory.items.find((i) => stronger(i, state.inventory.equipped[i.slot]));
        if (upgrade) {
          await call(() => api.equip({ itemId: upgrade.id }));
          break;
        }
        const d = await api.debugDungeon();
        const level = c.level;
        const low = hpRate() < 0.5;
        if (low && state.canHeal) {
          await call(() => api.heal());
          break;
        }
        // 目的地：弱っていたら上り階段（1F は入口）、ボスに挑めるならボス、深く行けるなら下り階段、そうでなければ上と下を行き来する
        let target: { x: number; y: number };
        let goBoss = false;
        if (low) {
          target = d.up;
        } else if (d.boss && level >= 9) {
          target = d.boss;
          goBoss = true;
        } else if (d.down && d.floor < maxFloor(level)) {
          target = d.down;
        } else {
          // 戦って育つために、上り階段ともう一方（下り階段。5F は遠いマス）の間を行き来する
          const other = d.down ?? farthest(d);
          if (roam === 'down' && same(d.player, other)) roam = 'up';
          else if (roam === 'up' && same(d.player, d.up)) roam = 'down';
          target = roam === 'down' ? other : d.up;
        }
        if (same(d.player, target)) {
          // 着いた：弱っていれば上る（1F は宿屋へ）、深く行けるなら降りる
          if (low) await call(() => (d.floor === 1 ? api.returnToInn() : api.stairs({ direction: 'up' })));
          else await call(() => api.stairs({ direction: 'down' }));
          break;
        }
        const dir = firstStep(d, target, goBoss ? null : d.boss);
        if (!dir) throw new Error('自動プレイヤー：道が見つからない');
        const turn = turnTo(d.player.facing, dir);
        await call(() => api.move({ action: turn ?? 'forward' }));
        break;
      }
    }
  }
  return { ...result, final: state };
}

const same = (a: { x: number; y: number }, b: { x: number; y: number }) => a.x === b.x && a.y === b.y;

/** 上り階段からいちばん遠い、ボスでないマス（5F で行き来するときの目的地） */
function farthest(d: DebugDungeon): { x: number; y: number } {
  // 5F は下り階段がないので、上り階段の対角に近い、行けるマスを選ぶ
  const x = 9 - d.up.x;
  const y = 9 - d.up.y;
  if (d.boss && d.boss.x === x && d.boss.y === y) return { x: d.up.x === 0 ? 8 : 1, y };
  return { x, y };
}
