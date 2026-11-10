// ジングルの案（試聴ページ用。ゲームにはまだ入れない）
// 音の作り方はゲームの効果音（src/audio/sound.ts の fmTone）と同じ 2 オペレーターの FM。曲の長さは自由（オーナーの了承 2026-11-09）
// 2 回目（2026-11-09）：ボス出現・ゲームクリアは決まり。遭遇・レアなドロップ・ボス撃破は新しい案。レベルアップ・レジェンドのドロップは、いまの音の並びと長さのまま音色を FM らしくする
import { SE_PATCHES, type SePatch, type SfxName } from '../../../src/audio/sound.ts';

export interface JEvent {
  f: readonly number[];
  at: number; // ms
  len: number; // ms
  patch: SePatch;
  glide?: number;
  vib?: boolean;
  /** 音量の倍率 */
  gain?: number;
}

const se = (name: string, p: Omit<SePatch, 'name'>): SePatch => ({ name, ...p });
const S = SE_PATCHES;
/** ジングル用に足した音色 */
const J = {
  ひびくオルガン: se('ひびくオルガン', { ratio: 2, index: 0.7, sustain: 0.9, idecay: 1, attack: 0.01, adecay: 2, asus: 0.9, lowpass: 1400, vol: 0.12 }),
  // FM 音源らしい音色（揺らしを深く、高い音を削らない）
  FMの金管: se('FMの金管', { ratio: 1, index: 3.2, sustain: 0.45, idecay: 0.1, attack: 0.01, adecay: 0.4, asus: 0.7, lowpass: 4000, vol: 0.15 }),
  FMのエレピ: se('FMのエレピ', { ratio: 14, index: 0.8, sustain: 0, idecay: 0.03, attack: 0.002, adecay: 0.6, asus: 0.3, lowpass: 6000, vol: 0.2 }),
  FMの鐘: se('FMの鐘', { ratio: 3.5, index: 2.8, sustain: 0.05, idecay: 0.3, attack: 0.002, adecay: 0.6, asus: 0, lowpass: 6000, vol: 0.14 }),
  FMのマリンバ: se('FMのマリンバ', { ratio: 4, index: 1.2, sustain: 0, idecay: 0.02, attack: 0.002, adecay: 0.12, asus: 0, lowpass: 5000, vol: 0.25 }),
};

