/**
 * BGM の曲データ（WIZ-DES-0045 §3、WIZ-AD-0019）。2026-10-15 にユーザーが試聴ページで選んだ 5 曲（FM 音源風）。
 * 正は試聴ページ（docs/bgm-listening-src/tracks.js）で、値はそれと同じにする（bgmTracks.test.ts で突き合わせる）。
 * 曲の考え方は docs/bgm-design-ja.md と各場面の文書。
 */
import {
  BgmNote,
  Chord,
  N,
  R,
  arp,
  at,
  mel,
  perBar,
  voicing,
} from './bgm-notation';

export type { BgmNote } from './bgm-notation';

export type BgmName = 'title' | 'inn' | 'dungeon' | 'battle' | 'boss';

/** 2 オペレーターの FM の音色（設計書 §3） */
export interface FmPatch {
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
  /** 鳴らす長さの倍率（余韻） */
  ring: number;
  vib: boolean;
}

export interface BgmPart {
  label: string;
  vol: number;
  fm: FmPatch;
  notes: readonly BgmNote[];
}

export type DrumKind = 'kick' | 'snare' | 'hat' | 'boom';

export interface DrumHit {
  beat: number;
  kind: DrumKind;
  vel: number;
}

export interface BgmTrack {
  /** 曲名 */
  name: string;
  bpm: number;
  /** 1 小節の拍数 */
  bpb: number;
  bars: number;
  parts: readonly BgmPart[];
  drums: readonly DrumHit[];
  /** 呪いの動機が鳴る小節（記録用） */
  motif: readonly number[];
}

export const loopBeats = (t: BgmTrack) => t.bars * t.bpb;
export const loopSec = (t: BgmTrack) => (loopBeats(t) * 60) / t.bpm;

const patch = (
  name: string,
  ratio: number,
  index: number,
  sustain: number,
  idecay: number,
  attack: number,
  adecay: number,
  asus: number,
  ring: number,
  vib: boolean,
): FmPatch => ({
  name,
  ratio,
  index,
  sustain,
  idecay,
  attack,
  adecay,
  asus,
  ring,
  vib,
});

/** 音色の一覧（設計書 §3.2 の 17 種） */
export const FM_PATCHES = {
  クワイア: patch('クワイア', 1, 1.2, 0.7, 0.4, 0.09, 2.0, 0.85, 1, true),
  パッド: patch('パッド', 1, 0.8, 0.8, 0.6, 0.25, 2.5, 0.9, 1, false),
  チューブラーベル: patch('チューブラーベル', 3.5, 4, 0.1, 0.5, 0.002, 0.9, 0, 8, false),
  柔らかいベース: patch('ベース', 1, 1.6, 0.5, 0.2, 0.008, 1.2, 0.7, 1, false),
  木管: patch('木管', 2, 1.6, 0.55, 0.25, 0.05, 1.2, 0.8, 1, true),
  ハープ: patch('ハープ', 1, 3.5, 0.25, 0.09, 0.003, 0.35, 0, 2.2, false),
  ベース: patch('ベース', 1, 2.2, 0.5, 0.12, 0.006, 0.7, 0.55, 1, false),
  ウッドベース: patch('ウッドベース', 1, 2.2, 0.35, 0.1, 0.004, 0.5, 0.45, 1, false),
  笛: patch('笛', 1, 0.9, 0.6, 0.3, 0.07, 1.5, 0.85, 1, true),
  しずく: patch('しずく', 3.5, 3, 0.05, 0.15, 0.002, 0.4, 0, 6, false),
  金属のうなり: patch('金属のうなり', 1.41, 2.5, 0.9, 1, 0.3, 3, 0.9, 1, false),
  シンセリード: patch('シンセリード', 1, 2.8, 0.35, 0.1, 0.005, 0.5, 0.7, 1, true),
  ブラス: patch('ブラス', 1, 3.0, 0.6, 0.2, 0.03, 0.8, 0.8, 1, false),
  スラップベース: patch('スラップベース', 1, 3.5, 0.4, 0.05, 0.002, 0.3, 0.5, 1, false),
  ひずみ: patch('ひずみ', 1, 5, 0.8, 0.3, 0.003, 1, 0.9, 1, false),
  弦のきざみ: patch('弦のきざみ', 1, 2, 0.4, 0.08, 0.008, 0.3, 0.7, 1, false),
  ホルン: patch('ホルン', 1, 2.2, 0.6, 0.25, 0.06, 1.5, 0.85, 1, true),
} satisfies Record<string, FmPatch>;

const P = FM_PATCHES;
const part = (
  label: string,
  fm: FmPatch,
  vol: number,
  notes: BgmNote[],
): BgmPart => ({ label, vol, fm, notes });

