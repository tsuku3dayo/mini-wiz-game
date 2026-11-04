import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { cursorLabel, menuLabels, startAt, swapInventory } from './helpers';

// TC-0030 の準備：所持品 50 個（ショートソード［N］）、落ちている個体 ミスリルソード［UR］（こうげき +28）、thenClear: false（startAt の SWAP の既定）

async function press(info: TestInfo, target: Locator) {
  if (info.project.name === 'desktop') await target.click();
  else await target.tap();
}
const row = (page: Page, menu: string, text: string) => page.getByRole('menu', { name: menu, exact: true }).getByRole('menuitem').filter({ hasText: text });
const confirmText = (page: Page) => page.getByTestId('confirm').locator('.wiz-confirm-text');
const hash = (page: Page) => new URL(page.url()).hash;

test.describe('入れ替えの画面', () => {
  test('TC-0030-03 場所 SWAP のとき #/inn などを開くと #/swap に移り、再読み込みしても同じ「おちている」の個体で 2 択に戻る', async ({ page }) => {
    await startAt(page, 'SWAP');
    expect(hash(page)).toBe('#/swap');
    for (const h of ['#/inn', '#/dungeon', '#/battle']) {
      await page.goto(`./?debug=1${h}`);
      await page.waitForURL(/#\/swap$/);
      await expect(page.locator('body')).toHaveAttribute('data-screen', 'swap');
    }
    const before = await page.getByTestId('swap-drop').locator('.wiz-item-name').textContent();
    expect(before).toBe('ミスリルソード［UR］');
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'swap');
    expect(hash(page)).toBe('#/swap');
    await expect(page.getByTestId('swap-drop').locator('.wiz-item-name')).toHaveText(before!);
    expect(await menuLabels(page, 'いれかえ')).toEqual(['ひろう（すてるものを えらぶ）', 'あきらめる']);
  });

  test('TC-0030-04 画面名「いれかえ」・見出し「もちものが いっぱいだ」・「おちている：」と ItemLabel・2 択（カーソルは ひろう）・メッセージ欄。Esc では閉じない', async ({ page }, info) => {
    await startAt(page, 'SWAP');
    await expect(page.locator('h1')).toHaveText('いれかえ');
    await expect(page.getByTestId('swap-window').locator('.wiz-window-title')).toContainText('もちものが いっぱいだ');
    const drop = page.getByTestId('swap-drop');
    await expect(drop.locator('.swap-drop-lead')).toHaveText('おちている：');
    await expect(drop.locator('.wiz-item-name')).toHaveText('ミスリルソード［UR］');
    expect(await drop.locator('.wiz-item-bonus').allTextContents()).toEqual(['こうげき +28']);
    await expect(drop.locator('.wiz-item-name')).toHaveCSS('color', 'rgb(255, 140, 26)');
    expect(await menuLabels(page, 'いれかえ')).toEqual(['ひろう（すてるものを えらぶ）', 'あきらめる']);
    expect(await cursorLabel(page, 'いれかえ')).toBe('ひろう（すてるものを えらぶ）');
    await expect(row(page, 'いれかえ', 'ひろう')).toBeFocused();
    await expect(page.getByTestId('message-window')).toBeVisible();
    if (info.project.name === 'desktop') {
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu', { name: 'いれかえ' })).toBeVisible();
      await expect(page.locator('body')).toHaveAttribute('data-screen', 'swap');
    }
  });

  test('TC-0030-06 ひろう → 一覧 → 確認 → はい でダンジョン。あきらめる → 確認 → はい でダンジョン。いいえ・Esc・もどる で 1 つ前へ。ボスの後は はい でクリア', async ({ page }, info) => {
    const desktop = info.project.name === 'desktop';
    const confirm = (text: string) => row(page, 'かくにん', text);

    // ひろう の流れ
    await startAt(page, 'SWAP');
    await press(info, row(page, 'いれかえ', 'ひろう'));
    const list = page.getByRole('menu', { name: 'もちもの', exact: true });
    await expect(list).toBeVisible();
    // 一覧の もどる で 2 択へ
    await press(info, row(page, 'もちもの', 'もどる'));
    expect(await cursorLabel(page, 'いれかえ')).toBe('ひろう（すてるものを えらぶ）');
    if (desktop) {
      await page.keyboard.press('Enter');
      await expect(list).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu', { name: 'いれかえ' })).toBeVisible();
    }
    await press(info, row(page, 'いれかえ', 'ひろう'));
    // 先頭の個体（id 50）を選ぶ
    await press(info, list.getByRole('menuitem').nth(1));
    await expect(confirmText(page)).toHaveText('ショートソード［N］を すてて ミスリルソード［UR］を ひろいますか？');
    expect(await cursorLabel(page, 'かくにん')).toBe('いいえ');
    await press(info, confirm('いいえ'));
    await expect(list).toBeVisible();
    expect(await list.locator('.wiz-menu-item.active [data-testid="item-label"]').getAttribute('data-item-id')).toBe('50');
    if (desktop) {
      await page.keyboard.press('Enter');
      await expect(confirmText(page)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(list).toBeVisible();
    }
    await press(info, list.getByRole('menuitem').nth(1));
    await press(info, confirm('はい'));
    await page.waitForURL(/#\/dungeon$/);
    await expect(page.locator('body')).toHaveAttribute('data-location', 'DUNGEON');

    // あきらめる の流れ
    await startAt(page, 'SWAP');
    await press(info, row(page, 'いれかえ', 'あきらめる'));
    await expect(confirmText(page)).toHaveText('ミスリルソード［UR］を あきらめますか？');
    await press(info, confirm('いいえ'));
    expect(await cursorLabel(page, 'いれかえ')).toBe('あきらめる');
    if (desktop) {
      await page.keyboard.press('Enter');
      await expect(confirmText(page)).toBeVisible();
      await page.keyboard.press('Escape');
      expect(await cursorLabel(page, 'いれかえ')).toBe('あきらめる');
    }
    await press(info, row(page, 'いれかえ', 'あきらめる'));
    await press(info, confirm('はい'));
    await page.waitForURL(/#\/dungeon$/);

    // ボスの後（thenClear）：はい でクリア
    await startAt(page, 'SWAP', { state: { inventory: swapInventory(true), records: { battles: 30, kills: 25, deaths: 1, laps: 2, bossKills: 1 } } });
    await press(info, row(page, 'いれかえ', 'あきらめる'));
    await press(info, confirm('はい'));
    await page.waitForURL(/#\/clear$/);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'clear');
  });
});
