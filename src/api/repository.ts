// 保存の値 ⇔ ルールの型の変換と読み書き（仕様書 §21、§24.3 の「ゲーム API の中の分担」）
import { ConflictError } from '../domain/errors';
import {
  GAME_SCHEMA_VERSION,
  migrateGameState,
  SAVE_SLOTS,
  type DroppedItem,
  type SaveSlot,
  type GameStateData,
  type SaveData,
  type StoredGameState,
  type StoredSave,
} from '../domain/game-state';

export type ReadResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'missing' | 'unreadable' | 'unavailable' };

/** ゲーム API が受け取る保存の形（仕様書 §21.7）。本番は platform/storage.ts、テストは tests/helpers/fake-storage.ts */
export interface KeyValueStore {
  read(name: string): ReadResult;
  write(name: string, value: unknown): boolean;
  writeAll(entries: readonly (readonly [string, unknown])[]): boolean;
  remove(name: string): boolean;
}

/** 保存に書けなかった（ゲーム API が storage_error にする） */
export class StorageError extends Error {
  constructor() {
    super('保存できませんでした');
    this.name = 'StorageError';
  }
}

const GAME = 'game';
/** セーブのキーはスロットごと（save-1〜save-3。v1.14。仕様書 §21.2） */
const saveKey = (slot: SaveSlot) => `save-${slot}`;

const CHARACTER_NUMBERS = ['level', 'exp', 'hp', 'maxHp', 'mp', 'maxMp', 'attack', 'defense', 'speed'] as const;
const LOCATIONS = ['INN', 'DUNGEON', 'BATTLE', 'CLEARED', 'SWAP'];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function hasCharacter(v: Record<string, unknown>): boolean {
  return typeof v.name === 'string' && CHARACTER_NUMBERS.every((k) => typeof v[k] === 'number' && Number.isFinite(v[k]));
}

function isStoredGameState(v: unknown): v is StoredGameState {
  return isObject(v) && hasCharacter(v) && typeof v.schemaVersion === 'number'
    && typeof v.location === 'string' && LOCATIONS.includes(v.location);
}

function isStoredSave(v: unknown): v is StoredSave {
  return isObject(v) && hasCharacter(v) && typeof v.schemaVersion === 'number' && typeof v.savedAt === 'string';
}

const revisionOf = (v: unknown): number | null =>
  isObject(v) && Number.isInteger(v.revision) ? (v.revision as number) : null;

export function warnDropped(dropped: DroppedItem[]): void {
  console.warn(`マスタにない装備を取り除いた ${dropped.map((d) => `#${d.id}:${d.itemId}`).join(', ')}`);
}

export function createRepository(store: KeyValueStore, now: () => string) {
  const toStored = (state: GameStateData, revision: number): StoredGameState => ({
    ...state,
    schemaVersion: GAME_SCHEMA_VERSION,
    revision,
    updatedAt: now(),
  });

  /** 今の revision を読み直し、読んだ値と違えば ConflictError（仕様書 §21.5） */
  function checkRevision(revision: number): void {
    const r = store.read(GAME);
    if (!r.ok || revisionOf(r.value) !== revision) throw new ConflictError();
  }

  /** そのスロットのセーブ。ない・形が違うときは null（空きとして扱う） */
  function findSave(slot: SaveSlot): StoredSave | null {
    const r = store.read(saveKey(slot));
    return r.ok && isStoredSave(r.value) ? r.value : null;
  }

  return {
    /** プレイ中の状態。ない・読めないときは null（読めないときは console.warn。値は消さない） */
    findGame(): { state: GameStateData; revision: number; storedVersion: number } | null {
      const r = store.read(GAME);
      if (!r.ok) {
        if (r.reason === 'unreadable') console.warn('プレイ中の状態が読めないので、ないものとして扱う');
        return null;
      }
      if (!isStoredGameState(r.value)) {
        console.warn('プレイ中の状態の形が違うので、ないものとして扱う');
        return null;
      }
      const row = r.value;
      return { state: migrateGameState(row, warnDropped), revision: revisionOf(row) ?? 0, storedVersion: row.schemaVersion };
    },

    /** プレイ中の状態を丸ごと置き換える。前の値がなければ revision 0、あれば前の値 + 1 */
    replaceGame(state: GameStateData): void {
      const r = store.read(GAME);
      const prev = r.ok ? revisionOf(r.value) : null;
      if (!store.write(GAME, toStored(state, prev === null ? 0 : prev + 1))) throw new StorageError();
    },

    /** 書く直前に revision を確かめて、revision + 1 で書く */
    updateGame(state: GameStateData, revision: number): void {
      checkRevision(revision);
      if (!store.write(GAME, toStored(state, revision + 1))) throw new StorageError();
    },

    deleteGame(): void {
      if (!store.remove(GAME)) throw new StorageError();
    },

    findSave,

    /** 3 スロットを 1→3 の順に（空き・読めないものは null） */
    listSaves(): (StoredSave | null)[] {
      return SAVE_SLOTS.map(findSave);
    },

    /**
     * プレイ中の状態とそのスロットのセーブをまとめて書く（セーブ・クリア時の自動セーブ。途中で失敗したら両方戻る）。
     * revision を確かめてから書く
     */
    writeGameAndSave(state: GameStateData, revision: number, slot: SaveSlot, save: SaveData): void {
      checkRevision(revision);
      const ok = store.writeAll([[GAME, toStored(state, revision + 1)], [saveKey(slot), { ...save, savedAt: now() }]]);
      if (!ok) throw new StorageError();
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
