// ダンジョン（#/dungeon。仕様書 §11.5、GUI-0004、TD-0004 §4、TD-0003 §6）
// 狭い画面：階と向き → 疑似3D → メッセージ欄 → ステータス → ［地図｜移動ボタン］→ 操作の行［階段｜≡ メニュー］
// 広い画面：上 ［階と向き・疑似3D］｜地図、下 メッセージ欄（6 行）｜［ステータス・［移動ボタン｜階段／メニュー］］
// メニューを開くと、操作の場所（狭い画面は地図と移動ボタン・操作の行、広い画面は右下のボタン）を GameMenu に替える
// そうび・もちもの・ステータス画面（狭い画面だけ）は、画面全体を差し替える。「おと」はその場で切り替える
import type { MoveAction, StairsView } from '../../api/types';
import { autoMap, type AutoMap } from '../components/auto-map';
import { equipmentPanel } from '../components/equipment-panel';
import { inventoryPanel } from '../components/inventory-panel';
import { errorPanel } from '../components/error-panel';
import { columns, gameFrame } from '../components/game-frame';
import { gameMenu, type GameMenu } from '../components/game-menu';
import { firstPersonView, type FirstPersonView } from '../components/first-person-view';
import { locationLabel } from '../components/location-label';
import { messageLog } from '../components/message-log';
import { movePad } from '../components/move-pad';
import { stairsButton } from '../components/stairs-button';
import { statusPanel, type StatusPanel } from '../components/status-panel';
import { statusScreen } from '../components/status-screen';
import { el, isTypingKey, isWide, onWideChange } from '../dom';
import { flashOnMessage } from '../effects';
import type { ScreenContext } from '../router';

const KEYS: Readonly<Record<string, MoveAction>> = {
  ArrowUp: 'forward',
  ArrowDown: 'backward',
  ArrowLeft: 'turnLeft',
  ArrowRight: 'turnRight',
};
/** 疑似3D の高さの下限（幅 173px） */
const MIN_VIEW_H = 130;
/** 広い画面の地図の一辺の下限 */
const MIN_MAP = 176;

