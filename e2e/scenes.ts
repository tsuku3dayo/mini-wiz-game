// 全画面・全状態の一覧（TC-0035・TC-0036 の「どの画面も」）。画面の大きさ（layout.spec）と読み上げの検査（a11y.spec）で使う
import { expect, type Locator, type Page } from '@playwright/test';
import {
  bossBattle, dungeonMap, openDebug, SEEDS, shortSwords, startAt, storedInventory, storedItem, storedSave, writeScene,
} from './helpers';
/** 書き込みを失敗させる（ErrorPanel を出す） */
export const failWrites = (page: Page) => page.evaluate(() => {
  Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
});

export const item = (page: Page, menu: string, text: string | RegExp) =>
  page.getByRole('menu', { name: menu, exact: true }).getByRole('menuitem').filter({ hasText: text });

/** 所持品 50 個（装備 4 つ）の宿屋。そうび・もちもの・ステータスが一番長くなる状態 */
export const heavy = {
  level: 15, exp: 2584, hp: 80, maxHp: 120, mp: 20, maxMp: 40,
  inventory: storedInventory({
    items: shortSwords(50, 10),
    equipped: {
      weapon: storedItem(1, 'weapon6', 'UR', 28),
      armor: storedItem(2, 'armor4', 'R', 9),
      shield: storedItem(3, 'shield4', 'R', 6),
      accessory: storedItem(4, 'accessory1', 'R', 7),
    },
  }),
};

export type Scene = { name: string; open: () => Promise<void>; narrowOnly?: boolean };

