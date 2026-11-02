import { describe, expect, test } from 'vitest';
import { discard, equip, equipmentBonus, unequip } from '../../src/domain/equipment';
import { RuleViolationError } from '../../src/domain/errors';
import type { InventoryData, ItemInstance } from '../../src/domain/game-state';
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
    const ring = makeItem(1, 'accessory1', 'R', 2);
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
    const life = makeItem(1, 'accessory4', 'R', 15);
    const off = unequip(deepFreeze(makeState('INN', { hp: 40, inventory: inv([], { accessory: life }) })), 'accessory');
    expect(off.state).toMatchObject({ hp: 30, maxHp: 30 });
    const mana = makeItem(2, 'accessory5', 'R', 4);
    expect(unequip(deepFreeze(makeState('INN', { mp: 14, inventory: inv([], { accessory: mana }) })), 'accessory').state.mp).toBe(10);
    const on = equip(deepFreeze(makeState('INN', { hp: 30, inventory: inv([life]) })), 1);
    expect(on.state.hp).toBe(30);
    // HP 0 にはならない（最大 HP が下がっても最低 1）
    const low = unequip(deepFreeze(makeState('INN', { hp: 1, maxHp: 1, inventory: inv([], { accessory: life }) })), 'accessory');
    expect(low.state.hp).toBe(1);
    // 捨てる：HP 40 の まま（装備に関係しない）
    const keep = discard(deepFreeze(makeState('INN', { hp: 40, inventory: inv([makeItem(3, 'armor1', 'N', 1)], { accessory: life }) })), 3);
    expect(keep.state.hp).toBe(40);
  });

  test('TC-0028-12 ソロモンのゆびわ［LG］（20）を付けると こうげき・ぼうぎょ の補正が両方 20 増え、外すと両方減る', () => {
    const ring = makeItem(1, 'accessory8', 'LG', 20);
    const s = deepFreeze(makeState('INN', { inventory: inv([ring]) }));
    expect(equipmentBonus(s.inventory)).toMatchObject({ attack: 0, defense: 0 });
    const on = equip(s, 1).state;
    expect(equipmentBonus(on.inventory)).toEqual({ attack: 20, defense: 20, speed: 0, maxHp: 0, maxMp: 0 });
    expect(equipmentBonus(unequip(on, 'accessory').state.inventory)).toMatchObject({ attack: 0, defense: 0 });
  });

  test('TC-0029-07 装備中の個体の ID で捨てると「その もちものは ない」で、状態は変わらない', () => {
    const s = deepFreeze(makeState('INN', { inventory: inv([makeItem(2, 'armor1', 'N', 1)], { weapon: makeItem(1, 'weapon1', 'N', 1) }) }));
    expect(() => discard(s, 1)).toThrow(RuleViolationError);
    expect(() => discard(s, 1)).toThrow('その もちものは ない');
  });
});
