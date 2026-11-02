// AutoMap：自動地図（SVG、1 マス 16。仕様書 §11.5「2D 自動地図」）。見出しのない GameWindow（余白 8px）で囲む
import type { AutoMapView, Facing } from '../../api/types';
import { describeMap, mapToShapes } from '../../logic/map-to-shapes';
import { svgEl } from '../dom';
import { gameWindow } from './game-window';

export interface AutoMap {
  el: HTMLElement;
  update(map: AutoMapView, facing: Facing, floor: number): void;
  /** 表示の一辺（px、正方形）。狭い画面では呼ばない（viewBox と同じ 160） */
  setSize(px: number): void;
  readonly size: number;
}

export function autoMap(): AutoMap {
  const svg = svgEl('svg', { class: 'wiz-map-svg', viewBox: '0 0 160 160', width: 160, height: 160, role: 'img', 'data-testid': 'auto-map' });
  const win = gameWindow({ className: 'wiz-map-window' }, svg);
  let size = 160;

  return {
    el: win.el,
    update(map, facing, floor) {
      const s = mapToShapes(map, facing);
      svg.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`);
      svg.setAttribute('aria-label', describeMap(map, floor));
      svg.replaceChildren(
        svgEl('rect', { class: 'wiz-map-frame', x: s.frame.x, y: s.frame.y, width: s.frame.width, height: s.frame.height }),
        ...s.cells.map((c) => svgEl('rect', { class: 'wiz-map-cell', x: c.x, y: c.y, width: c.size, height: c.size })),
        ...s.walls.map((w) => svgEl('line', { class: 'wiz-map-wall', x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })),
        ...s.symbols.map((m) => svgEl('text', { class: `wiz-map-symbol ${m.kind}`, x: m.x, y: m.y }, m.text)),
      );
    },
    setSize(px) {
      size = Math.round(px);
      svg.setAttribute('width', String(size));
      svg.setAttribute('height', String(size));
    },
    get size() { return size; },
  };
}
