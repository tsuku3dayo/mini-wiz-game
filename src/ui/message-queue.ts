// メッセージキュー（仕様書 §11.8）。アプリに 1 つ置き、画面をまたいで行を持つ
import type { Message, MessageEffect, Rarity } from '../api/types';
import { appendLines, holdCount, planReduced, waitAfter } from '../logic/message-plan';

export interface QueueLine extends Message {
  /** 通し番号（新しく出た行を見分けるため） */
  id: number;
}

export interface ActiveEffect {
  line: QueueLine;
  effect: MessageEffect;
  rarity?: Rarity;
  seq: number;
}

export interface MessageQueue {
  /** 表示中の行（最新 7 行） */
  readonly lines: readonly QueueLine[];
  /** 未表示の行がある、または演出中 */
  readonly busy: boolean;
  /** 画面の遷移を保留すべきか */
  readonly holdNavigation: boolean;
  readonly activeEffect: ActiveEffect | null;
  /** afterNavigation（足元の案内）は保留に数えない */
  enqueue(messages: readonly Message[], afterNavigation?: readonly Message[]): void;
  /** 残りをすべて出し、演出を終え、保留を解く */
  skip(): void;
  /** 表示中の行・表示待ち・保留・演出を全部消す */
  clear(): void;
  subscribe(listener: () => void): () => void;
  destroy(): void;
}

export interface QueueOptions {
  reducedMotion: () => boolean;
  /** 演出の始まり・終わり（効果音は音の TASK でつなぐ） */
  onEffectStart?: (e: ActiveEffect) => void;
  onEffectEnd?: (e: ActiveEffect) => void;
}

export function createMessageQueue(opts: QueueOptions): MessageQueue {
  let lines: QueueLine[] = [];
  let pending: QueueLine[] = [];
  let hold = 0;
  let active: ActiveEffect | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextId = 1;
  let seq = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  const stamp = (m: Message): QueueLine => ({ ...m, id: nextId++ });

  function stopTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function startEffect(line: QueueLine) {
    if (!line.effect) return;
    active = { line, effect: line.effect, rarity: line.rarity, seq: ++seq };
    opts.onEffectStart?.(active);
  }

  function endEffect() {
    if (!active) return;
    const ended = active;
    active = null;
    opts.onEffectEnd?.(ended);
  }

  /** 次の行を 1 つ出し、待ちを決める */
  function showNext() {
    const line = pending.shift();
    if (!line) return;
    lines = appendLines(lines, [line]);
    if (hold > 0) hold -= 1;
    startEffect(line);
    if (line.effect || pending.length > 0) {
      timer = setTimeout(() => {
        timer = null;
        endEffect();
        showNext();
        notify();
      }, waitAfter(line));
    }
  }

  const queue: MessageQueue = {
    get lines() { return lines; },
    get busy() { return pending.length > 0 || active !== null; },
    get holdNavigation() { return hold > 0; },
    get activeEffect() { return active; },

    enqueue(messages, afterNavigation = []) {
      const all = [...messages, ...afterNavigation].map(stamp);
      if (all.length === 0) return;
      if (opts.reducedMotion()) {
        // 一度に全部出し、最後の演出だけを立てる（色の強調用）。保留はしない
        stopTimer();
        endEffect();
        const plan = planReduced(all);
        lines = appendLines(lines, [...pending, ...plan.show]);
        pending = [];
        hold = plan.hold;
        const last = plan.effectLine;
        if (last) {
          startEffect(last);
          timer = setTimeout(() => { timer = null; endEffect(); notify(); }, plan.wait);
        }
        notify();
        return;
      }
      hold += holdCount(messages);
      const idle = timer === null && pending.length === 0;
      pending.push(...all);
      if (idle) showNext();
      notify();
    },

    skip() {
      stopTimer();
      lines = appendLines(lines, pending);
      pending = [];
      hold = 0;
      endEffect();
      notify();
    },

    clear() {
      stopTimer();
      lines = [];
      pending = [];
      hold = 0;
      endEffect();
      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    destroy() {
      stopTimer();
      listeners.clear();
    },
  };
  return queue;
}

/** busy の間の Enter／Space でスキップする（キャプチャ段階で受け、メニューへ届けない。仕様書 §11.8） */
export function attachSkipKeys(queue: MessageQueue): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (!queue.busy || e.isComposing) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    queue.skip();
  };
  window.addEventListener('keydown', onKey, true);
  return () => window.removeEventListener('keydown', onKey, true);
}
