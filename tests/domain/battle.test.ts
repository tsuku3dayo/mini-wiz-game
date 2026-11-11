import { describe, expect, test } from 'vitest';
import { toGameView } from '../../src/api/game-view';
import { attack, damage, evadeChance, fleeChance, resolveTurn, toBattleView, turnOrder } from '../../src/domain/battle';
import { continueToInn, rest } from '../../src/domain/character';
import { ENEMIES } from '../../src/domain/constants';
import { InvalidStateError } from '../../src/domain/errors';
import { SeededRng, SequenceRng } from '../../src/domain/rng';
import { deepFreeze } from '../helpers/deep-freeze';
import { makeItem } from '../helpers/fixtures';
import { battleState, noRng } from '../helpers/maps';
import { recordingRng } from '../helpers/rng';

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

  test('TC-0019-05 evadeChance(受ける側の速, 攻撃側の速, 受ける側のかいひ) は clamp(速の差 + かいひ, 0, 90)', () => {
    const cases: [number, number, number, number][] = [
      [50, 30, 0, 20], [10, 10, 0, 0], [11, 10, 0, 1], [5, 10, 0, 0], [5, 10, 12, 7], [20, 14, 6, 12], [100, 10, 0, 90], [10, 10, 95, 90],
    ];
    for (const [def, atk, eva, want] of cases) expect(evadeChance(def, atk, eva)).toBe(want);
  });

  test('TC-0019-06 プレイヤーの攻撃が回避されると敵の HP は変わらず、ダメージの int(0,2) を引かない。次は敵の攻撃の回避の判定', () => {
    // 敵の かいひ は 0 なので、敵が回避するのは敵の方が速いとき（＝敵が先に動く）。
    // プレイヤー（速さ 1）とスライム（速さ 3）：スライムの回避率 2%。
    // 1 ターン目：敵の攻撃（回避 100 で外れ・ダメージ 0）→ プレイヤーの攻撃を 2 で回避（ダメージの乱数は引かない）
    const rng = new SequenceRng([100, 0, 2]);
    const r = resolveTurn(deepFreeze(battleState('slime', 12, { speed: 1 })), 'attack', rng);
    rng.assertExhausted();
    expect(r.messages[0].text).toBe('スライムの こうげき！ 2 の ダメージを うけた！');
    expect(r.messages[1]).toEqual({ text: 'スライムは ひらりと みをかわした！', tone: 'normal' });
    expect(r.state.battle!.enemy.hp).toBe(12);
    expect(r.outcome).toBe('continue');
    // 次に引く乱数は、敵の攻撃の回避の int(1,100)
    const next = recordingRng(new SequenceRng([100, 0, 2]));
    resolveTurn(deepFreeze(r.state), 'attack', next);
    expect(next.calls.map(({ min, max }) => [min, max])).toEqual([[1, 100], [0, 2], [1, 100]]);
  });

  test('TC-0019-07 先攻で敵を倒すと、敵の攻撃はない。引く乱数は回避・ダメージ・ドロップ判定の 3 個だけ', () => {
    const rng = new SequenceRng([100, 0, 16]);
    const r = resolveTurn(deepFreeze(battleState('slime', 3)), 'attack', rng);
    rng.assertExhausted();
    expect(r.outcome).toBe('victory');
    expect(r.messages.some((m) => m.text.startsWith('スライムの こうげき！'))).toBe(false);
  });

  test('TC-0019-08 回避率 15%（受ける側の速 20・攻撃側の速 5・かいひ 0）で 10,000 回攻撃すると、回避の割合が 13.5%〜16.5%', () => {
    expect(evadeChance(20, 5, 0)).toBe(15);
    const rng = new SeededRng(2026);
    let evaded = 0;
    for (let i = 0; i < 10_000; i += 1) {
      if (attack({ attack: 5, defense: 5, speed: 5, evasion: 0 }, { attack: 5, defense: 5, speed: 20, evasion: 0 }, rng).evaded) evaded += 1;
    }
    expect(evaded / 10_000).toBeGreaterThanOrEqual(0.135);
    expect(evaded / 10_000).toBeLessThanOrEqual(0.165);
  });

  test('TC-0019-16 たて（かいひ +6）を付けた速 20 のプレイヤーは、ゴブリン（速 6）の攻撃を回避率 20 で判定する。ゴブリンの回避率は 0', () => {
    const shield = makeItem(1, 'shield5', 'R', 6);
    const inventory = { equipped: { weapon: null, armor: null, shield, accessory: null }, items: [], nextId: 2, pending: null };
    const start = deepFreeze(battleState('goblin', 18, { speed: 20, inventory }));
    // プレイヤーが先：ゴブリンの回避率 0 → 乱数 1 でも当たる（回避の乱数は 1 個引く）。ダメージ 0 → 5 − 1 = 4
    // ゴブリンの攻撃：回避率 20 − 6 + 6 = 20 → 20 で回避
    const evaded = new SequenceRng([1, 0, 20]);
    const r1 = resolveTurn(start, 'attack', evaded);
    evaded.assertExhausted();
    expect(r1.messages.map((m) => m.text)).toEqual(['ゆうしゃの こうげき！ ゴブリンに 4 の ダメージ！', 'ゆうしゃは ひらりと みをかわした！']);
    // 21 なら当たる（ダメージの乱数 0 → 6 − 2 = 4）
    const hit = new SequenceRng([1, 0, 21, 0]);
    const r2 = resolveTurn(start, 'attack', hit);
    hit.assertExhausted();
    expect(r2.messages[1].text).toBe('ゴブリンの こうげき！ 4 の ダメージを うけた！');
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
    // 経験値が次のレベルを超えても、レベルは上がらず、レベルアップの行がない（v1.14）
    const over = resolveTurn(deepFreeze(battleState('slime', 1, { exp: 23 })), 'attack', new SequenceRng([100, 0, 100]));
    expect(over.state).toMatchObject({ level: 1, exp: 27 });
    expect(over.messages.some((m) => m.effect === 'levelUp')).toBe(false);
  });

  test('TC-0022-12 通常の敵に勝つと、引く乱数は攻撃とドロップの分だけ（成長の 5 個を引かない）。expToNext は max(0, nextLevelExp − exp)', () => {
    // 経験値 20 + ゴブリン 10 = 30（Lv2 の 24 を超える）。プレイヤーが先：回避・ダメージ → ドロップ判定（21 で外れ）
    const rng = recordingRng(new SequenceRng([100, 0, 21]));
    const r = resolveTurn(deepFreeze(battleState('goblin', 1, { exp: 20, speed: 10 })), 'attack', rng);
    expect(rng.calls.map(({ min, max }) => [min, max])).toEqual([[1, 100], [0, 2], [1, 100]]);
    expect(r.state).toMatchObject({ level: 1, exp: 30 });
    expect(toGameView(r.state).character).toMatchObject({ nextLevelExp: 24, expToNext: 0 });
    expect(toGameView({ ...r.state, exp: 10 }).character.expToNext).toBe(14);
  });
});

