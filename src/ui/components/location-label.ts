// LocationLabel：階と向き（例「3F 北」。間は全角スペース。仕様書 §4.8、§11.5）。座標は出さない
import type { Facing } from '../../api/types';
import { locationText } from '../../logic/describe-view';
import { el } from '../dom';

export function locationLabel(): { el: HTMLElement; update(floor: number, facing: Facing): void } {
  const h2 = el('h2', { class: 'wiz-location', 'data-testid': 'location-label' });
  return {
    el: h2,
    update(floor, facing) {
      const text = locationText(floor, facing);
      if (h2.textContent !== text) h2.textContent = text;
    },
  };
}
