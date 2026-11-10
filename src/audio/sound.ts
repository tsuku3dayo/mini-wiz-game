// 効果音（仕様書 §12.1、§25、TD-0005 §1）。Web Audio でその場で合成する（FM 音源風。v1.7）。音声ファイルは使わない
// 効果音と BGM は 1 つの AudioContext を共用する。音の機能がなくても、例外は外に出さない（音なしで遊べる）

export type SfxName = 'levelUp' | 'rareDrop' | 'rareDropLG' | 'bossAppear' | 'bossDefeat' | 'clear' | 'toggle' | 'encounter';

/** 効果音の FM の音色（2 オペレーター。BGM の FmPatch と同じ考え方で、ローパスと音量を持つ） */
export interface SePatch {
  name: string;
  /** 変調波の周波数 ÷ 搬送波 */
  ratio: number;
  /** 変調の深さ（はじめ） */
  index: number;
  /** index の行き先（はじめの何倍か） */
  sustain: number;
  /** index が落ちる時定数（秒） */
  idecay: number;
  /** 音量の立ち上がり（秒） */
  attack: number;
  /** 音量が落ちる時定数（秒） */
  adecay: number;
  /** 音量の行き先（何倍か） */
  asus: number;
  /** 高い音を削る（ローパス）周波数（Hz） */
  lowpass: number;
  /** 音量（1 音） */
  vol: number;
}

/** 効果音の 1 つの音（f が 2 つ以上なら和音）。at・len は ms */
export interface SfxEvent {
  f: readonly number[];
  at: number;
  len: number;
  patch: SePatch;
  /** 音の長さのあいだに、高さを何倍まで動かすか（なければ動かさない） */
  glide?: number;
  /** ゆれ（ビブラート）を付ける */
  vib?: boolean;
  /** 音量の倍率（なければ 1。v1.10） */
  gain?: number;
}

const se = (name: string, p: Omit<SePatch, 'name'>): SePatch => ({ name, ...p });

/** 音色の一覧（9 種。v1.10 で「ひびくオルガン」を足した） */
export const SE_PATCHES = {
  沈んだ金管: se('沈んだ金管', { ratio: 1, index: 0.9, sustain: 0.5, idecay: 0.08, attack: 0.02, adecay: 0.5, asus: 0.75, lowpass: 1300, vol: 0.24 }),
  地の底のうなり: se('地の底のうなり', { ratio: 1, index: 1.8, sustain: 0.7, idecay: 0.5, attack: 0.06, adecay: 1.5, asus: 0.9, lowpass: 600, vol: 0.34 }),
  低い木の音: se('低い木の音', { ratio: 1, index: 0.8, sustain: 0, idecay: 0.02, attack: 0.004, adecay: 0.035, asus: 0, lowpass: 1000, vol: 0.28 }),
  うなる低い金管: se('うなる低い金管', { ratio: 1, index: 1.8, sustain: 0.7, idecay: 0.4, attack: 0.03, adecay: 0.8, asus: 0.8, lowpass: 700, vol: 0.22 }),
  暗い鐘: se('暗い鐘', { ratio: 3, index: 0.8, sustain: 0, idecay: 0.15, attack: 0.003, adecay: 0.45, asus: 0, lowpass: 1500, vol: 0.22 }),
  こもった太鼓: se('こもった太鼓', { ratio: 1, index: 2, sustain: 0, idecay: 0.02, attack: 0.002, adecay: 0.08, asus: 0, lowpass: 400, vol: 0.55 }),
  暗いオルガン: se('暗いオルガン', { ratio: 2, index: 0.5, sustain: 0.9, idecay: 1, attack: 0.15, adecay: 2, asus: 0.9, lowpass: 1100, vol: 0.11 }),
  低い声: se('低い声', { ratio: 1, index: 0.6, sustain: 0.8, idecay: 0.6, attack: 0.08, adecay: 1.2, asus: 0.85, lowpass: 900, vol: 0.12 }),
  ひびくオルガン: se('ひびくオルガン', { ratio: 2, index: 0.7, sustain: 0.9, idecay: 1, attack: 0.01, adecay: 2, asus: 0.9, lowpass: 1400, vol: 0.12 }),
} satisfies Record<string, SePatch>;
const S = SE_PATCHES;

