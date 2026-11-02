import { describe, expect, test } from 'vitest';
import { attack, damage, evadeChance, fleeChance, resolveTurn, toBattleView, turnOrder } from '../../src/domain/battle';
import { InvalidStateError } from '../../src/domain/errors';
import { SeededRng, SequenceRng } from '../../src/domain/rng';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeItem } from '../helpers/fixtures';
import { battleState, noRng } from '../helpers/maps';

describe('敵と戦う', () => {
  test('TC-0019-02 toBattleView のキーは 5 つだけで、敵の HP がない', () => {
    const view = toBattleView(battleState('goblin', 7))!;
    expect(Object.keys(view).sort()).toEqual(['canFlee', 'canHeal', 'enemyKind', 'enemyName', 'isBoss']);
    expect(view).toEqual({ enemyKind: 'goblin', enemyName: 'ゴブリン', isBoss: false, canHeal: true, canFlee: true });
    expect(JSON.stringify(view)).not.toContain('7');
    expect(toBattleView(battleState('necromancer', 260, { mp: 2 }))).toMatchObject({ isBoss: true, canHeal: false, canFlee: false });
  });

  test('TC-0019-03 damage は max(1, 攻撃力 − floor(防御力 ÷ 2) + int(0,2))', () => {
    const d = (a: number, def: number, r: number) => damage(a, def, new SequenceRng([r]));
    expect([d(5, 2, 0), d(5, 2, 2), d(5, 3, 0), d(4, 12, 0), d(2, 10, 2)]).toEqual([4, 6, 4, 1, 1]);
  });

  test('TC-0019-04 素早さが同じならプレイヤーが先、プレイヤーが 1 遅いと敵が先。同じ速さの敵と戦うと最初の行はプレイヤーの攻撃', () => {
    expect(turnOrder(6, 6)).toEqual(['player', 'enemy']);
    expect(turnOrder(5, 6)).toEqual(['enemy', 'player']);
    // スライムの速さ 3 と同じ速さのプレイヤー
    const r = resolveTurn(deepFreeze(battleState('slime', 12, { speed: 3 })), 'attack', new SequenceRng([100, 0, 100, 0]));
    expect(r.messages[0].text).toBe('ゆうしゃの こうげき！ スライムに 4 の ダメージ！');
    expect(r.messages[1].text).toMatch(/^スライムの こうげき！/);
  });

  test('TC-0019-05 evadeChance は clamp(5 + (受ける側 − 攻撃する側) × 2, 5, 30)', () => {
    expect([evadeChance(10, 10), evadeChance(11, 10), evadeChance(22, 10), evadeChance(23, 10), evadeChance(30, 10), evadeChance(5, 10)])
      .toEqual([5, 7, 29, 30, 30, 5]);
  });

  test('TC-0019-06 プレイヤーの攻撃が回避されると敵の HP は変わらず、ダメージの int(0,2) を引かない。次は敵の攻撃の回避の判定', () => {
    // スライム（速さ 3）の回避率 5%：5 で回避。次の 100 は敵の攻撃の回避（外れ）、0 はそのダメージ
    const rng = new SequenceRng([5, 100, 0]);
    const r = resolveTurn(deepFreeze(battleState('slime', 12)), 'attack', rng);
    rng.assertExhausted();
    expect(r.messages[0]).toEqual({ text: 'スライムは ひらりと みをかわした！', tone: 'normal' });
    expect(r.messages[1].text).toBe('スライムの こうげき！ 2 の ダメージを うけた！');
    expect(r.state.battle!.enemy.hp).toBe(12);
    expect(r.outcome).toBe('continue');
  });

  test('TC-0019-07 先攻で敵を倒すと、敵の攻撃はない。引く乱数は回避・ダメージ・ドロップ判定の 3 個だけ', () => {
    const rng = new SequenceRng([100, 0, 16]);
    const r = resolveTurn(deepFreeze(battleState('slime', 3)), 'attack', rng);
    rng.assertExhausted();
    expect(r.outcome).toBe('victory');
    expect(r.messages.some((m) => m.text.startsWith('スライムの こうげき！'))).toBe(false);
  });

  test('TC-0019-08 回避率 15% で 10,000 回攻撃すると、回避の割合が 13.5%〜16.5%', () => {
    expect(evadeChance(10, 5)).toBe(15);
    const rng = new SeededRng(2026);
    let evaded = 0;
    for (let i = 0; i < 10_000; i += 1) {
      if (attack({ attack: 5, defense: 5, speed: 5 }, { attack: 5, defense: 5, speed: 10 }, rng).evaded) evaded += 1;
    }
    expect(evaded / 10_000).toBeGreaterThanOrEqual(0.135);
    expect(evaded / 10_000).toBeLessThanOrEqual(0.165);
  });
});

