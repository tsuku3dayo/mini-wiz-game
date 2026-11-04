import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { battleOf, bossBattle, dungeonMap, logLines, SEEDS, startAt } from './helpers';

// 効果音（仕様書 §12.1、§28、TC-0032）。鳴らす判断は window の app:sound（detail: { name, muted }）で見る

type Heard = { name: string; muted: boolean; t: number; lines: number };

/** app:sound を記録する（時刻と、そのときメッセージ欄に出ていた行の数も） */
async function recordSounds(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { __sounds?: unknown[] };
    w.__sounds = [];
    window.addEventListener('app:sound', (e) => {
      const d = (e as CustomEvent<{ name: string; muted: boolean }>).detail;
      w.__sounds!.push({ ...d, t: Date.now(), lines: document.querySelectorAll('[role="log"] .wiz-line').length });
    });
  });
}
const heard = (page: Page) => page.evaluate(() => (window as Window & { __sounds?: unknown[] }).__sounds ?? []) as Promise<Heard[]>;
/** 開くたびに音をオンにしておく */
const soundOnAtStart = (page: Page) => page.addInitScript(() => localStorage.setItem('mini-wiz-game-sound', 'on'));

async function press(info: TestInfo, target: Locator) {
  if (info.project.name === 'desktop') await target.click();
  else await target.tap();
}
const titleItem = (page: Page, text: string) => page.getByRole('menu', { name: 'タイトル' }).getByRole('menuitem').filter({ hasText: text });
const attackItem = (page: Page) => page.getByRole('menu', { name: '戦闘' }).getByRole('menuitem').filter({ hasText: 'たたかう' });
const forward = (page: Page) => page.getByRole('button', { name: '前進', exact: true });
const darkKnight = { hp: 999, maxHp: 999, battle: battleOf('darkKnight', 1) };
const bossFront = { dungeon: dungeonMap({ x: 9, y: 1, floor: 5, facing: 'N' }) };

async function openDungeonMenu(page: Page, info: TestInfo) {
  await press(info, page.getByRole('button', { name: '≡ メニュー' }));
  return page.getByRole('menu', { name: 'メニュー' });
}

/** 時計を止めて「たたかう」を押し、1 行目が出た時刻を返す */
async function attackPaused(page: Page, info: TestInfo): Promise<number> {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await press(info, attackItem(page));
  await expect.poll(() => logLines(page)).toHaveLength(1);
  return page.evaluate(() => Date.now());
}