const ev = (f: number | readonly number[], at: number, len: number, patch: SePatch, opts: { glide?: number; vib?: boolean; gain?: number } = {}): SfxEvent =>
  ({ f: typeof f === 'number' ? [f] : f, at, len, patch, ...opts });

/** 音を順に続けて並べる（[周波数, 長さ ms]。0 は休符）。tail ms だけ次の音に重ねて響かせる（並びの終わりは越えない） */
function seq(notes: readonly (readonly [number, number])[], patch: SePatch, tail: number, vibLast: boolean): SfxEvent[] {
  const total = notes.reduce((s, [, ms]) => s + ms, 0);
  const out: SfxEvent[] = [];
  let at = 0;
  notes.forEach(([f, ms], i) => {
    const last = i === notes.length - 1;
    if (f > 0) out.push(ev(f, at, Math.min(ms + tail, total - at), patch, last && vibLast ? { vib: true } : {}));
    at += ms;
  });
  return out;
}

/** ドロップの分散和音：3 音 × times 回（1 音 60ms、180ms まで響かせる）。lastMs があれば最後に 3 音目を長く */
function sparkle(notes: readonly number[], times: number, lastMs: number): SfxEvent[] {
  const total = times * notes.length * 60 + lastMs;
  const out: SfxEvent[] = [];
  for (let k = 0; k < times * notes.length; k++) out.push(ev(notes[k % notes.length], k * 60, Math.min(180, total - k * 60), S.暗い鐘));
  if (lastMs > 0) out.push(ev(notes[notes.length - 1], total - lastMs, lastMs, S.暗い鐘));
  return out;
}

// 音の高さ（Hz）
const F1 = 43.7, G1 = 49, Ab1 = 51.9, A1 = 55, C2 = 65.4, F2 = 87.3, G2 = 98, Ab2 = 103.8;
const C3 = 130.8, Eb3 = 155.6, F3 = 174.6, Gb3 = 185, G3 = 196, Ab3 = 207.7, A3 = 220, B3 = 246.9;
const C4 = 261.6, D4 = 293.7, Eb4 = 311.1, E4 = 329.6, F4 = 349.2, Gb4 = 370, G4 = 392, C5 = 523.3, Eb5 = 622.3;

/** 効果音の長さ（ms）。演出の付く音は、演出の長さ（message-plan の EFFECT_MS）と同じ（v1.10） */
export const SFX_MS: Readonly<Record<SfxName, number>> = {
  levelUp: 1071,
  rareDrop: 360,
  rareDropLG: 1020,
  bossAppear: 2906,
  bossDefeat: 1000,
  clear: 5833,
  toggle: 80,
  encounter: 510,
};

