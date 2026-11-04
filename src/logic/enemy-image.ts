// 敵の絵の URL（仕様書 §13.1）。相対パスなので GitHub Pages のサブパスでも読める
import type { EnemyKind } from '../api/types';

/** 絵の一辺（px）。どの画面も拡大しない */
export const ENEMY_IMAGE_PX = 256;

export function enemyImageUrl(kind: EnemyKind): string {
  return `enemies/${kind}.png`;
}
