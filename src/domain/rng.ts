// 乱数（仕様書 §23）。ゲームの乱数はすべて Rng から引く

export interface Rng {
  /** min 以上 max 以下の整数（両端を含む、一様）。1 個消費する */
  int(min: number, max: number): number;
  /** 確率 p で true。int(1,100) <= round(p*100)、int を 1 回消費 */
  chance(p: number): boolean;
}

/** chance を int から作る共通の基底（仕様書 §23.2） */
export abstract class BaseRng implements Rng {
  abstract int(min: number, max: number): number;

  chance(p: number): boolean {
    return this.int(1, 100) <= Math.round(p * 100);
  }
}

/** シード付きの乱数（mulberry32）。性質・統計・通しのテスト用 */
export class SeededRng extends BaseRng {
  private state: number;

  constructor(seed: number) {
    super();
    this.state = seed >>> 0;
  }

  /** [0, 1) の実数 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}

/** 与えた値を順に返す乱数。単体テストで、引く順と個数のずれを見つける */
export class SequenceRng extends BaseRng {
  private readonly values: readonly number[];
  private index = 0;

  constructor(values: readonly number[]) {
    super();
    this.values = [...values];
  }

  get remaining(): number {
    return this.values.length - this.index;
  }

  int(min: number, max: number): number {
    if (this.index >= this.values.length) {
      throw new Error(`SequenceRng: 値が尽きた（int(${min}, ${max})）`);
    }
    const value = this.values[this.index];
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`SequenceRng: ${this.index} 番目の値 ${value} が範囲 [${min}, ${max}] の外`);
    }
    this.index += 1;
    return value;
  }

  assertExhausted(): void {
    if (this.remaining > 0) {
      throw new Error(`SequenceRng: 値が ${this.remaining} 個余った`);
    }
  }
}

/** 中身を入れ替えられる乱数。ゲーム API の単体テストと、テスト用の入口の useSeed で使う（仕様書 §23.3） */
export class SwappableRng extends BaseRng {
  inner: Rng;

  constructor(inner: Rng = new SeededRng(1)) {
    super();
    this.inner = inner;
  }

  int(min: number, max: number): number {
    return this.inner.int(min, max);
  }
}
