/**
 * BGM の曲データ（仕様書 §26.9。v1.7）。2026-11-06 にオーナーが試聴ページで選んだ 6 曲（FM 音源風）。
 * 原曲はどれも著作権の切れたクラシック・民謡で、有名な部分を短く編曲した（宿屋の伴奏はこのゲーム用の自前の編曲）。
 * 試聴ページの元は docs/requests/bgm-listen/（この値と同じ）。
 */
import { type BgmNote, type Chord, N, R, at, mel, perBar, voicing } from './bgm-notation';

export type { BgmNote } from './bgm-notation';

export type BgmName = 'title' | 'inn' | 'dungeon' | 'battle' | 'boss' | 'clear';

/** 2 オペレーターの FM の音色（仕様書 §26.2） */
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
  /** 曲名（原曲） */
  name: string;
  bpm: number;
  /** 1 小節の拍数（4 分音符 = 1。5/8 拍子は 2.5） */
  bpb: number;
  bars: number;
  parts: readonly BgmPart[];
  drums: readonly DrumHit[];
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

/** 音色の一覧（20 種。v1.6 までの 17 種に、高い弦・オルガン・低い弦を足した） */
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
  高い弦: patch('高い弦', 1, 0.7, 0.85, 0.8, 0.35, 3, 0.95, 1, true),
  オルガン: patch('オルガン', 2, 0.5, 0.95, 1, 0.02, 4, 0.95, 1, false),
  低い弦: patch('低い弦', 1, 1.4, 0.7, 0.3, 0.04, 1.5, 0.85, 1, false),
} satisfies Record<string, FmPatch>;

const P = FM_PATCHES;
const part = (label: string, fm: FmPatch, vol: number, notes: BgmNote[]): BgmPart => ({ label, vol, fm, notes });

// ===================== タイトル：ワーグナー『ローエングリン』第 1 幕への前奏曲（イ長調・4/4）=====================
// 高い弦の和音が静かに続き、その上で旋律がゆっくり上っていく（冒頭の雰囲気に寄せた）
const title = (): BgmTrack => {
  const prog = ['A', 'A', 'D', 'A', 'F#m', 'C#m', 'D', 'E', 'A', 'D', 'E', 'C#m', 'D', 'A', 'E', 'E'];
  return {
    name: 'ローエングリン 第 1 幕への前奏曲（ワーグナー）',
    bpm: 52,
    bpb: 4,
    bars: 16,
    drums: [],
    parts: [
      part('旋律', P.高い弦, 0.6, mel('E5:4 | A5:3 G#5:1 | F#5:2 A5:2 | E5:4 | C#5:2 F#5:2 | E5:2 G#5:2 | F#5:2 A5:2 | B5:4 | C#6:4 | A5:2 F#5:2 | G#5:2 B5:2 | E6:4 | D6:2 B5:2 | A5:2 C#6:2 | B5:3 A5:1 | G#5:4')),
      part('高い和音', P.高い弦, 0.16, perBar(prog, 4, (c, beats) => [N(voicing(c, 69), beats)])),
      part('和音', P.パッド, 0.12, perBar(prog, 4, (c, beats) => [N(voicing(c, 57), beats)])),
      part('ベース', P.柔らかいベース, 0.45, perBar(prog, 4, (c, beats, i) => (i < 4 ? [R(beats)] : [N(at(c.bass, 33), beats)]))),
    ],
  };
};

// ===================== 宿屋：民謡「グリーンスリーヴス」（イ短調・3/4）=====================
// 旋律は 16 世紀のイングランド民謡。和音・伴奏はこのゲーム用（ヴォーン・ウィリアムズの編曲は使わない）
const inn = (): BgmTrack => {
  const prog = ['Am', 'G', 'G', 'Em', 'Am', 'Am', 'E', 'Am', 'Am', 'G', 'G', 'Em', 'Am', 'E', 'Am', 'E'];
  return {
    name: 'グリーンスリーヴス（イングランド民謡）',
    bpm: 100,
    bpb: 3,
    bars: 16,
    drums: [],
    parts: [
      part('旋律', P.笛, 0.7, mel('C5:2 D5:1 | E5:1.5 F#5:0.5 E5:1 | D5:2 B4:1 | G4:1.5 A4:0.5 B4:1 | C5:2 A4:1 | A4:1.5 G#4:0.5 A4:1 | B4:2 G#4:1 | E4:2 A4:1 | C5:2 D5:1 | E5:1.5 F#5:0.5 E5:1 | D5:2 B4:1 | G4:1.5 A4:0.5 B4:1 | C5:1.5 B4:0.5 A4:1 | G#4:1.5 F#4:0.5 G#4:1 | A4:3 | A4:2 A4:1')),
      part('竪琴', P.ハープ, 0.28, perBar(prog, 3, (c) => {
        const [a, b, d] = voicing(c, 52);
        return [N(a, 0.5), N(b, 0.5), N(d, 0.5), N(b + 12, 0.5), N(d, 0.5), N(b, 0.5)];
      })),
      part('ベース', P.ベース, 0.55, perBar(prog, 3, (c) => [N(at(c.bass, 40), 2), N(at(c.pcs[2], 40), 1)])),
    ],
  };
};

