// MovePad：移動ボタン（仕様書 §11.5「移動ボタン」）。左右は 2 段ぶんの高さ
import type { MoveAction } from '../../api/types';
import { el } from '../dom';

const BUTTONS: { action: MoveAction; text: string; label: string; area: string }[] = [
  { action: 'turnLeft', text: '← 左', label: '左を向く', area: 'left' },
  { action: 'forward', text: '↑ 前進', label: '前進', area: 'up' },
  { action: 'turnRight', text: '右 →', label: '右を向く', area: 'right' },
  { action: 'backward', text: '↓ 後退', label: '後退', area: 'down' },
];

export function movePad(onMove: (action: MoveAction) => void): { el: HTMLElement; setDisabled(d: boolean): void } {
  const buttons = BUTTONS.map((b) => {
    const button = el('button', { class: `wiz-button wiz-move ${b.area}`, type: 'button', 'aria-label': b.label }, b.text);
    button.addEventListener('click', () => onMove(b.action));
    return button;
  });
  const pad = el('div', { class: 'wiz-move-pad', 'data-testid': 'move-pad' }, ...buttons);
  return {
    el: pad,
    setDisabled(d) {
      // 押される要素は作り直さず、属性だけ替える（SDD-PROCESS §8 07）
      for (const b of buttons) b.disabled = d;
    },
  };
}
