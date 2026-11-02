import { expect, test } from '@playwright/test';
import { logLines, startAt } from './helpers';

test.describe('テスト用の入口', () => {
  test('TC-0038-06 setDelay(1000) のあいだ data-busy が true で、300ms を過ぎると ▼ が出る。応答のあとで消える', async ({ page }) => {
    await page.clock.install();
    await startAt(page, 'INN', { state: { hp: 10 } });
    await page.evaluate(() => window.__wiz!.setDelay(1000));
    // 時計を止めて、押した時刻から決まった時間だけ進める（止めないと自然に進み、数 ms ずれる）
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const waiting = page.getByRole('img', { name: '応答待ち' });
    const body = page.locator('body');

    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' }).click();
    await expect(body).toHaveAttribute('data-busy', 'true');
    await page.clock.runFor(299);
    await expect(waiting).toBeHidden();
    await page.clock.runFor(2);
    await expect(waiting).toBeVisible();
    await expect(body).toHaveAttribute('data-busy', 'true');
    await page.clock.runFor(700);
    await expect(waiting).toBeHidden();
    await expect(body).not.toHaveAttribute('data-busy', 'true');
    await expect.poll(() => logLines(page)).toEqual(['HP と MP が かいふくした']);

    // setDelay(0) で元に戻る（すぐ応答する）
    await page.evaluate(() => window.__wiz!.setDelay(0));
    await page.clock.resume();
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' }).click();
    await expect.poll(() => logLines(page)).toEqual(['HP と MP が かいふくした', 'HP と MP が かいふくした']);
    await expect(body).not.toHaveAttribute('data-busy', 'true');
  });
});
