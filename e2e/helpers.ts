// E2E の場面づくり（仕様書 §28 のテスト用の入口を使う）。場面は使う TASK で足していく
import type { Page } from '@playwright/test';

const CHARACTER = { name: 'ゆうしゃ', level: 1, exp: 0, hp: 30, maxHp: 30, mp: 10, maxMp: 10, attack: 5, defense: 5, speed: 5 };
const EMPTY_INVENTORY = { equipped: { weapon: null, armor: null, shield: null, accessory: null }, items: [], nextId: 1, pending: null };
const RECORDS = { battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 0 };

/** 宿屋にいるプレイ中の状態（StoredGameState の形） */
export function storedInn(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...CHARACTER,
    schemaVersion: 5,
    revision: 0,
    location: 'INN',
    dungeon: null,
    battle: null,
    inventory: EMPTY_INVENTORY,
    records: RECORDS,
    updatedAt: '2026-11-02T00:00:00.000Z',
    ...overrides,
  };
}

/** セーブ（StoredSave の形） */
export function storedSave(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { schemaVersion: 3, ...CHARACTER, inventory: EMPTY_INVENTORY, records: RECORDS, savedAt: '2026-11-02T00:00:00.000Z', ...overrides };
}

/** ?debug=1 で開いて、テスト用の入口ができるまで待つ */
export async function openDebug(page: Page): Promise<void> {
  await page.goto('./?debug=1');
  await page.waitForFunction(() => window.__wiz !== undefined);
}

/** プレイ中の状態とセーブを書く */
export async function writeScene(page: Page, scene: { state?: Record<string, unknown>; save?: Record<string, unknown> }): Promise<void> {
  await page.evaluate(async ({ state, save }) => {
    if (save) await window.__wiz!.writeSave(save);
    if (state) await window.__wiz!.writeState(state);
  }, scene);
}

/** 保存の 3 つの値（プレイ中の状態・セーブ・音の設定）の文字列 */
export function readStorage(page: Page): Promise<(string | null)[]> {
  return page.evaluate(() => ['mini-wiz-game-game', 'mini-wiz-game-save', 'mini-wiz-game-sound'].map((k) => localStorage.getItem(k)));
}
