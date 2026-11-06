// 効果音の FM 音源風の案（試聴用）。いまの効果音（src/audio/sound.ts の SFX）と同じ音の並び・同じ長さで、音色だけを FM にする。
// 長さを変えないのは、ゲームの間（BGM の音量下げ・効果音のあとに曲を始める遅れ・演出の長さ）が効果音の長さで決まっているため
import { SFX, sfxDuration, type Note, type SfxName } from '../../../src/audio/sound.ts';

/** FM の音色（BGM の FmPatch と同じ考え方。並びの終わりで必ず止める） */
export interface SePatch {
  name: string;
  /** 変調波の周波数 ÷ 搬送波（整数だと澄んだ音、1.41 などの半端な値だと金属的でトゲトゲした音） */
  ratio: number;
  /** 変調の深さ（はじめ）。大きいほど明るく・鋭い */
  index: number;
  /** index の行き先（はじめの何倍か） */
  sustain: number;
  /** index が落ちる時定数（秒）。短いほど、鋭さがすぐ消える */
  idecay: number;
  /** 音量の立ち上がり（秒）。長いほど、やわらかく始まる */
  attack: number;
  /** 音量が落ちる時定数（秒） */
  adecay: number;
  /** 音量の行き先（何倍か） */
  asus: number;
  /** 次の音に重ねて鳴らし続ける長さ（秒）。0 なら音の長さで切る */
  tail: number;
  /** 高い音を削る（ローパスフィルター）の周波数（Hz）。0 なら削らない */
  lowpass: number;
  /** 音量（いまの矩形波 0.08 と同じくらいに聞こえる大きさ） */
  vol: number;
}

type P = Omit<SePatch, 'name'>;
const se = (name: string, p: P): SePatch => ({ name, ...p });

/** 最初の案（トゲトゲした感じが強い、というオーナーの感想。2026-11-06） */
export const SE_PATCH: Readonly<Record<SfxName, SePatch>> = {
  levelUp: se('ファンファーレの金管', { ratio: 1, index: 3, sustain: 0.6, idecay: 0.08, attack: 0.004, adecay: 0.5, asus: 0.8, tail: 0, lowpass: 0, vol: 0.16 }),
  rareDrop: se('きらめく鐘', { ratio: 3.5, index: 3.5, sustain: 0.1, idecay: 0.12, attack: 0.004, adecay: 0.25, asus: 0, tail: 0.35, lowpass: 0, vol: 0.13 }),
  rareDropLG: se('きらめく鐘', { ratio: 3.5, index: 3.5, sustain: 0.1, idecay: 0.12, attack: 0.004, adecay: 0.25, asus: 0, tail: 0.35, lowpass: 0, vol: 0.13 }),
  bossAppear: se('うなる低い金管', { ratio: 1, index: 6, sustain: 0.8, idecay: 0.3, attack: 0.004, adecay: 1.2, asus: 0.9, tail: 0, lowpass: 0, vol: 0.2 }),
  bossDefeat: se('くだける金属', { ratio: 1.41, index: 4, sustain: 0.3, idecay: 0.05, attack: 0.004, adecay: 0.08, asus: 0.3, tail: 0.12, lowpass: 0, vol: 0.13 }),
  clear: se('ファンファーレの金管', { ratio: 1, index: 3, sustain: 0.6, idecay: 0.08, attack: 0.004, adecay: 0.6, asus: 0.85, tail: 0, lowpass: 0, vol: 0.16 }),
  toggle: se('木の打楽器', { ratio: 1.41, index: 2.5, sustain: 0.05, idecay: 0.02, attack: 0.004, adecay: 0.03, asus: 0, tail: 0, lowpass: 0, vol: 0.2 }),
  encounter: se('鋭いシンセ', { ratio: 2, index: 2.5, sustain: 0.5, idecay: 0.05, attack: 0.004, adecay: 0.3, asus: 0.7, tail: 0, lowpass: 0, vol: 0.13 }),
};

/**
 * 湿った案（2026-11-06 のオーナーの希望）。トゲトゲを減らすために：
 * 変調を浅く（index 小さく）・すぐ弱める、比を整数にする（金属的な響きをなくす）、立ち上がりを少し遅く、
 * 高い音をローパスで削る（こもった、湿った響き）
 */
