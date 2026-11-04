// EquipmentPanel：装備画面（画面名「そうび」。仕様書 §8.7「装備画面」、§11.7、GUI-0006 §1、TD-0004 §7）
// 左（上）のウィンドウ：枠の一覧（もどる・ぶき・よろい・たて・アクセ）／候補の一覧（もどる・はずす・強い順の候補）
// 右（下）のウィンドウ「のうりょく」：内訳。候補にカーソルを合わせると、変わる能力だけ「↑」「↓」
// メッセージ欄は置かない。結果の文はキューに入る（command が入れる）。続けられないエラーは一番下に ErrorPanel
import type { CharacterView, ItemView, Slot, Stats } from '../../api/types';
import { SLOT_NAMES, SLOT_ORDER } from '../../logic/item-text';
import { ORDER_LABELS, sortItems } from '../../logic/sort-items';
import { abilityRows } from '../../logic/stat-diff';
import { el } from '../dom';
import type { ScreenContext } from '../router';
import { commandMenu, type CommandMenu, type MenuItem } from './command-menu';
import { errorPanel } from './error-panel';
import { columns, gameFrame } from './game-frame';
import { gameWindow } from './game-window';
import { itemLabel } from './item-label';
import { fitItemList } from './item-list';

export interface PanelDeps extends Pick<ScreenContext, 'store' | 'api' | 'command'> {
  /** もどる（枠の一覧で もどる・Esc） */
  onClose: () => void;
}

type Preview = { current: ItemView | null; candidate: ItemView | null } | null;

const effectiveOf = (c: CharacterView): Stats => ({ attack: c.attack, defense: c.defense, speed: c.speed, maxHp: c.maxHp, maxMp: c.maxMp });

