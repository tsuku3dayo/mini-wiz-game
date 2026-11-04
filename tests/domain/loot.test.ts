import { describe, expect, test } from 'vitest';
import { resolveTurn } from '../../src/domain/battle';
import { discard } from '../../src/domain/equipment';
import { RuleViolationError } from '../../src/domain/errors';
import type { InventoryData } from '../../src/domain/game-state';
import { abandonLoot, addItem, dropMessage, rollDrop, takeLoot } from '../../src/domain/loot';
import { SeededRng, SequenceRng } from '../../src/domain/rng';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeItem, makeState } from '../helpers/fixtures';
import { battleState, dungeonState, openMap } from '../helpers/maps';

/** 所持品 n 個（1 個目はショートソード［N］、残りはクロースアーマー［N］）。装備は 4 枠とも付ける */
function inventoryOf(n: number): InventoryData {
  const items = Array.from({ length: n }, (_, i) => (i === 0 ? makeItem(1, 'weapon1', 'N', 1) : makeItem(i + 1, 'armor1', 'N', 1)));
  return {
    equipped: {
      weapon: makeItem(101, 'weapon2', 'N', 3),
      armor: makeItem(102, 'armor2', 'N', 2),
      shield: makeItem(103, 'shield2', 'N', 2),
      accessory: makeItem(104, 'accessory1', 'N', 1),
    },
    items,
    nextId: 200,
    pending: null,
  };
}

describe('ドロップ', () => {
  test('TC-0027-03 出るレアリティは段階で決まり、80 で低い方・81 で高い方。段階 8 は 81 でも LG（乱数は 1 個引く）', () => {
    // ゴブリン（段階 1〜2）：落とす 1 → 部位 0 → 段階 → レアリティ → 補正値の元
    const drop = (tier: number, r: number) => rollDrop('goblin', new SequenceRng([1, 0, tier, r, 1]));
    expect(drop(1, 80)!.rarity).toBe('N');
    expect(drop(1, 81)!.rarity).toBe('R');
    // オーク（段階 3〜5）：段階 4・5 は R/SR
    expect(rollDrop('orc', new SequenceRng([1, 0, 4, 80, 7]))!.rarity).toBe('R');
    expect(rollDrop('orc', new SequenceRng([1, 0, 5, 81, 9]))!.rarity).toBe('SR');
    // ダークナイト（段階 5〜7）：段階 6・7 は SR/UR
    expect(rollDrop('darkKnight', new SequenceRng([1, 6, 0, 6, 80, 12]))!.rarity).toBe('SR');
    expect(rollDrop('darkKnight', new SequenceRng([1, 6, 0, 7, 81, 15]))!.rarity).toBe('UR');
    // ボス：段階 8 は 81 でも LG。乱数は 5 個（落とす・部位・段階・レアリティ・補正値の元）
    const rng = new SequenceRng([1, 0, 8, 81, 20]);
    expect(rollDrop('necromancer', rng)).toEqual({ itemId: 'weapon8', rarity: 'LG', value: 60 });
    rng.assertExhausted();
  });

  test('TC-0027-04 スライムは 15 で落とし、16 では落とさずそれ以降の乱数を引かない', () => {
    expect(rollDrop('slime', new SequenceRng([15, 2, 1, 1, 1]))).toEqual({ itemId: 'shield1', rarity: 'N', value: 1 });
    const rng = new SequenceRng([16, 2, 1, 1, 1]);
    expect(rollDrop('slime', rng)).toBeNull();
    expect(rng.remaining).toBe(4);
  });

  test('TC-0027-05 ダークナイトは特例 5 で段階 8・LG（段階の乱数なし）、6 なら段階を int(5,7) で引く', () => {
    const special = new SequenceRng([35, 5, 1, 50, 17]);
    expect(rollDrop('darkKnight', special)).toEqual({ itemId: 'armor8', rarity: 'LG', value: 51 });
    special.assertExhausted();
    // 補正値の元は、たての段階 5〜7（5〜7・7〜9・8〜11）のどれにも入る値
    const base = { 5: 7, 6: 8, 7: 8 } as const;
    for (const tier of [5, 6, 7] as const) {
      const d = rollDrop('darkKnight', new SequenceRng([35, 6, 2, tier, 1, base[tier]]))!;
      expect(d.itemId).toBe(`shield${tier}`);
    }
  });

  test('TC-0027-06 ボスは 100 でも落とし、必ず段階 8・LG。段階の乱数 int(8,8) も引く', () => {
    let tierCall = false;
    const values = [100, 3, 8, 1, 5];
    let i = 0;
    const rng = { int: (a: number, b: number) => { if (a === 8 && b === 8) tierCall = true; return values[i++]; }, chance: () => false };
    expect(rollDrop('necromancer', rng)).toEqual({ itemId: 'accessory8', rarity: 'LG', value: 15 });
    expect(tierCall).toBe(true);
    expect(i).toBe(5);
  });

  test('TC-0027-08 ドロップの行の形（全角の括弧・「は」の後に半角スペース）、tone normal・rarity、UR・LG だけ rareDrop', () => {
    expect(dropMessage('スライム', { itemId: 'shield1', rarity: 'R', value: 1 }))
      .toEqual({ text: 'スライムは ウッドシールド［R］（ぼうぎょ +1）を おとした！', tone: 'normal', rarity: 'R' });
    expect(dropMessage('暗黒のネクロマンサー', { itemId: 'accessory8', rarity: 'LG', value: 20 }))
      .toEqual({ text: '暗黒のネクロマンサーは ソロモンのゆびわ［LG］（こうげき +20 ぼうぎょ +20）を おとした！', tone: 'normal', rarity: 'LG', effect: 'rareDrop' });
    expect(dropMessage('ダークナイト', { itemId: 'weapon7', rarity: 'UR', value: 30 }).effect).toBe('rareDrop');
    for (const r of ['N', 'R', 'SR'] as const) expect(dropMessage('x', { itemId: 'weapon1', rarity: r, value: 1 }).effect).toBeUndefined();
  });

  test('TC-0027-10 ID は nextId から振って 1 進める。捨てた ID は使わない。満杯でも ID を振り、あきらめても戻らない', () => {
    const a = addItem(deepFreeze(inventoryOf(3)), { itemId: 'weapon1', rarity: 'N', value: 1 });
    expect(a.item.id).toBe(200);
    expect(a.inv.nextId).toBe(201);
    // 捨てたあとに拾っても、捨てた ID（200）は使わない
    const s = deepFreeze(makeState('INN', { inventory: a.inv }));
    const dropped = discard(s, 200).state.inventory;
    expect(addItem(dropped, { itemId: 'armor1', rarity: 'N', value: 1 }).item.id).toBe(201);
    // 満杯：ID は振るが加えない。あきらめても nextId は戻らない
    const full = addItem(deepFreeze(inventoryOf(50)), { itemId: 'weapon1', rarity: 'N', value: 1 });
    expect(full.added).toBe(false);
    expect(full.item.id).toBe(200);
    expect(full.inv.nextId).toBe(201);
    const swap = deepFreeze(makeState('SWAP', { inventory: { ...full.inv, pending: { item: full.item, thenClear: false } } }));
    expect(abandonLoot(swap).state.inventory.nextId).toBe(201);
  });
});

