// FirstPersonView：疑似3D（SVG、viewBox 320 × 240。仕様書 §11.5「疑似3D 一人称ビュー」）
import type { DungeonView } from '../../api/types';
import { describeView } from '../../logic/describe-view';
import { VIEW_H, VIEW_W, viewToSegments } from '../../logic/view-to-segments';
import { el, svgEl } from '../dom';

export interface FirstPersonView {
  el: HTMLElement;
  update(view: DungeonView): void;
  /** 外の箱の幅（px）。高さは 4:3 */
  setWidth(px: number): void;
  readonly width: number;
  readonly height: number;
  /** 段 0 の正面の壁を点滅させる（壁にぶつかったとき） */
  setFlash(on: boolean): void;
}

export function firstPersonView(): FirstPersonView {
  const svg = svgEl('svg', {
    class: 'wiz-fpv-svg',
    viewBox: `0 0 ${VIEW_W} ${VIEW_H}`,
    role: 'img',
    'data-testid': 'first-person-view',
  });
  const box = el('div', { class: 'wiz-fpv' });
  box.append(svg);
  let width = VIEW_W;
  let flash = false;

  function draw(view: DungeonView) {
    const { lines, labels } = viewToSegments(view.depths);
    const nodes = lines.map((l) => svgEl('line', {
      x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2,
      class: flash && l.kind === 'front' && l.depth === 0 ? 'wiz-fpv-line flash' : 'wiz-fpv-line',
      'data-kind': l.kind,
      'data-depth': l.depth,
    }));
    const texts = labels.map((t) => svgEl('text', { x: t.x, y: t.y, class: 'wiz-fpv-label' }, t.text));
    svg.replaceChildren(...nodes, ...texts);
    svg.setAttribute('aria-label', describeView(view));
  }

  return {
    el: box,
    update: draw,
    setWidth(px) {
      width = Math.round(px);
      box.style.width = `${width}px`;
    },
    get width() { return width; },
    get height() { return Math.round((width * 3) / 4); },
    setFlash(on) {
      flash = on;
      for (const line of svg.querySelectorAll<SVGLineElement>('line[data-kind="front"][data-depth="0"]')) {
        line.classList.toggle('flash', on);
      }
    },
  };
}
