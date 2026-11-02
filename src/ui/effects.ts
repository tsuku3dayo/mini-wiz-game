// 点滅（仕様書 §11.8「点滅」。v1.0 の useFlashOnMessage）：新しく出た最新の行が条件に合えば 200ms だけ true
import type { MessageQueue } from './message-queue';

export const FLASH_MS = 200;

export function flashOnMessage(queue: MessageQueue, match: (text: string) => boolean, onChange: (on: boolean) => void): () => void {
  let lastId = queue.lines.at(-1)?.id ?? 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const off = queue.subscribe(() => {
    const latest = queue.lines.at(-1);
    if (!latest || latest.id === lastId) return;
    lastId = latest.id;
    if (!match(latest.text)) return;
    if (timer !== null) clearTimeout(timer);
    onChange(true);
    timer = setTimeout(() => { timer = null; onChange(false); }, FLASH_MS);
  });
  return () => {
    off();
    if (timer !== null) clearTimeout(timer);
  };
}
