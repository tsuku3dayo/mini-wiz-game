import { describe, expect, test } from 'vitest';
import { toGameView, toItemView } from '../../src/api/game-view';
import { discard, effectiveStats, equip, equipmentBonus, unequip } from '../../src/domain/equipment';
import { RuleViolationError } from '../../src/domain/errors';
import type { InventoryData, ItemInstance } from '../../src/domain/game-state';
import { ITEMS, statName, type ItemId } from '../../src/domain/items';
import { bonusTexts, STAT_ORDER } from '../../src/logic/item-text';
import { abilityRows } from '../../src/logic/stat-diff';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeItem, makeState } from '../helpers/fixtures';

const empty = { weapon: null, armor: null, shield: null, accessory: null };

function inv(items: ItemInstance[], equipped: Partial<InventoryData['equipped']> = {}): InventoryData {
  return { equipped: { ...empty, ...equipped }, items, nextId: 300, pending: null };
}

/** n 個の所持品（クロースアーマー［N］） */
const filler = (n: number, from = 10) => Array.from({ length: n }, (_, i) => makeItem(from + i, 'armor1', 'N', 1));

describe('付け替え・はずす・捨てる', () => {
  test('TC-0028-03 付け替えで、前の個体は所持品の末尾へ、選んだ個体は装備へ（個数は同じ）。50 個でもできる', () => {
    const axe = makeItem(1, 'weapon3', 'SR', 10);
    const old = makeItem(2, 'weapon1', 'N', 1);
    const s = deepFreeze(makeState('INN', { inventory: inv([axe, makeItem(3, 'armor1', 'N', 1)], { weapon: old }) }));
    const r = equip(s, 1);
    expect(r.state.inventory.equipped.weapon).toEqual(axe);
    expect(r.state.inventory.items.map((i) => i.id)).toEqual([3, 2]);
    expect(r.messages).toEqual([{ text: 'バトルアックス［SR］を そうびした', tone: 'normal' }]);

    const full = deepFreeze(makeState('DUNGEON', { inventory: inv([axe, ...filler(49)], { weapon: old }) }));
    const rf = equip(full, 1);
    expect(rf.state.inventory.items).toHaveLength(50);
    expect(rf.state.inventory.items.at(-1)).toEqual(old);
  });

  test('TC-0028-05 50 個で外すと「もちものが いっぱいで はずせない」、空き枠は「なにも そうびしていない」。49 個なら外せて末尾へ', () => {
    const ring = makeItem(1, 'accessory3', 'R', 4); // ガードリング（v1.21 で段階 3）
    const full = deepFreeze(makeState('INN', { inventory: inv(filler(50), { accessory: ring }) }));
    expect(() => unequip(full, 'accessory')).toThrow(RuleViolationError);
    expect(() => unequip(full, 'accessory')).toThrow('もちものが いっぱいで はずせない');
    expect(() => unequip(full, 'shield')).toThrow('なにも そうびしていない');
    const s = deepFreeze(makeState('INN', { inventory: inv(filler(49), { accessory: ring }) }));
    const r = unequip(s, 'accessory');
    expect(r.state.inventory.equipped.accessory).toBeNull();
    expect(r.state.inventory.items).toHaveLength(50);
    expect(r.state.inventory.items.at(-1)).toEqual(ring);
    expect(r.messages).toEqual([{ text: 'ガードリング［R］を はずした', tone: 'normal' }]);
  });

  test('TC-0028-07 外すと HP・MP を新しい上限へ切り詰める（HP は最低 1）。付けても今の値は増えない。捨てるは切り詰めない', () => {
    const life = makeItem(1, 'accessory1', 'R', 7); // ライフアミュレット［R］さいだいHP +7（v1.21）
    const off = unequip(deepFreeze(makeState('INN', { hp: 35, inventory: inv([], { accessory: life }) })), 'accessory');
    expect(off.state).toMatchObject({ hp: 30, maxHp: 30 });
    const mana = makeItem(2, 'accessory2', 'R', 4); // マナブレスレット［R］さいだいMP +4
    expect(unequip(deepFreeze(makeState('INN', { mp: 14, inventory: inv([], { accessory: mana }) })), 'accessory').state.mp).toBe(10);
    const on = equip(deepFreeze(makeState('INN', { hp: 30, inventory: inv([life]) })), 1);
    expect(on.state.hp).toBe(30);
    // HP 0 にはならない（最大 HP が下がっても最低 1）
    const low = unequip(deepFreeze(makeState('INN', { hp: 1, maxHp: 1, inventory: inv([], { accessory: life }) })), 'accessory');
    expect(low.state.hp).toBe(1);
    // 捨てる：HP 35 の まま（装備に関係しない）
    const keep = discard(deepFreeze(makeState('INN', { hp: 35, inventory: inv([makeItem(3, 'armor1', 'N', 1)], { accessory: life }) })), 3);
    expect(keep.state.hp).toBe(35);
  });

  test('TC-0028-12 ソロモンのゆびわ［LG］（30）を付けると こうげき・ぼうぎょ・かいひ の補正が 3 つとも 30 増え、外すと 3 つとも減る', () => {
    const ring = makeItem(1, 'accessory8', 'LG', 30);
    const s = deepFreeze(makeState('INN', { inventory: inv([ring]) }));
    expect(equipmentBonus(s.inventory)).toMatchObject({ attack: 0, defense: 0, evasion: 0 });
    const on = equip(s, 1).state;
    expect(equipmentBonus(on.inventory)).toEqual({ attack: 30, defense: 30, speed: 0, evasion: 30, maxHp: 0, maxMp: 0 });
    expect(equipmentBonus(unequip(on, 'accessory').state.inventory)).toMatchObject({ attack: 0, defense: 0, evasion: 0 });
  });

  test('TC-0028-15 たて 8 種は かいひ を上げる。effectiveStats の evasion は すばやさ＋装備の かいひ。base・bonus。名前・並び・文言・のうりょくの変化（ウィンドブーツは かいひ の 1 行）', () => {
    for (let tier = 1; tier <= 8; tier += 1) expect(ITEMS[`shield${tier}` as ItemId].stats).toEqual(['evasion']);
    // かいひ ＝ すばやさの実効値 ＋ 装備の かいひ（v1.16。v1.21 から たて・ウィンドブーツ・ソロモンのゆびわ）。ぼうぎょ（ガードリング）の補正は evasion に入らない
    const shield = makeItem(1, 'shield5', 'R', 6);
    const guard = makeItem(2, 'accessory3', 'R', 4);
    const s = deepFreeze(makeState('INN', { inventory: inv([], { shield, accessory: guard }) }));
    expect(effectiveStats(s)).toEqual({ attack: 5, defense: 9, speed: 5, evasion: 11, maxHp: 30, maxMp: 10 });
    expect(effectiveStats(deepFreeze(makeState('INN'))).evasion).toBe(5);
    // ウィンドブーツ（かいひ +4。v1.21 で すばやさ から かいひ に）は かいひ だけを上げ、すばやさ は変わらない
    const boots = makeItem(3, 'accessory5', 'R', 4);
    const fast = deepFreeze(makeState('INN', { inventory: inv([], { shield, accessory: boots }) }));
    expect(effectiveStats(fast)).toMatchObject({ speed: 5, evasion: 15 });
    // GameView：base.evasion ＝ すばやさの基礎値、bonus.evasion ＝ すばやさの補正 ＋ 装備の かいひ（base ＋ bonus ＝ 実効値）
    expect(toGameView(fast).character).toMatchObject({ evasion: 15, base: { evasion: 5 }, bonus: { evasion: 10 } });
    expect(statName('evasion')).toBe('かいひ');
    expect(STAT_ORDER).toEqual(['attack', 'defense', 'speed', 'evasion', 'maxHp', 'maxMp']);
    expect(bonusTexts({ stats: ['evasion'], value: 6 })).toEqual(['かいひ +6']);
    // 装備画面で たて の候補にカーソルを合わせると、かいひ の行だけが「  5 →  11 ↑」
    const view = toGameView(deepFreeze(makeState('INN'))).character;
    const c = { effective: { attack: view.attack, defense: view.defense, speed: view.speed, evasion: view.evasion, maxHp: view.maxHp, maxMp: view.maxMp }, base: view.base, bonus: view.bonus };
    const rows = abilityRows(c, { current: null, candidate: toItemView(shield) });
    expect(rows.filter((r) => r.change !== null).map((r) => [r.stat, r.text])).toEqual([['evasion', '  5 →  11 ↑']]);
    // ウィンドブーツ（かいひ +4）の候補では かいひ の行だけが上がる（v1.21。v1.20 までは すばやさ と かいひ の 2 行）
    const bootRows = abilityRows(c, { current: null, candidate: toItemView(boots) });
    expect(bootRows.filter((r) => r.change !== null).map((r) => [r.stat, r.text])).toEqual([['evasion', '  5 →   9 ↑']]);
  });

  test('TC-0029-07 装備中の個体の ID で捨てると「その もちものは ない」で、状態は変わらない', () => {
    const s = deepFreeze(makeState('INN', { inventory: inv([makeItem(2, 'armor1', 'N', 1)], { weapon: makeItem(1, 'weapon1', 'N', 1) }) }));
    expect(() => discard(s, 1)).toThrow(RuleViolationError);
    expect(() => discard(s, 1)).toThrow('その もちものは ない');
  });
});