describe('戦闘から逃げる', () => {
  test('TC-0020-01 fleeChance は clamp(50 + (プレイヤー − 敵) × 5, 10, 90)', () => {
    expect([fleeChance(5, 5), fleeChance(13, 5), fleeChance(14, 5), fleeChance(5, 13), fleeChance(5, 14)]).toEqual([50, 90, 90, 10, 10]);
  });

  test('TC-0020-02 成功すると同じマスのダンジョンへ戻り「うまく にげきれた」。経験値・所持品・討伐数は変わらず、乱数は 1 個だけ', () => {
    const start = deepFreeze(battleState('skeleton', 20, { exp: 9, inventory: { ...battleState('skeleton', 1).inventory, items: [makeItem(1, 'weapon1', 'N', 1)], nextId: 2 } }));
    const rng = new SequenceRng([50]);
    const r = resolveTurn(start, 'flee', rng);
    rng.assertExhausted();
    expect(r.outcome).toBe('fled');
    expect(r.state).toMatchObject({ location: 'DUNGEON', battle: null, exp: 9 });
    expect(r.state.dungeon!.player).toEqual(start.dungeon!.player);
    expect(r.state.inventory).toEqual(start.inventory);
    expect(r.state.records.kills).toBe(start.records.kills);
    expect(r.messages).toEqual([{ text: 'うまく にげきれた', tone: 'normal' }]);
  });

  test('TC-0020-04 失敗すると「にげられなかった！」と敵の攻撃だけ。敵の HP は変わらず BATTLE のまま', () => {
    const rng = new SequenceRng([100, 100, 0]);
    const r = resolveTurn(deepFreeze(battleState('slime', 9, { speed: 20 })), 'flee', rng);
    rng.assertExhausted();
    expect(r.messages.map((m) => m.text)).toEqual(['にげられなかった！', 'スライムの こうげき！ 2 の ダメージを うけた！']);
    expect(r.state.battle!.enemy.hp).toBe(9);
    expect(r.state.location).toBe('BATTLE');
    expect(r.outcome).toBe('continue');
  });

  test('TC-0020-05 ボス戦では逃げられない：409「にげられない！」、状態は変わらず乱数を引かない', () => {
    const start = deepFreeze(battleState('necromancer', 260));
    expect(() => resolveTurn(start, 'flee', noRng())).toThrow(InvalidStateError);
    expect(() => resolveTurn(start, 'flee', noRng())).toThrow('にげられない！');
  });
});

describe('経験値を得て強くなる', () => {
  test('TC-0022-01 スライムを倒すと「たおした」→「経験値 4 を かくとく」。同じマスのダンジョンへ、経験値 +4、HP は減ったまま、討伐数 +1', () => {
    const start = deepFreeze(battleState('slime', 1, { hp: 20, exp: 3 }));
    const r = resolveTurn(start, 'attack', new SequenceRng([100, 0, 100]));
    expect(r.messages).toEqual([
      { text: 'ゆうしゃの こうげき！ スライムに 4 の ダメージ！', tone: 'normal' },
      { text: 'スライムを たおした！', tone: 'success' },
      { text: '経験値 4 を かくとく', tone: 'success' },
    ]);
    expect(r.state).toMatchObject({ location: 'DUNGEON', battle: null, exp: 7, hp: 20 });
    expect(r.state.dungeon!.player).toEqual(start.dungeon!.player);
    expect(r.state.records.kills).toBe(start.records.kills + 1);
  });
});

