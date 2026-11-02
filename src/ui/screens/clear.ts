// ゲームクリア（#/clear。仕様書 §11.5「ゲームクリア」、GUI-0005 §2、TD-0004 §6）
// 縦の中央：見出し → クリアの文のウィンドウ → メッセージ欄（5 行）→ メニュー（宿屋へ）
// 見出しは、メッセージ欄が clear の演出の行を出しているあいだ浮かび上がる（動きを減らす設定では動かさない）
import { commandMenu, type CommandMenu } from '../components/command-menu';
import { errorPanel } from '../components/error-panel';
import { gameWindow } from '../components/game-window';
import { messageLog } from '../components/message-log';
import { el } from '../dom';
import type { ScreenContext } from '../router';

export function mountClear(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { store, api, command, queue } = ctx;
  const state = store.game.state;
  if (!state) return { destroy: () => root.replaceChildren() };

  const heading = el('h1', { class: 'clear-heading' }, '暗黒のネクロマンサーを たおした');
  const c = state.character;
  const body = gameWindow({ className: 'clear-window' },
    el('p', { class: 'clear-line' }, '暗黒のネクロマンサーは ほろび、ダンジョンに 平和が もどった'),
    el('p', { class: 'clear-line' }, `${c.name} Lv${c.level}`),
    state.clear?.autoSaved ? el('p', { class: 'clear-line clear-saved' }, 'ぼうけんの きろくを セーブした') : null,
    el('p', { class: 'clear-line clear-laps' }, `${state.records.laps} 周目へ すすむ`));
  const log = messageLog({ queue, command, rows: 5 });
  const logSlot = el('div', { class: 'clear-log-slot' }, log.el);
  const locked = () => store.game.state?.location !== 'CLEARED' || command.locked || command.fatal !== null;
  const menu: CommandMenu = commandMenu({
    label: 'ゲームクリア',
    items: [{ label: '宿屋へ', onSelect: () => void command.run(() => api.continueGame()) }],
    autoFocus: !locked(),
    disabled: locked(),
  });
  const main = el('main', { class: 'title-main clear-main' }, heading, body.el, logSlot, gameWindow({}, menu.el).el);
  root.replaceChildren(main);

  let panel: { el: HTMLElement; destroy(): void } | null = null;
  function onChange() {
    menu.update({ disabled: locked() });
    // clear の演出の行を出しているあいだ、見出しを浮かび上がらせる
    heading.classList.toggle('rising', queue.activeEffect?.effect === 'clear');
    if (command.fatal && !panel) {
      panel = errorPanel({ onRetry: () => void command.retry() });
      logSlot.replaceChildren(panel.el);
    } else if (!command.fatal && panel) {
      panel.destroy();
      panel = null;
      logSlot.replaceChildren(log.el);
    }
  }
  const offStore = store.subscribe(onChange);
  const offCommand = command.subscribe(onChange);
  const offQueue = queue.subscribe(onChange);
  onChange();

  return {
    destroy() {
      offStore();
      offCommand();
      offQueue();
      log.destroy();
      panel?.destroy();
      root.replaceChildren();
    },
  };
}
