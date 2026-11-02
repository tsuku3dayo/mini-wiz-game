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

/**
 * 歩いても遭遇しないシード：SeededRng(11350) は最初の 40 回の int(1,100) がすべて 21 以上
 * （遭遇は 20 以下。仕様書 §4.3）。決まった結果になるシードは、使う TASK で足していく
 */
export const SEEDS = {
  noEncounter: 11350,
  /** 1F で次の一歩でスライムに遭遇する（最初の int(1,100) が 20 以下、次が 70 以下） */
  slimeNext: 7,
  /**
   * 最初の int(1,100) が 63（回避の判定が外れる・逃走 90% が成功する）、次の int(0,2) のあとの int(1,100) も外れる値。
   * 敵が先なら敵の攻撃が当たり、プレイヤーが先ならプレイヤーの攻撃が当たる。倒してもドロップしない
   */
  hits: 1,
} as const;

type Facing = 'N' | 'E' | 'S' | 'W';

/**
 * テスト用のダンジョン（tests/helpers/maps.ts の openMap と同じ形）：外周だけが壁の 10×10。
 * 上り (0,9)、下り (9,0)、5F は下りの代わりにボス (9,0)。今の位置だけ踏破済み（ボスのマスは除く）。
 * walls で、その階の壁の配列を差し替えられる
 */
export function dungeonMap(opts: { x: number; y: number; facing?: Facing; floor?: number; walls?: number[] }): Record<string, unknown> {
  const size = 10;
  const floor = opts.floor ?? 1;
  const outer = Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    return (y === 0 ? 1 : 0) | (x === size - 1 ? 2 : 0) | (y === size - 1 ? 4 : 0) | (x === 0 ? 8 : 0);
  });
  const floors = Array.from({ length: 5 }, (_, i) => {
    const onBoss = i === 4 && opts.x === 9 && opts.y === 0;
    return {
      walls: i === floor - 1 && opts.walls ? opts.walls : [...outer],
      up: { x: 0, y: 9 },
      down: i === 4 ? null : { x: 9, y: 0 },
      boss: i === 4 ? { x: 9, y: 0 } : null,
      visited: Array.from({ length: size * size }, (_, j) => i === floor - 1 && !onBoss && j === opts.y * size + opts.x),
    };
  });
  return { width: size, height: size, floors, floor, player: { x: opts.x, y: opts.y, facing: opts.facing ?? 'N' } };
}

/** 戦闘のデータ（敵の種類と残り HP） */
export function battleOf(kind: string, hp: number, isBoss = kind === 'necromancer'): Record<string, unknown> {
  return { enemy: { kind, hp }, isBoss };
}

/** 場所ごとの画面の名前（body[data-screen]）。場所は使う TASK で足す */
const SCREEN_OF = { INN: 'inn', DUNGEON: 'dungeon', BATTLE: 'battle' } as const;

/**
 * ?debug=1 で開き、その場所のプレイ中の状態（と、あればセーブ）を書いて、画面が出るまで待つ。
 * DUNGEON は state.dungeon がなければ 1F の入口（北向き）。BATTLE は 1F の (4,4) でゴブリン（HP 18）。
 * 乱数は seed（既定は SEEDS.noEncounter。歩いても遭遇しない）
 */
export async function startAt(
  page: Page,
  location: keyof typeof SCREEN_OF,
  opts: { state?: Record<string, unknown>; save?: Record<string, unknown>; seed?: number } = {},
): Promise<void> {
  await openDebug(page);
  const base: Record<string, Record<string, unknown>> = {
    INN: {},
    DUNGEON: { location: 'DUNGEON', dungeon: dungeonMap({ x: 0, y: 9 }) },
    BATTLE: { location: 'BATTLE', dungeon: dungeonMap({ x: 4, y: 4 }), battle: battleOf('goblin', 18) },
  };
  await writeScene(page, { state: storedInn({ ...base[location], ...opts.state }), save: opts.save });
  await page.evaluate((seed) => window.__wiz!.useSeed(seed), opts.seed ?? SEEDS.noEncounter);
  await page.locator(`body[data-screen="${SCREEN_OF[location]}"]`).waitFor({ state: 'attached' });
}

/** メッセージ欄の行の文字（古い順） */
export function logLines(page: Page): Promise<string[]> {
  return page.locator('[role="log"] .wiz-line').allTextContents();
}

/** メニュー（aria-label）の項目の文字。先頭のカーソル（▶／全角スペース）を除く */
export async function menuLabels(page: Page, label: string): Promise<string[]> {
  const texts = await page.getByRole('menu', { name: label }).getByRole('menuitem').allTextContents();
  // \s は全角スペース（カーソルのない行の印）も含む
  return texts.map((t) => t.replace(/^[▶\s]/, ''));
}

/** メニューの ▶ のある行の文字 */
export async function cursorLabel(page: Page, label: string): Promise<string> {
  const text = await page.getByRole('menu', { name: label }).locator('.wiz-menu-item.active').textContent();
  return (text ?? '').replace(/^[▶\s]/, '');
}

/** 保存の 3 つの値（プレイ中の状態・セーブ・音の設定）の文字列 */
export function readStorage(page: Page): Promise<(string | null)[]> {
  return page.evaluate(() => ['mini-wiz-game-game', 'mini-wiz-game-save', 'mini-wiz-game-sound'].map((k) => localStorage.getItem(k)));
}
