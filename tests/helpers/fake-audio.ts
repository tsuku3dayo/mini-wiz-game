// 偽の AudioContext（仕様書 §26.11）。node の Vitest には Web Audio がないので、予約した内容を記録する
// currentTime はテストが進める。resume は vi.fn()
import { vi } from 'vitest';

/** [種類, 値, 時刻, 時定数（target のときだけ）] */
export type ParamEvent = ['set' | 'linear' | 'exp' | 'target' | 'cancel', number, number, number?];

export class FakeParam {
  value = 0;
  events: ParamEvent[] = [];
  setValueAtTime(v: number, t: number) { this.events.push(['set', v, t]); return this; }
  linearRampToValueAtTime(v: number, t: number) { this.events.push(['linear', v, t]); return this; }
  exponentialRampToValueAtTime(v: number, t: number) { this.events.push(['exp', v, t]); return this; }
  setTargetAtTime(v: number, t: number, tc: number) { this.events.push(['target', v, t, tc]); return this; }
  cancelScheduledValues(t: number) { this.events.push(['cancel', 0, t]); return this; }
}

class FakeNode {
  connected: unknown[] = [];
  disconnected = 0;
  connect(n: unknown) { this.connected.push(n); return n; }
  disconnect() { this.disconnected += 1; }
}

export class FakeOscillator extends FakeNode {
  type = 'sine';
  frequency = new FakeParam();
  startAt: number | null = null;
  /** stop() の呼び出し（引数なしは null） */
  stops: (number | null)[] = [];
  onended: (() => void) | null = null;
  start(t = 0) { this.startAt = t; }
  stop(t?: number) { this.stops.push(t ?? null); }
}

export class FakeGain extends FakeNode {
  gain = new FakeParam();
}

/** ノイズを鳴らす音源（打楽器） */
export class FakeBufferSource extends FakeNode {
  buffer: unknown = null;
  startAt: number | null = null;
  stops: (number | null)[] = [];
  start(t = 0) { this.startAt = t; }
  stop(t?: number) { this.stops.push(t ?? null); }
}

export class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
}

export interface FakeAudioState {
  /** 作るときの state（既定は running） */
  initialState?: AudioContextState;
  contexts: FakeAudioContext[];
}

export class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState;
  destination = { name: 'destination' };
  sampleRate = 48000;
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  sources: FakeBufferSource[] = [];
  filters: FakeFilter[] = [];
  buffers = 0;
  resume = vi.fn(async () => undefined);
  constructor(state: AudioContextState) { this.state = state; }
  createOscillator() { const o = new FakeOscillator(); this.oscillators.push(o); return o; }
  createGain() { const g = new FakeGain(); this.gains.push(g); return g; }
  createBufferSource() { const s = new FakeBufferSource(); this.sources.push(s); return s; }
  createBiquadFilter() { const f = new FakeFilter(); this.filters.push(f); return f; }
  createBuffer(_channels: number, length: number) {
    this.buffers += 1;
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

/** globalThis.AudioContext を偽物にする。戻り値で元に戻す */
export function installFakeAudio(state: FakeAudioState): () => void {
  const g = globalThis as Record<string, unknown>;
  const before = { AudioContext: g.AudioContext, webkitAudioContext: g.webkitAudioContext };
  g.AudioContext = class {
    constructor() {
      const ctx = new FakeAudioContext(state.initialState ?? 'running');
      state.contexts.push(ctx);
      return ctx;
    }
  };
  delete g.webkitAudioContext;
  return () => {
    g.AudioContext = before.AudioContext;
    g.webkitAudioContext = before.webkitAudioContext;
  };
}
