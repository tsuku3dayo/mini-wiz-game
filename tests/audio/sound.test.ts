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
  test('TC-0032-09 encounter の長さは 510ms で、出来事の終わりのいちばん遅いものと同じ。8 種類とも長さが SFX_MS で、6 秒以内・20〜2,000 Hz', async () => {
    const s = await load();
    expect(s.sfxDuration('encounter')).toBe(510);
    const ms = { levelUp: 1071, rareDrop: 360, rareDropLG: 1020, bossAppear: 2906, bossDefeat: 1000, clear: 5833, toggle: 80, encounter: 510 };
    expect(s.SFX_MS).toEqual(ms);
    for (const [name, evs] of Object.entries(s.SFX)) {
      expect(Math.max(...evs.map((e) => e.at + e.len)), name).toBe(ms[name as keyof typeof ms]);
      expect(evs.every((e) => e.at >= 0 && e.len > 0 && e.f.length > 0), name).toBe(true);
      expect(evs.every((e) => e.f.every((f) => f >= 20 && f <= 2000)), name).toBe(true);
      expect(ms[name as keyof typeof ms], name).toBeLessThanOrEqual(6000);
    }
    expect(s.SFX.encounter[0].at).toBe(0);
  });

  test('TC-0032-21 演出の付く 4 つの音の長さ（SFX_MS）が演出の長さ（EFFECT_MS）と同じ。UR・LG は演出の長さ以下', async () => {
    const s = await load();
    const { EFFECT_MS, RARE_DROP_LG_MS } = await import('../../src/logic/message-plan');
    for (const name of ['levelUp', 'bossAppear', 'bossDefeat', 'clear'] as const) expect(s.SFX_MS[name], name).toBe(EFFECT_MS[name]);
    expect(s.SFX_MS).toMatchObject({ levelUp: 1071, bossAppear: 2906, bossDefeat: 1000, clear: 5833 });
    expect(s.SFX_MS.rareDrop).toBeLessThanOrEqual(EFFECT_MS.rareDrop);
    expect(s.SFX_MS.rareDropLG).toBeLessThanOrEqual(RARE_DROP_LG_MS);
  });

  test('TC-0032-22 createDynamicsCompressor がない・例外のときも、例外を出さず、ローパスが destination に直接つながって鳴る', async () => {
    for (const mode of ['none', 'throw'] as const) {
      state.compressor = mode;
      const s = await load();
      expect(() => s.playSfx('bossAppear'), mode).not.toThrow();
      const ac = state.contexts.at(-1)!;
      expect(ac.compressors, mode).toHaveLength(0);
      expect(ac.filters.length, mode).toBe(s.SFX.bossAppear.length);
      expect(ac.filters.every((f) => f.connected.length === 1 && f.connected[0] === ac.destination), mode).toBe(true);
      expect(ac.oscillators.length, mode).toBeGreaterThan(0);
    }
  });

  test('TC-0032-19 8 種類の出来事（周波数・頭・長さ・音色・glide・ビブラート・音量の倍率）が仕様書 §25.2 と同じで、FM の予約（出口のコンプレッサー・ローパス・搬送波と変調波・止める時刻・音量・フェード）が §25.1 のとおり', async () => {
    const s = await load();
    // [周波数, 頭 ms, 長さ ms, 音色, glide, ビブラート, 音量の倍率]
    type Row = [number[], number, number, string, number, boolean, number];
    const Eb3 = 155.6, G3 = 196, C4 = 261.6;
    const r = (f: number[], at: number, len: number, patch: string, o: { glide?: number; vib?: boolean; gain?: number } = {}): Row =>
      [f, at, len, patch, o.glide ?? 1, o.vib ?? false, o.gain ?? 1];
    const sparkle = (times: number, lastMs: number): Row[] => {
      const total = times * 180 + lastMs;
      const rows: Row[] = Array.from({ length: times * 3 }, (_, k) => r([[Eb3, G3, C4][k % 3]], k * 60, Math.min(180, total - k * 60), '暗い鐘'));
      if (lastMs) rows.push(r([C4], total - lastMs, lastMs, '暗い鐘'));
      return rows;
    };
    const 金管 = '沈んだ金管', 鐘 = '暗い鐘', オルガン = '暗いオルガン', 声 = '低い声', ひびく = 'ひびくオルガン';
    const expected: Record<string, Row[]> = {
      levelUp: [
        r([261.6, 311.1], 0, 182, 金管, { gain: 1.2 }),
        r([293.7, 349.2], 214, 182, 金管, { gain: 1.2 }),
        r([311.1, 392], 429, 642, 金管, { vib: true, gain: 1.2 }),
        r([392], 429, 286, 鐘, { gain: 0.8 }),
        r([523.3], 571, 286, 鐘, { gain: 0.8 }),
        r([622.3], 714, 357, 鐘, { gain: 0.8 }),
      ],
      rareDrop: sparkle(2, 0),
      rareDropLG: sparkle(4, 300),
      bossAppear: [
        r([370], 0, 141, ひびく), r([311.1], 94, 141, ひびく), r([261.6], 188, 141, ひびく), r([220], 281, 141, ひびく),
        r([185], 375, 141, ひびく), r([155.6], 469, 141, ひびく), r([130.8], 563, 93, ひびく),
        r([65.4, 130.8, 155.6, 185, 220], 656, 2250, ひびく, { vib: true, gain: 1.4 }),
        r([65.4], 656, 2250, 声),
        r([55], 656, 900, 'こもった太鼓', { glide: 0.5 }),
      ],
      bossDefeat: [
        r([261.6], 0, 200, 鐘), r([311.1], 100, 200, 鐘), r([392], 200, 200, 鐘), r([523.3], 300, 100, 鐘),
        r([311.1, 392, 523.3], 400, 600, 鐘),
        r([130.8, 196], 400, 600, オルガン),
      ],
      clear: [
        r([130.8, 196, 261.6, 311.1], 0, 833, オルガン, { gain: 1.2 }),
        r([103.8, 207.7, 261.6, 311.1], 833, 834, オルガン, { gain: 1.2 }),
        r([87.3, 174.6, 207.7, 261.6], 1667, 833, オルガン, { gain: 1.2 }),
        r([98, 196, 246.9, 293.7], 2500, 833, オルガン, { gain: 1.2 }),
        r([130.8, 196, 261.6, 329.6], 3333, 2500, オルガン, { gain: 1.2 }),
        r([65.4], 0, 833, 声), r([51.9], 833, 834, 声), r([43.7], 1667, 833, 声), r([49], 2500, 833, 声), r([65.4], 3333, 2500, 声),
        r([261.6], 3333, 833, 鐘), r([392], 3611, 833, 鐘), r([523.3], 3889, 1944, 鐘),
      ],
      toggle: [r([523], 0, 80, '低い木の音')],
      encounter: [r([262], 0, 150, 金管), r([311], 90, 150, 金管), r([392], 180, 150, 金管), r([523], 270, 240, 金管, { vib: true })],
    };
    expect(Object.keys(s.SFX).sort()).toEqual(Object.keys(expected).sort());
    // 音色 9 種の値（§25.2 のコード）
    const P = s.SE_PATCHES;
    expect(Object.keys(P)).toHaveLength(9);
    expect(P.ひびくオルガン).toEqual({ name: 'ひびくオルガン', ratio: 2, index: 0.7, sustain: 0.9, idecay: 1, attack: 0.01, adecay: 2, asus: 0.9, lowpass: 1400, vol: 0.12 });
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
      expect(s.SFX[key].map((e): Row => [[...e.f], e.at, e.len, e.patch.name, e.glide ?? 1, e.vib ?? false, e.gain ?? 1]), name).toEqual(rows);

      // 予約：currentTime を 10 秒にして鳴らす
      if (state.contexts.length === 0) s.audioContext();
      const ac = ctx();
      ac.currentTime = 10;
      const o0 = ac.oscillators.length, g0 = ac.gains.length, f0 = ac.filters.length;
      s.playSfx(key);
      const oscs = ac.oscillators.slice(o0), gains = ac.gains.slice(g0), filters = ac.filters.slice(f0);
      const end = 10 + s.sfxDuration(key) / 1000;
      // 効果音の出口：コンプレッサーが 1 つだけ（threshold −12・ratio 4）、destination へ
      expect(ac.compressors).toHaveLength(1);
      const comp = ac.compressors[0];
      expect(comp.threshold.value).toBe(-12);
      expect(comp.ratio.value).toBe(4);
      expect(comp.connected).toEqual([ac.destination]);
      // 出来事ごとにローパスが 1 つ、出口へ
      expect(filters, name).toHaveLength(rows.length);
      let oi = 0, gi = 0;
      rows.forEach(([fs, at, len, , glide, vib, gain], ei) => {
        const lp = filters[ei];
        const patch = s.SFX[key][ei].patch;
        expect(lp.type).toBe('lowpass');
        expect(lp.frequency.value).toBe(patch.lowpass);
        expect(lp.Q.value).toBe(0.7);
        expect(lp.connected).toEqual([comp]);
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
          const vol = (patch.vol * gain) / Math.sqrt(fs.length);
          expect(g.gain.events[0]).toEqual(['set', 0, t]);
          expect(g.gain.events[1][0]).toBe('linear');
          expect(close(g.gain.events[1][1], vol)).toBe(true);
          // 終わりのフェード：min(0.03, 長さ / 3)
          const fade = Math.min(0.03, (stop - t) / 3);
          const last = g.gain.events.at(-1)!;
          expect(last[0]).toBe('target');
          expect(last[1]).toBe(0);
          expect(close(last[2], stop - fade * 2), `${name} ${ei} fade`).toBe(true);
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
    s.playSfx('encounter'); // 0.51 秒（v1.10。v1.9 までの levelUp と同じ音）
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
    expect(close(last, 3.25 + 0.51)).toBe(true);
    expect(last - 3.25).toBeLessThan(1);
  });
});
