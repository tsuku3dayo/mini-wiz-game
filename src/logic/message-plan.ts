// メッセージキューの決まり（仕様書 §11.8）：演出の長さ・遷移の保留の件数・持つ行の数
import type { Message, MessageEffect, Rarity } from '../api/types';

/** 持つ行の数。メッセージ欄は、このうち最新の 5／6／7 行を出す（TD-0003 §3） */
export const MAX_LINES = 7;
/** 演出のない行のあと、次の行を出すまでの待ち */
export const LINE_INTERVAL_MS = 400;
/** 応答待ちの ▼ を出すまでの時間 */
export const WAITING_MARK_MS = 300;

/**
 * 演出の長さ（仕様書 §11.8）。rareDrop の LG だけは RARE_DROP_LG_MS。
 * v1.10 で levelUp・bossAppear・bossDefeat・clear を効果音の長さ（audio/sound.ts の SFX_MS）に合わせた（効果音が鳴り切るように）
 */
export const EFFECT_MS: Readonly<Record<MessageEffect, number>> = {
  levelUp: 1071,
  rareDrop: 800,
  bossAppear: 2906,
  bossDefeat: 1000,
  clear: 5833,
};
export const RARE_DROP_LG_MS = 1200;

/**
 * 遭遇の入力止め（仕様書 v1.17 §11.8 の 7）：遭遇した時点から、操作もスキップも受け付けない長さ。
 * 通常の敵は遭遇の音 encounter の長さ（audio/sound.ts の SFX_MS.encounter。logic から audio は読めないので数値で書き、
 * 同じことを tests/audio/sound.test.ts で確かめる）、ボスはボス出現の演出の長さ
 */
export const ENCOUNTER_LOCK_MS = { normal: 510, boss: EFFECT_MS.bossAppear } as const;

/** 遭遇の入力止めの長さ */
export function encounterLockMs(isBoss: boolean): number {
  return isBoss ? ENCOUNTER_LOCK_MS.boss : ENCOUNTER_LOCK_MS.normal;
}

/** 演出の長さ。rareDrop は LG だけ 1200ms */
export function effectDuration(effect: MessageEffect, rarity?: Rarity): number {
  if (effect === 'rareDrop' && rarity === 'LG') return RARE_DROP_LG_MS;
  return EFFECT_MS[effect];
}

/** その行を出したあと、次の行（または演出の終わり）までの待ち */
export function waitAfter(line: Pick<Message, 'effect' | 'rarity'>): number {
  return line.effect ? effectDuration(line.effect, line.rarity) : LINE_INTERVAL_MS;
}

type PlanLine = Pick<Message, 'effect' | 'rarity'>;

/** ふつうの計画：行を 1 つずつ出し、出したあとの待ち（演出のない行は 400ms、演出のある行はその長さ） */
export function planSteps<T extends PlanLine>(lines: readonly T[]): { line: T; wait: number }[] {
  return lines.map((line) => ({ line, wait: waitAfter(line) }));
}

/**
 * 動きを減らす設定の計画：行をすべて一度に出し、立てる演出は最後の 1 つだけ（色の強調用）。
 * 待ちはその演出の長さ（演出がなければ 0）。遷移の保留はしない
 */
export function planReduced<T extends PlanLine>(lines: readonly T[]): { show: T[]; effectLine: T | null; wait: number; hold: 0 } {
  const effectLine = [...lines].reverse().find((l) => l.effect) ?? null;
  return { show: [...lines], effectLine, wait: effectLine ? waitAfter(effectLine) : 0, hold: 0 };
}

/** 行を足し、最新 MAX_LINES 行だけを残す（古い行から消える） */
export function appendLines<T>(lines: readonly T[], added: readonly T[]): T[] {
  return [...lines, ...added].slice(-MAX_LINES);
}

/**
 * 遷移を保留する件数（1 件目をすぐ出す分を差し引く前）：
 * danger の行があれば最後の danger の行まで。なければ、末尾に続く clear の行を除いた件数。
 * 足元の案内（afterNavigation）は数えない（呼び出し側が渡さない）
 */
export function holdCount(messages: readonly Pick<Message, 'tone' | 'effect'>[]): number {
  let lastDanger = -1;
  messages.forEach((m, i) => {
    if (m.tone === 'danger') lastDanger = i;
  });
  if (lastDanger >= 0) return lastDanger + 1;
  let n = messages.length;
  while (n > 0 && messages[n - 1].effect === 'clear') n -= 1;
  return n;
}
