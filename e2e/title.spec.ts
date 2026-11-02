import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { cursorLabel, openDebug, startAt, storedSave, writeScene } from './helpers';

const title = (page: Page) => page.getByRole('menu', { name: 'タイトル' });
const item = (page: Page, text: string) => title(page).getByRole('menuitem').filter({ hasText: text });

test.describe('タイトル', () => {
  test('TC-0001-02 ページの題名は「WIZ ～死霊術師の迷宮～」で、html の lang は ja', async ({ page }) => {
    await page.goto('./');
    await expect(page).toHaveTitle('WIZ ～死霊術師の迷宮～');
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

  test('TC-0006-03 セーブがあるとき、「つづきから」にカーソルとフォーカスがあり、右に「ゆうしゃ Lv12」が出る', async ({ page }) => {
    await openDebug(page);
    await writeScene(page, { save: storedSave({ level: 12 }) });
    const cont = item(page, 'つづきから');
    await expect(cont).toContainText('ゆうしゃ Lv12');
    expect(await cursorLabel(page, 'タイトル')).toMatch(/^つづきから/);
    await expect(cont).toBeFocused();
    await expect(cont).toHaveAttribute('tabindex', '0');
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

  test('TC-0006-06 プレイ中のゲームがないとき、ほかの画面のハッシュはタイトルに置き換わる。#/new は名前入力のまま', async ({ context }) => {
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
    const page = await context.newPage();
    await page.goto('./?debug=1#/new');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'new');
    expect(new URL(page.url()).hash).toBe('#/new');
    await page.close();
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
