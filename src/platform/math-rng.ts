// 本番の乱数（仕様書 §23.2）。Math.random を使うので、ルールの層ではなく基盤に置く
import { BaseRng } from '../domain/rng';

export class MathRandomRng extends BaseRng {
  int(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
}
