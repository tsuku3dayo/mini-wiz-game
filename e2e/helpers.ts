// E2E の場面づくり（仕様書 §28 のテスト用の入口を使う）。場面は使う TASK で足していく
import type { Page } from '@playwright/test';

const CHARACTER = { name: 'ゆうしゃ', level: 1, exp: 0, hp: 30, maxHp: 30, mp: 10, maxMp: 10, attack: 5, defense: 5, speed: 5 };
const EMPTY_INVENTORY = { equipped: { weapon: null, armor: null, shield: null, accessory: null }, items: [], nextId: 1, pending: null };
const RECORDS = { battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 0 };

/** 宿屋にいるプレイ中の状態（StoredGameState の形） */
export function storedInn(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...CHARACTER,
    // 今の版（src/domain/game-state.ts の GAME_SCHEMA_VERSION）。古い版だと読み込みでアクセの ID が付け替わる
    schemaVersion: 7,
    revision: 0,
    location: 'INN',
    dungeon: null,
    battle: null,
    inventory: EMPTY_INVENTORY,
    records: RECORDS,
    saveSlot: null,
    updatedAt: '2026-11-02T00:00:00.000Z',
    ...overrides,
  };
}

/** セーブ（StoredSave の形） */
export function storedSave(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { schemaVersion: 4, ...CHARACTER, inventory: EMPTY_INVENTORY, records: RECORDS, savedAt: '2026-11-02T00:00:00.000Z', ...overrides };
}

/** ?debug=1 で開いて、テスト用の入口ができるまで待つ */
export async function openDebug(page: Page): Promise<void> {
  await page.goto('./?debug=1');
  await page.waitForFunction(() => window.__wiz !== undefined);
}

export type SlotSaves = Partial<Record<1 | 2 | 3, Record<string, unknown>>>;

