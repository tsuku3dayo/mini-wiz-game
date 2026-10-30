// Service Worker の登録と更新（仕様書 §30.3、ADR-0009）
// 新しい版は待機させ、「更新」を押したときだけ切り替える（遊んでいる途中で勝手に切り替えない）
import { registerSW } from 'virtual:pwa-register';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
let needRefresh = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** 本番のビルドで、Service Worker が使えるときだけ登録する。開発サーバーでは登録しない */
export function registerPwa(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    updateSW = registerSW({
      onNeedRefresh() {
        needRefresh = true;
        notify();
      },
    });
  } catch {
    // 登録できなくても遊べる（基盤は例外を外に出さない）
  }
}

/** 新しい版を受け取って、切り替え待ちか */
export function hasUpdate(): boolean {
  return needRefresh;
}

/** 新しい版を受け取ったら知らせる */
export function onUpdateAvailable(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 「更新」：待機中の版に切り替えて読み込み直す。プレイ中の状態とセーブは保存にあるので消えない */
export async function applyUpdate(): Promise<void> {
  try {
    if (updateSW) await updateSW(true);
    else location.reload();
  } catch {
    location.reload();
  }
}

/** テスト用の入口（__wiz.showUpdateBanner）から、新しい版を受け取ったことにする */
export function simulateUpdate(): void {
  needRefresh = true;
  notify();
}
