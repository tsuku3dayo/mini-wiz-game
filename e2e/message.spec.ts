import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { battleOf, dungeonMap, logLines, SEEDS, startAt } from './helpers';

const attackItem = (page: Page) => page.getByRole('menu', { name: '戦闘' }).getByRole('menuitem').filter({ hasText: 'たたかう' });
const logHeight = (page: Page) => page.getByRole('log').evaluate((e) => e.getBoundingClientRect().height);
/** オークとの戦闘（プレイヤーの HP 999。1 ターンで 2 行、倒れない・倒せない） */
const orcBattle = { hp: 999, maxHp: 999, battle: battleOf('orc', 48) };

async function choose(page: Page, info: TestInfo, target: ReturnType<Page['locator']>) {
  if (info.project.name === 'desktop') await target.click();
  else await target.tap();
}

async function pauseClock(page: Page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

test.describe('メッセージ欄', () => {
  // 1 行ずつ出す動き・▼ の点滅の animation を見るので、動きを減らす設定を外す
  test.use({ reducedMotion: 'no-preference' });

  test('TC-0011-02 3 行以上の結果は、1 行目が応答のすぐあと、そのあと 400ms ごとに 1 行ずつ（399ms では増えない）', async ({ page }, info) => {
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: { battle: battleOf('slime', 1) }, seed: SEEDS.hits });
    await pauseClock(page);
    await choose(page, info, attackItem(page));
    await expect.poll(() => logLines(page)).toHaveLength(1);
    await page.clock.runFor(399);
    expect(await logLines(page)).toHaveLength(1);
    await page.clock.runFor(1);
    await expect.poll(() => logLines(page)).toHaveLength(2);
  });

  test('TC-0011-04 メッセージ欄の高さは行数 × 1.6em（5 行 128px・6 行 153.6px・7 行 179.2px）で、0 行と最大までたまったときで同じ', async ({ page }, info) => {
    const wide = info.project.name === 'desktop';
    const scenes = [
      { open: () => startAt(page, 'INN'), rows: 5, fill: () => choose(page, info, page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' })) },
      { open: () => startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 4, y: 0 }) } }), rows: wide ? 6 : 5, fill: () => choose(page, info, page.getByRole('button', { name: '前進', exact: true })) },
      { open: () => startAt(page, 'BATTLE', { state: orcBattle, seed: SEEDS.hits }), rows: wide ? 7 : 5, fill: () => choose(page, info, attackItem(page)) },
    ];
    for (const s of scenes) {
      await s.open();
      const empty = await logHeight(page);
      expect(Math.abs(empty - s.rows * 16 * 1.6)).toBeLessThanOrEqual(1);
      for (let i = 0; i < 8; i += 1) {
        await s.fill();
        await page.getByTestId('message-window').click(); // 残りを出す
        await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true');
      }
      expect(await logHeight(page)).toBe(empty);
    }
  });

  test('TC-0011-03 出す行は狭い画面 5 行・desktop はダンジョン 6・戦闘 7（折り返す行は入る分）・宿屋 5。古い行が消えて最新の行が出る', async ({ page }, info) => {
    const wide = info.project.name === 'desktop';
    const height = (rows: number) => rows * 16 * 1.6;

    // ダンジョン：正面が壁で ↑ を 8 回
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 4, y: 0 }) } });
    const empty = await logHeight(page);
    expect(Math.abs(empty - height(wide ? 6 : 5))).toBeLessThanOrEqual(1);
    for (let i = 0; i < 8; i += 1) {
      await choose(page, info, page.getByRole('button', { name: '前進', exact: true }));
      await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true');
    }
    await expect.poll(() => logLines(page)).toEqual(Array(wide ? 6 : 5).fill('かべだ'));
    expect(await logHeight(page)).toBe(empty);

    // 戦闘：「たたかう」を 4 回（8 行たまる。行は折り返すので入る分だけ）
    await startAt(page, 'BATTLE', { state: orcBattle, seed: SEEDS.hits });
    const battleEmpty = await logHeight(page);
    expect(Math.abs(battleEmpty - height(wide ? 7 : 5))).toBeLessThanOrEqual(1);
    for (let i = 0; i < 4; i += 1) {
      await choose(page, info, attackItem(page));
      await page.getByTestId('message-window').click(); // 残りを出す
      await expect(attackItem(page)).not.toHaveAttribute('aria-disabled', 'true');
    }
    const lines = await logLines(page);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(wide ? 7 : 5);
    expect(lines.at(-1)).toMatch(/^オークの こうげき！/);
    expect(await page.getByRole('log').evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true);
    expect(await logHeight(page)).toBe(battleEmpty);

    // 宿屋：「やすむ」を 6 回
    await startAt(page, 'INN');
    const innEmpty = await logHeight(page);
    expect(Math.abs(innEmpty - height(5))).toBeLessThanOrEqual(1);
    for (let i = 0; i < 6; i += 1) {
      await choose(page, info, page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' }));
      await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true');
    }
    await expect.poll(() => logLines(page)).toEqual(Array(5).fill('HP と MP が かいふくした'));
    expect(await logHeight(page)).toBe(innEmpty);
  });

  test('TC-0011-05 逐次表示の途中でメッセージ欄を押すと、残りの行がすぐ全部出て、data-busy が true でなくなる', async ({ page }, info) => {
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: orcBattle, seed: SEEDS.hits });
    await pauseClock(page);
    await choose(page, info, attackItem(page));
    await expect.poll(() => logLines(page)).toHaveLength(1);
    await expect(page.locator('body')).toHaveAttribute('data-busy', 'true');
    await choose(page, info, page.getByTestId('message-window'));
    await expect.poll(() => logLines(page)).toHaveLength(2);
    await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true');
  });

  test('TC-0011-06 逐次表示の途中の Enter で残りが全部出る。その Enter はメニューに届かない', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: orcBattle, seed: SEEDS.hits });
    await pauseClock(page);
    await attackItem(page).click();
    await expect.poll(() => logLines(page)).toHaveLength(1);
    await expect(attackItem(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => logLines(page)).toHaveLength(2);
    await page.clock.runFor(1000);
    expect(await logLines(page)).toHaveLength(2);
    await expect(page.locator('body')).toHaveAttribute('data-location', 'BATTLE');
  });

  test('TC-0011-07 逐次表示の間はメニュー・ボタンが無効で、押してもターンが進まない。応答待ちの間に 2 回押しても 1 回だけ', async ({ page }, info) => {
    // 進んだターンの数は、保存の revision（1 回の操作で 1 つ増える）で数える（戦闘の行は折り返し、欄に入る分しか出ないため）
    const revision = () => page.evaluate(() => JSON.parse(localStorage.getItem('mini-wiz-game-game')!).revision as number);
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: orcBattle, seed: SEEDS.hits });
    await pauseClock(page);
    const r0 = await revision();
    await choose(page, info, attackItem(page));
    await expect.poll(() => logLines(page)).toHaveLength(1);
    await expect(page.locator('body')).toHaveAttribute('data-busy', 'true');
    await expect(page.getByRole('menu', { name: '戦闘' })).toHaveAttribute('aria-disabled', 'true');
    // 無効のメニューを押しても進まない
    if (info.project.name === 'desktop') await attackItem(page).click({ force: true });
    else await attackItem(page).tap({ force: true });
    await page.clock.runFor(2000);
    expect(await revision()).toBe(r0 + 1);
    expect((await logLines(page)).at(-1)).toMatch(/^オークの こうげき！/);

    // 応答待ちの間に 2 回押しても 1 ターンだけ
    await page.evaluate(() => window.__wiz!.setDelay(1000));
    await choose(page, info, attackItem(page));
    if (info.project.name === 'desktop') await attackItem(page).click({ force: true });
    else await attackItem(page).tap({ force: true });
    await page.clock.runFor(1000);
    await page.clock.runFor(2000);
    expect(await revision()).toBe(r0 + 2);

    // ダンジョンでも、逐次表示の間（降りると 2 行：「2F に おりた」→ 足元の案内）は移動ボタン・メニューボタンが無効
    await page.evaluate(() => window.__wiz!.setDelay(0));
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 0 }) } });
    await pauseClock(page);
    await choose(page, info, page.getByRole('button', { name: '↓ おりる' }));
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('2F に おりた');
    await expect(page.getByRole('button', { name: '前進', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: '≡ メニュー' })).toBeDisabled();
    await page.clock.runFor(400);
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('足元に のぼり階段がある');
    await expect(page.getByRole('button', { name: '前進', exact: true })).toBeEnabled();
  });

  test('TC-0011-09 行の文字の色：normal は primary、success は緑、danger は赤、ドロップの行はレアリティの色（R は青・LG は赤）', async ({ page }, info) => {
    const lineColor = (text: RegExp) => page.locator('[role="log"] .wiz-line').filter({ hasText: text }).last().evaluate((e) => getComputedStyle(e).color);

    // normal（短い「かべだ」の行。戦闘の行は折り返して、狭い画面では欄から押し出されることがある）
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 4, y: 0 }) } });
    await choose(page, info, page.getByRole('button', { name: '前進', exact: true }));
    await expect.poll(() => lineColor(/かべだ/)).toBe('rgb(232, 220, 192)');

    // success（たおした）と R のドロップ
    await startAt(page, 'BATTLE', { state: { battle: battleOf('slime', 1) }, seed: SEEDS.slimeDropR });
    await choose(page, info, attackItem(page));
    await page.getByTestId('message-window').click({ force: true }).catch(() => undefined);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    expect(await lineColor(/おとした！/)).toBe('rgb(91, 140, 255)');
    expect(await lineColor(/たおした！/)).toBe('rgb(92, 214, 92)');

    // LG のドロップ
    await startAt(page, 'BATTLE', { state: { hp: 999, maxHp: 999, battle: battleOf('darkKnight', 1) }, seed: SEEDS.darkKnightDropLG });
    await choose(page, info, attackItem(page));
    await page.getByTestId('message-window').click({ force: true }).catch(() => undefined);
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    expect(await lineColor(/おとした！/)).toBe('rgb(255, 77, 109)');

    // danger（倒れた行。宿屋のメッセージ欄で見る）
    await startAt(page, 'BATTLE', { state: { hp: 1 }, seed: SEEDS.hits });
    await choose(page, info, attackItem(page));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
    await expect.poll(() => lineColor(/たおれた…/)).toBe('rgb(255, 90, 78)');
  });

  test('TC-0011-10 表示中の行に danger があると欄が danger（外側の線が赤、内側はそのまま）。消えると default', async ({ page }, info) => {
    await startAt(page, 'BATTLE', { state: { hp: 1 }, seed: SEEDS.hits });
    await choose(page, info, attackItem(page));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
    const win = page.getByTestId('message-window');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('気がつくと 宿屋に いた');
    await expect(win).toHaveAttribute('data-variant', 'danger');
    await expect(win).toHaveCSS('border-top-color', 'rgb(255, 90, 78)');
    await expect(win).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
    for (let i = 0; i < 5; i += 1) {
      await choose(page, info, page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' }));
      await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true');
    }
    await expect.poll(async () => (await logLines(page)).includes('ゆうしゃは たおれた…')).toBe(false);
    await expect(win).toHaveAttribute('data-variant', 'default');
    await expect(win).toHaveCSS('border-top-color', 'rgb(255, 255, 255)');
  });

  test('TC-0011-08 応答待ちが 300ms を超えると、メッセージ欄の右下に点滅する ▼ が出て、応答で消える', async ({ page }) => {
    await page.clock.install();
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 5, y: 5 }) } });
    await page.evaluate(() => window.__wiz!.setDelay(1000));
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const waiting = page.getByRole('img', { name: '応答待ち' });

    await page.getByRole('button', { name: '前進', exact: true }).click();
    await page.clock.runFor(300);
    await expect(waiting).toBeHidden();
    await page.clock.runFor(1);
    await expect(waiting).toBeVisible();
    expect(await waiting.evaluate((e) => {
      const s = getComputedStyle(e);
      return [s.animationDuration, s.animationIterationCount, s.animationTimingFunction];
    })).toEqual(['1s', 'infinite', 'steps(1)']); // step-end は steps(1) と読める
    // メッセージ欄の右下にある
    const box = await waiting.boundingBox();
    const win = await page.getByTestId('message-window').boundingBox();
    expect(box!.x + box!.width).toBeGreaterThan(win!.x + win!.width / 2);
    expect(box!.y + box!.height).toBeGreaterThan(win!.y + win!.height / 2);
    await page.clock.runFor(700);
    await expect(waiting).toBeHidden();
  });
});
