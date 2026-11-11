import { describe, expect, test } from 'vitest';
import { createGameApi } from '../../src/api/game-api';
import { SeededRng, SwappableRng } from '../../src/domain/rng';
import { play } from '../helpers/autoplayer';
import { createFakeStorage } from '../helpers/fake-storage';

/** シード 2026 の通しプレイ用のゲーム API */
function setup() {
  const store = createFakeStorage();
  const api = createGameApi({ store, rng: new SwappableRng(new SeededRng(2026)), now: () => '2026-11-02T00:00:00.000Z' });
  return { api, store };
}

describe('通しプレイ（自動プレイヤー）', () => {
  test('TC-0024-05 シード 2026 からボスを倒すまで遊ぶと CLEARED。セーブの実績・Lv がプレイ中状態と同じ（宿屋で やすむ ので育つ）', async () => {
    const { api, store } = setup();
    const r = await play(api, 'ゆうしゃ', { laps: 1 });
    expect(r.final.location).toBe('CLEARED');
    // レベルは やすむ でだけ上がる（v1.14）。自動プレイヤーはボスに Lv9 以上で挑む
    expect(r.bossLevels[0]).toBeGreaterThanOrEqual(9);
    const game = JSON.parse(store.raw('game')!);
    // 一度もセーブしていないので、自動セーブは最初の空き（スロット 1）に書く（v1.14）
    expect(game.saveSlot).toBe(1);
    const save = JSON.parse(store.raw('save-1')!);
    expect(save.records).toEqual(game.records);
    expect(save.level).toBe(game.level);
    expect(game.records).toMatchObject({ laps: 2, bossKills: 1 });
    expect(r.drops).toBeGreaterThan(0);
  }, 120_000);

  test('TC-0025-03 2 周遊ぶと、2 周目の出発で新しい 5 階層（1F の入口に北向き）、ボスをまた倒して laps 3・bossKills 2', async () => {
    const { api, store } = setup();
    // 1 周目：ボスを倒すまで。クリアのあとはダンジョンがない
    await play(api, 'ゆうしゃ', { laps: 1 });
    expect((await api.getGame()).state!.dungeon).toBeNull();
    // 2 周目の出発：新しい 5 階層の 1F の入口に北向き
    await api.continueGame();
    const entered = await api.enterDungeon();
    const d = await api.debugDungeon();
    expect(entered.state.dungeon!.floor).toBe(1);
    expect(d.player).toEqual({ ...d.up, facing: 'N' });
    expect(d.boss).toBeNull(); // 1F にボスはいない（5F にまた現れる）
    // 続きから 2 周目のボスを倒す
    const r = await play(api, 'ゆうしゃ', { laps: 1, resume: true });
    expect(r.final.location).toBe('CLEARED');
    expect(JSON.parse(store.raw('game')!).records).toMatchObject({ laps: 3, bossKills: 2 });
  }, 120_000);
});
