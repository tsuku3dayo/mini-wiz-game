import { expect, test } from '@playwright/test';

// スクリーンショットは、このフォルダの外（作業用の一時フォルダ）に出す
const out = process.env.SHOT_DIR ?? '';

test('試聴ページ：エラーなし・6 曲・押すと鳴る', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // 作った音の数を数える（OscillatorNode.start を数える）
  await page.addInitScript(() => {
    const w = window as unknown as { __starts: number };
    w.__starts = 0;
    const orig = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (...a: Parameters<typeof orig>) { w.__starts++; return orig.apply(this, a); };
  });
  await page.goto('./');
  await expect(page.locator('.card')).toHaveCount(6);
  for (const name of ['ローエングリン', '死の島', '火星', 'カタコンベ', 'イン・パラディス', 'グリーンスリーヴス']) {
    await expect(page.locator('.card h2', { hasText: name })).toHaveCount(1);
  }
  const mains = page.locator('button.main');
  for (let i = 0; i < 6; i++) {
    const before = await page.evaluate(() => (window as unknown as { __starts: number }).__starts);
    await mains.nth(i).click();
    await expect(page.locator('#status')).toContainText('再生中');
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => (window as unknown as { __starts: number }).__starts);
    console.log(i, '作った音', after - before);
    expect(after - before).toBeGreaterThan(20);
  }
  await page.locator('button.sub').first().click();
  await expect(page.locator('#status')).toContainText('鐘と祈り');
  await page.locator('#stop').click();
  await expect(page.locator('#status')).toHaveText('止まっています');
  const over = await page.evaluate(() => [document.documentElement.scrollWidth - innerWidth]);
  expect(over[0]).toBe(0);
  await page.locator('button.main').nth(1).click();
  await page.screenshot({ path: `${out}small.png`, fullPage: false });
  expect(errors).toEqual([]);
});
