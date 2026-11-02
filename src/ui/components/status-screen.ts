// ステータス画面（StatusScreenPanel。仕様書 §11.7）と、実績のウィンドウ（recordsWindow。広い画面の宿屋でも使う）
// ステータス画面は狭い画面だけ。2 つのウィンドウを縦に並べ、その下に「もどる」。メッセージ欄は置かない
import type { CharacterView, Records } from '../../api/types';
import { el } from '../dom';
import { commandMenu } from './command-menu';
import { gameFrame } from './game-frame';
import { gameWindow } from './game-window';
import { statusPanel } from './status-panel';

/** 見出し「じっせき」：「このキャラクターの きろく」と 5 つの数 */
export function recordsWindow(records: Records): { el: HTMLElement; update(r: Records): void } {
  const list = el('dl', { class: 'wiz-records' });
  const draw = (r: Records) => {
    const rows: [string, string][] = [
      ['そうせんとう', `${r.battles} 回`],
      ['とうばつ', `${r.kills} 体`],
      ['しぼう', `${r.deaths} 回`],
      ['しゅうかい', `${r.laps} 周目`],
      ['ボスとうばつ', `${r.bossKills} 回`],
    ];
    list.replaceChildren(...rows.flatMap(([name, value]) => [el('dt', {}, name), el('dd', {}, value)]));
  };
  draw(records);
  const win = gameWindow({ title: 'じっせき', className: 'wiz-records-window', testId: 'records-window' },
    el('p', { class: 'wiz-records-lead' }, 'このキャラクターの きろく'), list);
  return { el: win.el, update: draw };
}

/** ステータス画面（画面名「ステータス」）。もどる・Esc で onBack */
export function statusScreen(opts: { character: CharacterView; records: Records; onBack: () => void }): { el: HTMLElement; destroy(): void } {
  const status = statusPanel({ variant: 'full', character: opts.character });
  const records = recordsWindow(opts.records);
  const menu = commandMenu({
    label: 'ステータス',
    items: [{ label: 'もどる', onSelect: opts.onBack }],
    autoFocus: true,
    trapFocus: true,
    onCancel: opts.onBack,
  });
  const frame = gameFrame({ name: 'ステータス' }, status.el, records.el, gameWindow({}, menu.el).el);
  return { el: frame.el, destroy: () => frame.destroy() };
}
