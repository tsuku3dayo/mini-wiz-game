import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { installFakeAudio, type FakeAudioContext, type FakeAudioState } from '../helpers/fake-audio';

type SoundModule = typeof import('../../src/audio/sound');

// sound.ts はモジュールの中に状態（共用の AudioContext など）を持つので、テストごとに読み込み直す
async function load(): Promise<SoundModule> {
  vi.resetModules();
  return import('../../src/audio/sound');
}

let state: FakeAudioState;
let uninstall: () => void;
beforeEach(() => {
  state = { contexts: [] };
  uninstall = installFakeAudio(state);
});
afterEach(() => {
  uninstall();
  vi.unstubAllGlobals();
});

const ctx = (): FakeAudioContext => state.contexts[0];
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('効果音', () => {
  test('TC-0032-09 encounter の合計は 680ms（13 個、頭は休符でない、矩形波だけ）', async () => {
    const s = await load();
    expect(s.sfxDuration('encounter')).toBe(680);
    expect(s.SFX.encounter).toHaveLength(13);
    expect(s.SFX.encounter[0].freq).toBeGreaterThan(0);
    expect(new Set(s.SFX.encounter.map((n) => n.wave))).toEqual(new Set(['square']));
  });

  test('TC-0032-19 8 種類の並びが仕様書 §25.2 の表と同じで、予約がすき間なく続き、休符はノードを作らず、音量は 0 → 0.08 → 0', async () => {
    const s = await load();
    const expected: Record<string, { wave: string; notes: [number, number][]; total: number }> = {
      levelUp: { wave: 'square', notes: [[523, 90], [659, 90], [784, 90], [1047, 240]], total: 510 },
      rareDrop: { wave: 'triangle', notes: Array(2).fill([[1319, 60], [1568, 60], [2093, 60]]).flat(), total: 360 },
      rareDropLG: { wave: 'triangle', notes: [...Array(4).fill([[1319, 60], [1568, 60], [2093, 60]]).flat(), [2093, 300]], total: 1020 },
      bossAppear: { wave: 'sawtooth', notes: [[98, 300], [104, 300], [98, 300], [92, 300]], total: 1200 },
      bossDefeat: { wave: 'square', notes: [1600, 1400, 1200, 1000, 850, 700, 550, 420, 300, 200].map((f) => [f, 50]), total: 500 },
      clear: { wave: 'square', notes: [[784, 150], [784, 150], [784, 150], [659, 450], [0, 100], [1047, 300], [784, 150], [1047, 900]], total: 2350 },
      toggle: { wave: 'square', notes: [[1047, 80]], total: 80 },
      encounter: {
        wave: 'square',
        notes: [...[220, 262, 311, 370, 440, 523, 622, 740].map((f): [number, number] => [f, 30]), [880, 60], [0, 40], [880, 60], [0, 40], [880, 240]],
        total: 680,
      },
    };
    expect(Object.keys(s.SFX).sort()).toEqual(Object.keys(expected).sort());
    for (const [name, e] of Object.entries(expected)) {
      const key = name as keyof typeof s.SFX;
      expect(s.SFX[key].map((n) => [n.freq, n.ms]), name).toEqual(e.notes);
      expect(s.sfxDuration(key), name).toBe(e.total);

      // 予約：currentTime を 10 秒にして鳴らす
      if (state.contexts.length === 0) s.audioContext();
      const ac = ctx();
      ac.currentTime = 10;
      const before = ac.oscillators.length;
      s.playSfx(key);
      const oscs = ac.oscillators.slice(before);
      const gains = ac.gains.slice(before);
      const sounding = e.notes.filter(([f]) => f > 0);
      expect(oscs, name).toHaveLength(sounding.length);
      let t = 10;
      let i = 0;
      for (const [freq, ms] of e.notes) {
        const len = ms / 1000;
        if (freq > 0) {
          const osc = oscs[i];
          const g = gains[i];
          expect(osc.type, name).toBe(e.wave);
          expect(osc.frequency.value, name).toBe(freq);
          expect(close(osc.startAt!, t), `${name} ${i} start`).toBe(true);
          expect(close(osc.stops[0]!, t + len), `${name} ${i} stop`).toBe(true);
          expect(osc.connected).toEqual([g]);
          expect(g.connected).toEqual([ac.destination]);
          const [a, b, c, d] = g.gain.events;
          expect(a[0]).toBe('set'); expect(a[1]).toBe(0); expect(close(a[2], t)).toBe(true);
          expect(b[0]).toBe('linear'); expect(b[1]).toBe(0.08); expect(close(b[2], t + 0.005)).toBe(true);
          expect(c[0]).toBe('set'); expect(c[1]).toBe(0.08); expect(close(c[2], t + len - 0.005)).toBe(true);
          expect(d[0]).toBe('linear'); expect(d[1]).toBe(0); expect(close(d[2], t + len)).toBe(true);
          i += 1;
        }
        t += len;
      }
    }
  });

  test('TC-0032-12 stopSfx で鳴っている効果音のノードがすべて stop され、残りが 0 になり、受け手に 0 が知らされる', async () => {
    const s = await load();
    const heard: number[] = [];
    s.onSfx((sec) => heard.push(sec));
    s.playSfx('levelUp');
    const ac = ctx();
    expect(s.sfxRemainingSec()).toBeCloseTo(0.51);
    ac.currentTime = 0.3;
    expect(s.sfxRemainingSec()).toBeCloseTo(0.21);
    s.stopSfx();
    expect(ac.oscillators.every((o) => o.stops.length === 2 && o.stops[1] === null)).toBe(true);
    expect(s.sfxRemainingSec()).toBe(0);
    expect(heard).toEqual([0.51, 0]);
    // 次の効果音を鳴らすときも、前の音を止めてから
    s.playSfx('toggle');
    s.playSfx('toggle');
    expect(ac.oscillators.at(-2)!.stops).toEqual([0.3 + 0.08, null]);
  });

  test('TC-0032-15 AudioContext も webkitAudioContext もないとき、audioContext は null で、鳴らす・止める・残りが例外を出さない（残りは 0）', async () => {
    uninstall();
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const s = await load();
    expect(s.audioContext()).toBeNull();
    expect(() => s.playSfx('encounter')).not.toThrow();
    expect(() => s.stopSfx()).not.toThrow();
    expect(s.sfxRemainingSec()).toBe(0);
    expect(() => s.sfx('levelUp', { muted: false })).not.toThrow();
  });

  test('TC-0032-17 suspended で作られると window に capture で 5 つの受け手が付き、入力のたびに resume。running で外れ、だめなら次の入力でもう一度。初めから running なら呼ばない', async () => {
    const target = new EventTarget();
    const added: [string, boolean][] = [];
    const add = target.addEventListener.bind(target);
    target.addEventListener = (type: string, fn: EventListenerOrEventListenerObject | null, opts?: boolean | AddEventListenerOptions) => {
      added.push([type, opts === true]);
      add(type, fn, opts);
    };
    vi.stubGlobal('window', target);
    state.initialState = 'suspended';
    const s = await load();
    s.audioContext();
    const ac = ctx();
    expect(added).toEqual(['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].map((t) => [t, true]));

    // Shift だけのキー：resume しても running にならない → 次の入力でまた呼ぶ
    target.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    expect(ac.resume).toHaveBeenCalledTimes(1);
    target.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    expect(ac.resume).toHaveBeenCalledTimes(2);

    // running になったら受け手が外れ、以後は呼ばない
    ac.resume.mockImplementation(async () => { ac.state = 'running'; });
    target.dispatchEvent(new Event('touchend'));
    await new Promise((r) => setTimeout(r, 0));
    expect(ac.resume).toHaveBeenCalledTimes(3);
    for (const type of ['click', 'keydown', 'pointerup']) target.dispatchEvent(new Event(type));
    await new Promise((r) => setTimeout(r, 0));
    expect(ac.resume).toHaveBeenCalledTimes(3);

    // 初めから running なら受け手を付けず、呼ばない
    added.length = 0;
    state.initialState = 'running';
    const s2 = await load();
    s2.audioContext();
    expect(added).toEqual([]);
    target.dispatchEvent(new Event('click'));
    expect(state.contexts[1].resume).not.toHaveBeenCalled();
  });

  test('TC-0037-04 encounter は遅れなしで鳴り始め（頭は休符でない）、1 秒以内に鳴り終わる', async () => {
    const s = await load();
    s.audioContext();
    const ac = ctx();
    ac.currentTime = 3.25;
    s.playSfx('encounter');
    const oscs = ac.oscillators;
    expect(oscs.length).toBeGreaterThan(0);
    expect(oscs[0].startAt).toBe(3.25);
    expect(s.SFX.encounter[0].freq).toBeGreaterThan(0);
    const last = Math.max(...oscs.map((o) => o.stops[0] ?? 0));
    expect(close(last, 3.25 + 0.68)).toBe(true);
    expect(last - 3.25).toBeLessThan(1);
  });
});
