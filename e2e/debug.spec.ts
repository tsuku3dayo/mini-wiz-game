import { expect, test, type Page } from '@playwright/test';
import { audioEvents, battleOf, bgmNames, clearAudio, dungeonMap, logLines, openDebug, recordAudio, SEEDS, soundOnAtStart, startAt, storedInn, storedSave, swapInventory, writeScene } from './helpers';

/** debugDungeon を呼び、reject したら { status, message } を返す */
const debugResult = (page: Page) => page.evaluate(async () => {
  try {
    return { ok: await window.__wiz!.debugDungeon() };
  } catch (e) {
    const err = e as { status: number; message: string };
    return { status: err.status, message: err.message };
  }
});

test.describe('テスト用の入口', () => {
  test('TC-0038-01 ?debug=1 のときだけ window.__wiz があり、6 つの関数を持つ', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'title');
    expect(await page.evaluate(() => typeof window.__wiz)).toBe('undefined');
    await openDebug(page);
    const kinds = await page.evaluate(() => {
      const w = window.__wiz as unknown as Record<string, unknown>;
      return ['debugDungeon', 'useSeed', 'writeState', 'writeSave', 'setDelay', 'showUpdateBanner'].map((k) => typeof w[k]);
    });
    expect(kinds).toEqual(Array(6).fill('function'));
  });

  test('TC-0038-02 debugDungeon は今の階の全情報を返し、画面の階と向きと合う。ゲームなしは 404、宿屋では 409', async ({ page }) => {
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 4, y: 6, floor: 3, facing: 'N' }) } });
    const r = await debugResult(page);
    const d = r.ok!;
    expect(Object.keys(d).sort()).toEqual(['boss', 'down', 'floor', 'player', 'up', 'visited', 'walls']);
    expect(d.walls).toHaveLength(100);
    expect(d.visited).toHaveLength(100);
    expect(d).toMatchObject({ floor: 3, player: { x: 4, y: 6, facing: 'N' }, up: { x: 0, y: 9 }, down: { x: 9, y: 0 }, boss: null });
    await expect(page.getByTestId('location-label')).toHaveText(new RegExp(`^${d.floor}F\\s北$`));

    await page.evaluate(() => localStorage.clear());
    await openDebug(page);
    expect(await debugResult(page)).toMatchObject({ status: 404 });

    await startAt(page, 'INN');
    expect(await debugResult(page)).toEqual({ status: 409, message: 'ダンジョンに いません' });
  });

  test('TC-0038-05 writeState で戦闘の状態を書くと戦闘の画面と敵の名前。writeSave でセーブを書くと、タイトルの「つづきから」にカーソル、スロットの一覧に「名前 Lv」', async ({ page }) => {
    await startAt(page, 'BATTLE', { state: { battle: battleOf('skeleton', 20) } });
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'battle');
    await expect(page.locator('body')).toHaveAttribute('data-location', 'BATTLE');
    await expect(page.getByTestId('enemy-window')).toHaveText('スケルトン');

    await page.evaluate(() => localStorage.clear());
    await openDebug(page);
    // slot を省くとスロット 1、渡すとそのスロット（v1.14）
    await page.evaluate((save) => window.__wiz!.writeSave(save), storedSave({ name: 'アルド', level: 5 }));
    await page.evaluate((save) => window.__wiz!.writeSave(save, 3), storedSave({ name: 'ミナ', level: 9 }));
    const cont = page.getByRole('menu', { name: 'タイトル' }).getByRole('menuitem').filter({ hasText: 'つづきから' });
    await expect(cont).toHaveClass(/active/);
    await cont.click();
    const rows = (await page.getByRole('menu', { name: 'つづきから' }).getByRole('menuitem').allTextContents()).map((t) => t.replace(/^[▶\s]/, ''));
    expect(rows).toEqual(['もどる', 'スロット1　アルド Lv5', 'スロット2　－ なし －', 'スロット3　ミナ Lv9']);
  });

  test('TC-0038-04 useSeed で同じシードなら「ダンジョンへ」で同じ迷宮、違うシードなら違う迷宮', async ({ page }) => {
    const enterWith = async (seed: number) => {
      await startAt(page, 'INN');
      await page.evaluate((s) => window.__wiz!.useSeed(s), seed);
      await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'ダンジョンへ' }).click();
      await expect(page.locator('body')).toHaveAttribute('data-screen', 'dungeon');
      const { walls, up, down, boss, player } = (await debugResult(page)).ok!;
      return { walls, up, down, boss, player };
    };
    const first = await enterWith(7);
    const second = await enterWith(7);
    expect(second).toEqual(first);
    const other = await enterWith(8);
    expect(other.walls).not.toEqual(first.walls);
  });

  test('TC-0038-07 body の data-screen・data-location・data-busy が、画面・ゲームの場所・受付を止めている間を表す', async ({ page }) => {
    const body = page.locator('body');
    const expectBody = async (screen: string, location: string) => {
      await expect(body, screen).toHaveAttribute('data-screen', screen);
      await expect(body, screen).toHaveAttribute('data-location', location);
      await expect(body, screen).toHaveAttribute('data-busy', 'false');
    };
    // タイトル（ゲームなし）→ 名前入力 → 宿屋
    await openDebug(page);
    await expectBody('title', 'none');
    await page.getByRole('menu', { name: 'タイトル' }).getByRole('menuitem').filter({ hasText: 'はじめから' }).click();
    await expectBody('new', 'none');
    await page.getByRole('textbox', { name: 'なまえ' }).fill('ゆうしゃ');
    await page.getByRole('menu', { name: 'なまえ入力' }).getByRole('menuitem').filter({ hasText: '決定' }).click();
    await expectBody('inn', 'INN');

    // 受付を止めている間（応答待ち）だけ true
    await page.evaluate(() => window.__wiz!.setDelay(500));
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' }).click();
    await expect(body).toHaveAttribute('data-busy', 'true');
    await expect(body).toHaveAttribute('data-busy', 'false');
    await page.evaluate(() => window.__wiz!.setDelay(0));

    // ダンジョン → 戦闘 → 入れ替え → クリア
    await page.evaluate((seed) => window.__wiz!.useSeed(seed), SEEDS.noEncounter);
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'ダンジョンへ' }).click();
    await expectBody('dungeon', 'DUNGEON');
    await writeScene(page, { state: storedInn({ location: 'BATTLE', dungeon: dungeonMap({ x: 4, y: 4 }), battle: battleOf('goblin', 18) }) });
    await expectBody('battle', 'BATTLE');
    await writeScene(page, { state: storedInn({ location: 'SWAP', dungeon: dungeonMap({ x: 4, y: 4 }), inventory: swapInventory() }) });
    await expectBody('swap', 'SWAP');
    await writeScene(page, { state: storedInn({ location: 'CLEARED' }) });
    await expectBody('clear', 'CLEARED');
  });

  test('TC-0038-08 効果音の判断のたびに app:sound（{ name, muted }。オフでも muted: true）、曲を替えた・止めたときに app:bgm（{ name }。止めたら null）', async ({ page }) => {
    // 音がオフで遭遇
    await recordAudio(page);
    await startAt(page, 'DUNGEON', { state: { hp: 999, maxHp: 999, dungeon: dungeonMap({ x: 4, y: 4 }) }, seed: SEEDS.slimeNext });
    await clearAudio(page);
    await page.getByRole('button', { name: '前進', exact: true }).click();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'battle');
    const sounds = (await audioEvents(page)).filter((e) => e.type === 'sound');
    expect(sounds.map(({ name, muted }) => ({ name, muted }))).toEqual([{ name: 'encounter', muted: true }]);
    expect(await bgmNames(page)).toEqual([]);

    // 音をオンにして宿屋 → ダンジョン
    await soundOnAtStart(page);
    await startAt(page, 'INN');
    await expect.poll(async () => (await bgmNames(page)).at(-1)).toBe('inn');
    await clearAudio(page);
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'ダンジョンへ' }).click();
    await expect.poll(() => bgmNames(page)).toEqual(['dungeon']);
    // 「メニュー → おと」でオフ → null
    await page.getByRole('button', { name: '≡ メニュー' }).click();
    await page.getByRole('menu', { name: 'メニュー' }).getByRole('menuitem').filter({ hasText: 'おと：オン' }).click();
    await expect.poll(() => bgmNames(page)).toEqual(['dungeon', null]);
    const detail = await page.evaluate(() => new Promise<unknown>((resolve) => {
      window.addEventListener('app:bgm', (e) => resolve((e as CustomEvent).detail), { once: true });
      (document.querySelector('[role="menu"][aria-label="メニュー"] [role="menuitem"]:last-child') as HTMLElement).click();
    }));
    expect(detail).toEqual({ name: 'dungeon' });
  });

  test('TC-0038-06 setDelay(1000) のあいだ data-busy が true で、300ms を過ぎると ▼ が出る。応答のあとで消える', async ({ page }) => {
    await page.clock.install();
    await startAt(page, 'INN', { state: { hp: 10 } });
    await page.evaluate(() => window.__wiz!.setDelay(1000));
    // 時計を止めて、押した時刻から決まった時間だけ進める（止めないと自然に進み、数 ms ずれる）
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    const waiting = page.getByRole('img', { name: '応答待ち' });
    const body = page.locator('body');

    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' }).click();
    await expect(body).toHaveAttribute('data-busy', 'true');
    await page.clock.runFor(299);
    await expect(waiting).toBeHidden();
    await page.clock.runFor(2);
    await expect(waiting).toBeVisible();
    await expect(body).toHaveAttribute('data-busy', 'true');
    await page.clock.runFor(700);
    await expect(waiting).toBeHidden();
    await expect(body).not.toHaveAttribute('data-busy', 'true');
    await expect.poll(() => logLines(page)).toEqual(['HP と MP が かいふくした']);

    // setDelay(0) で元に戻る（すぐ応答する）
    await page.evaluate(() => window.__wiz!.setDelay(0));
    await page.clock.resume();
    await page.getByRole('menu', { name: '宿屋' }).getByRole('menuitem').filter({ hasText: 'やすむ' }).click();
    await expect.poll(() => logLines(page)).toEqual(['HP と MP が かいふくした', 'HP と MP が かいふくした']);
    await expect(body).not.toHaveAttribute('data-busy', 'true');
  });
});