/** どの画面も（TC-0035 の前書き）：11 画面（v1.12 でクレジット）と、メニュー・確認・ErrorPanel を出した状態 */
export function scenes(page: Page, press: (l: Locator) => Promise<void>): Scene[] {
  const screen = (name: string) => expect(page.locator('body')).toHaveAttribute('data-screen', name);
  const innMenu = async () => {
    await startAt(page, 'INN', { state: heavy });
    await press(item(page, '宿屋', 'メニュー'));
    await expect(page.getByRole('menu', { name: 'メニュー' })).toBeVisible();
  };
  const dungeon = () => startAt(page, 'DUNGEON', { state: { ...heavy, dungeon: dungeonMap({ x: 9, y: 0 }) } });
  const battle = () => startAt(page, 'BATTLE', { state: heavy, seed: SEEDS.hits });
  return [
    {
      name: 'タイトル',
      open: async () => {
        // 前の場面のプレイ中の状態があるとタイトルを開けないので、保存を消してから開き直す
        await openDebug(page);
        await page.evaluate(() => localStorage.clear());
        await page.goto('about:blank');
        await openDebug(page);
        await writeScene(page, { save: storedSave({ level: 15 }) });
        await expect(item(page, 'タイトル', 'つづきから')).toBeVisible();
      },
    },
    {
      // v1.12：メニューが 4 行になり、エラーの枠が出たときがタイトルでいちばん高い（TC-0035 の前書き）
      name: 'タイトル・エラー',
      open: async () => {
        await openDebug(page);
        await page.evaluate(() => localStorage.clear());
        await page.goto('about:blank');
        await openDebug(page);
        await writeScene(page, { save: storedSave({ level: 15 }) });
        // v1.14：つづきから はスロットの一覧を出す。スロットを選んで書けないと、一覧が閉じてタイトルのメニューの下にエラーの枠（v1.15）
        await press(item(page, 'タイトル', 'つづきから'));
        await failWrites(page);
        await press(item(page, 'つづきから', /スロット1/));
        await expect(page.getByTestId('error-panel')).toBeVisible();
      },
    },
    {
      // v1.14：つづきから のスロットの一覧（3 スロットとも埋まっている）
      name: 'タイトル・つづきから',
      open: async () => {
        await openDebug(page);
        await page.evaluate(() => localStorage.clear());
        await page.goto('about:blank');
        await openDebug(page);
        await writeScene(page, { saves: { 1: storedSave({ level: 15 }), 2: storedSave({ name: 'アルドアルドアル', level: 99 }), 3: storedSave({ level: 3 }) } });
        await press(item(page, 'タイトル', 'つづきから'));
        await expect(page.getByRole('menu', { name: 'つづきから' })).toBeVisible();
      },
    },
    {
      name: 'クレジット',
      open: async () => {
        await openDebug(page);
        await page.evaluate(() => localStorage.clear());
        await page.goto('about:blank');
        await page.goto('./?debug=1#/credits');
        await screen('credits');
      },
    },
    {
      name: '名前入力',
      open: async () => {
        await openDebug(page);
        await page.evaluate(() => localStorage.clear());
        await page.goto('about:blank');
        await page.goto('./?debug=1#/new');
        await screen('new');
      },
    },
    { name: '宿屋', open: () => startAt(page, 'INN', { state: heavy }) },
    { name: '宿屋・メニュー', open: innMenu },
    {
      name: '宿屋・確認',
      open: async () => {
        await startAt(page, 'INN', { state: heavy });
        await press(item(page, '宿屋', 'タイトルへ戻る'));
        await expect(page.getByRole('menu', { name: 'かくにん' })).toBeVisible();
      },
    },
    {
      // v1.14：セーブのスロットの一覧（空きと中身のあるスロット）
      name: '宿屋・セーブ',
      open: async () => {
        await startAt(page, 'INN', { state: heavy, saves: { 1: storedSave({ level: 15 }), 3: storedSave({ name: 'アルドアルドアル', level: 99 }) } });
        await press(item(page, '宿屋', 'セーブ'));
        await expect(page.getByRole('menu', { name: 'セーブ' })).toBeVisible();
      },
    },
    {
      // v1.14：中身のあるスロットへの上書きの確認
      name: '宿屋・上書きの確認',
      open: async () => {
        await startAt(page, 'INN', { state: heavy, saves: { 1: storedSave({ name: 'アルドアルドアル', level: 99 }) } });
        await press(item(page, '宿屋', 'セーブ'));
        await press(item(page, 'セーブ', /スロット1/));
        await expect(page.getByRole('menu', { name: 'かくにん' })).toBeVisible();
      },
    },
    {
      name: '宿屋・エラー',
      open: async () => {
        await startAt(page, 'INN', { state: heavy });
        await failWrites(page);
        await press(item(page, '宿屋', 'やすむ'));
        await expect(page.getByTestId('error-panel')).toBeVisible();
      },
    },
    {
      name: 'そうび',
      open: async () => {
        await innMenu();
        await press(item(page, 'メニュー', 'そうび'));
        await expect(page.getByRole('menu', { name: 'そうび' }).first()).toBeVisible();
      },
    },
    {
      name: 'もちもの',
      open: async () => {
        await innMenu();
        await press(item(page, 'メニュー', 'もちもの'));
        await expect(page.getByTestId('inventory-window')).toBeVisible();
      },
    },
    {
      name: 'もちもの・確認',
      open: async () => {
        await innMenu();
        await press(item(page, 'メニュー', 'もちもの'));
        await press(item(page, 'もちもの', /ショートソード/).first());
        await expect(page.getByRole('menu', { name: 'かくにん' })).toBeVisible();
      },
    },
    {
      name: 'ステータス',
      narrowOnly: true,
      open: async () => {
        await innMenu();
        await press(item(page, 'メニュー', 'ステータス'));
        await expect(page.getByRole('menu', { name: 'ステータス' })).toBeVisible();
      },
    },
    { name: 'ダンジョン', open: dungeon },
    {
      name: 'ダンジョン・メニュー',
      open: async () => {
        await dungeon();
        await press(page.getByRole('button', { name: /メニュー/ }));
        await expect(page.getByRole('menu', { name: 'メニュー' })).toBeVisible();
      },
    },
    {
      name: 'ダンジョン・エラー',
      open: async () => {
        await dungeon();
        await failWrites(page);
        await press(page.getByRole('button', { name: '左を向く', exact: true }));
        await expect(page.getByTestId('error-panel')).toBeVisible();
      },
    },
    { name: '戦闘', open: battle },
    { name: '戦闘（ボス）', open: () => startAt(page, 'BATTLE', { state: { ...heavy, ...bossBattle() } }) },
    {
      name: '戦闘・エラー',
      open: async () => {
        await battle();
        await failWrites(page);
        await press(item(page, '戦闘', 'たたかう'));
        await expect(page.getByTestId('error-panel')).toBeVisible();
      },
    },
    { name: '入れ替え', open: () => startAt(page, 'SWAP') },
    {
      name: '入れ替え・一覧',
      open: async () => {
        await startAt(page, 'SWAP');
        await press(item(page, 'いれかえ', 'ひろう'));
        await expect(page.getByRole('menu', { name: 'もちもの' })).toBeVisible();
      },
    },
    {
      name: '入れ替え・確認',
      open: async () => {
        await startAt(page, 'SWAP');
        await press(item(page, 'いれかえ', 'あきらめる'));
        await expect(page.getByRole('menu', { name: 'かくにん' })).toBeVisible();
      },
    },
    { name: 'ゲームクリア', open: () => startAt(page, 'CLEARED', { state: { ...heavy, saveSlot: 1 } }) },
    // v1.14：スロットがいっぱいで自動セーブしなかったクリア
    { name: 'ゲームクリア（セーブなし）', open: () => startAt(page, 'CLEARED', { state: heavy }) },
  ];
}
