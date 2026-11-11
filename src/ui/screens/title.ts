// タイトル（#/。仕様書 §11.5、GUI-0002 §1、TD-0004 §1）。メッセージ欄は作らない。v1.3 から見出しはタイトル画像
// 「おと」は、その場で項目の文字だけを変える（メッセージは出さない。オンにした瞬間に確認音）
import { soundLabel } from '../../audio/sound-setting';
import { TITLE_ALT, TITLE_IMAGE_HEIGHT, TITLE_IMAGE_URL, TITLE_IMAGE_WIDTH, TITLE_NAME, TITLE_SUBTITLE } from '../../logic/title-image';
import { versionLabel } from '../../logic/version';
import { isInstalled } from '../../platform/install';
import { hasAnySave, latestSlot } from '../../logic/save-slots';
import { commandMenu, type CommandMenu, type MenuItem } from '../components/command-menu';
import { saveSlotMenu, type SaveSlotMenu } from '../components/save-slot-menu';
import { errorPanel } from '../components/error-panel';
import { installDialog } from '../components/install-dialog';
import { el } from '../dom';
import type { ScreenContext } from '../router';

export function mountTitle(root: HTMLElement, ctx: ScreenContext): { destroy(): void } {
  const { store, api, command, router, sound } = ctx;

  // タイトル画像（仕様書 §11.5・§13.6）。読めないときは画像を消し、文字の名前と副題に替える（同じ画面では読み直さない）
  const logo = el('h1', { class: 'title-logo' });
  const image = el('img', {
    class: 'title-image',
    src: TITLE_IMAGE_URL,
    alt: TITLE_ALT,
    width: TITLE_IMAGE_WIDTH,
    height: TITLE_IMAGE_HEIGHT,
  });
  image.addEventListener('error', () => {
    logo.className = 'logo';
    logo.replaceChildren(TITLE_NAME);
    logo.after(el('p', { class: 'subtitle' }, TITLE_SUBTITLE));
  }, { once: true });
  logo.append(image);

  // インストールのボタンは、インストール済みなら出さない（版の表記は右に残る。GUI-0002 §1）
  const dialog = isInstalled() ? null : installDialog();
  const install = dialog ? el('button', { class: 'wiz-button', type: 'button' }, 'インストール') : null;
  if (install && dialog) install.addEventListener('click', () => dialog.open(install));

  const menuBox = el('div', { class: 'title-menu' });
  const errorBox = el('div', { class: 'title-error' });
  const main = el(
    'main',
    { class: 'title-main' },
    logo,
    menuBox,
    errorBox,
    el('div', { class: 'title-sub' }, install, el('p', { class: 'version' }, versionLabel(__APP_VERSION__))),
  );
  root.replaceChildren(main);

  let menu: CommandMenu | null = null;
  /** つづきから のスロットの一覧（開いているときだけ。v1.14） */
  let slotMenu: SaveSlotMenu | null = null;
  /** 中央の箱に出すもの：タイトルのメニュー／つづきから のスロットの一覧（画面ローカル。再読み込みで閉じる） */
  let mode: 'menu' | 'slots' = 'menu';
  /** タイトルのメニューを作り直すときのカーソル（null なら初め） */
  let cursor: number | null = null;
  let panel: { destroy(): void } | null = null;
  /** 作ったときのセーブの一覧（変わったらメニューを作り直す。仕様書 §11.5） */
  let drawnSave: string | undefined = undefined;
  const saveKey = () => JSON.stringify(store.save.slots);
  const INDEX_CONTINUE = 1;

  const hasError = () => store.game.status === 'error' || store.save.status === 'error' || command.fatal !== null;

  function items(): MenuItem[] {
    const any = hasAnySave(store.save.slots);
    return [
      { label: 'はじめから', onSelect: () => router.navigate('new') },
      // どのスロットにもセーブがないときは無効。理由を渡さないので、選んでも何も出さない（メッセージ欄がない。仕様書 §11.5）。
      // あれば、中央の箱を つづきから のスロットの一覧に替える（v1.14。右の「{名前} Lv{n}」は出さない）
      { label: 'つづきから', disabled: !any, onSelect: () => setMode('slots') },
      { label: soundLabel(sound.on), onSelect: () => { sound.toggle(); menu?.update({ items: items() }); } },
      // v1.12：「おと」の下。初めのカーソルは変えない（TD-0004 §1）
      { label: 'クレジット', onSelect: () => router.navigate('credits') },
    ];
  }

  function setMode(next: 'menu' | 'slots', nextCursor: number | null = cursor) {
    mode = next;
    cursor = nextCursor;
    menu?.destroy();
    menu = null;
    slotMenu?.destroy();
    slotMenu = null;
    render();
  }

  function render() {
    const error = hasError();
    const disabled = error || command.locked;
    // 読み込み中（エラーでない）はメニューを描かない
    if (store.save.status === 'loading' && !error) {
      menu?.destroy();
      menu = null;
      slotMenu?.destroy();
      slotMenu = null;
      drawnSave = undefined;
    } else if (mode === 'slots' && hasAnySave(store.save.slots) && !error) {
      if (!slotMenu || drawnSave !== saveKey()) {
        slotMenu?.destroy();
        drawnSave = saveKey();
        const slots = store.save.slots;
        slotMenu = saveSlotMenu({
          title: 'つづきから',
          slots,
          mode: 'load',
          initialSlot: latestSlot(slots),
          onPick: (slot) => void command.run(() => api.load({ slot }), { refetchSave: true }),
          // もどる・Esc：タイトルのメニューに戻し、カーソルを「つづきから」に
          onBack: () => setMode('menu', INDEX_CONTINUE),
          disabled,
        });
        menuBox.replaceChildren(slotMenu.el);
      } else {
        slotMenu.setDisabled(disabled);
      }
    } else {
      if (mode === 'slots') {
        // セーブがなくなった・続けられないエラーが出たら、タイトルのメニューに戻す（カーソルは「つづきから」）。
        // エラーの枠は一覧の下でなくメニューの下に出す（一覧の下では縦にはみ出すため。仕様書 v1.15 §11.5）。再試行で直っても一覧は開き直さない
        mode = 'menu';
        cursor = INDEX_CONTINUE;
        slotMenu?.destroy();
        slotMenu = null;
        menu?.destroy();
        menu = null;
      }
      if (!menu || drawnSave !== saveKey()) {
        menu?.destroy();
        const changed = drawnSave !== undefined && drawnSave !== saveKey();
        drawnSave = saveKey();
        menu = commandMenu({
          label: 'タイトル',
          items: items(),
          initialIndex: cursor !== null && !changed ? cursor : (hasAnySave(store.save.slots) ? INDEX_CONTINUE : 0),
          autoFocus: !error,
          disabled,
        });
        menuBox.replaceChildren(menu.el);
      } else {
        menu.update({ disabled });
      }
    }

    // 続けられないエラー：メニューの下に ErrorPanel
    if (hasError() && !panel) {
      const p = errorPanel({ onRetry: () => void command.retry() });
      errorBox.replaceChildren(p.el);
      panel = p;
    } else if (!hasError() && panel) {
      panel.destroy();
      panel = null;
      (menu ?? slotMenu?.menu)?.focus();
    }
  }

  const offStore = store.subscribe(render);
  const offCommand = command.subscribe(render);
  render();

  return {
    destroy() {
      offStore();
      offCommand();
      menu?.destroy();
      slotMenu?.destroy();
      panel?.destroy();
      dialog?.destroy();
      root.replaceChildren();
    },
  };
}
