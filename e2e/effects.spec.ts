import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { battleOf, bossBattle, dungeonMap, logLines, SEEDS, startAt } from './helpers';

// 演出（仕様書 §11.8「演出」、TC-0031）。時間は偽の時計で進める（install → pauseAt → runFor）

const layer = (page: Page) => page.locator('#effect-layer');
const status = (page: Page) => page.getByTestId('status-panel');
const heading = (page: Page) => page.locator('.clear-heading');
const line = (page: Page, text: RegExp) => page.locator('[role="log"] .wiz-line').filter({ hasText: text }).last();
const attackItem = (page: Page) => page.getByRole('menu', { name: '戦闘' }).getByRole('menuitem').filter({ hasText: 'たたかう' });
/** ダークナイト（HP 1）。プレイヤーは HP 999 で倒れない */
const darkKnight = { hp: 999, maxHp: 999, battle: battleOf('darkKnight', 1) };

async function press(info: TestInfo, target: Locator) {
  if (info.project.name === 'desktop') await target.click();
  else await target.tap();
}

/** 時計を止め、戦闘の「たたかう」を押す（1 行目がすぐ出る） */
async function attackPaused(page: Page, info: TestInfo) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await press(info, attackItem(page));
  await expect.poll(() => logLines(page)).toHaveLength(1);
}

/** 要素の CSS のアニメーション（長さ・回数・速さ）と、getAnimations の数 */
function cssAnimation(target: Locator) {
  return target.evaluate((e) => {
    const s = getComputedStyle(e);
    return { name: s.animationName, duration: s.animationDuration, count: s.animationIterationCount, timing: s.animationTimingFunction, running: e.getAnimations().length };
  });
}

/** getAnimations のキーフレーム（offset と、指定した性質の値） */
function keyframes(target: Locator, prop: string) {
  return target.evaluate((e, p) => e.getAnimations().flatMap((a) => (a.effect as KeyframeEffect).getKeyframes().map((k) => [k.offset, k[p]])), prop);
}

/**
 * 明るさの山の時刻（ms）。キーフレームのうち、いちばん明るい値のもの（box-shadow は none でないもの、
 * 背景色は 明るさ × 不透明度 が最大のもの）を山とし、回数のぶん並べる
 */
function peakTimes(target: Locator) {
  return target.evaluate((e) => e.getAnimations().flatMap((a) => {
    const effect = a.effect as KeyframeEffect;
    const timing = effect.getTiming();
    const each = Number(timing.duration);
    const count = Number(timing.iterations);
    const frames = effect.getKeyframes();
    const level = (k: ComputedKeyframe) => {
      if (typeof k.boxShadow === 'string') return k.boxShadow === 'none' ? 0 : 1;
      const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(String(k.backgroundColor ?? ''));
      if (!m) return 0;
      const alpha = m[4] === undefined ? 1 : Number(m[4]);
      return ((Number(m[1]) + Number(m[2]) + Number(m[3])) / 765) * alpha;
    };
    const max = Math.max(...frames.map(level));
    const peaks = frames.filter((k) => max > 0 && level(k) === max).map((k) => Number(k.offset));
    return Array.from({ length: count }, (_, i) => peaks.map((o) => (i + o) * each)).flat();
  }));
}

/** どの 1 秒の区間でも山が 3 回以下か（区間の始まりを各山に置いて数える） */
function maxPerSecond(times: number[]): number {
  return Math.max(0, ...times.map((t) => times.filter((u) => u >= t && u < t + 1000).length));
}

