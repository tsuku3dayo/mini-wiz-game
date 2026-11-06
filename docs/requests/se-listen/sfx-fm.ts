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
function tone(ac: AudioContext, out: AudioNode, f: number, t: number, len: number, end: number, p: SePatch, last: boolean, glide = 1): void {
  const stop = Math.min(end, t + len + p.tail);
  const carrier = ac.createOscillator();
  carrier.frequency.value = f;
  const mod = ac.createOscillator();
  mod.frequency.value = f * p.ratio;
  if (glide !== 1) {
    // 音の高さを、音の長さのあいだに glide 倍まで動かす（沈む・うなる）
    carrier.frequency.setValueAtTime(f, t);
    carrier.frequency.exponentialRampToValueAtTime(f * glide, t + len);
    mod.frequency.setValueAtTime(f * p.ratio, t);
    mod.frequency.exponentialRampToValueAtTime(f * p.ratio * glide, t + len);
  }
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

// ===================== まったく違う効果音（遭遇・ボス撃破・ゲームクリア）=====================
// 2026-11-06 のオーナーの希望「暗い音色で、まったく違う SE を」。音の並びから作り直す。
// 長さは、いまと同じ（ゲームの間を変えないため）。和音（同時に鳴る音）と、高さが動く音（glide）も使う

/** 1 つの音（または和音）。at・len は ms */
export interface SeEvent { f: readonly number[]; at: number; len: number; patch: SePatch; glide?: number }
export interface FreshSe { title: string; desc: string; events: readonly SeEvent[] }

const DARK = {
  growl: se('うなる低い金管', { ratio: 1, index: 1.8, sustain: 0.7, idecay: 0.4, attack: 0.03, adecay: 0.8, asus: 0.8, tail: 0, lowpass: 700, vol: 0.22 }),
  bell: se('暗い鐘', { ratio: 3, index: 0.8, sustain: 0, idecay: 0.15, attack: 0.003, adecay: 0.45, asus: 0, tail: 0, lowpass: 1500, vol: 0.22 }),
  thump: se('こもった太鼓', { ratio: 1, index: 2, sustain: 0, idecay: 0.02, attack: 0.002, adecay: 0.08, asus: 0, tail: 0, lowpass: 400, vol: 0.55 }),
  organ: se('暗いオルガン', { ratio: 2, index: 0.5, sustain: 0.9, idecay: 1, attack: 0.15, adecay: 2, asus: 0.9, tail: 0, lowpass: 1100, vol: 0.11 }),
  choir: se('低い声', { ratio: 1, index: 0.6, sustain: 0.8, idecay: 0.6, attack: 0.08, adecay: 1.2, asus: 0.85, tail: 0, lowpass: 900, vol: 0.12 }),
};
const ev = (f: number | readonly number[], at: number, len: number, patch: SePatch, glide?: number): SeEvent => ({ f: typeof f === 'number' ? [f] : f, at, len, patch, glide });

// 音の高さ（Hz）
const A1 = 55, C2 = 65.4, G2 = 98, A2 = 110, Bb2 = 116.5, C3 = 130.8, Eb3 = 155.6, E3 = 164.8, G3 = 196, Gs3 = 207.7, A3 = 220, B3 = 246.9, C4 = 261.6, Eb4 = 311.1, E4 = 329.6, Ab4 = 415.3, A4 = 440;

export const FRESH: Readonly<Partial<Record<SfxName, readonly FreshSe[]>>> = {
  // 680 ms
  encounter: [
    {
      title: '新しい音 1：不意打ちの一撃',
      desc: '低い太鼓と、ぶつかり合う低い金管の和音が同時に鳴り、上で暗い鐘が 2 回、半音下がって鳴る',
      events: [
        ev(A1, 0, 160, DARK.thump, 0.7),
        ev([A2, Bb2, E3], 0, 680, DARK.growl),
        ev(A4, 120, 220, DARK.bell),
        ev(Ab4, 340, 340, DARK.bell),
      ],
    },
    {
      title: '新しい音 2：鼓動',
      desc: '心臓の鼓動のような低い太鼓が 2 回。そのあと不安な和音（増 4 度）が、うなりながら少し沈む',
      events: [
        ev(A1, 0, 150, DARK.thump, 0.7),
        ev(A1, 180, 150, DARK.thump, 0.7),
        ev([A2, Eb3], 380, 300, DARK.growl, 0.94),
      ],
    },
    {
      title: '新しい音 3：闇から迫る',
      desc: 'ぶつかり合う低い和音が、少しずつ高く・近づいてきて、最後に太鼓と鐘で断ち切られる',
      events: [
        ev([A2, Bb2], 0, 560, DARK.growl, 1.12),
        ev(A1, 560, 120, DARK.thump, 0.7),
        ev([A3, Eb4], 560, 120, DARK.bell),
      ],
    },
    {
      title: '新しい音 4：鐘の三連打',
      desc: '暗い鐘を 3 回すばやく打ち、だんだん低くなる（短調）。最後の一打に太鼓が重なる',
      events: [
        ev([A3, C4], 0, 200, DARK.bell),
        ev([Gs3, B3], 200, 200, DARK.bell),
        ev([A2, E3], 400, 280, DARK.bell),
        ev(A1, 400, 200, DARK.thump, 0.7),
      ],
    },
    {
      title: '新しい音 5：息をのむ',
      desc: '低い声の不安な和音が、ため息のように下がっていき、底で太鼓と低い鐘が鳴る',
      events: [
        ev([A3, Eb4], 0, 420, DARK.choir, 0.6),
        ev(A1, 420, 160, DARK.thump, 0.7),
        ev([A2, E3], 420, 260, DARK.bell),
      ],
    },
    // 3・4・5 の、最後の太鼓・鐘をなくした版（2026-11-06 のオーナーの希望）。長さを 0.68 秒のままにするため、残った音を最後まで伸ばした
    {
      title: '新しい音 3b：闇から迫る（太鼓・鐘なし）',
      desc: 'ぶつかり合う低い和音が、少しずつ高く・近づいてきて、そのまま消える（断ち切らない）',
      events: [
        ev([A2, Bb2], 0, 680, DARK.growl, 1.14),
      ],
    },
    {
      title: '新しい音 4b：鐘の二連打（太鼓・鐘なし）',
      desc: '暗い鐘を 2 回打ち、2 回目が低く沈んで、余韻が残る（3 回目の鐘と太鼓をなくした）',
      events: [
        ev([A3, C4], 0, 200, DARK.bell),
        ev([Gs3, B3], 200, 480, DARK.bell),
      ],
    },
    {
      title: '新しい音 5b：息をのむ（太鼓・鐘なし）',
      desc: '低い声の不安な和音が、ため息のように下がっていき、そのまま消える',
      events: [
        ev([A3, Eb4], 0, 680, DARK.choir, 0.5),
      ],
    },
  ],
  // 500 ms
  bossDefeat: [
    {
      title: '新しい音 1：崩れ落ちる',
      desc: '不安な和音（増 4 度）が、半分の高さまで沈んでいく。下で太鼓が鳴る',
      events: [
        ev(A1, 0, 300, DARK.thump, 0.5),
        ev([G3, 277.2], 0, 500, DARK.growl, 0.5),
      ],
    },
    {
      title: '新しい音 2：低い鐘の一打',
      desc: '低い鐘を 1 回、深く打つ（ハ短調の重い和音）。余韻が長く残る',
      events: [
        ev(C2, 0, 220, DARK.thump, 0.8),
        ev([C3, G3, Eb4], 0, 500, DARK.bell),
      ],
    },
  ],
  // 2350 ms（ゲームでは演出の 1500 ms で止まる。1.5 秒で聞き終わるように作る）
  clear: [
    {
      title: '新しい音 1：鎮魂の和音',
      desc: '暗い短調の和音（ハ短調）が静かに広がり、最後に明るい和音（ハ長調）へ変わって、安らかに終わる',
      events: [
        ev([C3, G3, C4, Eb4], 0, 800, DARK.organ),
        ev([C3, G3], 0, 800, DARK.choir),
        ev([C3, G3, C4, E4], 800, 1550, DARK.organ),
        ev([C3, E3, G3], 800, 1550, DARK.choir),
        ev(C2, 0, 2350, DARK.choir),
      ],
    },
    {
      title: '新しい音 2：遠い鐘',
      desc: '遠くで暗い鐘が 3 回鳴る（ド・ソ・ド）。最後の鐘は低い声と重なって長く残る',
      events: [
        ev([C3, C4], 0, 450, DARK.bell),
        ev([G2, G3], 450, 450, DARK.bell),
        ev([C3, Eb3, C4], 900, 1450, DARK.bell),
        ev([C3, G3], 900, 1450, DARK.choir),
      ],
    },
  ],
};

/** まったく違う効果音の長さ（ms）。いまと同じでなければ試聴ページを作るときに止める */
export function freshDuration(name: SfxName, i: number): number {
  const s = FRESH[name]![i];
  const ms = Math.max(...s.events.map((e) => e.at + e.len));
  if (ms !== sfxDuration(name)) throw new Error(`${name} ${s.title}: ${ms}ms（いまは ${sfxDuration(name)}ms）`);
  return ms;
}

export function playFresh(ac: AudioContext, name: SfxName, i: number): void {
  stopAll();
  const s = FRESH[name]![i];
  const start = ac.currentTime + 0.02;
  const end = start + freshDuration(name, i) / 1000;
  for (const e of s.events) {
    // 音色ごとにローパスを通す
    let out: AudioNode = ac.destination;
    if (e.patch.lowpass > 0) {
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = e.patch.lowpass;
      lp.Q.value = 0.7;
      lp.connect(ac.destination);
      out = lp;
    }
    const vol = e.f.length > 1 ? 1 / Math.sqrt(e.f.length) : 1; // 和音は 1 音あたり小さく
    const p = { ...e.patch, vol: e.patch.vol * vol };
    for (const f of e.f) tone(ac, out, f, start + e.at / 1000, e.len / 1000, end, p, false, e.glide ?? 1);
  }
}
