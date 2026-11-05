import { devices, expect, test, type Page } from '@playwright/test';
import { battleOf, dungeonMap, readStorage, startAt, storedInn, storedSave, swapInventory, writeScene } from './helpers';

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

  test('TC-0004-02 帯を出していても、ダンジョン・戦闘・入れ替え・クリア・名前入力では見えない。1F の入口から宿屋へ戻るとまた出る', async ({ page }) => {
    const banner = page.locator('#update-banner');
    const screen = (name: string) => expect(page.locator('body')).toHaveAttribute('data-screen', name);
    await startAt(page, 'INN');
    await page.evaluate(() => window.__wiz!.showUpdateBanner());
    await expect(banner).toBeVisible();

    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'ダンジョンへ' }).click();
    await screen('dungeon');
    await expect(banner).toBeHidden();

    // 戦闘・入れ替え・クリア（読み込み直さずに状態だけ書き替える）
    const scenes: [Record<string, unknown>, string][] = [
      [{ location: 'BATTLE', dungeon: dungeonMap({ x: 4, y: 4 }), battle: battleOf('goblin', 18) }, 'battle'],
      [{ location: 'SWAP', dungeon: dungeonMap({ x: 4, y: 4 }), inventory: swapInventory() }, 'swap'],
      [{ location: 'CLEARED' }, 'clear'],
    ];
    for (const [state, name] of scenes) {
      await writeScene(page, { state: storedInn(state) });
      await screen(name);
      await expect(banner, name).toBeHidden();
    }

    // 1F の入口から「宿屋へ戻る」
    await writeScene(page, { state: storedInn({ location: 'DUNGEON', dungeon: dungeonMap({ x: 0, y: 9 }) }) });
    await screen('dungeon');
    await page.getByRole('button', { name: '宿屋へ戻る' }).click();
    await screen('inn');
    await expect(banner).toBeVisible();

    // 名前入力（タイトルへ戻ってから「はじめから」）
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'タイトルへ戻る' }).click();
    await page.getByRole('menu', { name: 'かくにん' }).getByRole('menuitem').filter({ hasText: 'はい' }).click();
    await screen('title');
    await expect(banner).toBeVisible();
    await page.getByRole('menu', { name: 'タイトル' }).getByRole('menuitem').filter({ hasText: 'はじめから' }).click();
    await screen('new');
    await expect(banner).toBeHidden();
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

/** Service Worker が動き出し、このページを受け持つまで待つ（初めて開いたページは受け持たないので、1 回読み込み直す） */
async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