/** 8 種類の音（仕様書 §25.2 のコードのとおり。オーナーが試聴ページで選んだもの：2026-11-06・2026-11-10） */
export const SFX: Readonly<Record<SfxName, readonly SfxEvent[]>> = {
  // 小さなファンファーレ（v1.10）：沈んだ金管が 3 つの和音で上がり、暗い鐘が答える
  levelUp: [
    ev([C4, Eb4], 0, 182, S.沈んだ金管, { gain: 1.2 }),
    ev([D4, F4], 214, 182, S.沈んだ金管, { gain: 1.2 }),
    ev([Eb4, G4], 429, 642, S.沈んだ金管, { vib: true, gain: 1.2 }),
    ev(G4, 429, 286, S.暗い鐘, { gain: 0.8 }),
    ev(C5, 571, 286, S.暗い鐘, { gain: 0.8 }),
    ev(Eb5, 714, 357, S.暗い鐘, { gain: 0.8 }),
  ],
  // 低い音 2：ミ♭・ソ・ドの分散和音（3 オクターブ下）
  rareDrop: sparkle([Eb3, G3, C4], 2, 0),
  rareDropLG: sparkle([Eb3, G3, C4], 4, 300),
  // オルガンの不協和音（v1.10）：オルガンが駆け下り、減七の和音を鳴らし続ける。下で低い声と太鼓
  bossAppear: [
    ev(Gb4, 0, 141, S.ひびくオルガン),
    ev(Eb4, 94, 141, S.ひびくオルガン),
    ev(C4, 188, 141, S.ひびくオルガン),
    ev(A3, 281, 141, S.ひびくオルガン),
    ev(Gb3, 375, 141, S.ひびくオルガン),
    ev(Eb3, 469, 141, S.ひびくオルガン),
    ev(C3, 563, 93, S.ひびくオルガン),
    ev([C2, C3, Eb3, Gb3, A3], 656, 2250, S.ひびくオルガン, { vib: true, gain: 1.4 }),
    ev(C2, 656, 2250, S.低い声),
    ev(A1, 656, 900, S.こもった太鼓, { glide: 0.5 }),
  ],
  // 暗い鐘のきらめき（v1.10）：暗い鐘がド・ミ♭・ソ・ドと上がり、鐘の和音とオルガンが残る
  bossDefeat: [
    ev(C4, 0, 200, S.暗い鐘),
    ev(Eb4, 100, 200, S.暗い鐘),
    ev(G4, 200, 200, S.暗い鐘),
    ev(C5, 300, 100, S.暗い鐘),
    ev([Eb4, G4, C5], 400, 600, S.暗い鐘),
    ev([C3, G3], 400, 600, S.暗いオルガン),
  ],
  // 暗い案（v1.10）：オルガンの 5 つの和音で、最後に長調に変わり、鐘が鳴る
  clear: [
    ev([C3, G3, C4, Eb4], 0, 833, S.暗いオルガン, { gain: 1.2 }),
    ev([Ab2, Ab3, C4, Eb4], 833, 834, S.暗いオルガン, { gain: 1.2 }),
    ev([F2, F3, Ab3, C4], 1667, 833, S.暗いオルガン, { gain: 1.2 }),
    ev([G2, G3, B3, D4], 2500, 833, S.暗いオルガン, { gain: 1.2 }),
    ev([C3, G3, C4, E4], 3333, 2500, S.暗いオルガン, { gain: 1.2 }),
    ev(C2, 0, 833, S.低い声),
    ev(Ab1, 833, 834, S.低い声),
    ev(F1, 1667, 833, S.低い声),
    ev(G1, 2500, 833, S.低い声),
    ev(C2, 3333, 2500, S.低い声),
    ev(C4, 3333, 833, S.暗い鐘),
    ev(G4, 3611, 833, S.暗い鐘),
    ev(C5, 3889, 1944, S.暗い鐘),
  ],
  // 暗い案：1 オクターブ下
  toggle: seq([[523, 80]], S.低い木の音, 0, false),
  // v1.7〜v1.9 のレベルアップの音（v1.10）：ド・ミ♭・ソ・ド（短調・1 オクターブ下）
  encounter: seq([[262, 90], [311, 90], [392, 90], [523, 240]], S.沈んだ金管, 60, true),
};

/** 効果音の長さ（ms） */
export function sfxDuration(name: SfxName): number {
  return SFX_MS[name];
}

type Ctor = new () => AudioContext;

let ctx: AudioContext | null | undefined;
let active: AudioScheduledSourceNode[] = [];
let sfxEnd = 0;
let listener: ((sec: number) => void) | null = null;

const RESUME_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const;

/** suspended のあいだ、入力のたびに resume() を試す。running になったら受け手を外す（1 回で諦めない） */
function resumeOnInput(ac: AudioContext): void {
  const target = typeof window === 'undefined' ? null : window;
  if (!target) return;
  const detach = () => RESUME_EVENTS.forEach((type) => target.removeEventListener(type, onInput, true));
  function onInput() {
    if (ac.state === 'running') {
      detach();
      return;
    }
    try {
      void Promise.resolve(ac.resume()).then(() => { if (ac.state === 'running') detach(); }, () => undefined);
    } catch {
      // 再開できなくても、次の入力でまた試す
    }
  }
  RESUME_EVENTS.forEach((type) => target.addEventListener(type, onInput, true));
}

/** 共用の AudioContext（初回に作る。使えなければ null） */
export function audioContext(): AudioContext | null {
  if (ctx !== undefined) return ctx;
  try {
    const g = globalThis as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
    const C = g.AudioContext ?? g.webkitAudioContext;
    ctx = C ? new C() : null;
    if (ctx && ctx.state === 'suspended') resumeOnInput(ctx);
  } catch {
    ctx = null;
  }
  return ctx;
}

function stopNodes(): void {
  for (const node of active) {
    try {
      node.stop();
      node.disconnect();
    } catch {
      // 止められなくても外に出さない
    }
  }
  active = [];
}

