// 戦闘（#/battle。仕様書 §11.5「戦闘」、GUI-0005 §1、TD-0004 §5）
// 狭い画面：敵 → メッセージ欄（5 行）→ ステータス → コマンド（横 1 列のボタン。v1.14）。広い画面：敵、下を 2 カラム（メッセージ欄 7 行｜ステータス・コマンド）
// 敵の絵（256×256）は名前の上。敵の種類が変わったら作り直す（仕様書 §13.2）
import type { BattleView } from '../../api/types';
import { commandButtons } from '../components/command-buttons';
import { commandMenu, type MenuItem } from '../components/command-menu';
import { enemyImage } from '../components/enemy-image';
import { errorPanel } from '../components/error-panel';
import { columns, gameFrame } from '../components/game-frame';
import { gameWindow } from '../components/game-window';
import { messageLog } from '../components/message-log';
import { statusPanel, type StatusPanel } from '../components/status-panel';
import { el, isWide, onWideChange } from '../dom';
import { flashOnMessage } from '../effects';
import type { ScreenContext } from '../router';

export function mountBattle(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { store, api, command, queue } = ctx;

  let parts: { destroy(): void }[] = [];
  let status: StatusPanel | null = null;
  /** コマンド：狭い画面は横 1 列のボタン、広い画面は縦の CommandMenu（v1.14。同じ形の update を持つ） */
  let menu: { el: HTMLElement; update(next: { items?: MenuItem[]; disabled?: boolean }): void; focus(): void } | null = null;
  let enemyBox: HTMLElement | null = null;
  let enemyName: HTMLElement | null = null;
  let image: { el: HTMLElement; destroy(): void } | null = null;
  /** 絵を作ったときの敵の種類（変わったら作り直す） */
  let imageKind: string | null = null;
  let logSlot: HTMLElement | null = null;
  let logEl: HTMLElement | null = null;
  let panel: { el: HTMLElement; destroy(): void } | null = null;
  /** 最後に出した敵（勝利・死亡のメッセージ表示中は、直前の敵を出し続ける） */
  let shown: BattleView | null = null;
  /** 作ったときのコマンドの可否（変わったときだけ項目を作り直す） */
  let drawnKey = '';

  const showReason = (reason: string) => queue.enqueue([{ text: reason, tone: 'normal' }]);
  /** 場所が BATTLE でない（勝利後の保留中など）・応答待ち・逐次表示中は、メニュー全体を無効 */
  const locked = () => store.game.state?.location !== 'BATTLE' || command.locked || command.fatal !== null;
  const run = (c: 'attack' | 'heal' | 'flee') => void command.run(() => api.battle({ command: c }));

  function items(b: BattleView): MenuItem[] {
    return [
      { label: 'たたかう', onSelect: () => run('attack') },
      { label: 'ヒール', disabled: !b.canHeal, disabledReason: 'MP が たりない', onSelect: () => run('heal') },
      { label: 'にげる', disabled: !b.canFlee, disabledReason: 'にげられない！', onSelect: () => run('flee') },
    ];
  }

  function build() {
    parts.forEach((p) => p.destroy());
    parts = [];
    panel = null;
    drawnKey = '';
    const state = store.game.state;
    shown = state?.battle ?? shown;
    if (!state || !shown) return;
    const wide = isWide();

    enemyName = el('p', { class: 'battle-enemy-name' });
    enemyBox = el('div', { class: 'battle-enemy' }, enemyName);
    image = null;
    imageKind = null;
    const enemyWin = gameWindow({ testId: 'enemy-window', className: 'battle-enemy-window' }, enemyBox);
    status = statusPanel({ variant: 'compact', character: state.character });
    const menuOpts = { label: '戦闘', items: items(shown), autoFocus: !locked(), disabled: locked(), onDisabledSelect: showReason };
    menu = wide ? commandMenu(menuOpts) : commandButtons(menuOpts);
    drawnKey = `${shown.canHeal}|${shown.canFlee}`;
    const commandWin = gameWindow({ title: 'コマンド', className: 'battle-command' }, menu.el);
    const log = messageLog({ queue, command, rows: wide ? 7 : 5 });
    logEl = log.el;
    logSlot = el('div', { class: 'battle-log-slot' }, log.el);

    const frame = wide
      ? gameFrame({ name: '戦闘', hideNameOnNarrow: true }, enemyWin.el, columns([logSlot], [status.el, commandWin.el], true))
      : gameFrame({ name: '戦闘', hideNameOnNarrow: true }, enemyWin.el, logSlot, status.el, commandWin.el);
    root.replaceChildren(frame.el);
    parts.push(log, status, frame);
    refresh();
    renderError();
  }

  /** ストア・操作の状態が変わったとき：変わった部品だけ書き替える */
  function refresh() {
    const state = store.game.state;
    if (state?.battle) shown = state.battle;
    if (shown && enemyBox && enemyName) {
      enemyBox.dataset.boss = String(shown.isBoss);
      enemyName.textContent = shown.enemyName;
      if (imageKind !== shown.enemyKind) {
        image?.destroy();
        image = enemyImage({ kind: shown.enemyKind, name: shown.enemyName });
        imageKind = shown.enemyKind;
        enemyBox.prepend(image.el);
      }
      enemyBox.closest('[data-testid="enemy-window"]')?.setAttribute('data-boss', String(shown.isBoss));
    }
    if (state) status?.update(state.character);
    if (menu && shown) {
      const key = `${shown.canHeal}|${shown.canFlee}`;
      const wasDisabled = menu.el.getAttribute('aria-disabled') === 'true';
      // 押される行は、ヒール・にげるの可否が変わったときだけ作り直す（TD-0003 §7）
      menu.update({ items: key === drawnKey ? undefined : items(shown), disabled: locked() });
      drawnKey = key;
      // 遭遇の行を出している途中で開いたら、出し終えたところでフォーカスを置く（キーボードで続けられるように）
      if (wasDisabled && !locked() && !root.contains(document.activeElement)) menu.focus();
    }
  }

  function renderError() {
    if (!logSlot || !logEl) return;
    if (command.fatal && !panel) {
      panel = errorPanel({ onRetry: () => void command.retry() });
      logSlot.replaceChildren(panel.el);
    } else if (!command.fatal && panel) {
      panel.destroy();
      panel = null;
      logSlot.replaceChildren(logEl);
    }
  }

  // ダメージ：新しく出た行に「ダメージを うけた」があれば、HP の値を 200ms 点滅
  const offFlash = flashOnMessage(queue, (text) => text.includes('ダメージを うけた'), (on) => status?.setFlash(on));
  const onChange = () => {
    refresh();
    renderError();
  };
  const offStore = store.subscribe(onChange);
  const offCommand = command.subscribe(onChange);
  const offWide = onWideChange(build);
  build();

  return {
    destroy() {
      offFlash();
      offStore();
      offCommand();
      offWide();
      parts.forEach((p) => p.destroy());
      root.replaceChildren();
    },
  };
}
