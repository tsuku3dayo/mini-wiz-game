/** 今の時刻（ISO 8601、UTC、ミリ秒）。ゲーム API に渡す */
export function nowIso(): string {
  return new Date().toISOString();
}
