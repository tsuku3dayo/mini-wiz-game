import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { battleOf, dungeonMap, logLines, SEEDS, startAt } from './helpers';

const commandItem = (page: Page, text: string) => page.getByRole('menu', { name: '戦闘' }).getByRole('menuitem').filter({ hasText: text });
const hp = (page: Page) => page.getByTestId('status-hp');

/** タップできる端末ではタップ、PC ではクリック */
async function choose(page: Page, info: TestInfo, target: ReturnType<Page['locator']>) {
  if (info.project.name === 'desktop') await target.click();
  else await target.tap();
}

/** 偽の時計を止める（押した時刻から決まった時間だけ進めるため） */
async function pauseClock(page: Page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
}

test.describe('戦闘の画面', () => {
  test('TC-0019-01 敵の名前（数字なし）・見出し「ステータス」の 1 行・コマンド（たたかう／ヒール／にげる。狭い画面は枠なしのボタン、広い画面は見出し「コマンド」の中）・メッセージ欄が出る', async ({ page }, info) => {
    await startAt(page, 'BATTLE');
    // 狭い画面は横 1 列のボタン、広い画面は縦のメニュー（v1.14）
    const menu = page.getByRole('menu', { name: '戦闘' });
    if (info.project.name === 'desktop') await expect(menu).toHaveClass(/wiz-menu/);
    else await expect(menu).toHaveClass(/command-buttons/);
    const enemy = page.getByTestId('enemy-window');
    await expect(enemy).toHaveText('ゴブリン');
    expect(await enemy.textContent()).not.toMatch(/[0-9]/);
    const status = page.getByTestId('status-panel');
    await expect(status.locator('.wiz-window-title')).toContainText('ステータス');
    await expect(status.locator('.wiz-status-compact')).toContainText('ゆうしゃ');
    // 見出し「コマンド」は広い画面だけ（狭い画面は枠なし。v1.16）
    if (info.project.name === 'desktop') await expect(page.locator('.battle-command .wiz-window-title')).toContainText('コマンド');
    else await expect(page.locator('.wiz-window-title', { hasText: 'コマンド' })).toHaveCount(0);
    const labels = (await page.getByRole('menu', { name: '戦闘' }).getByRole('menuitem').allTextContents()).map((t) => t.replace(/^[▶\s]/, ''));
    expect(labels).toEqual(['たたかう', 'ヒール', 'にげる']);
    await expect(page.getByRole('log')).toHaveCount(1);
  });

  test('TC-0022-10 ステータスは見出し「ステータス」の 1 行（名前・Lv・HP・MP）。経験値がたまって勝っても Lv は変わらない（v1.14）', async ({ page }, info) => {
    const lv3 = { level: 3, exp: 80, hp: 25, maxHp: 46, mp: 10, maxMp: 16, attack: 7, defense: 7, speed: 7 };
    await startAt(page, 'DUNGEON', { state: lv3 });
    const line = page.getByTestId('status-panel').locator('.wiz-status-compact');
    await expect(page.getByTestId('status-panel').locator('.wiz-window-title')).toContainText('ステータス');
    await expect(line).toHaveText(/ゆうしゃ\s*Lv\s{2}3\s*HP 25\/ 46\s*MP 10\/ 16/);
    expect(await line.textContent()).not.toMatch(/EXP|こうげき/);

    // v1.14：経験値が次のレベルを超えても、勝っただけでは Lv は変わらない（宿屋の やすむ で上がる）
    await startAt(page, 'BATTLE', { state: { exp: 23, battle: battleOf('slime', 1) }, seed: SEEDS.hits });
    await expect(line).toContainText('Lv  1');
    await choose(page, info, commandItem(page, 'たたかう'));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    await expect(page.getByTestId('status-panel').locator('.wiz-status-compact')).toContainText('Lv  1');
  });

  test('TC-0018-06 遭遇すると、それまでの行が消えて「スライムが あらわれた！」の 1 行だけになり、戦闘の画面になる', async ({ page }, info) => {
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 4, y: 0 }) } });
    const press = (name: string) => choose(page, info, page.getByRole('button', { name, exact: true }));
    await press('前進');
    await expect.poll(() => logLines(page)).toEqual(['かべだ']);
    await press('右を向く');
    await page.evaluate((s) => window.__wiz!.useSeed(s), SEEDS.slimeNext);
    await press('前進');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'battle');
    await expect.poll(() => logLines(page)).toEqual(['スライムが あらわれた！']);
  });

  test('TC-0019-11 HP が最大の 25% 以下なら HP の値が警告の色で「！」付き。超えると付かない', async ({ page }) => {
    await startAt(page, 'BATTLE', { state: { hp: 10, maxHp: 40 } });
    await expect(hp(page)).toHaveAttribute('data-warning', 'true');
    await expect(hp(page)).toHaveCSS('color', 'rgb(255, 167, 38)');
    expect((await hp(page).textContent())!.endsWith('！')).toBe(true);
    await startAt(page, 'BATTLE', { state: { hp: 11, maxHp: 40 } });
    await expect(hp(page)).not.toHaveAttribute('data-warning', 'true');
    expect((await hp(page).textContent())!.endsWith('！')).toBe(false);
  });

  test('TC-0019-13 体力わずかの間、すべてのウィンドウの線が赤く見出しは金のまま。ダンジョンでヒールすると白に戻る', async ({ page }, info) => {
    const windowColors = () => page.locator('.wiz-window').evaluateAll((list) => list.map((w) => {
      const s = getComputedStyle(w);
      return [s.borderTopColor, s.outlineColor];
    }));
    await startAt(page, 'BATTLE', { state: { hp: 9, maxHp: 46 } });
    await expect(page.locator('#app')).toHaveAttribute('data-low-hp', 'true');
    for (const [border, outline] of await windowColors()) {
      expect(border).toBe('rgb(255, 90, 78)');
      expect(outline).toBe('rgb(255, 90, 78)');
    }
    await expect(page.locator('.wiz-window-title').first()).toHaveCSS('color', 'rgb(201, 162, 39)');

    await startAt(page, 'DUNGEON', { state: { hp: 9, maxHp: 46, mp: 10 } });
    await expect(page.locator('#app')).toHaveAttribute('data-low-hp', 'true');
    await choose(page, info, page.getByRole('button', { name: '≡ メニュー' }));
    await choose(page, info, page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: 'ヒール' }));
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('ゆうしゃは ヒールを となえた！ HP が 30 かいふくした');
    await expect(page.locator('#app')).not.toHaveAttribute('data-low-hp', 'true');
    for (const [border, outline] of await windowColors()) {
      expect(border).toBe('rgb(255, 255, 255)');
      expect(outline).toBe('rgb(255, 255, 255)');
    }
  });

  test('TC-0020-03 「にげる」で逃げきると「うまく にげきれた」が出てダンジョンに戻る。位置は戦闘の前と同じ', async ({ page }, info) => {
    await startAt(page, 'BATTLE', { state: { speed: 13, battle: battleOf('slime', 12), dungeon: dungeonMap({ x: 3, y: 6, facing: 'E' }) }, seed: SEEDS.hits });
    const before = (await page.evaluate(() => window.__wiz!.debugDungeon())).player;
    await choose(page, info, commandItem(page, 'にげる'));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('うまく にげきれた');
    expect((await page.evaluate(() => window.__wiz!.debugDungeon())).player).toEqual(before);
  });

  test('TC-0019-14 狭い画面の戦闘のコマンドは横 1 列のボタン（たたかう・ヒール・にげる、幅 2：1：1、高さ 88px、枠なしでステータスと左右がそろう、▶ なし、初めのフォーカスは たたかう）。広い画面は縦の 3 行', async ({ page }, info) => {
    await startAt(page, 'BATTLE');
    const buttons = page.getByRole('menu', { name: '戦闘' }).getByRole('menuitem');
    await expect(buttons).toHaveCount(3);
    const boxes = await buttons.evaluateAll((list) => list.map((e) => {
      const r = e.getBoundingClientRect();
      return { text: e.textContent ?? '', top: r.top, left: r.left, width: r.width, height: r.height };
    }));
    if (info.project.name === 'desktop') {
      // 広い画面は縦の CommandMenu のまま
      expect(boxes[0].top).toBeLessThan(boxes[1].top);
      expect(boxes[1].top).toBeLessThan(boxes[2].top);
      return;
    }
    expect(boxes.map((b) => b.text)).toEqual(['たたかう', 'ヒール', 'にげる']);
    // 上端がそろい、左から並ぶ
    expect(new Set(boxes.map((b) => Math.round(b.top))).size).toBe(1);
    expect(boxes[0].left).toBeLessThan(boxes[1].left);
    expect(boxes[1].left).toBeLessThan(boxes[2].left);
    // 幅 2：1：1（grid-template-columns: 2fr 1fr 1fr。たたかう ＝ ヒール ＋ にげる）、高さ 88px（v1.16）
    expect(Math.abs(boxes[0].width - (boxes[1].width + boxes[2].width))).toBeLessThanOrEqual(1);
    for (const b of boxes) expect(Math.round(b.height)).toBe(88);
    // 枠なし：ボタンの箱の左右の端が、ステータスのウィンドウの左右の端と 1px 以内でそろう（v1.16）
    const edges = async (sel: string) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return [r.left, r.right]; });
    const [bl, br] = await edges('.command-buttons');
    const [sl, sr] = await edges('[data-testid="status-panel"]');
    expect(Math.abs(bl - sl)).toBeLessThanOrEqual(1);
    expect(Math.abs(br - sr)).toBeLessThanOrEqual(1);
    await expect(page.locator('.battle-command')).toHaveCount(0);
    expect(boxes.some((b) => b.text.includes('▶'))).toBe(false);
    await expect(buttons.filter({ hasText: 'たたかう' })).toBeFocused();
  });

  test('TC-0019-15 狭い画面のボタン：たたかう で進む。押せない ヒール・にげる は理由を出して進まない。← → ↑ ↓ で動いて端で止まり、Enter・Space で決まる。応答待ちは 1 回だけ', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', '狭い画面だけのボタン');
    const revision = () => page.evaluate(() => JSON.parse(localStorage.getItem('mini-wiz-game-game')!).revision as number);
    const disabledColor = 'rgb(140, 133, 122)';

    // たたかう をタップするとターンが進む
    await startAt(page, 'BATTLE', { state: { hp: 999, maxHp: 999 }, seed: SEEDS.hits });
    const r0 = await revision();
    await commandItem(page, 'たたかう').tap();
    await expect.poll(revision).toBe(r0 + 1);

    // MP 2 の ヒール・ボス戦の にげる：押せない色で、押すと理由だけが出る
    for (const [state, name, reason] of [
      [{ mp: 2 }, 'ヒール', 'MP が たりない'],
      [{ battle: battleOf('necromancer', 260), dungeon: dungeonMap({ x: 9, y: 0, floor: 5 }) }, 'にげる', 'にげられない！'],
    ] as const) {
      await startAt(page, 'BATTLE', { state, seed: SEEDS.hits });
      const button = commandItem(page, name);
      await expect(button).toHaveAttribute('aria-disabled', 'true');
      await expect(button).toHaveCSS('color', disabledColor);
      const before = await revision();
      // 押せないボタン（aria-disabled）は、押せるようになるのを待たずに押す
      await button.tap({ force: true });
      await expect.poll(async () => (await logLines(page)).at(-1), name).toBe(reason);
      expect(await revision(), name).toBe(before);
    }

    // キー：→ ↓ が次、← ↑ が前。端で止まる。Enter・Space で決まる
    await startAt(page, 'BATTLE', { state: { hp: 999, maxHp: 999 }, seed: SEEDS.hits });
    await expect(commandItem(page, 'たたかう')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(commandItem(page, 'たたかう')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(commandItem(page, 'ヒール')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(commandItem(page, 'にげる')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(commandItem(page, 'にげる')).toBeFocused();
    await expect(commandItem(page, 'にげる')).toHaveAttribute('tabindex', '0');
    await expect(commandItem(page, 'たたかう')).toHaveAttribute('tabindex', '-1');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowLeft');
    await expect(commandItem(page, 'たたかう')).toBeFocused();
    const k0 = await revision();
    await page.keyboard.press('Enter');
    await expect.poll(revision).toBe(k0 + 1);
    await expect(page.getByRole('menu', { name: '戦闘' })).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10_000 });
    await expect(commandItem(page, 'たたかう')).toBeFocused();
    await page.keyboard.press(' ');
    await expect.poll(revision).toBe(k0 + 2);

    // 応答待ちのあいだに 2 回押しても 1 ターンだけ
    await startAt(page, 'BATTLE', { state: { hp: 999, maxHp: 999 }, seed: SEEDS.hits });
    await page.evaluate(() => window.__wiz!.setDelay(1000));
    const d0 = await revision();
    await commandItem(page, 'たたかう').tap();
    await commandItem(page, 'たたかう').tap({ force: true });
    await expect(page.getByRole('menu', { name: '戦闘' })).not.toHaveAttribute('aria-disabled', 'true', { timeout: 10_000 });
    expect(await revision()).toBe(d0 + 1);
    await page.evaluate(() => window.__wiz!.setDelay(0));
  });

  test.describe('敵の絵', () => {
  const KINDS = [['slime', 'スライム'], ['goblin', 'ゴブリン'], ['skeleton', 'スケルトン'], ['orc', 'オークロード'], ['darkKnight', 'ダークナイト'], ['necromancer', '暗黒のネクロマンサー']] as const;
  const frame = (page: Page) => page.getByTestId('enemy-window').getByTestId('enemy-image-frame');
  const img = (page: Page) => frame(page).locator('img');
  /** 絵が読めるまで待つ */
  const loaded = (page: Page) => expect.poll(() => img(page).evaluate((e) => (e as HTMLImageElement).complete && [(e as HTMLImageElement).naturalWidth, (e as HTMLImageElement).naturalHeight])).toEqual([256, 256]);

  test('TC-0033-01 6 体それぞれの戦闘で、名前の上に enemies/<種類>.png の絵（256×256）が読み込まれ、絵の下端と名前の上端の間は 0', async ({ page }) => {
    for (const [kind] of KINDS) {
      await startAt(page, 'BATTLE', { state: { battle: battleOf(kind, 5) } });
      await expect(img(page), kind).toHaveAttribute('src', `enemies/${kind}.png`);
      await loaded(page);
      const box = await frame(page).evaluate((e) => e.getBoundingClientRect().bottom);
      const name = await page.locator('.battle-enemy-name').evaluate((e) => e.getBoundingClientRect().top);
      expect(Math.abs(box - name), kind).toBeLessThanOrEqual(0.5);
    }
  });

  test('TC-0033-02 どの画面の大きさでも、枠と絵は 256×256 で、image-rendering は pixelated', async ({ page }) => {
    await startAt(page, 'BATTLE');
    await loaded(page);
    const size = async () => Promise.all([frame(page), img(page)].map((l) => l.evaluate((e) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.width * 100) / 100, Math.round(r.height * 100) / 100];
    })));
    for (const viewport of [null, { width: 414, height: 715 }, { width: 1366, height: 657 }]) {
      if (viewport) await page.setViewportSize(viewport);
      // 600px の境目をまたぐと画面を作り直すので、落ち着くまで待って測る
      await expect.poll(size, JSON.stringify(viewport)).toEqual([[256, 256], [256, 256]]);
    }
    await expect(img(page)).toHaveCSS('image-rendering', 'pixelated');
  });

  test('TC-0033-03 絵の alt は敵の名前と同じ', async ({ page }) => {
    for (const [kind, name] of KINDS) {
      await startAt(page, 'BATTLE', { state: { battle: battleOf(kind, 5) } });
      await expect(img(page), kind).toHaveAttribute('alt', name);
    }
  });

  test.describe('絵が読めないとき', () => {
    // Service Worker が持っている絵を出すと、止めたつもりの読み込みが止まらないので、Service Worker を使わない
    test.use({ serviceWorkers: 'block' });

  test('TC-0033-04 絵が読めないと枠がなくなり名前だけになる。例外も ErrorPanel も出ず、「たたかう」で戦闘が続く', async ({ page, context }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await context.route('**/enemies/*.png', (r) => r.abort());
    await startAt(page, 'BATTLE', { state: { hp: 999, maxHp: 999, battle: battleOf('slime', 12) }, seed: SEEDS.hits });
    await expect(page.locator('.battle-enemy-name')).toHaveText('スライム');
    await expect(frame(page)).toHaveCount(0);
    await choose(page, info, commandItem(page, 'たたかう'));
    await expect.poll(() => logLines(page)).not.toEqual([]);
    await expect(page.getByTestId('error-panel')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
  });
});

test.describe('メッセージを 1 行ずつ出す場面', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('TC-0019-09 「ダメージを うけた」の行が出ると HP の値が 200ms・1 回・step-end で点滅する。プレイヤーの攻撃の行だけでは点滅しない', async ({ page }, info) => {
      await page.clock.install();
      // ゴブリン（速さ 6）が先に攻撃して当たる
      await startAt(page, 'BATTLE', { seed: SEEDS.hits });
      await pauseClock(page);
      await choose(page, info, commandItem(page, 'たたかう'));
      await expect.poll(async () => (await logLines(page)).at(0)).toMatch(/ダメージを うけた！$/);
      await expect(hp(page)).toHaveClass(/flash/);
      expect(await hp(page).evaluate((e) => {
        const s = getComputedStyle(e);
        return [s.animationDuration, s.animationIterationCount, s.animationTimingFunction];
      })).toEqual(['0.2s', '1', 'steps(1)']);
      await page.clock.runFor(200);
      await expect(hp(page)).not.toHaveClass(/flash/);

      // プレイヤーが先にスライムを倒す（敵の攻撃の行がない）
      await startAt(page, 'BATTLE', { state: { battle: battleOf('slime', 1) }, seed: SEEDS.hits });
      await choose(page, info, commandItem(page, 'たたかう'));
      await expect.poll(async () => (await logLines(page)).at(0)).toMatch(/^ゆうしゃの こうげき！/);
      await expect(hp(page)).not.toHaveClass(/flash/);
    });

    test('TC-0022-08 勝つと、行を 400ms ごとに出す間は #/battle のまま敵の名前が出ていて、最後の行のあとでダンジョンへ。クリックで残りがすぐ出て移る', async ({ page }, info) => {
      await page.clock.install();
      await startAt(page, 'BATTLE', { state: { battle: battleOf('slime', 1) }, seed: SEEDS.hits });
      await pauseClock(page);
      await choose(page, info, commandItem(page, 'たたかう'));
      await expect.poll(() => logLines(page)).toHaveLength(1);
      expect(new URL(page.url()).hash).toBe('#/battle');
      await expect(page.getByTestId('enemy-window')).toHaveText('スライム');
      await page.clock.runFor(400);
      await expect.poll(() => logLines(page)).toHaveLength(2);
      expect(new URL(page.url()).hash).toBe('#/battle');
      await page.clock.runFor(400);
      await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
      expect(new URL(page.url()).hash).toBe('#/dungeon');
      expect((await logLines(page)).slice(-2)).toEqual(['スライムを たおした！', '経験値 4 を かくとく']);

      // もう一度：1 行目が出たらメッセージ欄をクリック → すぐにダンジョンへ
      await startAt(page, 'BATTLE', { state: { battle: battleOf('slime', 1) }, seed: SEEDS.hits });
      await choose(page, info, commandItem(page, 'たたかう'));
      await expect.poll(async () => (await logLines(page)).at(-1)).toMatch(/^ゆうしゃの こうげき！/);
      await choose(page, info, page.getByTestId('message-window'));
      await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
    });

    test('TC-0023-03 倒れると「たおれた…」を出すまでは #/battle、その行で宿屋へ移り、続けて「気がつくと 宿屋に いた」。欄は danger', async ({ page }, info) => {
      await page.clock.install();
      await startAt(page, 'BATTLE', { state: { hp: 1 }, seed: SEEDS.hits });
      await pauseClock(page);
      await choose(page, info, commandItem(page, 'たたかう'));
      await expect.poll(() => logLines(page)).toHaveLength(1);
      expect(new URL(page.url()).hash).toBe('#/battle');
      await page.clock.runFor(400);
      await expect(page.locator('body')).toHaveAttribute('data-screen', 'inn');
      expect(new URL(page.url()).hash).toBe('#/inn');
      expect((await logLines(page)).at(-1)).toBe('ゆうしゃは たおれた…');
      await expect(page.getByTestId('message-window')).toHaveAttribute('data-variant', 'danger');
      await page.clock.runFor(400);
      await expect.poll(async () => (await logLines(page)).at(-1)).toBe('気がつくと 宿屋に いた');
    });
  });
});
