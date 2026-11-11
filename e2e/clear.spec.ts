import { expect, test } from '@playwright/test';
import { logLines, startAt, storedInn } from './helpers';

const lv15 = { level: 15, exp: 2584, hp: 80, maxHp: 120, mp: 20, maxMp: 40 };

test.describe('ゲームクリア', () => {
  test('TC-0024-07 見出しと、クリアの文・名前と Lv・セーブした（緑）・周目（紫）がこの順に出る。自動セーブしなかったとき・版 2 のクリア状態では「スロットが いっぱいなので セーブしなかった」（副文字色）', async ({ page }) => {
    // 自動セーブしたクリア：最後に使ったスロットがある（v1.14）
    await startAt(page, 'CLEARED', { state: { ...lv15, saveSlot: 1 } });
    expect(new URL(page.url()).hash).toBe('#/clear');
    await expect(page.locator('h1')).toHaveText('暗黒のネクロマンサーを たおした');
    const lines = page.locator('.clear-line');
    await expect(lines).toHaveText([
      '暗黒のネクロマンサーは ほろび、ダンジョンに 平和が もどった',
      'ゆうしゃ Lv15',
      'ぼうけんの きろくを セーブした',
      '2 周目へ すすむ',
    ]);
    await expect(lines.nth(2)).toHaveCSS('color', 'rgb(92, 214, 92)');
    await expect(lines.nth(3)).toHaveCSS('color', 'rgb(167, 123, 217)');

    // 3 スロットとも埋まっていて最後に使ったスロットもない → 自動セーブしなかった（v1.14）
    // 版 2 で保存されたクリア状態（自動セーブの前の版）も同じ
    for (const state of [
      storedInn({ ...lv15, location: 'CLEARED', saveSlot: null, records: { battles: 30, kills: 25, deaths: 1, laps: 2, bossKills: 1 } }),
      storedInn({ ...lv15, location: 'CLEARED', schemaVersion: 2, saveSlot: undefined, records: undefined, inventory: undefined }),
    ]) {
      await page.evaluate((s) => window.__wiz!.writeState(s), state);
      await page.reload();
      await expect(page.locator('body')).toHaveAttribute('data-screen', 'clear');
      await expect(page.locator('.clear-line')).toHaveCount(4);
      await expect(page.getByText('ぼうけんの きろくを セーブした')).toHaveCount(0);
      const notSaved = page.locator('.clear-line').nth(2);
      await expect(notSaved).toHaveText('スロットが いっぱいなので セーブしなかった');
      await expect(notSaved).toHaveCSS('color', 'rgb(163, 155, 139)');
    }
  });

  test('TC-0025-02 「宿屋へ」で宿屋に移り「ゆうしゃは 宿屋に もどった」。HP・MP はクリア画面の前と同じ', async ({ page }, info) => {
    await startAt(page, 'CLEARED', { state: lv15 });
    const item = page.getByRole('menu', { name: 'ゲームクリア' }).getByRole('menuitem').filter({ hasText: '宿屋へ' });
    if (info.project.name === 'desktop') await item.click();
    else await item.tap();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
    expect(new URL(page.url()).hash).toBe('#/inn');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('ゆうしゃは 宿屋に もどった');
    await expect(page.getByTestId('status-hp')).toContainText(' 80/120');
    await expect(page.getByTestId('status-panel').locator('dt', { hasText: /^MP$/ }).locator('xpath=following-sibling::dd[1]')).toContainText(' 20/ 40');
  });
});
