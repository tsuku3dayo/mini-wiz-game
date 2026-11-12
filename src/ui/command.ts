// 操作の共通の流れ（仕様書 §11.8「操作の結果の扱い」、§11.9、§11.10。v1.0 の useGameCommand）
import { GameError, type CommandResult, type GameView, type Message } from '../api/types';
import { isEncounter } from '../logic/arrival';
import { encounterLockMs } from '../logic/message-plan';
import type { MessageQueue } from './message-queue';
import type { Store } from './store';

export interface RunOptions {
  /** 成功したらセーブの有無を取り直す（セーブ・つづきから） */
  refetchSave?: boolean;
  /** 400 を画面が受け取るとき（名前入力）。true を返したら、ほかの扱いをしない */
  onValidationError?: (e: GameError) => boolean;
}

export interface Command {
  /** 応答待ち中・busy のときは何もしない。成功なら結果を返す */
  run(op: () => Promise<CommandResult | void>, opts?: RunOptions): Promise<CommandResult | void>;
  readonly isPending: boolean;
  /** 応答待ち、またはメッセージの busy */
  readonly locked: boolean;
  /** 続けられないエラー（ErrorPanel を出す） */
  readonly fatal: GameError | null;
  /** fatal を解き、retryLast なら直前の操作をやり直す（名前入力）。そうでなければゲームの状態とセーブの有無を取り直す */
  retry(retryLast?: boolean): Promise<void>;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}

export interface CommandDeps {
  store: Store;
  queue: MessageQueue;
  /** 遭遇したとき（ボスでなければ遭遇の効果音。音の TASK でつなぐ） */
  onEncounter?: (next: GameView) => void;
  /** 足元の案内（TASK-0009 の logic/arrival.ts でつなぐ） */
  arrival?: (prev: GameView | null, next: GameView) => Message | null;
}

export function createCommand(deps: CommandDeps): Command {
  const { store, queue } = deps;
  let pending = false;
  let fatal: GameError | null = null;
  let last: { op: () => Promise<CommandResult | void>; opts?: RunOptions } | null = null;
  const listeners = new Set<() => void>();

  const locked = () => pending || queue.busy;
  function notify() {
    document.body.dataset.busy = String(locked());
    listeners.forEach((l) => l());
  }
  const offQueue = queue.subscribe(notify);

  function onSuccess(result: CommandResult, opts?: RunOptions) {
    const prev = store.game.state;
    const next = result.state;
    if (isEncounter(prev, next)) {
      queue.clear();
      // 遭遇の入力止め（仕様書 v1.17 §11.8）：連打で たたかう が決まったり、ボス出現の演出が飛んだりしないように
      queue.lock(encounterLockMs(next.battle?.isBoss === true));
      deps.onEncounter?.(next);
    }
    const arrival = deps.arrival?.(prev, next);
    queue.enqueue(result.messages, arrival ? [arrival] : []);
    store.setGame(next);
    if (opts?.refetchSave) void store.refetchSave();
  }

  function onFailure(e: unknown, opts?: RunOptions) {
    if (!(e instanceof GameError) || e.status === 500) {
      if (!(e instanceof GameError)) console.error(e);
      fatal = e instanceof GameError ? e : new GameError({ status: 500, error: 'internal_error', message: '内部エラー' });
      return;
    }
    if (e.status === 400 && opts?.onValidationError?.(e)) return;
    if (e.status === 409 && e.error === 'rule_violation') {
      queue.enqueue([{ text: e.message, tone: 'danger' }]);
      return;
    }
    queue.enqueue([{ text: e.message || 'その操作は いまは できない', tone: 'normal' }]);
    void store.refetchGame();
    void store.refetchSave();
  }

  const command: Command = {
    async run(op, opts) {
      if (locked()) return;
      last = { op, opts };
      pending = true;
      notify();
      try {
        const result = await op();
        if (result) onSuccess(result, opts);
        return result;
      } catch (e) {
        onFailure(e, opts);
        return undefined;
      } finally {
        pending = false;
        notify();
      }
    },
    get isPending() { return pending; },
    get locked() { return locked(); },
    get fatal() { return fatal; },

    async retry(retryLast = false) {
      fatal = null;
      notify();
      if (retryLast && last) {
        await command.run(last.op, last.opts);
        return;
      }
      await Promise.all([store.refetchGame(), store.refetchSave()]);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      offQueue();
      listeners.clear();
    },
  };
  notify();
  return command;
}