/** プレイ中の状態とセーブを書く。save はスロット 1、saves はスロットごと（v1.14） */
export async function writeScene(
  page: Page,
  scene: { state?: Record<string, unknown>; save?: Record<string, unknown>; saves?: SlotSaves },
): Promise<void> {
  await page.evaluate(async ({ state, save, saves }) => {
    if (save) await window.__wiz!.writeSave(save, 1);
    for (const [slot, value] of Object.entries(saves ?? {})) await window.__wiz!.writeSave(value, Number(slot) as 1 | 2 | 3);
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
  /** HP 1 のスライムを先攻で倒し、［R］を落とす（tests/domain/loot.test.ts で確かめている） */
  slimeDropR: 131,
  /** HP 1 のダークナイトに先に攻撃されたあと倒し（プレイヤーは HP 999）、特例で段階 8・［LG］を落とす（同上。v1.14 で 66 から） */
  darkKnightDropLG: 12,
  /**
   * HP 1 のダークナイトに先に攻撃されたあと倒し（プレイヤーは HP 999）、［UR］を落とす（5 行。5 行目が rareDrop）。
   * v1.14 で 2 から（勝利でレベルが上がらなくなり、間の levelUp の行がなくなった）
   */
  darkKnightDropUR: 5,
  /** 同じ形で［SR］を落とす（演出なし。v1.14 で 5 から） */
  darkKnightDropSR: 4,
  /** HP 1 のゴブリンを倒し（プレイヤーは HP 999）、［N］を落とす（5 行目がドロップ） */
  goblinDropN: 5,
  /**
   * HP 1 のボスを先攻で倒す（Lv12・EXP 1584・すばやさ 30。bossBattle）。
   * 5 行：攻撃 → bossDefeat → 経験値 → rareDrop（LG）→ clear（v1.14 でレベルアップの 6 行がなくなった。Lv12 のまま）
   */
  bossWin: 1,
} as const;

/**
 * 宿屋で「やすむ」と 3 回レベルアップする状態（Lv12・累計 2584＝ボスを倒したあと。Lv15 になる）。
 * 7 行：かいふく → （levelUp → 成長）× 3。2 行目（400ms）・4 行目（1871ms）・6 行目（3342ms）が levelUp（v1.14）
 */
export function innLevelUp(): Record<string, unknown> {
  return { level: 12, exp: 2584, hp: 50, maxHp: 120, mp: 10, maxMp: 40 };
}

/** HP 1 のボスとの戦闘（5F のボスのマス）。SEEDS.bossWin で倒す */
export function bossBattle(): Record<string, unknown> {
  return {
    // ボス（速さ 50）より先に動く（v1.21）
    location: 'BATTLE', level: 12, exp: 1584, speed: 50, hp: 100, maxHp: 120,
    dungeon: dungeonMap({ x: 9, y: 0, floor: 5 }), battle: battleOf('necromancer', 1),
  };
}

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

/**
 * 保存の形の装備の個体。レアリティは段階で出るもの（仕様書 §8.3）にし、value は範囲の中にする。
 * そうでないと読み込みの conformItem で直され、画面の文字が変わる
 */
export function storedItem(id: number, itemId: string, rarity: string, value: number): Record<string, unknown> {
  return { id, itemId, rarity, value };
}

/** 所持品の形（装備なし・入れ替え待ちなしが既定） */
export function storedInventory(opts: { items?: Record<string, unknown>[]; equipped?: Record<string, unknown>; pending?: Record<string, unknown> | null } = {}): Record<string, unknown> {
  const items = opts.items ?? [];
  const ids = [...items, ...Object.values(opts.equipped ?? {}), (opts.pending as { item?: unknown } | null | undefined)?.item]
    .map((i) => (i as { id?: number } | null | undefined)?.id ?? 0);
  return {
    equipped: { weapon: null, armor: null, shield: null, accessory: null, ...opts.equipped },
    items,
    nextId: Math.max(0, ...ids) + 1,
    pending: opts.pending ?? null,
  };
}

/** n 個の ショートソード［N］（id は from から。所持品を満杯にするとき） */
export function shortSwords(n: number, from: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => storedItem(from + i, 'weapon1', 'N', 1));
}

/** 場所ごとの画面の名前（body[data-screen]）。場所は使う TASK で足す */
const SCREEN_OF = { INN: 'inn', DUNGEON: 'dungeon', BATTLE: 'battle', CLEARED: 'clear', SWAP: 'swap' } as const;

/**
 * ?debug=1 で開き、その場所のプレイ中の状態（と、あればセーブ）を書いて、画面が出るまで待つ。
 * DUNGEON は state.dungeon がなければ 1F の入口（北向き）。BATTLE は 1F の (4,4) でゴブリン（HP 20）。
 * CLEARED は 1 回ボスを倒したあと（laps 2・bossKills 1）。
 * SWAP は 1F の (4,4) で、所持品 50 個（ショートソード［N］、id 1〜50）、
 * 落ちている個体 ミスリルソード［UR］（こうげき +28、id 51）、thenClear: false。
 * state.inventory を渡せば差し替えられる。
 * 乱数は seed（既定は SEEDS.noEncounter。歩いても遭遇しない）
 */
export async function startAt(
  page: Page,
  location: keyof typeof SCREEN_OF,
  opts: { state?: Record<string, unknown>; save?: Record<string, unknown>; saves?: SlotSaves; seed?: number } = {},
): Promise<void> {
  await openDebug(page);
  const base: Record<string, Record<string, unknown>> = {
    INN: {},
    DUNGEON: { location: 'DUNGEON', dungeon: dungeonMap({ x: 0, y: 9 }) },
    BATTLE: { location: 'BATTLE', dungeon: dungeonMap({ x: 4, y: 4 }), battle: battleOf('goblin', 20) },
    CLEARED: { location: 'CLEARED', records: { battles: 30, kills: 25, deaths: 1, laps: 2, bossKills: 1 } },
    SWAP: { location: 'SWAP', dungeon: dungeonMap({ x: 4, y: 4 }), inventory: swapInventory() },
  };
  await writeScene(page, { state: storedInn({ ...base[location], ...opts.state }), save: opts.save, saves: opts.saves });
  await page.evaluate((seed) => window.__wiz!.useSeed(seed), opts.seed ?? SEEDS.noEncounter);
  await page.locator(`body[data-screen="${SCREEN_OF[location]}"]`).waitFor({ state: 'attached' });
}

/** 入れ替え待ちの所持品（startAt の SWAP の既定） */
export function swapInventory(thenClear = false): Record<string, unknown> {
  return storedInventory({
    items: shortSwords(50, 1),
    pending: { item: storedItem(51, 'weapon6', 'UR', 28), thenClear },
  });
}

/** 音のイベントの記録（app:sound と app:bgm を出た順に） */
export type AudioEvent = { type: 'sound' | 'bgm'; name: string | null; muted?: boolean; t: number; screen: string };

/**
 * app:sound・app:bgm を、時刻とそのときの画面（body[data-screen]）つきで記録する。
 * 記録は開き直すたびに空になる（SDD-PROCESS §8 07）。場面ごとに見る
 */
export async function recordAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as Window & { __audio?: unknown[] };
    w.__audio = [];
    const push = (type: string) => (e: Event) => {
      const d = (e as CustomEvent<{ name: string | null; muted?: boolean }>).detail;
      w.__audio!.push({ type, ...d, t: Date.now(), screen: document.body.dataset.screen ?? '' });
    };
    window.addEventListener('app:sound', push('sound'));
    window.addEventListener('app:bgm', push('bgm'));
  });
}

