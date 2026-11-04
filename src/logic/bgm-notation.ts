/**
 * BGM の曲を書くための小さな記法（WIZ-DES-0045 §3）。試聴ページ（docs/bgm-listening-src/tracks.js）の
 * 関数をそのまま TypeScript に移したもの。拍数（len）は 4 分音符 = 1、音の高さは MIDI ノート番号。
 */
export interface BgmNote {
  /** MIDI ノート番号（配列なら和音）。null は休符 */
  p: number | readonly number[] | null;
  len: number;
}

const PC: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const accidental = (a: string | undefined) =>
  a === '#' ? 1 : a === 'b' ? -1 : 0;

/** 'D5' 'Bb4' 'C#5' → MIDI ノート番号 */
export function nm(s: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(s);
  if (!m) throw new Error('bad note ' + s);
  return 12 * (Number(m[3]) + 1) + PC[m[1]] + accidental(m[2]);
}

/** 'Eb' → 音名の番号（0〜11） */
const pcOf = (s: string) => (PC[s[0]] + accidental(s[1]) + 12) % 12;

/** 'D5:2 F5:1 | A4:3 r:1' → 音の列 */
export const mel = (str: string): BgmNote[] =>
  str.split('|').flatMap((bar) =>
    bar
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((tok) => {
        const [p, l] = tok.split(':');
        return { p: p === 'r' ? null : nm(p), len: Number(l) };
      }),
  );

export interface Chord {
  /** 根音・3 度・5 度の音名の番号 */
  pcs: [number, number, number];
  bass: number;
}

/** 'Dm' 'Bb' 'Bb/D' 'Cm' → 和音 */
export function chord(sym: string): Chord {
  const m = /^([A-G][#b]?)(m|dim)?(?:\/([A-G][#b]?))?$/.exec(sym);
  if (!m) throw new Error('bad chord ' + sym);
  const r = pcOf(m[1]);
  const iv = m[2] === 'm' ? [0, 3, 7] : m[2] === 'dim' ? [0, 3, 6] : [0, 4, 7];
  return {
    pcs: [(r + iv[0]) % 12, (r + iv[1]) % 12, (r + iv[2]) % 12],
    bass: m[3] ? pcOf(m[3]) : r,
  };
}

/** 音名の番号 pc の音で、lo 以上のいちばん低いもの */
export const at = (pc: number, lo: number) => lo + ((pc - (lo % 12) + 12) % 12);

/** 和音の 3 音を lo から上へ並べる */
export function voicing(c: Chord, lo: number): [number, number, number] {
  const a = at(c.pcs[0], lo);
  const b = at(c.pcs[1], a + 1);
  const d = at(c.pcs[2], b + 1);
  return [a, b, d];
}

/** 小節の和音（'Bb A' は前半・後半） */
const segs = (sym: string, bpb: number) => {
  const parts = sym.split(' ');
  return parts.map((s) => ({ c: chord(s), beats: bpb / parts.length }));
};

/** 進行に沿って、小節ごとに音を作る */
export const perBar = (
  prog: readonly string[],
  bpb: number,
  fn: (c: Chord, beats: number, bar: number, seg: number) => BgmNote[],
): BgmNote[] =>
  prog.flatMap((sym, i) =>
    segs(sym, bpb).flatMap((sg, k) => fn(sg.c, sg.beats, i, k)),
  );

export const R = (len: number): BgmNote => ({ p: null, len });
export const N = (p: number | readonly number[], len: number): BgmNote => ({
  p,
  len,
});

/** 8 分音符の分散和音。silent の小節は休む */
export const arp = (
  prog: readonly string[],
  bpb: number,
  lo: number,
  pattern: readonly number[],
  silent: readonly number[] = [],
): BgmNote[] =>
  perBar(prog, bpb, (c, beats, i) => {
    const v = voicing(c, lo);
    const n = Math.round(beats / 0.5);
    return Array.from({ length: n }, (_, j) =>
      silent.includes(i) ? R(0.5) : N(v[pattern[j % pattern.length]], 0.5),
    );
  });
