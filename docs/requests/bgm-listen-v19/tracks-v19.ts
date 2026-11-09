// 試聴用の曲データ（変更の依頼 v1.9 の案）。ゲームの曲データ（src/logic/bgm-tracks.ts）と同じ形・同じ記法。
// 再生の仕組み（src/audio/bgm.ts）の import '../logic/bgm-tracks' をこのファイルに差し替えて鳴らす。
// ボス戦の候補 3 曲（どれも著作権の切れた曲）と、入れ替え（タイトル←カタコンベ、宿屋←ローエングリン）を聴き比べる。
import { at, mel, N, perBar, R, voicing, type BgmNote, type Chord } from '../../../src/logic/bgm-notation.ts';
import { BGM as OLD, FM_PATCHES, loopBeats, loopSec, type BgmPart, type BgmTrack, type DrumHit, type FmPatch } from '../../../src/logic/bgm-tracks.ts';

export { loopBeats, loopSec };
export type { BgmTrack, FmPatch, DrumHit };
export type DrumKind = 'kick' | 'snare' | 'hat' | 'boom';

const P = FM_PATCHES;
const part = (label: string, fm: FmPatch, vol: number, notes: BgmNote[]): BgmPart => ({ label, vol, fm, notes });

/** 拍数の合計（テストの代わりに、組み立てるときに確かめる） */
function check(t: BgmTrack): BgmTrack {
  const want = t.bars * t.bpb;
  for (const p of t.parts) {
    const got = p.notes.reduce((s, n) => s + n.len, 0);
    if (Math.abs(got - want) > 1e-6) throw new Error(`${t.name} ${p.label}: ${got} 拍（${want} 拍のはず）`);
  }
  for (const d of t.drums) if (d.beat < 0 || d.beat >= want) throw new Error(`${t.name} 打楽器 ${d.beat}`);
  return t;
}

/** start から下へ、音階 pcs の音を n 個（start が音階の外なら、その下の音から） */
function down(start: number, n: number, pcs: readonly number[]): number[] {
  const out: number[] = [];
  for (let m = start; out.length < n; m--) if (pcs.includes(((m % 12) + 12) % 12)) out.push(m);
  return out;
}

// ===== 候補 A：ヴェルディ『レクイエム』より「怒りの日」（ト短調・4/4・速く）=====
// 全部の楽器が和音を叩きつけ、そのあいだに大太鼓が裏で鳴る。弦が駆け下り、合唱が「怒りの日」と叫ぶ
const verdi = (): BgmTrack => {
  const bpb = 4;
  const prog = ['Gm', 'Gm', 'Gm', 'D', 'Gm', 'D', 'Gm', 'D', 'Gm', 'Cm', 'Gm D', 'Gm', 'Eb', 'Cm', 'D', 'D'];
  const hammer = (i: number) => i < 4 || i >= 12;
  const gMinor = [7, 9, 10, 0, 2, 3, 6]; // ト短調（和声的短音階）
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    const s = b * bpb;
    if (hammer(b)) {
      drums.push({ beat: s, kind: 'boom', vel: 0.75 }, { beat: s + 1.5, kind: 'boom', vel: 0.55 }, { beat: s + 2, kind: 'boom', vel: 0.75 }, { beat: s + 3.5, kind: 'boom', vel: 0.55 });
    } else {
      drums.push({ beat: s, kind: 'boom', vel: 0.4 }, { beat: s + 2, kind: 'boom', vel: 0.3 });
      if (b % 2 === 1) drums.push({ beat: s + 3.5, kind: 'snare', vel: 0.15 });
    }
  }
  return check({
    name: '怒りの日（ヴェルディ『レクイエム』）',
    bpm: 132,
    bpb,
    bars: 16,
    drums,
    parts: [
      part('叩きつける和音', P.ブラス, 0.4, perBar(prog, bpb, (c, beats, i) => {
        if (!hammer(i)) return [R(beats)];
        const v = voicing(c, 55);
        return [N(v, 1), R(1), N(v, 1), R(1)];
      })),
      part('駆け下りる弦', P.弦のきざみ, 0.32, perBar(prog, bpb, (c: Chord, beats, i) => {
        const top = at(c.pcs[0], 74);
        if (hammer(i)) {
          const a = down(top, 4, gMinor).map((p) => N(p, 0.25));
          const b = down(top - 5, 4, gMinor).map((p) => N(p, 0.25));
          return [R(1), ...a, R(1), ...b];
        }
        return down(top, Math.round(beats / 0.5), gMinor).map((p) => N(p, 0.5));
      })),
      part('合唱', P.クワイア, 0.55, mel('r:4 | r:4 | r:4 | r:4 | D5:2 D5:2 | C5:1 Bb4:1 A4:2 | Bb4:2 G4:2 | A4:4 | D5:2 D5:2 | Eb5:1 D5:1 C5:2 | Bb4:2 A4:2 | G4:4 | G5:2 Eb5:2 | Eb5:2 C5:2 | D5:4 | D5:4')),
      part('伸ばす和音', P.ホルン, 0.18, perBar(prog, bpb, (c, beats, i) => (hammer(i) ? [R(beats)] : [N(voicing(c, 55), beats)]))),
      part('ベース', P.柔らかいベース, 0.8, perBar(prog, bpb, (c, beats, i) => {
        const r = at(c.bass, 38);
        return hammer(i) ? [N(r, 1), R(1), N(r, 1), R(1)] : [N(r, beats)];
      })),
    ],
  });
};

