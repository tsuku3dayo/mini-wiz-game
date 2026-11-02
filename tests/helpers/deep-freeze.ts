/** オブジェクトを中まで凍らせる。ルールの関数が入力を変えないことを確かめるために使う（TD-0002 §1.3） */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}
