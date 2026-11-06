import { expect, test } from '@playwright/test';

const out = process.env.SHOT_DIR ?? '';

test('効果音の試聴ページ：エラーなし・8 種・どのボタンの音もいまの長さの中で止まる', async ({ page }) => {
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
  let fresh = 0;
  for (let i = 0; i < 8; i++) {
    const card = cards.nth(i);
    const sec = Number(/長さ ([\d.]+) 秒/.exec((await card.locator('.meta').first().textContent()) ?? '')![1]);
    const buttons = card.locator('button');
    const n = await buttons.count();
    for (let k = 0; k < n; k++) {
      const label = ((await buttons.nth(k).textContent()) ?? '').replace('▶ ', '');
      await page.evaluate(() => { (window as unknown as { __log: unknown[] }).__log = []; });
      await buttons.nth(k).click();
      if (label.startsWith('新しい音')) fresh++;
      if (label === 'いまの音') {
        await expect(page.locator('#status')).toContainText('いまの音');
        continue;
      }
      const log = await page.evaluate(() => (window as unknown as { __log: { start: number; stop: number }[] }).__log);
      expect(log.length, `${i} ${label} 音を作った`).toBeGreaterThan(0);
      const first = Math.min(...log.map((l) => l.start));
      const last = Math.max(...log.map((l) => l.stop));
      console.log(i, label, `音 ${log.length} 個、${(last - first).toFixed(3)} 秒（いまの長さ ${sec} 秒）`);
      expect(last - first).toBeLessThanOrEqual(sec + 0.001);
    }
  }
  expect(fresh).toBe(12);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  if (out) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${out}/se-small.png` });
  }
  expect(errors).toEqual([]);
});
