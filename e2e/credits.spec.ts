// クレジット（仕様書 §11.5「クレジット」、GUI-0002 §3、TC-0040）
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { bgmNames, openDebug, recordAudio, startAt, storedSave, writeScene } from './helpers';
import { failWrites, item } from './scenes';

const CREDITS = [
  ['PRODUCER', 'つくだ よしはる'],
  ['DIRECTOR', 'つくだ よしはる'],
  ['GAME DESIGNER', 'つくだ よしはる'],
  ['GRAPHIC DESIGNER', 'CLAUDE CODE'],
  ['SOUND CREATOR', 'CLAUDE CODE'],
  ['PROGRAMMER', 'CLAUDE CODE'],
];

const desktop = (info: TestInfo) => info.project.name === 'desktop';
const press = (info: TestInfo, l: Locator) => (desktop(info) ? l.click() : l.tap());
const screen = (page: Page, name: string) => expect(page.locator('body')).toHaveAttribute('data-screen', name);
const backButton = (page: Page) => page.getByRole('button', { name: 'もどる', exact: true });
/** 行の頭の ▶／全角スペースを外した文字 */
const rowTexts = async (page: Page) =>
  (await page.getByRole('menu', { name: 'タイトル' }).getByRole('menuitem').allTextContents()).map((t) => t.replace(/^[▶\s]/, ''));

/** ゲームのない状態でタイトルを開く（セーブを置くこともできる） */
async function openTitle(page: Page, save = false) {
  await page.goto('./?debug=1');
  await page.waitForFunction(() => window.__wiz !== undefined);
  if (save) await writeScene(page, { save: storedSave({ level: 12 }) });
  await expect(item(page, 'タイトル', 'クレジット')).toBeVisible();
}

/** タイトルの「クレジット」を選んでクレジット画面へ（desktop はキー、ほかはタップ） */
async function openCredits(page: Page, info: TestInfo) {
  if (desktop(info)) {
    await item(page, 'タイトル', 'クレジット').click();
  } else {
    await item(page, 'タイトル', 'クレジット').tap();
  }
  await screen(page, 'credits');
}

