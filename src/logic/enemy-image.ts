// 敵の絵の URL（仕様書 §13.1）。相対パスなので GitHub Pages のサブパスでも読める
import type { EnemyKind } from '../api/types';

/** 画面に出す一辺（px）。どの画面も同じ。絵（256×256）の大きさのまま、拡大しない（仕様書 §13.2） */
export const ENEMY_IMAGE_PX = 256;

export function enemyImageUrl(kind: EnemyKind): string {
  return `enemies/${kind}.png`;
}