export function mountDungeon(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { store, api, command, queue, sound } = ctx;

  // 画面に固有の状態（作り直しても残す）
  let menuOpen = false;
  /** 画面全体を差し替えて出している画面（ステータスは狭い画面だけ） */
  let sub: 'status' | 'equip' | 'items' | null = null;

  let parts: { destroy(): void }[] = [];
  let label: ReturnType<typeof locationLabel> | null = null;
  let fpv: FirstPersonView | null = null;
  let map: AutoMap | null = null;
  let status: StatusPanel | null = null;
  let pad: ReturnType<typeof movePad> | null = null;
  let stairs: ReturnType<typeof stairsButton> | null = null;
  let menuButton: HTMLButtonElement | null = null;
  let menu: GameMenu | null = null;
  let actionSlot: HTMLElement | null = null;
  let controls: HTMLElement | null = null;
  let logSlot: HTMLElement | null = null;
  let logEl: HTMLElement | null = null;
  let panel: { el: HTMLElement; destroy(): void } | null = null;
  let top: HTMLElement | null = null;
  let viewCol: HTMLElement | null = null;

  const showReason = (reason: string) => queue.enqueue([{ text: reason, tone: 'normal' }]);
  /** 操作できる＝場所が DUNGEON・応答待ちでない・逐次表示中でない・メニューを開いていない */
  const operable = () => store.game.state?.location === 'DUNGEON' && !command.locked && !menuOpen && command.fatal === null;

  const doMove = (action: MoveAction) => {
    if (operable()) void command.run(() => api.move({ action }));
  };
  const doStairs = (underfoot: Exclude<StairsView, null>) => {
    if (!operable()) return;
    if (underfoot === 'entrance') void command.run(() => api.returnToInn());
    else void command.run(() => api.stairs({ direction: underfoot }));
  };

  function setMenu(open: boolean) {
    menuOpen = open;
    drawAction();
    refresh();
    scheduleFit();
    if (!open) menuButton?.focus();
  }

  /** 操作の場所の中身を替える */
  function drawAction() {
    if (!actionSlot || !controls) return;
    menu?.destroy();
    menu = null;
    if (menuOpen) {
      const state = store.game.state;
      menu = gameMenu({
        place: 'dungeon',
        wide: isWide(),
        canHeal: !!state?.canHeal,
        soundOn: sound.on,
        disabled: command.locked,
        onClose: () => setMenu(false),
        // 使ってもメニューは開いたまま、カーソルもそのまま（仕様書 §11.4）
        onHeal: () => void command.run(() => api.heal()),
        onEquip: () => {
          sub = 'equip';
          build();
        },
        onItems: () => {
          sub = 'items';
          build();
        },
        onStatus: () => {
          sub = 'status';
          build();
        },
        // その場で切り替える（メニューは閉じない）。メッセージ欄に 1 行
        onToggleSound: () => {
          const on = sound.toggle();
          menu?.update({ soundOn: on });
          queue.enqueue([{ text: on ? 'おとを オンにした' : 'おとを オフにした', tone: 'normal' }]);
        },
        onDisabledSelect: showReason,
      });
      actionSlot.replaceChildren(menu.el);
    } else {
      actionSlot.replaceChildren(controls);
    }
  }

  /** 画面全体を作る（初めと、狭い画面⇔広い画面の切り替えのとき） */
  function build() {
    parts.forEach((p) => p.destroy());
    parts = [];
    panel = null;
    const state = store.game.state;
    if (!state || !state.dungeon) return;
    const wide = isWide();

    // ステータス画面（狭い画面だけ）・そうび・もちもの：画面全体を差し替える。
    // 広い画面へ切り替わったら、ステータス画面はダンジョンに戻す（TD-0004 §7）
    if (sub === 'status' && wide) {
      sub = null;
      menuOpen = false;
    }
    if (sub) {
      label = null;
      fpv = null;
      map = null;
      status = null;
      pad = null;
      stairs = null;
      menuButton = null;
      menu = null;
      actionSlot = null;
      controls = null;
      logSlot = null;
      logEl = null;
      top = null;
      viewCol = null;
      // 閉じるとダンジョン（メニューは閉じた状態）に戻り、フォーカスは「≡ メニュー」
      const onClose = () => {
        sub = null;
        menuOpen = false;
        build();
        menuButton?.focus();
      };
      const screen = sub === 'status'
        ? statusScreen({ character: state.character, records: state.records, onBack: onClose })
        : (sub === 'equip' ? equipmentPanel : inventoryPanel)({ store, api, command, onClose });
      root.replaceChildren(screen.el);
      parts.push(screen);
      return;
    }

    label = locationLabel();
    fpv = firstPersonView();
    map = autoMap();
    status = statusPanel({ variant: 'compact', character: state.character });
    pad = movePad(doMove);
    stairs = stairsButton(doStairs);
    menuButton = el('button', { class: 'wiz-button wiz-menu-button', type: 'button' }, '≡ メニュー');
    menuButton.addEventListener('click', () => { if (operable()) setMenu(true); });
    const log = messageLog({ queue, command, rows: wide ? 6 : 5 });
    logEl = log.el;
    logSlot = el('div', { class: 'dungeon-log-slot' }, log.el);
    actionSlot = el('div', { class: 'dungeon-action' });

    let frame;
    if (wide) {
      controls = el('div', { class: 'dungeon-controls' }, pad.el, el('div', { class: 'dungeon-ops' }, stairs.el, menuButton));
      viewCol = el('div', { class: 'dungeon-view' }, label.el, fpv.el);
      top = el('div', { class: 'dungeon-top' }, viewCol, el('div', { class: 'dungeon-map' }, map.el));
      frame = gameFrame({ name: 'ダンジョン', hideNameOnNarrow: true }, top, columns([logSlot], [status.el, actionSlot], true));
    } else {
      controls = el('div', { class: 'dungeon-controls' },
        el('div', { class: 'dungeon-map-row' }, map.el, pad.el),
        el('div', { class: 'dungeon-ops' }, stairs.el, menuButton));
      top = null;
      viewCol = null;
      frame = gameFrame({ name: 'ダンジョン', hideNameOnNarrow: true }, label.el, fpv.el, logSlot, status.el, actionSlot);
    }
    root.replaceChildren(frame.el);
    parts.push(log, status, frame, { destroy: () => menu?.destroy() });
    drawAction();
    refresh();
    renderError();
    scheduleFit();
  }

  /** ストア・操作の状態が変わったとき：変わった部品だけ書き替える */
  function refresh() {
    const state = store.game.state;
    // 遷移の保留中（遭遇など）は、直前の視界と地図を出し続ける
    if (state?.dungeon) {
      const d = state.dungeon;
      label?.update(d.floor, d.facing);
      fpv?.update(d);
      map?.update(d.map, d.facing, d.floor);
      status?.update(state.character);
    }
    const ok = operable();
    pad?.setDisabled(!ok);
    stairs?.update(state?.dungeon?.underfoot ?? null, !ok);
    if (menuButton) menuButton.disabled = !ok;
    menu?.update({ canHeal: !!state?.canHeal, disabled: command.locked });
  }

  function renderError() {
    if (!logSlot || !logEl) return;
    if (command.fatal && !panel) {
      panel = errorPanel({ onRetry: () => void command.retry() });
      logSlot.replaceChildren(panel.el);
      scheduleFit();
    } else if (!command.fatal && panel) {
      panel.destroy();
      panel = null;
      logSlot.replaceChildren(logEl);
      scheduleFit();
    }
  }

  /** 疑似3D と地図の大きさを、画面の高さに合わせて決める（TD-0003 §6 の fitDungeon） */
  function fit() {
    if (!fpv || !map) return;
    const over = () => document.documentElement.scrollHeight - window.innerHeight;
    const shrink = () => {
      const o = over();
      if (o > 0 && fpv) fpv.setWidth((Math.max(MIN_VIEW_H, fpv.height - o) * 4) / 3);
    };
    if (top && viewCol) {
      const mapFrame = map.el.offsetWidth - map.size;
      map.setSize(MIN_MAP);
      fpv.setWidth(top.clientWidth - (MIN_MAP + mapFrame) - 8);
      shrink();
      const rest = Math.min(top.clientWidth - fpv.width - 8, viewCol.offsetHeight) - mapFrame;
      map.setSize(Math.max(MIN_MAP, Math.floor(rest * 0.9)));
      // 地図の縦の中心を、疑似3D の縦の中心にそろえる
      map.el.style.marginBottom = `${Math.max(0, Math.floor((fpv.height - map.el.offsetHeight) / 2))}px`;
    } else {
      const avail = fpv.el.parentElement?.clientWidth ?? 320;
      fpv.setWidth(Math.min(320, avail));
      shrink();
    }
  }
  let fitFrame = 0;
  function scheduleFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => fit());
    fit();
  }

  // 矢印キー：ページのどこにフォーカスがあっても効く。入力欄・変換中は捨てる。操作できないときは捨てる（貯めない）
  const onKey = (e: KeyboardEvent) => {
    const action = KEYS[e.key];
    if (!action || isTypingKey(e)) return;
    e.preventDefault();
    if (menuOpen) return; // メニューの部品が先に処理する
    doMove(action);
  };
  window.addEventListener('keydown', onKey);
  const onResize = () => scheduleFit();
  window.addEventListener('resize', onResize);

  const offFlash = flashOnMessage(queue, (text) => text === 'かべだ', (on) => fpv?.setFlash(on));
  const onChange = () => {
    refresh();
    renderError();
  };
  const offStore = store.subscribe(onChange);
  const offCommand = command.subscribe(onChange);
  // そうび・もちものは CSS だけで並びが替わるので、作り直さない（カーソルなどを残す）
  const offWide = onWideChange(() => { if (sub !== 'equip' && sub !== 'items') build(); });
  build();

  return {
    destroy() {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(fitFrame);
      offFlash();
      offStore();
      offCommand();
      offWide();
      parts.forEach((p) => p.destroy());
      root.replaceChildren();
    },
  };
}
