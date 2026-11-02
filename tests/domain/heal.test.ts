import { describe, expect, test } from 'vitest';
import { toGameView } from '../../src/api/game-view';
import { castHeal, fieldHeal } from '../../src/domain/heal';
import { InvalidStateError } from '../../src/domain/errors';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeState } from '../helpers/fixtures';
import { dungeonState, openMap } from '../helpers/maps';

/** Lv3・最大 HP 46・最大 MP 16 のキャラクター */
const lv3 = { level: 3, exp: 72, maxHp: 46, maxMp: 16 };

describe('ヒールで回復する', () => {
  test('TC-0021-01 castHeal：30 まで回復・頭打ち・最大でも MP は減る・MP 3 ちょうどで使える。乱数を引かない', () => {
    const heal = (hp: number, mp: number) => castHeal(deepFreeze(makeState('DUNGEON', { ...lv3, hp, mp })), 46);
    const a = heal(10, 10);
    expect(a.state).toMatchObject({ hp: 40, mp: 7 });
    expect(a.message).toEqual({ text: 'ゆうしゃは ヒールを となえた！ HP が 30 かいふくした', tone: 'success' });
    const b = heal(36, 10);
    expect(b.state.hp).toBe(46);
    expect(b.message.text).toBe('ゆうしゃは ヒールを となえた！ HP が 10 かいふくした');
    const c = heal(46, 10);
    expect(c.state).toMatchObject({ hp: 46, mp: 7 });
    expect(c.message.text).toBe('ゆうしゃは ヒールを となえた！ HP が 0 かいふくした');
    expect(heal(10, 3).state.mp).toBe(0);
  });

  test('TC-0021-05 fieldHeal は DUNGEON だけ。位置・向き・踏破記録・実績は変わらない。canHeal は DUNGEON かつ MP ≧ 3', () => {
    for (const location of ['INN', 'BATTLE', 'SWAP', 'CLEARED'] as const) {
      const s = deepFreeze(makeState(location, { ...lv3, hp: 10 }));
      expect(() => fieldHeal(s)).toThrow(InvalidStateError);
      expect(() => fieldHeal(s)).toThrow('その操作は いまは できない');
    }
    const start = deepFreeze(dungeonState(openMap({ x: 3, y: 4, facing: 'E' }), { ...lv3, hp: 10, mp: 10, records: { battles: 3, kills: 2, deaths: 0, laps: 1, bossKills: 0 } }));
    const r = fieldHeal(start);
    expect(r.state).toMatchObject({ hp: 40, mp: 7 });
    expect(r.state.dungeon).toEqual(start.dungeon);
    expect(r.state.records).toEqual(start.records);
    expect(r.messages).toEqual([{ text: 'ゆうしゃは ヒールを となえた！ HP が 30 かいふくした', tone: 'success' }]);
    expect(() => fieldHeal(deepFreeze(dungeonState(openMap(), { mp: 2 })))).toThrow('MP が たりない');

    expect(toGameView(dungeonState(openMap(), { mp: 3 })).canHeal).toBe(true);
    expect(toGameView(dungeonState(openMap(), { mp: 2 })).canHeal).toBe(false);
    for (const location of ['INN', 'BATTLE', 'SWAP', 'CLEARED'] as const) expect(toGameView(makeState(location, { mp: 10 })).canHeal).toBe(false);
  });
});