// 確認 ID のない、E2E で使うシードの前提（e2e/helpers.ts の SEEDS）
describe('E2E のシード', () => {
  test('slimeDropR（131）はスライムが R を、darkKnightDropLG（66）はダークナイトが LG を落とす', () => {
    const slime = resolveTurn(deepFreeze(battleState('slime', 1)), 'attack', new SeededRng(131));
    expect(slime.messages.at(-1)).toMatchObject({ rarity: 'R' });
    const dk = resolveTurn(deepFreeze(battleState('darkKnight', 1, { hp: 999, maxHp: 999 })), 'attack', new SeededRng(66));
    expect(dk.outcome).toBe('victory');
    expect(dk.messages.at(-1)).toMatchObject({ rarity: 'LG', effect: 'rareDrop' });
  });

  test('darkKnightDropUR（2）はレベルアップして UR を、darkKnightDropSR（5）は SR を、goblinDropN（5）は N を、bossWin（1）は Lv12 のプレイヤーが先攻でボスを倒し 3 回レベルアップして LG を落とす', () => {
    const dk = resolveTurn(deepFreeze(battleState('darkKnight', 1, { hp: 999, maxHp: 999 })), 'attack', new SeededRng(2));
    expect(dk.messages.map((m) => m.effect ?? null)).toEqual([null, null, null, null, 'levelUp', null, 'rareDrop']);
    expect(dk.messages.at(-1)).toMatchObject({ rarity: 'UR' });
    const sr = resolveTurn(deepFreeze(battleState('darkKnight', 1, { hp: 999, maxHp: 999 })), 'attack', new SeededRng(5));
    expect(sr.messages.at(-1)).toMatchObject({ rarity: 'SR' });
    expect(sr.messages.at(-1)?.effect).toBeUndefined();
    const n = resolveTurn(deepFreeze(battleState('goblin', 1, { hp: 999, maxHp: 999 })), 'attack', new SeededRng(5));
    expect(n.messages.at(-1)).toMatchObject({ rarity: 'N' });
    const boss = resolveTurn(deepFreeze(battleState('necromancer', 1, { level: 12, exp: 1584, speed: 30, maxHp: 120, hp: 100, dungeon: openMap({ x: 9, y: 0 }, {}, 5) })), 'attack', new SeededRng(1));
    expect(boss.messages.map((m) => m.effect ?? null)).toEqual([null, 'bossDefeat', null, 'levelUp', null, 'levelUp', null, 'levelUp', null, 'rareDrop', 'clear']);
    expect(boss.messages.at(-2)).toMatchObject({ rarity: 'LG' });
  });
});

