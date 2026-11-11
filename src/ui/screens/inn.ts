// 宿屋（#/inn。仕様書 §11.5、GUI-0003 §1、TD-0004 §3）
// 操作の場所は 1 つの入れ物で、中身を替える：宿屋のメニュー／GameMenu／タイトルへ戻るの確認／セーブのスロットの一覧／上書きの確認（v1.14）
// 狭い画面のメニューの「ステータス」は、画面全体をステータス画面に差し替える（仕様書 §11.7）。広い画面は上の右に実績
// そうび・もちものも、画面全体を差し替える（メッセージ欄なし）。閉じたら宿屋を作り直し、カーソルを「メニュー」に戻す
import { commandMenu, type CommandMenu } from '../components/command-menu';
import { equipmentPanel } from '../components/equipment-panel';
import { inventoryPanel } from '../components/inventory-panel';
import { recordsWindow, statusScreen } from '../components/status-screen';
import type { SaveSlot } from '../../api/types';
import { defaultSaveSlot, overwriteText } from '../../logic/save-slots';
import { confirmMenu } from '../components/confirm-menu';
import { saveSlotMenu, type SaveSlotMenu } from '../components/save-slot-menu';
import { errorPanel } from '../components/error-panel';
import { columns, gameFrame } from '../components/game-frame';
import { gameMenu } from '../components/game-menu';
import { gameWindow } from '../components/game-window';
import { messageLog } from '../components/message-log';
import { statusPanel, type StatusPanel } from '../components/status-panel';
import { isWide, onWideChange } from '../dom';
import type { ScreenContext } from '../router';

type Mode = 'menu' | 'gameMenu' | 'confirm' | 'slots' | 'overwrite' | 'status' | 'equip' | 'items';

// 項目の並び（v1.14）：やすむ／メニュー／ダンジョンへ／セーブ／タイトルへ戻る
const INDEX_MENU = 1;
const INDEX_SAVE = 3;
const INDEX_QUIT = 4;

