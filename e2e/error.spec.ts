import { expect, test, type Page } from '@playwright/test';
import { openDebug, startAt, storedSave, writeScene } from './helpers';

/** 書き込みを失敗させる */
const failWrites = (page: Page) => page.evaluate(() => {
  Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
});

test.describe('エラーの出し方', () => {
  test('TC-0012-06 メッセージ欄のある画面で書き込みに失敗すると、メッセージ欄の場所に ErrorPanel が出て「再試行」にフォーカス', async ({ page }, info) => {
    const press = (target: ReturnType<Page['locator']>) => (info.project.name === 'desktop' ? target.click() : target.tap());
    const scenes: { name: string; open: () => Promise<void>; act: () => Promise<void> }[] = [
      {
        name: '宿屋',
        open: () => startAt(page, 'INN'),
        act: () => press(page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' })),
      },
      {
        name: 'ダンジョン',
        // ErrorPanel はメッセージ欄より背が高く、低い画面では疑似3D が縮んで上に詰まる（TD-0003 §6）。高さに余裕を持たせて場所を比べる
        open: async () => {
          await page.setViewportSize({ width: page.viewportSize()!.width, height: 1100 });
          await startAt(page, 'DUNGEON');
        },
        act: () => press(page.getByRole('button', { name: '前進', exact: true })),
      },
      {
        name: '戦闘',
        open: () => startAt(page, 'BATTLE'),
        act: () => press(page.getByRole('menu', { name: '戦闘' }).getByRole('menuitem').filter({ hasText: 'たたかう' })),
      },
      {
        name: '名前入力',
        open: async () => {
          // プレイ中の状態があると名前入力を開けないので、保存を消してから開き直す
          // （# 以降だけ違う URL へは読み込み直さずに移るので、いったん空のページへ移る）
          await page.evaluate(() => localStorage.clear());
          await page.goto('about:blank');
          await page.goto('./?debug=1#/new');
          await expect(page.locator('body')).toHaveAttribute('data-screen', 'new');
        },
        act: async () => {
          await page.getByRole('textbox', { name: 'なまえ' }).fill('ゆうしゃ');
          await press(page.getByRole('menu', { name: 'なまえ入力' }).getByRole('menuitem').filter({ hasText: '決定' }));
        },
      },
    ];
    for (const s of scenes) {
      await s.open();
      const top = await page.getByTestId('message-window').evaluate((e) => e.getBoundingClientRect().top);
      await failWrites(page);
      await s.act();
      const panel = page.getByTestId('error-panel');
      await expect(panel, s.name).toBeVisible();
      await expect(page.getByTestId('message-window')).toHaveCount(0);
      await expect(panel.locator('.wiz-window-title')).toContainText('エラー');
      await expect(panel).toHaveAttribute('data-variant', 'danger');
      await expect(panel.getByRole('alert')).toHaveText('きろくを よみかき できません');
      await expect(panel.getByRole('menuitem').filter({ hasText: '再試行' })).toBeFocused();
      // ErrorPanel は見出し「エラー」つきのウィンドウで、見出しの分の余白（margin-top）を上に取る。余白を含めた上の端を比べる
      const panelTop = await panel.evaluate((e) => e.getBoundingClientRect().top - parseFloat(getComputedStyle(e).marginTop));
      expect(Math.abs(panelTop - top), s.name).toBeLessThanOrEqual(1);
    }
  });

  test('TC-0012-07 タイトルで書き込みに失敗すると、ErrorPanel がメニューの下に出る', async ({ page }, info) => {
    await openDebug(page);
    await writeScene(page, { save: storedSave() });
    const menu = page.getByRole('menu', { name: 'タイトル' });
    await expect(menu.getByRole('menuitem').filter({ hasText: 'ゆうしゃ Lv1' })).toBeVisible();
    // 書き込みを失敗させる
    await page.evaluate(() => {
      Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
    });
    const cont = menu.getByRole('menuitem').filter({ hasText: 'つづきから' });
    if (info.project.name === 'desktop') await cont.click();
    else await cont.tap();

    const panel = page.getByTestId('error-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute('data-variant', 'danger');
    await expect(panel.getByRole('alert')).toHaveText('きろくを よみかき できません');
    await expect(panel.getByRole('menuitem')).toContainText('再試行');
    const menuBottom = await menu.evaluate((el) => el.getBoundingClientRect().bottom);
    const panelTop = await panel.evaluate((el) => el.getBoundingClientRect().top);
    expect(panelTop).toBeGreaterThan(menuBottom);
    await expect(menu).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
  });

  test('TC-0012-10 プレイ中の状態が壊れていても、#/inn を開くとエラーを出さずにタイトルが出る', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('mini-wiz-game-game', '{broken'));
    await page.goto('./?debug=1#/inn');
    await page.waitForURL(/#\/$/);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    await expect(page.locator('body')).toHaveAttribute('data-location', 'none');
    await expect(page.getByTestId('error-panel')).toHaveCount(0);
  });
});
