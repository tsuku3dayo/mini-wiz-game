// ストア：ゲームの状態とセーブの一覧（仕様書 §11.10、§27.3）。メッセージは持たない
import type { GameApi, GameView, SaveSlotSummary } from '../api/types';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface GameSlot {
  status: LoadStatus;
  state: GameView | null;
}

/** セーブの一覧（v1.14 で 1 つから 3 スロットに。slots は getSaves() の 3 つ、空きは null） */
export interface SaveState {
  status: LoadStatus;
  slots: (SaveSlotSummary | null)[];
}

export interface Store {
  readonly game: GameSlot;
  readonly save: SaveState;
  /** 操作の結果で置き換える（取り直さない）。タイトルへ戻るでは null */
  setGame(state: GameView | null): void;
  refetchGame(): Promise<void>;
  refetchSave(): Promise<void>;
  /** 値が変わったら呼ぶ。戻り値で外す */
  subscribe(listener: () => void): () => void;
}

const EMPTY_SLOTS: (SaveSlotSummary | null)[] = [null, null, null];

/** 取得の失敗は 1 回だけやり直す（v1.0 の retry: 1） */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return fn();
  }
}

export function createStore(api: Pick<GameApi, 'getGame' | 'getSaves'>): Store {
  let game: GameSlot = { status: 'loading', state: null };
  let save: SaveState = { status: 'loading', slots: EMPTY_SLOTS };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    get game() { return game; },
    get save() { return save; },

    setGame(state) {
      game = { status: 'ready', state };
      notify();
    },

    // 取り直しの間は前の値を見せ続ける（「取得中」は起動の最初だけ。v1.0 の isLoading と同じ）
    async refetchGame() {
      try {
        const r = await withRetry(() => api.getGame());
        game = { status: 'ready', state: r.state };
      } catch {
        game = { status: 'error', state: null };
      }
      notify();
    },

    async refetchSave() {
      try {
        const r = await withRetry(() => api.getSaves());
        save = { status: 'ready', slots: r.slots };
      } catch {
        save = { status: 'error', slots: EMPTY_SLOTS };
      }
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
