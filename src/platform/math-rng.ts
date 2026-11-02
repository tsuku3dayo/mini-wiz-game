// 本番の乱数（仕様書 §23.2）。Math.random を使うので、ルールの層ではなく基盤に置く
import { BaseRng, SeededRng, SwappableRng, type Rng } from '../domain/rng';

export class MathRandomRng extends BaseRng {
  int(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
}

/**
 * テスト用の入口（?debug=1）の乱数：中身は MathRandomRng で、useSeed で SeededRng(seed) に替えられる（仕様書 §28）。
 * 画面層は src/domain/ を import しないので、ここで組み立てて渡す
 */
export function createDebugRng(): { rng: Rng; useSeed(seed: number): void } {
  const rng = new SwappableRng(new MathRandomRng());
  return { rng, useSeed: (seed) => { rng.inner = new SeededRng(seed); } };
}
