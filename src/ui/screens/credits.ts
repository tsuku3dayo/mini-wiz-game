// クレジット（#/credits。仕様書 §11.5、GUI-0002 §3、TD-0004 §10）。メッセージ欄は作らない。音は鳴らさない
// 「← もどる」・Esc でタイトルへ（履歴に積む。仕様書 §27.4）
import { CREDITS } from '../../logic/credits';
import { el } from '../dom';
import type { ScreenContext } from '../router';

export function mountCredits(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { router } = ctx;
  const back = () => router.navigate('title');

  const button = el('button', { class: 'wiz-button', type: 'button' }, el('span', { 'aria-hidden': 'true' }, '← '), 'もどる');
  button.addEventListener('click', back);

  const list = el(
    'dl',
    { class: 'credits-list' },
    ...CREDITS.map((c) => el('div', { class: 'credits-item' }, el('dt', {}, c.role), el('dd', {}, c.name))),
  );
  const main = el(
    'main',
    { class: 'credits-main' },
    el('div', { class: 'credits-head' }, el('div', { class: 'credits-back' }, button), el('h1', { class: 'credits-title' }, 'クレジット'), el('div')),
    list,
  );
  root.replaceChildren(main);
  button.focus();

  // Esc は画面のどこにフォーカスがあっても戻る（IME の変換中は除く）
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.isComposing) return;
    e.preventDefault();
    back();
  };
  document.addEventListener('keydown', onKey);

  return {
    destroy() {
      document.removeEventListener('keydown', onKey);
      root.replaceChildren();
    },
  };
}
