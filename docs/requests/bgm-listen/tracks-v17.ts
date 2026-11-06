// 試聴用の曲データ（変更の依頼 v1.7 の案）。ゲームの曲データ（src/logic/bgm-tracks.ts）と同じ形・同じ記法。
// 再生の仕組み（src/audio/bgm.ts）の import '../logic/bgm-tracks' をこのファイルに差し替えて鳴らす。
import { at, chord, mel, N, perBar, R, voicing, type BgmNote, type Chord } from '../../../src/logic/bgm-notation.ts';
import { BGM as OLD, FM_PATCHES, loopBeats, loopSec, type BgmPart, type BgmTrack, type DrumHit, type FmPatch } from '../../../src/logic/bgm-tracks.ts';

export { loopBeats, loopSec };
export type { BgmTrack, FmPatch, DrumHit };
export type DrumKind = 'kick' | 'snare' | 'hat' | 'boom';

const patch = (name: string, ratio: number, index: number, sustain: number, idecay: number, attack: number, adecay: number, asus: number, ring: number, vib: boolean): FmPatch =>
  ({ name, ratio, index, sustain, idecay, attack, adecay, asus, ring, vib });

/** いまの 17 種に足す音色 */
const P = {
  ...FM_PATCHES,
  高い弦: patch('高い弦', 1, 0.7, 0.85, 0.8, 0.35, 3, 0.95, 1, true),
  オルガン: patch('オルガン', 2, 0.5, 0.95, 1, 0.02, 4, 0.95, 1, false),
  低い弦: patch('低い弦', 1, 1.4, 0.7, 0.3, 0.04, 1.5, 0.85, 1, false),
};
const part = (label: string, fm: FmPatch, vol: number, notes: BgmNote[]): BgmPart => ({ label, vol, fm, notes });

/** 拍数の合計（テストの代わりに、組み立てるときに確かめる） */
function check(t: BgmTrack): BgmTrack {
  const want = t.bars * t.bpb;
  for (const p of t.parts) {
    const got = p.notes.reduce((s, n) => s + n.len, 0);
    if (Math.abs(got - want) > 1e-6) throw new Error(`${t.name} ${p.label}: ${got} 拍（${want} 拍のはず）`);
  }
  return t;
}

// ===== タイトル：ワーグナー『ローエングリン』第 1 幕への前奏曲（イ長調・4/4・ゆっくり）=====
// 高い弦の和音が静かに続き、その上で旋律がゆっくり上っていく雰囲気に寄せた
const title = (): BgmTrack => {
  const prog = ['A', 'A', 'D', 'A', 'F#m', 'C#m', 'D', 'E', 'A', 'D', 'E', 'C#m', 'D', 'A', 'E', 'E'];
  return check({
    name: 'ローエングリン 第 1 幕への前奏曲（ワーグナー）',
    bpm: 52, bpb: 4, bars: 16, motif: [], drums: [],
    parts: [
      part('旋律', P.高い弦, 0.6, mel('E5:4 | A5:3 G#5:1 | F#5:2 A5:2 | E5:4 | C#5:2 F#5:2 | E5:2 G#5:2 | F#5:2 A5:2 | B5:4 | C#6:4 | A5:2 F#5:2 | G#5:2 B5:2 | E6:4 | D6:2 B5:2 | A5:2 C#6:2 | B5:3 A5:1 | G#5:4')),
      part('高い和音', P.高い弦, 0.16, perBar(prog, 4, (c, beats) => [N(voicing(c, 69), beats)])),
      part('和音', P.パッド, 0.12, perBar(prog, 4, (c, beats) => [N(voicing(c, 57), beats)])),
      part('ベース', P.柔らかいベース, 0.45, perBar(prog, 4, (c, beats, i) => (i < 4 ? [R(beats)] : [N(at(c.bass, 33), beats)]))),
    ],
  });
};

