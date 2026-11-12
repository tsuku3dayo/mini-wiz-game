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
    // 戦闘はどの画面も横 1 列のボタン（v1.17）なので、カーソルの印が違う
    const active = (label: string) => page.getByRole('menu', { name: label }).locator(label === '戦闘' ? '.command-button.active' : '.wiz-menu-item.active');
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
    // 並び（v1.14）：やすむ／メニュー／ダンジョンへ／セーブ／タイトルへ戻る
    await page.keyboard.press('ArrowUp');
    await expectAt('宿屋', 'セーブ');

    // Enter と Space
    await startAt(page, 'INN');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('HP と MP が かいふくした');
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowDown');
    await expectAt('宿屋', 'セーブ');
    // Space でセーブのスロットの一覧（v1.14）→ Space で空きのスロット1 に書く
    await page.keyboard.press(' ');
    await expectAt('セーブ', 'スロット1　－ なし －');
    await page.keyboard.press(' ');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('スロット1に セーブしました');

    // タイトル・戦闘でも、端で止まる（プレイ中の状態があるとタイトルは宿屋に移るので、保存を消してから開く）
    await page.evaluate(() => localStorage.clear());
    await page.goto('about:blank');
    await page.goto('./');
    await expectAt('タイトル', 'はじめから');
    await page.keyboard.press('ArrowUp');
    await expectAt('タイトル', 'はじめから');
    // v1.12 で「おと」の下に「クレジット」を足したので、下の端は「クレジット」
    for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowDown');
    await expectAt('タイトル', 'クレジット');
    await startAt(page, 'BATTLE');
    await expectAt('戦闘', 'たたかう');
    for (let i = 0; i < 4; i += 1) await page.keyboard.press('ArrowDown');
    await expectAt('戦闘', 'にげる');
  });

  test('TC-0010-08 広い画面のメニューには「ステータス」がなく、宿屋にステータス（1 行目「なまえ ゆうしゃ」）と「じっせき」が出る', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', '広い画面のテストは desktop だけ');
    const records = { battles: 128, kills: 120, deaths: 3, laps: 2, bossKills: 1 };
    await startAt(page, 'INN', { state: { records } });
    const status = page.getByTestId('status-panel');
    await expect(status.locator('.wiz-window-title')).toContainText('ステータス');
    await expect(status.locator('dt').first()).toHaveText('なまえ');
    await expect(status.locator('dd').first()).toHaveText('ゆうしゃ');
    const rec = page.getByTestId('records-window');
    await expect(rec.locator('.wiz-window-title')).toContainText('じっせき');
    await expect(rec).toContainText('このキャラクターの きろく');
    expect(await rec.locator('dt').allTextContents()).toEqual(['そうせんとう', 'とうばつ', 'しぼう', 'しゅうかい', 'ボスとうばつ']);
    expect(await rec.locator('dd').allTextContents()).toEqual(['128 回', '120 体', '3 回', '2 周目', '1 回']);
    // 2 つのウィンドウは横に並ぶ
    const tops = await Promise.all([status, rec].map((l) => l.evaluate((e) => Math.round(e.getBoundingClientRect().top))));
    expect(tops[0]).toBe(tops[1]);

    const labels = async () => (await page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').allTextContents()).map((t) => t.replace(/^[▶\s]/, ''));
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' }).click();
    expect(await labels()).toEqual(['もどる', 'そうび', 'もちもの', 'おと：オフ']);
    await startAt(page, 'DUNGEON');
    await page.getByRole('button', { name: '≡ メニュー' }).click();
    expect(await labels()).toEqual(['もどる', 'ヒール', 'そうび', 'もちもの', 'おと：オフ']);
  });

  test('TC-0010-06 狭い画面のメニュー：宿屋は もどる・そうび・もちもの・ステータス・おと：オフ（カーソルは そうび）、ダンジョンは ヒール を足し、カーソルは ヒール（無効でも）。もどるで閉じる', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', '狭い画面だけの並び');
    const labels = async () => (await page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').allTextContents()).map((t) => t.replace(/^[▶\s]/, ''));
    await startAt(page, 'INN');
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' }).tap();
    expect(await labels()).toEqual(['もどる', 'そうび', 'もちもの', 'ステータス', 'おと：オフ']);
    expect(await cursorLabel(page, 'メニュー')).toBe('そうび');
    await page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: 'もどる' }).tap();
    await expect(page.getByRole('menu', { name: 'メニュー' })).toHaveCount(0);

    await startAt(page, 'DUNGEON', { state: { mp: 2 } });
    const menu = await openDungeonMenu(page, info);
    expect(await labels()).toEqual(['もどる', 'ヒール', 'そうび', 'もちもの', 'ステータス', 'おと：オフ']);
    expect(await cursorLabel(page, 'メニュー')).toBe('ヒール');
    await expect(menu.getByRole('menuitem').filter({ hasText: 'ヒール' })).toHaveAttribute('aria-disabled', 'true');
    await menu.getByRole('menuitem').filter({ hasText: 'もどる' }).tap();
    await expect(page.getByRole('menu', { name: 'メニュー' })).toHaveCount(0);
  });

  test('TC-0010-11 宿屋のメニューの「おと：オフ」で「おと：オン」になり、メニューは開いたまま（カーソルも同じ）、「おとを オンにした」と保存が on。もう一度で元に戻る', async ({ page }, info) => {
    const sound = () => page.evaluate(() => localStorage.getItem('mini-wiz-game-sound'));
    await startAt(page, 'INN');
    const menuItem = page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'メニュー' });
    if (info.project.name === 'desktop') await menuItem.click();
    else await menuItem.tap();
    const menu = page.getByRole('menu', { name: 'メニュー' });
    const toggle = () => menu.getByRole('menuitem').filter({ hasText: 'おと：' });
    for (const [label, line, saved] of [['おと：オン', 'おとを オンにした', 'on'], ['おと：オフ', 'おとを オフにした', 'off']]) {
      if (info.project.name === 'desktop') await toggle().click();
      else await toggle().tap();
      await expect(toggle()).toHaveText(new RegExp(`${label}$`));
      await expect(menu).toBeVisible();
      expect(await cursorLabel(page, 'メニュー')).toBe(label);
      await expect.poll(async () => (await logLines(page)).at(-1)).toBe(line);
      expect(await sound()).toBe(saved);
    }
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
    // セーブのスロットの一覧（v1.14）。スロット2 をタップすると、そこにカーソルが移って決まる
    const slot2 = page.getByRole('menu', { name: 'セーブ' }).getByRole('menuitem').filter({ hasText: 'スロット2' });
    await slot2.tap();
    await expect.poll(() => logLines(page)).toEqual(['スロット2に セーブしました']);
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

  test('TC-0036-03 メニュー・確認を閉じると、フォーカスが開いたもの（宿屋は「メニュー」・ダンジョンはメニューボタン・確認は開いた項目）に戻る', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    const focused = () => page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return (a?.getAttribute('aria-label') ?? a?.textContent ?? '').replace(/^[▶\s]+/, '').trim();
    });
    const innAt = async (text: string) => {
      await expect(page.getByRole('menu', { name: '宿屋' })).toBeVisible();
      await expect.poll(focused).toBe(text);
    };
    const items = Array.from({ length: 3 }, (_, i) => ({ id: i + 1, itemId: 'weapon1', rarity: 'N', value: 1 }));
    await startAt(page, 'INN', { state: { inventory: { equipped: { weapon: null, armor: null, shield: null, accessory: null }, items, nextId: 4, pending: null } } });
    await expect.poll(focused).toBe('やすむ');
    // 並び（v1.14）：やすむ／メニュー／ダンジョンへ／セーブ／タイトルへ戻る
    await page.keyboard.press('ArrowDown');
    await innAt('メニュー');

    // GameMenu を Esc で閉じる・「もどる」で閉じる
    await page.keyboard.press('Enter');
    await expect.poll(focused).toBe('そうび');
    await page.keyboard.press('Escape');
    await innAt('メニュー');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await innAt('メニュー');

    // そうび・もちものを閉じる（Esc・もどる）
    for (const [down, name] of [[0, 'そうび'], [1, 'もちもの']] as const) {
      await page.keyboard.press('Enter');
      for (let i = 0; i < down; i += 1) await page.keyboard.press('ArrowDown');
      await expect.poll(focused).toBe(name);
      await page.keyboard.press('Enter');
      await expect(page.locator('.wiz-frame-name', { hasText: name })).toBeAttached();
      await page.keyboard.press('Escape');
      await innAt('メニュー');
    }

    // もちものの確認を閉じると、選んだ個体に戻る
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu', { name: 'もちもの' })).toBeVisible();
    await page.keyboard.press('ArrowDown');
    const chosen = await focused();
    expect(chosen).toMatch(/ショートソード/);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu', { name: 'かくにん' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'もちもの' })).toBeVisible();
    await expect.poll(focused).toBe(chosen);
    await page.keyboard.press('Escape');
    await innAt('メニュー');

    // 宿屋の確認（タイトルへ戻る。「メニュー」から 3 つ下）
    for (let i = 0; i < 3; i += 1) await page.keyboard.press('ArrowDown');
    await innAt('タイトルへ戻る');
    await page.keyboard.press('Enter');
    await expect.poll(focused).toBe('いいえ');
    await page.keyboard.press('Escape');
    await innAt('タイトルへ戻る');

    // ダンジョン：メニューボタンに Tab で移り、GameMenu・そうびを閉じるとボタンに戻る
    await startAt(page, 'DUNGEON');
    for (let i = 0; i < 20 && (await focused()) !== '≡ メニュー'; i += 1) await page.keyboard.press('Tab');
    expect(await focused()).toBe('≡ メニュー');
    await page.keyboard.press('Enter');
    await expect.poll(focused).toBe('ヒール');
    await page.keyboard.press('Escape');
    await expect.poll(focused).toBe('≡ メニュー');
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowDown');
    await expect.poll(focused).toBe('そうび');
    await page.keyboard.press('Enter');
    await expect(page.locator('.wiz-frame-name', { hasText: 'そうび' })).toBeAttached();
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    await expect.poll(focused).toBe('≡ メニュー');
  });

  test('TC-0036-04 確認・GameMenu・ステータス・もちもの一覧を開いているあいだ、Tab・Shift+Tab を 20 回ずつ押してもフォーカスが外へ出ない', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    const press = (name: string) => page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: name }).click();
    const sub = (name: string) => page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: name }).click();
    const trapped = async (label: string) => {
      const box = page.getByRole('menu', { name: label, exact: true });
      await expect(box).toBeVisible();
      const inside = () => box.evaluate((m) => m.contains(document.activeElement));
      await expect.poll(inside, label).toBe(true);
      for (const key of ['Tab', 'Shift+Tab']) {
        for (let i = 0; i < 20; i += 1) {
          await page.keyboard.press(key);
          expect(await inside(), `${label} ${key} ${i + 1} 回目`).toBe(true);
        }
      }
    };
    const items = Array.from({ length: 3 }, (_, i) => ({ id: i + 1, itemId: 'weapon1', rarity: 'N', value: 1 }));
    const state = { inventory: { equipped: { weapon: null, armor: null, shield: null, accessory: null }, items, nextId: 4, pending: null } };

    await startAt(page, 'INN', { state });
    await press('タイトルへ戻る');
    await trapped('かくにん');

    await startAt(page, 'INN', { state });
    await press('メニュー');
    await trapped('メニュー');

    await startAt(page, 'INN', { state });
    await press('メニュー');
    await sub('もちもの');
    await trapped('もちもの');

    // ステータス画面は狭い画面だけにある（広い画面では宿屋に出す）
    await page.setViewportSize({ width: 500, height: 900 });
    await startAt(page, 'INN', { state });
    await press('メニュー');
    await sub('ステータス');
    await trapped('ステータス');
  });});
