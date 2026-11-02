// StairsButton：足元に応じた階段・帰還のボタン（仕様書 §11.5「階段・帰還ボタン」）。ないときも場所を空けておく
import type { StairsView } from '../../api/types';
import { el } from '../dom';

const TEXT: Readonly<Record<Exclude<StairsView, null>, string>> = { down: '↓ おりる', up: '↑ のぼる', entrance: '宿屋へ戻る' };

export function stairsButton(onPress: (underfoot: Exclude<StairsView, null>) => void): {
  el: HTMLElement;
  update(underfoot: StairsView, disabled: boolean): void;
} {
  const button = el('button', { class: 'wiz-button wiz-stairs', type: 'button', hidden: true });
  const slot = el('div', { class: 'wiz-stairs-slot' }, button);
  let current: StairsView = null;
  button.addEventListener('click', () => {
    if (current) onPress(current);
  });
  return {
    el: slot,
    update(underfoot, disabled) {
      current = underfoot;
      button.hidden = underfoot === null;
      if (underfoot && button.textContent !== TEXT[underfoot]) button.textContent = TEXT[underfoot];
      button.disabled = disabled;
    },
  };
}
