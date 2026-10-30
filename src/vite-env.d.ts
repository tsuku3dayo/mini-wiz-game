/// <reference types="vite/client" />

// vite.config.ts の define で package.json から入る（仕様書 §19.2）
declare const __APP_VERSION__: string;
declare const __APP_ID__: string;

interface Window {
  /** テスト用の入口（?debug=1 のときだけ。仕様書 §28） */
  __wiz?: import('./ui/debug').DebugApi;
  /** 起動できたことを public/boot.js の見張りに知らせる（仕様書 §30.4） */
  __appStarted?: boolean;
  /** 起動の見張りの待ち時間（テスト用。仕様書 §28） */
  __bootWaitMs?: number;
}
