import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { dungeonMap, logLines, startAt } from './helpers';

const label = (page: Page) => page.getByTestId('location-label');
const debugDungeon = (page: Page) => page.evaluate(() => window.__wiz!.debugDungeon());
const fpvLines = (page: Page) => page.getByTestId('first-person-view').innerHTML();

/** タップできる端末ではタップ、PC ではクリック */
async function press(page: Page, info: TestInfo, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (info.project.name === 'desktop') await button.click();
  else await button.tap();
}

test.describe('ダンジョンの画面', () => {
  test('TC-0014-02 移動ボタンをタップすると、位置・疑似3D・階と向きの表示が変わる', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'タッチのテストはスマートフォンだけ');
    // 北の外周まで 2 マス：1 歩進むと、正面の壁が近づいて見え方が変わる
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 5, y: 2, floor: 3 }) } });
    for (const name of ['前進', '左を向く', '右を向く', '後退']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
    const before = await fpvLines(page);
    await press(page, info, '前進');
    await expect.poll(async () => (await debugDungeon(page)).player).toEqual({ x: 5, y: 1, facing: 'N' });
    expect(await fpvLines(page)).not.toBe(before);
    await press(page, info, '左を向く');
    await expect(label(page)).toHaveText('3F　西');
    await press(page, info, '後退');
    await expect.poll(async () => (await debugDungeon(page)).player).toEqual({ x: 6, y: 1, facing: 'W' });
    await press(page, info, '右を向く');
    await expect(label(page)).toHaveText('3F　北');
  });

  test('TC-0014-03 矢印キーはフォーカスがどこにあっても効き、スクロールしない。応答待ち・メニュー表示中のキーは捨てる', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 5, y: 8 }) } });
    await page.getByTestId('message-window').click();
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await debugDungeon(page)).player.y).toBe(7);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.keyboard.press('ArrowLeft');
    await expect(label(page)).toHaveText('1F　西');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await debugDungeon(page)).player.y).toBe(8);

    // 応答待ちの間に押したキーは捨てる（貯めない）
    await page.evaluate(() => window.__wiz!.setDelay(1000));
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('body')).toHaveAttribute('data-busy', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true', { timeout: 5000 });
    await page.waitForTimeout(300);
    expect((await debugDungeon(page)).player.y).toBe(7);
    await page.evaluate(() => window.__wiz!.setDelay(0));

    // メニューを開いている間の矢印キーはメニューが使い、移動しない
    await page.getByRole('button', { name: '≡ メニュー' }).click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Escape');
    expect((await debugDungeon(page)).player).toEqual({ x: 5, y: 7, facing: 'N' });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test.describe('壁にぶつかったとき', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('TC-0014-05 段 0 の正面の壁の線だけが 200ms 点滅し、そのあと消えない', async ({ page }) => {
      await page.clock.install();
      await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 4, y: 0 }) } });
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      const front0 = page.locator('[data-testid="first-person-view"] line[data-kind="front"][data-depth="0"]');
      await expect(front0).toHaveCount(4);
      await page.getByRole('button', { name: '前進', exact: true }).click();
      await expect.poll(async () => (await logLines(page)).at(-1)).toBe('かべだ');
      // 点滅しているのは正面（段 0）の線だけ。animation は 200ms・1 回
      await expect(page.locator('[data-testid="first-person-view"] line.flash')).toHaveCount(4);
      expect(await front0.first().evaluate((l) => {
        const s = getComputedStyle(l);
        return [s.animationDuration, s.animationIterationCount, s.animationTimingFunction];
      })).toEqual(['0.2s', '1', 'steps(1)']); // step-end は steps(1) と読める
      await page.clock.runFor(201);
      await expect(page.locator('[data-testid="first-person-view"] line.flash')).toHaveCount(0);
      await expect(front0).toHaveCount(4);
      expect(await front0.first().evaluate((l) => getComputedStyle(l).opacity)).toBe('1');
    });
  });

  test('TC-0014-07 疑似3D の上に「3F　北」が出て、数字は階の 1 つだけ', async ({ page }) => {
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 1, floor: 3 }) } });
    await expect(label(page)).toHaveText('3F　北');
    expect((await label(page).textContent())!.match(/\d+/g)).toEqual(['3']);
    const labelBottom = await label(page).evaluate((e) => e.getBoundingClientRect().bottom);
    const fpvTop = await page.getByTestId('first-person-view').evaluate((e) => e.getBoundingClientRect().top);
    expect(labelBottom).toBeLessThanOrEqual(fpvTop);
  });

  test('TC-0036-08 疑似3D と地図の <svg> は role="img" で、説明文（aria-label）が付く', async ({ page }) => {
    // 3F の (5,5) 北向き、足元がくだり階段。前方 2 マス先（(5,3) の北）が壁、右（東）は 2 段とも壁、左は通路。3 マス踏破済み
    const size = 10;
    const walls = Array.from({ length: size * size }, (_, i) => {
      const x = i % size;
      const y = Math.floor(i / size);
      let w = (y === 0 ? 1 : 0) | (x === size - 1 ? 2 : 0) | (y === size - 1 ? 4 : 0) | (x === 0 ? 8 : 0);
      if (x === 5 && y === 3) w |= 1;
      if (x === 5 && y === 2) w |= 4;
      if (x === 5 && (y === 4 || y === 5)) w |= 2;
      if (x === 6 && (y === 4 || y === 5)) w |= 8;
      return w;
    });
    const dungeon = dungeonMap({ x: 5, y: 5, floor: 3, walls }) as { floors: { down: unknown; visited: boolean[] }[] };
    dungeon.floors[2].down = { x: 5, y: 5 };
    dungeon.floors[2].visited = dungeon.floors[2].visited.map((_, j) => [55, 45, 35].includes(j));
    await startAt(page, 'DUNGEON', { state: { dungeon } });
    const fpv = page.getByTestId('first-person-view');
    await expect(fpv).toHaveJSProperty('tagName', 'svg');
    await expect(fpv).toHaveAttribute('role', 'img');
    await expect(fpv).toHaveAttribute('aria-label', '3F 北を向いている。前方 2 マス先は かべ。左に わかれみち。足元に くだり階段。');
    const map = page.getByTestId('auto-map');
    await expect(map).toHaveAttribute('role', 'img');
    await expect(map).toHaveAttribute('aria-label', '3F の地図。踏破済み 3 マス。');
  });

  test('TC-0015-04 自動地図：大きさ・塗りのマスの数・記号・説明。歩くと塗りが増え、向きで矢印が変わる', async ({ page }, info) => {
    await startAt(page, 'DUNGEON');
    const map = page.getByTestId('auto-map');
    await expect(map).toHaveAttribute('viewBox', '0 0 160 160');
    const size = async () => [Number(await map.getAttribute('width')), Number(await map.getAttribute('height'))];
    if (info.project.name === 'desktop') {
      const [w, h] = await size();
      expect(w).toBe(h);
      expect(w).toBeGreaterThanOrEqual(176);
    } else {
      expect(await size()).toEqual([160, 160]);
    }
    const cells = map.locator('rect.wiz-map-cell');
    const visited = async () => (await debugDungeon(page)).visited.filter(Boolean).length;
    await expect(cells).toHaveCount(1);
    expect(await visited()).toBe(1);
    await expect(map).toHaveAttribute('aria-label', '1F の地図。踏破済み 1 マス。');

    await press(page, info, '前進');
    await expect(cells).toHaveCount(2);
    expect(await visited()).toBe(2);
    await expect(map).toHaveAttribute('aria-label', '1F の地図。踏破済み 2 マス。');
    await expect(map.locator('text.player')).toHaveText('▲');
    await expect(map.locator('text.stairs')).toHaveText('入');
    await press(page, info, '左を向く');
    await expect(map.locator('text.player')).toHaveText('◀');
    await expect(cells).toHaveCount(2);
    // 文字は記号だけで、数字がない
    const texts = await map.locator('text').allTextContents();
    expect(texts.every((t) => ['↓', '↑', '入', '▲', '▶', '▼', '◀'].includes(t))).toBe(true);
  });

  test('TC-0016-03 足元に応じた階段・帰還のボタンが 1 つだけ出る。どの場合も「≡ メニュー」の位置は同じ', async ({ page }) => {
    const cases = [
      { at: { x: 9, y: 0, floor: 1 }, text: '↓ おりる' },
      { at: { x: 0, y: 9, floor: 2 }, text: '↑ のぼる' },
      { at: { x: 0, y: 9, floor: 1 }, text: '宿屋へ戻る' },
      { at: { x: 4, y: 4, floor: 1 }, text: null },
    ];
    for (const viewport of [null, { width: 414, height: 715 }]) {
      if (viewport) await page.setViewportSize(viewport);
      const positions: string[] = [];
      for (const c of cases) {
        await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap(c.at) } });
        const visible = page.locator('.wiz-stairs:visible');
        if (c.text) {
          await expect(visible).toHaveCount(1);
          await expect(visible).toHaveText(c.text);
        } else {
          await expect(visible).toHaveCount(0);
        }
        const box = await page.getByRole('button', { name: '≡ メニュー' }).boundingBox();
        positions.push(`${Math.round(box!.x)},${Math.round(box!.y)}`);
      }
      expect(new Set(positions).size, positions.join(' ')).toBe(1);
    }
  });

  test('TC-0016-04 「↓ おりる」で 2F、ボタンが「↑ のぼる」になり、押すと 1F に戻る', async ({ page }, info) => {
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 0 }) } });
    await expect(label(page)).toHaveText('1F　北');
    await press(page, info, '↓ おりる');
    await expect(label(page)).toHaveText('2F　北');
    await expect(page.locator('.wiz-stairs:visible')).toHaveText('↑ のぼる');
    await press(page, info, '↑ のぼる');
    await expect(label(page)).toHaveText('1F　北');
  });

  test('TC-0016-06 出発すると入口の案内、下り階段に着くと案内が 1 行。向きを変えても増えない。降りると上り階段の案内', async ({ page }, info) => {
    await startAt(page, 'INN');
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'ダンジョンへ' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    await expect.poll(async () => (await logLines(page)).slice(-2)).toEqual(['ダンジョンに ふみこんだ', 'ここは入口だ']);

    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 1 }) } });
    await press(page, info, '前進');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('足元に くだり階段がある');
    const count = (await logLines(page)).length;
    await press(page, info, '左を向く');
    await press(page, info, '右を向く');
    await expect(label(page)).toHaveText('1F　北');
    expect((await logLines(page)).length).toBe(count);
    await press(page, info, '↓ おりる');
    await expect.poll(async () => (await logLines(page)).slice(-2)).toEqual(['2F に おりた', '足元に のぼり階段がある']);
  });

  test('TC-0017-04 入口で「宿屋へ戻る」を押すと宿屋になり、HP・MP はそのまま。もう一度出発すると違う迷宮', async ({ page }, info) => {
    await startAt(page, 'DUNGEON', { state: { hp: 10, maxHp: 30, mp: 4, maxMp: 10 } });
    const before = await debugDungeon(page);
    await press(page, info, '宿屋へ戻る');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('宿屋に もどった');
    await expect(page.getByTestId('status-hp')).toContainText(' 10/ 30');
    await expect(page.getByTestId('status-panel').locator('dt', { hasText: /^MP$/ }).locator('xpath=following-sibling::dd[1]')).toContainText('  4/ 10');
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'ダンジョンへ' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    expect((await debugDungeon(page)).walls).not.toEqual(before.walls);
  });

  test('TC-0037-02 前進を押してから疑似3D が変わるまで、向きを変えて階と向きの表示が変わるまで、「たたかう」から最初の行まで、どれも 300ms 未満', async ({ page }) => {
    // 本物の時間で測る（偽の時計は入れない）。押してから DOM が変わるまでを、ページの中で performance.now() で測る
    const until = (target: string, press: string) => page.evaluate(([t, p]) => new Promise<number>((resolve) => {
      const el = document.querySelector(t)!;
      const t0 = performance.now();
      const ob = new MutationObserver(() => { ob.disconnect(); resolve(performance.now() - t0); });
      ob.observe(el, { childList: true, subtree: true, characterData: true });
      (document.querySelector(p) as HTMLElement).click();
    }), [target, press] as const);
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 5, y: 5 }) } });
    const forward = await until('[data-testid="first-person-view"]', 'button[aria-label="前進"]');
    await expect.poll(async () => (await debugDungeon(page)).player).toEqual({ x: 5, y: 4, facing: 'N' });
    const turn = await until('[data-testid="location-label"]', 'button[aria-label="右を向く"]');
    await expect(label(page)).toHaveText('1F　東');

    await startAt(page, 'BATTLE');
    const attack = await until('[role="log"]', '[role="menu"][aria-label="戦闘"] [role="menuitem"]');
    await expect.poll(() => logLines(page)).not.toEqual([]);
    console.log(`TC-0037-02 前進 ${forward.toFixed(1)}ms、回転 ${turn.toFixed(1)}ms、たたかう ${attack.toFixed(1)}ms`);
    for (const ms of [forward, turn, attack]) expect(ms).toBeLessThan(300);
  });
});
