import { expect, test, type Page } from '@playwright/test';
import { logLines, openDebug, readStorage, storedSave, writeScene } from './helpers';

const input = (page: Page) => page.getByRole('textbox', { name: 'なまえ' });
const decide = (page: Page) => page.getByRole('menu', { name: 'なまえ入力' }).getByRole('menuitem').filter({ hasText: '決定' });
const help = (page: Page) => page.locator('.wiz-input-help');

/** ゲームのない状態で名前入力を開く */
async function openNameEntry(page: Page): Promise<void> {
  await page.goto('./?debug=1#/new');
  await expect(page.locator('body')).toHaveAttribute('data-screen', 'new');
}

test.describe('名前入力', () => {
  test('TC-0007-06 規則に合わない名前では「決定」が無効で、入力欄の下とメッセージ欄に理由が出る', async ({ page }, info) => {
    await openNameEntry(page);
    await expect(input(page)).toBeFocused();
    // 空：決定は無効、エラーの文は出さない
    await expect(decide(page)).toHaveAttribute('aria-disabled', 'true');
    expect((await help(page).textContent())?.trim()).toBe('');
    await expect(page.locator('.wiz-input-count')).toHaveText('0/8');

    await input(page).fill('a<b');
    await expect(decide(page)).toHaveAttribute('aria-disabled', 'true');
    await expect(help(page)).toHaveText('つかえない もじが ふくまれています');
    await expect(page.locator('.wiz-input-count')).toHaveText('3/8');

    // maxLength=8 は手入力を止めるので、値を直接入れて input を送る
    await input(page).fill('');
    await input(page).evaluate((el: HTMLInputElement) => {
      el.value = 'ゆうしゃアルド12';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(help(page)).toHaveText('名前は1〜8文字で入力してください');
    await expect(page.locator('.wiz-input-count')).toHaveText('9/8');
    await expect(decide(page)).toHaveAttribute('aria-disabled', 'true');

    // 無効の項目は押せるようになるのを待たずに押す
    if (info.project.name === 'desktop') await decide(page).click({ force: true });
    else await decide(page).tap({ force: true });
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('名前は1〜8文字で入力してください');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'new');
  });

  test('TC-0007-07 IME の変換中の Enter では決定しない。変換していない Enter で宿屋に移る', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await openNameEntry(page);
    await input(page).fill('ゆうしゃ');
    await input(page).evaluate((el) => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'new');
    await input(page).press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
  });

  test('TC-0007-07 入力欄で Esc を押すと、タイトル（#/）に戻る', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await openNameEntry(page);
    await input(page).press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    expect(new URL(page.url()).hash).toBe('#/');
  });

  test('TC-0007-08 「ゆうしゃ」で決定すると宿屋に移り、「ゆうしゃの ぼうけんが はじまった」が出る。セーブは変わらない', async ({ page }, info) => {
    await openDebug(page);
    await writeScene(page, { save: storedSave({ level: 7 }) });
    const [, saveBefore] = await readStorage(page);
    await page.evaluate(() => { location.hash = '#/new'; });
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'new');
    await input(page).fill('ゆうしゃ');
    if (info.project.name === 'desktop') await decide(page).click();
    else await decide(page).tap();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('ゆうしゃの ぼうけんが はじまった');
    const [, saveAfter] = await readStorage(page);
    expect(saveAfter).toBe(saveBefore);
  });

  test('TC-0007-10 キーボードを出したときの高さ（414 × 400）でも、入力欄と「決定」が見え、横にはみ出さない', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 400 });
    await openNameEntry(page);
    for (const target of [input(page), decide(page)]) {
      const box = await target.evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect);
      expect(box.bottom).toBeLessThanOrEqual(400);
      expect(box.top).toBeGreaterThanOrEqual(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    const size = await input(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
  });
});