describe('倒れる・ボスを倒す・ドロップの乱数の順', () => {
  test('TC-0023-01 HP が 0 になると宿屋で目覚め、HP・MP は装備込みの最大（61/61）。Lv・経験値・基礎値・装備・所持品は同じ、死亡 +1、最後の 2 行。ボス戦でも同じ', () => {
    const life = makeItem(1, 'accessory4', 'R', 15);
    const inventory = { equipped: { weapon: null, armor: null, shield: null, accessory: life }, items: [makeItem(2, 'armor1', 'N', 1)], nextId: 3, pending: null };
    const lv3 = { level: 3, exp: 80, hp: 1, maxHp: 46, mp: 2, maxMp: 16, attack: 7, defense: 7, speed: 5, inventory };
    for (const [kind, hp] of [['goblin', 18], ['necromancer', 260]] as const) {
      const start = deepFreeze(battleState(kind, hp, lv3));
      const r = resolveTurn(start, 'attack', new SequenceRng([100, 0]));
      expect(r.outcome).toBe('defeat');
      expect(r.state).toMatchObject({ location: 'INN', dungeon: null, battle: null, hp: 61, mp: 16, level: 3, exp: 80, maxHp: 46, attack: 7, defense: 7, speed: 5 });
      expect(r.state.inventory).toEqual(inventory);
      expect(r.state.records.deaths).toBe(start.records.deaths + 1);
      expect(r.messages.slice(-2)).toEqual([
        { text: 'ゆうしゃは たおれた…', tone: 'danger' },
        { text: '気がつくと 宿屋に いた', tone: 'normal' },
      ]);
    }
  });

  test('TC-0024-03 Lv12・累計 1584 でボスを倒すと 4 行（たおした・経験値・ドロップ・平和）。effect の並び。CLEARED・ダンジョンと戦闘は null', () => {
    const rng = new SequenceRng([100, 0, 1, 0, 8, 1, 20]);
    const r = resolveTurn(deepFreeze(battleState('necromancer', 1, { level: 12, exp: 1584, speed: 30, maxHp: 120, hp: 100 })), 'attack', rng);
    rng.assertExhausted();
    const lines = r.messages.slice(1); // 先頭はプレイヤーの攻撃の行
    expect(lines.map((m) => m.text)).toEqual([
      '暗黒のネクロマンサーを たおした！',
      '経験値 1000 を かくとく',
      '暗黒のネクロマンサーは エクスカリバー［LG］（こうげき +60）を おとした！',
      'ダンジョンに 平和が もどった',
    ]);
    expect(lines.map((m) => m.effect).filter(Boolean)).toEqual(['bossDefeat', 'rareDrop', 'clear']);
    expect(r.state).toMatchObject({ location: 'CLEARED', dungeon: null, battle: null });
  });

  test('TC-0027-07 乱数を引く順：（戦闘の乱数）→ ドロップ判定 → 特例（ダークナイトだけ）→ 部位 → 段階 → レアリティ → 補正値（間に成長はない）', () => {
    // スライム
    const slime = recordingRng(new SequenceRng([100, 0, 15, 2, 1, 50, 1]));
    resolveTurn(deepFreeze(battleState('slime', 1)), 'attack', slime);
    expect(slime.calls.map(({ min, max }) => [min, max])).toEqual([[1, 100], [0, 2], [1, 100], [0, 3], [1, 1], [1, 100], [1, 2]]);
    // ダークナイト（HP 1）をプレイヤーが先に倒す。経験値 50 で Lv2 を超えても成長の乱数はなく、すぐドロップ（特例あり）
    const dk = recordingRng(new SequenceRng([100, 0, 35, 6, 1, 7, 50, 13]));
    const r = resolveTurn(deepFreeze(battleState('darkKnight', 1, { speed: 20, attack: 30 })), 'attack', dk);
    expect(dk.calls.map(({ min, max }) => [min, max])).toEqual([
      [1, 100], [0, 2],
      [1, 100], [1, 100], [0, 3], [5, 7], [1, 100], [13, 17],
    ]);
    expect(r.state).toMatchObject({ level: 1, exp: 50 });
  });
});

