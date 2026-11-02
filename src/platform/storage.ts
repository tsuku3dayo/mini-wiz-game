// localStorage の読み書き（仕様書 §21、ADR-0006・0007）。例外を外に出さず、戻り値で失敗を返す
// 形はゲーム API の KeyValueStore（src/api/repository.ts）と同じ。キーは `<アプリ識別子>-<名前>`

export const STORAGE_VERSION = 1;

export type ReadResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'missing' | 'unreadable' | 'unavailable' };

export interface LocalStore {
  read(name: string): ReadResult;
  write(name: string, value: unknown): boolean;
  /** 順に書き、途中で失敗したら書く前の値に戻して false */
  writeAll(entries: readonly (readonly [string, unknown])[]): boolean;
  remove(name: string): boolean;
  /** 保存の形全体の版（schema）を確かめ、古ければ移して版を書く（版 1 では移す中身はない） */
  migrateStorage(): void;
}

export function createLocalStorage(appId: string, getStorage: () => Storage = () => window.localStorage): LocalStore {
  const key = (name: string) => `${appId}-${name}`;

  function read(name: string): ReadResult {
    let text: string | null;
    try {
      text = getStorage().getItem(key(name));
    } catch {
      return { ok: false, reason: 'unavailable' };
    }
    if (text === null) return { ok: false, reason: 'missing' };
    try {
      return { ok: true, value: JSON.parse(text) as unknown };
    } catch {
      return { ok: false, reason: 'unreadable' };
    }
  }

  function write(name: string, value: unknown): boolean {
    try {
      getStorage().setItem(key(name), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function remove(name: string): boolean {
    try {
      getStorage().removeItem(key(name));
      return true;
    } catch {
      return false;
    }
  }

  function writeAll(entries: readonly (readonly [string, unknown])[]): boolean {
    let storage: Storage;
    const before: [string, string | null][] = [];
    try {
      storage = getStorage();
      for (const [name] of entries) before.push([key(name), storage.getItem(key(name))]);
    } catch {
      return false;
    }
    try {
      for (const [name, value] of entries) storage.setItem(key(name), JSON.stringify(value));
      return true;
    } catch {
      for (const [k, text] of before) {
        try {
          if (text === null) storage.removeItem(k);
          else storage.setItem(k, text);
        } catch {
          // 戻せなくても外に投げない
        }
      }
      return false;
    }
  }

  function migrateStorage(): void {
    const r = read('schema');
    if (!r.ok || r.value !== STORAGE_VERSION) write('schema', STORAGE_VERSION);
  }

  return { read, write, writeAll, remove, migrateStorage };
}