// ===================== タイトル「鐘と祈り」（docs/bgm-design-title-ja.md）=====================
const title = (): BgmTrack => {
  const prog = ['Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'Gm', 'A', 'A', 'Dm', 'F', 'C', 'Bb', 'Gm', 'Eb', 'A', 'A'];
  return {
    name: '鐘と祈り',
    bpm: 66,
    bpb: 4,
    bars: 16,
    motif: [1, 9],
    drums: [],
    parts: [
      part('メロディ', P.クワイア, 0.65, mel('D4:2 F4:1 E4:1 | A3:4 | F4:2 G4:1 A4:1 | Bb4:4 | G4:2 A4:1 Bb4:1 | D5:3 C5:1 | C#5:4 | E4:4 | D4:2 F4:1 E4:1 | A4:4 | G4:2 E4:2 | F4:4 | D5:2 Bb4:2 | G4:2 Eb4:2 | E4:2 C#4:2 | A3:4')),
      part('和音', P.パッド, 0.17, perBar(prog, 4, (c, beats) => [N(voicing(c, 50), beats)])),
      part('鐘', P.チューブラーベル, 0.26, perBar(prog, 4, (c, beats, i) => (i % 2 === 0 ? [N(at(c.pcs[0], 72), 0.25), R(beats - 0.25)] : [R(beats)]))),
      part('ベース', P.柔らかいベース, 0.8, perBar(prog, 4, (c, beats) => [N(at(c.bass, 36), beats)])),
    ],
  };
};

// ===================== 宿屋「灰の暖炉」（docs/bgm-design-inn-ja.md）=====================
const inn = (): BgmTrack => {
  const prog = ['Eb', 'Bb/D', 'Cm', 'Ab', 'Eb', 'Fm', 'Bb', 'Eb', 'Cm', 'Gm', 'Ab', 'Eb', 'Fm', 'Bb', 'Eb', 'Bb'];
  return {
    name: '灰の暖炉',
    bpm: 84,
    bpb: 3,
    bars: 16,
    motif: [],
    drums: [],
    parts: [
      part('メロディ', P.木管, 0.75, mel('G5:2 F5:1 | Eb5:2 Bb4:1 | C5:2 Eb5:1 | Ab4:3 | G4:1 Bb4:1 Eb5:1 | F5:2 Ab4:1 | D5:2 F5:1 | Eb5:3 | C5:2 Eb5:1 | D5:2 Bb4:1 | C5:1 Eb5:1 Ab5:1 | G5:3 | Ab5:2 F5:1 | D5:2 Bb4:1 | G4:2 Bb4:1 | Bb4:3')),
      part('竪琴', P.ハープ, 0.3, arp(prog, 3, 55, [0, 1, 2, 1, 2, 1])),
      part('ベース', P.ベース, 0.7, perBar(prog, 3, (c, beats) => [N(at(c.bass, 36), beats)])),
    ],
  };
};

// ===================== ダンジョン「見られている迷宮」（docs/bgm-design-dungeon-ja.md）=====================
const dungeon = (): BgmTrack => {
  const prog = ['Am', 'Am', 'Bb', 'Am', 'F', 'E', 'Am', 'Am', 'Dm', 'Bb', 'E', 'E', 'Am', 'Bb', 'E', 'E'];
  const motif = [45, 48, 47, 40]; // A2 C3 B2 E2（呪いの動機）
  return {
    name: '見られている迷宮',
    bpm: 84,
    bpb: 4,
    bars: 16,
    motif: [9, 10, 11, 12],
    drums: [],
    parts: [
      part('ベース', P.ウッドベース, 0.85, perBar(prog, 4, (c, beats, i) => {
        if (i >= 8 && i <= 11) return [N(motif[i - 8], beats)];
        const r = at(c.pcs[0], 40);
        return [N(r, 1), R(0.5), N(r, 0.5), N(at(c.pcs[2], r), 1), N(r, 1)];
      })),
      part('メロディ', P.笛, 0.6, mel('r:4 | r:4 | F5:4 | E5:2 r:2 | r:2 A5:2 | G#5:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | C5:1 B4:1 A4:1 G#4:1 | r:4 | E5:4 | r:4')),
      part('しずく', P.しずく, 0.2, mel('r:4 | r:3 A6:0.25 r:0.75 | r:4 | r:4 | r:4 | r:3 E6:0.25 r:0.75 | r:4 | r:4 | r:4 | r:4 | r:4 | r:2.5 A6:0.25 r:1.25 | r:4 | r:4 | r:4 | r:4')),
      part('濁り', P.金属のうなり, 0.09, perBar(prog, 4, (_c, beats, i) => ([2, 9, 13].includes(i) ? [N([46, 52], 2), R(2)] : [R(beats)]))),
    ],
  };
};

// ===================== バトル「裂ける夜」（docs/bgm-design-battle-ja.md）=====================
const battle = (): BgmTrack => {
  const prog = ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Dm', 'Eb', 'A', 'Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'];
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    if (b === 15) {
      for (let k = 0; k < 8; k++) drums.push({ beat: b * 4 + k * 0.5, kind: 'snare', vel: 0.3 + k * 0.02 });
      continue;
    }
    for (let k = 0; k < 4; k++) {
      drums.push({ beat: b * 4 + k, kind: 'kick', vel: 0.38 });
      if (k % 2) drums.push({ beat: b * 4 + k, kind: 'snare', vel: 0.3 });
      drums.push({ beat: b * 4 + k + 0.5, kind: 'hat', vel: 0.1 });
    }
  }
  // 「タッ・タタ」のベース
  const gallop = (c: Chord) => {
    const r = at(c.pcs[0], 38);
    return [0, 1, 2, 3].flatMap(() => [N(r, 0.5), N(r, 0.25), N(r, 0.25)]);
  };
  return {
    name: '裂ける夜',
    bpm: 172,
    bpb: 4,
    bars: 16,
    motif: [1, 5],
    drums,
    parts: [
      part('メロディ', P.シンセリード, 0.75, mel('D5:1 F5:1 E5:1 A4:1 | D5:0.5 E5:0.5 F5:1 A5:2 | Bb5:1 A5:1 F5:1 D5:1 | C#5:2 E5:2 | D5:1 F5:1 E5:1 A5:1 | G5:1 F5:1 E5:1 D5:1 | Eb5:2 G5:1 F5:1 | E5:2 C#5:2 | G4:1 Bb4:1 D5:1 G5:1 | F5:1 E5:1 D5:2 | A4:1 D5:1 F5:1 A5:1 | G5:2 F5:2 | F5:1 D5:1 Bb4:1 D5:1 | E5:1 G5:1 C5:2 | C#5:1 E5:1 A5:2 | A4:0.5 A4:0.5 C#5:0.5 C#5:0.5 E5:0.5 E5:0.5 A5:1')),
      part('5 度の和音', P.ブラス, 0.24, perBar(prog, 4, (c) => {
        const r = at(c.pcs[0], 50);
        return [N([r, r + 7], 2), N([r, r + 7], 2)];
      })),
      part('ベース', P.スラップベース, 0.85, perBar(prog, 4, gallop)),
      part('ベースの重ね', P.ひずみ, 0.1, perBar(prog, 4, (c) => gallop(c).map((n) => N((n.p as number) + 12, n.len)))),
    ],
  };
};

