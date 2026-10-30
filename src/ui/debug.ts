// テスト用の入口（仕様書 §28、TD-0005 §3）。URL に ?debug=1 があるときだけ main.ts が付ける
// いまは更新の帯だけ。writeState・writeSave・useSeed・setDelay は TASK-0006、debugDungeon は TASK-0009 で足す
import { simulateUpdate } from '../platform/pwa';

export interface DebugApi {
  /** 「新しい版があります」の帯を出す（新しい版を受け取ったことにする） */
  showUpdateBanner(): void;
}

export function attachDebug(): void {
  const api: DebugApi = {
    showUpdateBanner: () => simulateUpdate(),
  };
  window.__wiz = api;
}
