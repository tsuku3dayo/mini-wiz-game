// テスト用の乱数：引いた数と int(a, b) の引数・返した値を記録する
import { BaseRng, SeededRng, type Rng } from '../../src/domain/rng';

export interface RecordingRng extends BaseRng {
  /** 引いた順の記録 */
  readonly calls: { min: number; max: number; value: number }[];
}

/** inner（既定 SeededRng(1)）から引き、記録する */
export function recordingRng(inner: Rng = new SeededRng(1)): RecordingRng {
  return new (class extends BaseRng {
    calls: { min: number; max: number; value: number }[] = [];
    int(min: number, max: number): number {
      const value = inner.int(min, max);
      this.calls.push({ min, max, value });
      return value;
    }
  })();
}