// ===== 候補 B：モーツァルト『レクイエム』より「怒りの日」（ニ短調・4/4・とても速く）=====
// 弦が細かく刻み続ける上で、合唱が和音をそろえて打ち込むように歌う
const mozart = (): BgmTrack => {
  const bpb = 4;
  const prog = ['Dm', 'Dm A/C#', 'Dm', 'A', 'Dm', 'Gm', 'A', 'Dm', 'F', 'C', 'Dm A', 'Dm', 'Gm', 'Dm', 'A', 'A'];
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    drums.push({ beat: b * bpb, kind: 'boom', vel: 0.5 }, { beat: b * bpb + 2, kind: 'boom', vel: 0.35 });
  }
  return check({
    name: '怒りの日（モーツァルト『レクイエム』）',
    bpm: 144,
    bpb,
    bars: 16,
    drums,
    parts: [
      part('合唱', P.クワイア, 0.42, perBar(prog, bpb, (c, beats, i) => {
        const v = voicing(c, 62);
        if (i % 4 === 3) return [N(v, beats)];
        return Array.from({ length: Math.round(beats) }, () => N(v, 1));
      })),
      part('刻む弦', P.弦のきざみ, 0.3, perBar(prog, bpb, (c, beats) => {
        const r = at(c.pcs[0], 62);
        const t = at(c.pcs[1], r + 1);
        const fig = [r, r + 12, t + 12, r + 12];
        return Array.from({ length: Math.round(beats / 0.25) }, (_, j) => N(fig[j % 4], 0.25));
      })),
      part('金管', P.ブラス, 0.28, perBar(prog, bpb, (c, beats, i) => {
        if (i % 2 === 1) return [R(beats)];
        const r = at(c.pcs[0], 50);
        return [N([r, at(c.pcs[2], r + 1)], 1), R(beats - 1)];
      })),
      part('ベース', P.低い弦, 0.5, perBar(prog, bpb, (c, beats) => Array.from({ length: Math.round(beats / 0.5) }, () => N(at(c.bass, 38), 0.5)))),
    ],
  });
};

