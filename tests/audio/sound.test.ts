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
  test('TC-0032-09 encounter の長さは 680ms で、出来事の終わりのいちばん遅いものと同じ。8 種類とも長さは v1.6 までと同じ', async () => {
    const s = await load();
    expect(s.sfxDuration('encounter')).toBe(680);
    const ms = { levelUp: 510, rareDrop: 360, rareDropLG: 1020, bossAppear: 1200, bossDefeat: 500, clear: 2350, toggle: 80, encounter: 680 };
    expect(s.SFX_MS).toEqual(ms);
    for (const [name, evs] of Object.entries(s.SFX)) {
      expect(Math.max(...evs.map((e) => e.at + e.len)), name).toBe(ms[name as keyof typeof ms]);
      expect(evs.every((e) => e.at >= 0 && e.len > 0 && e.f.length > 0), name).toBe(true);
    }
    expect(s.SFX.encounter[0].at).toBe(0);
  });

  test('TC-0032-19 8 種類の出来事（周波数・頭・長さ・音色・glide・ビブラート）が仕様書 §25.2 と同じで、FM の予約（ローパス・搬送波と変調波・止める時刻・音量）が §25.1 のとおり', async () => {
    const s = await load();
    // [周波数, 頭 ms, 長さ ms, 音色, glide, ビブラート]
    type Row = [number[], number, number, string, number, boolean];
    const Eb3 = 155.6, G3 = 196, C4 = 261.6;
    const sparkle = (times: number, lastMs: number): Row[] => {
      const total = times * 180 + lastMs;
      const rows: Row[] = Array.from({ length: times * 3 }, (_, k) => [[[Eb3, G3, C4][k % 3]], k * 60, Math.min(180, total - k * 60), '暗い鐘', 1, false]);
      if (lastMs) rows.push([[C4], total - lastMs, lastMs, '暗い鐘', 1, false]);
      return rows;
    };
    const expected: Record<string, Row[]> = {
      levelUp: [[[262], 0, 150, '沈んだ金管', 1, false], [[311], 90, 150, '沈んだ金管', 1, false], [[392], 180, 150, '沈んだ金管', 1, false], [[523], 270, 240, '沈んだ金管', 1, true]],
      rareDrop: sparkle(2, 0),
      rareDropLG: sparkle(4, 300),
      bossAppear: [[[98], 0, 300, '地の底のうなり', 1, false], [[104], 300, 300, '地の底のうなり', 1, false], [[98], 600, 300, '地の底のうなり', 1, false], [[92], 900, 300, '地の底のうなり', 1, true]],
      bossDefeat: [[[55], 0, 300, 'こもった太鼓', 0.5, false], [[196, 277.2], 0, 500, 'うなる低い金管', 0.5, false]],
      clear: [
        [[130.8, 196, 261.6, 311.1], 0, 800, '暗いオルガン', 1, false],
        [[130.8, 196], 0, 800, '低い声', 1, false],
        [[130.8, 196, 261.6, 329.6], 800, 1550, '暗いオルガン', 1, false],
        [[130.8, 164.8, 196], 800, 1550, '低い声', 1, false],
        [[65.4], 0, 2350, '低い声', 1, false],
      ],
      toggle: [[[523], 0, 80, '低い木の音', 1, false]],
      encounter: [[[110, 116.5], 0, 680, 'うなる低い金管', 1.14, false]],
    };
    expect(Object.keys(s.SFX).sort()).toEqual(Object.keys(expected).sort());
    // 音色 8 種の値（§25.2 のコード）
    const P = s.SE_PATCHES;
    expect(Object.keys(P)).toHaveLength(8);
    expect(P.沈んだ金管).toEqual({ name: '沈んだ金管', ratio: 1, index: 0.9, sustain: 0.5, idecay: 0.08, attack: 0.02, adecay: 0.5, asus: 0.75, lowpass: 1300, vol: 0.24 });
    expect(P.地の底のうなり).toEqual({ name: '地の底のうなり', ratio: 1, index: 1.8, sustain: 0.7, idecay: 0.5, attack: 0.06, adecay: 1.5, asus: 0.9, lowpass: 600, vol: 0.34 });
    expect(P.低い木の音).toEqual({ name: '低い木の音', ratio: 1, index: 0.8, sustain: 0, idecay: 0.02, attack: 0.004, adecay: 0.035, asus: 0, lowpass: 1000, vol: 0.28 });
    expect(P.うなる低い金管).toEqual({ name: 'うなる低い金管', ratio: 1, index: 1.8, sustain: 0.7, idecay: 0.4, attack: 0.03, adecay: 0.8, asus: 0.8, lowpass: 700, vol: 0.22 });
    expect(P.暗い鐘).toEqual({ name: '暗い鐘', ratio: 3, index: 0.8, sustain: 0, idecay: 0.15, attack: 0.003, adecay: 0.45, asus: 0, lowpass: 1500, vol: 0.22 });
    expect(P.こもった太鼓).toEqual({ name: 'こもった太鼓', ratio: 1, index: 2, sustain: 0, idecay: 0.02, attack: 0.002, adecay: 0.08, asus: 0, lowpass: 400, vol: 0.55 });
    expect(P.暗いオルガン).toEqual({ name: '暗いオルガン', ratio: 2, index: 0.5, sustain: 0.9, idecay: 1, attack: 0.15, adecay: 2, asus: 0.9, lowpass: 1100, vol: 0.11 });
    expect(P.低い声).toEqual({ name: '低い声', ratio: 1, index: 0.6, sustain: 0.8, idecay: 0.6, attack: 0.08, adecay: 1.2, asus: 0.85, lowpass: 900, vol: 0.12 });

    for (const [name, rows] of Object.entries(expected)) {
      const key = name as keyof typeof s.SFX;
      expect(s.SFX[key].map((e): Row => [[...e.f], e.at, e.len, e.patch.name, e.glide ?? 1, e.vib ?? false]), name).toEqual(rows);

      // 予約：currentTime を 10 秒にして鳴らす
      if (state.contexts.length === 0) s.audioContext();
      const ac = ctx();
      ac.currentTime = 10;
      const o0 = ac.oscillators.length, g0 = ac.gains.length, f0 = ac.filters.length;
      s.playSfx(key);
      const oscs = ac.oscillators.slice(o0), gains = ac.gains.slice(g0), filters = ac.filters.slice(f0);
      const end = 10 + s.sfxDuration(key) / 1000;
      // 出来事ごとにローパスが 1 つ、destination へ
      expect(filters, name).toHaveLength(rows.length);
      let oi = 0, gi = 0;
      rows.forEach(([fs, at, len, , glide, vib], ei) => {
        const lp = filters[ei];
        const patch = s.SFX[key][ei].patch;
        expect(lp.type).toBe('lowpass');
        expect(lp.frequency.value).toBe(patch.lowpass);
        expect(lp.Q.value).toBe(0.7);
        expect(lp.connected).toEqual([ac.destination]);
        const t = 10 + at / 1000;
        const stop = Math.min(end, t + len / 1000);
        for (const f of fs) {
          // 1 音：搬送波・変調波・変調の深さ・音量（・ビブラートの LFO と深さ）
          const [carrier, mod] = [oscs[oi], oscs[oi + 1]];
          const [mg, g] = [gains[gi], gains[gi + 1]];
          expect(carrier.frequency.events[0], `${name} ${ei}`).toEqual(['set', f, t]);
          expect(mod.frequency.events[0]).toEqual(['set', f * patch.ratio, t]);
          if (glide !== 1) {
            expect(carrier.frequency.events[1][0]).toBe('exp');
            expect(close(carrier.frequency.events[1][1], f * glide)).toBe(true);
            expect(close(carrier.frequency.events[1][2], stop)).toBe(true);
          } else expect(carrier.frequency.events).toHaveLength(1);
          expect(mod.connected).toEqual([mg]);
          expect(mg.connected).toEqual([carrier.frequency]);
          expect(mg.gain.events[0]).toEqual(['set', patch.index * f * patch.ratio, t]);
          expect(carrier.connected).toEqual([g]);
          expect(g.connected).toEqual([lp]);
          const vol = patch.vol / Math.sqrt(fs.length);
          expect(g.gain.events[0]).toEqual(['set', 0, t]);
          expect(g.gain.events[1][0]).toBe('linear');
          expect(close(g.gain.events[1][1], vol)).toBe(true);
          for (const n of [carrier, mod]) {
            expect(close(n.startAt!, t), `${name} ${ei} start`).toBe(true);
            expect(close(n.stops[0]!, stop), `${name} ${ei} stop`).toBe(true);
          }
          oi += 2;
          gi += 2;
          if (vib) {
            expect(oscs[oi].frequency.value).toBe(5.5);
            expect(close(oscs[oi].stops[0]!, stop)).toBe(true);
            oi += 1;
            gi += 1;
          }
        }
      });
      expect(oscs, name).toHaveLength(oi);
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
    // 1 回目の toggle の搬送波・変調波（1 音 = 2 つ）は、2 回目の前に止まっている
    expect(ac.oscillators.at(-4)!.stops).toEqual([0.3 + 0.08, null]);
    expect(ac.oscillators.at(-3)!.stops).toEqual([0.3 + 0.08, null]);
    expect(ac.oscillators.at(-2)!.stops).toEqual([0.3 + 0.08]);
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
    expect(s.SFX.encounter[0].at).toBe(0);
    const last = Math.max(...oscs.map((o) => o.stops[0] ?? 0));
    expect(close(last, 3.25 + 0.68)).toBe(true);
    expect(last - 3.25).toBeLessThan(1);
  });
});
