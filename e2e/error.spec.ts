import { expect, test } from '@playwright/test';
import { openDebug, storedSave, writeScene } from './helpers';

test.describe('エラーの出し方', () => {
  test('TC-0012-07 タイトルで書き込みに失敗すると、ErrorPanel がメニューの下に出る', async ({ page }, info) => {
    await openDebug(page);
    await writeScene(page, { save: storedSave() });
    const menu = page.getByRole('menu', { name: 'タイトル' });
    await expect(menu.getByRole('menuitem').filter({ hasText: 'ゆうしゃ Lv1' })).toBeVisible();
    // 書き込みを失敗させる
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
    });
    const cont = menu.getByRole('menuitem').filter({ hasText: 'つづきから' });
    if (info.project.name === 'desktop') await cont.click();
    else await cont.tap();

    const panel = page.getByTestId('error-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-variant', 'danger');
    await expect(panel.getByRole('alert')).toHaveText('きろくを よみかき できません');
    await expect(panel.getByRole('menuitem')).toContainText('再試行');
    const menuBottom = await menu.evaluate((el) => el.getBoundingClientRect().bottom);
    const panelTop = await panel.evaluate((el) => el.getBoundingClientRect().top);
    expect(panelTop).toBeGreaterThan(menuBottom);
    await expect(menu).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  });

  test('TC-0012-10 プレイ中の状態が壊れていても、#/inn を開くとエラーを出さずにタイトルが出る', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mini-wiz-game-game', '{broken'));
    await page.goto('./?debug=1#/inn');
    await page.waitForURL(/#\/$/);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    await expect(page.locator('body')).toHaveAttribute('data-location', 'none');
    await expect(page.getByTestId('error-panel')).toHaveCount(0);
  });
});
