// タイトル（#/）。TASK-0001 では仮の画面：飾り線・WIZ・副題・はじめから・版。メニューの動き・インストール・エラーは TASK-0002・0007 で足す
import { versionLabel } from '../../logic/version';
import { el } from '../dom';

export function mountTitle(root: HTMLElement): { destroy(): void } {
  const deco = () => el('div', { class: 'deco', 'aria-hidden': 'true' }, '✦');
  const start = el('button', { class: 'wiz-button', type: 'button' }, 'はじめから');
  const main = el(
    'main',
    { class: 'title-main' },
    deco(),
    el('h1', { class: 'logo' }, 'WIZ'),
    el('p', { class: 'subtitle' }, '～ 死霊術師の迷宮 ～'),
    deco(),
    el('div', { class: 'title-menu' }, start),
    el('p', { class: 'version' }, versionLabel(__APP_VERSION__)),
  );
  root.replaceChildren(main);
  return { destroy: () => root.replaceChildren() };
}
