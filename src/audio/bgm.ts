// BGM の再生エンジン（仕様書 §12.2、§26.1〜§26.6、TD-0005 §1）。FM 合成（2 オペレーター）と打楽器をその場で合成する
// [音] → 音ごとの GainNode → 曲ごとの out（1）→ bus（0.035。ダッキングで動かす）→ destination
// どの関数も例外を外に出さない（音の機能がなくても遊べる）
import { BGM, loopSec, type BgmName, type BgmTrack, type DrumKind, type FmPatch } from '../logic/bgm-tracks';
import { audioContext, onSfx } from './sound';

export const BUS_VOLUME = 0.035;
export const DUCK_RATIO = 0.3;
const DUCK_TC = 0.02;
export const START_PAD_S = 0.05;
export const LOOKAHEAD_S = 1;
export const WATCH_MS = 250;
export const FADE_OUT_S = 0.3;
/** フェードアウトのあと、予約済みのノードを止める時刻（今から） */
const STOP_AFTER_S = 0.32;
/** フェードアウトのあと、out を外すまで（ms） */
const DISCONNECT_MS = 400;

interface Voice {
  node: AudioScheduledSourceNode;
  /** 鳴り終わる（stop を予約した）時刻 */
  end: number;
}

interface Song {
  name: BgmName;
  track: BgmTrack;
  out: GainNode;
  nextStart: number;
  voices: Voice[];
}

let bus: GainNode | null = null;
let current: Song | null = null;
let watch: ReturnType<typeof setInterval> | null = null;
let duckUntil = 0;
let noise: AudioBuffer | null = null;

const freqOf = (m: number) => 440 * 2 ** ((m - 69) / 12);

function ensureBus(ac: AudioContext): GainNode {
  if (!bus) {
    bus = ac.createGain();
    bus.gain.value = BUS_VOLUME;
    bus.connect(ac.destination);
  }
  return bus;
}

/** FM の 1 音（仕様書 §26.2） */
function fmTone(ac: AudioContext, song: Song, m: number, t: number, dur: number, vol: number, fm: FmPatch): void {
  const f = freqOf(m);
  const len = dur * fm.ring;
  const carrier = ac.createOscillator();
  carrier.frequency.value = f;
  const mod = ac.createOscillator();
  mod.frequency.value = f * fm.ratio;
  const mg = ac.createGain();
  const dev = fm.index * f * fm.ratio;
  mg.gain.setValueAtTime(dev, t);
  mg.gain.setTargetAtTime(dev * fm.sustain, t + 0.002, fm.idecay);
  mod.connect(mg);
  mg.connect(carrier.frequency);

  const g = ac.createGain();
  const a = Math.min(fm.attack, len / 3);
  const rel = Math.min(0.08, len / 4);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setTargetAtTime(vol * fm.asus, t + a, fm.adecay);
  g.gain.setTargetAtTime(0, t + len - rel, rel / 4);
  carrier.connect(g);
  g.connect(song.out);

  const nodes: AudioScheduledSourceNode[] = [carrier, mod];
  if (fm.vib) {
    const lfo = ac.createOscillator();
    lfo.frequency.value = 5.2;
    const lg = ac.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.6, len));
    lfo.connect(lg);
    lg.connect(carrier.frequency);
    nodes.push(lfo);
  }
  const end = t + len + 0.05;
  for (const n of nodes) {
    n.start(t);
    n.stop(end);
    song.voices.push({ node: n, end });
  }
}

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

const DRUMS: Readonly<Record<DrumKind, { tone?: { from: number; len: number }; noise: { type: BiquadFilterType; freq: number; len: number; gain: number } }>> = {
  kick: { tone: { from: 130, len: 0.16 }, noise: { type: 'lowpass', freq: 300, len: 0.03, gain: 0.5 } },
  boom: { tone: { from: 95, len: 0.28 }, noise: { type: 'lowpass', freq: 300, len: 0.05, gain: 0.5 } },
  snare: { noise: { type: 'highpass', freq: 1400, len: 0.11, gain: 1 } },
  hat: { noise: { type: 'highpass', freq: 7000, len: 0.035, gain: 1 } },
};

/** 打楽器 1 打（仕様書 §26.4） */
function drum(ac: AudioContext, song: Song, kind: DrumKind, t: number, vel: number): void {
  const v = vel * 0.75;
  const d = DRUMS[kind];
  if (d.tone) {
    const osc = ac.createOscillator();
    osc.frequency.setValueAtTime(d.tone.from, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + d.tone.len * 0.8);
    const g = ac.createGain();
    g.gain.setValueAtTime(v * 1.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d.tone.len);
    osc.connect(g);
    g.connect(song.out);
    const end = t + d.tone.len + 0.02;
    osc.start(t);
    osc.stop(end);
    song.voices.push({ node: osc, end });
  }
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const filter = ac.createBiquadFilter();
  filter.type = d.noise.type;
  filter.frequency.value = d.noise.freq;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(v * d.noise.gain, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + d.noise.len);
  src.connect(filter);
  filter.connect(ng);
  ng.connect(song.out);
  const end = t + d.noise.len + 0.01;
  src.start(t, Math.random() * 0.5);
  src.stop(end);
  song.voices.push({ node: src, end });
}

