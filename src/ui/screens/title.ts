// タイトル（#/。仕様書 §11.5、GUI-0002 §1、TD-0004 §1）。メッセージ欄は作らない
// 「おと」は、その場で項目の文字だけを変える（メッセージは出さない。オンにした瞬間に確認音）
import { soundLabel } from '../../audio/sound-setting';
import { versionLabel } from '../../logic/version';
import { isInstalled } from '../../platform/install';
import { commandMenu, type CommandMenu, type MenuItem } from '../components/command-menu';
import { errorPanel } from '../components/error-panel';
import { installDialog } from '../components/install-dialog';
import { el } from '../dom';
import type { ScreenContext } from '../router';

export function mountTitle(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { store, api, command, router, sound } = ctx;
  const deco = () => el('div', { class: 'deco', 'aria-hidden': 'true' }, '✦');

  // インストールのボタンは、インストール済みなら出さない（版の表記は右に残る。GUI-0002 §1）
  const dialog = isInstalled() ? null : installDialog();
  const install = dialog ? el('button', { class: 'wiz-button', type: 'button' }, 'インストール') : null;
  if (install && dialog) install.addEventListener('click', () => dialog.open(install));

  const menuBox = el('div', { class: 'title-menu' });
  const errorBox = el('div', { class: 'title-error' });
  const main = el(
    'main',
    { class: 'title-main' },
    deco(),
    el('h1', { class: 'logo' }, 'WIZ'),
    el('p', { class: 'subtitle' }, '～ 死霊術師の迷宮 ～'),
    deco(),
    menuBox,
    errorBox,
    el('div', { class: 'title-sub' }, install, el('p', { class: 'version' }, versionLabel(__APP_VERSION__))),
  );
  root.replaceChildren(main);

  let menu: CommandMenu | null = null;
  let panel: { destroy(): void } | null = null;
  /** 作ったときのセーブの中身（変わったらメニューを作り直す。仕様書 §11.5） */
  let drawnSave: string | undefined = undefined;
  const saveKey = () => JSON.stringify(store.save.summary);

  const hasError = () => store.game.status === 'error' || store.save.status === 'error' || command.fatal !== null;

  function continueLabel(): string | Node {
    const s = store.save.summary;
    if (!s) return 'つづきから';
    return el('span', {}, 'つづきから', el('span', { class: 'title-save' }, `${s.name} Lv${s.level}`));
  }

  function items(): MenuItem[] {
    const s = store.save.summary;
    return [
      { label: 'はじめから', onSelect: () => router.navigate('new') },
      // セーブがないときは無効。理由を渡さないので、選んでも何も出さない（メッセージ欄がない。仕様書 §11.5）
      { label: continueLabel(), disabled: !s, onSelect: () => void command.run(() => api.load(), { refetchSave: true }) },
      { label: soundLabel(sound.on), onSelect: () => { sound.toggle(); menu?.update({ items: items() }); } },
    ];
  }

  function render() {
    // 読み込み中（エラーでない）はメニューを描かない
    if (store.save.status === 'loading' && !hasError()) {
      menu?.destroy();
      menu = null;
      drawnSave = undefined;
    } else {
      const error = hasError();
      const disabled = error || command.locked;
      if (!menu || drawnSave !== saveKey()) {
        menu?.destroy();
        drawnSave = saveKey();
        menu = commandMenu({
          label: 'タイトル',
          items: items(),
          initialIndex: store.save.summary ? 1 : 0,
          autoFocus: !error,
          disabled,
        });
        menuBox.replaceChildren(menu.el);
      } else {
        menu.update({ disabled });
      }
    }

    // 続けられないエラー：メニューの下に ErrorPanel
    if (hasError() && !panel) {
      const p = errorPanel({ onRetry: () => void command.retry() });
      errorBox.replaceChildren(p.el);
      panel = p;
    } else if (!hasError() && panel) {
      panel.destroy();
      panel = null;
      menu?.focus();
    }
  }

  const offStore = store.subscribe(render);
  const offCommand = command.subscribe(render);
  render();

  return {
    destroy() {
      offStore();
      offCommand();
      menu?.destroy();
      panel?.destroy();
      dialog?.destroy();
      root.replaceChildren();
    },
  };
}
