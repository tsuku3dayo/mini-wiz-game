// インストールの案内のダイアログ（仕様書 §11.12・§30.2、GUI-0007 §3）
// <dialog> のモーダル。今の端末の手順だけ最初から開く。「とじる」・Esc で閉じ、フォーカスを開いたボタンに戻す
import { canPromptInstall, detectPlatform, onInstallAvailable, promptInstall, type InstallPlatform } from '../../platform/install';
import { el } from '../dom';

const STEPS: { platform: InstallPlatform; title: string; text: string }[] = [
  { platform: 'ios', title: 'iPhone（Safari）', text: '画面下の共有ボタン →「ホーム画面に追加」' },
  { platform: 'android', title: 'Android（Chrome）', text: '右上のメニュー →「ホーム画面に追加」' },
  { platform: 'pc', title: 'パソコン（Chrome / Edge）', text: 'アドレスバーの右のインストールのボタン' },
];

export interface InstallDialog {
  open(returnFocusTo: HTMLElement): void;
  destroy(): void;
}

export function installDialog(): InstallDialog {
  const current = detectPlatform(navigator.userAgent);
  let returnTo: HTMLElement | null = null;

  const titleId = 'install-title';
  const now = el('button', { class: 'wiz-button', type: 'button' }, '今すぐインストール');
  const close = el('button', { class: 'wiz-button', type: 'button' }, 'とじる');
  const dialog = el(
    'dialog',
    { id: 'install-dialog', class: 'install-dialog', 'aria-labelledby': titleId },
    el('h2', { id: titleId, class: 'install-title' }, el('span', { 'aria-hidden': 'true' }, '【 '), 'インストール', el('span', { 'aria-hidden': 'true' }, ' 】')),
    el('p', { class: 'install-lead' }, 'ホーム画面に追加すると、アプリのように開けます。通信がなくても遊べます。'),
    ...STEPS.map((s) => el('details', { 'data-platform': s.platform, open: s.platform === current }, el('summary', {}, s.title), el('p', {}, s.text))),
    el('p', { class: 'install-actions' }, now, close),
  );

  const showNow = () => { now.hidden = !canPromptInstall(); };
  const stopListening = onInstallAvailable(showNow);
  now.addEventListener('click', async () => {
    await promptInstall();
    showNow();
  });
  close.addEventListener('click', () => dialog.close());
  // 「とじる」・Esc のどちらでも、閉じたらフォーカスを開いたボタンに戻す
  dialog.addEventListener('close', () => returnTo?.focus());
  document.body.append(dialog);

  return {
    open(returnFocusTo) {
      returnTo = returnFocusTo;
      showNow();
      dialog.showModal();
      close.focus();
    },
    destroy() {
      stopListening();
      if (dialog.open) dialog.close();
      dialog.remove();
    },
  };
}
