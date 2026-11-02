// StatusPanel：ステータス表示（仕様書 §11.6）。full（宿屋）と compact（ダンジョン・戦闘）
import type { CharacterView } from '../../api/types';
import { isHpWarning } from '../../logic/low-hp';
import { el } from '../dom';
import { gameWindow } from './game-window';

export interface StatusPanelOptions {
  variant: 'full' | 'compact';
  character: CharacterView;
  /** full の見出し：狭い画面は名前、広い画面は「ステータス」と「なまえ」の行 */
  wide?: boolean;
}

export interface StatusPanel {
  el: HTMLElement;
  update(character: CharacterView): void;
  /** HP の値を点滅させる（ダメージを うけたとき。200ms は呼ぶ側が決める） */
  setFlash(on: boolean): void;
  destroy(): void;
}

const pad3 = (n: number) => String(n).padStart(3, ' ');
const plus = (n: number) => (n > 0 ? ` (+${n})` : '');
const lowHp = (c: CharacterView) => isHpWarning(c.hp, c.maxHp);

function row(name: string, value: string, attrs: Record<string, string | null> = {}): Node[] {
  return [el('dt', {}, name), el('dd', { ...attrs }, value)];
}

function fullBody(c: CharacterView, wide: boolean): HTMLElement {
  const warn = lowHp(c);
  return el('dl', { class: 'wiz-status-full' },
    ...(wide ? [el('dt', {}, 'なまえ'), el('dd', { class: 'wiz-status-name' }, c.name)] : []),
    ...row('Lv', pad3(c.level)),
    ...row('EXP', `${pad3(c.exp)}（つぎまで ${c.expToNext}）`),
    ...row('HP', `${pad3(c.hp)}/${pad3(c.maxHp)}${warn ? '！' : ''}${plus(c.bonus.maxHp)}`, { 'data-warning': warn ? 'true' : null, 'data-testid': 'status-hp' }),
    ...row('MP', `${pad3(c.mp)}/${pad3(c.maxMp)}${plus(c.bonus.maxMp)}`),
    ...row('こうげき', `${pad3(c.attack)}${plus(c.bonus.attack)}`),
    ...row('ぼうぎょ', `${pad3(c.defense)}${plus(c.bonus.defense)}`),
    ...row('すばやさ', `${pad3(c.speed)}${plus(c.bonus.speed)}`),
  );
}

function compactBody(c: CharacterView): HTMLElement {
  const warn = lowHp(c);
  return el('p', { class: 'wiz-status-compact' },
    el('span', { class: 'wiz-status-name' }, c.name),
    el('span', {}, `Lv${pad3(c.level)}`),
    el('span', { 'data-warning': warn ? 'true' : null, 'data-testid': 'status-hp' }, `HP${pad3(c.hp)}/${pad3(c.maxHp)}${warn ? '！' : ''}`),
    el('span', {}, `MP${pad3(c.mp)}/${pad3(c.maxMp)}`),
  );
}

export function statusPanel(opts: StatusPanelOptions): StatusPanel {
  const wide = !!opts.wide;
  const title = opts.variant === 'compact' || wide ? 'ステータス' : opts.character.name;
  const win = gameWindow({ title, compact: opts.variant === 'compact', className: 'wiz-status', testId: 'status-panel' });
  let flash = false;
  const paintFlash = () => win.el.querySelector('[data-testid="status-hp"]')?.classList.toggle('flash', flash);
  const draw = (c: CharacterView) => {
    win.setChildren(opts.variant === 'full' ? fullBody(c, wide) : compactBody(c));
    // 書き直しても、点滅の途中なら点滅を続ける
    paintFlash();
  };
  draw(opts.character);
  return {
    el: win.el,
    update: draw,
    setFlash(on) {
      flash = on;
      paintFlash();
    },
    destroy: () => win.destroy(),
  };
}
