import { describe, expect, test } from 'vitest';
import { toGameView } from '../../src/api/game-view';
import { sceneBgm } from '../../src/logic/bgm-scene';
import { makeState } from '../helpers/fixtures';
import { battleState, openMap } from '../helpers/maps';

const view = (s: Parameters<typeof toGameView>[0]) => toGameView(s);
const inn = view(makeState('INN'));
const dungeon = view(makeState('DUNGEON', { dungeon: openMap() }));
const battle = view(battleState('goblin', 10));
const boss = view(battleState('necromancer', 10));
const swap = view(makeState('SWAP', { dungeon: openMap() }));
const swapAfterBoss = view(makeState('SWAP', { dungeon: null }));
const cleared = view(makeState('CLEARED', { dungeon: null }));

describe('場面と曲', () => {
  test('TC-0034-01 / と /new はタイトル、/inn は宿屋、/dungeon・/swap（ダンジョンあり）はダンジョン、/battle は戦闘、ボス戦はボスの曲', () => {
    expect(sceneBgm('/', null, null)).toBe('title');
    expect(sceneBgm('/new', null, null)).toBe('title');
    expect(sceneBgm('/inn', inn, null)).toBe('inn');
    expect(sceneBgm('/dungeon', dungeon, null)).toBe('dungeon');
    expect(sceneBgm('/swap', swap, null)).toBe('dungeon');
    expect(sceneBgm('/battle', battle, null)).toBe('battle');
    expect(sceneBgm('/battle', null, null)).toBe('battle');
    expect(sceneBgm('/battle', boss, null)).toBe('boss');
    // 勝利のメッセージを出しているあいだ（状態はダンジョン・画面は戦闘）は戦闘の曲のまま
    expect(sceneBgm('/battle', dungeon, null)).toBe('battle');
    expect(sceneBgm(null, null, null)).toBeNull();
    expect(sceneBgm('/nothing', inn, null)).toBeNull();
  });

  test('TC-0034-05 /clear と、場所が CLEARED のときは、どのパスでも null', () => {
    expect(sceneBgm('/clear', cleared, null)).toBeNull();
    expect(sceneBgm('/clear', null, null)).toBeNull();
    for (const path of ['/', '/inn', '/dungeon', '/battle', '/swap']) expect(sceneBgm(path, cleared, null), path).toBeNull();
  });

  test('TC-0034-12 ボスの出現・撃破の演出のあいだは、パスによらず null。ほかの演出では止めない', () => {
    for (const path of ['/', '/inn', '/dungeon', '/battle']) {
      expect(sceneBgm(path, boss, { effect: 'bossAppear' }), path).toBeNull();
      expect(sceneBgm(path, boss, { effect: 'bossDefeat' }), path).toBeNull();
    }
    expect(sceneBgm('/battle', battle, { effect: 'levelUp' })).toBe('battle');
    expect(sceneBgm('/dungeon', dungeon, { effect: 'rareDrop' })).toBe('dungeon');
  });

  test('TC-0034-14 場所が SWAP でダンジョンがない（ボスのあとの入れ替え）ときは null、ダンジョンがあるときは /swap でダンジョンの曲', () => {
    expect(sceneBgm('/swap', swapAfterBoss, null)).toBeNull();
    expect(sceneBgm('/battle', swapAfterBoss, null)).toBeNull();
    expect(sceneBgm('/swap', swap, null)).toBe('dungeon');
  });
});
