import { describe, expect, test } from 'vitest';
import { continueToInn, createCharacter, expForLevel, gainExp, isValidName, levelUp, rest, validateName } from '../../src/domain/character';
import { noRng } from '../helpers/maps';
import { InvalidStateError, ValidationError } from '../../src/domain/errors';
import { SeededRng, SequenceRng } from '../../src/domain/rng';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeItem, makeState } from '../helpers/fixtures';
import { recordingRng } from '../helpers/rng';

/** validateName が投げた ValidationError の文言を取り出す。通れば null */
function nameError(raw: string): string | null {
  try {
    validateName(raw);
    return null;
  } catch (e) {
    expect(e).toBeInstanceOf(ValidationError);
    const err = e as ValidationError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('validation_error');
    expect(err.message).toBe('入力が正しくありません');
    expect(err.details).toHaveLength(1);
    expect(err.details[0].field).toBe('name');
    return err.details[0].message;
  }
}

describe('名前を付けてキャラクターを作る', () => {
  test('TC-0007-01 前後の空白を除いた名前で、初期値・宿屋・空の所持品・初期実績のキャラクターを作る。乱数を引かない', () => {
    const rng = new SequenceRng([]);
    const s = createCharacter(' ゆうしゃ　');
    expect(s).toEqual({
      name: 'ゆうしゃ',
      level: 1,
      exp: 0,
      hp: 30,
      maxHp: 30,
      mp: 10,
      maxMp: 10,
      attack: 5,
      defense: 5,
      speed: 5,
      location: 'INN',
      dungeon: null,
      battle: null,
      inventory: { equipped: { weapon: null, armor: null, shield: null, accessory: null }, items: [], nextId: 1, pending: null },
      records: { battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 0 },
      // 最後に使ったスロットはない（v1.14）
      saveSlot: null,
    });
    // createCharacter は乱数を受け取らない。空の SequenceRng が手つかずのまま
    rng.assertExhausted();
  });

  test('TC-0007-02 validateName が仕様書 §2.1 の入力例の表どおりに返す', () => {
    for (const raw of ['', '   ', '　　']) expect(nameError(raw)).toBe('名前を入力してください');
    expect(nameError('ゆうしゃアルド12')).toBe('名前は1〜8文字で入力してください');
    for (const raw of ['ゆうしゃ😀', 'a<b', 'a\nb', 'a\u0007b']) expect(nameError(raw)).toBe('つかえない もじが ふくまれています');
    for (const raw of ['あ', 'ゆうしゃアルド1', 'Al do', 'ゆう　しゃ', 'ルー・Ａ１勇']) {
      expect(nameError(raw)).toBeNull();
      expect(isValidName(raw)).toBe(true);
    }
    // 途中の空白はそのまま、前後の空白は除く
    expect(validateName('Al do')).toBe('Al do');
    expect(validateName('ゆう　しゃ')).toBe('ゆう　しゃ');
    expect(validateName(' ゆうしゃ　')).toBe('ゆうしゃ');
    expect(isValidName('a<b')).toBe(false);
  });

  test('TC-0007-04 「𠮷」8 文字（16 コード単位）は作成でき、9 文字は文字数の違反', () => {
    const eight = '𠮷'.repeat(8);
    expect(eight.length).toBe(16);
    expect(createCharacter(eight).name).toBe(eight);
    expect(nameError('𠮷'.repeat(9))).toBe('名前は1〜8文字で入力してください');
    expect(() => createCharacter('𠮷'.repeat(9))).toThrow(ValidationError);
  });
});