function track(node: AudioScheduledSourceNode, t: number, stop: number): void {
  node.start(t);
  node.stop(stop);
  node.onended = () => { active = active.filter((n) => n !== node); };
  active.push(node);
}

/** FM の 1 音（仕様書 §25.1）。stop（効果音の終わり）を過ぎて鳴らさない */
function fmTone(ac: AudioContext, out: AudioNode, f: number, t: number, stop: number, p: SePatch, vol: number, glide: number, vib: boolean): void {
  const carrier = ac.createOscillator();
  const mod = ac.createOscillator();
  carrier.frequency.setValueAtTime(f, t);
  mod.frequency.setValueAtTime(f * p.ratio, t);
  if (glide !== 1) {
    carrier.frequency.exponentialRampToValueAtTime(f * glide, stop);
    mod.frequency.exponentialRampToValueAtTime(f * p.ratio * glide, stop);
  }
  const mg = ac.createGain();
  const dev = p.index * f * p.ratio;
  mg.gain.setValueAtTime(dev, t);
  mg.gain.setTargetAtTime(dev * p.sustain, t + 0.002, p.idecay);
  mod.connect(mg);
  mg.connect(carrier.frequency);
  const g = ac.createGain();
  const a = Math.min(p.attack, (stop - t) / 3);
  const fade = Math.min(0.03, (stop - t) / 3);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setTargetAtTime(vol * p.asus, t + a, p.adecay);
  g.gain.setTargetAtTime(0, stop - fade * 2, fade / 2);
  carrier.connect(g);
  g.connect(out);
  if (vib) {
    const lfo = ac.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = ac.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.4, stop - t));
    lfo.connect(lg);
    lg.connect(carrier.frequency);
    track(lfo, t, stop);
  }
  track(carrier, t, stop);
  track(mod, t, stop);
}

let bus: { ac: AudioContext; node: AudioNode } | null = null;

/** 効果音の出口（v1.10）：軽く抑えるコンプレッサー。作れなければ destination に直接 */
function sfxOut(ac: AudioContext): AudioNode {
  if (bus?.ac === ac) return bus.node;
  let node: AudioNode = ac.destination;
  try {
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.connect(ac.destination);
    node = comp;
  } catch {
    // 古いブラウザなど。抑えずに鳴らす
  }
  bus = { ac, node };
  return node;
}

/** 鳴っている効果音を止めてから、name の音を予約する */
export function playSfx(name: SfxName): void {
  try {
    const ac = audioContext();
    if (!ac) return;
    stopNodes();
    const out = sfxOut(ac);
    const start = ac.currentTime;
    const end = start + sfxDuration(name) / 1000;
    for (const e of SFX[name]) {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = e.patch.lowpass;
      lp.Q.value = 0.7;
      lp.connect(out);
      const t = start + e.at / 1000;
      const stop = Math.min(end, t + e.len / 1000);
      const vol = (e.patch.vol * (e.gain ?? 1)) / Math.sqrt(e.f.length); // 和音は 1 音あたり小さく
      for (const f of e.f) fmTone(ac, lp, f, t, stop, e.patch, vol, e.glide ?? 1, e.vib ?? false);
    }
    const sec = sfxDuration(name) / 1000;
    sfxEnd = start + sec;
    listener?.(sec);
  } catch {
    // 音は飾り。失敗しても遊べる
  }
}

/** 鳴っている効果音を止める */
export function stopSfx(): void {
  try {
    stopNodes();
    sfxEnd = 0;
    listener?.(0);
  } catch {
    // 外に出さない
  }
}

/** いま鳴っている効果音の残り秒 */
export function sfxRemainingSec(): number {
  try {
    const ac = ctx ?? null;
    return ac ? Math.max(0, sfxEnd - ac.currentTime) : 0;
  } catch {
    return 0;
  }
}

/** 効果音を鳴らした（秒）・止めた（0）ことを知らせる先（BGM の音量下げ）を 1 つ登録する */
export function onSfx(fn: ((sec: number) => void) | null): void {
  listener = fn;
}

/**
 * 効果音を鳴らす判断をした。テスト用に window へ `app:sound`（detail: { name, muted }）を出し（仕様書 §28）、
 * muted でなければ鳴らす
 */
export function sfx(name: SfxName, opts: { muted: boolean }): void {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app:sound', { detail: { name, muted: opts.muted } }));
  } catch {
    // 外に出さない
  }
  if (!opts.muted) playSfx(name);
}
