import { describe, expect, test } from 'vitest';
import { BGM, FM_PATCHES, loopBeats, loopSec } from '../../src/logic/bgm-tracks';

// 仕様書 §26.9 の諸元と §26.3 の音色の表（書き写しの誤りを見つける。§26.10）
const SPEC = {
  title: { name: 'カタコンベ（ローマ時代の墓）（ムソルグスキー『展覧会の絵』）', bpm: 60, bpb: 3, bars: 16, sec: 48.0, parts: [['強い和音', 'ブラス', 0.4], ['弱い和音', 'パッド', 0.2], ['上の声', 'ホルン', 0.4], ['ベース', '柔らかいベース', 0.85]], drums: ['boom', 'snare'] as string[] },
  inn: { name: 'ローエングリン 第 1 幕への前奏曲（ワーグナー）', bpm: 52, bpb: 4, bars: 16, sec: 73.85, parts: [['旋律', '高い弦', 0.6], ['高い和音', '高い弦', 0.16], ['和音', 'パッド', 0.12], ['ベース', '柔らかいベース', 0.45]], drums: [] },
  dungeon: { name: '死の島（ラフマニノフ）', bpm: 72, bpb: 2.5, bars: 16, sec: 33.33, parts: [['揺れる低い弦', '低い弦', 0.7], ['低い和音', 'パッド', 0.13], ['怒りの日', 'ホルン', 0.45], ['しずく', 'しずく', 0.12]], drums: [] },
  battle: { name: '火星 — 戦いの神（ホルスト『惑星』）', bpm: 168, bpb: 5, bars: 16, sec: 28.57, parts: [['くり返し', '弦のきざみ', 0.5], ['くり返しの重ね', 'ひずみ', 0.08], ['金管の主題', 'ブラス', 0.45], ['和音', 'ホルン', 0.2]], drums: ['boom', 'snare'] },
  boss: { name: '怒りの日（モーツァルト『レクイエム』）', bpm: 144, bpb: 4, bars: 16, sec: 26.67, parts: [['合唱', 'クワイア', 0.42], ['刻む弦', '弦のきざみ', 0.3], ['金管', 'ブラス', 0.28], ['ベース', '低い弦', 0.5]], drums: ['boom'] },
  clear: { name: 'イン・パラディス（フォーレ『レクイエム』）', bpm: 66, bpb: 3, bars: 16, sec: 43.64, parts: [['オルガンの分散和音', 'オルガン', 0.22], ['ソプラノ', 'クワイア', 0.5], ['ペダル', '柔らかいベース', 0.5]], drums: [] },
} as const;

// キー・name・ratio・index・sustain・idecay・attack・adecay・asus・ring・vib
const PATCHES: [string, string, number, number, number, number, number, number, number, number, boolean][] = [
  ['クワイア', 'クワイア', 1, 1.2, 0.7, 0.4, 0.09, 2.0, 0.85, 1, true],
  ['パッド', 'パッド', 1, 0.8, 0.8, 0.6, 0.25, 2.5, 0.9, 1, false],
  ['チューブラーベル', 'チューブラーベル', 3.5, 4, 0.1, 0.5, 0.002, 0.9, 0, 8, false],
  ['柔らかいベース', 'ベース', 1, 1.6, 0.5, 0.2, 0.008, 1.2, 0.7, 1, false],
  ['木管', '木管', 2, 1.6, 0.55, 0.25, 0.05, 1.2, 0.8, 1, true],
  ['ハープ', 'ハープ', 1, 3.5, 0.25, 0.09, 0.003, 0.35, 0, 2.2, false],
  ['ベース', 'ベース', 1, 2.2, 0.5, 0.12, 0.006, 0.7, 0.55, 1, false],
  ['ウッドベース', 'ウッドベース', 1, 2.2, 0.35, 0.1, 0.004, 0.5, 0.45, 1, false],
  ['笛', '笛', 1, 0.9, 0.6, 0.3, 0.07, 1.5, 0.85, 1, true],
  ['しずく', 'しずく', 3.5, 3, 0.05, 0.15, 0.002, 0.4, 0, 6, false],
  ['金属のうなり', '金属のうなり', 1.41, 2.5, 0.9, 1, 0.3, 3, 0.9, 1, false],
  ['シンセリード', 'シンセリード', 1, 2.8, 0.35, 0.1, 0.005, 0.5, 0.7, 1, true],
  ['ブラス', 'ブラス', 1, 3.0, 0.6, 0.2, 0.03, 0.8, 0.8, 1, false],
  ['スラップベース', 'スラップベース', 1, 3.5, 0.4, 0.05, 0.002, 0.3, 0.5, 1, false],
  ['ひずみ', 'ひずみ', 1, 5, 0.8, 0.3, 0.003, 1, 0.9, 1, false],
  ['弦のきざみ', '弦のきざみ', 1, 2, 0.4, 0.08, 0.008, 0.3, 0.7, 1, false],
  ['ホルン', 'ホルン', 1, 2.2, 0.6, 0.25, 0.06, 1.5, 0.85, 1, true],
  ['高い弦', '高い弦', 1, 0.7, 0.85, 0.8, 0.35, 3, 0.95, 1, true],
  ['オルガン', 'オルガン', 2, 0.5, 0.95, 1, 0.02, 4, 0.95, 1, false],
  ['低い弦', '低い弦', 1, 1.4, 0.7, 0.3, 0.04, 1.5, 0.85, 1, false],
];

describe('BGM の曲データ', () => {
  test('TC-0034-22 6 曲の諸元・パートの並び（label・音色・vol）・拍数・打楽器・音色 20 種・音域が仕様書のとおり', () => {
    expect(Object.keys(BGM)).toEqual(['title', 'inn', 'dungeon', 'battle', 'boss', 'clear']);
    const patchKey = new Map(Object.entries(FM_PATCHES).map(([k, v]) => [v, k]));
    for (const [name, spec] of Object.entries(SPEC)) {
      const t = BGM[name as keyof typeof BGM];
      expect([t.name, t.bpm, t.bpb, t.bars], name).toEqual([spec.name, spec.bpm, spec.bpb, spec.bars]);
      expect(Math.round(loopSec(t) * 100) / 100, name).toBe(spec.sec);
      expect(t.parts.map((p) => [p.label, patchKey.get(p.fm), p.vol]), name).toEqual(spec.parts);
      // どのパートも 1 周ちょうど
      for (const p of t.parts) expect(p.notes.reduce((s, n) => s + n.len, 0), `${name} ${p.label}`).toBeCloseTo(loopBeats(t), 9);
      // 打楽器は 1 周の中
      expect(t.drums.every((d) => d.beat >= 0 && d.beat < loopBeats(t)), name).toBe(true);
      expect([...new Set(t.drums.map((d) => d.kind))].sort(), name).toEqual(spec.drums);
      // 音域 24〜96
      for (const p of t.parts) {
        const pitches = p.notes.flatMap((n) => (n.p === null ? [] : Array.isArray(n.p) ? n.p : [n.p as number]));
        expect(Math.min(...pitches), `${name} ${p.label}`).toBeGreaterThanOrEqual(24);
        expect(Math.max(...pitches), `${name} ${p.label}`).toBeLessThanOrEqual(96);
      }
    }
    expect(Object.keys(FM_PATCHES)).toHaveLength(20);
    for (const [key, ...v] of PATCHES) {
      const p = FM_PATCHES[key as keyof typeof FM_PATCHES];
      expect([p.name, p.ratio, p.index, p.sustain, p.idecay, p.attack, p.adecay, p.asus, p.ring, p.vib], key).toEqual(v);
    }
  });
});