// ===== 宿屋：民謡「グリーンスリーヴス」（自前の編曲。イ短調・3/4）=====
// 旋律は 16 世紀の民謡。和音・伴奏はこのゲーム用（ヴォーン・ウィリアムズの編曲は使わない）
const inn = (): BgmTrack => {
  const prog = ['Am', 'G', 'G', 'Em', 'Am', 'Am', 'E', 'Am', 'Am', 'G', 'G', 'Em', 'Am', 'E', 'Am', 'E'];
  return check({
    name: 'グリーンスリーヴス（イングランド民謡）',
    bpm: 100, bpb: 3, bars: 16, motif: [], drums: [],
    parts: [
      part('旋律', P.笛, 0.7, mel('C5:2 D5:1 | E5:1.5 F#5:0.5 E5:1 | D5:2 B4:1 | G4:1.5 A4:0.5 B4:1 | C5:2 A4:1 | A4:1.5 G#4:0.5 A4:1 | B4:2 G#4:1 | E4:2 A4:1 | C5:2 D5:1 | E5:1.5 F#5:0.5 E5:1 | D5:2 B4:1 | G4:1.5 A4:0.5 B4:1 | C5:1.5 B4:0.5 A4:1 | G#4:1.5 F#4:0.5 G#4:1 | A4:3 | A4:2 A4:1')),
      part('竪琴', P.ハープ, 0.28, perBar(prog, 3, (c) => {
        const [a, b, d] = voicing(c, 52);
        return [N(a, 0.5), N(b, 0.5), N(d, 0.5), N(b + 12, 0.5), N(d, 0.5), N(b, 0.5)];
      })),
      part('ベース', P.ベース, 0.55, perBar(prog, 3, (c) => [N(at(c.bass, 40), 2), N(at(c.pcs[2], 40), 1)])),
    ],
  });
};

// ===== ダンジョン：ラフマニノフ『死の島』（イ短調・5/8）=====
// 低い弦が舟をこぐように 5 拍子で揺れる。後半に「怒りの日」（ディエス・イレ）の旋律
const dungeon = (): BgmTrack => {
  const prog = ['Am', 'Am', 'Am', 'Am', 'F', 'F', 'E', 'E', 'Am', 'Am', 'Dm', 'Dm', 'Bb', 'Bb', 'E', 'E'];
  const bpb = 2.5;
  return check({
    name: '死の島（ラフマニノフ）',
    bpm: 72, bpb, bars: 16, motif: [], drums: [],
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
  });
};

// ===== 戦闘：ホルスト『惑星』より「火星」（ト調・5/4）=====
// 弦の木の部分で打つ 5 拍子のくり返し（タタタ・ターン・ターン・タタ・ターン）がずっと続き、上で金管が主題を吹く
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
  const prog = ['G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G'];
  return check({
    name: '火星 — 戦いの神（ホルスト『惑星』）',
    bpm: 168, bpb, bars: 16, motif: [], drums,
    parts: [
      part('くり返し', P.弦のきざみ, 0.5, prog.flatMap(() => ostinato(43))),
      part('くり返しの重ね', P.ひずみ, 0.08, prog.flatMap(() => ostinato(31))),
      part('金管の主題', P.ブラス, 0.45, mel('r:5 | r:5 | r:5 | r:5 | D4:3 Eb4:2 | D4:5 | Db4:3 C4:2 | D4:5 | G4:3 Ab4:2 | G4:2 F4:1 Eb4:2 | D4:5 | D4:5 | Bb4:2 A4:1 G4:2 | F#4:5 | G4:2.5 D4:2.5 | D4:5')),
      // G の上で、ずれた和音が少しずつ動く（G・D の 5 度に、Eb・Db などがぶつかる）
      part('和音', P.ホルン, 0.2, perBar(prog, bpb, (_c, beats, i) => {
        const tops: number[][] = [[55, 62], [55, 62], [55, 63], [55, 63], [55, 62, 66], [55, 62, 66], [56, 61, 65], [56, 62, 65], [55, 62, 67], [56, 63, 67], [55, 62, 65], [54, 62, 66], [55, 62, 67], [54, 62, 66], [55, 62, 67], [54, 62, 66]];
        return [N(tops[i], beats)];
      })),
    ],
  });
};

