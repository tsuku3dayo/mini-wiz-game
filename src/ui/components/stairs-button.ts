// StairsButton：正面の扉・宝箱、足元に応じた階段・帰還のボタン（仕様書 §11.5「階段・帰還ボタン」）。ないときも場所を空けておく
import type { AheadView, StairsView } from '../../api/types';
import { el } from '../dom';

/** ボタンが表すもの：正面の扉・宝箱（v1.25）か、足元の階段・入口 */
export type StairsTarget = Exclude<AheadView, null> | Exclude<StairsView, null>;

const TEXT: Readonly<Record<StairsTarget, string>> = { door: '扉をあける', chest: '宝箱をあける', down: '↓ おりる', up: '↑ のぼる', entrance: '宿屋へ戻る' };

export function stairsButton(onPress: (target: StairsTarget) => void): {
  el: HTMLElement;
  update(ahead: AheadView, underfoot: StairsView, disabled: boolean): void;
} {
  const button = el('button', { class: 'wiz-button wiz-stairs', type: 'button', hidden: true });
  const slot = el('div', { class: 'wiz-stairs-slot' }, button);
  let current: StairsTarget | null = null;
  button.addEventListener('click', () => {
    if (current) onPress(current);
  });
  return {
    el: slot,
    update(ahead, underfoot, disabled) {
      // 正面が扉・宝箱なら、足元より先に出す（v1.25）
      current = ahead ?? underfoot;
      button.hidden = current === null;
      if (current && button.textContent !== TEXT[current]) button.textContent = TEXT[current];
      button.disabled = disabled;
    },
  };
}