// ===== 候補 D：モーツァルト『レクイエム』より「怒りの日」の暗い版（ニ短調・4/4・速く）=====
// 候補 B を低くし、長調の和音（F・C）を暗い和音（Bb・Gm）に替えた。刻みは低い弦、金属のうなりと鐘を足した
const mozartDark = (): BgmTrack => {
  const bpb = 4;
  const prog = ['Dm', 'Dm A/C#', 'Dm', 'A', 'Dm', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'Dm A', 'Dm', 'Gm', 'Dm', 'A', 'A'];
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    drums.push({ beat: b * bpb, kind: 'boom', vel: 0.55 }, { beat: b * bpb + 2, kind: 'boom', vel: 0.3 });
    if (b % 4 === 3) drums.push({ beat: b * bpb + 3.5, kind: 'snare', vel: 0.12 });
  }
  return check({
    name: '怒りの日（モーツァルト『レクイエム』・暗い版）',
    bpm: 126,
    bpb,
    bars: 16,
    drums,
    parts: [
      part('低い合唱', P.クワイア, 0.45, perBar(prog, bpb, (c, beats, i) => {
        const v = voicing(c, 50);
        if (i % 4 === 3) return [N(v, beats)];
        return Array.from({ length: Math.round(beats) }, () => N(v, 1));
      })),
      part('刻む低い弦', P.低い弦, 0.32, perBar(prog, bpb, (c, beats) => {
        const r = at(c.pcs[0], 38);
        const fig = [r, r + 12, r + 7, r + 12];
        return Array.from({ length: Math.round(beats / 0.25) }, (_, j) => N(fig[j % 4], 0.25));
      })),
      part('金属のうなり', P.金属のうなり, 0.07, perBar(prog, bpb, (c, beats) => [N(at(c.bass, 50), beats)])),
      part('ホルン', P.ホルン, 0.26, perBar(prog, bpb, (c, beats, i) => {
        if (i % 2 === 1) return [R(beats)];
        const r = at(c.pcs[0], 45);
        return [N([r, at(c.pcs[2], r + 1)], 1), R(beats - 1)];
      })),
      part('鐘', P.チューブラーベル, 0.12, perBar(prog, bpb, (_c, beats, i) => (i % 4 === 0 ? [N(50, 1), R(beats - 1)] : [R(beats)]))),
      part('ベース', P.柔らかいベース, 0.6, perBar(prog, bpb, (c, beats) => Array.from({ length: Math.round(beats / 0.5) }, () => N(at(c.bass, 33), 0.5)))),
    ],
  });
};

// ===== 候補 C：グレゴリオ聖歌「怒りの日」（ニ調・4/4・ゆっくりめ）=====
// 中世の聖歌の旋律を合唱が歌い、鐘とオルガンが鳴り続ける。戦いの緊張を保つため、低い弦の刻みと太鼓を足した
// （ダンジョンの曲『死の島』の後半にも、この旋律の頭が出てくる）
const chant = (): BgmTrack => {
  const bpb = 4;
  const prog = ['Dm', 'Dm', 'Dm', 'Dm', 'Dm', 'Dm', 'Dm', 'C', 'Dm', 'Dm', 'Dm', 'Dm', 'Dm', 'Bb', 'C', 'Dm'];
  const A = 'F4:1 E4:1 F4:1 D4:1 | E4:1 C4:1 D4:2';
  const B = 'F4:1 F4:1 G4:1 F4:1 | E4:1 D4:1 C4:1 E4:1 | D4:4';
  const drums: DrumHit[] = [];
  for (let b = 0; b < 16; b++) {
    const s = b * bpb;
    drums.push({ beat: s, kind: 'boom', vel: 0.55 }, { beat: s + 2, kind: 'boom', vel: 0.35 });
    if (b % 4 === 3) drums.push({ beat: s + 3, kind: 'snare', vel: 0.12 }, { beat: s + 3.5, kind: 'snare', vel: 0.2 });
  }
  return check({
    name: '怒りの日（グレゴリオ聖歌）',
    bpm: 84,
    bpb,
    bars: 16,
    drums,
    parts: [
      part('聖歌', P.クワイア, 0.6, mel(`r:4 | r:4 | ${A} | ${A} | ${B} | ${A} | ${A} | ${B}`)),
      part('金管の重ね', P.ブラス, 0.25, mel(`r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | r:4 | ${A.replace(/4:/g, '3:')} | ${A.replace(/4:/g, '3:')} | ${B.replace(/4:/g, '3:')}`)),
      part('オルガン', P.オルガン, 0.14, perBar(prog, bpb, (c, beats) => [N(voicing(c, 50), beats)])),
      part('鐘', P.チューブラーベル, 0.16, perBar(prog, bpb, (_c, beats, i) => (i % 2 === 0 ? [N(62, 1), R(beats - 1)] : [R(beats)]))),
      part('刻む低い弦', P.低い弦, 0.5, perBar(prog, bpb, (c, beats) => Array.from({ length: Math.round(beats / 0.5) }, () => N(at(c.bass, 38), 0.5)))),
    ],
  });
};

export const BGM: Record<string, BgmTrack> = {
  boss_verdi: verdi(),
  boss_mozart: mozart(),
  boss_chant: chant(),
  boss_mozart_dark: mozartDark(),
  // 入れ替え（曲データはいまのまま、流す場面だけ替える）
  title_new: OLD.boss,
  inn_new: OLD.title,
  // いまの曲（聴き比べ用）
  old_title: OLD.title,
  old_inn: OLD.inn,
  old_boss: OLD.boss,
};
