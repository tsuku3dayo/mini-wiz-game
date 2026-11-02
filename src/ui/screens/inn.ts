// 宿屋（#/inn。仕様書 §11.5、GUI-0003 §1、TD-0004 §3）
// 操作の場所は 1 つの入れ物で、中身を替える：宿屋のメニュー／GameMenu／タイトルへ戻るの確認
// まだ作っていないもの：「ダンジョンへ」（TASK-0009）、そうび・もちもの（TASK-0010 以降）、
// ステータス画面と広い画面の実績（TASK-0013）、「おと」（TASK-0017）。項目は出すが、選んでも何もしない
import { commandMenu, type CommandMenu } from '../components/command-menu';
import { confirmMenu } from '../components/confirm-menu';
import { errorPanel } from '../components/error-panel';
import { columns, gameFrame } from '../components/game-frame';
import { gameMenu } from '../components/game-menu';
import { gameWindow } from '../components/game-window';
import { messageLog } from '../components/message-log';
import { statusPanel, type StatusPanel } from '../components/status-panel';
import { isWide, onWideChange } from '../dom';
import type { ScreenContext } from '../router';

type Mode = 'menu' | 'gameMenu' | 'confirm';

const INDEX_MENU = 2;
const INDEX_QUIT = 4;

export function mountInn(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { store, api, command, queue } = ctx;

  // 画面に固有の状態（作り直しても残す。TD-0003 §2）
  let mode: Mode = 'menu';
  /** 宿屋のメニューを作るときのカーソル（null なら初め＝やすむ） */
  let cursor: number | null = null;
  let quitting = false;

  let parts: { destroy(): void }[] = [];
  let status: StatusPanel | null = null;
  let innMenu: CommandMenu | null = null;
  let confirm: ReturnType<typeof confirmMenu> | null = null;
  let menuWindow: { update(next: { disabled?: boolean }): void } | null = null;
  let logSlot: HTMLElement | null = null;
  let actionSlot: HTMLElement | null = null;
  let logPart: { el: HTMLElement; destroy(): void } | null = null;
  let panel: { el: HTMLElement; destroy(): void } | null = null;

  const showReason = (reason: string) => queue.enqueue([{ text: reason, tone: 'normal' }]);
  const innLocked = () => command.locked || quitting || command.fatal !== null;

  function setMode(next: Mode, nextCursor: number | null = cursor) {
    mode = next;
    cursor = nextCursor;
    drawAction();
  }

  function quit() {
    quitting = true;
    confirm?.setDisabled(true);
    let ok = false;
    void command.run(async () => {
      await api.quitGame();
      ok = true;
    }).then(() => {
      quitting = false;
      if (!ok) {
        // 失敗の文は command が出す。元のメニューに戻す
        setMode('menu', INDEX_QUIT);
        return;
      }
      // 成功：メッセージ欄を消し、ゲームの状態を null にし、セーブの有無を取り直す（→ タイトルへ）
      queue.clear();
      store.setGame(null);
      void store.refetchSave();
    });
  }

  function drawAction() {
    if (!actionSlot) return;
    innMenu = null;
    confirm = null;
    menuWindow = null;
    if (mode === 'menu') {
      const menu = commandMenu({
        label: '宿屋',
        items: [
          { label: 'やすむ', onSelect: () => void command.run(() => api.rest()) },
          { label: 'セーブ', onSelect: () => void command.run(() => api.save(), { refetchSave: true }) },
          { label: 'メニュー', onSelect: () => setMode('gameMenu', INDEX_MENU) },
          { label: 'ダンジョンへ' },
          { label: 'タイトルへ戻る', onSelect: () => setMode('confirm', INDEX_QUIT) },
        ],
        initialIndex: cursor ?? 0,
        autoFocus: !innLocked(),
        disabled: innLocked(),
      });
      innMenu = menu;
      actionSlot.replaceChildren(gameWindow({}, menu.el).el);
    } else if (mode === 'gameMenu') {
      const gm = gameMenu({
        place: 'inn',
        wide: isWide(),
        soundOn: false,
        onClose: () => setMode('menu', INDEX_MENU),
        onEquip: () => undefined,
        onItems: () => undefined,
        onStatus: () => undefined,
        onToggleSound: () => undefined,
        onDisabledSelect: showReason,
      });
      menuWindow = gm;
      actionSlot.replaceChildren(gm.el);
    } else {
      const c = confirmMenu({
        text: 'プレイ中の ぼうけんは きえます。よろしいですか？',
        onYes: quit,
        onNo: () => setMode('menu', INDEX_QUIT),
        disabled: quitting,
      });
      confirm = c;
      actionSlot.replaceChildren(c.el);
    }
  }

  /** 画面全体を作る（初めと、狭い画面⇔広い画面の切り替えのとき） */
  function build() {
    parts.forEach((p) => p.destroy());
    parts = [];
    panel = null;
    const state = store.game.state;
    if (!state) return;
    const wide = isWide();

    status = statusPanel({ variant: 'full', character: state.character, wide });
    const log = messageLog({ queue, command, rows: 5 });
    logPart = log;
    logSlot = document.createElement('div');
    logSlot.className = 'inn-log-slot';
    logSlot.append(log.el);
    actionSlot = document.createElement('div');
    actionSlot.className = 'inn-action';

    // 広い画面：上 ステータス｜じっせき（実績は TASK-0013 で足す）、下 メッセージ欄｜操作の場所
    const frame = wide
      ? gameFrame({ name: '宿屋' }, columns([status.el], [], true), columns([logSlot], [actionSlot], true))
      : gameFrame({ name: '宿屋' }, status.el, logSlot, actionSlot);
    root.replaceChildren(frame.el);
    parts.push(status, log, frame);
    drawAction();
    renderError();
  }

  function renderError() {
    if (!logSlot || !logPart) return;
    // 続けられないエラー：メッセージ欄の場所に ErrorPanel（仕様書 §11.5・§11.9）
    if (command.fatal && !panel) {
      panel = errorPanel({ onRetry: () => void command.retry() });
      logSlot.replaceChildren(panel.el);
    } else if (!command.fatal && panel) {
      panel.destroy();
      panel = null;
      logSlot.replaceChildren(logPart.el);
    }
  }

  function onChange() {
    const state = store.game.state;
    if (state) status?.update(state.character);
    const locked = innLocked();
    innMenu?.update({ disabled: locked });
    menuWindow?.update({ disabled: command.fatal !== null });
    confirm?.setDisabled(quitting || command.fatal !== null);
    renderError();
  }

  const offStore = store.subscribe(onChange);
  const offCommand = command.subscribe(onChange);
  const offWide = onWideChange(build);
  build();

  return {
    destroy() {
      offStore();
      offCommand();
      offWide();
      parts.forEach((p) => p.destroy());
      root.replaceChildren();
    },
  };
}
