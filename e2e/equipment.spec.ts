import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { cursorLabel, shownLabels, startAt, storedInventory, storedItem } from './helpers';

// TC-0028 の準備：ぶき・よろい・アクセを付け、たては空き。所持品に ぶき 3 個（強い・同じ段階で補正値違い・弱い）と もう 1 つの ソロモンのゆびわ。
// 補正値は、仕様書 v1.21 の範囲で出る値にする（範囲の外は読み込みで直される。§8.3）。ソロモンのゆびわは こうげき・ぼうぎょ・かいひ の 3 つ
const scene = {
  attack: 18, defense: 15, speed: 12, hp: 60, maxHp: 60, mp: 20, maxMp: 20,
  inventory: storedInventory({
    equipped: {
      weapon: storedItem(1, 'weapon4', 'SR', 13),
      armor: storedItem(2, 'armor3', 'N', 5),
      accessory: storedItem(3, 'accessory8', 'LG', 30),
    },
    items: [
      storedItem(4, 'weapon5', 'SR', 18),
      storedItem(5, 'weapon4', 'R', 12),
      storedItem(6, 'weapon1', 'R', 3),
      storedItem(7, 'accessory8', 'LG', 32),
    ],
  }),
};

const SLOTS = 'そうび';

async function press(info: TestInfo, target: Locator) {
  if (info.project.name === 'desktop') await target.click();
  else await target.tap();
}
const row = (page: Page, menu: string, text: string) => page.getByRole('menu', { name: menu, exact: true }).getByRole('menuitem').filter({ hasText: text });
const ability = (page: Page, stat: string) => page.getByTestId(`ability-${stat}`);
const abilityTexts = (page: Page) => page.getByTestId('ability-window').locator('.wiz-ability-value').allTextContents();

/** 宿屋の「メニュー」→「そうび」 */
async function openFromInn(page: Page, info: TestInfo) {
  await press(info, row(page, '宿屋', 'メニュー'));
  await press(info, row(page, 'メニュー', 'そうび'));
  await expect(page.locator('h1')).toHaveText('そうび');
}

