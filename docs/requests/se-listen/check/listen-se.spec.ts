import { expect, test } from '@playwright/test';

const out = process.env.SHOT_DIR ?? '';

test('効果音の試聴ページ：エラーなし・8 種・FM の音はいまの長さの中で止まる', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // 予約した音の始まり・終わり（AudioContext の時刻）を記録する
  await page.addInitScript(() => {
    const w = window as unknown as { __log: { start: number; stop: number }[] };
    w.__log = [];
    const start = OscillatorNode.prototype.start;
    const stop = OscillatorNode.prototype.stop;
    OscillatorNode.prototype.start = function (when?: number) {
      (this as unknown as { __i: number }).__i = w.__log.push({ start: when ?? 0, stop: Infinity }) - 1;
      return start.call(this, when);
    };
    OscillatorNode.prototype.stop = function (when?: number) {
      const i = (this as unknown as { __i?: number }).__i;
      if (i !== undefined && when !== undefined && w.__log[i].stop === Infinity) w.__log[i].stop = when;
      return stop.call(this, when);
    };
  });
  await page.goto('./');
  await expect(page.locator('.card')).toHaveCount(8);
  const cards = page.locator('.card');
  for (let i = 0; i < 8; i++) {
    const secText = await cards.nth(i).locator('.meta').first().textContent();
    const sec = Number(/長さ ([\d.]+) 秒/.exec(secText ?? '')![1]);
    for (const [label, button] of [['湿った案', cards.nth(i).locator('button.main')], ['最初の案', cards.nth(i).locator('button.sub').nth(0)]] as const) {
      await page.evaluate(() => { (window as unknown as { __log: unknown[] }).__log = []; });
      await button.click();
      await expect(page.locator('#status')).toContainText(label);
      const log = await page.evaluate(() => (window as unknown as { __log: { start: number; stop: number }[] }).__log);
      expect(log.length, `${i} ${label} 音を作った`).toBeGreaterThan(0);
      const first = Math.min(...log.map((l) => l.start));
      const last = Math.max(...log.map((l) => l.stop));
      console.log(i, label, `音 ${log.length} 個、${(last - first).toFixed(3)} 秒（いまの長さ ${sec} 秒）`);
      expect(last - first).toBeLessThanOrEqual(sec + 0.001);
    }
    await cards.nth(i).locator('button.sub').nth(1).click();
    await expect(page.locator('#status')).toContainText('いまの音');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  if (out) await page.screenshot({ path: `${out}/se-small.png` });
  expect(errors).toEqual([]);
});
