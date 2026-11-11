import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { audioEvents, cursorLabel, logLines, menuLabels, openDebug, recordAudio, startAt, storedSave, writeScene } from './helpers';

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
    for (const name of ['Lv', 'EXP', 'HP', 'MP', 'こうげき', 'ぼうぎょ', 'すばやさ', 'かいひ']) {
      await expect(status.locator('dt', { hasText: name }).first()).toBeVisible();
    }
    const tops = await Promise.all([status, page.getByRole('log'), innMenu(page)].map((l) => l.evaluate((el) => el.getBoundingClientRect().top)));
    expect(tops[0]).toBeLessThan(tops[1]);
    expect(tops[1]).toBeLessThan(tops[2]);
    // 並び（v1.14）
    expect(await menuLabels(page, '宿屋')).toEqual(['やすむ', 'メニュー', 'ダンジョンへ', 'セーブ', 'タイトルへ戻る']);
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

  test('TC-0022-09 宿屋のステータス（full）：狭い画面は見出しが名前で 3 桁右揃え、補正があれば「 (+n)」。広い画面は見出し「ステータス」と「なまえ」の行', async ({ page }, info) => {
    const lv3 = { level: 3, exp: 80, hp: 25, maxHp: 46, mp: 10, maxMp: 16, attack: 7, defense: 7, speed: 7 };
    await startAt(page, 'INN', { state: lv3 });
    const status = page.getByTestId('status-panel');
    const values = async () => {
      const dts = await status.locator('dt').allTextContents();
      const dds = await status.locator('dd').allTextContents();
      return Object.fromEntries(dts.map((t, i) => [t, dds[i]]));
    };
    if (info.project.name === 'desktop') {
      await expect(status.locator('.wiz-window-title')).toContainText('ステータス');
      expect((await values()).なまえ).toBe('ゆうしゃ');
    } else {
      await expect(status.locator('.wiz-window-title')).toContainText('ゆうしゃ');
    }
    expect(await values()).toMatchObject({ Lv: '  3', EXP: ' 80（つぎまで 64）', HP: ' 25/ 46', MP: ' 10/ 16', こうげき: '  7', ぼうぎょ: '  7', すばやさ: '  7', かいひ: '  0' });

    // さいだいHP +15 のアクセを付けると「 25/ 61 (+15)」。たて（かいひ +6）は「  6」で「 (+n)」は付かない（v1.14）
    const life = { id: 1, itemId: 'accessory4', rarity: 'R', value: 15 };
    const shield = { id: 2, itemId: 'shield5', rarity: 'R', value: 6 };
    await startAt(page, 'INN', { state: { ...lv3, inventory: { equipped: { weapon: null, armor: null, shield, accessory: life }, items: [], nextId: 3, pending: null } } });
    expect(await values()).toMatchObject({ HP: ' 25/ 61 (+15)', かいひ: '  6' });
  });

  test('TC-0008-07 経験値 72・Lv1 で「やすむ」と、回復の行に続けてレベルアップの行が出て、演出と levelUp の音が出る。Lv「  3」・EXP「 72（つぎまで 72）」', async ({ page }, info) => {
    // 演出を見るので、動きを減らす設定を外す
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await recordAudio(page);
    await startAt(page, 'INN', { state: { exp: 72, hp: 10 } });
    await choose(page, info, innItem(page, 'やすむ'));
    // 1 行目は回復の行。続く行は逐次に出る（メッセージ欄は折り返しのぶん古い行が見えなくなるので、最初と最後で確かめる）
    await expect.poll(async () => (await logLines(page))[0]).toBe('HP と MP が かいふくした');
    // レベルアップの行で StatusPanel が光る
    await expect(page.getByTestId('status-panel')).toHaveClass(/level-up/);
    await expect(page.getByRole('log')).toContainText('レベルが あがった！ Lv2');
    const growth = /^HP \+\d+ MP \+\d+ こうげき \+\d+ ぼうぎょ \+\d+ すばやさ \+\d+$/;
    await expect.poll(async () => (await logLines(page)).at(-1), { timeout: 10_000 }).toMatch(growth);
    await expect.poll(async () => (await logLines(page)).at(-2), { timeout: 10_000 }).toBe('レベルが あがった！ Lv3');
    expect((await audioEvents(page)).filter((e) => e.name === 'levelUp')).toHaveLength(2);
    const status = page.getByTestId('status-panel');
    const dd = (name: string) => status.locator('dt', { hasText: new RegExp(`^${name}$`) }).locator('xpath=following-sibling::dd[1]');
    await expect(dd('Lv')).toHaveText('  3');
    await expect(dd('EXP')).toHaveText(' 72（つぎまで 72）');
  });

  test('TC-0022-11 経験値が次のレベル以上なら EXP の行は「（やどで レベルアップ）」。やすむ と「（つぎまで …）」に戻る', async ({ page }, info) => {
    // GameView の expToNext が 0 になること（max(0, …)）は単体テスト（TC-0022-12）で確かめている
    await startAt(page, 'INN', { state: { exp: 30 } });
    const status = page.getByTestId('status-panel');
    const exp = status.locator('dt', { hasText: /^EXP$/ }).locator('xpath=following-sibling::dd[1]');
    await expect(exp).toHaveText(' 30（やどで レベルアップ）');
    // 狭い画面のステータス画面でも同じ
    if (info.project.name !== 'desktop') {
      await choose(page, info, innItem(page, 'メニュー'));
      await choose(page, info, page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: 'ステータス' }));
      await expect(page.locator('dt', { hasText: /^EXP$/ }).locator('xpath=following-sibling::dd[1]')).toHaveText(' 30（やどで レベルアップ）');
      await choose(page, info, page.getByRole('menu', { name: 'ステータス' }).getByRole('menuitem').filter({ hasText: 'もどる' }));
    }
    await choose(page, info, innItem(page, 'やすむ'));
    // Lv2（24）に上がり、Lv3（72）まで 42
    await expect(exp).toHaveText(' 30（つぎまで 42）');
  });

  test('TC-0026-06 広い画面の宿屋に「ステータス」（なまえ・補正つき）と「じっせき」が横に並び、メニューは もどる・そうび・もちもの・おと：オフ（ステータスなし）', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', '広い画面のテストは desktop だけ');
    const inventory = {
      equipped: { weapon: { id: 1, itemId: 'weapon4', rarity: 'R', value: 10 }, armor: null, shield: null, accessory: { id: 2, itemId: 'accessory4', rarity: 'R', value: 15 } },
      items: [],
      nextId: 3,
      pending: null,
    };
    const records = { battles: 128, kills: 120, deaths: 3, laps: 2, bossKills: 1 };
    await startAt(page, 'INN', { state: { level: 3, exp: 80, hp: 25, maxHp: 46, mp: 10, maxMp: 16, attack: 7, defense: 7, speed: 7, records, inventory } });
    const status = page.getByTestId('status-panel');
    await expect(status.locator('.wiz-window-title')).toContainText('ステータス');
    expect(await status.locator('dt').allTextContents()).toEqual(['なまえ', 'Lv', 'EXP', 'HP', 'MP', 'こうげき', 'ぼうぎょ', 'すばやさ', 'かいひ']);
    expect(await status.locator('dd').allTextContents()).toEqual(['ゆうしゃ', '  3', ' 80（つぎまで 64）', ' 25/ 61 (+15)', ' 10/ 16', ' 17 (+10)', '  7', '  7', '  0']);
    const rec = page.getByTestId('records-window');
    await expect(rec.locator('.wiz-window-title')).toContainText('じっせき');
    expect(await rec.locator('dd').allTextContents()).toEqual(['128 回', '120 体', '3 回', '2 周目', '1 回']);
    const tops = await Promise.all([status, rec].map((l) => l.evaluate((e) => Math.round(e.getBoundingClientRect().top))));
    expect(tops[0]).toBe(tops[1]);
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' }).click();
    expect(await menuLabels(page, 'メニュー')).toEqual(['もどる', 'そうび', 'もちもの', 'おと：オフ']);
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
