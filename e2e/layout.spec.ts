// 画面の大きさとタッチ（TC-0035）。全画面・全状態を順に出して、はみ出しと押せる大きさを測る
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { battleOf, bossBattle, dungeonMap, logLines, openDebug, SEEDS, startAt } from './helpers';
import { item, scenes } from './scenes';

const wideOf = (page: Page) => page.viewportSize()!.width >= 600;

/** 横・縦のはみ出し（px） */
function overflow(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => ({
    x: document.documentElement.scrollWidth - window.innerWidth,
    y: document.documentElement.scrollHeight - window.innerHeight,
  }));
}

type Target = { kind: 'button' | 'filter' | 'row'; text: string; w: number; h: number };

/** 見えているボタンとメニューの行の大きさ */
function targets(page: Page): Promise<Target[]> {
  return page.evaluate(() => {
    const out: Target[] = [];
    for (const e of document.querySelectorAll<HTMLElement>('button, .wiz-button, [role="menuitem"]')) {
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || e.closest('[hidden], .visually-hidden')) continue;
      // 戦闘のコマンドのボタン（role="menuitem" の button）は、メニューの行でなくボタンとして測る（広い画面も。v1.17）
      const kind = e.getAttribute('role') === 'menuitem' && !e.classList.contains('command-button') ? 'row' : e.classList.contains('wiz-filter-button') ? 'filter' : 'button';
      out.push({ kind, text: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 20), w: r.width, h: r.height });
    }
    return out;
  });
}

/** 全画面を順に出して、測る */
async function eachScene(page: Page, info: TestInfo, check: (name: string) => Promise<void>) {
  const press = (l: Locator) => (info.project.name === 'desktop' ? l.click() : l.tap());
  const narrow = !wideOf(page);
  for (const s of scenes(page, press)) {
    if (s.narrowOnly && !narrow) continue;
    await s.open();
    // 一覧の高さは描いた次のコマで画面に合わせる（fitItemList）。2 コマ待ってから測る（遅い CI では、待たないと合わせる前を測る）
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await check(s.name);
  }
}

