import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { cursorLabel, logLines, shortSwords, startAt, storedInventory, storedItem, swapInventory } from './helpers';

// TC-0029 の準備：所持品 23 個（ショートソード［R］と、部位がばらばらの個体）。
// 段階 8 の エクスカリバー［LG］18 個は弱い順の最後に並ぶので、前の 5 個が一覧の上に来る
const mixed = [
  storedItem(1, 'weapon1', 'R', 2),
  storedItem(2, 'shield1', 'N', 1),
  storedItem(3, 'armor1', 'N', 1),
  storedItem(4, 'accessory1', 'R', 3),
  storedItem(5, 'weapon4', 'SR', 12),
];
const excaliburs = Array.from({ length: 18 }, (_, i) => storedItem(6 + i, 'weapon8', 'LG', 60));
const scene = { inventory: storedInventory({ items: [...mixed, ...excaliburs] }) };
/** 弱い順（段階 1：補正 1 の 2 個は名前の逆順 → 補正 2 → 補正 3、段階 4、段階 8） */
const WEAK = ['クロースアーマー［N］', 'ウッドシールド［N］', 'ショートソード［R］', 'ガードリング［R］', 'ロングソード［SR］', ...Array(18).fill('エクスカリバー［LG］')];

async function press(info: TestInfo, target: Locator) {
  if (info.project.name === 'desktop') await target.click();
  else await target.tap();
}
const list = (page: Page) => page.getByRole('menu', { name: 'もちもの', exact: true });
const row = (page: Page, menu: string, text: string) => page.getByRole('menu', { name: menu, exact: true }).getByRole('menuitem').filter({ hasText: text });
const names = (page: Page) => list(page).locator('.wiz-item-name').allTextContents();
const count = (page: Page) => page.getByTestId('item-count');
const filterName = (page: Page) => page.getByTestId('filter-name');

async function openFromInn(page: Page, info: TestInfo) {
  await press(info, row(page, '宿屋', 'メニュー'));
  await press(info, row(page, 'メニュー', 'もちもの'));
  await expect(page.locator('h1')).toHaveText('もちもの');
}

