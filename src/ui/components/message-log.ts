// MessageLog：メッセージ欄（仕様書 §11.8、TD-0003 §3）。キューの lines のうち最新 rows 行を出す
import { WAITING_MARK_MS } from '../../logic/message-plan';
import type { Command } from '../command';
import { el } from '../dom';
import type { MessageQueue, QueueLine } from '../message-queue';
import { gameWindow } from './game-window';

export interface MessageLogOptions {
  queue: MessageQueue;
  /** 応答待ちの ▼ を出すために見る */
  command?: Command;
  /** 出す行数（5／6／7） */
  rows: number;
}

export interface MessageLog {
  el: HTMLElement;
  destroy(): void;
}

function lineClass(line: QueueLine, activeId: number | null, activeEffect: string | null): string {
  const names = ['wiz-line', `tone-${line.tone}`];
  if (line.rarity) names.push(`rarity-${line.rarity.toLowerCase()}`);
  if (line.id === activeId && activeEffect) names.push(`effect-${activeEffect}`);
  return names.join(' ');
}

export function messageLog(opts: MessageLogOptions): MessageLog {
  const { queue, command } = opts;
  const log = el('div', { class: 'wiz-log', role: 'log', 'aria-live': 'polite' });
  log.style.setProperty('--rows', String(opts.rows));
  const waiting = el('span', { class: 'wiz-waiting', role: 'img', 'aria-label': '応答待ち', hidden: true }, '▼');
  const win = gameWindow({ testId: 'message-window', className: 'wiz-message-window' }, log, waiting);
  win.el.addEventListener('click', () => queue.skip());

  function render() {
    const shown = queue.lines.slice(-opts.rows);
    const active = queue.activeEffect;
    const rows = shown.map((line) => el('div', { class: lineClass(line, active?.line.id ?? null, active?.effect ?? null) }, line.text));
    log.replaceChildren(...rows);
    // 折り返しで枠に入りきらないときは、古い行から消して新しい行をいつも見せる
    while (log.isConnected && log.children.length > 1 && log.scrollHeight > log.clientHeight) {
      log.firstElementChild?.remove();
      shown.shift();
    }
    win.setVariant(shown.some((l) => l.tone === 'danger') ? 'danger' : 'default');
  }

  // 応答待ちが 300ms を超えたら ▼ を出す（ちょうど 300ms では出さないので、1ms 足して待つ。TC-0011-08）
  let waitTimer: ReturnType<typeof setTimeout> | null = null;
  let wasPending = false;
  function onCommand() {
    const pending = !!command?.isPending;
    if (pending === wasPending) return;
    wasPending = pending;
    if (waitTimer !== null) clearTimeout(waitTimer);
    waitTimer = null;
    if (pending) waitTimer = setTimeout(() => { waiting.hidden = false; }, WAITING_MARK_MS + 1);
    else waiting.hidden = true;
  }

  const offQueue = queue.subscribe(render);
  const offCommand = command?.subscribe(onCommand);
  render();
  // 部品を DOM に入れたあとで、入りきらない行を消し直す
  queueMicrotask(render);

  return {
    el: win.el,
    destroy() {
      offQueue();
      offCommand?.();
      if (waitTimer !== null) clearTimeout(waitTimer);
      win.destroy();
    },
  };
}
