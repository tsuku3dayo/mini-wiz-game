import { expect, test, type Page } from '@playwright/test';

// 起動の見張りと復旧（仕様書 §30.4、TC-0005・TC-0001-05）
// Service Worker が配るファイルは page.route で止められないので、このファイルでは Service Worker を使わない
test.use({ serviceWorkers: 'block' });

const KEY = 'mini-wiz-game:boot-repair-at';
const WAIT_MS = 500;

/** 見張りの待ち時間を短くし、ページの読み込み（メインフレームの移動）を数える */
async function prepare(page: Page): Promise<{ count: () => number }> {
  await page.addInitScript((ms) => { window.__bootWaitMs = ms; }, WAIT_MS);
  let n = 0;
  page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) n += 1; });
  return { count: () => n };
}

/** ビルドの入口の JS（index.html が type="module" で読むもの）を止めて、起動を失敗させる */
async function breakEntry(page: Page, times = Infinity): Promise<void> {
  let left = times;
  await page.route(/\/assets\/index-[^/]+\.js$/, (route) => {
    if (left > 0) { left -= 1; return route.abort(); }
    return route.continue();
  });
}

const scopeOf = (page: Page) => page.evaluate(() => new URL('./', location.href).href);

test.describe('起動に失敗しても直る', () => {
  test('TC-0005-01 ふつうに起動したときは、見張りの時間がたっても読み込み直さず、#boot-error も出ない', async ({ page }) => {
    const nav = await prepare(page);
    await page.goto('./');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    await page.waitForTimeout(WAIT_MS * 3);
    expect(nav.count()).toBe(1);
    await expect(page.locator('#boot-error')).toBeHidden();
  });

  test('TC-0005-03 前の復旧から 2 分以内にまた失敗すると、読み込み直さずに「なおす」を出す', async ({ page }) => {
    const nav = await prepare(page);
    await breakEntry(page);
    await page.goto('./');
    // 1 回目の失敗 → 自動で読み込み直す → 2 回目の失敗 → 「なおす」
    const box = page.locator('#boot-error');
    await expect(box).toBeVisible({ timeout: 10_000 });
    expect(nav.count()).toBe(2);
    await expect(box).toContainText('うまく起動できませんでした。');
    await expect(box).toContainText('きろくは消えません。');
    const repair = page.locator('#boot-repair');
    await expect(repair).toHaveText('なおす');
    expect((await repair.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await page.waitForTimeout(WAIT_MS * 3);
    expect(nav.count()).toBe(2);
  });

  test('TC-0005-04 前の復旧が 2 分より前なら、「なおす」を出さずに自動で読み込み直す', async ({ page }) => {
    const nav = await prepare(page);
    await page.addInitScript((key) => {
      if (!sessionStorage.getItem('test-marked')) {
        sessionStorage.setItem('test-marked', '1');
        sessionStorage.setItem(key, String(Date.now() - 121_000));
      }
    }, KEY);
    await breakEntry(page, 1);
    const before = Date.now();
    await page.goto('./');
    await expect.poll(() => nav.count(), { timeout: 10_000 }).toBe(2);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    await expect(page.locator('#boot-error')).toBeHidden();
    const at = Number(await page.evaluate((key) => sessionStorage.getItem(key), KEY));
    expect(at).toBeGreaterThanOrEqual(before);
  });

  test('TC-0001-05 復旧で消すのはこのアプリの範囲のキャッシュだけで、ほかのアプリのデータは残る', async ({ page }) => {
    const nav = await prepare(page);
    await page.goto('./');
    const scope = await scopeOf(page);
    await page.evaluate(async (s) => {
      localStorage.setItem('mini-blockbreaking-game-save', 'x');
      await (await caches.open('other-app-cache')).put('/other', new Response('x'));
      await (await caches.open(`workbox-precache-v2-${s}`)).put(s, new Response('x'));
    }, scope);
    await breakEntry(page, 1);
    await page.reload();
    // 失敗 → 復旧（キャッシュを消して読み込み直す）→ 2 回目は通るので起動する
    await expect.poll(() => nav.count(), { timeout: 10_000 }).toBe(3);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    const names = await page.evaluate(() => caches.keys());
    expect(names).toContain('other-app-cache');
    expect(names.filter((n) => n.includes(scope))).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem('mini-blockbreaking-game-save'))).toBe('x');
  });
});
