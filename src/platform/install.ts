// インストールの案内（仕様書 §30.2）：インストール済みの判定・端末の判定・ブラウザのインストールの呼び出し

export type InstallPlatform = 'ios' | 'android' | 'pc';

/** ブラウザが渡す beforeinstallprompt の中で使うところだけ */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/** インストール済み（ホーム画面のアプリとして開いている）か */
export function isInstalled(): boolean {
  const standalone = typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches;
  return standalone || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** userAgent から、案内で最初に開く手順を決める */
export function detectPlatform(userAgent: string): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'pc';
}

/** beforeinstallprompt を受けて保存しておく（受けたら「今すぐインストール」を出せる） */
export function prepareInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    for (const listener of listeners) listener();
  });
}

/** ブラウザがすぐにインストールできるか */
export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** 「今すぐインストール」が出せるようになったら知らせる */
export function onInstallAvailable(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** ブラウザのインストールの確認を出す。一度使ったイベントは使い直せないので捨てる */
export async function promptInstall(): Promise<void> {
  const event = deferred;
  deferred = null;
  if (!event) return;
  try {
    await event.prompt();
  } catch {
    // 失敗しても何もしない（基盤は例外を外に出さない。TD-0001 §4）
  }
}
