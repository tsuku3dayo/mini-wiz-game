// 疑似3D の説明文（aria-label）と、階と向きの表示（仕様書 §4.8、§11.5「疑似3D の説明文」）
import type { DungeonView, Facing } from '../api/types';

export const FACING_NAME: Readonly<Record<Facing, string>> = { N: '北', E: '東', S: '南', W: '西' };
const STAIRS_NAME = { down: 'くだり階段', up: 'のぼり階段', entrance: '入口' } as const;

/** 全角スペース（ソースに直接書くと lint が止めるので、文字コードで作る） */
const IDEOGRAPHIC_SPACE = String.fromCharCode(0x3000);

/** 「{階}F」+ 全角スペース +「{向き}」（例「3F 北」の間は全角。座標は出さない） */
export function locationText(floor: number, facing: Facing): string {
  return `${floor}F${IDEOGRAPHIC_SPACE}${FACING_NAME[facing]}`;
}

export function describeView(v: Pick<DungeonView, 'floor' | 'facing' | 'underfoot' | 'depths'>): string {
  const parts = [`${v.floor}F ${FACING_NAME[v.facing]}を向いている。`];
  const wallAt = v.depths.findIndex((d) => d.front === 'wall');
  if (wallAt === 0) parts.push('前方は かべ。');
  else if (wallAt > 0) parts.push(`前方 ${wallAt} マス先は かべ。`);
  else parts.push(`前方は ${v.depths.length - 1} マス先まで つうろ。`);
  const near = v.depths.slice(0, 2);
  if (near.some((d) => d.left === 'open')) parts.push('左に わかれみち。');
  if (near.some((d) => d.right === 'open')) parts.push('右に わかれみち。');
  v.depths.forEach((d, k) => {
    if (k >= 1 && d.stairs) parts.push(`${k} マス先に ${STAIRS_NAME[d.stairs]}。`);
  });
  if (v.underfoot === 'entrance') parts.push('ここは入口。');
  else if (v.underfoot) parts.push(`足元に ${STAIRS_NAME[v.underfoot]}。`);
  return parts.join('');
}
