import { devices, expect, test, type Page } from '@playwright/test';
import { readStorage, startAt, storedSave } from './helpers';

test.describe('更新の帯', () => {
  /** 帯が見えて、文と「更新」があり、上端（安全領域の内側）に固定されている */
  async function expectBanner(page: Page) {
    const banner = page.locator('#update-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('新しい版があります');
    await expect(page.locator('#update-button')).toHaveText('更新');
    await expect(banner).toHaveCSS('position', 'fixed');
    const top = await banner.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThanOrEqual(1);
  }

  test('TC-0004-01 新しい版を受け取ると、タイトルと宿屋の画面の上端に「新しい版があります」と「更新」が出る', async ({ page }) => {
    await page.goto('./?debug=1');
    await page.waitForFunction(() => window.__wiz !== undefined);
    await page.evaluate(() => window.__wiz!.showUpdateBanner());
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    await expectBanner(page);

    await startAt(page, 'INN');
    await page.evaluate(() => window.__wiz!.showUpdateBanner());
    await expectBanner(page);
  });

  test('TC-0004-03 帯を出して 30 秒たっても読み込み直さず、プレイ中の状態とセーブがそのまま', async ({ page }) => {
    await page.clock.install();
    await startAt(page, 'INN', { save: storedSave() });
    await page.evaluate(() => window.__wiz!.showUpdateBanner());
    await expect(page.locator('#update-banner')).toBeVisible();
    const before = await readStorage(page);
    let navigations = 0;
    page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigations += 1; });
    await page.clock.runFor(30_000);
    expect(navigations).toBe(0);
    expect(await readStorage(page)).toEqual(before);
    expect(before[0]).not.toBeNull();
    expect(before[1]).not.toBeNull();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
  });
});

// 開いている details の data-platform の一覧
const openPlatforms = (page: Page) =>
  page.locator('#install-dialog details').evaluateAll((list) => list.filter((d) => (d as HTMLDetailsElement).open).map((d) => d.getAttribute('data-platform')));

test.describe('ホーム画面に追加する', () => {
  test('TC-0002-01 「インストール」で案内がモーダルで開き、今の端末の手順だけが開いている', async ({ page }, info) => {
    await page.goto('./');
    await page.getByRole('button', { name: 'インストール' }).click();
    await expect(page.locator('#install-dialog')).toHaveJSProperty('open', true);
    // モーダル（showModal）で開いている
    expect(await page.locator('#install-dialog').evaluate((d) => d.matches(':modal'))).toBe(true);
    const expected = info.project.name === 'desktop' ? 'pc' : 'android';
    expect(await openPlatforms(page)).toEqual([expected]);
  });

  test('TC-0002-01 iPhone の userAgent では iPhone の手順だけが開いている', async ({ browser }) => {
    const context = await browser.newContext({ userAgent: devices['iPhone 13'].userAgent });
    const page = await context.newPage();
    await page.goto('./');
    await page.getByRole('button', { name: 'インストール' }).click();
    expect(await openPlatforms(page)).toEqual(['ios']);
    await context.close();
  });

  test('TC-0002-02 beforeinstallprompt を受けたときだけ「今すぐインストール」が出て、押すと prompt() が 1 回呼ばれる', async ({ page }) => {
    await page.goto('./');
    const install = page.getByRole('button', { name: 'インストール', exact: true });
    const now = page.getByRole('button', { name: '今すぐインストール' });
    await install.click();
    await expect(now).toBeHidden();
    await page.getByRole('button', { name: 'とじる' }).click();

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt(): Promise<void> };
      (window as Window & { __promptCount?: number }).__promptCount = 0;
      event.prompt = async () => { (window as Window & { __promptCount?: number }).__promptCount! += 1; };
      window.dispatchEvent(event);
    });
    await install.click();
    await expect(now).toBeVisible();
    await now.click();
    expect(await page.evaluate(() => (window as Window & { __promptCount?: number }).__promptCount)).toBe(1);
  });

  test('TC-0002-03 「とじる」をタップすると閉じ、フォーカスが「インストール」に戻る', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'タッチのテストはスマートフォンだけ');
    await page.goto('./');
    const install = page.getByRole('button', { name: 'インストール', exact: true });
    await install.tap();
    await page.getByRole('button', { name: 'とじる' }).tap();
    await expect(page.locator('#install-dialog')).toHaveJSProperty('open', false);
    await expect(install).toBeFocused();
  });

  test('TC-0002-04 Esc で閉じ、フォーカスが「インストール」に戻る', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await page.goto('./');
    const install = page.getByRole('button', { name: 'インストール', exact: true });
    await install.click();
    await page.keyboard.press('Escape');
    await expect(page.locator('#install-dialog')).toHaveJSProperty('open', false);
    await expect(install).toBeFocused();
  });

  test('TC-0002-05 インストール済み（display-mode: standalone）なら「インストール」がなく、版は右に残る', async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => (query.includes('display-mode: standalone') ? ({ ...original(query), matches: true, media: query } as MediaQueryList) : original(query));
    });
    await page.goto('./');
    await expect(page.getByText('v1.0')).toBeVisible();
    await expect(page.getByRole('button', { name: 'インストール', exact: true })).toHaveCount(0);
    // 版の表記は、その行（最大幅 800px の中）の右端にそろう
    const version = await page.getByText('v1.0').boundingBox();
    const row = await page.locator('.title-sub').boundingBox();
    expect(Math.abs(version!.x + version!.width - (row!.x + row!.width))).toBeLessThanOrEqual(1);
  });

  test('TC-0002-05 インストール済み（navigator.standalone）なら「インストール」がない', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
    await page.goto('./');
    await expect(page.getByText('v1.0')).toBeVisible();
    await expect(page.getByRole('button', { name: 'インストール', exact: true })).toHaveCount(0);
  });

  test('TC-0002-06 manifest の名前・表示・開始 URL・アイコンと、iPhone 用の名前とアイコン', async ({ page }) => {
    await page.goto('./');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toContain('manifest.webmanifest');
    const manifest = await (await page.request.get(new URL(href!, page.url()).href)).json();
    expect(manifest.name).toBe('WIZ');
    expect(manifest.short_name).toBe('WIZ');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    const has = (sizes: string, purpose: string) => manifest.icons.some((i: { sizes: string; purpose?: string }) => i.sizes === sizes && (i.purpose ?? 'any').includes(purpose));
    expect(has('192x192', 'any')).toBe(true);
    expect(has('512x512', 'any')).toBe(true);
    expect(has('512x512', 'maskable')).toBe(true);
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'WIZ');
    const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect((await page.request.get(new URL(touch!, page.url()).href)).status()).toBe(200);
  });
});
