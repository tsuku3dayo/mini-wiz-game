// 画面の大きさとタッチ（TC-0035）。全画面・全状態を順に出して、はみ出しと押せる大きさを測る
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import {
  battleOf, bossBattle, dungeonMap, logLines, openDebug, SEEDS, shortSwords, startAt, storedInventory, storedItem, storedSave, writeScene,
} from './helpers';

const wideOf = (page: Page) => page.viewportSize()!.width >= 600;

/** 書き込みを失敗させる（ErrorPanel を出す） */
const failWrites = (page: Page) => page.evaluate(() => {
  Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
});

const item = (page: Page, menu: string, text: string | RegExp) =>
  page.getByRole('menu', { name: menu, exact: true }).getByRole('menuitem').filter({ hasText: text });

/** 所持品 50 個（装備 4 つ）の宿屋。そうび・もちもの・ステータスが一番長くなる状態 */
const heavy = {
  level: 15, exp: 2584, hp: 80, maxHp: 120, mp: 20, maxMp: 40,
  inventory: storedInventory({
    items: shortSwords(50, 10),
    equipped: {
      weapon: storedItem(1, 'weapon6', 'UR', 28),
      armor: storedItem(2, 'armor4', 'R', 10),
      shield: storedItem(3, 'shield4', 'R', 6),
      accessory: storedItem(4, 'accessory4', 'R', 15),
    },
  }),
};

type Scene = { name: string; open: () => Promise<void>; narrowOnly?: boolean };

/** どの画面も（TC-0035 の前書き）：10 画面と、メニュー・確認・ErrorPanel を出した状態 */
function scenes(page: Page, press: (l: Locator) => Promise<void>): Scene[] {
  const screen = (name: string) => expect(page.locator('body')).toHaveAttribute('data-screen', name);
  const innMenu = async () => {
    await startAt(page, 'INN', { state: heavy });
    await press(item(page, '宿屋', 'メニュー'));
    await expect(page.getByRole('menu', { name: 'メニュー' })).toBeVisible();
  };
  const dungeon = () => startAt(page, 'DUNGEON', { state: { ...heavy, dungeon: dungeonMap({ x: 9, y: 0 }) } });
  const battle = () => startAt(page, 'BATTLE', { state: heavy, seed: SEEDS.hits });
  return [
    {
      name: 'タイトル',
      open: async () => {
        // 前の場面のプレイ中の状態があるとタイトルを開けないので、保存を消してから開き直す
        await openDebug(page);
        await page.evaluate(() => localStorage.clear());
        await page.goto('about:blank');
        await openDebug(page);
        await writeScene(page, { save: storedSave({ level: 15 }) });
        await expect(item(page, 'タイトル', 'つづきから')).toBeVisible();
      },
    },
    {
      name: '名前入力',
      open: async () => {
        await openDebug(page);
        await page.evaluate(() => localStorage.clear());
        await page.goto('about:blank');
        await page.goto('./?debug=1#/new');
        await screen('new');
      },
    },
    { name: '宿屋', open: () => startAt(page, 'INN', { state: heavy }) },
    { name: '宿屋・メニュー', open: innMenu },
    {
      name: '宿屋・確認',
      open: async () => {
        await startAt(page, 'INN', { state: heavy });
        await press(item(page, '宿屋', 'タイトルへ戻る'));
        await expect(page.getByRole('menu', { name: 'かくにん' })).toBeVisible();
      },
    },
    {
      name: '宿屋・エラー',
      open: async () => {
        await startAt(page, 'INN', { state: heavy });
        await failWrites(page);
        await press(item(page, '宿屋', 'やすむ'));
        await expect(page.getByTestId('error-panel')).toBeVisible();
      },
    },
    {
      name: 'そうび',
      open: async () => {
        await innMenu();
        await press(item(page, 'メニュー', 'そうび'));
        await expect(page.getByRole('menu', { name: 'そうび' }).first()).toBeVisible();
      },
    },
    {
      name: 'もちもの',
      open: async () => {
        await innMenu();
        await press(item(page, 'メニュー', 'もちもの'));
        await expect(page.getByTestId('inventory-window')).toBeVisible();
      },
    },
    {
      name: 'もちもの・確認',
      open: async () => {
        await innMenu();
        await press(item(page, 'メニュー', 'もちもの'));
        await press(item(page, 'もちもの', /ショートソード/).first());
        await expect(page.getByRole('menu', { name: 'かくにん' })).toBeVisible();
      },
    },
    {
      name: 'ステータス',
      narrowOnly: true,
      open: async () => {
        await innMenu();
        await press(item(page, 'メニュー', 'ステータス'));
        await expect(page.getByRole('menu', { name: 'ステータス' })).toBeVisible();
      },
    },
    { name: 'ダンジョン', open: dungeon },
    {
      name: 'ダンジョン・メニュー',
      open: async () => {
        await dungeon();
        await press(page.getByRole('button', { name: /メニュー/ }));
        await expect(page.getByRole('menu', { name: 'メニュー' })).toBeVisible();
      },
    },
    {
      name: 'ダンジョン・エラー',
      open: async () => {
        await dungeon();
        await failWrites(page);
        await press(page.getByRole('button', { name: '左を向く', exact: true }));
        await expect(page.getByTestId('error-panel')).toBeVisible();
      },
    },
    { name: '戦闘', open: battle },
    { name: '戦闘（ボス）', open: () => startAt(page, 'BATTLE', { state: { ...heavy, ...bossBattle() } }) },
    {
      name: '戦闘・エラー',
      open: async () => {
        await battle();
        await failWrites(page);
        await press(item(page, '戦闘', 'たたかう'));
        await expect(page.getByTestId('error-panel')).toBeVisible();
      },
    },
    { name: '入れ替え', open: () => startAt(page, 'SWAP') },
    {
      name: '入れ替え・一覧',
      open: async () => {
        await startAt(page, 'SWAP');
        await press(item(page, 'いれかえ', 'ひろう'));
        await expect(page.getByRole('menu', { name: 'もちもの' })).toBeVisible();
      },
    },
    {
      name: '入れ替え・確認',
      open: async () => {
        await startAt(page, 'SWAP');
        await press(item(page, 'いれかえ', 'あきらめる'));
        await expect(page.getByRole('menu', { name: 'かくにん' })).toBeVisible();
      },
    },
    { name: 'ゲームクリア', open: () => startAt(page, 'CLEARED', { state: heavy }) },
  ];
}

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
      const kind = e.getAttribute('role') === 'menuitem' ? 'row' : e.classList.contains('wiz-filter-button') ? 'filter' : 'button';
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
    await tap(item(page, '宿屋', 'セーブ'));
    await expect.poll(lastLine).toBe('セーブしました');
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
    expect(keys).toBe(0);
  });
});
