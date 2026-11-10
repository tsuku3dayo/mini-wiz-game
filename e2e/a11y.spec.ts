// キーボード・読み上げ（TC-0036）。キーだけの通しプレイ、フォーカスの見え方、音の出来事の文、色だけに頼らない表示、axe の検査
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import {
  battleOf, bossBattle, dungeonMap, logLines, openDebug, SEEDS, startAt, storedInventory, storedItem,
} from './helpers';
import { item, scenes } from './scenes';

const screen = (page: Page, name: string) => expect(page.locator('body')).toHaveAttribute('data-screen', name);
const lastLine = (page: Page) => logLines(page).then((l) => l.at(-1));
const pressOf = (info: TestInfo) => (l: Locator) => (info.project.name === 'desktop' ? l.click() : l.tap());
/** 今フォーカスのある要素の名前（aria-label か文字。先頭のカーソルを除く） */
const focused = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  return (a?.getAttribute('aria-label') ?? a?.textContent ?? '').replace(/^[▶\s]+/, '').trim();
});
/** Tab を押して、名前が name の要素にフォーカスを移す（20 回まで） */
async function tabTo(page: Page, name: string) {
  for (let i = 0; i < 20 && (await focused(page)) !== name; i += 1) await page.keyboard.press('Tab');
  expect(await focused(page)).toBe(name);
}
/** 戦闘のコマンドが選べるようになるまで待つ */
const commandReady = (page: Page) => expect(page.getByRole('menu', { name: '戦闘' })).not.toHaveAttribute('aria-disabled', 'true', { timeout: 15_000 });