const STEP: Readonly<Record<string, number>> = { C: 0, Db: 1, D: 2, Eb: 3, E: 4, F: 5, Gb: 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
/** 'Eb4' → Hz */
export function hz(n: string): number {
  const m = /^([A-G]b?)(-?\d)$/.exec(n);
  if (!m) throw new Error(`音の名前がおかしい：${n}`);
  const midi = (Number(m[2]) + 1) * 12 + STEP[m[1]];
  return 440 * 2 ** ((midi - 69) / 12);
}

type P = string | readonly string[] | null;
interface LineOpts { at?: number; legato?: number; vibLast?: boolean; glideLast?: number; gain?: number }

/** 音を順に並べる（[音, 拍]。null は休符）。at は始まりの拍 */
function line(patch: SePatch, bpm: number, steps: readonly (readonly [P, number])[], o: LineOpts = {}): JEvent[] {
  const beat = 60000 / bpm;
  const out: JEvent[] = [];
  let b = o.at ?? 0;
  steps.forEach(([p, n], i) => {
    const last = i === steps.length - 1;
    if (p) {
      out.push({
        f: (typeof p === 'string' ? [p] : p).map(hz),
        at: b * beat,
        len: n * beat * (last ? 1 : o.legato ?? 1),
        patch,
        vib: last && o.vibLast,
        glide: last ? o.glideLast : undefined,
        gain: o.gain,
      });
    }
    b += n;
  });
  return out;
}

/** 同じ音を、決まった拍で打つ（太鼓など） */
function hits(patch: SePatch, bpm: number, note: string, beats: readonly number[], lenBeats: number, o: { glide?: number; gain?: number } = {}): JEvent[] {
  const beat = 60000 / bpm;
  return beats.map((b) => ({ f: [hz(note)], at: b * beat, len: lenBeats * beat, patch, glide: o.glide, gain: o.gain }));
}

/** 周波数をそのまま変える（オクターブ上げなど） */
const shift = (evs: JEvent[], k: number, gain: number): JEvent[] => evs.map((e) => ({ ...e, f: e.f.map((f) => f * k), gain, vib: false }));

export interface Jingle { title: string; desc: string; events: JEvent[] }
export interface Item { name: SfxName; label: string; when: string; state: string; jingles: Jingle[] }

const third = 1 / 3;

// ---- 遭遇（新しいジングル） ----
const EN_RUN = 120;
const encounterRun: JEvent[] = [
  ...line(S.うなる低い金管, EN_RUN, ['A2', 'Bb2', 'B2', 'C3', 'Db3', 'D3', 'Eb3'].map((n) => [n, 0.125] as const), { legato: 1.3, gain: 1.2 }),
  ...line(S.うなる低い金管, EN_RUN, [[['A2', 'Eb3', 'A3'], 1.5]], { at: 0.875, vibLast: true, glideLast: 0.97, gain: 1.4 }),
  ...hits(S.こもった太鼓, EN_RUN, 'A1', [0.875], 0.8, { glide: 0.5 }),
  ...line(S.暗い鐘, EN_RUN, [[['A3', 'Eb4'], 1.5]], { at: 0.875 }),
];
const EN_DRUM = 110;
const encounterDrum: JEvent[] = [
  ...hits(S.こもった太鼓, EN_DRUM, 'C2', [0, 0.25, 0.5, 0.75], 0.25, { glide: 0.6, gain: 0.7 }),
  ...hits(S.こもった太鼓, EN_DRUM, 'A1', [1], 0.8, { glide: 0.5 }),
  ...line(S.うなる低い金管, EN_DRUM, [[['E2', 'E3'], 1.5]], { at: 1, vibLast: true, gain: 1.3 }),
  ...line(S.暗い鐘, EN_DRUM, [[['E4', 'Bb4'], 1.5]], { at: 1 }),
  ...line(S.地の底のうなり, EN_DRUM, [['E2', 1.5]], { at: 1, gain: 0.7 }),
];

// ---- レベルアップ（いまの音の並び・長さのまま。510ms） ----
// いま：ド・ミ♭・ソ・ド を 90ms ずつ、最後を 240ms。次の音に 60ms 重ねて響かせる
function seqMs(patch: SePatch, notes: readonly (readonly [string, number])[], tail: number): JEvent[] {
  const total = notes.reduce((s, [, ms]) => s + ms, 0);
  const out: JEvent[] = [];
  let at = 0;
  notes.forEach(([n, ms], i) => {
    const last = i === notes.length - 1;
    out.push({ f: [hz(n)], at, len: Math.min(ms + tail, total - at), patch, vib: last });
    at += ms;
  });
  return out;
}
const LV_NOTES = [['C4', 90], ['Eb4', 90], ['G4', 90], ['C5', 240]] as const;
const lvBrass = seqMs(J.FMの金管, LV_NOTES, 60);
const lvEp = seqMs(J.FMのエレピ, LV_NOTES, 60);
const levelUpBrass: JEvent[] = [...lvBrass, ...shift(lvBrass, 0.5, 0.5)];
const levelUpEp: JEvent[] = [...lvEp, ...shift(lvEp, 2, 0.4)];

// ---- レジェンドのドロップ（いまの音の並び・長さのまま。1020ms） ----
// いま：ミ♭・ソ・ド を 60ms ずつ 4 回（それぞれ 180ms まで響かせる）、最後にドを 300ms
function sparkleMs(patch: SePatch, notes: readonly string[], times: number, lastMs: number, k: number): JEvent[] {
  const total = times * notes.length * 60 + lastMs;
  const out: JEvent[] = [];
  for (let i = 0; i < times * notes.length; i++) out.push({ f: [hz(notes[i % notes.length]) * k], at: i * 60, len: Math.min(180, total - i * 60), patch });
  out.push({ f: [hz(notes[notes.length - 1]) * k], at: total - lastMs, len: lastMs, patch });
  return out;
}
const lgBell: JEvent[] = sparkleMs(J.FMの鐘, ['Eb3', 'G3', 'C4'], 4, 300, 1);
const lgMarimba: JEvent[] = sparkleMs(J.FMのマリンバ, ['Eb3', 'G3', 'C4'], 4, 300, 2);

// ---- レアなドロップ（新しいジングル。レジェンドより控えめに） ----
const RD_BELL = 150;
const rareBell: JEvent[] = [
  ...line(S.暗い鐘, RD_BELL, [['C4', 0.25], ['Eb4', 0.25], ['G4', 0.25], ['C5', 0.25]], { legato: 2 }),
  ...line(S.暗い鐘, RD_BELL, [[['Eb4', 'G4', 'C5'], 1.5]], { at: 1 }),
  ...line(S.暗いオルガン, RD_BELL, [[['C3', 'G3'], 1.5]], { at: 1 }),
];
const RD_BRASS = 140;
const rareBrass: JEvent[] = [
  ...line(S.沈んだ金管, RD_BRASS, [[['C4', 'Eb4'], 0.5], [['D4', 'F4'], 0.5], [['Eb4', 'G4'], 1.5]], { legato: 0.85, vibLast: true, gain: 1.2 }),
  ...line(S.暗い鐘, RD_BRASS, [['G4', third], ['C5', third], ['Eb5', 1.5 - 2 * third]], { at: 1, legato: 2, gain: 0.8 }),
];

// ---- ボス出現（決まり：オルガンの不協和音） ----
const BA_ORGAN = 80;
const bossOrgan: JEvent[] = [
  ...line(J.ひびくオルガン, BA_ORGAN, ['Gb4', 'Eb4', 'C4', 'A3', 'Gb3', 'Eb3', 'C3'].map((n) => [n, 0.125] as const), { legato: 1.5 }),
  ...line(J.ひびくオルガン, BA_ORGAN, [[['C2', 'C3', 'Eb3', 'Gb3', 'A3'], 3]], { at: 0.875, vibLast: true, gain: 1.4 }),
  ...line(S.低い声, BA_ORGAN, [['C2', 3]], { at: 0.875 }),
  ...hits(S.こもった太鼓, BA_ORGAN, 'A1', [0.875], 1.2, { glide: 0.5 }),
];

// ---- ボス撃破（別の案） ----
const BD_TOLL = 80;
const bossToll: JEvent[] = [
  ...hits(S.こもった太鼓, BD_TOLL, 'A1', [0], 0.8, { glide: 0.5 }),
  ...line(S.うなる低い金管, BD_TOLL, [[['G3', 'Db4'], 1]], { glideLast: 0.5, gain: 1.2 }),
  ...line(S.地の底のうなり, BD_TOLL, [['C2', 3.5]], { at: 0.5, glideLast: 0.9 }),
  ...line(S.暗い鐘, BD_TOLL, [[['C4', 'G4'], 1], [['Ab3', 'Eb4'], 1], [['C4', 'G4'], 2]], { at: 1, gain: 1.2 }),
];
const BD_MARCH = 132;
const bossMarch: JEvent[] = [
  ...line(J.FMの金管, BD_MARCH, [['C4', 0.5], ['C4', 0.25], ['C4', 0.25], ['Eb4', 0.5], ['G4', 0.5], ['F4', 0.5], ['Eb4', 0.25], ['D4', 0.25], [['G3', 'C4', 'Eb4'], 1.5]], { legato: 0.85, vibLast: true }),
  ...line(S.うなる低い金管, BD_MARCH, [['C3', 1], ['Ab2', 1], ['G2', 1], ['C2', 1.5]], { legato: 0.9 }),
  ...hits(S.こもった太鼓, BD_MARCH, 'A1', [0, 1, 2, 3], 0.5, { glide: 0.5 }),
  ...line(S.暗い鐘, BD_MARCH, [[['C4', 'G4'], 1.5]], { at: 3, gain: 0.8 }),
];

// ---- ゲームクリア（決まり：暗い案） ----
const CL_DARK = 72;
const clearDark: JEvent[] = [
  ...line(S.暗いオルガン, CL_DARK, [
    [['C3', 'G3', 'C4', 'Eb4'], 1],
    [['Ab2', 'Ab3', 'C4', 'Eb4'], 1],
    [['F2', 'F3', 'Ab3', 'C4'], 1],
    [['G2', 'G3', 'B3', 'D4'], 1],
    [['C3', 'G3', 'C4', 'E4'], 3],
  ], { gain: 1.2 }),
  ...line(S.低い声, CL_DARK, [['C2', 1], ['Ab1', 1], ['F1', 1], ['G1', 1], ['C2', 3]]),
  ...line(S.暗い鐘, CL_DARK, [['C4', third], ['G4', third], ['C5', 2 + third]], { at: 4, legato: 3 }),
];

export interface Section { title: string; note: string; items: Item[] }

export const SECTIONS: Section[] = [
  {
    title: '新しい案（どちらかを選んでください）',
    note: '遭遇・レアなドロップはジングルを新しく作りました。ボス撃破は、前の 2 案とは違う方向で作り直しました。',
    items: [
      {
        name: 'encounter', label: '遭遇', when: 'ダンジョンで敵に出会ったとき', state: 'ジングルを作成',
        jingles: [
          { title: '迫る低音', desc: '低い金管が半音ずつ一気にせり上がり、ぶつかり合う和音（増四度）を太鼓・鐘と叩きつける', events: encounterRun },
          { title: '太鼓の警告', desc: '太鼓が「ドドドド」と詰め寄り、低い金管と鐘が「ジャーン」。下で地の底のうなり', events: encounterDrum },
        ],
      },
      {
        name: 'rareDrop', label: 'レアなドロップ', when: 'UR の装備を拾ったとき', state: 'ジングルを作成',
        jingles: [
          { title: '暗い鐘のきらめき', desc: '暗い鐘が「ド・ミ♭・ソ・ド」と上がり、鐘の和音とオルガンが残る', events: rareBell },
          { title: '小さなファンファーレ', desc: '沈んだ金管が 3 つの和音で上がり、鐘が答える', events: rareBrass },
        ],
      },
      {
        name: 'bossDefeat', label: 'ボス撃破', when: 'ボスを倒したとき', state: '別の案を作成',
        jingles: [
          { title: '弔いの鐘', desc: 'いまの「崩れ落ちる」音のあと、地の底のうなりが沈んでいき、鐘が 3 回ゆっくり鳴る。勝ち誇らない', events: bossToll },
          { title: '短調の凱歌', desc: '暗いまま勇ましい行進。FM の金管が短調の旋律を吹き、低い金管と太鼓が刻む', events: bossMarch },
        ],
      },
    ],
  },
  {
    title: 'いまの音を FM 音源風に（音の並び・長さはいまのまま）',
    note: 'いまの音も FM 音源のしくみですが、揺らしを浅くし高い音を削っているので、こもって聞こえます。揺らしを深くし、高い音を削らない音色に替えました。長さが同じなので、ゲームの進み方は変わりません。',
    items: [
      {
        name: 'levelUp', label: 'レベルアップ', when: '「レベルが あがった！」の行', state: 'FM 音源風に',
        jingles: [
          { title: 'FMの金管', desc: 'はっきりした金管の音。1 オクターブ下を小さく重ねて厚くした', events: levelUpBrass },
          { title: 'FMのエレピ', desc: '「チーン」と鳴る FM 音源の代表的な電気ピアノの音。1 オクターブ上を小さく重ねた', events: levelUpEp },
        ],
      },
      {
        name: 'rareDropLG', label: 'レジェンドのドロップ', when: 'LG（レジェンド）の装備を拾ったとき', state: 'FM 音源風に',
        jingles: [
          { title: 'FMの鐘', desc: '金属的な響きの FM の鐘（音の高さはいまと同じ）', events: lgBell },
          { title: 'FMのマリンバ', desc: 'コロコロと粒立つ木琴の音（聞き取りやすいよう 1 オクターブ上）', events: lgMarimba },
        ],
      },
    ],
  },
  {
    title: '決まったもの（確認用）',
    note: '前回選んでいただいたものです。',
    items: [
      { name: 'bossAppear', label: 'ボス出現', when: 'ボスが あらわれたとき', state: '決定',
        jingles: [{ title: 'オルガンの不協和音', desc: 'オルガンが駆け下り、不安な和音（減七の和音）を鳴らし続ける。下で低い声と太鼓', events: bossOrgan }] },
      { name: 'clear', label: 'ゲームクリア', when: 'クリア画面の「平和が もどった」の行', state: '決定',
        jingles: [{ title: '暗い案', desc: 'いまの「鎮魂の和音」を伸ばした版。オルガンの 5 つの和音で、最後に長調に変わり、鐘が鳴る', events: clearDark }] },
    ],
  },
];

/** ジングルの長さ（ms） */
export function jingleMs(events: readonly JEvent[]): number {
  return Math.max(...events.map((e) => e.at + e.len));
}