test.describe('効果音と音の設定', () => {
  // 演出を 1 つずつ立てる（動きを減らす設定では最後の 1 つしか鳴らない）
  test.use({ reducedMotion: 'no-preference' });

  test('TC-0032-02 保存が空のとき、タイトルの 3 番目は「おと：オフ」で、app:sound は 1 つも出ない', async ({ page }) => {
    await recordSounds(page);
    await page.goto('./');
    const items = (await page.getByRole('menu', { name: 'タイトル' }).getByRole('menuitem').allTextContents()).map((t) => t.replace(/^[▶\s]/, ''));
    expect(items[2]).toBe('おと：オフ');
    await page.waitForTimeout(500);
    expect(await heard(page)).toEqual([]);
  });

  test('TC-0032-03 タイトルで「おと：オフ」を選ぶと「おと：オン」になり、toggle が 1 回（muted false）、保存は on。タイトルにメッセージ欄はない', async ({ page }, info) => {
    await recordSounds(page);
    await page.goto('./');
    await press(info, titleItem(page, 'おと：'));
    await expect(titleItem(page, 'おと：')).toHaveText(/おと：オン$/);
    expect((await heard(page)).map(({ name, muted }) => ({ name, muted }))).toEqual([{ name: 'toggle', muted: false }]);
    expect(await page.evaluate(() => localStorage.getItem('mini-wiz-game-sound'))).toBe('on');
    await expect(page.getByTestId('message-window')).toHaveCount(0);
  });

  test('TC-0032-04 ダンジョンの「メニュー → おと」でオンにすると、メッセージ欄に「おとを オンにした」', async ({ page }, info) => {
    await startAt(page, 'DUNGEON');
    const menu = await openDungeonMenu(page, info);
    await press(info, menu.getByRole('menuitem').filter({ hasText: 'おと：オフ' }));
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('おとを オンにした');
  });

  test('TC-0032-05 「おと：オン」にしてから再読み込みすると、タイトルに「おと：オン」', async ({ page }, info) => {
    await page.goto('./');
    await press(info, titleItem(page, 'おと：'));
    await expect(titleItem(page, 'おと：')).toHaveText(/おと：オン$/);
    await page.reload();
    await expect(titleItem(page, 'おと：')).toHaveText(/おと：オン$/);
  });

  test('TC-0032-07 ゲーム中の「メニュー → おと」で切り替えてもメニューは開いたまま。オフにすると「おとを オフにした」で、toggle は出ない', async ({ page }, info) => {
    await soundOnAtStart(page);
    await recordSounds(page);
    await startAt(page, 'DUNGEON');
    const menu = await openDungeonMenu(page, info);
    await press(info, menu.getByRole('menuitem').filter({ hasText: 'おと：オン' }));
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('menuitem').filter({ hasText: 'おと：' })).toHaveText(/おと：オフ$/);
    await expect.poll(async () => (await logLines(page)).at(-1)).toBe('おとを オフにした');
    expect((await heard(page)).filter((h) => h.name === 'toggle')).toEqual([]);
    // もう一度でオン：toggle が 1 回
    await press(info, menu.getByRole('menuitem').filter({ hasText: 'おと：' }));
    await expect.poll(async () => (await heard(page)).filter((h) => h.name === 'toggle').length).toBe(1);
  });

  test('TC-0032-08 音がオンで通常の敵に遭遇すると、メッセージ欄が空になってから encounter が 1 回、そのあと「あらわれた」。戦闘のターンでは出ない', async ({ page }, info) => {
    await soundOnAtStart(page);
    await recordSounds(page);
    // 北の壁の前（4,0）で前進して「かべだ」を出しておく（遭遇でメッセージ欄が空になることを確かめるため）
    await startAt(page, 'DUNGEON', { state: { hp: 999, maxHp: 999, dungeon: dungeonMap({ x: 4, y: 0 }) } });
    await press(info, forward(page));
    await expect.poll(() => logLines(page)).toEqual(['かべだ']);
    // 後退で 1 歩動くと遭遇する
    await page.evaluate((seed) => window.__wiz!.useSeed(seed), SEEDS.slimeNext);
    await press(info, page.getByRole('button', { name: '後退', exact: true }));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'battle');
    await expect.poll(async () => (await logLines(page)).at(-1)).toMatch(/が あらわれた！$/);
    const enc = (await heard(page)).filter((h) => h.name === 'encounter');
    expect(enc).toHaveLength(1);
    expect(enc[0]).toMatchObject({ muted: false, lines: 0 });

    await press(info, attackItem(page));
    await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true');
    await page.waitForTimeout(300);
    expect((await heard(page)).filter((h) => h.name === 'encounter')).toHaveLength(1);
  });

  test('TC-0032-10 音がオンでボスのマスに入ると、encounter は出ず、bossAppear が 1 回', async ({ page }) => {
    await soundOnAtStart(page);
    await recordSounds(page);
    await startAt(page, 'DUNGEON', { state: bossFront });
    await forward(page).click();
    await expect(page.locator('#effect-layer')).toHaveAttribute('data-effect', 'bossAppear');
    expect((await heard(page)).map(({ name, muted }) => ({ name, muted }))).toEqual([{ name: 'bossAppear', muted: false }]);
  });

  test('TC-0032-11 音がオンのとき、レベルアップ・UR・LG のドロップ・ボス撃破・クリアの行が出た時刻に、その音が出る', async ({ page }, info) => {
    await soundOnAtStart(page);
    await recordSounds(page);
    await page.clock.install();
    const scenes: { state: Record<string, unknown>; seed: number; expected: [string, number][] }[] = [
      // 1 行目のあと 400ms ごと。演出の行のあとはその長さ
      { state: darkKnight, seed: SEEDS.darkKnightDropUR, expected: [['levelUp', 1600], ['rareDrop', 3000]] },
      { state: darkKnight, seed: SEEDS.darkKnightDropLG, expected: [['levelUp', 1600], ['rareDropLG', 3000]] },
      { state: bossBattle(), seed: SEEDS.bossWin, expected: [['bossDefeat', 400], ['levelUp', 1400], ['levelUp', 2800], ['levelUp', 4200], ['rareDropLG', 5600], ['clear', 6800]] },
    ];
    for (const s of scenes) {
      await startAt(page, 'BATTLE', { state: s.state, seed: s.seed });
      const t0 = await attackPaused(page, info);
      const before = (await heard(page)).length;
      // 最初の演出の行の時刻ちょうどで、行と音がそろって出ている
      const [firstName, firstAt] = s.expected[0];
      await page.clock.runFor(firstAt - 1);
      expect((await heard(page)).length).toBe(before);
      await page.clock.runFor(1);
      expect((await heard(page)).slice(before).map((h) => h.name)).toEqual([firstName]);
      const last = s.expected.at(-1)![1];
      await page.clock.runFor(last - firstAt + 100);
      const got = (await heard(page)).slice(before).map((h) => [h.name, h.t - t0]);
      expect(got).toEqual(s.expected);
      expect((await heard(page)).slice(before).every((h) => !h.muted)).toBe(true);
    }
  });

  test('TC-0032-13 演出中にメッセージ欄を押す（desktop では Enter・Space も）と、その時点で効果音の発振器の stop() が呼ばれる', async ({ page }, info) => {
    await soundOnAtStart(page);
    await page.addInitScript(() => {
      const w = window as Window & { __stops?: number };
      w.__stops = 0;
      const original = AudioScheduledSourceNode.prototype.stop;
      AudioScheduledSourceNode.prototype.stop = function stop(this: AudioScheduledSourceNode, when?: number) {
        w.__stops! += 1;
        return original.call(this, when);
      };
    });
    const stops = () => page.evaluate(() => (window as Window & { __stops?: number }).__stops ?? 0);
    await page.clock.install();
    const ways = info.project.name === 'desktop' ? ['click', 'Enter', ' '] : ['tap'];
    for (const way of ways) {
      await startAt(page, 'BATTLE', { state: darkKnight, seed: SEEDS.darkKnightDropUR });
      await attackPaused(page, info);
      await page.clock.runFor(1600);
      await expect(page.getByTestId('status-panel')).toHaveClass(/level-up/);
      // levelUp の 4 音を予約したとき、それぞれの終わりの stop を 1 回ずつ呼んでいる
      const before = await stops();
      expect(before, way).toBeGreaterThanOrEqual(4);
      if (way === 'click' || way === 'tap') await press(info, page.getByTestId('message-window'));
      else await page.keyboard.press(way);
      await expect.poll(stops, way).toBeGreaterThan(before);
      await expect(page.getByTestId('status-panel')).not.toHaveClass(/level-up/);
    }
  });

  test('TC-0032-14 音がオフのとき、遭遇・ボス出現・レベルアップ・ドロップ・ボス撃破・クリアのどれも muted: true で、発振器は作られない', async ({ page }, info) => {
    await recordSounds(page);
    await page.addInitScript(() => {
      const w = window as Window & { __oscillators?: number };
      w.__oscillators = 0;
      const original = BaseAudioContext.prototype.createOscillator;
      BaseAudioContext.prototype.createOscillator = function createOscillator(this: BaseAudioContext) {
        w.__oscillators! += 1;
        return original.call(this);
      };
    });
    // 遭遇
    await startAt(page, 'DUNGEON', { state: { hp: 999, maxHp: 999, dungeon: dungeonMap({ x: 4, y: 4 }) }, seed: SEEDS.slimeNext });
    await press(info, forward(page));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'battle');
    const names = new Set((await heard(page)).map((h) => h.name));
    const check = async () => {
      const all = await heard(page);
      expect(all.every((h) => h.muted)).toBe(true);
      all.forEach((h) => names.add(h.name));
      expect(await page.evaluate(() => (window as Window & { __oscillators?: number }).__oscillators)).toBe(0);
    };
    await check();
    // ボス出現
    await startAt(page, 'DUNGEON', { state: bossFront });
    await forward(page).click();
    await expect(page.locator('#effect-layer')).toHaveAttribute('data-effect', 'bossAppear');
    await check();
    // レベルアップと UR・LG のドロップ、ボス撃破とクリア（メッセージ欄を押して進める）
    for (const [state, seed, end] of [[darkKnight, SEEDS.darkKnightDropUR, 'rareDrop'], [darkKnight, SEEDS.darkKnightDropLG, 'rareDropLG'], [bossBattle(), SEEDS.bossWin, 'clear']] as const) {
      await startAt(page, 'BATTLE', { state, seed });
      await press(info, attackItem(page));
      await expect.poll(async () => (await heard(page)).some((h) => h.name === end), { timeout: 15_000 }).toBe(true);
      await check();
    }
    expect([...names].sort()).toEqual(['bossAppear', 'bossDefeat', 'clear', 'encounter', 'levelUp', 'rareDrop', 'rareDropLG']);
  });

  test('TC-0032-16 AudioContext がないブラウザで、音をオンにして遭遇・戦闘・レベルアップまで遊んでも、例外もエラーの画面も出ない', async ({ page }, info) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>;
      delete w.AudioContext;
      delete w.webkitAudioContext;
    });
    await recordSounds(page);
    // 記録は開き直すたびに空になるので、場面ごとに見る
    const names = async () => (await heard(page)).map((h) => h.name);
    await page.goto('./?debug=1');
    await press(info, titleItem(page, 'おと：'));
    await expect(titleItem(page, 'おと：')).toHaveText(/おと：オン$/);
    expect(await names()).toEqual(['toggle']);
    await startAt(page, 'DUNGEON', { state: { hp: 999, maxHp: 999, dungeon: dungeonMap({ x: 4, y: 4 }) }, seed: SEEDS.slimeNext });
    await press(info, forward(page));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'battle');
    expect(await names()).toEqual(['encounter']);
    await startAt(page, 'BATTLE', { state: darkKnight, seed: SEEDS.darkKnightDropUR });
    await press(info, attackItem(page));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon', { timeout: 10_000 });
    expect(await names()).toEqual(['levelUp', 'rareDrop']);
    expect(await page.evaluate(() => typeof (window as unknown as Record<string, unknown>).AudioContext)).toBe('undefined');
    await expect(page.getByTestId('error-panel')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