describe('宿屋で休む', () => {
  test('TC-0008-04 rest はレベル・経験値・能力値・所持品・実績を変えず、乱数を引かない。3 回続けても通り、INN 以外では 409', () => {
    const before = deepFreeze(makeState('INN', {
      level: 3,
      exp: 80,
      hp: 10,
      maxHp: 46,
      mp: 1,
      maxMp: 13,
      attack: 8,
      defense: 7,
      speed: 6,
      records: { battles: 4, kills: 3, deaths: 1, laps: 1, bossKills: 0 },
      inventory: {
        equipped: { weapon: makeItem(1, 'weapon1', 'N', 2), armor: null, shield: null, accessory: makeItem(2, 'accessory1', 'R', 7) },
        items: [makeItem(3, 'armor1', 'N', 1)],
        nextId: 4,
        pending: null,
      },
    }));
    const rng = new SequenceRng([]);
    let s = before;
    for (let i = 0; i < 3; i += 1) {
      const r = rest(s, rng);
      expect(r.messages).toEqual([{ text: 'HP と MP が かいふくした', tone: 'success' }]);
      s = r.state;
    }
    rng.assertExhausted();
    // HP・MP だけが変わる（装備込みの最大値まで。さいだいHP +7 → 53）
    expect(s).toEqual({ ...before, hp: 53, mp: 13 });

    for (const location of ['DUNGEON', 'BATTLE', 'SWAP', 'CLEARED'] as const) {
      const other = deepFreeze(makeState(location));
      expect(() => rest(other, rng)).toThrow(InvalidStateError);
      try {
        rest(other, rng);
      } catch (e) {
        const err = e as InvalidStateError;
        expect(err.status).toBe(409);
        expect(err.code).toBe('invalid_state');
        expect(err.message).toBe('その操作は いまは できない');
      }
    }
  });
});

// 確認 ID のない、ルールの数値の例（仕様書 §2.3、§9.3、TD-0002 §1.3）
describe('経験値とレベルアップ・周回', () => {
  test('必要経験値は 12 × n × (n − 1)', () => {
    const table: [number, number][] = [[2, 24], [3, 72], [4, 144], [5, 240], [10, 1080], [12, 1584], [13, 1872], [15, 2520], [16, 2880], [100, 118800]];
    for (const [n, exp] of table) expect(expForLevel(n)).toBe(exp);
  });

  test('Lv1・経験値 72 で levelUp すると Lv3。成長が最小なら最大 HP 46、乱数 10 個・メッセージ 4 行', () => {
    const before = deepFreeze(makeState('BATTLE', { exp: 72 }));
    const rng = new SequenceRng([8, 2, 1, 1, 1, 8, 2, 1, 1, 1]);
    const r = levelUp(before, rng);
    rng.assertExhausted();
    expect(r.state).toMatchObject({ level: 3, exp: 72, maxHp: 46, hp: 46, maxMp: 14, mp: 14, attack: 7, defense: 7, speed: 7 });
    expect(r.messages).toEqual([
      { text: 'レベルが あがった！ Lv2', tone: 'success', effect: 'levelUp' },
      { text: 'HP +8 MP +2 こうげき +1 ぼうぎょ +1 すばやさ +1', tone: 'success' },
      { text: 'レベルが あがった！ Lv3', tone: 'success', effect: 'levelUp' },
      { text: 'HP +8 MP +2 こうげき +1 ぼうぎょ +1 すばやさ +1', tone: 'success' },
    ]);
  });

  test('レベルアップで全回復しない（今の HP・MP は増えた分だけ増える）。上がらなければ乱数を引かない', () => {
    const hurt = deepFreeze(makeState('BATTLE', { hp: 5, mp: 0, exp: 24 }));
    const r = levelUp(hurt, new SequenceRng([12, 4, 2, 2, 2]));
    expect(r.state).toMatchObject({ level: 2, hp: 17, maxHp: 42, mp: 4, maxMp: 14 });
    const none = new SequenceRng([]);
    expect(levelUp(deepFreeze({ ...hurt, exp: 23 }), none).messages).toEqual([]);
    none.assertExhausted();
  });

  test('continueToInn は CLEARED → INN（HP・MP・実績は変えない）。ほかの場所では 409', () => {
    const cleared = deepFreeze(makeState('CLEARED', { hp: 10, mp: 1, records: { battles: 1, kills: 1, deaths: 0, laps: 2, bossKills: 1 } }));
    const r = continueToInn(cleared);
    expect(r.state).toEqual({ ...cleared, location: 'INN' });
    expect(r.messages).toEqual([{ text: 'ゆうしゃは 宿屋に もどった', tone: 'normal' }]);
    expect(() => continueToInn(r.state)).toThrow(InvalidStateError);
  });
});