// ===================== ダンジョン：ラフマニノフ『死の島』（イ短調・5/8）=====================
// 低い弦が舟をこぐように 5 拍子で揺れる。後半に「怒りの日」（ディエス・イレ）の旋律
const dungeon = (): BgmTrack => {
  const prog = ['Am', 'Am', 'Am', 'Am', 'F', 'F', 'E', 'E', 'Am', 'Am', 'Dm', 'Dm', 'Bb', 'Bb', 'E', 'E'];
  const bpb = 2.5;
  return {
    name: '死の島（ラフマニノフ）',
    bpm: 72,
    bpb,
    bars: 16,
    drums: [],
    parts: [
      part('揺れる低い弦', P.低い弦, 0.7, perBar(prog, bpb, (c: Chord) => {
        const r = at(c.pcs[0], 40);
        const third = at(c.pcs[1], r);
        return [N(r, 0.5), N(r + 2, 0.5), N(third, 0.5), N(r + 2, 0.5), N(r, 0.5)];
      })),
      part('低い和音', P.パッド, 0.13, perBar(prog, bpb, (c, beats) => [N(voicing(c, 52), beats)])),
      part('怒りの日', P.ホルン, 0.45, mel('r:2.5 | r:2.5 | r:2.5 | r:2.5 | r:2.5 | r:2.5 | r:2.5 | r:2.5 | C4:1 B3:0.5 C4:1 | A3:1 B3:0.5 G3:1 | A3:1.5 A3:1 | r:2.5 | C4:1 D4:0.5 C4:1 | B3:1 A3:0.5 B3:1 | G#3:2.5 | r:2.5')),
      part('しずく', P.しずく, 0.12, mel('r:2.5 | r:2 E6:0.25 r:0.25 | r:2.5 | r:2.5 | r:2.5 | r:1.5 A5:0.25 r:0.75 | r:2.5 | r:2.5 | r:2.5 | r:2.5 | r:2.5 | r:2 D6:0.25 r:0.25 | r:2.5 | r:2.5 | r:2.5 | r:2.5')),
    ],
  };
};

// ===================== 戦闘：ホルスト『惑星』より「火星」（ト調・5/4）=====================
// 5 拍子のくり返し（タタタ・ターン・ターン・タタ・ターン）がずっと続き、上で金管が主題を吹く
const battle = (): BgmTrack => {
  const bpb = 5;
  const t3 = 1 / 3;
  const rhythm = [t3, t3, t3, 1, 1, 0.5, 0.5, 1];
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    let beat = b * bpb;
    for (const [k, len] of rhythm.entries()) {
      drums.push({ beat, kind: k < 3 || k === 5 || k === 6 ? 'snare' : 'boom', vel: k < 3 ? 0.18 : 0.4 });
      beat += len;
    }
  }
  const ostinato = (p: number) => rhythm.map((len) => N(p, len));
  const prog = Array.from({ length: 16 }, () => 'G');
  // G の上で、ずれた和音が少しずつ動く（G・D の 5 度に、Eb・Db などがぶつかる）
  const tops: readonly (readonly number[])[] = [[55, 62], [55, 62], [55, 63], [55, 63], [55, 62, 66], [55, 62, 66], [56, 61, 65], [56, 62, 65], [55, 62, 67], [56, 63, 67], [55, 62, 65], [54, 62, 66], [55, 62, 67], [54, 62, 66], [55, 62, 67], [54, 62, 66]];
  return {
    name: '火星 — 戦いの神（ホルスト『惑星』）',
    bpm: 168,
    bpb,
    bars: 16,
    drums,
    parts: [
      part('くり返し', P.弦のきざみ, 0.5, prog.flatMap(() => ostinato(43))),
      part('くり返しの重ね', P.ひずみ, 0.08, prog.flatMap(() => ostinato(31))),
      part('金管の主題', P.ブラス, 0.45, mel('r:5 | r:5 | r:5 | r:5 | D4:3 Eb4:2 | D4:5 | Db4:3 C4:2 | D4:5 | G4:3 Ab4:2 | G4:2 F4:1 Eb4:2 | D4:5 | D4:5 | Bb4:2 A4:1 G4:2 | F#4:5 | G4:2.5 D4:2.5 | D4:5')),
      part('和音', P.ホルン, 0.2, perBar(prog, bpb, (_c, beats, i) => [N(tops[i], beats)])),
    ],
  };
};

