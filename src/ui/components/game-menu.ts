// GameMenu：宿屋・ダンジョンのメニュー（仕様書 §11.4）。操作の場所に替えて出す
import { soundLabel } from '../../audio/sound-setting';
import { commandMenu, type CommandMenu, type MenuItem } from './command-menu';
import { gameWindow } from './game-window';

export interface GameMenuOptions {
  place: 'inn' | 'dungeon';
  /** 広い画面では「ステータス」を置かない */
  wide: boolean;
  canHeal?: boolean;
  soundOn: boolean;
  disabled?: boolean;
  onClose: () => void;
  onHeal?: () => void;
  onEquip: () => void;
  onItems: () => void;
  onStatus: () => void;
  onToggleSound: () => void;
  onDisabledSelect: (reason: string) => void;
}

export interface GameMenu {
  el: HTMLElement;
  menu: CommandMenu;
  update(next: { canHeal?: boolean; soundOn?: boolean; disabled?: boolean }): void;
  destroy(): void;
}

export function gameMenu(opts: GameMenuOptions): GameMenu {
  let state = { canHeal: !!opts.canHeal, soundOn: opts.soundOn };

  const build = (): MenuItem[] => [
    { label: 'もどる', onSelect: opts.onClose },
    ...(opts.place === 'dungeon'
      ? [{ label: 'ヒール', disabled: !state.canHeal, disabledReason: 'MP が たりない', onSelect: opts.onHeal }]
      : []),
    { label: 'そうび', onSelect: opts.onEquip },
    { label: 'もちもの', onSelect: opts.onItems },
    ...(opts.wide ? [] : [{ label: 'ステータス', onSelect: opts.onStatus }]),
    { label: soundLabel(state.soundOn), onSelect: opts.onToggleSound },
  ];

  const menu = commandMenu({
    label: 'メニュー',
    items: build(),
    initialIndex: 1,
    autoFocus: true,
    trapFocus: true,
    onCancel: opts.onClose,
    onDisabledSelect: opts.onDisabledSelect,
    disabled: opts.disabled,
  });
  const win = gameWindow({ title: 'メニュー' }, menu.el);

  return {
    el: win.el,
    menu,
    update(next) {
      const changed = (next.canHeal !== undefined && next.canHeal !== state.canHeal)
        || (next.soundOn !== undefined && next.soundOn !== state.soundOn);
      state = { canHeal: next.canHeal ?? state.canHeal, soundOn: next.soundOn ?? state.soundOn };
      // 項目が変わったときだけ行を作り直す（押している途中の行を作り直さない。TD-0003 §7）
      menu.update({ items: changed ? build() : undefined, disabled: next.disabled });
    },
    destroy: () => win.destroy(),
  };
}