test.describe('装備画面', () => {
  test('TC-0028-02 宿屋・ダンジョンのメニューの「そうび」で開き、枠の一覧（カーソルは ぶき）と のうりょく 6 行（かいひ を含む）が出る。メッセージ欄はない。もどるで元の画面', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    const left = page.getByTestId('equipment-window');
    await expect(left.locator('.wiz-window-title')).toContainText('そうび');
    await expect(page.getByTestId('ability-window').locator('.wiz-window-title')).toContainText('のうりょく');
    expect(await shownLabels(page, SLOTS)).toEqual([
      'もどる',
      'ぶき ロングソード［SR］ こうげき +13',
      'よろい チェインメイル［N］ ぼうぎょ +5',
      'たて ―― なし ――',
      'アクセ ソロモンのゆびわ［LG］ こうげき +30 ぼうぎょ +30 かいひ +30',
    ]);
    expect((await cursorLabel(page, SLOTS)).startsWith('ぶき')).toBe(true);
    await expect(row(page, SLOTS, 'ぶき')).toBeFocused();
    expect(await page.getByTestId('ability-window').locator('.wiz-ability-name').allTextContents()).toEqual(['こうげき', 'ぼうぎょ', 'すばやさ', 'かいひ', 'さいだいHP', 'さいだいMP']);
    expect(await abilityTexts(page)).toEqual([' 61 =  18 + 43', ' 50 =  15 + 35', ' 12 =  12 + 0', ' 42 =  12 + 30', ' 60 =  60 + 0', ' 20 =  20 + 0']);
    await expect(page.locator('[data-testid="message-window"]')).toHaveCount(0);
    // 装備名はレアリティの色、空き枠は副文字色
    await expect(row(page, SLOTS, 'アクセ').locator('.wiz-item-name')).toHaveCSS('color', 'rgb(255, 77, 109)');
    await expect(row(page, SLOTS, 'たて').locator('.wiz-item-none')).toHaveCSS('color', 'rgb(163, 155, 139)');

    await press(info, row(page, SLOTS, 'もどる'));
    await expect(page.locator('h1')).toHaveText('宿屋');
    await expect(row(page, '宿屋', 'メニュー')).toBeFocused();

    // ダンジョンの「≡ メニュー」からも開ける
    await startAt(page, 'DUNGEON', { state: scene });
    await press(info, page.getByRole('button', { name: '≡ メニュー' }));
    await press(info, row(page, 'メニュー', 'そうび'));
    await expect(page.locator('h1')).toHaveText('そうび');
    await expect(page.locator('[data-testid="message-window"]')).toHaveCount(0);
    await press(info, row(page, SLOTS, 'もどる'));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    await expect(page.getByRole('button', { name: '≡ メニュー' })).toBeFocused();
  });

  test('TC-0028-04 候補を選ぶと確認なしですぐ付け替わり、枠の一覧に戻ってその部位の行と のうりょく が変わる', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    await press(info, row(page, SLOTS, 'ぶき'));
    await press(info, row(page, 'ぶき', 'バスタードソード［SR］'));
    await expect(page.getByRole('menu', { name: SLOTS, exact: true })).toBeVisible();
    await expect(page.getByRole('menu', { name: 'かくにん' })).toHaveCount(0);
    await expect(page.getByTestId('confirm')).toHaveCount(0);
    expect((await shownLabels(page, SLOTS))[1]).toBe('ぶき バスタードソード［SR］ こうげき +18');
    expect(await cursorLabel(page, SLOTS)).toContain('ぶき');
    await expect(ability(page, 'attack').locator('.wiz-ability-value')).toHaveText(' 66 =  18 + 48');
    // 前の個体は所持品に戻り、候補に出る
    await press(info, row(page, SLOTS, 'ぶき'));
    await expect(row(page, 'ぶき', 'ロングソード［SR］')).toHaveCount(1);
  });

  test('TC-0028-09 枠を選ぶと「つよい じゅん」の候補の一覧（もどる・はずす・強い順）で、カーソルは 2 行目。候補 0 個は「もっていない」と もどる だけ。もどるで枠へ、もう一度で閉じる', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    await press(info, row(page, SLOTS, 'ぶき'));
    const left = page.getByTestId('equipment-window');
    await expect(left.locator('.wiz-window-title')).toContainText('ぶき');
    await expect(left.getByText('つよい じゅん')).toBeVisible();
    expect(await shownLabels(page, 'ぶき')).toEqual([
      'もどる',
      'はずす',
      'バスタードソード［SR］ こうげき +18',
      'ロングソード［R］ こうげき +12',
      'ショートソード［R］ こうげき +3',
    ]);
    expect(await cursorLabel(page, 'ぶき')).toBe('はずす');
    await expect(row(page, 'ぶき', 'はずす')).toBeFocused();

    // もどる で枠の一覧へ（カーソルは ぶき）
    await press(info, row(page, 'ぶき', 'もどる'));
    expect((await cursorLabel(page, SLOTS)).startsWith('ぶき')).toBe(true);

    // たて：候補 0 個
    await press(info, row(page, SLOTS, 'たて'));
    await expect(left.getByText('もっていない')).toBeVisible();
    expect(await shownLabels(page, 'たて')).toEqual(['もどる']);
    expect(await cursorLabel(page, 'たて')).toBe('もどる');

    if (info.project.name === 'desktop') {
      // Esc：候補 → 枠の一覧 → 閉じる
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu', { name: SLOTS, exact: true })).toBeVisible();
      expect((await cursorLabel(page, SLOTS)).startsWith('たて')).toBe(true);
      await page.keyboard.press('Escape');
    } else {
      await press(info, row(page, 'たて', 'もどる'));
      await press(info, row(page, SLOTS, 'もどる'));
    }
    await expect(page.locator('h1')).toHaveText('宿屋');
  });

  test('TC-0028-11 候補にカーソルを合わせると、上がる行は緑の「↑」、下がる行は橙の「↓」。ほかの行と「もどる」では内訳', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    await press(info, row(page, SLOTS, 'ぶき'));
    await expect(row(page, 'ぶき', 'はずす')).toBeFocused();

    // 強い候補（+18。今は +13）
    await page.keyboard.press('ArrowDown');
    expect(await cursorLabel(page, 'ぶき')).toContain('バスタードソード［SR］');
    await expect(ability(page, 'attack').locator('.wiz-ability-value')).toHaveText(' 61 →  66 ↑');
    await expect(ability(page, 'attack')).toHaveCSS('color', 'rgb(92, 214, 92)');
    expect((await abilityTexts(page)).slice(1)).toEqual([' 50 =  15 + 35', ' 12 =  12 + 0', ' 42 =  12 + 30', ' 60 =  60 + 0', ' 20 =  20 + 0']);
    await expect(ability(page, 'defense')).toHaveCSS('color', 'rgb(232, 220, 192)');

    // 弱い候補（+3）
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await cursorLabel(page, 'ぶき')).toContain('ショートソード［R］');
    await expect(ability(page, 'attack').locator('.wiz-ability-value')).toHaveText(' 61 →  51 ↓');
    await expect(ability(page, 'attack')).toHaveCSS('color', 'rgb(255, 167, 38)');

    // もどる：全部内訳に戻る
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowUp');
    expect(await cursorLabel(page, 'ぶき')).toBe('もどる');
    expect(await abilityTexts(page)).toEqual([' 61 =  18 + 43', ' 50 =  15 + 35', ' 12 =  12 + 0', ' 42 =  12 + 30', ' 60 =  60 + 0', ' 20 =  20 + 0']);
    await expect(ability(page, 'attack')).toHaveCSS('color', 'rgb(232, 220, 192)');
  });

  test('TC-0028-14 ソロモンのゆびわの補正は「こうげき +30」「ぼうぎょ +30」「かいひ +30」の 3 つの要素で、要素の途中で折り返さず枠の中。候補にすると こうげき・ぼうぎょ・かいひ の 3 行が「↑」', async ({ page }, info) => {
    await startAt(page, 'INN', { state: scene });
    await openFromInn(page, info);
    const bonuses = row(page, SLOTS, 'アクセ').locator('.wiz-item-bonus');
    expect(await bonuses.allTextContents()).toEqual(['こうげき +30', 'ぼうぎょ +30', 'かいひ +30']);
    // 各要素は 1 行に収まり（高さが 1 行分）、ウィンドウの枠の中にある（v1.21：補正が 3 つになった）
    const frame = (await page.getByTestId('equipment-window').boundingBox())!;
    for (const box of await Promise.all((await bonuses.all()).map((b) => b.boundingBox()))) {
      expect(box!.height).toBeLessThan(16 * 1.6 * 1.5);
      expect(box!.x).toBeGreaterThanOrEqual(frame.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(frame.x + frame.width);
    }

    await press(info, row(page, SLOTS, 'アクセ'));
    expect(await shownLabels(page, 'アクセ')).toEqual(['もどる', 'はずす', 'ソロモンのゆびわ［LG］ こうげき +32 ぼうぎょ +32 かいひ +32']);
    await page.keyboard.press('ArrowDown');
    expect(await cursorLabel(page, 'アクセ')).toContain('ソロモンのゆびわ［LG］');
    await expect(ability(page, 'attack').locator('.wiz-ability-value')).toHaveText(' 61 →  63 ↑');
    await expect(ability(page, 'defense').locator('.wiz-ability-value')).toHaveText(' 50 →  52 ↑');
    await expect(ability(page, 'evasion').locator('.wiz-ability-value')).toHaveText(' 42 →  44 ↑');
    await expect(ability(page, 'attack')).toHaveAttribute('data-change', 'up');
    await expect(ability(page, 'defense')).toHaveAttribute('data-change', 'up');
    await expect(ability(page, 'evasion')).toHaveAttribute('data-change', 'up');
    await expect(ability(page, 'speed')).not.toHaveAttribute('data-change', /./);
  });
});
