import { expect, test } from '@playwright/test';

test.describe('タイトル', () => {
  test('TC-0001-02 ページの題名は「WIZ ～死霊術師の迷宮～」で、html の lang は ja', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle('WIZ ～死霊術師の迷宮～');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  });
});
