import { expect, test } from '@playwright/test';
import { dungeonMap, startAt } from './helpers';

test.describe('メッセージ欄', () => {
  // ▼ の点滅の animation を見るので、動きを減らす設定を外す
  test.use({ reducedMotion: 'no-preference' });

  test('TC-0011-08 応答待ちが 300ms を超えると、メッセージ欄の右下に点滅する ▼ が出て、応答で消える', async ({ page }) => {
    await page.clock.install();
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 5, y: 5 }) } });
    await page.evaluate(() => window.__wiz!.setDelay(1000));
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const waiting = page.getByRole('img', { name: '応答待ち' });

    await page.getByRole('button', { name: '前進', exact: true }).click();
    await page.clock.runFor(300);
    await expect(waiting).toBeHidden();
    await page.clock.runFor(1);
    await expect(waiting).toBeVisible();
    expect(await waiting.evaluate((e) => {
      const s = getComputedStyle(e);
      return [s.animationDuration, s.animationIterationCount, s.animationTimingFunction];
    })).toEqual(['1s', 'infinite', 'steps(1)']); // step-end は steps(1) と読める
    // メッセージ欄の右下にある
    const box = await waiting.boundingBox();
    const win = await page.getByTestId('message-window').boundingBox();
    expect(box!.x + box!.width).toBeGreaterThan(win!.x + win!.width / 2);
    expect(box!.y + box!.height).toBeGreaterThan(win!.y + win!.height / 2);
    await page.clock.runFor(700);
    await expect(waiting).toBeHidden();
  });
});
