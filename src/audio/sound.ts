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
}

const se = (name: string, p: Omit<SePatch, 'name'>): SePatch => ({ name, ...p });

/** 音色の一覧（8 種） */
export const SE_PATCHES = {
  沈んだ金管: se('沈んだ金管', { ratio: 1, index: 0.9, sustain: 0.5, idecay: 0.08, attack: 0.02, adecay: 0.5, asus: 0.75, lowpass: 1300, vol: 0.24 }),
  地の底のうなり: se('地の底のうなり', { ratio: 1, index: 1.8, sustain: 0.7, idecay: 0.5, attack: 0.06, adecay: 1.5, asus: 0.9, lowpass: 600, vol: 0.34 }),
  低い木の音: se('低い木の音', { ratio: 1, index: 0.8, sustain: 0, idecay: 0.02, attack: 0.004, adecay: 0.035, asus: 0, lowpass: 1000, vol: 0.28 }),
  うなる低い金管: se('うなる低い金管', { ratio: 1, index: 1.8, sustain: 0.7, idecay: 0.4, attack: 0.03, adecay: 0.8, asus: 0.8, lowpass: 700, vol: 0.22 }),
  暗い鐘: se('暗い鐘', { ratio: 3, index: 0.8, sustain: 0, idecay: 0.15, attack: 0.003, adecay: 0.45, asus: 0, lowpass: 1500, vol: 0.22 }),
  こもった太鼓: se('こもった太鼓', { ratio: 1, index: 2, sustain: 0, idecay: 0.02, attack: 0.002, adecay: 0.08, asus: 0, lowpass: 400, vol: 0.55 }),
  暗いオルガン: se('暗いオルガン', { ratio: 2, index: 0.5, sustain: 0.9, idecay: 1, attack: 0.15, adecay: 2, asus: 0.9, lowpass: 1100, vol: 0.11 }),
  低い声: se('低い声', { ratio: 1, index: 0.6, sustain: 0.8, idecay: 0.6, attack: 0.08, adecay: 1.2, asus: 0.85, lowpass: 900, vol: 0.12 }),
} satisfies Record<string, SePatch>;
const S = SE_PATCHES;

const ev = (f: number | readonly number[], at: number, len: number, patch: SePatch, opts: { glide?: number; vib?: boolean } = {}): SfxEvent =>
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
const A1 = 55, A2 = 110, Bb2 = 116.5, C3 = 130.8, Eb3 = 155.6, E3 = 164.8, G3 = 196, C4 = 261.6, Eb4 = 311.1, E4 = 329.6;
const C2 = 65.4;

/** 効果音の長さ（ms）。v1.6 までと同じ（ゲームの間を変えないため） */
export const SFX_MS: Readonly<Record<SfxName, number>> = {
  levelUp: 510,
  rareDrop: 360,
  rareDropLG: 1020,
  bossAppear: 1200,
  bossDefeat: 500,
  clear: 2350,
  toggle: 80,
  encounter: 680,
};

/** 8 種類の音（仕様書 §25.2 のコードのとおり。2026-11-06 にオーナーが試聴ページで選んだもの） */
export const SFX: Readonly<Record<SfxName, readonly SfxEvent[]>> = {
  // 暗い案：ド・ミ♭・ソ・ド（短調・1 オクターブ下）
  levelUp: seq([[262, 90], [311, 90], [392, 90], [523, 240]], S.沈んだ金管, 60, true),
  // 低い音 2：ミ♭・ソ・ドの分散和音（3 オクターブ下）
  rareDrop: sparkle([Eb3, G3, C4], 2, 0),
  rareDropLG: sparkle([Eb3, G3, C4], 4, 300),
  // 暗い案：いまと同じ低い 2 音を交互に
  bossAppear: seq([[98, 300], [104, 300], [98, 300], [92, 300]], S.地の底のうなり, 0, true),
  // 新しい音 1：崩れ落ちる
  bossDefeat: [
    ev(A1, 0, 300, S.こもった太鼓, { glide: 0.5 }),
    ev([G3, 277.2], 0, 500, S.うなる低い金管, { glide: 0.5 }),
  ],
  // 新しい音 1：鎮魂の和音（ハ短調 → ハ長調）
  clear: [
    ev([C3, G3, C4, Eb4], 0, 800, S.暗いオルガン),
    ev([C3, G3], 0, 800, S.低い声),
    ev([C3, G3, C4, E4], 800, 1550, S.暗いオルガン),
    ev([C3, E3, G3], 800, 1550, S.低い声),
    ev(C2, 0, 2350, S.低い声),
  ],
  // 暗い案：1 オクターブ下
  toggle: seq([[523, 80]], S.低い木の音, 0, false),
  // 新しい音 3b：闇から迫る（ぶつかり合う低い和音が、少しずつ高く近づいてきて消える）
  encounter: [ev([A2, Bb2], 0, 680, S.うなる低い金管, { glide: 1.14 })],
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
  const fade = Math.min(0.01, (stop - t) / 3);
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

/** 鳴っている効果音を止めてから、name の音を予約する */
export function playSfx(name: SfxName): void {
  try {
    const ac = audioContext();
    if (!ac) return;
    stopNodes();
    const start = ac.currentTime;
    const end = start + sfxDuration(name) / 1000;
    for (const e of SFX[name]) {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = e.patch.lowpass;
      lp.Q.value = 0.7;
      lp.connect(ac.destination);
      const t = start + e.at / 1000;
      const stop = Math.min(end, t + e.len / 1000);
      const vol = e.patch.vol / Math.sqrt(e.f.length); // 和音は 1 音あたり小さく
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
