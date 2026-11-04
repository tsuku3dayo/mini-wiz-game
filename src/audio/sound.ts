// 効果音（仕様書 §12.1、§25、TD-0005 §1）。Web Audio でその場で合成する。音声ファイルは使わない
// 効果音と BGM は 1 つの AudioContext を共用する。音の機能がなくても、例外は外に出さない（音なしで遊べる）

export type SfxName = 'levelUp' | 'rareDrop' | 'rareDropLG' | 'bossAppear' | 'bossDefeat' | 'clear' | 'toggle' | 'encounter';
export type Wave = 'square' | 'triangle' | 'sawtooth';
/** 1 音。freq 0 は休符（ノードを作らず、時刻だけ進める） */
export interface Note {
  freq: number;
  ms: number;
  wave: Wave;
}

/** 音量（エンベロープの台の高さ） */
export const VOLUME = 0.08;
/** 立ち上げ・下げの長さ（秒） */
const EDGE_SEC = 0.005;

const C5 = 523;
const E5 = 659;
const G5 = 784;
const C6 = 1047;
const E6 = 1319;
const G6 = 1568;
const C7 = 2093;
const sq = (freq: number, ms: number): Note => ({ freq, ms, wave: 'square' });
const tri = (freq: number, ms: number): Note => ({ freq, ms, wave: 'triangle' });
const saw = (freq: number, ms: number): Note => ({ freq, ms, wave: 'sawtooth' });
const sparkle = (times: number) => Array.from({ length: times }, () => [tri(E6, 60), tri(G6, 60), tri(C7, 60)]).flat();

/** 8 種類の音の並び（仕様書 §25.2 のコードのとおり） */
export const SFX: Readonly<Record<SfxName, readonly Note[]>> = {
  levelUp: [sq(C5, 90), sq(E5, 90), sq(G5, 90), sq(C6, 240)],
  rareDrop: sparkle(2),
  rareDropLG: [...sparkle(4), tri(C7, 300)],
  bossAppear: [saw(98, 300), saw(104, 300), saw(98, 300), saw(92, 300)],
  bossDefeat: [1600, 1400, 1200, 1000, 850, 700, 550, 420, 300, 200].map((f) => sq(f, 50)),
  clear: [sq(G5, 150), sq(G5, 150), sq(G5, 150), sq(E5, 450), sq(0, 100), sq(C6, 300), sq(G5, 150), sq(C6, 900)],
  toggle: [sq(C6, 80)],
  encounter: [
    ...[220, 262, 311, 370, 440, 523, 622, 740].map((f) => sq(f, 30)),
    sq(880, 60), sq(0, 40), sq(880, 60), sq(0, 40), sq(880, 240),
  ],
};

/** 並びの長さの合計（ms） */
export function sfxDuration(name: SfxName): number {
  return SFX[name].reduce((sum, n) => sum + n.ms, 0);
}

type Ctor = new () => AudioContext;

let ctx: AudioContext | null | undefined;
let active: OscillatorNode[] = [];
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
  for (const osc of active) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // 止められなくても外に出さない
    }
  }
  active = [];
}

/** 鳴っている効果音を止めてから、name の並びを予約する */
export function playSfx(name: SfxName): void {
  try {
    const ac = audioContext();
    if (!ac) return;
    stopNodes();
    const start = ac.currentTime;
    let t = start;
    for (const note of SFX[name]) {
      const len = note.ms / 1000;
      if (note.freq > 0) {
        const osc = ac.createOscillator();
        osc.type = note.wave;
        osc.frequency.value = note.freq;
        const gain = ac.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(VOLUME, t + EDGE_SEC);
        gain.gain.setValueAtTime(VOLUME, t + len - EDGE_SEC);
        gain.gain.linearRampToValueAtTime(0, t + len);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + len);
        osc.onended = () => { active = active.filter((o) => o !== osc); };
        active.push(osc);
      }
      t += len;
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