describe('満杯のときの入れ替え', () => {
  test('TC-0030-01 所持品 50 個で落とすと SWAP（pending・thenClear false）で所持品は同じ。49 個＋装備 4 個なら末尾に入って 50 個', () => {
    // スライム（HP 1）を倒す：回避 100・ダメージ 0、ドロップ 15 → 部位 0 → 段階 1 → 81（R）→ 2
    const seq = () => new SequenceRng([100, 0, 15, 0, 1, 81, 2]);
    const full = deepFreeze(battleState('slime', 1, { inventory: inventoryOf(50) }));
    const r = resolveTurn(full, 'attack', seq());
    expect(r.state.location).toBe('SWAP');
    expect(r.state.inventory.items).toEqual(full.inventory.items);
    expect(r.state.inventory.pending).toEqual({ item: { id: 200, itemId: 'weapon1', rarity: 'R', value: 2 }, thenClear: false });
    expect(r.messages.at(-1)!.text).toBe('スライムは ショートソード［R］（こうげき +2）を おとした！');

    const r49 = resolveTurn(deepFreeze(battleState('slime', 1, { inventory: inventoryOf(49) })), 'attack', seq());
    expect(r49.state.location).toBe('DUNGEON');
    expect(r49.state.inventory.items).toHaveLength(50);
    expect(r49.state.inventory.items.at(-1)).toEqual({ id: 200, itemId: 'weapon1', rarity: 'R', value: 2 });
  });

  test('TC-0030-05 拾う・あきらめるで pending を消して DUNGEON。thenClear なら CLEARED と「平和が もどった」。所持品にない ID は 409', () => {
    const pendingItem = makeItem(200, 'weapon6', 'UR', 28);
    const swap = (thenClear: boolean) => deepFreeze(makeState('SWAP', {
      dungeon: thenClear ? null : openMap(),
      inventory: { ...inventoryOf(50), pending: { item: pendingItem, thenClear } },
    }));
    const take = takeLoot(swap(false), 1);
    expect(take.state).toMatchObject({ location: 'DUNGEON' });
    expect(take.state.inventory.pending).toBeNull();
    expect(take.state.inventory.items).toHaveLength(50);
    expect(take.state.inventory.items.some((i) => i.id === 1)).toBe(false);
    expect(take.state.inventory.items.at(-1)).toEqual(pendingItem);
    expect(take.messages).toEqual([{ text: 'ショートソード［N］を すてて ミスリルソード［UR］を ひろった', tone: 'normal' }]);

    const give = abandonLoot(swap(false));
    expect(give.state.inventory.items).toEqual(swap(false).inventory.items);
    expect(give.state.inventory.pending).toBeNull();
    expect(give.messages).toEqual([{ text: 'ミスリルソード［UR］を あきらめた', tone: 'normal' }]);

    const clear = takeLoot(swap(true), 1);
    expect(clear.state.location).toBe('CLEARED');
    expect(clear.messages.at(-1)).toEqual({ text: 'ダンジョンに 平和が もどった', tone: 'success', effect: 'clear' });
    expect(abandonLoot(swap(true)).state.location).toBe('CLEARED');

    // 所持品にない ID（装備中の 101 を含む）は 409 rule_violation
    for (const id of [999, 101]) {
      expect(() => takeLoot(swap(false), id)).toThrow(RuleViolationError);
      expect(() => takeLoot(swap(false), id)).toThrow('その もちものは ない');
    }
    // SWAP でない・pending がない
    expect(() => abandonLoot(deepFreeze(dungeonState()))).toThrow('その操作は いまは できない');
  });
});
