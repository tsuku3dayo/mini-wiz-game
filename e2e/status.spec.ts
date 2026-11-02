import { expect, test, type Page } from '@playwright/test';
import { startAt } from './helpers';

const records = { battles: 128, kills: 120, deaths: 3, laps: 2, bossKills: 1 };

/** 狭い画面の宿屋で「メニュー」→「ステータス」 */
async function openStatus(page: Page) {
  await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' }).click();
  await page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: 'ステータス' }).click();
  await expect(page.locator('h1')).toHaveText('ステータス');
}

test.describe('ステータス画面', () => {
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
