import { expect, test, type Page } from '@playwright/test';
import { startAt } from './helpers';

const records = { battles: 128, kills: 120, deaths: 3, laps: 2, bossKills: 1 };

/** 狭い画面の宿屋で「メニュー」→「ステータス」 */
async function openStatus(page: Page) {
  await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' }).click();
  await page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: 'ステータス' }).click();
  await expect(page.locator('h1')).toHaveText('ステータス');
}

/** さいだいHP +15 のアクセとこうげき +10 のぶきを付けた状態 */
const equipped = {
  equipped: {
    weapon: { id: 1, itemId: 'weapon4', rarity: 'R', value: 10 },
    armor: null,
    shield: null,
    accessory: { id: 2, itemId: 'accessory4', rarity: 'R', value: 15 },
  },
  items: [],
  nextId: 3,
  pending: null,
};

test.describe('ステータス画面', () => {
  test('TC-0026-04 狭い画面で、宿屋とダンジョンのメニューの「ステータス」から開き、能力（補正つき）と実績が出る。もどるでフォーカスが開いたものに戻る', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', '狭い画面だけの画面');
    const tap = (l: ReturnType<Page['locator']>) => l.tap();
    const state = { level: 3, exp: 80, hp: 25, maxHp: 46, mp: 10, maxMp: 16, attack: 7, defense: 7, speed: 7, records, inventory: equipped };
    await startAt(page, 'INN', { state });
    await tap(page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' }));
    await tap(page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: 'ステータス' }));
    await expect(page.locator('h1')).toHaveText('ステータス');
    const status = page.getByTestId('status-panel');
    await expect(status.locator('.wiz-window-title')).toContainText('ゆうしゃ');
    const dds = await status.locator('dd').allTextContents();
    expect(await status.locator('dt').allTextContents()).toEqual(['Lv', 'EXP', 'HP', 'MP', 'こうげき', 'ぼうぎょ', 'すばやさ', 'かいひ']);
    expect(dds).toEqual(['  3', ' 80（つぎまで 64）', ' 25/ 61 (+15)', ' 10/ 16', ' 17 (+10)', '  7', '  7', '  0']);
    const rec = page.getByTestId('records-window');
    await expect(rec.locator('.wiz-window-title')).toContainText('じっせき');
    await expect(rec).toContainText('このキャラクターの きろく');
    expect(await rec.locator('dd').allTextContents()).toEqual(['128 回', '120 体', '3 回', '2 周目', '1 回']);
    await expect(page.getByTestId('message-window')).toHaveCount(0);
    await tap(page.getByRole('menu', { name: 'ステータス' }).getByRole('menuitem').filter({ hasText: 'もどる' }));
    await expect(page.locator('h1')).toHaveText('宿屋');
    await expect(page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' })).toBeFocused();

    await startAt(page, 'DUNGEON', { state });
    await tap(page.getByRole('button', { name: '≡ メニュー' }));
    await tap(page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: 'ステータス' }));
    await expect(page.locator('h1')).toHaveText('ステータス');
    await tap(page.getByRole('menu', { name: 'ステータス' }).getByRole('menuitem').filter({ hasText: 'もどる' }));
    await expect(page.getByRole('button', { name: '≡ メニュー' })).toBeFocused();
  });

  test('TC-0026-05 狭い画面のステータス画面で Esc を押すと、「もどる」と同じく宿屋に戻り、フォーカスは「メニュー」', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await page.setViewportSize({ width: 414, height: 715 });
    await startAt(page, 'INN', { state: { records } });
    await openStatus(page);
    await expect(page.getByTestId('records-window')).toContainText('128 回');
    await expect(page.getByTestId('message-window')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('h1')).toHaveText('宿屋');
    await expect(page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' })).toBeFocused();
    await expect(page.getByRole('menu', { name: 'メニュー' })).toHaveCount(0);
  });

  test('TC-0026-07 狭い画面でステータス画面を出したまま幅 1280 にすると、宿屋の画面（実績つき）に戻る', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 715 });
    await startAt(page, 'INN', { state: { records } });
    await openStatus(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('h1')).toHaveText('宿屋');
    await expect(page.getByTestId('records-window')).toBeVisible();
    await expect(page.getByTestId('records-window')).toContainText('2 周目');
  });
});
