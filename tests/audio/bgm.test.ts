import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { BGM, loopSec } from '../../src/logic/bgm-tracks';
import { installFakeAudio, type FakeAudioContext, type FakeAudioState, type FakeGain } from '../helpers/fake-audio';

type Bgm = typeof import('../../src/audio/bgm');
type Sound = typeof import('../../src/audio/sound');

// bgm.ts・sound.ts はモジュールの中に状態を持つので、テストごとに読み込み直す（見回りは偽のタイマーで進める）
async function load(): Promise<{ b: Bgm; s: Sound }> {
  vi.resetModules();
  const s = await import('../../src/audio/sound');
  const b = await import('../../src/audio/bgm');
  return { b, s };
}

let state: FakeAudioState;
let uninstall: () => void;
beforeEach(() => {
  vi.useFakeTimers();
  state = { contexts: [] };
  uninstall = installFakeAudio(state);
});
afterEach(() => {
  vi.useRealTimers();
  uninstall();
});

const ctx = (): FakeAudioContext => state.contexts[0];
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
/** 鳴らす音源（発振器・ノイズ）の頭の時刻 */
const starts = (ac: FakeAudioContext, from = 0) => [...ac.oscillators.slice(from), ...ac.sources].map((n) => n.startAt!).filter((t) => t !== null);
const bus = (ac: FakeAudioContext): FakeGain => ac.gains.find((g) => g.connected.includes(ac.destination))!;
/** 曲ごとの出力（bus につながる gain）を作った順に */
const outs = (ac: FakeAudioContext): FakeGain[] => ac.gains.filter((g) => g.connected.includes(bus(ac)));