test.describe('クレジット', () => {
  test('TC-0040-01 タイトルのメニューの 4 つ目が「クレジット」で「おと」と同じ高さ。初めのカーソルは変わらない', async ({ page }) => {
    await openTitle(page);
    expect(await rowTexts(page)).toEqual(['はじめから', 'つづきから', 'おと：オフ', 'クレジット']);
    const [sound, credits] = await Promise.all([
      item(page, 'タイトル', 'おと').evaluate((e) => e.getBoundingClientRect().height),
      item(page, 'タイトル', 'クレジット').evaluate((e) => e.getBoundingClientRect().height),
    ]);
    expect(Math.abs(sound - credits)).toBeLessThanOrEqual(0.5);
    await expect(item(page, 'タイトル', 'はじめから')).toContainText('▶');
    await expect(item(page, 'タイトル', 'クレジット')).not.toContainText('▶');

    // セーブがあるときは つづきから
    await openTitle(page, true);
    await expect(item(page, 'タイトル', 'つづきから')).toContainText('▶');
  });

  test('TC-0040-02 「クレジット」を選ぶと #/credits。見出し「クレジット」が中央、「もどる」が左でフォーカスされている', async ({ page }, info) => {
    await openTitle(page);
    if (desktop(info)) {
      // キーで：はじめから → ↓↓↓ → クレジットで Enter
      for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
      await expect(item(page, 'タイトル', 'クレジット')).toBeFocused();
      await page.keyboard.press('Enter');
    } else {
      await item(page, 'タイトル', 'クレジット').tap();
    }
    await screen(page, 'credits');
    expect(new URL(page.url()).hash).toBe('#/credits');
    const heading = page.getByRole('heading', { level: 1, name: 'クレジット' });
    await expect(heading).toBeVisible();
    await expect(backButton(page)).toBeFocused();
    const [b, h, w] = await Promise.all([
      backButton(page).evaluate((e) => e.getBoundingClientRect().toJSON()),
      heading.evaluate((e) => e.getBoundingClientRect().toJSON()),
      page.evaluate(() => document.documentElement.clientWidth),
    ]);
    expect(b.right).toBeLessThanOrEqual(h.left);
    expect(Math.abs(h.left + h.width / 2 - w / 2)).toBeLessThanOrEqual(1);
  });

  test('TC-0040-04 6 組が順に、ゲームの色・大きさで中央に出る。メッセージ欄はない', async ({ page }, info) => {
    await openTitle(page);
    await openCredits(page, info);
    const pairs = await page.locator('.credits-list > div').evaluateAll((items) =>
      items.map((d) => [d.querySelector('dt')!.textContent, d.querySelector('dd')!.textContent]));
    expect(pairs).toEqual(CREDITS);

    const style = (l: Locator) => l.evaluate((e) => {
      const s = getComputedStyle(e);
      return { color: s.color, size: s.fontSize, spacing: s.letterSpacing, weight: s.fontWeight };
    });
    expect(await style(page.getByRole('heading', { level: 1 }))).toMatchObject({ color: 'rgb(201, 162, 39)', size: '24px' });
    expect(await style(page.locator('.credits-list dt').first())).toMatchObject({ color: 'rgb(163, 155, 139)', size: '13px', spacing: '1.3px' });
    expect(await style(page.locator('.credits-list dd').first())).toMatchObject({ color: 'rgb(232, 220, 192)', size: '20px', weight: '700' });

    // どの役割・名前も画面の横の中央（文字の幅で測る）
    const offsets = await page.locator('.credits-list dt, .credits-list dd').evaluateAll((els) => {
      const mid = document.documentElement.clientWidth / 2;
      return els.map((e) => {
        const range = document.createRange();
        range.selectNodeContents(e);
        const r = range.getBoundingClientRect();
        return Math.abs(r.left + r.width / 2 - mid);
      });
    });
    expect(offsets).toHaveLength(12);
    for (const o of offsets) expect(o).toBeLessThanOrEqual(1);
    await expect(page.getByRole('log')).toHaveCount(0);
  });

  test('TC-0040-05 「もどる」（クリック・タップ・Enter）と Esc でタイトルへ戻る', async ({ page }, info) => {
    await openTitle(page);
    await openCredits(page, info);
    await press(info, backButton(page));
    await screen(page, 'title');
    expect(new URL(page.url()).hash).toBe('#/');
    await expect(item(page, 'タイトル', 'クレジット')).toBeVisible();
    if (!desktop(info)) return;

    // キー（desktop）：フォーカスのある「もどる」で Enter、もう一度開いて Esc
    await openCredits(page, info);
    await expect(backButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await screen(page, 'title');
    await openCredits(page, info);
    await page.locator('h1').click(); // フォーカスをボタンの外へ
    await page.keyboard.press('Escape');
    await screen(page, 'title');
  });

  test('TC-0040-06 「もどる」の読み上げの名前は「もどる」で、「←」は読ませない。役割と名前は同じ <dl> の中', async ({ page }, info) => {
    await openTitle(page);
    await openCredits(page, info);
    await expect(backButton(page)).toHaveCount(1);
    await expect(backButton(page).locator('[aria-hidden="true"]')).toHaveText('← ');
    await expect(backButton(page)).toContainText('← もどる');
    expect(await page.locator('dl').count()).toBe(1);
    await expect(page.locator('dl > div > dt')).toHaveCount(6);
    await expect(page.locator('dl > div > dd')).toHaveCount(6);
  });

  test.describe('曲', () => {
    test.use({ reducedMotion: 'no-preference' });
    test('TC-0040-07 タイトル → クレジット → タイトルで、タイトルの曲を替えない（app:bgm は最初の 1 回だけ）', async ({ page }, info) => {
      await page.addInitScript(() => localStorage.setItem('mini-wiz-game-sound', 'on'));
      await recordAudio(page);
      await openTitle(page);
      await expect.poll(() => bgmNames(page)).toEqual(['title']);
      await openCredits(page, info);
      await press(info, backButton(page));
      await screen(page, 'title');
      await expect(item(page, 'タイトル', 'クレジット')).toBeVisible();
      await page.waitForTimeout(1000);
      expect(await bgmNames(page)).toEqual(['title']);
    });
  });

  test('TC-0040-08 プレイ中のゲーム（宿屋）があるとき #/credits を開くと宿屋になる', async ({ page }) => {
    await startAt(page, 'INN');
    await page.goto('./?debug=1#/credits');
    await page.waitForURL(/#\/inn$/);
    await screen(page, 'inn');
  });

  test('TC-0040-09 4 行のメニューと ErrorPanel があっても、タイトルが縦に収まる（375×667・414×715・1366×657）。高さ 680 以下は上下の余白 16px', async ({ page }, info) => {
    const sizes = desktop(info) ? [{ width: 1366, height: 657 }] : [{ width: 375, height: 667 }, { width: 414, height: 715 }];
    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.goto('about:blank');
      await openDebug(page);
      await page.evaluate(() => localStorage.clear());
      await page.goto('about:blank');
      await openTitle(page, true);
      await failWrites(page);
      await press(info, item(page, 'タイトル', 'つづきから'));
      await expect(page.getByTestId('error-panel')).toBeVisible();
      await expect.poll(() => page.locator('h1 img').evaluate((e) => (e as HTMLImageElement).naturalWidth)).toBe(1080);
      const y = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      expect(y, `${size.width}×${size.height}`).toBeLessThanOrEqual(0);
      // 高さ 680 以下では上下 16px、それより高ければ 32px（仕様書 v1.13 §11.3。Chromium では安全領域が 0）
      const pad = await page.locator('.title-main').evaluate((e) => [getComputedStyle(e).paddingTop, getComputedStyle(e).paddingBottom]);
      const want = size.height <= 680 ? '16px' : '32px';
      expect(pad, `${size.width}×${size.height}`).toEqual([want, want]);
    }
  });
});
