// 装備画面の「のうりょく」（仕様書 §8.7「装備画面」）。画面層で計算してよい例外は、この変化の足し算だけ（TD-0001）
import type { ItemView, Stats, StatKey } from '../api/types';
import { STAT_NAMES, STAT_ORDER } from './item-text';

type Bonus = Pick<ItemView, 'stats' | 'value'>;

const pad3 = (n: number) => String(n).padStart(3, ' ');

/**
 * 付け替えたあとの実効値：今の実効値から今の枠の個体の value を（その stats すべてで）引き、候補の value を足す。
 * 「はずす」は candidate なし（引くだけ）
 */
export function statDiff(effective: Stats, current: Bonus | null, candidate: Bonus | null): Stats {
  const after = { ...effective };
  if (current) for (const s of current.stats) after[s] -= current.value;
  if (candidate) for (const s of candidate.stats) after[s] += candidate.value;
  return after;
}

/** 「 30 =  18 + 12」（実効値と基礎値は 3 桁右詰め、補正は詰めない） */
export function breakdownText(effective: number, base: number, bonus: number): string {
  return `${pad3(effective)} = ${pad3(base)} + ${bonus}`;
}

/** 「 23 →  28 ↑」／「…↓」 */
export function diffText(now: number, after: number): string {
  return `${pad3(now)} → ${pad3(after)} ${after > now ? '↑' : '↓'}`;
}

export interface AbilityRow {
  stat: StatKey;
  name: string;
  text: string;
  change: 'up' | 'down' | null;
  /** 読み上げ（変わるときだけ「23 から 28、あがる」） */
  spoken: string;
}

/**
 * のうりょくの 5 行。preview が null（「もどる」・枠の一覧）なら内訳だけ。
 * preview があれば、値が変わる能力だけ変化の形にする
 */
export function abilityRows(
  c: { effective: Stats; base: Stats; bonus: Stats },
  preview: { current: Bonus | null; candidate: Bonus | null } | null,
): AbilityRow[] {
  const after = preview ? statDiff(c.effective, preview.current, preview.candidate) : c.effective;
  return STAT_ORDER.map((stat) => {
    const now = c.effective[stat];
    const next = after[stat];
    const name = STAT_NAMES[stat];
    if (next === now) {
      const text = breakdownText(now, c.base[stat], c.bonus[stat]);
      return { stat, name, text, change: null, spoken: `${name} ${now}` };
    }
    const up = next > now;
    return { stat, name, text: diffText(now, next), change: up ? 'up' : 'down', spoken: `${name} ${now} から ${next}、${up ? 'あがる' : 'さがる'}` };
  });
}
