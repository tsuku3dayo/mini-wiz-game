// 足元の案内（仕様書 §4.8、§11.8「足元の案内」）。階段・入口のマスに「着いた」ときだけ 1 行
// 遭遇の判定（§11.8「操作の結果の扱い」）もここに置く
import type { GameView, Message } from '../api/types';

/** 遭遇：前の状態がない、または前の場所が BATTLE でなく、新しい場所が BATTLE */
export function isEncounter(prev: GameView | null, next: GameView): boolean {
  return next.location === 'BATTLE' && prev?.location !== 'BATTLE';
}

const TEXT = {
  down: '足元に くだり階段がある',
  up: '足元に のぼり階段がある',
  entrance: 'ここは入口だ',
} as const;

/** 新しい場所が DUNGEON で、前がダンジョンでない、または階・x・y のどれかが変わったとき（向きだけの変化は含まない） */
export function arrival(prev: GameView | null, next: GameView): Message | null {
  const d = next.dungeon;
  if (next.location !== 'DUNGEON' || !d || !d.underfoot) return null;
  const p = prev?.location === 'DUNGEON' ? prev.dungeon : null;
  const moved = !p || p.floor !== d.floor || p.map.player.x !== d.map.player.x || p.map.player.y !== d.map.player.y;
  return moved ? { text: TEXT[d.underfoot], tone: 'normal' } : null;
}