describe('宿屋で休む（装備込み）', () => {
  test('TC-0008-02 やすむと HP・MP が装備込みの最大になる（さいだいHP +7 で 46 → HP 10 が 53）。最大でも実行でき、1 行', () => {
    const life = makeItem(1, 'accessory1', 'R', 7); // ライフアミュレット［R］（v1.21）
    const inventory = { equipped: { weapon: null, armor: null, shield: null, accessory: life }, items: [], nextId: 2, pending: null };
    const s = deepFreeze(makeState('INN', { level: 3, exp: 72, hp: 10, maxHp: 46, mp: 1, maxMp: 16, inventory }));
    const r = rest(s, new SequenceRng([]));
    expect(r.state).toMatchObject({ hp: 53, mp: 16, maxHp: 46 });
    expect(r.messages).toEqual([{ text: 'HP と MP が かいふくした', tone: 'success' }]);
    const again = rest(deepFreeze(r.state), new SequenceRng([]));
    expect(again.state).toMatchObject({ hp: 53, mp: 16 });
    expect(again.messages).toHaveLength(1);
  });

  test('TC-0008-06 rest は全回復してからレベルを上げる（経験値 72 で Lv3・HP 46 の満タン、メッセージは回復 → 4 行）。経験値 23 なら乱数を引かない', () => {
    const inventory = { equipped: { weapon: makeItem(1, 'weapon1', 'N', 2), armor: null, shield: null, accessory: null }, items: [makeItem(2, 'armor1', 'N', 1)], nextId: 3, pending: null };
    const records = { battles: 9, kills: 8, deaths: 1, laps: 1, bossKills: 0 };
    const s = deepFreeze(makeState('INN', { exp: 72, hp: 10, mp: 2, inventory, records }));
    const rng = new SequenceRng([8, 2, 1, 1, 1, 8, 2, 1, 1, 1]);
    const r = rest(s, rng);
    rng.assertExhausted();
    expect(r.state).toEqual({ ...s, level: 3, maxHp: 46, hp: 46, maxMp: 14, mp: 14, attack: 7, defense: 7, speed: 7 });
    expect(r.messages.map((m) => m.text)).toEqual([
      'HP と MP が かいふくした',
      'レベルが あがった！ Lv2', 'HP +8 MP +2 こうげき +1 ぼうぎょ +1 すばやさ +1',
      'レベルが あがった！ Lv3', 'HP +8 MP +2 こうげき +1 ぼうぎょ +1 すばやさ +1',
    ]);
    // 経験値 23 では上がらない。乱数を引くと例外になる Rng で、1 個も引かないことを確かめる
    const low = deepFreeze(makeState('INN', { exp: 23, hp: 10, inventory, records }));
    const r2 = rest(low, noRng());
    expect(r2.state).toEqual({ ...low, hp: 30, mp: 10 });
    expect(r2.messages).toHaveLength(1);
  });
});