export function equipmentPanel(deps: PanelDeps): { el: HTMLElement; destroy(): void } {
  const { store, api, command } = deps;

  // 画面に固有の状態
  let mode: 'slots' | 'candidates' = 'slots';
  let slot: Slot = 'weapon';
  /** 枠の一覧のカーソル（1 = ぶき） */
  let slotCursor = 1;
  let preview: Preview = null;

  let menu: CommandMenu | null = null;
  let panel: { el: HTMLElement; destroy(): void } | null = null;
  const leftSlot = el('div', { class: 'equip-left' });
  const abilities = el('div', { class: 'wiz-abilities' });
  const abilityWindow = gameWindow({ title: 'のうりょく', testId: 'ability-window' }, abilities);
  const errorSlot = el('div', { class: 'item-screen-error' });
  const frame = gameFrame({ name: 'そうび' }, columns([leftSlot], [abilityWindow.el]), errorSlot);

  const locked = () => command.locked || command.fatal !== null;

  function drawAbilities() {
    const c = store.game.state?.character;
    if (!c) return;
    const rows = abilityRows({ effective: effectiveOf(c), base: c.base, bonus: c.bonus }, preview);
    abilities.replaceChildren(...rows.map((r) => el('div', {
      class: 'wiz-ability',
      'data-stat': r.stat,
      'data-change': r.change,
      'data-testid': `ability-${r.stat}`,
    },
    el('span', { class: 'wiz-ability-name' }, r.name),
    el('span', { class: 'wiz-ability-value', 'aria-hidden': r.change ? 'true' : null }, r.text),
    r.change ? el('span', { class: 'visually-hidden' }, r.spoken) : null)));
  }

  /** 付け替え・はずす。成功したら枠の一覧に戻る（カーソルはその部位） */
  function act(op: () => ReturnType<typeof api.equip>) {
    void command.run(op).then((result) => {
      if (!result) return;
      mode = 'slots';
      preview = null;
      drawLeft();
    });
  }

  function slotRow(s: Slot, item: ItemView | null): Node {
    return el('span', { class: 'wiz-slot-row' },
      el('span', { class: 'wiz-slot-name' }, SLOT_NAMES[s]),
      item ? itemLabel({ item }) : el('span', { class: 'wiz-item-none' }, '―― なし ――'));
  }

  function drawLeft() {
    const state = store.game.state;
    if (!state) return;
    const inv = state.inventory;
    menu?.destroy();
    if (mode === 'slots') {
      preview = null;
      const items: MenuItem[] = [
        { label: 'もどる', onSelect: deps.onClose },
        ...SLOT_ORDER.map((s, i) => ({
          label: slotRow(s, inv.equipped[s]),
          onSelect: () => {
            slot = s;
            slotCursor = i + 1;
            mode = 'candidates';
            drawLeft();
          },
        })),
      ];
      menu = commandMenu({
        label: 'そうび', items, initialIndex: slotCursor, autoFocus: !locked(), trapFocus: true, onCancel: deps.onClose, disabled: locked(),
        onCursorChange: (i) => { slotCursor = i; },
      });
      leftSlot.replaceChildren(gameWindow({ title: 'そうび', testId: 'equipment-window' }, menu.el).el);
    } else {
      const current = inv.equipped[slot];
      const candidates = sortItems(inv.items.filter((i) => i.slot === slot), 'strong');
      const offset = current ? 2 : 1;
      const previewAt = (i: number): Preview => {
        if (i === 0) return null;
        if (current && i === 1) return { current, candidate: null };
        return { current, candidate: candidates[i - offset] ?? null };
      };
      const back = () => {
        mode = 'slots';
        drawLeft();
      };
      const items: MenuItem[] = [
        { label: 'もどる', onSelect: back },
        ...(current ? [{ label: 'はずす', onSelect: () => act(() => api.unequip({ slot })) }] : []),
        ...candidates.map((item) => ({ label: itemLabel({ item }), onSelect: () => act(() => api.equip({ itemId: item.id })) })),
      ];
      const initial = items.length > 1 ? 1 : 0;
      preview = previewAt(initial);
      menu = commandMenu({
        label: SLOT_NAMES[slot], items, initialIndex: initial, autoFocus: !locked(), trapFocus: true, onCancel: back, disabled: locked(),
        maxHeight: '416px',
        onCursorChange: (i) => {
          preview = previewAt(i);
          drawAbilities();
        },
      });
      leftSlot.replaceChildren(gameWindow({ title: SLOT_NAMES[slot], testId: 'equipment-window' },
        el('p', { class: 'wiz-order-label' }, ORDER_LABELS.strong),
        candidates.length === 0 ? el('p', { class: 'wiz-item-empty' }, 'もっていない') : null,
        menu.el).el);
    }
    drawAbilities();
    scheduleFit();
  }

  // 候補の一覧は、狭い画面ではページが縦にはみ出さない高さにする（もちもの画面の一覧と同じ）
  let fitFrame = 0;
  function scheduleFit() {
    cancelAnimationFrame(fitFrame);
    fitFrame = requestAnimationFrame(() => {
      if (mode === 'candidates' && menu) fitItemList(menu.el);
    });
  }
  window.addEventListener('resize', scheduleFit);

  function renderError() {
    if (command.fatal && !panel) {
      panel = errorPanel({ onRetry: () => void command.retry() });
      errorSlot.replaceChildren(panel.el);
    } else if (!command.fatal && panel) {
      panel.destroy();
      panel = null;
    }
  }

  let lastState = store.game.state;
  const offStore = store.subscribe(() => {
    if (store.game.state === lastState) return;
    lastState = store.game.state;
    drawLeft();
  });
  const offCommand = command.subscribe(() => {
    menu?.update({ disabled: locked() });
    renderError();
  });
  drawLeft();
  renderError();

  return {
    el: frame.el,
    destroy() {
      cancelAnimationFrame(fitFrame);
      window.removeEventListener('resize', scheduleFit);
      offStore();
      offCommand();
      menu?.destroy();
      frame.destroy();
    },
  };
}