export function mountInn(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { store, api, command, queue, sound } = ctx;

  // 画面に固有の状態（作り直しても残す。TD-0003 §2）
  let mode: Mode = 'menu';
  /** 宿屋のメニューを作るときのカーソル（null なら初め＝やすむ） */
  let cursor: number | null = null;
  let quitting = false;
  /** セーブ：上書きを確かめているスロット・書いている途中か（v1.14） */
  let overwriteSlot: SaveSlot | null = null;
  /** スロットの一覧を作り直すときのカーソル（上書きの確認から いいえ で戻ったときは同じスロット） */
  let slotCursor: SaveSlot | null = null;
  let saving = false;

  let parts: { destroy(): void }[] = [];
  let status: StatusPanel | null = null;
  let records: ReturnType<typeof recordsWindow> | null = null;
  let innMenu: CommandMenu | null = null;
  let confirm: ReturnType<typeof confirmMenu> | null = null;
  let slotMenu: SaveSlotMenu | null = null;
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

  /** そのスロットに書く。書き終えたら（失敗しても）宿屋のメニューに戻し、カーソルを「セーブ」に置く（仕様書 §11.5。v1.14） */
  function save(slot: SaveSlot) {
    saving = true;
    confirm?.setDisabled(true);
    slotMenu?.setDisabled(true);
    void command.run(() => api.save({ slot }), { refetchSave: true }).then(() => {
      saving = false;
      overwriteSlot = null;
      slotCursor = null;
      setMode('menu', INDEX_SAVE);
    });
  }

  /** スロットを選んだ：空きならすぐ書き、中身があれば上書きを確かめる */
  function pickSlot(slot: SaveSlot) {
    if (store.save.slots[slot - 1]) {
      overwriteSlot = slot;
      setMode('overwrite');
    } else {
      save(slot);
    }
  }

  function drawAction() {
    if (!actionSlot) return;
    innMenu = null;
    confirm = null;
    slotMenu = null;
    menuWindow = null;
    if (mode === 'menu') {
      const menu = commandMenu({
        label: '宿屋',
        items: [
          { label: 'やすむ', onSelect: () => void command.run(() => api.rest()) },
          { label: 'メニュー', onSelect: () => setMode('gameMenu', INDEX_MENU) },
          { label: 'ダンジョンへ', onSelect: () => void command.run(() => api.enterDungeon()) },
          // 操作の場所をスロットの一覧に替える（v1.14）
          { label: 'セーブ', onSelect: () => setMode('slots', INDEX_SAVE) },
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
        soundOn: sound.on,
        onClose: () => setMode('menu', INDEX_MENU),
        onEquip: () => {
          mode = 'equip';
          build();
        },
        onItems: () => {
          mode = 'items';
          build();
        },
        // 狭い画面だけの項目。画面全体をステータス画面に差し替える
        onStatus: () => {
          mode = 'status';
          build();
        },
        // その場で切り替える（メニューは閉じない）。メッセージ欄に 1 行
        onToggleSound: () => {
          const on = sound.toggle();
          gm.update({ soundOn: on });
          queue.enqueue([{ text: on ? 'おとを オンにした' : 'おとを オフにした', tone: 'normal' }]);
        },
        onDisabledSelect: showReason,
      });
      menuWindow = gm;
      actionSlot.replaceChildren(gm.el);
    } else if (mode === 'slots') {
      const slots = store.save.slots;
      const sm = saveSlotMenu({
        title: 'セーブ',
        slots,
        mode: 'save',
        initialSlot: slotCursor ?? defaultSaveSlot(slots, store.game.state?.saveSlot ?? null),
        onPick: pickSlot,
        onBack: () => setMode('menu', INDEX_SAVE),
        disabled: saving || command.locked || command.fatal !== null,
      });
      slotMenu = sm;
      actionSlot.replaceChildren(sm.el);
    } else if (mode === 'overwrite' && overwriteSlot !== null) {
      const slot = overwriteSlot;
      const summary = store.save.slots[slot - 1];
      const c = confirmMenu({
        text: summary ? overwriteText(slot, summary) : `スロット${slot}に うわがきしますか？`,
        onYes: () => save(slot),
        // いいえ・Esc：スロットの一覧に戻し、カーソルは同じスロット
        onNo: () => {
          overwriteSlot = null;
          slotCursor = slot;
          setMode('slots');
        },
        disabled: saving,
      });
      confirm = c;
      actionSlot.replaceChildren(c.el);
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
    records = null;
    const state = store.game.state;
    if (!state) return;
    const wide = isWide();

    // 広い画面へ切り替わったときにステータス画面を出していたら、宿屋に戻す（TD-0004 §7）
    if (mode === 'status' && wide) {
      mode = 'menu';
      cursor = INDEX_MENU;
    }
    if (mode === 'status' || mode === 'equip' || mode === 'items') {
      status = null;
      actionSlot = null;
      logSlot = null;
      logPart = null;
      innMenu = null;
      confirm = null;
      menuWindow = null;
      // 閉じると宿屋（メニューは閉じた状態）に戻り、フォーカスは「メニュー」
      const onClose = () => {
        mode = 'menu';
        cursor = INDEX_MENU;
        build();
      };
      const screen = mode === 'status'
        ? statusScreen({ character: state.character, records: state.records, onBack: onClose })
        : (mode === 'equip' ? equipmentPanel : inventoryPanel)({ store, api, command, onClose });
      root.replaceChildren(screen.el);
      parts.push(screen);
      return;
    }

    status = statusPanel({ variant: 'full', character: state.character, wide });
    const log = messageLog({ queue, command, rows: 5 });
    logPart = log;
    logSlot = document.createElement('div');
    logSlot.className = 'inn-log-slot';
    logSlot.append(log.el);
    actionSlot = document.createElement('div');
    actionSlot.className = 'inn-action';

    // 広い画面：上 ステータス｜じっせき、下 メッセージ欄｜操作の場所
    if (wide) records = recordsWindow(state.records);
    const frame = wide && records
      ? gameFrame({ name: '宿屋' }, columns([status.el], [records.el], true), columns([logSlot], [actionSlot], true))
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
    if (state) {
      status?.update(state.character);
      records?.update(state.records);
    }
    const locked = innLocked();
    const wasDisabled = innMenu?.el.getAttribute('aria-disabled') === 'true';
    innMenu?.update({ disabled: locked });
    // 開いたときに行を出している途中だった（名前入力から来たときなど）ら、出し終えたところでフォーカスを置く
    if (innMenu && wasDisabled && !locked && !root.contains(document.activeElement)) innMenu.focus();
    menuWindow?.update({ disabled: command.fatal !== null });
    confirm?.setDisabled(quitting || saving || command.fatal !== null);
    slotMenu?.setDisabled(saving || locked);
    renderError();
  }

  const offStore = store.subscribe(onChange);
  const offCommand = command.subscribe(onChange);
  // そうび・もちものは CSS だけで並びが替わるので、作り直さない（カーソルなどを残す）
  const offWide = onWideChange(() => { if (mode !== 'equip' && mode !== 'items') build(); });
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