describe('経験値を得て強くなる', () => {
  const growthLine = (a: number, b: number, c: number, d: number, e: number) => `HP +${a} MP +${b} こうげき +${c} ぼうぎょ +${d} すばやさ +${e}`;

  test('TC-0022-02 expForLevel：Lv2 24、Lv3 72、Lv4 144、Lv5 240、Lv10 1080、Lv100 118800', () => {
    expect([2, 3, 4, 5, 10, 100].map(expForLevel)).toEqual([24, 72, 144, 240, 1080, 118800]);
  });

  test('TC-0022-03 経験値 23 の levelUp は Lv1 のまま（乱数 0 個・0 行）。24 で Lv2 になり、乱数をちょうど 5 個引く。gainExp は経験値だけを足す', () => {
    const none = recordingRng();
    const r1 = levelUp(deepFreeze(makeState('DUNGEON', { exp: 23 })), none);
    expect(r1.state.level).toBe(1);
    expect(none.calls).toHaveLength(0);
    expect(r1.messages).toEqual([]);
    const five = recordingRng();
    expect(levelUp(deepFreeze(makeState('DUNGEON', { exp: 24 })), five).state.level).toBe(2);
    expect(five.calls.map(({ min, max }) => [min, max])).toEqual([[8, 12], [2, 4], [1, 2], [1, 2], [1, 2]]);
    // gainExp：経験値だけを足す（レベル・ほかの値は同じ。乱数を受け取らず、メッセージも返さない）
    const before = deepFreeze(makeState('DUNGEON'));
    expect(gainExp(before, 24)).toEqual({ ...before, exp: 24 });
  });

  test('TC-0022-04 経験値 72 の levelUp で Lv3・4 行。成長が最小（8,2,1,1,1 × 2）なら最大 HP 46', () => {
    const r = levelUp(deepFreeze(makeState('DUNGEON', { exp: 72 })), new SequenceRng([8, 2, 1, 1, 1, 8, 2, 1, 1, 1]));
    expect(r.state).toMatchObject({ level: 3, maxHp: 46 });
    expect(r.messages.map((m) => m.text)).toEqual(['レベルが あがった！ Lv2', growthLine(8, 2, 1, 1, 1), 'レベルが あがった！ Lv3', growthLine(8, 2, 1, 1, 1)]);
  });

  test('TC-0022-05 成長は 最大HP → 最大MP → こうげき → ぼうぎょ → すばやさ の順に引く', () => {
    const r = levelUp(deepFreeze(makeState('DUNGEON', { exp: 24 })), new SequenceRng([12, 4, 2, 1, 2]));
    expect(r.state).toMatchObject({ maxHp: 42, maxMp: 14, attack: 7, defense: 6, speed: 7 });
    expect(r.messages[1].text).toBe(growthLine(12, 4, 2, 1, 2));
  });

  test('TC-0022-06 HP 20/30・MP 5/10 で Lv2（成長 8,2,1,1,1）なら HP 28/38・MP 7/12（全回復しない）', () => {
    const r = levelUp(deepFreeze(makeState('DUNGEON', { hp: 20, mp: 5, exp: 24 })), new SequenceRng([8, 2, 1, 1, 1]));
    expect(r.state).toMatchObject({ hp: 28, maxHp: 38, mp: 7, maxMp: 12 });
  });

  test('TC-0022-07 10,000 回レベルアップすると、成長値はすべて範囲内で、両端が 1 回以上出る', () => {
    const rng = new SeededRng(2026);
    type Grown = 'maxHp' | 'maxMp' | 'attack' | 'defense' | 'speed';
    const seen: Record<Grown, Set<number>> = { maxHp: new Set(), maxMp: new Set(), attack: new Set(), defense: new Set(), speed: new Set() };
    let state = makeState('DUNGEON');
    for (let i = 0; i < 10_000; i += 1) {
      const before = state;
      state = levelUp(gainExp(before, expForLevel(before.level + 1) - before.exp), rng).state;
      for (const k of Object.keys(seen) as Grown[]) seen[k].add(state[k] - before[k]);
    }
    expect([...seen.maxHp].sort((a, b) => a - b)).toEqual([8, 9, 10, 11, 12]);
    expect([...seen.maxMp].sort((a, b) => a - b)).toEqual([2, 3, 4]);
    for (const k of ['attack', 'defense', 'speed'] as const) expect([...seen[k]].sort((a, b) => a - b)).toEqual([1, 2]);
  });
});