const slimeBattle = () => storedInn({ location: 'BATTLE', dungeon: dungeonMap({ x: 4, y: 4 }), battle: battleOf('slime', 12) });
const enemyImg = (page: Page) => page.getByTestId('enemy-image-frame').locator('img');
const imgLoaded = (page: Page) => expect.poll(() => enemyImg(page).evaluate((e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth)).toBe(256);
const menuItem = (page: Page, menu: string, text: string) => page.getByRole('menu', { name: menu }).getByRole('menuitem').filter({ hasText: text });

/** タイトル →「はじめから」→ 名前「ゆうしゃ」で決定 → 宿屋 */
async function newGame(page: Page) {
  await menuItem(page, 'タイトル', 'はじめから').click();
  await page.getByRole('textbox', { name: 'なまえ' }).fill('ゆうしゃ');
  await menuItem(page, 'なまえ入力', '決定').click();
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
}

test.describe('このアプリの外と通信しない・通信なしで遊べる', () => {
  test('TC-0001-03 タイトルから戦闘（敵の絵）まで、通信はすべて同じオリジンの GET で、フォントと音声ファイルを読まない', async ({ page }) => {
    const requests: { url: string; method: string }[] = [];
    page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
    await page.goto('./?debug=1');
    await newGame(page);
    await menuItem(page, '宿屋', 'ダンジョンへ').click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    await page.evaluate((s) => window.__wiz!.writeState(s), slimeBattle());
    await imgLoaded(page);
    const origin = await page.evaluate(() => location.origin);
    expect(requests.length).toBeGreaterThan(0);
    expect(requests.filter((r) => new URL(r.url).origin !== origin)).toEqual([]);
    expect(requests.filter((r) => r.method !== 'GET')).toEqual([]);
    expect(requests.filter((r) => /\.(woff2?|ttf|otf|mp3|ogg|wav|m4a)(\?|$)/i.test(r.url))).toEqual([]);
    expect(requests.some((r) => r.url.endsWith('enemies/slime.png'))).toBe(true);
  });

  test('TC-0001-04 遊んで「おと：オン」にしたあと、localStorage のキーはすべて mini-wiz-game- で、sessionStorage のキーはすべて mini-wiz-game: で始まる', async ({ page }) => {
    await page.goto('./?debug=1');
    await newGame(page);
    await menuItem(page, '宿屋', 'セーブ').click();
    await expect.poll(async () => (await page.locator('[role="log"] .wiz-line').allTextContents()).at(-1)).toBe('セーブしました');
    await menuItem(page, '宿屋', 'メニュー').click();
    await menuItem(page, 'メニュー', 'おと：オフ').click();
    await expect(menuItem(page, 'メニュー', 'おと：')).toHaveText(/おと：オン$/);
    const { local, session } = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    expect(local.sort()).toEqual(['mini-wiz-game-game', 'mini-wiz-game-save', 'mini-wiz-game-schema', 'mini-wiz-game-sound']);
    expect(session.every((k) => k.startsWith('mini-wiz-game:'))).toBe(true);
  });

  test('TC-0003-01 一度開いたあと通信を切って読み込み直しても、タイトルから宿屋・ダンジョン・戦闘（敵の絵）・つづきからまで遊べる', async ({ page, context }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('./?debug=1');
    await waitForServiceWorker(page);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    await newGame(page);
    await menuItem(page, '宿屋', 'セーブ').click();
    await expect.poll(async () => (await page.locator('[role="log"] .wiz-line').allTextContents()).at(-1)).toBe('セーブしました');
    await menuItem(page, '宿屋', 'ダンジョンへ').click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    await page.evaluate((s) => window.__wiz!.writeState(s), slimeBattle());
    await imgLoaded(page);
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'battle');
    await imgLoaded(page);
    // 宿屋に戻して「タイトルへ戻る」→「つづきから」
    await page.evaluate((s) => window.__wiz!.writeState(s), storedInn());
    await menuItem(page, '宿屋', 'タイトルへ戻る').click();
    await menuItem(page, 'かくにん', 'はい').click();
    await menuItem(page, 'タイトル', 'つづきから').click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
    await expect.poll(async () => (await page.locator('[role="log"] .wiz-line').allTextContents()).at(-1)).toBe('ゆうしゃは 宿屋で めをさました');
    expect(errors).toEqual([]);
    await context.setOffline(false);
  });

  test('TC-0003-02 Service Worker の事前キャッシュに、index.html・manifest・ビルドの js と css・敵の絵 6 枚が入っている', async ({ page }) => {
    await page.goto('./');
    await waitForServiceWorker(page);
    const urls = await page.evaluate(async () => {
      const all: string[] = [];
      for (const name of await caches.keys()) {
        for (const req of await (await caches.open(name)).keys()) all.push(new URL(req.url).pathname);
      }
      return all;
    });
    const has = (end: string | RegExp) => urls.some((u) => (typeof end === 'string' ? u.endsWith(end) : end.test(u)));
    for (const end of ['/index.html', '/manifest.webmanifest', ...['slime', 'goblin', 'skeleton', 'orc', 'darkKnight', 'necromancer'].map((k) => `/enemies/${k}.png`)]) {
      expect(has(end), end).toBe(true);
    }
    expect(has(/\/assets\/[^/]+\.js$/)).toBe(true);
    expect(has(/\/assets\/[^/]+\.css$/)).toBe(true);
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
    expect(manifest.name).toBe('WIZミニ');
    expect(manifest.short_name).toBe('WIZミニ');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./');
    const has = (sizes: string, purpose: string) => manifest.icons.some((i: { sizes: string; purpose?: string }) => i.sizes === sizes && (i.purpose ?? 'any').includes(purpose));
    expect(has('192x192', 'any')).toBe(true);
    expect(has('512x512', 'any')).toBe(true);
    expect(has('512x512', 'maskable')).toBe(true);
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'WIZミニ');
    const touch = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
    expect((await page.request.get(new URL(touch!, page.url()).href)).status()).toBe(200);
  });
});