// ===================== ボス「鉄の行進」（docs/bgm-design-boss-ja.md）=====================
const boss = (): BgmTrack => {
  const prog = ['Em', 'Em', 'C', 'C', 'Am', 'Am', 'B', 'B', 'Em', 'Em', 'F', 'F', 'Am', 'B', 'Em', 'B'];
  // 呪いの動機 E2 G2 F#2 B1 ／ E2 G2 F#2 B2
  const motifBass: Readonly<Record<number, number>> = { 0: 40, 1: 43, 2: 42, 3: 35, 8: 40, 9: 43, 10: 42, 11: 47 };
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    drums.push(
      { beat: b * 4, kind: 'boom', vel: 0.6 },
      { beat: b * 4 + 2, kind: 'boom', vel: 0.45 },
      { beat: b * 4 + 3, kind: 'snare', vel: 0.16 },
    );
    if (b === 7 || b === 15) drums.push({ beat: b * 4 + 3.5, kind: 'snare', vel: 0.38 });
  }
  return {
    name: '鉄の行進',
    bpm: 120,
    bpb: 4,
    bars: 16,
    motif: [1, 2, 3, 4, 9, 10, 11, 12],
    drums,
    parts: [
      part('震える和音', P.弦のきざみ, 0.4, perBar(prog, 4, (c) => {
        const tones: number[] = [];
        for (let p = 62; p <= 81; p++) if (c.pcs.includes(p % 12)) tones.push(p);
        const [lo, mid, hi] = tones.slice(-3);
        return [hi, hi, mid, mid, lo, lo, mid, mid].map((p) => N(p, 0.5));
      })),
      part('角笛', P.ホルン, 0.55, mel('r:16 | B4:2 E5:2 | D5:2 C5:2 | B4:4 | B4:4 | r:16 | E5:2 G5:2 | F#5:2 E5:2 | D#5:4 | B4:4')),
      part('和音', P.ブラス, 0.18, perBar(prog, 4, (c) => [N(voicing(c, 50), 4)])),
      part('ベース', P.柔らかいベース, 0.85, perBar(prog, 4, (c, beats, i) => [N(motifBass[i] ?? at(c.pcs[0], 40), beats)])),
    ],
  };
};

export const BGM: Readonly<Record<BgmName, BgmTrack>> = {
  title: title(),
  inn: inn(),
  dungeon: dungeon(),
  battle: battle(),
  boss: boss(),
};
