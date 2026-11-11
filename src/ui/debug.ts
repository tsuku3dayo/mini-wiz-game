// テスト用の入口（仕様書 §28、TD-0005 §3）。URL に ?debug=1 があるときだけ main.ts が付ける
import type { DebugDungeon } from '../api/types';
import { simulateUpdate } from '../platform/pwa';
import type { Store } from './store';

export interface DebugApi {
  /** 今の階の全情報（ゲームがなければ 404、ダンジョンがなければ 409 で reject） */
  debugDungeon(): Promise<DebugDungeon>;
  /** 「新しい版があります」の帯を出す（新しい版を受け取ったことにする） */
  showUpdateBanner(): void;
  /** 保存にプレイ中の状態（StoredGameState の形）を直接書き、ストアを取り直す */
  writeState(stored: unknown): Promise<void>;
  /** 保存のそのスロット（既定 1）にセーブ（StoredSave の形）を直接書き、ストアを取り直す（v1.14 で slot を足した） */
  writeSave(stored: unknown, slot?: 1 | 2 | 3): Promise<void>;
  /** 以後の乱数を SeededRng(seed) にする */
  useSeed(seed: number): void;
  /** ゲーム API の応答を ms だけ遅らせる */
  setDelay(ms: number): void;
}

export interface DebugDeps {
  store: Store;
  /** 保存の 1 つのキーに値を書く（platform/storage.ts の write） */
  write(name: string, value: unknown): boolean;
  useSeed(seed: number): void;
  setDelay(ms: number): void;
  debugDungeon(): Promise<DebugDungeon>;
}

export function attachDebug(deps: DebugDeps): void {
  const writeAndRefetch = async (name: string, value: unknown) => {
    if (!deps.write(name, value)) throw new Error(`保存に書けなかった：${name}`);
    await Promise.all([deps.store.refetchGame(), deps.store.refetchSave()]);
  };
  const api: DebugApi = {
    showUpdateBanner: () => simulateUpdate(),
    writeState: (stored) => writeAndRefetch('game', stored),
    writeSave: (stored, slot = 1) => writeAndRefetch(`save-${slot}`, stored),
    useSeed: (seed) => deps.useSeed(seed),
    setDelay: (ms) => deps.setDelay(ms),
    debugDungeon: () => deps.debugDungeon(),
  };
  window.__wiz = api;
}