describe('BGM の再生エンジン', () => {
  test('TC-0034-02 playBgm で 1 周分が「今 + 0.05」から予約され、次の周の頭の 1 秒前を切った見回りで、その頭から次の周がすき間なく予約される', async () => {
    const { b } = await load();
    b.playBgm('title');
    const ac = ctx();
    const loop = loopSec(BGM.title);
    const first = starts(ac).sort((x, y) => x - y);
    expect(close(first[0], 0.05)).toBe(true);
    expect(first.every((t) => t < 0.05 + loop)).toBe(true);
    const nextStart = 0.05 + loop;
    const count = ac.oscillators.length;

    // 1 秒前より手前の見回りでは予約しない
    ac.currentTime = nextStart - 1.01;
    vi.advanceTimersByTime(250);
    expect(ac.oscillators.length).toBe(count);
    // 1 秒前を切ると、nextStart から次の周（1 周目と同じ並びを loop 秒ずらしたもの）
    ac.currentTime = nextStart - 0.99;
    vi.advanceTimersByTime(250);
    const second = ac.oscillators.slice(count).map((o) => o.startAt!).sort((x, y) => x - y);
    const firstOsc = ac.oscillators.slice(0, count).map((o) => o.startAt!).sort((x, y) => x - y);
    expect(second).toHaveLength(firstOsc.length);
    expect(close(second[0], nextStart)).toBe(true);
    expect(second.every((t, i) => close(t, firstOsc[i] + loop))).toBe(true);
    expect(b.currentBgm()).toBe('title');
    expect(b.liveVoiceCount()).toBeGreaterThan(0);
  });

  test('TC-0034-07 鳴っている曲と同じ名前で playBgm を呼んでも、ノードが増えず、out にフェードが予約されない', async () => {
    const { b } = await load();
    b.playBgm('inn');
    const ac = ctx();
    const count = ac.oscillators.length + ac.sources.length;
    ac.currentTime = 3;
    b.playBgm('inn');
    expect(ac.oscillators.length + ac.sources.length).toBe(count);
    expect(outs(ac)).toHaveLength(1);
    expect(outs(ac)[0].gain.events).toEqual([]);
  });

  test('TC-0034-09 違う曲で playBgm を呼ぶと、前の out を 0.3 秒でフェードアウトし、前のノードを今 + 0.32 で止め、0.4 秒後に外す。新しい曲は新しい out で頭から', async () => {
    const { b } = await load();
    b.playBgm('title');
    const ac = ctx();
    const oldCount = ac.oscillators.length;
    const oldSources = ac.sources.length;
    ac.currentTime = 2;
    b.playBgm('inn');
    const [oldOut, newOut] = outs(ac);
    expect(oldOut.gain.events).toEqual([['cancel', 0, 2], ['set', 1, 2], ['linear', 0, 2.3]]);
    expect(ac.oscillators.slice(0, oldCount).every((o) => o.stops.at(-1) === 2.32)).toBe(true);
    expect(ac.sources.slice(0, oldSources).every((o) => o.stops.at(-1) === 2.32)).toBe(true);
    expect(oldOut.disconnected).toBe(0);
    vi.advanceTimersByTime(400);
    expect(oldOut.disconnected).toBe(1);
    expect(newOut).not.toBe(oldOut);
    expect(newOut.gain.events).toEqual([]);
    const fresh = ac.oscillators.slice(oldCount).map((o) => o.startAt!);
    expect(close(Math.min(...fresh), 2.05)).toBe(true);
    expect(b.currentBgm()).toBe('inn');
  });

  test('TC-0034-10 startAfterSec だけ始まりを遅らせる：battle 0.68 は今 + 0.05 + 0.68、title 0.08 は今 + 0.05 + 0.08', async () => {
    const { b } = await load();
    b.playBgm('battle', 0.68);
    expect(close(Math.min(...starts(ctx())), 0.73)).toBe(true);
    uninstall();
    state = { contexts: [] };
    uninstall = installFakeAudio(state);
    const again = await load();
    again.b.playBgm('title', 0.08);
    expect(close(Math.min(...starts(ctx())), 0.13)).toBe(true);
  });

  test('TC-0034-17 効果音を鳴らすと bus を 0.0105 に下げ、効果音の長さのあと 0.035 に戻す。重なれば遅いほうまで。止めたらすぐ戻す', async () => {
    const { b, s } = await load();
    b.playBgm('dungeon');
    const ac = ctx();
    const g = bus(ac).gain;
    expect(bus(ac).gain.value).toBe(0.035);
    ac.currentTime = 1;
    s.playSfx('levelUp');
    expect(g.events).toEqual([['cancel', 0, 1], ['target', 0.0105, 1, 0.02], ['target', 0.035, 1.51, 0.02]]);
    // 前の効果音（1.51 まで）の途中で、短い効果音（0.36 秒）
    g.events = [];
    ac.currentTime = 1.1;
    s.playSfx('rareDrop');
    expect(g.events).toEqual([['cancel', 0, 1.1], ['target', 0.0105, 1.1, 0.02], ['target', 0.035, 1.51, 0.02]]);
    // 止めたらすぐ戻す
    g.events = [];
    ac.currentTime = 1.2;
    s.stopSfx();
    expect(g.events).toEqual([['cancel', 0, 1.2], ['target', 0.035, 1.2, 0.02]]);
  });

  test('TC-0034-19 stopBgm で見回りが止まり、今の曲が 0.3 秒でフェードアウトする。始まりを遅らせて待っている曲も鳴らない', async () => {
    const { b } = await load();
    b.playBgm('boss');
    const ac = ctx();
    const count = ac.oscillators.length;
    ac.currentTime = 1;
    b.stopBgm();
    expect(outs(ac)[0].gain.events).toEqual([['cancel', 0, 1], ['set', 1, 1], ['linear', 0, 1.3]]);
    expect(ac.oscillators.every((o) => o.stops.at(-1) === 1.32)).toBe(true);
    expect(b.currentBgm()).toBeNull();
    // 次の周の頭を過ぎても、見回りが予約しない
    ac.currentTime = 0.05 + loopSec(BGM.boss) + 1;
    vi.advanceTimersByTime(2000);
    expect(ac.oscillators.length).toBe(count);

    // 2 秒遅らせて待っている曲を止めると、すべて頭より前に止まる（鳴らない）
    ac.currentTime = 50;
    b.playBgm('battle', 2);
    const waiting = [...ac.oscillators.slice(count), ...ac.sources.filter((src) => src.startAt! >= 50)];
    b.stopBgm();
    expect(waiting.length).toBeGreaterThan(0);
    expect(waiting.every((n) => n.stops.at(-1)! < n.startAt!)).toBe(true);
  });
});