export const SE_PATCH_WET: Readonly<Record<SfxName, SePatch>> = {
  levelUp: se('やわらかい金管', { ratio: 1, index: 1.2, sustain: 0.4, idecay: 0.05, attack: 0.012, adecay: 0.4, asus: 0.7, tail: 0.05, lowpass: 2200, vol: 0.2 }),
  rareDrop: se('こもったガラスの鐘', { ratio: 3, index: 1.2, sustain: 0, idecay: 0.08, attack: 0.004, adecay: 0.2, asus: 0, tail: 0.3, lowpass: 3500, vol: 0.16 }),
  rareDropLG: se('こもったガラスの鐘', { ratio: 3, index: 1.2, sustain: 0, idecay: 0.08, attack: 0.004, adecay: 0.2, asus: 0, tail: 0.3, lowpass: 3500, vol: 0.16 }),
  bossAppear: se('くぐもった低い金管', { ratio: 1, index: 2.5, sustain: 0.6, idecay: 0.4, attack: 0.04, adecay: 1.2, asus: 0.85, tail: 0, lowpass: 900, vol: 0.28 }),
  bossDefeat: se('しずくが落ちる音', { ratio: 1, index: 1.5, sustain: 0.1, idecay: 0.03, attack: 0.003, adecay: 0.06, asus: 0.2, tail: 0.1, lowpass: 2000, vol: 0.18 }),
  clear: se('やわらかい金管', { ratio: 1, index: 1.2, sustain: 0.4, idecay: 0.05, attack: 0.012, adecay: 0.6, asus: 0.8, tail: 0.05, lowpass: 2400, vol: 0.2 }),
  toggle: se('やわらかい木の音', { ratio: 1, index: 1, sustain: 0, idecay: 0.015, attack: 0.003, adecay: 0.03, asus: 0, tail: 0, lowpass: 1800, vol: 0.22 }),
  encounter: se('こもったシンセ', { ratio: 1, index: 1.5, sustain: 0.4, idecay: 0.04, attack: 0.006, adecay: 0.3, asus: 0.7, tail: 0.02, lowpass: 2000, vol: 0.17 }),
};

/**
 * 暗い案の音色（2026-11-06 のオーナーの希望「暗い音に作り直して」）。湿った案より、さらに：
 * 高い音を大きく削る（ローパスを低く）、変調をもっと浅く、立ち上がりと消え方をゆっくり（重く沈む感じ）
 */
export const SE_PATCH_DARK: Readonly<Record<SfxName, SePatch>> = {
  levelUp: se('沈んだ金管', { ratio: 1, index: 0.9, sustain: 0.5, idecay: 0.08, attack: 0.02, adecay: 0.5, asus: 0.75, tail: 0.06, lowpass: 1300, vol: 0.24 }),
  rareDrop: se('暗い鐘', { ratio: 2, index: 1, sustain: 0, idecay: 0.1, attack: 0.006, adecay: 0.25, asus: 0, tail: 0.3, lowpass: 1800, vol: 0.2 }),
  rareDropLG: se('暗い鐘', { ratio: 2, index: 1, sustain: 0, idecay: 0.1, attack: 0.006, adecay: 0.25, asus: 0, tail: 0.3, lowpass: 1800, vol: 0.2 }),
  bossAppear: se('地の底のうなり', { ratio: 1, index: 1.8, sustain: 0.7, idecay: 0.5, attack: 0.06, adecay: 1.5, asus: 0.9, tail: 0, lowpass: 600, vol: 0.34 }),
  bossDefeat: se('沈んでいく低い音', { ratio: 1, index: 1.2, sustain: 0.3, idecay: 0.05, attack: 0.005, adecay: 0.1, asus: 0.4, tail: 0.1, lowpass: 1200, vol: 0.24 }),
  clear: se('沈んだ金管', { ratio: 1, index: 0.9, sustain: 0.5, idecay: 0.08, attack: 0.02, adecay: 0.7, asus: 0.8, tail: 0.06, lowpass: 1300, vol: 0.24 }),
  toggle: se('低い木の音', { ratio: 1, index: 0.8, sustain: 0, idecay: 0.02, attack: 0.004, adecay: 0.035, asus: 0, tail: 0, lowpass: 1000, vol: 0.28 }),
  encounter: se('暗いシンセ', { ratio: 1, index: 1.1, sustain: 0.4, idecay: 0.05, attack: 0.008, adecay: 0.3, asus: 0.7, tail: 0.02, lowpass: 1300, vol: 0.22 }),
};

const n = (freq: number, ms: number): Note => ({ freq, ms, wave: 'square' });
const darkSparkle = (times: number) => Array.from({ length: times }, () => [n(622, 60), n(784, 60), n(1047, 60)]).flat();
/**
 * 暗い案の音の並び：短調（長 3 度を短 3 度に）にし、高い音を 1 オクターブ下げる。**長さ（各音の ms）はいまと同じ**。
 * ボス出現（もともと低く不協和）はそのまま
 */
