// 体力わずか・HP の警告（仕様書 §11.6、§11.8）。整数のまま比べる

/** HP の警告（橙＋「！」）：HP ≦ 最大HP × 0.25 */
export function isHpWarning(hp: number, maxHp: number): boolean {
  return hp * 4 <= maxHp;
}

/** 体力わずかの赤い枠：HP × 5 ≦ 最大HP（20% 以下） */
export function isLowHp(hp: number, maxHp: number): boolean {
  return hp * 5 <= maxHp;
}
