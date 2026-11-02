import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { cursorLabel, logLines, startAt } from './helpers';

/** ダンジョンのメニューを開き、メニューの部品を返す */
async function openDungeonMenu(page: Page, info: TestInfo) {
  const button = page.getByRole('button', { name: '≡ メニュー' });
  if (info.project.name === 'desktop') await button.click();
  else await button.tap();
  return page.getByRole('menu', { name: 'メニュー' });
}

const statusLine = (page: Page) => page.getByTestId('status-panel').locator('.wiz-status-compact');

test.describe('メニューとコマンド', () => {
  test('TC-0010-02 ↑↓ でカーソルが動いて端で止まる（タイトル・宿屋・戦闘）。Enter でも Space でも決まる', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    const active = (label: string) => page.getByRole('menu', { name: label }).locator('.wiz-menu-item.active');
    const expectAt = async (label: string, text: string) => {
      expect(await cursorLabel(page, label)).toBe(text);
      await expect(active(label)).toBeFocused();
      await expect(active(label)).toHaveAttribute('tabindex', '0');
    };

    await startAt(page, 'INN');
    await expectAt('宿屋', 'やすむ');
    for (let i = 0; i < 2; i += 1) await page.keyboard.press('ArrowUp');
    await expectAt('宿屋', 'やすむ');
    for (let i = 0; i < 6; i += 1) await page.keyboard.press('ArrowDown');
    await expectAt('宿屋', 'タイトルへ戻る');
    await page.keyboard.press('ArrowUp');
    await expectAt('宿屋', 'ダンジョンへ');

    // Enter と Space
    await startAt(page, 'INN');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('HP と MP が かいふくした');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press(' ');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('セーブしました');

    // タイトル・戦闘でも、端で止まる（プレイ中の状態があるとタイトルは宿屋に移るので、保存を消してから開く）
    await page.evaluate(() => localStorage.clear());
    await page.goto('about:blank');
    await page.goto('./');
    await expectAt('タイトル', 'はじめから');
    await page.keyboard.press('ArrowUp');
    await expectAt('タイトル', 'はじめから');
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown');
    await expectAt('タイトル', 'おと：オフ');
    await startAt(page, 'BATTLE');
    await expectAt('戦闘', 'たたかう');
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown');
    await expectAt('戦闘', 'にげる');
  });

  test('TC-0010-04 ダンジョンで MP 2 のとき「ヒール」は無効。選ぶと「MP が たりない」が通常の色で出て、ゲーム API を呼ばない', async ({ page }, info) => {
    await startAt(page, 'DUNGEON', { state: { mp: 2 } });
    const menu = await openDungeonMenu(page, info);
    const heal = menu.getByRole('menuitem').filter({ hasText: 'ヒール' });
    await expect(heal).toHaveAttribute('aria-disabled', 'true');
    expect(await cursorLabel(page, 'メニュー')).toBe('ヒール');
    await page.evaluate(() => {
      const w = window as Window & { __busyCount?: number };
      w.__busyCount = 0;
      new MutationObserver(() => { if (document.body.dataset.busy === 'true') w.__busyCount! += 1; })
        .observe(document.body, { attributes: true, attributeFilter: ['data-busy'] });
    });
    if (info.project.name === 'desktop') await page.keyboard.press('Enter');
    else await heal.tap({ force: true });
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('MP が たりない');
    await expect(page.locator('[role="log"] .wiz-line').last()).toHaveCSS('color', 'rgb(232, 220, 192)');
    expect(await page.evaluate(() => (window as Window & { __busyCount?: number }).__busyCount)).toBe(0);
    await expect(statusLine(page)).toContainText('MP  2/ 10');
  });

  test('TC-0021-03 ダンジョンのメニューの「ヒール」で回復し、メニューは開いたまま、カーソルは「ヒール」のまま', async ({ page }, info) => {
    await startAt(page, 'DUNGEON', { state: { level: 3, exp: 72, hp: 10, maxHp: 46, mp: 10, maxMp: 16 } });
    const menu = await openDungeonMenu(page, info);
    expect(await cursorLabel(page, 'メニュー')).toBe('ヒール');
    const heal = menu.getByRole('menuitem').filter({ hasText: 'ヒール' });
    if (info.project.name === 'desktop') await heal.click();
    else await heal.tap();
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('ゆうしゃは ヒールを となえた！ HP が 30 かいふくした');
    await expect(statusLine(page)).toContainText('HP 40/ 46');
    await expect(statusLine(page)).toContainText('MP  7/ 16');
    await expect(menu).toBeVisible();
    expect(await cursorLabel(page, 'メニュー')).toBe('ヒール');
  });

  test('TC-0021-04 MP 2 のとき「ヒール」は無効で初めのカーソル。選ぶと「MP が たりない」、HP・MP は変わらない', async ({ page }, info) => {
    await startAt(page, 'DUNGEON', { state: { level: 3, exp: 72, hp: 10, maxHp: 46, mp: 2, maxMp: 16 } });
    const menu = await openDungeonMenu(page, info);
    const heal = menu.getByRole('menuitem').filter({ hasText: 'ヒール' });
    await expect(heal).toHaveAttribute('aria-disabled', 'true');
    expect(await cursorLabel(page, 'メニュー')).toBe('ヒール');
    if (info.project.name === 'desktop') await heal.click({ force: true });
    else await heal.tap({ force: true });
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('MP が たりない');
    await expect(statusLine(page)).toContainText('HP 10/ 46');
    await expect(statusLine(page)).toContainText('MP  2/ 16');
  });

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

  test('TC-0010-10 確認を開くとフォーカスは「いいえ」。Tab・Shift+Tab で外へ出ない。Esc で宿屋のメニューに戻る', async ({ page }, info) => {
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
