// タイトル（#/）。今は仮の画面：飾り線・WIZ・副題・はじめから・インストール・版。メニューの動き・エラーは TASK-0007 で足す
import { versionLabel } from '../../logic/version';
import { isInstalled } from '../../platform/install';
import { installDialog } from '../components/install-dialog';
import { el } from '../dom';

export function mountTitle(root: HTMLElement): { destroy(): void } {
  const deco = () => el('div', { class: 'deco', 'aria-hidden': 'true' }, '✦');
  const start = el('button', { class: 'wiz-button', type: 'button' }, 'はじめから');

  // インストールのボタンは、インストール済みなら出さない（版の表記は右に残る。GUI-0002 §1）
  const dialog = isInstalled() ? null : installDialog();
  const install = dialog ? el('button', { class: 'wiz-button', type: 'button' }, 'インストール') : null;
  if (install && dialog) install.addEventListener('click', () => dialog.open(install));

  const main = el(
    'main',
    { class: 'title-main' },
    deco(),
    el('h1', { class: 'logo' }, 'WIZ'),
    el('p', { class: 'subtitle' }, '～ 死霊術師の迷宮 ～'),
    deco(),
    el('div', { class: 'title-menu' }, start),
    el('div', { class: 'title-sub' }, install, el('p', { class: 'version' }, versionLabel(__APP_VERSION__))),
  );
  root.replaceChildren(main);
  return {
    destroy() {
      dialog?.destroy();
      root.replaceChildren();
    },
  };
}