// ===================== ボス戦：ムソルグスキー『展覧会の絵』より「カタコンベ」（ロ短調・3/4）=====================
// 重い金管の和音が、強い音と弱い音を交互にくり返す。緊張を保つため、低い太鼓を足した
const boss = (): BgmTrack => {
  const prog = ['Bm', 'Bm', 'G', 'G', 'Em', 'F#', 'Bm', 'Bm', 'D', 'D', 'G', 'C', 'F#', 'F#', 'Bm', 'F#'];
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    drums.push({ beat: b * 3, kind: 'boom', vel: b % 2 === 0 ? 0.6 : 0.3 });
    if (b % 4 === 3) drums.push({ beat: b * 3 + 2.5, kind: 'snare', vel: 0.2 });
  }
  return {
    name: 'カタコンベ（ローマ時代の墓）（ムソルグスキー『展覧会の絵』）',
    bpm: 60,
    bpb: 3,
    bars: 16,
    drums,
    parts: [
      part('強い和音', P.ブラス, 0.4, perBar(prog, 3, (c, beats, i) => (i % 2 === 0 ? [N(voicing(c, 54), beats)] : [R(beats)]))),
      part('弱い和音', P.パッド, 0.2, perBar(prog, 3, (c, beats, i) => (i % 2 === 1 ? [N(voicing(c, 59), beats)] : [R(beats)]))),
      part('上の声', P.ホルン, 0.4, mel('B4:3 | D5:3 | D5:3 | B4:3 | G4:3 | A#4:3 | B4:3 | F#4:3 | A4:3 | F#4:3 | B4:3 | C5:3 | C#5:3 | A#4:3 | B4:3 | A#4:3')),
      part('ベース', P.柔らかいベース, 0.85, perBar(prog, 3, (c, beats) => [N(at(c.bass, 35), beats)])),
    ],
  };
};

// ===================== ボス撃破・クリア：フォーレ『レクイエム』より「イン・パラディス」（ニ長調・3/4）=====================
// オルガンの細かい分散和音がずっと流れ、その上でソプラノが静かに歌う
const clear = (): BgmTrack => {
  const prog = ['D', 'D', 'G/D', 'D', 'Bm', 'G', 'A', 'A', 'D', 'F#m', 'G', 'D', 'Em', 'A', 'D', 'A'];
  return {
    name: 'イン・パラディス（フォーレ『レクイエム』）',
    bpm: 66,
    bpb: 3,
    bars: 16,
    drums: [],
    parts: [
      part('オルガンの分散和音', P.オルガン, 0.22, perBar(prog, 3, (c) => {
        const [a, b, d] = voicing(c, 62);
        return [a, b, d, b + 12, d, b, a, b, d, b + 12, d, b].map((p) => N(p, 0.25));
      })),
      part('ソプラノ', P.クワイア, 0.5, mel('A5:3 | F#5:2 G5:1 | A5:2 B5:1 | A5:3 | F#5:2 D5:1 | E5:2 D5:1 | C#5:3 | E5:3 | F#5:2 A5:1 | A5:2 G#5:1 | B5:2 A5:1 | F#5:3 | G5:2 E5:1 | E5:2 C#5:1 | D5:3 | E5:3')),
      part('ペダル', P.柔らかいベース, 0.5, perBar(prog, 3, (c, beats) => [N(at(c.bass, 38), beats)])),
    ],
  };
};

export const BGM: Readonly<Record<BgmName, BgmTrack>> = {
  title: title(),
  inn: inn(),
  dungeon: dungeon(),
  battle: battle(),
  boss: boss(),
  clear: clear(),
};
