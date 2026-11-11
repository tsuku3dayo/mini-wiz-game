import { describe, expect, test } from 'vitest';
import type { ItemView } from '../../src/api/types';
import { bonusTexts, itemName, itemSpoken, itemText } from '../../src/logic/item-text';
import { abilityRows } from '../../src/logic/stat-diff';

const solomon: ItemView = {
  id: 7, itemId: 'accessory8', name: 'ソロモンのゆびわ', slot: 'accessory', rarity: 'LG', stat: 'attack', stats: ['attack', 'defense'], value: 20,
};

describe('装備の表示文字列', () => {
  test('TC-0028-13 ソロモンのゆびわは補正が 2 つ。1 行・読み上げにも 2 つ入り、のうりょくは こうげき・ぼうぎょ の 2 行が変わる', () => {
    expect(bonusTexts(solomon)).toEqual(['こうげき +20', 'ぼうぎょ +20']);
    expect(itemName(solomon)).toBe('ソロモンのゆびわ［LG］');
    expect(itemText(solomon)).toBe('ソロモンのゆびわ［LG］ こうげき +20 ぼうぎょ +20');
    expect(itemSpoken(solomon)).toBe('ソロモンのゆびわ、レジェンド、こうげき プラス 20、ぼうぎょ プラス 20');

    const zero = { attack: 0, defense: 0, speed: 0, evasion: 0, maxHp: 0, maxMp: 0 };
    const base = { attack: 18, defense: 15, speed: 12, evasion: 0, maxHp: 60, maxMp: 20 };
    const rows = abilityRows({ effective: base, base, bonus: zero }, { current: null, candidate: solomon });
    expect(rows.filter((r) => r.change !== null).map((r) => [r.stat, r.change])).toEqual([['attack', 'up'], ['defense', 'up']]);
    expect(rows[0].text).toBe(' 18 →  38 ↑');
    expect(rows[1].text).toBe(' 15 →  35 ↑');
  });
});
