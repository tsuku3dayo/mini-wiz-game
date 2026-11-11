import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { cursorLabel, openDebug, startAt, storedSave, writeScene } from './helpers';
import { failWrites } from './scenes';

const title = (page: Page) => page.getByRole('menu', { name: 'タイトル' });
const item = (page: Page, text: string) => title(page).getByRole('menuitem').filter({ hasText: text });

test.describe('タイトル', () => {
  test('TC-0006-01 見出しの中のタイトル画像・メニュー（はじめから・つづきから・おと：オフ・クレジット）・インストール・版。メッセージ欄はない', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('h1 img')).toHaveAttribute('src', 'title/title.png');
    await expect(title(page)).toHaveAttribute('role', 'menu');
    expect((await title(page).getByRole('menuitem').allTextContents()).map((t) => t.replace(/^[▶\s]/, ''))).toEqual(['はじめから', 'つづきから', 'おと：オフ', 'クレジット']);
    await expect(page.getByRole('button', { name: 'インストール', exact: true })).toBeVisible();
    await expect(page.getByText('v1.0')).toBeVisible();
    await expect(page.getByRole('log')).toHaveCount(0);
  });

  test('TC-0006-09 タイトル画像の alt と見出しの名前が「WIZミニ ～死霊術師の迷宮～」。width・height があり、読み込まれている。飾り線・副題の文字はない', async ({ page }) => {
    await page.goto('./');
    const img = page.locator('h1 img');
    await expect(img).toHaveAttribute('alt', 'WIZミニ ～死霊術師の迷宮～');
    await expect(page.getByRole('heading', { level: 1, name: 'WIZミニ ～死霊術師の迷宮～' })).toBeVisible();
    await expect(img).toHaveAttribute('width', '1080');
    await expect(img).toHaveAttribute('height', '720');
    await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBe(1080);
    await expect(page.locator('.deco')).toHaveCount(0);
    await expect(page.getByText('～ 死霊術師の迷宮 ～')).toHaveCount(0);
  });

  test('TC-0006-10 画像の大きさ：375×667 で 359×239.3、414×715 で 398×265.3、1280×800 で 450×300（3：2、最大 450）。中央にある', async ({ page }) => {
    for (const [w, h, iw, ih] of [[375, 667, 359, 239.33], [414, 715, 398, 265.33], [1280, 800, 450, 300]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.goto('about:blank');
      await page.goto('./');
      const img = page.locator('h1 img');
      await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBe(1080);
      const box = await img.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return { w: r.width, h: r.height, left: r.left, right: window.innerWidth - r.right };
      });
      expect(Math.abs(box.w - iw), `${w}×${h} 幅`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(box.h - ih), `${w}×${h} 高さ`).toBeLessThanOrEqual(0.5);
      expect(Math.abs(box.left - box.right), `${w}×${h} 中央`).toBeLessThanOrEqual(1);
    }
  });

  test.describe('タイトル画像が読めないとき', () => {
    // Service Worker が保存したファイルを先に出すと、止めたつもりの読み込みが止まらない（SDD-PROCESS §8「05 テスト」）
    test.use({ serviceWorkers: 'block' });
    test('TC-0006-11 画像を読めなくすると、画像が消えて文字の「WIZミニ」と副題が出る。エラーは出ない', async ({ page }) => {
      await page.route('**/title/title.png', (r) => r.abort());
      await page.goto('./');
      await expect(page.locator('h1 img')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('WIZミニ');
      await expect(page.getByText('～ 死霊術師の迷宮 ～')).toBeVisible();
      await expect(page.getByTestId('error-panel')).toHaveCount(0);
      await expect(title(page)).toBeVisible();
    });
  });

  test('TC-0001-02 ページの題名は「WIZミニ ～死霊術師の迷宮～」で、html の lang は ja', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle('WIZミニ ～死霊術師の迷宮～');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  });

  test('TC-0001-01 保存もキャッシュもない新しいブラウザで開くと、登録なしでタイトルが出て「はじめから」が押せる', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    const start = item(page, 'はじめから');
    await expect(start).toBeVisible();
    await expect(start).not.toHaveAttribute('aria-disabled', 'true');
    await expect(title(page)).not.toHaveAttribute('aria-disabled', 'true');
    await context.close();
  });

  test('TC-0006-03 どれかのスロットにセーブがあるとき、「つづきから」にカーソルとフォーカスがあり、行の文字は「つづきから」だけ', async ({ page }) => {
    await openDebug(page);
    // スロット 1 は空き、スロット 2 にだけセーブ（v1.14）
    await writeScene(page, { saves: { 2: storedSave({ level: 12 }) } });
    const cont = item(page, 'つづきから');
    await expect(cont).not.toHaveAttribute('aria-disabled', 'true');
    expect(await cursorLabel(page, 'タイトル')).toBe('つづきから');
    await expect(cont).not.toContainText('ゆうしゃ');
    await expect(cont).toBeFocused();
    await expect(cont).toHaveAttribute('tabindex', '0');
  });

  test('TC-0006-14 つづきから のスロットの一覧とエラーの枠を出しても、縦にはみ出さない（375×667・414×715・1366×657）', async ({ page }, info) => {
    const size = info.project.name === 'desktop' ? { width: 1366, height: 657 } : info.project.name === 'small' ? { width: 375, height: 667 } : { width: 414, height: 715 };
    await page.setViewportSize(size);
    await openDebug(page);
    await writeScene(page, { saves: { 1: storedSave({ level: 15 }), 2: storedSave({ name: 'アルドアルドアル', level: 99 }), 3: storedSave() } });
    await item(page, 'つづきから').click();
    const list = page.getByRole('menu', { name: 'つづきから' });
    await expect(list).toBeVisible();
    await expect(page.getByTestId('save-slot-window').locator('.wiz-window-title')).toContainText('つづきから');
    // 書き込みを失敗させてスロットを選ぶ → 一覧の下にエラーの枠
    await failWrites(page);
    await list.getByRole('menuitem').filter({ hasText: 'スロット1' }).click();
    await expect(page.getByTestId('error-panel')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(overflow, `${size.width}×${size.height}`).toBeLessThanOrEqual(0);
  });

  test('TC-0006-04 セーブがないとき、カーソルは「はじめから」。「つづきから」は無効の色で、選んでも何も起きない', async ({ page }, info) => {
    await page.goto('./');
    await expect(title(page)).toBeVisible();
    expect(await cursorLabel(page, 'タイトル')).toBe('はじめから');
    const cont = item(page, 'つづきから');
    await expect(cont).toHaveAttribute('aria-disabled', 'true');
    await expect(cont).toHaveCSS('color', 'rgb(140, 133, 122)');

    // data-busy が true になったら数える
    await page.evaluate(() => {
      const w = window as Window & { __busyCount?: number };
      w.__busyCount = 0;
      new MutationObserver(() => { if (document.body.dataset.busy === 'true') w.__busyCount! += 1; })
        .observe(document.body, { attributes: true, attributeFilter: ['data-busy'] });
    });
    // 画面の文字（カーソルの ▶ は動くので除く）
    const screenText = async () => (await page.locator('body').innerText()).replace(/[▶\s]/g, '');
    if (info.project.name === 'desktop') {
      await page.keyboard.press('ArrowDown');
      await expect(cont).toBeFocused();
    }
    const textBefore = await screenText();
    if (info.project.name === 'desktop') await page.keyboard.press('Enter');
    // 無効の項目は押せるようになるのを待たずに押す
    else await cont.tap({ force: true });
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    expect(new URL(page.url()).hash).toBe('#/');
    expect(await page.evaluate(() => (window as Window & { __busyCount?: number }).__busyCount)).toBe(0);
    await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true');
    expect(await screenText()).toBe(textBefore);
  });

  test('TC-0006-05 「はじめから」を決定すると、#/new の名前入力になる', async ({ page }) => {
    await page.goto('./');
    await item(page, 'はじめから').click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'new');
    expect(new URL(page.url()).hash).toBe('#/new');
  });

  test('TC-0006-06 プレイ中のゲームがないとき、ほかの画面のハッシュはタイトルに置き換わる。#/new は名前入力、#/credits はクレジットのまま', async ({ context }) => {
    const base = await historyLengthOf(context, '#/');
    for (const hash of ['#/inn', '#/dungeon', '#/battle', '#/clear', '#/swap', '#/nothing', '']) {
      const page = await context.newPage();
      await page.goto(`./?debug=1${hash}`);
      await page.waitForURL(/#\/$/);
      await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
      // 置き換えなので、履歴はふつうに開いたときと同じ数
      expect(await page.evaluate(() => history.length), hash).toBe(base);
      await page.close();
    }
    for (const [hash, screen] of [['#/new', 'new'], ['#/credits', 'credits']]) {
      const page = await context.newPage();
      await page.goto(`./?debug=1${hash}`);
      await expect(page.locator('body')).toHaveAttribute('data-screen', screen);
      expect(new URL(page.url()).hash).toBe(hash);
      await page.close();
    }
  });

  test('TC-0006-07 プレイ中のゲームの場所が INN・DUNGEON・BATTLE・CLEARED・SWAP のとき、どのハッシュを開いても、その場所の画面のハッシュになる', async ({ page }) => {
    const places = [['INN', 'inn', '#/inn'], ['DUNGEON', 'dungeon', '#/dungeon'], ['BATTLE', 'battle', '#/battle'], ['CLEARED', 'clear', '#/clear'], ['SWAP', 'swap', '#/swap']] as const;
    for (const [location, screen, expected] of places) {
      await startAt(page, location);
      for (const hash of ['#/', '#/new', '#/credits', '#/inn', '#/dungeon', '#/battle', '#/clear', '#/swap', '#/nothing']) {
        await page.goto(`./?debug=1${hash}`);
        await page.waitForURL((url) => url.hash === expected);
        await expect(page.locator('body'), `${location} ${hash}`).toHaveAttribute('data-screen', screen);
      }
    }
  });

  test('TC-0006-08 プレイ中のゲーム（宿屋）があるとき、#/nothing を開くと #/inn の宿屋になり、履歴は増えない', async ({ page, context }) => {
    await startAt(page, 'INN');
    const base = await historyLengthOf(context, '#/inn');
    const next = await context.newPage();
    await next.goto('./?debug=1#/nothing');
    await next.waitForURL(/#\/inn$/);
    await expect(next.locator('body')).toHaveAttribute('data-screen', 'inn');
    expect(await next.evaluate(() => history.length)).toBe(base);
  });
});

/** 新しいタブで、置き換えの起きないハッシュを開いたときの履歴の数（新しいタブは空のページの分を最初から持つ） */
async function historyLengthOf(context: BrowserContext, hash: string): Promise<number> {
  const page = await context.newPage();
  await page.goto(`./?debug=1${hash}`);
  await page.locator('body[data-screen]:not([data-screen=""])').waitFor({ state: 'attached' });
  const n = await page.evaluate(() => history.length);
  await page.close();
  return n;
}