// ===== ボス戦：ムソルグスキー『展覧会の絵』より「カタコンベ」（ロ短調・3/4・ゆっくり）=====
// 重い金管の和音が、強い音と弱い音を交互にくり返す（和音はピアノの原曲から）。緊張を保つため、低い太鼓を足した
const boss = (): BgmTrack => {
  const prog = ['Bm', 'Bm', 'G', 'G', 'Em', 'F#', 'Bm', 'Bm', 'D', 'D', 'G', 'C', 'F#', 'F#', 'Bm', 'F#'];
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    drums.push({ beat: b * 3, kind: 'boom', vel: b % 2 === 0 ? 0.6 : 0.3 });
    if (b % 4 === 3) drums.push({ beat: b * 3 + 2.5, kind: 'snare', vel: 0.2 });
  }
  return check({
    name: 'カタコンベ（ローマ時代の墓）（ムソルグスキー『展覧会の絵』）',
    bpm: 60, bpb: 3, bars: 16, motif: [], drums,
    parts: [
      part('強い和音', P.ブラス, 0.4, perBar(prog, 3, (c, beats, i) => (i % 2 === 0 ? [N(voicing(c, 54), beats)] : [R(beats)]))),
      part('弱い和音', P.パッド, 0.2, perBar(prog, 3, (c, beats, i) => (i % 2 === 1 ? [N(voicing(c, 59), beats)] : [R(beats)]))),
      part('上の声', P.ホルン, 0.4, mel('B4:3 | D5:3 | D5:3 | B4:3 | G4:3 | A#4:3 | B4:3 | F#4:3 | A4:3 | F#4:3 | B4:3 | C5:3 | C#5:3 | A#4:3 | B4:3 | A#4:3')),
      part('ベース', P.柔らかいベース, 0.85, perBar(prog, 3, (c, beats) => [N(at(c.bass, 35), beats)])),
    ],
  });
};

// ===== ボス撃破・クリア：フォーレ『レクイエム』より「イン・パラディス」（ニ長調・3/4）=====
// オルガンの細かい分散和音がずっと流れ、その上でソプラノが静かに歌う
const clear = (): BgmTrack => {
  const prog = ['D', 'D', 'G/D', 'D', 'Bm', 'G', 'A', 'A', 'D', 'F#m', 'G', 'D', 'Em', 'A', 'D', 'A'];
  return check({
    name: 'イン・パラディス（フォーレ『レクイエム』）',
    bpm: 66, bpb: 3, bars: 16, motif: [], drums: [],
    parts: [
      part('オルガンの分散和音', P.オルガン, 0.22, perBar(prog, 3, (c) => {
        const [a, b, d] = voicing(c, 62);
        return [a, b, d, b + 12, d, b, a, b, d, b + 12, d, b].map((p) => N(p, 0.25));
      })),
      part('ソプラノ', P.クワイア, 0.5, mel('A5:3 | F#5:2 G5:1 | A5:2 B5:1 | A5:3 | F#5:2 D5:1 | E5:2 D5:1 | C#5:3 | E5:3 | F#5:2 A5:1 | A5:2 G#5:1 | B5:2 A5:1 | F#5:3 | G5:2 E5:1 | E5:2 C#5:1 | D5:3 | E5:3')),
      part('ペダル', P.柔らかいベース, 0.5, perBar(prog, 3, (c, beats) => [N(at(c.bass, 38), beats)])),
    ],
  });
};

export const BGM: Record<string, BgmTrack> = {
  title: title(),
  inn: inn(),
  dungeon: dungeon(),
  battle: battle(),
  boss: boss(),
  clear: clear(),
  old_title: OLD.title,
  old_inn: OLD.inn,
  old_dungeon: OLD.dungeon,
  old_battle: OLD.battle,
  old_boss: OLD.boss,
};
