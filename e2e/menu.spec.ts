import { expect, test } from '@playwright/test';
import { cursorLabel, logLines, startAt } from './helpers';

test.describe('メニューとコマンド', () => {
  test('TC-0010-03 メニューの行をタップすると、その行にカーソルが移って決まる（宿屋の「セーブ」）', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'タッチのテストはスマートフォンだけ');
    await startAt(page, 'INN');
    const save = page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'セーブ' });
    await save.tap();
    await expect.poll(() => logLines(page)).toEqual(['セーブしました']);
    expect(await cursorLabel(page, '宿屋')).toBe('セーブ');
  });

  test('TC-0010-05 セーブがないときに無効の「つづきから」を決定しても、何も出ない', async ({ page }, info) => {
    await page.goto('./');
    const cont = page.getByRole('menu', { name: 'タイトル' }).getByRole('menuitem').filter({ hasText: 'つづきから' });
    await expect(cont).toHaveAttribute('aria-disabled', 'true');
    // 画面の文字（押した行にカーソルの ▶ が移るので除く）
    const screenText = async () => (await page.locator('body').innerText()).replace(/[▶\s]/g, '');
    const before = await screenText();
    // 無効の項目は押せるようになるのを待たずに押す
    if (info.project.name === 'desktop') await cont.click({ force: true });
    else await cont.tap({ force: true });
    await page.waitForTimeout(300);
    await expect(page.getByRole('log')).toHaveCount(0);
    expect(await screenText()).toBe(before);
  });

  test('TC-0010-07 メニューで Esc を押すと閉じて、宿屋は「メニュー」の行、ダンジョンは「≡ メニュー」のボタンにフォーカスが戻る', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await startAt(page, 'INN');
    const innMenu = page.getByRole('menu', { name: '宿屋' });
    await innMenu.getByRole('menuitem').filter({ hasText: 'メニュー' }).click();
    await expect(page.getByRole('menu', { name: 'メニュー' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'メニュー' })).toHaveCount(0);
    await expect(innMenu.getByRole('menuitem').filter({ hasText: 'メニュー' })).toBeFocused();

    await startAt(page, 'DUNGEON');
    const button = page.getByRole('button', { name: '≡ メニュー' });
    await button.click();
    await expect(page.getByRole('menu', { name: 'メニュー' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'メニュー' })).toHaveCount(0);
    await expect(button).toBeFocused();
  });

  test('TC-0010-10確認を開くとフォーカスは「いいえ」。Tab・Shift+Tab で外へ出ない。Esc で宿屋のメニューに戻る', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await startAt(page, 'INN');
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'タイトルへ戻る' }).click();
    const confirm = page.getByRole('menu', { name: 'かくにん' });
    await expect(confirm.getByRole('menuitem').filter({ hasText: 'いいえ' })).toBeFocused();
    const inside = () => confirm.evaluate((menu) => menu.contains(document.activeElement));
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('Tab');
      expect(await inside()).toBe(true);
    }
    for (let i = 0; i < 5; i += 1) {
      await page.keyboard.press('Shift+Tab');
      expect(await inside()).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: '宿屋' })).toBeVisible();
    await expect(confirm).toHaveCount(0);
    expect(await cursorLabel(page, '宿屋')).toBe('タイトルへ戻る');
  });
});
