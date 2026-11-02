// 偽の保存（仕様書 §21.7）。メモリに JSON の文字列で持ち、指定した名前への書き込みを失敗させられる
import type { KeyValueStore, ReadResult } from '../../src/api/repository';

export interface FakeStorage extends KeyValueStore {
  /** 保存している文字列（なければ null）。壊れた値も入れられる */
  raw(name: string): string | null;
  setRaw(name: string, text: string | null): void;
  /** 値を JSON にして置く */
  put(name: string, value: unknown): void;
  /** ここに入れた名前への書き込みは失敗する */
  failWrites: Set<string>;
  /** 読むたびに呼ぶ（読み直しのときに値を差し替えるため）。n はその名前を読んだ回数（1 から） */
  onRead?: (name: string, n: number) => void;
  /** 読み書きの記録 */
  log: { op: 'read' | 'write' | 'remove'; name: string }[];
}

export function createFakeStorage(initial: Record<string, unknown> = {}): FakeStorage {
  const data = new Map<string, string>();
  const reads = new Map<string, number>();
  for (const [name, value] of Object.entries(initial)) data.set(name, JSON.stringify(value));

  const fake: FakeStorage = {
    failWrites: new Set<string>(),
    log: [],
    raw: (name) => data.get(name) ?? null,
    setRaw: (name, text) => {
      if (text === null) data.delete(name);
      else data.set(name, text);
    },
    put: (name, value) => data.set(name, JSON.stringify(value)),

    read(name): ReadResult {
      fake.log.push({ op: 'read', name });
      const n = (reads.get(name) ?? 0) + 1;
      reads.set(name, n);
      fake.onRead?.(name, n);
      const text = data.get(name);
      if (text === undefined) return { ok: false, reason: 'missing' };
      try {
        return { ok: true, value: JSON.parse(text) as unknown };
      } catch {
        return { ok: false, reason: 'unreadable' };
      }
    },
    write(name, value) {
      fake.log.push({ op: 'write', name });
      if (fake.failWrites.has(name)) return false;
      data.set(name, JSON.stringify(value));
      return true;
    },
    writeAll(entries) {
      const before = new Map(data);
      for (const [name, value] of entries) {
        if (!fake.write(name, value)) {
          data.clear();
          for (const [k, v] of before) data.set(k, v);
          return false;
        }
      }
      return true;
    },
    remove(name) {
      fake.log.push({ op: 'remove', name });
      if (fake.failWrites.has(name)) return false;
      data.delete(name);
      return true;
    },
  };
  return fake;
}
