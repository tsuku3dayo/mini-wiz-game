import { describe, expect, test } from 'vitest';
import { applyExp, continueToInn, createCharacter, expForLevel, isValidName, rest, validateName } from '../../src/domain/character';
import { InvalidStateError, ValidationError } from '../../src/domain/errors';
import { SequenceRng } from '../../src/domain/rng';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeItem, makeState } from '../helpers/fixtures';

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
        equipped: { weapon: makeItem(1, 'weapon1', 'N', 2), armor: null, shield: null, accessory: makeItem(2, 'accessory4', 'R', 15) },
        items: [makeItem(3, 'armor1', 'N', 1)],
        nextId: 4,
        pending: null,
      },
    }));
    const rng = new SequenceRng([]);
    let s = before;
    for (let i = 0; i < 3; i += 1) {
      const r = rest(s);
      expect(r.messages).toEqual([{ text: 'HP と MP が かいふくした', tone: 'success' }]);
      s = r.state;
    }
    rng.assertExhausted();
    // HP・MP だけが変わる（装備込みの最大値まで。さいだいHP +15 → 61）
    expect(s).toEqual({ ...before, hp: 61, mp: 13 });

    for (const location of ['DUNGEON', 'BATTLE', 'SWAP', 'CLEARED'] as const) {
      const other = deepFreeze(makeState(location));
      expect(() => rest(other)).toThrow(InvalidStateError);
      try {
        rest(other);
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

  test('Lv1・経験値 0 に 72 を加えると Lv3。成長が最小なら最大 HP 46、乱数 10 個・メッセージ 4 行', () => {
    const before = deepFreeze(makeState('BATTLE'));
    const rng = new SequenceRng([8, 2, 1, 1, 1, 8, 2, 1, 1, 1]);
    const r = applyExp(before, 72, rng);
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
    const hurt = deepFreeze(makeState('BATTLE', { hp: 5, mp: 0, exp: 20 }));
    const r = applyExp(hurt, 4, new SequenceRng([12, 4, 2, 2, 2]));
    expect(r.state).toMatchObject({ level: 2, hp: 17, maxHp: 42, mp: 4, maxMp: 14 });
    const none = new SequenceRng([]);
    expect(applyExp(hurt, 3, none).messages).toEqual([]);
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
