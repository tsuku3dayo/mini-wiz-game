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
  test('TC-0034-01 /・/new・/credits はタイトル、/inn は宿屋、/dungeon・/swap（ダンジョンあり）はダンジョン、/battle は戦闘、ボス戦はボスの曲', () => {
    expect(sceneBgm('/', null, null)).toBe('title');
    expect(sceneBgm('/new', null, null)).toBe('title');
    expect(sceneBgm('/credits', null, null)).toBe('title');
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

  test('TC-0034-05 場所が CLEARED のときは、どのパスでも（/clear でも）クリアの曲。状態がない /clear は null', () => {
    expect(sceneBgm('/clear', cleared, null)).toBe('clear');
    expect(sceneBgm('/clear', null, null)).toBeNull();
    for (const path of ['/', '/inn', '/dungeon', '/battle', '/swap']) expect(sceneBgm(path, cleared, null), path).toBe('clear');
  });

  test('TC-0034-12 ボスの出現・撃破の演出のあいだは、パスによらず null。ほかの演出では止めない', () => {
    for (const path of ['/', '/inn', '/dungeon', '/battle']) {
      expect(sceneBgm(path, boss, { effect: 'bossAppear' }), path).toBeNull();
      expect(sceneBgm(path, boss, { effect: 'bossDefeat' }), path).toBeNull();
    }
    expect(sceneBgm('/battle', battle, { effect: 'levelUp' })).toBe('battle');
    expect(sceneBgm('/dungeon', dungeon, { effect: 'rareDrop' })).toBe('dungeon');
  });

  test('TC-0034-14 場所が SWAP でダンジョンがない（ボスのあとの入れ替え）ときはクリアの曲、ダンジョンがあるときは /swap でダンジョンの曲', () => {
    expect(sceneBgm('/swap', swapAfterBoss, null)).toBe('clear');
    expect(sceneBgm('/battle', swapAfterBoss, null)).toBe('clear');
    // とどめの一撃のあと、撃破の行が出るまで（戦闘の画面）は止めておく。入れ替え・クリアの画面ではクリアの曲
    expect(sceneBgm('/battle', swapAfterBoss, null, false)).toBeNull();
    expect(sceneBgm('/battle', cleared, null, false)).toBeNull();
    expect(sceneBgm('/swap', swapAfterBoss, null, false)).toBe('clear');
    expect(sceneBgm('/clear', cleared, null, false)).toBe('clear');
    expect(sceneBgm('/swap', swap, null)).toBe('dungeon');
  });
});