/** 1 周を t0 から予約する（仕様書 §26.5） */
function scheduleLoop(ac: AudioContext, song: Song, t0: number): void {
  const { track } = song;
  const spb = 60 / track.bpm;
  for (const part of track.parts) {
    let t = t0;
    for (const note of part.notes) {
      const d = note.len * spb;
      if (note.p !== null) {
        const pitches = Array.isArray(note.p) ? note.p : [note.p as number];
        const vol = Array.isArray(note.p) ? part.vol * 0.7 : part.vol;
        for (const m of pitches) fmTone(ac, song, m, t, d * 0.9, vol, part.fm);
      }
      t += d;
    }
  }
  for (const hit of track.drums) drum(ac, song, hit.kind, t0 + hit.beat * spb, hit.vel);
  song.nextStart = t0 + loopSec(track);
}

/** 今の曲を 0.3 秒でフェードアウトし、予約済みの音を止める */
function fadeOut(ac: AudioContext, song: Song): void {
  const now = ac.currentTime;
  const gain = song.out.gain;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(0, now + FADE_OUT_S);
  for (const v of song.voices) {
    try {
      v.node.stop(now + STOP_AFTER_S);
    } catch {
      // 止められなくても外に出さない
    }
  }
  song.voices = [];
  const out = song.out;
  setTimeout(() => {
    try {
      out.disconnect();
    } catch {
      // 外に出さない
    }
  }, DISCONNECT_MS);
}

/** 見回り：次の周の 1 秒前を切ったら予約する。間に合わなかったら今から頭で鳴らし直す */
function tick(): void {
  try {
    const ac = audioContext();
    if (!ac || !current || ac.state !== 'running') return;
    const now = ac.currentTime;
    current.voices = current.voices.filter((v) => v.end > now);
    if (now >= current.nextStart) scheduleLoop(ac, current, now + START_PAD_S);
    else if (current.nextStart - now < LOOKAHEAD_S) scheduleLoop(ac, current, current.nextStart);
  } catch {
    // 外に出さない
  }
}

function startWatch(): void {
  if (watch === null) watch = setInterval(tick, WATCH_MS);
}

function stopWatch(): void {
  if (watch !== null) clearInterval(watch);
  watch = null;
}

/** name の曲を鳴らす。同じ曲なら何もしない。違えば今の曲を消して、頭から（startAfterSec 遅らせて） */
export function playBgm(name: BgmName, startAfterSec = 0): void {
  try {
    const ac = audioContext();
    if (!ac) return;
    if (current?.name === name) return;
    if (current) fadeOut(ac, current);
    const out = ac.createGain();
    out.gain.value = 1;
    out.connect(ensureBus(ac));
    current = { name, track: BGM[name], out, nextStart: 0, voices: [] };
    scheduleLoop(ac, current, ac.currentTime + START_PAD_S + Math.max(0, startAfterSec));
    startWatch();
  } catch {
    current = null;
  }
}

/** 見回りを止め、今の曲をフェードアウトする */
export function stopBgm(): void {
  stopWatch();
  try {
    const ac = audioContext();
    if (ac && current) fadeOut(ac, current);
  } catch {
    // 外に出さない
  }
  current = null;
}

/** 効果音のあいだ BGM を 3 割に下げる。sec が 0 以下（効果音を止めた）ならすぐ戻す */
export function duckBgm(sec: number): void {
  try {
    const ac = audioContext();
    if (!ac || !bus) return;
    const now = ac.currentTime;
    duckUntil = sec <= 0 ? now : Math.max(duckUntil, now + sec);
    bus.gain.cancelScheduledValues(now);
    if (duckUntil > now) bus.gain.setTargetAtTime(BUS_VOLUME * DUCK_RATIO, now, DUCK_TC);
    bus.gain.setTargetAtTime(BUS_VOLUME, duckUntil, DUCK_TC);
  } catch {
    // 外に出さない
  }
}

/** 鳴っている（または始まりを待っている）曲 */
export function currentBgm(): BgmName | null {
  return current?.name ?? null;
}

/** 予約中のノード数（テスト用） */
export function liveVoiceCount(): number {
  return current?.voices.length ?? 0;
}

// 効果音を鳴らした・止めたら、BGM の音量を下げる・戻す（循環 import を避けるため、ここで登録する）
onSfx(duckBgm);
