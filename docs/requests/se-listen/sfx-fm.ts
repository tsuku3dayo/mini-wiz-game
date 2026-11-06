// 効果音の FM 音源風の案（試聴用）。いまの効果音（src/audio/sound.ts の SFX）と同じ音の並び・同じ長さで、音色だけを FM にする。
// 長さを変えないのは、ゲームの間（BGM の音量下げ・効果音のあとに曲を始める遅れ・演出の長さ）が効果音の長さで決まっているため
import { SFX, sfxDuration, type SfxName } from '../../../src/audio/sound.ts';

/** FM の音色（BGM の FmPatch と同じ考え方。ring は使わず、並びの終わりで必ず止める） */
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
  /** 音量が落ちる時定数（秒） */
  adecay: number;
  /** 音量の行き先（何倍か） */
  asus: number;
  /** 次の音に重ねて鳴らし続ける長さ（秒）。0 なら音の長さで切る */
  tail: number;
  /** 音量（いまの矩形波 0.08 と同じくらいに聞こえる大きさ） */
  vol: number;
}

const se = (name: string, ratio: number, index: number, sustain: number, idecay: number, adecay: number, asus: number, tail: number, vol: number): SePatch =>
  ({ name, ratio, index, sustain, idecay, adecay, asus, tail, vol });

/** 効果音ごとの音色 */
export const SE_PATCH: Readonly<Record<SfxName, SePatch>> = {
  levelUp: se('ファンファーレの金管', 1, 3, 0.6, 0.08, 0.5, 0.8, 0, 0.16),
  rareDrop: se('きらめく鐘', 3.5, 3.5, 0.1, 0.12, 0.25, 0, 0.35, 0.13),
  rareDropLG: se('きらめく鐘', 3.5, 3.5, 0.1, 0.12, 0.25, 0, 0.35, 0.13),
  bossAppear: se('うなる低い金管', 1, 6, 0.8, 0.3, 1.2, 0.9, 0, 0.2),
  bossDefeat: se('くだける金属', 1.41, 4, 0.3, 0.05, 0.08, 0.3, 0.12, 0.13),
  clear: se('ファンファーレの金管', 1, 3, 0.6, 0.08, 0.6, 0.85, 0, 0.16),
  toggle: se('木の打楽器', 1.41, 2.5, 0.05, 0.02, 0.03, 0, 0, 0.2),
  encounter: se('鋭いシンセ', 2, 2.5, 0.5, 0.05, 0.3, 0.7, 0, 0.13),
};

let active: AudioScheduledSourceNode[] = [];

function stopAll(): void {
  for (const n of active) {
    try { n.stop(); n.disconnect(); } catch { /* 外に出さない */ }
  }
  active = [];
}

/** FM の 1 音。end（並びの終わり）を過ぎて鳴らさない */
function tone(ac: AudioContext, f: number, t: number, len: number, end: number, p: SePatch, last: boolean): void {
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
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(p.vol, t + 0.004);
  g.gain.setTargetAtTime(p.vol * p.asus, t + 0.004, p.adecay);
  // 終わりの 10ms で消す（プチッと鳴らさない）。最後の音は並びの終わりまで
  const fade = Math.min(0.01, (stop - t) / 3);
  g.gain.setTargetAtTime(0, stop - fade * 2, fade / 2);
  carrier.connect(g);
  g.connect(ac.destination);
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
export function playFm(ac: AudioContext, name: SfxName): void {
  stopAll();
  const p = SE_PATCH[name];
  const start = ac.currentTime + 0.02;
  const end = start + sfxDuration(name) / 1000;
  let t = start;
  const notes = SFX[name];
  notes.forEach((n, i) => {
    const len = n.ms / 1000;
    if (n.freq > 0) tone(ac, n.freq, t, len, end, p, i === notes.length - 1);
    t += len;
  });
}

export function stopFm(): void {
  stopAll();
}