test.describe('もちもの画面', () => {
  test('TC-0029-01 宿屋・ダンジョンのメニューの「もちもの」で開き、1 行目が「もちもの 23／50」。50 個は橙と「！」、0 個は「なにも もっていない」と もどる だけ。メッセージ欄はない', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    await expect(page.getByTestId('inventory-window').locator('.wiz-window-title')).toContainText('もちもの');
    await expect(count(page)).toHaveText('もちもの 23／50');
    await expect(count(page)).toHaveCSS('color', 'rgb(232, 220, 192)');
    await expect(page.locator('[data-testid="message-window"]')).toHaveCount(0);
    // 一覧の先頭は もどる、カーソルは その次
    await expect(list(page).getByRole('menuitem').first()).toHaveText(/もどる/);
    expect(await cursorLabel(page, 'もちもの')).toContain('クロースアーマー［N］');

    await startAt(page, 'INN', { state: { inventory: storedInventory({ items: shortSwords(50, 1) }) } });
    await openFromInn(page, info);
    await expect(count(page)).toHaveText('もちもの 50／50！');
    await expect(count(page)).toHaveCSS('color', 'rgb(255, 167, 38)');

    await startAt(page, 'DUNGEON');
    await press(info, page.getByRole('button', { name: '≡ メニュー' }));
    await press(info, row(page, 'メニュー', 'もちもの'));
    await expect(page.locator('h1')).toHaveText('もちもの');
    await expect(count(page)).toHaveText('もちもの 0／50');
    await expect(page.getByText('なにも もっていない')).toBeVisible();
    await expect(list(page).getByRole('menuitem')).toHaveCount(1);
    await expect(list(page).getByRole('menuitem')).toHaveText(/もどる/);
    await expect(page.locator('[data-testid="message-window"]')).toHaveCount(0);
    await press(info, row(page, 'もちもの', 'もどる'));
    await expect(page.getByRole('button', { name: '≡ メニュー' })).toBeFocused();
  });

  test('TC-0029-03 もちもの画面と入れ替えの画面の一覧で「よわい じゅん」が出て、弱い順に並ぶ', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    await expect(page.getByTestId('inventory-window').getByText('よわい じゅん')).toBeVisible();
    expect(await names(page)).toEqual(WEAK);

    // 入れ替えの画面：所持品 50 個（上の 23 個と ショートソード［N］27 個）
    const inv = swapInventory();
    await startAt(page, 'SWAP', { state: { inventory: { ...inv, items: [...mixed, ...excaliburs, ...shortSwords(27, 24)] } } });
    await press(info, row(page, 'いれかえ', 'ひろう'));
    await expect(page.getByTestId('swap-window').getByText('よわい じゅん')).toBeVisible();
    // 段階 1・補正 1 の 3 種は名前の逆順（ショートソード → クロースアーマー → ウッドシールド）。ショートソード［N］27 個は id の大きい順
    const swapNames = await names(page);
    expect(swapNames).toEqual([...Array(27).fill('ショートソード［N］'), ...WEAK]);
    const ids = await list(page).getByTestId('item-label').evaluateAll((labels) => labels.slice(0, 27).map((l) => Number(l.getAttribute('data-item-id'))));
    expect(ids).toEqual(Array.from({ length: 27 }, (_, i) => 50 - i));
  });

  test('TC-0029-04 ▶ で すべて → ぶき → よろい → たて → アクセ → すべて、◀ で逆。「すべて」のときだけ部位が出る。◀▶ は 44px 以上で Tab で止まらず、名前は aria-live', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    const prev = page.getByRole('button', { name: 'まえの しぼりこみ' });
    const next = page.getByRole('button', { name: 'つぎの しぼりこみ' });
    await expect(filterName(page)).toHaveText('すべて');
    await expect(filterName(page)).toHaveAttribute('aria-live', 'polite');
    for (const b of [prev, next]) {
      await expect(b).toHaveAttribute('tabindex', '-1');
      const box = (await b.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    // すべて：各行に部位
    expect(await list(page).locator('.wiz-item-slot').count()).toBe(23);
    await expect(row(page, 'もちもの', 'ショートソード［R］').locator('.wiz-item-slot')).toHaveText('［ぶき］');

    const seen: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      await press(info, next);
      seen.push((await filterName(page).textContent()) ?? '');
      if (i === 0) {
        // ぶき：部位は出さず、ぶきだけ
        expect(await list(page).locator('.wiz-item-slot').count()).toBe(0);
        expect(await names(page)).toEqual(['ショートソード［R］', 'ロングソード［SR］', ...Array(18).fill('エクスカリバー［LG］')]);
      }
    }
    expect(seen).toEqual(['ぶき', 'よろい', 'たて', 'アクセ', 'すべて']);
    await press(info, prev);
    await expect(filterName(page)).toHaveText('アクセ');
    expect(await names(page)).toEqual(['ガードリング［R］']);
  });

  test('TC-0029-05 一覧にフォーカスがあるとき、→ で次、← で前のしぼりこみに循環する', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    await expect(row(page, 'もちもの', 'クロースアーマー［N］')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(filterName(page)).toHaveText('ぶき');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(filterName(page)).toHaveText('アクセ');
    // しぼりこみを替えても一覧にフォーカスが残る（カーソルは もどる の次）
    await expect(row(page, 'もちもの', 'ガードリング［R］')).toBeFocused();
  });

  test('TC-0029-06 個体を選ぶと「〇〇を すてますか？」（カーソルは いいえ）。いいえ・Esc で同じ個体に戻り、はい で捨てて「もちもの 22／50」。閉じるとメッセージ欄に「〇〇を すてた」', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    const target = () => row(page, 'もちもの', 'ショートソード［R］');
    const confirm = page.getByRole('menu', { name: 'かくにん' });

    await press(info, target());
    await expect(page.getByTestId('confirm').locator('.wiz-window-title')).toContainText('かくにん');
    await expect(page.getByTestId('inventory-window')).toHaveCount(0);
    await expect(page.getByTestId('confirm')).toContainText('ショートソード［R］を すてますか？');
    expect(await cursorLabel(page, 'かくにん')).toBe('いいえ');
    await press(info, confirm.getByRole('menuitem').filter({ hasText: 'いいえ' }));
    expect(await cursorLabel(page, 'もちもの')).toContain('ショートソード［R］');
    await expect(target()).toBeFocused();

    if (info.project.name === 'desktop') {
      await page.keyboard.press('Enter');
      await expect(confirm).toBeVisible();
      await page.keyboard.press('Escape');
      expect(await cursorLabel(page, 'もちもの')).toContain('ショートソード［R］');
    }

    await press(info, target());
    await press(info, confirm.getByRole('menuitem').filter({ hasText: 'はい' }));
    await expect(count(page)).toHaveText('もちもの 22／50');
    await expect(target()).toHaveCount(0);
    await press(info, row(page, 'もちもの', 'もどる'));
    await expect(page.locator('h1')).toHaveText('宿屋');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('ショートソード［R］を すてた');
  });
});
