import { describe, expect, test } from 'vitest';
import { BGM, FM_PATCHES, loopBeats, loopSec } from '../../src/logic/bgm-tracks';

// 仕様書 §26.9 の諸元と §26.3 の音色の表（書き写しの誤りを見つける。§26.10）
const SPEC = {
  title: { name: '鐘と祈り', bpm: 66, bpb: 4, bars: 16, sec: 58.18, parts: [['メロディ', 'クワイア', 0.65], ['和音', 'パッド', 0.17], ['鐘', 'チューブラーベル', 0.26], ['ベース', '柔らかいベース', 0.8]], drums: [] as string[] },
  inn: { name: '灰の暖炉', bpm: 84, bpb: 3, bars: 16, sec: 34.29, parts: [['メロディ', '木管', 0.75], ['竪琴', 'ハープ', 0.3], ['ベース', 'ベース', 0.7]], drums: [] },
  dungeon: { name: '見られている迷宮', bpm: 84, bpb: 4, bars: 16, sec: 45.71, parts: [['ベース', 'ウッドベース', 0.85], ['メロディ', '笛', 0.6], ['しずく', 'しずく', 0.2], ['濁り', '金属のうなり', 0.09]], drums: [] },
  battle: { name: '裂ける夜', bpm: 172, bpb: 4, bars: 16, sec: 22.33, parts: [['メロディ', 'シンセリード', 0.75], ['5 度の和音', 'ブラス', 0.24], ['ベース', 'スラップベース', 0.85], ['ベースの重ね', 'ひずみ', 0.1]], drums: ['hat', 'kick', 'snare'] },
  boss: { name: '鉄の行進', bpm: 120, bpb: 4, bars: 16, sec: 32.0, parts: [['震える和音', '弦のきざみ', 0.4], ['角笛', 'ホルン', 0.55], ['和音', 'ブラス', 0.18], ['ベース', '柔らかいベース', 0.85]], drums: ['boom', 'snare'] },
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
];

describe('BGM の曲データ', () => {
  test('TC-0034-22 5 曲の諸元・パートの並び（label・音色・vol）・拍数・打楽器・音色 17 種・音域が仕様書のとおり', () => {
    expect(Object.keys(BGM)).toEqual(['title', 'inn', 'dungeon', 'battle', 'boss']);
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
      // 音域 24〜96、メロディは 82（B♭5）まで
      for (const p of t.parts) {
        const pitches = p.notes.flatMap((n) => (n.p === null ? [] : Array.isArray(n.p) ? n.p : [n.p as number]));
        expect(Math.min(...pitches), `${name} ${p.label}`).toBeGreaterThanOrEqual(24);
        expect(Math.max(...pitches), `${name} ${p.label}`).toBeLessThanOrEqual(96);
        if (p.label === 'メロディ') expect(Math.max(...pitches), `${name} メロディ`).toBeLessThanOrEqual(82);
      }
    }
    expect(Object.keys(FM_PATCHES)).toHaveLength(17);
    for (const [key, ...v] of PATCHES) {
      const p = FM_PATCHES[key as keyof typeof FM_PATCHES];
      expect([p.name, p.ratio, p.index, p.sustain, p.idecay, p.attack, p.adecay, p.asus, p.ring, p.vib], key).toEqual(v);
    }
  });
});
