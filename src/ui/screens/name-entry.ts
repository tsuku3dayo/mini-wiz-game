// 名前入力（#/new。仕様書 §11.5、GUI-0002 §2、TD-0004 §2）
// 入力欄と「決定」を上に置き、ソフトウェアキーボードで隠れないようにする
import type { GameError } from '../../api/types';
import { checkName, NAME_MAX } from '../../logic/name';
import { commandMenu } from '../components/command-menu';
import { errorPanel } from '../components/error-panel';
import { gameFrame } from '../components/game-frame';
import { gameWindow } from '../components/game-window';
import { messageLog } from '../components/message-log';
import { textInput } from '../components/text-input';
import { el } from '../dom';
import type { ScreenContext } from '../router';

export function mountNameEntry(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { api, command, queue, router } = ctx;
  /** ゲーム API が返した 400 の文（入力を変えると消える） */
  let apiError: string | null = null;

  const back = () => router.navigate('title');
  const showReason = (reason: string) => queue.enqueue([{ text: reason, tone: 'normal' }]);

  function submit() {
    const check = checkName(input.value);
    if (!check.canSubmit || command.locked) {
      if (!command.locked && check.reason) showReason(check.reason);
      return;
    }
    // 渡すのは入力したままの値（仕様書 §11.5）
    const name = input.value;
    void command.run(() => api.startGame({ name }), {
      onValidationError: (e: GameError) => {
        apiError = e.details?.[0]?.message ?? e.message;
        render();
        return true;
      },
    });
  }

  const input = textInput({
    label: 'なまえ',
    maxLength: NAME_MAX,
    autoFocus: true,
    onInput: () => {
      apiError = null;
      render();
    },
    onEnter: submit,
    onEscape: back,
  });

  const menu = commandMenu({
    label: 'なまえ入力',
    items: [{ label: 'もどる' }, { label: '決定' }],
    initialIndex: 1,
    // 無効の「決定」を選んだら、理由をメッセージ欄に通常の色で出す
    onDisabledSelect: showReason,
  });

  const win = gameWindow({ className: 'name-window' }, el('p', { class: 'name-lead' }, 'なまえを いれてください'), input.el, menu.el);
  const log = messageLog({ queue, command, rows: 5 });
  let panel: { el: HTMLElement; destroy(): void } | null = null;
  let drawnKey = '';
  const frame = gameFrame({ name: 'なまえ' }, win.el, log.el);
  root.replaceChildren(frame.el);

  function render() {
    const check = checkName(input.value);
    const locked = command.locked;
    input.setCount(check.length);
    input.setError(apiError ?? check.error);
    input.setDisabled(command.isPending);
    // 「決定」の有効・無効か理由が変わったときだけ項目を作り直す（押している途中の行を作り直さない）
    const key = `${check.canSubmit && !locked}|${check.reason}`;
    menu.update({
      items: key === drawnKey ? undefined : [
        { label: 'もどる', onSelect: back },
        { label: '決定', disabled: !check.canSubmit || locked, disabledReason: check.reason ?? undefined, onSelect: submit },
      ],
      disabled: locked || command.fatal !== null,
    });
    drawnKey = key;

    // 続けられないエラー：メッセージ欄の場所に ErrorPanel（「再試行」は名前の送信をやり直す）
    if (command.fatal && !panel) {
      panel = errorPanel({ onRetry: () => void command.retry(true) });
      frame.setChildren(win.el, panel.el);
    } else if (!command.fatal && panel) {
      panel.destroy();
      panel = null;
      frame.setChildren(win.el, log.el);
    }
  }

  const offCommand = command.subscribe(render);
  render();

  return {
    destroy() {
      offCommand();
      log.destroy();
      panel?.destroy();
      frame.destroy();
      root.replaceChildren();
    },
  };
}