test.describe('キーボードと読み上げ', () => {
  test('TC-0036-01 キーボードだけで、タイトルから宿屋・ダンジョン・戦闘・入れ替え・ゲームクリアを通ってタイトルへ戻れる', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    test.setTimeout(90_000);
    let pointers = 0;
    await page.exposeFunction('__countPointer', () => { pointers += 1; });
    await page.addInitScript(() => {
      for (const type of ['pointerdown', 'mousedown', 'touchstart']) {
        window.addEventListener(type, () => (window as unknown as { __countPointer: () => void }).__countPointer(), true);
      }
    });
    const key = (k: string) => page.keyboard.press(k);

    // タイトル →「はじめから」→ 名前入力（文字を打って Enter）→ 宿屋
    await openDebug(page);
    await screen(page, 'title');
    await expect.poll(() => focused(page)).toBe('はじめから');
    await key('Enter');
    await screen(page, 'new');
    await page.keyboard.type('ゆうしゃ');
    await key('Enter');
    await screen(page, 'inn');

    // 宿屋：やすむ・セーブ・メニュー（そうび・もちもの・おと）。広い画面では宿屋にステータスが出ている
    await expect.poll(() => focused(page)).toBe('やすむ');
    await key('Enter');
    await expect.poll(() => lastLine(page)).toBe('HP と MP が かいふくした');
    await key('ArrowDown');
    await key('Enter');
    await expect.poll(() => lastLine(page)).toBe('セーブしました');
    await key('ArrowDown');
    for (const [down, name] of [[0, 'そうび'], [1, 'もちもの']] as const) {
      await key('Enter');
      for (let i = 0; i < down; i += 1) await key('ArrowDown');
      await key('Enter');
      await expect(page.locator('.wiz-frame-name', { hasText: name })).toBeAttached();
      await key('Escape');
      await expect.poll(() => focused(page)).toBe('メニュー');
    }
    await expect(page.getByTestId('status-panel')).toBeVisible();
    await key('Enter');
    await key('ArrowDown');
    await key('ArrowDown');
    await expect.poll(() => focused(page)).toBe('おと：オフ');
    await key('Enter');
    await expect.poll(() => focused(page)).toBe('おと：オン');
    await key('Escape');

    // ダンジョン：矢印キーで移動、Tab で「宿屋へ戻る」
    await key('ArrowDown');
    await key('Enter');
    await screen(page, 'dungeon');
    // 作られた迷路は形が決まらないので、決まった地図の入口（北向き、前が通路）に置き直す
    await startAt(page, 'DUNGEON');
    const label = page.getByTestId('location-label');
    for (const [k, text] of [['ArrowRight', '東'], ['ArrowLeft', '北'], ['ArrowUp', '北'], ['ArrowDown', '北']] as const) {
      await key(k);
      await expect(label).toContainText(text);
    }
    await expect.poll(() => page.evaluate(async () => (await window.__wiz!.debugDungeon()).player)).toEqual({ x: 0, y: 9, facing: 'N' });
    await tabTo(page, '宿屋へ戻る');
    await key('Enter');
    await screen(page, 'inn');

    // ヒール（メニュー）と階段
    await startAt(page, 'DUNGEON', { state: { hp: 10, maxHp: 30, mp: 10, dungeon: dungeonMap({ x: 9, y: 0 }) } });
    await tabTo(page, '≡ メニュー');
    await key('Enter');
    await expect.poll(() => focused(page)).toBe('ヒール');
    await key('Enter');
    await expect.poll(() => lastLine(page)).toMatch(/かいふく/);
    await key('Escape');
    await tabTo(page, '↓ おりる');
    await key('Enter');
    await expect(label).toContainText('2F');

    // 遭遇：↑ キーで歩いて戦闘に入ると、遭遇の行を出し終えたところで「たたかう」にフォーカス
    await startAt(page, 'DUNGEON', { state: { hp: 999, maxHp: 999, dungeon: dungeonMap({ x: 4, y: 4 }) }, seed: SEEDS.slimeNext });
    await key('ArrowUp');
    await screen(page, 'battle');
    await commandReady(page);
    await expect.poll(() => focused(page)).toBe('たたかう');

    // 戦闘：ヒール・たたかう・にげる
    await startAt(page, 'BATTLE', { state: { hp: 10 }, seed: SEEDS.hits });
    await expect.poll(() => focused(page)).toBe('たたかう');
    await key('ArrowDown');
    await key('Enter');
    await commandReady(page);
    await key('ArrowUp');
    await key('Enter');
    await commandReady(page);
    await startAt(page, 'BATTLE', { state: { speed: 13, battle: battleOf('slime', 12), dungeon: dungeonMap({ x: 3, y: 6, facing: 'E' }) }, seed: SEEDS.hits });
    await key('ArrowDown');
    await key('ArrowDown');
    await expect.poll(() => focused(page)).toBe('にげる');
    await key('Enter');
    await screen(page, 'dungeon');

    // 入れ替え：ひろう → すてる個体 → はい
    await startAt(page, 'SWAP');
    await expect.poll(() => focused(page)).toMatch(/^ひろう/);
    await key('Enter');
    await expect.poll(() => focused(page)).toMatch(/ショートソード/);
    await key('Enter');
    await expect.poll(() => focused(page)).toBe('いいえ');
    await key('ArrowUp');
    await key('Enter');
    await screen(page, 'dungeon');

    // ボスを倒してゲームクリア →「宿屋へ」→「タイトルへ戻る」→ はい
    await startAt(page, 'BATTLE', { state: bossBattle(), seed: SEEDS.bossWin });
    await expect.poll(() => focused(page)).toBe('たたかう');
    await key('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'clear', { timeout: 20_000 });
    await expect(item(page, 'ゲームクリア', '宿屋へ')).not.toHaveAttribute('aria-disabled', 'true', { timeout: 15_000 });
    // クリアの演出（5833ms、v1.10）が終わるとフォーカスが「宿屋へ」に来る
    await expect.poll(() => focused(page), { timeout: 15_000 }).toBe('宿屋へ');
    await key('Enter');
    await screen(page, 'inn');
    for (let i = 0; i < 4; i += 1) await key('ArrowDown');
    await expect.poll(() => focused(page)).toBe('タイトルへ戻る');
    await key('Enter');
    await key('ArrowUp');
    await expect.poll(() => focused(page)).toBe('はい');
    await key('Enter');
    await screen(page, 'title');
    expect(pointers).toBe(0);
  });

  test('TC-0036-02 Tab で移したボタン・入力欄に琥珀 2px のリング（外側 2px）。広い画面のメニューの行は ▶ と琥珀の文字', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'キーボードのテストは desktop だけ');
    const ring = () => page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return { outline: `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor}`, offset: s.outlineOffset };
    });
    const amber = { outline: '2px solid rgb(255, 200, 69)', offset: '2px' };

    // ダンジョンのボタン（移動・階段・メニュー）を Tab で順に
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 0 }) } });
    const seen = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const name = await focused(page);
      if (await page.evaluate(() => document.activeElement?.tagName === 'BUTTON')) {
        seen.add(name);
        expect(await ring(), name).toEqual(amber);
      }
    }
    expect([...seen].sort()).toEqual(['↓ おりる', '≡ メニュー', '前進', '右を向く', '左を向く', '後退'].sort());

    // 名前の入力欄
    await openDebug(page);
    await page.evaluate(() => localStorage.clear());
    await page.goto('about:blank');
    await page.goto('./?debug=1#/new');
    await screen(page, 'new');
    await expect(page.getByRole('textbox', { name: 'なまえ' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: 'なまえ' })).toBeFocused();
    expect(await ring()).toEqual(amber);

    // 宿屋のメニューの行：リングの代わりに ▶ と琥珀の文字
    await startAt(page, 'INN');
    await page.keyboard.press('ArrowDown');
    const row = page.getByRole('menu', { name: '宿屋' }).locator('.wiz-menu-item.active');
    await expect(row).toBeFocused();
    await expect(row).toHaveText(/^▶/);
    await expect(row).toHaveCSS('color', 'rgb(255, 200, 69)');
    await expect(row).toHaveCSS('outline-style', 'none');
  });

  test.describe('音の出来事', () => {
    // 動きを減らす設定では、行を一度に出して最後の演出だけを立てる（levelUp が出ない）。TC-0032 と同じく減らさない設定で
    test.use({ reducedMotion: 'no-preference' });

    test('TC-0036-05 音の出来事のたびに、メッセージ欄に同じことの文の行が出る', async ({ page }, info) => {
      test.setTimeout(120_000);
      const press = pressOf(info);
      // app:sound が出た少しあとのメッセージ欄の行を、出来事の名前と一緒に記録する
      await page.addInitScript(() => {
        const w = window as Window & { __heard?: { name: string; lines: string[] }[] };
        w.__heard = [];
        window.addEventListener('app:sound', (e) => {
          const name = (e as CustomEvent<{ name: string }>).detail.name;
          setTimeout(() => {
            const lines = [...document.querySelectorAll('[role="log"] .wiz-line')].map((l) => l.textContent ?? '');
            w.__heard!.push({ name, lines });
          }, 50);
        });
      });
      const heard = () => page.evaluate(() => (window as Window & { __heard?: { name: string; lines: string[] }[] }).__heard ?? []);
      const expectLine = async (name: string, text: RegExp) => {
        await expect.poll(async () => (await heard()).some((h) => h.name === name), { timeout: 15_000, message: name }).toBe(true);
        const h = (await heard()).find((x) => x.name === name)!;
        expect(h.lines.some((l) => text.test(l)), `${name}：${h.lines.join(' / ')}`).toBe(true);
      };
      const attack = () => press(item(page, '戦闘', 'たたかう'));

      // おと（ゲーム中）
      await startAt(page, 'INN');
      await press(item(page, '宿屋', 'メニュー'));
      await press(item(page, 'メニュー', 'おと：オフ'));
      await expectLine('toggle', /^おとを オンにした$/);

      // 遭遇
      await startAt(page, 'DUNGEON', { state: { hp: 999, maxHp: 999, dungeon: dungeonMap({ x: 4, y: 4 }) }, seed: SEEDS.slimeNext });
      await press(page.getByRole('button', { name: '前進', exact: true }));
      await expectLine('encounter', /^スライムが あらわれた！$/);

      // レベルアップと［UR］のドロップ、［LG］のドロップ
      const darkKnight = { hp: 999, maxHp: 999, battle: battleOf('darkKnight', 1) };
      await startAt(page, 'BATTLE', { state: darkKnight, seed: SEEDS.darkKnightDropUR });
      await attack();
      await expectLine('levelUp', /^レベルが あがった！ Lv\d+$/);
      await expectLine('rareDrop', /^ダークナイトは .+［UR］（.+）を おとした！$/);
      await startAt(page, 'BATTLE', { state: darkKnight, seed: SEEDS.darkKnightDropLG });
      await attack();
      await expectLine('rareDropLG', /^ダークナイトは .+［LG］（.+）を おとした！$/);

      // ボスの出現・撃破・クリア
      await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 1, floor: 5, facing: 'N' }) } });
      await press(page.getByRole('button', { name: '前進', exact: true }));
      await expectLine('bossAppear', /^暗黒のネクロマンサーが あらわれた！$/);
      await startAt(page, 'BATTLE', { state: bossBattle(), seed: SEEDS.bossWin });
      await attack();
      await expectLine('bossDefeat', /^暗黒のネクロマンサーを たおした！$/);
      await expectLine('clear', /ダンジョンに 平和が もどった/);
    });
  });

  test('TC-0036-06 色だけに頼らない：HP の「！」、レアリティの文字、階段の記号と文字、並び順の文字、選べない項目の aria-disabled', async ({ page }, info) => {
    const press = pressOf(info);
    // HP が最大の 25% 以下で「！」
    await startAt(page, 'INN', { state: { hp: 11, maxHp: 46 } });
    await expect(page.getByTestId('status-hp')).toContainText('！');
    await startAt(page, 'INN', { state: { hp: 12, maxHp: 46 } });
    await expect(page.getByTestId('status-hp')).not.toContainText('！');

    // 一覧の項目に［N］［R］［SR］［UR］［LG］
    const rarities = ['N', 'R', 'SR', 'UR', 'LG'];
    // 段階で出るレアリティと値の範囲に合わせる（合わないと読み込みで直される。仕様書 §8.3）
    const items = [['weapon1', 1], ['weapon1', 1], ['weapon4', 10], ['weapon6', 28], ['weapon8', 60]]
      .map(([id, value], i) => storedItem(i + 1, id as string, rarities[i], value as number));
    await startAt(page, 'INN', { state: { inventory: storedInventory({ items }) } });
    await press(item(page, '宿屋', 'メニュー'));
    await press(item(page, 'メニュー', 'もちもの'));
    const rows = (await page.getByRole('menu', { name: 'もちもの' }).getByRole('menuitem').allTextContents()).join(' ');
    for (const r of rarities) expect(rows).toContain(`［${r}］`);
    await expect(page.locator('.wiz-order-label')).toHaveText('よわい じゅん');

    // そうびの候補の一覧は「つよい じゅん」
    await startAt(page, 'INN', { state: { inventory: storedInventory({ items }) } });
    await press(item(page, '宿屋', 'メニュー'));
    await press(item(page, 'メニュー', 'そうび'));
    await press(item(page, 'そうび', /ぶき/));
    await expect(page.locator('.wiz-order-label')).toHaveText('つよい じゅん');

    // ドロップの行に［N］
    await startAt(page, 'BATTLE', { state: { hp: 999, maxHp: 999, battle: battleOf('goblin', 1) }, seed: SEEDS.goblinDropN });
    await press(item(page, '戦闘', 'たたかう'));
    await expect.poll(() => logLines(page), { timeout: 10_000 }).toContainEqual(expect.stringMatching(/［N］.*を おとした！$/));

    // 地図の記号（↑ (0,9)・↓ (9,0) を踏破済みにし、(5,5) に立つ。今いるマスは矢印だけなので階段から離れる。1F の上りは「入」）
    const both = (floor: number, at: { x: number; y: number }) => {
      const d = dungeonMap({ ...at, floor }) as { floors: { visited: boolean[] }[] };
      d.floors[floor - 1].visited = d.floors[floor - 1].visited.map((v, j) => v || j === 90 || j === 9);
      return d;
    };
    const symbols = async () => (await page.getByTestId('auto-map').locator('text.stairs').allTextContents()).sort();
    await startAt(page, 'DUNGEON', { state: { dungeon: both(2, { x: 5, y: 5 }) } });
    expect(await symbols()).toEqual(['↑', '↓'].sort());
    await startAt(page, 'DUNGEON', { state: { dungeon: both(1, { x: 5, y: 5 }) } });
    expect(await symbols()).toEqual(['↓', '入'].sort());
    // 足元のボタンの文字
    await startAt(page, 'DUNGEON', { state: { dungeon: both(2, { x: 9, y: 0 }) } });
    await expect(page.getByRole('button', { name: '↓ おりる' })).toBeVisible();
    await startAt(page, 'DUNGEON', { state: { dungeon: both(2, { x: 0, y: 9 }) } });
    await expect(page.getByRole('button', { name: '↑ のぼる' })).toBeVisible();
    await startAt(page, 'DUNGEON', { state: { dungeon: both(1, { x: 0, y: 9 }) } });
    await expect(page.getByRole('button', { name: '宿屋へ戻る' })).toBeVisible();

    // 選べない項目（MP が足りないヒール）に aria-disabled="true"
    await startAt(page, 'DUNGEON', { state: { hp: 10, mp: 0 } });
    await press(page.getByRole('button', { name: '≡ メニュー' }));
    await expect(item(page, 'メニュー', 'ヒール')).toHaveAttribute('aria-disabled', 'true');
  });

  test('TC-0036-10 axe で、どの画面・状態でも違反が 0 件（演出の rareDrop・bossAppear を含む）', async ({ page }, info) => {
    test.setTimeout(180_000);
    const press = pressOf(info);
    const check = async (name: string) => {
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations.map((v) => `${v.id}：${v.nodes.map((n) => n.target.join(' ')).join('、')}`), name).toEqual([]);
    };
    const narrow = page.viewportSize()!.width < 600;
    for (const s of scenes(page, press)) {
      if (s.narrowOnly && !narrow) continue;
      await s.open();
      await check(s.name);
    }
    // 演出を出しているあいだ
    await startAt(page, 'BATTLE', { state: { hp: 999, maxHp: 999, battle: battleOf('darkKnight', 1) }, seed: SEEDS.darkKnightDropUR });
    await press(item(page, '戦闘', 'たたかう'));
    await page.locator('#effect-layer[data-effect="rareDrop"]').waitFor({ state: 'attached', timeout: 15_000 });
    await check('演出 rareDrop');
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 1, floor: 5, facing: 'N' }) } });
    await press(page.getByRole('button', { name: '前進', exact: true }));
    await page.locator('#effect-layer[data-effect="bossAppear"]').waitFor({ state: 'attached', timeout: 15_000 });
    await check('演出 bossAppear');
  });
});
