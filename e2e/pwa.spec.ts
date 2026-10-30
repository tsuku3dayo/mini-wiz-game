import { devices, expect, test, type Page } from '@playwright/test';

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