test.describe('画面の大きさとタッチ', () => {
  test('TC-0035-02 pixel7・small で、どの画面も横にはみ出さない', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', '狭い画面だけ');
    await eachScene(page, info, async (name) => {
      expect((await overflow(page)).x, name).toBeLessThanOrEqual(0);
    });
  });

  test('TC-0035-03 ボタンは幅・高さとも 48px 以上、メニューの行は 44px 以上（desktop では 25.6px）', async ({ page }, info) => {
    const desktop = info.project.name === 'desktop';
    await eachScene(page, info, async (name) => {
      const list = await targets(page);
      expect(list.length, name).toBeGreaterThan(0);
      for (const t of list) {
        const where = `${name}：${t.text}`;
        if (t.kind === 'button') {
          expect(t.w, where).toBeGreaterThanOrEqual(48);
          expect(t.h, where).toBeGreaterThanOrEqual(48);
        } else if (t.kind === 'filter') {
          // しぼりこみの ◀▶ は 44×44px（仕様書 §11.7「もちもの画面」）
          expect([t.w, t.h], where).toEqual([44, 44]);
        } else if (desktop) {
          // 1 行の高さ 25.6px（名前の長い個体が 2 行に折り返すときはその倍）
          expect(Math.round(t.h * 10) % 256, where).toBe(0);
        } else {
          expect(t.h, where).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test('TC-0035-04 414×715 で、どの画面も 1 画面に収まり、横にもはみ出さない', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', '指で触る画面だけ');
    await page.setViewportSize({ width: 414, height: 715 });
    await eachScene(page, info, async (name) => {
      const o = await overflow(page);
      expect(o.x, name).toBeLessThanOrEqual(0);
      expect(o.y, name).toBeLessThanOrEqual(0);
    });
  });

  test('TC-0035-13 戦闘のボタンは高さ 88px（枠なし）・横 1 列で下の方にあり、414×715 ではみ出さず、375×667 のはみ出しは v1.1（47px）より小さい', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', '指で触る画面だけ');
    const measure = async () => page.evaluate(() => {
      const menu = document.querySelector('[role="menu"][aria-label="戦闘"]')!;
      const rects = [...menu.querySelectorAll('[role="menuitem"]')].map((b) => b.getBoundingClientRect());
      const doc = document.documentElement;
      return {
        heights: rects.map((r) => Math.round(r.height)),
        tops: rects.map((r) => Math.round(r.top)),
        // ページの一番下までスクロールしたときの、ボタンの下端から画面の下端まで
        fromBottom: Math.round(Math.max(doc.scrollHeight, window.innerHeight) - (rects[0].bottom + window.scrollY)),
        overflowY: doc.scrollHeight - window.innerHeight,
      };
    });
    for (const [width, height] of [[414, 715], [375, 667]] as const) {
      await page.setViewportSize({ width, height });
      await startAt(page, 'BATTLE');
      const m = await measure();
      info.annotations.push({ type: '戦闘の画面', description: `${width}×${height}：縦のはみ出し ${m.overflowY}px、ボタンの下端から画面の下まで ${m.fromBottom}px` });
      expect(m.heights, `${width}×${height}`).toEqual([88, 88, 88]);
      expect(new Set(m.tops).size, `${width}×${height}`).toBe(1);
      // 親指で押す下の方（スクロールして届くところで、下端から 160px 以内）
      expect(m.fromBottom, `${width}×${height}`).toBeLessThanOrEqual(160);
      if (width === 414) expect(m.overflowY).toBeLessThanOrEqual(0);
      else expect(m.overflowY).toBeLessThan(47);
    }
  });

  test('TC-0035-12 desktop（1280×800）と 1366×657 で、はみ出さず、外枠は 800px 以下で中央、宿屋・ダンジョン・戦闘は 2 列', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'PC だけ');
    for (const size of [{ width: 1280, height: 800 }, { width: 1366, height: 657 }]) {
      await page.setViewportSize(size);
      await eachScene(page, info, async (scene) => {
        const name = `${size.width}×${size.height} ${scene}`;
        const o = await overflow(page);
        expect(o.x, name).toBeLessThanOrEqual(0);
        expect(o.y, name).toBeLessThanOrEqual(0);
        const frame = await page.locator('main').first().evaluate((e) => {
          const r = e.getBoundingClientRect();
          return { width: r.width, left: r.left, right: window.innerWidth - r.right };
        });
        expect(frame.width, name).toBeLessThanOrEqual(800);
        expect(Math.abs(frame.left - frame.right), name).toBeLessThanOrEqual(1);
        if (/^(宿屋|ダンジョン|戦闘)/.test(scene)) {
          const [l, r] = await Promise.all(['column-left', 'column-right'].map((id) =>
            page.getByTestId(id).first().evaluate((e) => { const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top }; })));
          expect(r.left, name).toBeGreaterThanOrEqual(l.right);
          expect(Math.abs(r.top - l.top), name).toBeLessThanOrEqual(1);
        }
      });
    }
  });

  test('TC-0035-06 viewport-fit=cover と、外枠・更新の帯の安全領域の余白。安全領域がなければ外枠の余白は 8px', async ({ page }) => {
    await openDebug(page);
    expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('viewport-fit=cover');
    // 規則の文字（変数を通して使うものは、変数の定義と使う側の両方）を集める
    const rules = await page.evaluate(() => {
      const out: { selector: string; text: string }[] = [];
      const walk = (list: CSSRuleList) => {
        for (const r of list) {
          if (r instanceof CSSStyleRule) out.push({ selector: r.selectorText, text: r.style.cssText });
          else if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
        }
      };
      for (const s of document.styleSheets) walk(s.cssRules);
      return out;
    });
    const decl = (selector: string) => rules.filter((r) => r.selector.split(',').map((x) => x.trim()).includes(selector)).map((r) => r.text).join(' ');
    const root = decl(':root');
    // 変数の名前を、それが使う env() の値に置き換えて読む
    const expand = (text: string) => text.replace(/var\((--[\w-]+)\)/g, (_, v: string) => {
      const m = new RegExp(`${v}:\\s*([^;]+);`).exec(root);
      return m ? m[1] : '';
    });
    for (const selector of ['.wiz-frame', '.title-main', '.update-banner']) {
      const padding = expand(decl(selector));
      const sides = selector === '.update-banner' ? ['top', 'left', 'right'] : ['top', 'bottom', 'left', 'right'];
      for (const side of sides) expect(padding, `${selector} ${side}`).toContain(`env(safe-area-inset-${side})`);
    }
    // 帯の下は安全領域にかからない（画面の上端に固定）。下の安全領域は外枠が受け持つ
    expect(decl('.update-banner')).toContain('top: 0px');

    await startAt(page, 'INN');
    const pad = await page.locator('main.wiz-frame').evaluate((e) => {
      const s = getComputedStyle(e);
      return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
    });
    expect(pad).toEqual(['8px', '8px', '8px', '8px']);
  });

  test('TC-0035-09 拡大を禁じない（viewport に user-scalable=no・maximum-scale なし、touch-action が none でない）', async ({ page }) => {
    await openDebug(page);
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
    expect(content).not.toContain('user-scalable');
    expect(content).not.toContain('maximum-scale');
    const touch = await page.evaluate(() => [document.documentElement, document.body].map((e) => getComputedStyle(e).touchAction));
    for (const t of touch) expect(t).not.toBe('none');
  });

  test('TC-0035-10 文字は 16px・行の高さ 25.6px・色と背景、端末のフォントだけ、ステータスの数字は 3 桁右揃え', async ({ page }) => {
    const fonts: string[] = [];
    page.on('request', (r) => { if (/\.(woff2?|ttf|otf)(\?|$)/i.test(r.url())) fonts.push(r.url()); });
    await openDebug(page);
    const body = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return { size: s.fontSize, line: s.lineHeight, color: s.color, bg: s.backgroundColor, family: s.fontFamily };
    });
    expect(body).toMatchObject({ size: '16px', line: '25.6px', color: 'rgb(232, 220, 192)', bg: 'rgb(11, 10, 15)' });
    expect(body.family.split(',')[0].trim()).toBe('"MS Gothic"');

    await startAt(page, 'INN', { state: { level: 3, exp: 80, hp: 25, maxHp: 46, mp: 10, maxMp: 16 } });
    const status = page.getByTestId('status-panel');
    const values = async () => {
      const dts = await status.locator('dt').allTextContents();
      const dds = await status.locator('dd').allTextContents();
      return Object.fromEntries(dts.map((t, i) => [t, dds[i]]));
    };
    expect(await values()).toMatchObject({ HP: ' 25/ 46', MP: ' 10/ 16' });
    for (const dd of await status.locator('dd').all()) {
      expect(await dd.evaluate((e) => getComputedStyle(e).fontVariantNumeric)).toBe('tabular-nums');
    }
    await startAt(page, 'DUNGEON', { state: { hp: 25, maxHp: 46, mp: 10, maxMp: 16 } });
    await expect(page.getByTestId('status-hp')).toContainText(' 25/ 46');
    expect(fonts).toEqual([]);
  });

  test('TC-0035-01 タップだけで、タイトルから宿屋・ダンジョン・戦闘・入れ替え・ゲームクリアを通って宿屋へ戻れる', async ({ page }, info) => {
    test.skip(info.project.name === 'desktop', 'タップできる端末だけ');
    let keys = 0;
    await page.exposeFunction('__countKey', () => { keys += 1; });
    await page.addInitScript(() => {
      window.addEventListener('keydown', () => (window as unknown as { __countKey: () => void }).__countKey(), true);
    });
    const tap = (l: Locator) => l.tap();
    const screen = (name: string) => expect(page.locator('body')).toHaveAttribute('data-screen', name);
    const lastLine = () => logLines(page).then((l) => l.at(-1));
    const back = (menu: string) => tap(item(page, menu, 'もどる'));

    // タイトル →「はじめから」→ 名前入力 → 宿屋
    await openDebug(page);
    await screen('title');
    await tap(item(page, 'タイトル', 'はじめから'));
    await screen('new');
    await tap(page.getByRole('textbox', { name: 'なまえ' }));
    await page.getByRole('textbox', { name: 'なまえ' }).fill('ゆうしゃ');
    await tap(item(page, 'なまえ入力', '決定'));
    await screen('inn');

    // 宿屋：やすむ・セーブ・メニュー（そうび・もちもの・ステータス）
    await tap(item(page, '宿屋', 'やすむ'));
    await expect.poll(lastLine).toBe('HP と MP が かいふくした');
    // セーブ：スロットを選ぶ（空きはすぐ書く）→ もう一度、中身のあるスロットで上書きの確認 → はい（v1.14）
    await tap(item(page, '宿屋', 'セーブ'));
    await tap(item(page, 'セーブ', 'スロット1'));
    await expect.poll(lastLine).toBe('スロット1に セーブしました');
    await expect(page.getByRole('menu', { name: '宿屋' })).not.toHaveAttribute('aria-disabled', 'true');
    await tap(item(page, '宿屋', 'セーブ'));
    await tap(item(page, 'セーブ', 'スロット1'));
    await tap(item(page, 'かくにん', 'はい'));
    await expect.poll(lastLine).toBe('スロット1に セーブしました');
    await expect(page.getByRole('menu', { name: '宿屋' })).not.toHaveAttribute('aria-disabled', 'true');
    await tap(item(page, '宿屋', 'メニュー'));
    await back('メニュー');
    await expect(page.getByRole('menu', { name: '宿屋' })).toBeVisible();
    for (const label of ['そうび', 'もちもの', 'ステータス']) {
      await tap(item(page, '宿屋', 'メニュー'));
      await tap(item(page, 'メニュー', label));
      await expect(page.locator('.wiz-frame-name', { hasText: label })).toBeAttached();
      await back(label);
      await expect(page.getByRole('menu', { name: '宿屋' })).toBeVisible();
    }

    // ダンジョン：移動ボタン・宿屋へ戻る
    await page.evaluate((s) => window.__wiz!.useSeed(s), SEEDS.noEncounter);
    await tap(item(page, '宿屋', 'ダンジョンへ'));
    await screen('dungeon');
    // 作られた迷路は形が決まらないので、決まった地図の入口（北向き、前が通路）に置き直す
    await startAt(page, 'DUNGEON');
    const label = page.getByTestId('location-label');
    await expect(label).toContainText('1F 北');
    for (const [button, text] of [['右を向く', '東'], ['左を向く', '北'], ['前進', '北'], ['後退', '北']] as const) {
      await tap(page.getByRole('button', { name: button, exact: true }));
      await expect(label).toContainText(text);
    }
    await expect.poll(() => page.evaluate(async () => (await window.__wiz!.debugDungeon()).player)).toMatchObject({ x: 0, y: 9 });
    await tap(page.getByRole('button', { name: '宿屋へ戻る' }));
    await screen('inn');

    // 階段・ヒール：くだり階段の上で、HP の減った状態から
    await startAt(page, 'DUNGEON', { state: { hp: 10, maxHp: 30, mp: 10, dungeon: dungeonMap({ x: 9, y: 0 }) } });
    await tap(page.getByRole('button', { name: /メニュー/ }));
    await tap(item(page, 'メニュー', 'ヒール'));
    await expect.poll(lastLine).toMatch(/かいふく/);
    await back('メニュー');
    await tap(page.getByRole('button', { name: /おりる/ }));
    await expect(label).toContainText('2F');

    // 戦闘：ヒール・たたかう・にげる（逐次表示の途中はメッセージ欄のタップで残りを出す）
    await startAt(page, 'BATTLE', { state: { hp: 10 }, seed: SEEDS.hits });
    await tap(item(page, '戦闘', 'ヒール'));
    await expect.poll(lastLine).toMatch(/こうげき|かいふく/);
    await expect(page.getByRole('menu', { name: '戦闘' })).not.toHaveAttribute('aria-disabled', 'true');
    await tap(item(page, '戦闘', 'たたかう'));
    await tap(page.getByTestId('message-window'));
    await expect(page.getByRole('menu', { name: '戦闘' })).not.toHaveAttribute('aria-disabled', 'true');
    // にげる：逃げきれる場面（battle.spec の TC-0020-03 と同じ）を作り直す
    await startAt(page, 'BATTLE', { state: { speed: 13, battle: battleOf('slime', 12), dungeon: dungeonMap({ x: 3, y: 6, facing: 'E' }) }, seed: SEEDS.hits });
    await tap(item(page, '戦闘', 'にげる'));
    await screen('dungeon');

    // 入れ替え：ひろう → すてる個体 → はい
    await startAt(page, 'SWAP');
    await tap(item(page, 'いれかえ', 'ひろう'));
    await tap(item(page, 'もちもの', /ショートソード/).first());
    await tap(item(page, 'かくにん', 'はい'));
    await screen('dungeon');

    // ボスを倒してゲームクリア（逐次表示はメッセージ欄のタップで進める）→「宿屋へ」
    await startAt(page, 'BATTLE', { state: bossBattle(), seed: SEEDS.bossWin });
    await tap(item(page, '戦闘', 'たたかう'));
    for (let i = 0; i < 30 && (await page.evaluate(() => document.body.dataset.screen)) !== 'clear'; i += 1) {
      await tap(page.getByTestId('message-window'));
    }
    await screen('clear');
    for (let i = 0; i < 10 && (await item(page, 'ゲームクリア', '宿屋へ').getAttribute('aria-disabled')) === 'true'; i += 1) {
      await tap(page.getByTestId('message-window'));
    }
    await tap(item(page, 'ゲームクリア', '宿屋へ'));
    await screen('inn');

    // タイトルへ戻る →「つづきから」→ スロットを選んで宿屋へ（v1.14）
    await expect(page.getByRole('menu', { name: '宿屋' })).not.toHaveAttribute('aria-disabled', 'true');
    await tap(item(page, '宿屋', 'タイトルへ戻る'));
    await tap(item(page, 'かくにん', 'はい'));
    await screen('title');
    await tap(item(page, 'タイトル', 'つづきから'));
    await tap(item(page, 'つづきから', 'スロット1'));
    await screen('inn');
    expect(keys).toBe(0);
  });
});
