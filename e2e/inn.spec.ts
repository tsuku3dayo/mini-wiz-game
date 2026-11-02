import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { cursorLabel, logLines, menuLabels, openDebug, startAt, storedSave, writeScene } from './helpers';

const innMenu = (page: Page) => page.getByRole('menu', { name: '宿屋' });
const innItem = (page: Page, text: string) => innMenu(page).getByRole('menuitem').filter({ hasText: text });
const confirmMenu = (page: Page) => page.getByRole('menu', { name: 'かくにん' });

/** タップできる端末ではタップ、PC ではクリック */
async function choose(page: Page, info: TestInfo, target: ReturnType<Page['locator']>) {
  if (info.project.name === 'desktop') await target.click();
  else await target.tap();
}

test.describe('宿屋', () => {
  test('TC-0008-01 狭い画面では、ステータス → メッセージ欄 → 宿屋のメニューの順に並び、カーソルは「やすむ」', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 715 });
    await startAt(page, 'INN');
    const status = page.getByTestId('status-panel');
    await expect(status.locator('.wiz-window-title')).toContainText('ゆうしゃ');
    for (const name of ['Lv', 'EXP', 'HP', 'MP', 'こうげき', 'ぼうぎょ', 'すばやさ']) {
      await expect(status.locator('dt', { hasText: name }).first()).toBeVisible();
    }
    const tops = await Promise.all([status, page.getByRole('log'), innMenu(page)].map((l) => l.evaluate((el) => el.getBoundingClientRect().top)));
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThan(tops[2]);
    expect(await menuLabels(page, '宿屋')).toEqual(['やすむ', 'セーブ', 'メニュー', 'ダンジョンへ', 'タイトルへ戻る']);
    expect(await cursorLabel(page, '宿屋')).toBe('やすむ');
  });

  test('TC-0008-03 「やすむ」で HP・MP が最大になり、「HP と MP が かいふくした」が出る。最大のときも選べる', async ({ page }, info) => {
    await startAt(page, 'INN', { state: { hp: 10, maxHp: 46, mp: 1, maxMp: 13 } });
    const hp = page.getByTestId('status-hp');
    await expect(hp).toContainText(' 10/ 46');
    await choose(page, info, innItem(page, 'やすむ'));
    await expect.poll(() => logLines(page)).toEqual(['HP と MP が かいふくした']);
    await expect(hp).toContainText(' 46/ 46');
    await expect(page.getByTestId('status-panel').locator('dt', { hasText: /^MP$/ }).locator('xpath=following-sibling::dd[1]')).toContainText(' 13/ 13');
    await expect(innMenu(page)).not.toHaveAttribute('aria-disabled', 'true');
    await choose(page, info, innItem(page, 'やすむ'));
    await expect.poll(() => logLines(page)).toEqual(['HP と MP が かいふくした', 'HP と MP が かいふくした']);
  });

  test('TC-0009-02 「セーブ」は 2 回とも確認を出さずに「セーブしました」になる', async ({ page }, info) => {
    await startAt(page, 'INN');
    await choose(page, info, innItem(page, 'セーブ'));
    await expect.poll(() => logLines(page)).toEqual(['セーブしました']);
    await expect(confirmMenu(page)).toHaveCount(0);
    await expect(innMenu(page)).not.toHaveAttribute('aria-disabled', 'true');
    await choose(page, info, innItem(page, 'セーブ'));
    await expect.poll(() => logLines(page)).toEqual(['セーブしました', 'セーブしました']);
    await expect(confirmMenu(page)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('mini-wiz-game-save'))).not.toBeNull();
  });

  test('TC-0009-04 タイトルで「つづきから」を決定すると宿屋になり、「ゆうしゃは 宿屋で めをさました」が出る', async ({ page }, info) => {
    await openDebug(page);
    await writeScene(page, { save: storedSave() });
    await choose(page, info, page.getByRole('menu', { name: 'タイトル' }).getByRole('menuitem').filter({ hasText: 'つづきから' }));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('ゆうしゃは 宿屋で めをさました');
  });

  test('TC-0009-05 「タイトルへ戻る」で確認に替わり、いいえ で戻る（カーソルは タイトルへ戻る）、はい でタイトルになりプレイ中の状態が消える', async ({ page }, info) => {
    await startAt(page, 'INN');
    await choose(page, info, innItem(page, 'タイトルへ戻る'));
    const confirm = page.locator('.wiz-confirm');
    await expect(confirm.locator('.wiz-window-title')).toContainText('かくにん');
    await expect(confirm).toContainText('プレイ中の ぼうけんは きえます。よろしいですか？');
    expect(await menuLabels(page, 'かくにん')).toEqual(['はい', 'いいえ']);
    expect(await cursorLabel(page, 'かくにん')).toBe('いいえ');
    await expect(innMenu(page)).toHaveCount(0);

    await choose(page, info, confirmMenu(page).getByRole('menuitem').filter({ hasText: 'いいえ' }));
    await expect(innMenu(page)).toBeVisible();
    expect(await cursorLabel(page, '宿屋')).toBe('タイトルへ戻る');

    await choose(page, info, innItem(page, 'タイトルへ戻る'));
    await choose(page, info, confirmMenu(page).getByRole('menuitem').filter({ hasText: 'はい' }));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    expect(await page.evaluate(() => localStorage.getItem('mini-wiz-game-game'))).toBeNull();
  });

  test('TC-0009-06 確認で Esc を押すと宿屋のメニューに戻り、カーソルとフォーカスが「タイトルへ戻る」にある', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await startAt(page, 'INN');
    const before = await page.evaluate(() => localStorage.getItem('mini-wiz-game-game'));
    await innItem(page, 'やすむ').focus();
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown');
    await expect(innItem(page, 'タイトルへ戻る')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(confirmMenu(page).getByRole('menuitem').filter({ hasText: 'いいえ' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(innItem(page, 'タイトルへ戻る')).toBeFocused();
    expect(await cursorLabel(page, '宿屋')).toBe('タイトルへ戻る');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
    expect(await page.evaluate(() => localStorage.getItem('mini-wiz-game-game'))).toBe(before);
  });
});