describe('ボスを倒す', () => {
  test('TC-0024-02 ボスの経験値は 1000。Lv12・累計 1584 で倒すと累計 2584・Lv12 のまま。そのあと やすむ と Lv15', () => {
    expect(ENEMIES.necromancer.exp).toBe(1000);
    // ボスの HP 1、プレイヤーが速い：回避 100（外れ）・ダメージ 0 → 撃破 → ドロップ 5 個（成長の乱数はない）
    const rng = new SequenceRng([100, 0, 1, 0, 8, 1, 20]);
    const start = deepFreeze(battleState('necromancer', 1, { level: 12, exp: 1584, speed: 30, maxHp: 120, hp: 100 }));
    const r = resolveTurn(start, 'attack', rng);
    rng.assertExhausted();
    expect(r.state).toMatchObject({ level: 12, exp: 2584 });
    // クリアのあと宿屋へ戻って やすむ：成長 3 回分（15 個）で Lv15
    const inn = continueToInn(deepFreeze(r.state)).state;
    const growth = new SequenceRng(Array.from({ length: 3 * 5 }, (_, i) => [8, 2, 1, 1, 1][i % 5]));
    const rested = rest(inn, growth);
    growth.assertExhausted();
    expect(rested.state).toMatchObject({ level: 15, exp: 2584 });
    expect(rested.messages.filter((m) => m.effect === 'levelUp')).toHaveLength(3);
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
    // ボスの HP 1、プレイヤーが速い。経験値 1000 を足すだけ（レベルは やすむ まで上がらない）。
    // ドロップ：1（必ず）→ 部位 3（アクセ）→ 段階 8 → レアリティ 50（LG）→ 補正値の元 5 → 15
    const rng = new SequenceRng([100, 0, 1, 3, 8, 50, 5]);
    const r = resolveTurn(deepFreeze(battleState('necromancer', 1, { speed: 20 })), 'attack', rng);
    rng.assertExhausted();
    expect(r.state).toMatchObject({ location: 'CLEARED', dungeon: null, battle: null, level: 1, exp: 1000 });
    expect(r.state.records).toMatchObject({ kills: 1, bossKills: 1, laps: 2 });
    expect(r.state.inventory.items.at(-1)).toEqual({ id: 1, itemId: 'accessory8', rarity: 'LG', value: 15 });
    expect(r.messages.map((m) => m.effect).filter(Boolean)).toEqual(['bossDefeat', 'rareDrop', 'clear']);
    expect(r.messages.at(-1)).toEqual({ text: 'ダンジョンに 平和が もどった', tone: 'success', effect: 'clear' });
    expect(r.messages.at(-2)!.text).toBe('暗黒のネクロマンサーは ソロモンのゆびわ［LG］（こうげき +15 ぼうぎょ +15）を おとした！');
  });
});