export const SFX_DARK: Readonly<Record<SfxName, readonly Note[]>> = {
  levelUp: [n(262, 90), n(311, 90), n(392, 90), n(523, 240)],
  rareDrop: darkSparkle(2),
  rareDropLG: [...darkSparkle(4), n(1047, 300)],
  bossAppear: SFX.bossAppear,
  bossDefeat: [800, 700, 600, 500, 425, 350, 275, 210, 150, 100].map((f) => n(f, 50)),
  clear: [n(311, 150), n(311, 150), n(311, 150), n(262, 450), n(0, 100), n(415, 300), n(392, 150), n(523, 900)],
  toggle: [n(523, 80)],
  encounter: [...[110, 131, 156, 185, 220, 262, 311, 370].map((f) => n(f, 30)), n(440, 60), n(0, 40), n(440, 60), n(0, 40), n(440, 240)],
};

export type Variant = 'dark' | 'darkTone' | 'wet' | 'first';
const PATCHES: Readonly<Record<Variant, Readonly<Record<SfxName, SePatch>>>> = { dark: SE_PATCH_DARK, darkTone: SE_PATCH_DARK, wet: SE_PATCH_WET, first: SE_PATCH };
/** 案ごとの音の並び（dark だけ短調・低め。ほかはいまと同じ） */
const notesOf = (name: SfxName, variant: Variant) => (variant === 'dark' ? SFX_DARK[name] : SFX[name]);

let active: AudioScheduledSourceNode[] = [];

function stopAll(): void {
  for (const n of active) {
    try { n.stop(); n.disconnect(); } catch { /* 外に出さない */ }
  }
  active = [];
}

/** FM の 1 音。end（並びの終わり）を過ぎて鳴らさない */
function tone(ac: AudioContext, out: AudioNode, f: number, t: number, len: number, end: number, p: SePatch, last: boolean): void {
  const stop = Math.min(end, t + len + p.tail);
  const carrier = ac.createOscillator();
  carrier.frequency.value = f;
  const mod = ac.createOscillator();
  mod.frequency.value = f * p.ratio;
  const mg = ac.createGain();
  const dev = p.index * f * p.ratio;
  mg.gain.setValueAtTime(dev, t);
  mg.gain.setTargetAtTime(dev * p.sustain, t + 0.002, p.idecay);
  mod.connect(mg);
  mg.connect(carrier.frequency);
  const g = ac.createGain();
  const a = Math.min(p.attack, (stop - t) / 3);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(p.vol, t + a);
  g.gain.setTargetAtTime(p.vol * p.asus, t + a, p.adecay);
  // 終わりの 10ms で消す（プチッと鳴らさない）
  const fade = Math.min(0.01, (stop - t) / 3);
  g.gain.setTargetAtTime(0, stop - fade * 2, fade / 2);
  carrier.connect(g);
  g.connect(out);
  if (last && p.asus > 0.5) {
    // 長く伸ばす最後の音は、ゆれ（ビブラート）を少し付ける
    const lfo = ac.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = ac.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.4, stop - t));
    lfo.connect(lg);
    lg.connect(carrier.frequency);
    lfo.start(t);
    lfo.stop(stop);
    active.push(lfo);
  }
  for (const n of [carrier, mod]) {
    n.start(t);
    n.stop(stop);
    active.push(n);
  }
}

/** いまと同じ並び（周波数・長さ）を、FM の音色で鳴らす */
export function playFm(ac: AudioContext, name: SfxName, variant: Variant = 'dark'): void {
  stopAll();
  const p = PATCHES[variant][name];
  let out: AudioNode = ac.destination;
  if (p.lowpass > 0) {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = p.lowpass;
    lp.Q.value = 0.7;
    lp.connect(ac.destination);
    out = lp;
  }
  const start = ac.currentTime + 0.02;
  const end = start + sfxDuration(name) / 1000;
  let t = start;
  const notes = notesOf(name, variant);
  notes.forEach((note, i) => {
    const len = note.ms / 1000;
    if (note.freq > 0) tone(ac, out, note.freq, t, len, end, p, i === notes.length - 1);
    t += len;
  });
}

export function patchOf(name: SfxName, variant: Variant): SePatch {
  return PATCHES[variant][name];
}

/** 案の並びの長さ（ms）。どの案もいまと同じ（ずれていたら試聴ページを作るときに止める） */
export function variantDuration(name: SfxName, variant: Variant): number {
  const ms = notesOf(name, variant).reduce((s, x) => s + x.ms, 0);
  if (ms !== sfxDuration(name)) throw new Error(`${name} ${variant}: ${ms}ms（いまは ${sfxDuration(name)}ms）`);
  return ms;
}

export function stopFm(): void {
  stopAll();
}