test.describe('演出', () => {
  // アニメーションを見るので、動きを減らす設定を外す（TC-0031-09 だけ設定する）
  test.use({ reducedMotion: 'no-preference' });

  test('TC-0031-01 レベルアップの行が出ると、StatusPanel の外側が 1000ms で 2 回光り、行は secondary・太字で 600ms ease-out の拡大', async ({ page }, info) => {
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: darkKnight, seed: SEEDS.darkKnightDropUR });
    await attackPaused(page, info);
    // 1 行目のあと 400ms ごと：5 行目が「レベルが あがった！」
    await page.clock.runFor(1600);
    const levelLine = line(page, /レベルが あがった！ Lv2/);
    await expect(levelLine).toBeVisible();
    await expect(status(page)).toHaveClass(/level-up/);
    expect(await cssAnimation(status(page))).toMatchObject({ duration: '1s', count: '1', running: 1 });
    const glow = await keyframes(status(page), 'boxShadow');
    // 25%・75% で secondary（#ffc845）の外側の光り
    expect(glow.filter(([, v]) => typeof v === 'string' && v !== 'none').map(([o]) => o)).toEqual([0.25, 0.75]);
    expect(String(glow.find(([o]) => o === 0.25)?.[1])).toContain('rgb(255, 200, 69) 0px 0px 12px 3px');
    // 行：secondary・太字、600ms ease-out で 1 → 1.2 → 1 倍（左端基準）
    await expect(levelLine).toHaveCSS('color', 'rgb(255, 200, 69)');
    await expect(levelLine).toHaveCSS('font-weight', '700');
    expect(await cssAnimation(levelLine)).toMatchObject({ duration: '0.6s', count: '1', timing: 'ease-out', running: 1 });
    expect(await keyframes(levelLine, 'transform')).toContainEqual([0.5, 'scale(1.2)']);
    expect((await levelLine.evaluate((e) => getComputedStyle(e).transformOrigin)).startsWith('0px')).toBe(true);
    // 1000ms たつと光りが消える
    await page.clock.runFor(1000);
    await expect(status(page)).not.toHaveClass(/level-up/);
  });

  test('TC-0031-02 UR のドロップの行が出ると、層が UR の色で 400ms の光りを 2 回、行は 400ms の点滅を 2 回。LG は 3 回', async ({ page }, info) => {
    const scenes = [
      { seed: SEEDS.darkKnightDropUR, color: 'rgb(255, 140, 26)', count: '2' },
      { seed: SEEDS.darkKnightDropLG, color: 'rgb(255, 77, 109)', count: '3' },
    ];
    await page.clock.install();
    for (const s of scenes) {
      await startAt(page, 'BATTLE', { state: darkKnight, seed: s.seed });
      await attackPaused(page, info);
      // 7 行目（1 行目から 400 × 4 ＋ レベルアップ 1000 ＋ 400）
      await page.clock.runFor(3000);
      const drop = line(page, /おとした！/);
      await expect(drop).toBeVisible();
      await expect(layer(page)).toHaveAttribute('data-effect', 'rareDrop');
      await expect(layer(page)).toHaveAttribute('data-motion', 'full');
      await expect(layer(page)).toHaveCSS('color', s.color);
      expect(await cssAnimation(layer(page))).toMatchObject({ duration: '0.4s', count: s.count, timing: 'ease-in-out', running: 1 });
      expect((await keyframes(layer(page), 'boxShadow')).filter(([, v]) => typeof v === 'string' && v !== 'none').map(([o]) => o)).toEqual([0.5]);
      expect(await cssAnimation(drop)).toMatchObject({ duration: '0.4s', count: s.count, timing: 'steps(1)', running: 1 });
      expect(await keyframes(drop, 'opacity')).toContainEqual([0.5, '0']);
    }
  });

  test('TC-0031-03 ボスのマスに入ると、層が bossAppear で 1200ms linear 1 回、中央に error 色で「暗黒のネクロマンサー」', async ({ page }) => {
    await page.clock.install();
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 1, floor: 5, facing: 'N' }) } });
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.getByRole('button', { name: '前進', exact: true }).click();
    await expect(layer(page)).toHaveAttribute('data-effect', 'bossAppear');
    expect(await cssAnimation(layer(page))).toMatchObject({ duration: '1.2s', count: '1', timing: 'linear', running: 1 });
    const name = layer(page).locator('.effect-name');
    await expect(name).toHaveText('暗黒のネクロマンサー');
    await expect(name).toHaveCSS('color', 'rgb(255, 90, 78)');
    await expect(name).toHaveCSS('font-size', '24px');
    await expect(layer(page)).toHaveAttribute('aria-hidden', 'true');
    await expect(layer(page)).toHaveCSS('pointer-events', 'none');
    await expect(layer(page)).toHaveCSS('position', 'fixed');
    await page.clock.runFor(1200);
    await expect(layer(page)).not.toHaveAttribute('data-effect', /./);
  });

  test('TC-0031-04 ボスを倒すと、最初の行のあとの「たおした！」で層が bossDefeat になり、600ms linear 1 回', async ({ page }, info) => {
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: bossBattle(), seed: SEEDS.bossWin });
    await attackPaused(page, info);
    await page.clock.runFor(400);
    await expect(line(page, /暗黒のネクロマンサーを たおした！/)).toBeVisible();
    await expect(layer(page)).toHaveAttribute('data-effect', 'bossDefeat');
    expect(await cssAnimation(layer(page))).toMatchObject({ duration: '0.6s', count: '1', timing: 'linear', running: 1 });
    const colors = await keyframes(layer(page), 'backgroundColor');
    expect(colors.filter(([, v]) => v === 'rgba(232, 220, 192, 0.55)').map(([o]) => o)).toEqual([0.16, 0.83]);
    await page.clock.runFor(600);
    await expect(layer(page)).not.toHaveAttribute('data-effect', 'bossDefeat');
  });

  test('TC-0031-05 クリア画面で clear の行が出ると、見出しが 1500ms ease-out で浮かび上がる。再読み込みで入ったときは付かない', async ({ page }, info) => {
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: bossBattle(), seed: SEEDS.bossWin });
    await attackPaused(page, info);
    // clear の行まで進める（クリア画面に移り、最後の行で見出しが浮かび上がる）
    for (let i = 0; i < 80 && !(await page.evaluate(() => !!document.querySelector('.clear-heading.rising'))); i += 1) {
      await page.clock.runFor(100);
    }
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'clear');
    await expect(line(page, /ダンジョンに 平和が もどった/)).toBeVisible();
    expect(await cssAnimation(heading(page))).toMatchObject({ duration: '1.5s', count: '1', timing: 'ease-out', running: 1 });
    expect(await keyframes(heading(page), 'opacity')).toEqual([[0, '0'], [1, '1']]);
    expect(await keyframes(heading(page), 'transform')).toEqual([[0, 'translateY(8px)'], [1, 'none']]);

    // 再読み込みで入ったクリア画面では付かない
    await page.reload();
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'clear');
    await expect(heading(page)).not.toHaveClass(/rising/);
    expect((await cssAnimation(heading(page))).running).toBe(0);
  });

  test('TC-0031-07 1 つの応答の bossDefeat・levelUp・rareDrop（LG）は、行の順に 1 つずつ立ち、2 つ同時に立たない', async ({ page }, info) => {
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: bossBattle(), seed: SEEDS.bossWin });
    await attackPaused(page, info);
    const seen: string[] = [];
    for (let t = 0; t <= 9000; t += 100) {
      const now = await page.evaluate(() => {
        const l = document.getElementById('effect-layer')?.dataset.effect ?? null;
        const s = document.querySelector('[data-testid="status-panel"].level-up') ? 'levelUp' : null;
        const c = document.querySelector('.clear-heading.rising') ? 'clear' : null;
        return [l, s, c].filter(Boolean) as string[];
      });
      expect(now.length, `${t}ms：${now.join('・')}`).toBeLessThanOrEqual(1);
      const label = now[0] ?? 'なし';
      if (seen.at(-1) !== label) seen.push(label);
      await page.clock.runFor(100);
    }
    expect(seen).toEqual(['なし', 'bossDefeat', 'なし', 'levelUp', 'なし', 'levelUp', 'なし', 'levelUp', 'なし', 'rareDrop', 'clear', 'なし']);
  });

  test('TC-0031-08 演出中にメッセージ欄を押すと残りの行が全部出て、演出が終わり、data-busy が true でなくなる。desktop では Enter でも同じで、メニューに届かない', async ({ page }, info) => {
    const revision = () => page.evaluate(() => JSON.parse(localStorage.getItem('mini-wiz-game-game')!).revision as number);
    const ways = info.project.name === 'desktop' ? ['click', 'enter'] : ['tap'];
    await page.clock.install();
    for (const way of ways) {
      await startAt(page, 'BATTLE', { state: darkKnight, seed: SEEDS.darkKnightDropUR });
      await attackPaused(page, info);
      await page.clock.runFor(1600);
      await expect(status(page)).toHaveClass(/level-up/);
      await expect(page.locator('body')).toHaveAttribute('data-busy', 'true');
      const r0 = await revision();
      if (way === 'enter') {
        await expect(attackItem(page)).toBeFocused();
        await page.keyboard.press('Enter');
      } else {
        await press(info, page.getByTestId('message-window'));
      }
      await expect.poll(async () => (await logLines(page)).at(-1), way).toMatch(/おとした！$/);
      await expect(page.locator('body')).not.toHaveAttribute('data-busy', 'true');
      await expect(layer(page)).not.toHaveAttribute('data-effect', /./);
      await expect(status(page)).not.toHaveClass(/level-up/);
      // Enter はメニューに届かない（ターンが進まない）
      await page.clock.runFor(2000);
      expect(await revision(), way).toBe(r0);
    }
  });

  test('TC-0031-09 動きを減らす設定では、行がすべて一度に出て最後の演出だけが立ち、行・StatusPanel・層・クリアの見出しに animation が付かない', async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.clock.install();
    await startAt(page, 'BATTLE', { state: darkKnight, seed: SEEDS.darkKnightDropLG });
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await press(info, attackItem(page));
    // 時計を進めなくても、最後の行まで出ている
    await expect.poll(async () => (await logLines(page)).at(-1)).toMatch(/おとした！$/);
    await expect(layer(page)).toHaveAttribute('data-effect', 'rareDrop');
    await expect(layer(page)).toHaveAttribute('data-motion', 'reduced');
    await expect(page.locator('body')).not.toHaveAttribute('data-screen', 'battle');
    expect((await cssAnimation(layer(page))).running).toBe(0);
    expect(await page.locator('[role="log"] .wiz-line').evaluateAll((list) => list.reduce((n, e) => n + e.getAnimations().length, 0))).toBe(0);
    expect((await cssAnimation(status(page))).running).toBe(0);

    // レベルアップが最後の演出のとき（その後にドロップがない）も、StatusPanel は動かない
    await startAt(page, 'BATTLE', { state: bossBattle(), seed: SEEDS.bossWin });
    await press(info, attackItem(page));
    await expect(page.locator('body')).toHaveAttribute('data-screen', 'clear');
    await expect(heading(page)).toHaveClass(/rising/);
    expect((await cssAnimation(heading(page))).running).toBe(0);
    await expect(layer(page)).not.toHaveAttribute('data-effect', /./);
  });

  test('TC-0031-11 どの演出も、明るさの山は 1 秒の区間に 3 回以下', async ({ page }, info) => {
    const counts: Record<string, number> = {};
    const check = async (name: string, target: Locator) => {
      const times = await peakTimes(target);
      counts[name] = times.length;
      expect(maxPerSecond(times), name).toBeLessThanOrEqual(3);
    };
    await page.clock.install();
    // levelUp と rareDrop（UR・LG）
    for (const [name, seed] of [['rareDrop UR', SEEDS.darkKnightDropUR], ['rareDrop LG', SEEDS.darkKnightDropLG]] as const) {
      await startAt(page, 'BATTLE', { state: darkKnight, seed });
      await attackPaused(page, info);
      await page.clock.runFor(1600);
      if (name === 'rareDrop UR') await check('levelUp', status(page));
      await page.clock.runFor(1400);
      await expect(layer(page)).toHaveAttribute('data-effect', 'rareDrop');
      await check(name, layer(page));
    }
    // bossAppear
    await startAt(page, 'DUNGEON', { state: { dungeon: dungeonMap({ x: 9, y: 1, floor: 5, facing: 'N' }) } });
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.getByRole('button', { name: '前進', exact: true }).click();
    await expect(layer(page)).toHaveAttribute('data-effect', 'bossAppear');
    await check('bossAppear', layer(page));
    // bossDefeat
    await startAt(page, 'BATTLE', { state: bossBattle(), seed: SEEDS.bossWin });
    await attackPaused(page, info);
    await page.clock.runFor(400);
    await expect(layer(page)).toHaveAttribute('data-effect', 'bossDefeat');
    await check('bossDefeat', layer(page));
    expect(counts).toEqual({ levelUp: 2, 'rareDrop UR': 2, 'rareDrop LG': 3, bossAppear: 2, bossDefeat: 2 });
  });
});