// 確認 ID のない、戦闘の決まり（仕様書 §5.3、§5.6、§8.4、§9.1。確認 ID は TASK-0012・0014 の担当）
describe('戦闘の決まり', () => {
  test('敵が先攻で HP が 0 になると、その場で敗北：宿屋・全回復・死亡 +1、最後の 2 行。ヒールは唱えない', () => {
    // ゴブリン（速さ 6）が先。回避の 100（外れ）、ダメージ 0 → 4 ダメージで HP 1 → 0
    const rng = new SequenceRng([100, 0]);
    const r = resolveTurn(deepFreeze(battleState('goblin', 18, { hp: 1, mp: 5 })), 'heal', rng);
    rng.assertExhausted();
    expect(r.outcome).toBe('defeat');
    expect(r.state).toMatchObject({ location: 'INN', dungeon: null, battle: null, hp: 30, mp: 10 });
    expect(r.state.records.deaths).toBe(1);
    expect(r.messages.slice(-2)).toEqual([
      { text: 'ゆうしゃは たおれた…', tone: 'danger' },
      { text: '気がつくと 宿屋に いた', tone: 'normal' },
    ]);
    expect(r.messages.some((m) => m.text.includes('ヒール'))).toBe(false);
  });

  test('戦闘のヒールは行動順に従って唱え、MP 2 なら 409「MP が たりない」（乱数を引かない）', () => {
    const r = resolveTurn(deepFreeze(battleState('slime', 12, { hp: 10 })), 'heal', new SequenceRng([100, 0]));
    expect(r.messages[0]).toEqual({ text: 'ゆうしゃは ヒールを となえた！ HP が 20 かいふくした', tone: 'success' });
    expect(r.state).toMatchObject({ hp: 28, mp: 7 });
    expect(() => resolveTurn(deepFreeze(battleState('slime', 12, { mp: 2 })), 'heal', noRng())).toThrow('MP が たりない');
    expect(() => resolveTurn(deepFreeze(battleState('slime', 12, { location: 'DUNGEON' })), 'attack', noRng())).toThrow('その操作は いまは できない');
  });

  test('勝ったときにドロップを引き、所持品の末尾に加える。満杯なら入れ替え待ち（SWAP）', () => {
    // スライム：ドロップ 15 以下 → 部位 0（ぶき）→ 段階 1 → レアリティ 81（R）→ 補正値の元 2 → floor(2 × 12 / 10) = 2
    const rng = new SequenceRng([100, 0, 15, 0, 1, 81, 2]);
    const r = resolveTurn(deepFreeze(battleState('slime', 1)), 'attack', rng);
    rng.assertExhausted();
    expect(r.state.inventory.items).toEqual([{ id: 1, itemId: 'weapon1', rarity: 'R', value: 2 }]);
    expect(r.state.inventory.nextId).toBe(2);
    expect(r.messages.at(-1)).toEqual({ text: 'スライムは ショートソード［R］（こうげき +2）を おとした！', tone: 'normal', rarity: 'R' });

    const full = { equipped: { weapon: null, armor: null, shield: null, accessory: null }, items: Array.from({ length: 50 }, (_, i) => makeItem(i + 1, 'armor1', 'N', 1)), nextId: 51, pending: null };
    const s = resolveTurn(deepFreeze(battleState('slime', 1, { inventory: full })), 'attack', new SequenceRng([100, 0, 15, 0, 1, 80, 1]));
    expect(s.state.location).toBe('SWAP');
    expect(s.state.inventory.items).toHaveLength(50);
    expect(s.state.inventory.pending).toEqual({ item: { id: 51, itemId: 'weapon1', rarity: 'N', value: 1 }, thenClear: false });
    expect(s.state.inventory.nextId).toBe(52);
  });

  test('ボスに勝つと、ダンジョンを破棄し討伐・ボス討伐・周回を数え、段階 8 の LG を拾って CLEARED、最後に「平和が もどった」', () => {
    // ボスの HP 1、プレイヤーが速い。経験値 1000 で Lv9（Lv10 は 1080）＝ 8 回の成長。
    // ドロップ：1（必ず）→ 部位 3（アクセ）→ 段階 8 → レアリティ 50（LG）→ 補正値の元 5 → 15
    const growth = Array.from({ length: 8 * 5 }, (_, i) => [8, 2, 1, 1, 1][i % 5]);
    const rng = new SequenceRng([100, 0, ...growth, 1, 3, 8, 50, 5]);
    const r = resolveTurn(deepFreeze(battleState('necromancer', 1, { speed: 20 })), 'attack', rng);
    rng.assertExhausted();
    expect(r.state).toMatchObject({ location: 'CLEARED', dungeon: null, battle: null, level: 9, exp: 1000 });
    expect(r.state.records).toMatchObject({ kills: 1, bossKills: 1, laps: 2 });
    expect(r.state.inventory.items.at(-1)).toEqual({ id: 1, itemId: 'accessory8', rarity: 'LG', value: 15 });
    expect(r.messages.map((m) => m.effect).filter(Boolean)).toEqual(['bossDefeat', ...Array(8).fill('levelUp'), 'rareDrop', 'clear']);
    expect(r.messages.at(-1)).toEqual({ text: 'ダンジョンに 平和が もどった', tone: 'success', effect: 'clear' });
    expect(r.messages.at(-2)!.text).toBe('暗黒のネクロマンサーは ソロモンのゆびわ［LG］（こうげき +15 ぼうぎょ +15）を おとした！');
  });
});
