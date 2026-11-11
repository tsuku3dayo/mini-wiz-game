// キャラクター：名前・作成・経験値とレベルアップ・やすむ・周回（仕様書 §2、§7.2、§9.3）
import { EXP_FACTOR, GROWTH, INITIAL_STATS, NAME_MAX_LENGTH } from './constants';
import { effectiveStats } from './equipment';
import { ValidationError } from './errors';
import { assertLocation, type GameStateData, type Message, type StepResult } from './game-state';
import { emptyInventory } from './loot';
import { initialRecords } from './records';
import type { Rng } from './rng';

// \u3000 は全角空白
const NAME_PATTERN = /^[\p{L}\p{N}ー・](?:[\p{L}\p{N}ー・ \u3000]*[\p{L}\p{N}ー・])?$/u;

/** NFC に正規化し、前後の空白（半角の空白文字類と全角空白）を取り除く */
export function normalizeName(raw: string): string {
  return raw.normalize('NFC').replace(/^[\s\u3000]+|[\s\u3000]+$/gu, '');
}

/** 名前の検査（仕様書 §2.1 の表の順）。正規化後の名前を返す。違反は ValidationError */
export function validateName(raw: string): string {
  const name = normalizeName(raw);
  const length = [...name].length; // コードポイント数（サロゲートペアは 1 文字）
  let message: string | null = null;
  if (length === 0) message = '名前を入力してください';
  else if (length > NAME_MAX_LENGTH) message = '名前は1〜8文字で入力してください';
  else if (!NAME_PATTERN.test(name)) message = 'つかえない もじが ふくまれています';
  if (message !== null) throw new ValidationError([{ field: 'name', message }]);
  return name;
}

export function isValidName(raw: string): boolean {
  try {
    validateName(raw);
    return true;
  } catch {
    return false;
  }
}

/** 初期能力値・宿屋・空の所持品・初期実績で作る。乱数を使わない */
export function createCharacter(name: string): GameStateData {
  const s = INITIAL_STATS;
  return {
    name: validateName(name),
    level: s.level,
    exp: s.exp,
    hp: s.maxHp,
    maxHp: s.maxHp,
    mp: s.maxMp,
    maxMp: s.maxMp,
    attack: s.attack,
    defense: s.defense,
    speed: s.speed,
    location: 'INN',
    dungeon: null,
    battle: null,
    inventory: emptyInventory(),
    records: initialRecords(),
    saveSlot: null,
  };
}

/** Lv n に到達するための累計経験値 */
export function expForLevel(n: number): number {
  return EXP_FACTOR * n * (n - 1);
}

/** 経験値を加えるだけ（勝利のとき）。レベルは上がらない。乱数・メッセージなし（v1.14） */
export function gainExp(state: GameStateData, gained: number): GameStateData {
  return { ...state, exp: state.exp + gained };
}

/**
 * たまった経験値で、届いた分だけレベルを上げる（宿屋の やすむ でだけ呼ぶ。v1.14）。
 * 1 レベルにつき乱数を 5 個（最大HP → 最大MP → こうげき → ぼうぎょ → すばやさ）。上がらなければ引かない
 */
export function levelUp(state: GameStateData, rng: Rng): StepResult {
  let next: GameStateData = state;
  const messages: Message[] = [];
  while (next.exp >= expForLevel(next.level + 1)) {
    const g = {
      maxHp: rng.int(...GROWTH.maxHp),
      maxMp: rng.int(...GROWTH.maxMp),
      attack: rng.int(...GROWTH.attack),
      defense: rng.int(...GROWTH.defense),
      speed: rng.int(...GROWTH.speed),
    };
    // 全回復しない。今の HP・MP は増えた最大値の分だけ増える
    next = {
      ...next,
      level: next.level + 1,
      maxHp: next.maxHp + g.maxHp,
      hp: next.hp + g.maxHp,
      maxMp: next.maxMp + g.maxMp,
      mp: next.mp + g.maxMp,
      attack: next.attack + g.attack,
      defense: next.defense + g.defense,
      speed: next.speed + g.speed,
    };
    messages.push(
      { text: `レベルが あがった！ Lv${next.level}`, tone: 'success', effect: 'levelUp' },
      {
        text: `HP +${g.maxHp} MP +${g.maxMp} こうげき +${g.attack} ぼうぎょ +${g.defense} すばやさ +${g.speed}`,
        tone: 'success',
      },
    );
  }
  return { state: next, messages };
}

/** 宿屋の「やすむ」：HP・MP を装備込みの最大値まで回復し、たまった経験値でレベルを上げる（§7.2。v1.14）。INN のみ */
export function rest(state: GameStateData, rng: Rng): StepResult {
  assertLocation(state, 'INN');
  const eff = effectiveStats(state);
  const grown = levelUp({ ...state, hp: eff.maxHp, mp: eff.maxMp }, rng);
  return {
    state: grown.state,
    messages: [{ text: 'HP と MP が かいふくした', tone: 'success' }, ...grown.messages],
  };
}

/** 周回：クリア画面から宿屋へ。HP・MP は回復しない。CLEARED のみ */
export function continueToInn(state: GameStateData): StepResult {
  assertLocation(state, 'CLEARED');
  return {
    state: { ...state, location: 'INN', dungeon: null, battle: null },
    messages: [{ text: `${state.name}は 宿屋に もどった`, tone: 'normal' }],
  };
}