export function audioEvents(page: Page): Promise<AudioEvent[]> {
  return page.evaluate(() => ((window as Window & { __audio?: unknown[] }).__audio ?? []) as AudioEvent[]);
}

/** 記録を空にする（そこから先だけを見るとき） */
export function clearAudio(page: Page): Promise<void> {
  return page.evaluate(() => { (window as Window & { __audio?: unknown[] }).__audio = []; });
}

/** BGM の曲の名前の並び */
export async function bgmNames(page: Page): Promise<(string | null)[]> {
  return (await audioEvents(page)).filter((e) => e.type === 'bgm').map((e) => e.name);
}

/** 開くたびに音をオンにしておく */
export function soundOnAtStart(page: Page): Promise<void> {
  return page.addInitScript(() => localStorage.setItem('mini-wiz-game-sound', 'on'));
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

/**
 * メニューの項目の、見えている文字（読み上げ用の隠し文とカーソルを除き、要素ごとに半角スペースで区切る）。
 * 例：「ぶき ロングソード［SR］ こうげき +10」
 */
export function shownLabels(page: Page, label: string): Promise<string[]> {
  return page.getByRole('menu', { name: label, exact: true }).getByRole('menuitem').evaluateAll((rows) => rows.map((row) => {
    const copy = row.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('.visually-hidden, .wiz-cursor').forEach((n) => n.remove());
    const texts: string[] = [];
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const t = (n.textContent ?? '').trim();
      if (t) texts.push(t);
    }
    return texts.join(' ');
  }));
}

/** メニューの ▶ のある行の文字 */
export async function cursorLabel(page: Page, label: string): Promise<string> {
  // 縦のメニューの行（.wiz-menu-item）と、狭い画面の戦闘のボタン（.command-button。v1.14）の両方
  const text = await page.getByRole('menu', { name: label }).locator('[role="menuitem"].active').textContent();
  return (text ?? '').replace(/^[▶\s]/, '');
}

/** 保存の値（プレイ中の状態・スロット 1 のセーブ・音の設定・スロット 2・3 のセーブ）の文字列（v1.14 でスロット 2・3 を後ろに足した） */
export function readStorage(page: Page): Promise<(string | null)[]> {
  return page.evaluate(() => ['game', 'save-1', 'sound', 'save-2', 'save-3'].map((k) => localStorage.getItem(`mini-wiz-game-${k}`)));
}
