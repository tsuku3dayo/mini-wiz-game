import { describe, expect, test } from 'vitest';
import type { ItemView } from '../../src/api/types';
import { bonusTexts, itemName, itemSpoken, itemText } from '../../src/logic/item-text';
import { abilityRows } from '../../src/logic/stat-diff';

const solomon: ItemView = {
  id: 7, itemId: 'accessory8', name: 'ソロモンのゆびわ', slot: 'accessory', rarity: 'LG', stat: 'attack', stats: ['attack', 'defense', 'evasion'], value: 30,
};

describe('装備の表示文字列', () => {
  test('TC-0028-13 ソロモンのゆびわは補正が 3 つ（v1.21）。1 行・読み上げにも 3 つ入り、のうりょくは こうげき・ぼうぎょ・かいひ の 3 行が変わる', () => {
    expect(bonusTexts(solomon)).toEqual(['こうげき +30', 'ぼうぎょ +30', 'かいひ +30']);
    expect(itemName(solomon)).toBe('ソロモンのゆびわ［LG］');
    expect(itemText(solomon)).toBe('ソロモンのゆびわ［LG］ こうげき +30 ぼうぎょ +30 かいひ +30');
    expect(itemSpoken(solomon)).toBe('ソロモンのゆびわ、レジェンド、こうげき プラス 30、ぼうぎょ プラス 30、かいひ プラス 30');

    const zero = { attack: 0, defense: 0, speed: 0, evasion: 0, maxHp: 0, maxMp: 0 };
    const base = { attack: 18, defense: 15, speed: 12, evasion: 0, maxHp: 60, maxMp: 20 };
    const rows = abilityRows({ effective: base, base, bonus: zero }, { current: null, candidate: solomon });
    expect(rows.filter((r) => r.change !== null).map((r) => [r.stat, r.change])).toEqual([['attack', 'up'], ['defense', 'up'], ['evasion', 'up']]);
    expect(rows[0].text).toBe(' 18 →  48 ↑');
    expect(rows[1].text).toBe(' 15 →  45 ↑');
    expect(rows.find((r) => r.stat === 'evasion')!.text).toBe('  0 →  30 ↑');
  });
});
