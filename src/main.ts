// 起動（仕様書 §27.2、TD-0001 §3）。組み立てだけを行い、判断を持たない
// 音：効果音・BGM（監督）。画面はタイトル・名前入力・クレジット・宿屋・ダンジョン・戦闘・ゲームクリア・入れ替え
import './ui/theme.css';
import './ui/style.css';
import { createGameApi } from './api/game-api';
import { createBgmDirector } from './audio/bgm-director';
import { sfx, stopSfx } from './audio/sound';
import { browserStorage, createSoundSetting } from './audio/sound-setting';
import { nowIso } from './platform/clock';
import { prepareInstall } from './platform/install';
import { createDebugRng, MathRandomRng } from './platform/math-rng';
import { registerPwa } from './platform/pwa';
import { createLocalStorage } from './platform/storage';
import { createCommand } from './ui/command';
import { updateBanner } from './ui/components/update-banner';
import { attachDebug } from './ui/debug';
import { attachSkipKeys, createMessageQueue } from './ui/message-queue';
import { createRouter, pathOf } from './ui/router';
import { arrival } from './logic/arrival';
import { effectLayer } from './ui/components/effect-layer';
import { lowHpFrame } from './ui/components/low-hp-frame';
import { mountBattle } from './ui/screens/battle';
import { mountClear } from './ui/screens/clear';
import { mountCredits } from './ui/screens/credits';
import { mountDungeon } from './ui/screens/dungeon';
import { mountInn } from './ui/screens/inn';
import { mountNameEntry } from './ui/screens/name-entry';
import { mountSwap } from './ui/screens/swap';
import { mountTitle } from './ui/screens/title';
import { createStore } from './ui/store';
import { prefersReducedMotion } from './ui/dom';

const app = document.getElementById('app');
if (app) {
  // 保存の準備
  const storage = createLocalStorage(__APP_ID__);
  storage.migrateStorage();
  void navigator.storage?.persist?.().catch(() => undefined);

  // ゲーム API（?debug=1 なら乱数を差し替えられ、応答を遅らせられる）
  const debug = new URLSearchParams(location.search).has('debug');
  const debugRng = debug ? createDebugRng() : null;
  let delayMs = 0;
  const api = createGameApi({
    store: storage,
    rng: debugRng ? debugRng.rng : new MathRandomRng(),
    now: nowIso,
    delay: debug ? () => (delayMs > 0 ? new Promise((resolve) => setTimeout(resolve, delayMs)) : Promise.resolve()) : undefined,
  });

  // ストア・メッセージキュー・操作の流れ
  const store = createStore(api);
  // 音：設定（オンにした瞬間に確認音）・演出の効果音（始まりで鳴らし、終わり・スキップで止める）・遭遇の音
  const sound = createSoundSetting({ storage: browserStorage(), onTurnOn: () => sfx('toggle', { muted: false }) });
  const queue = createMessageQueue({
    reducedMotion: prefersReducedMotion,
    onEffectStart: (e) => sfx(e.effect === 'rareDrop' && e.rarity === 'LG' ? 'rareDropLG' : e.effect, { muted: !sound.on }),
    onEffectEnd: () => stopSfx(),
  });
  attachSkipKeys(queue);
  const command = createCommand({
    store,
    queue,
    arrival,
    // ボスの遭遇では鳴らさない（bossAppear の演出で鳴る）
    onEncounter: (next) => { if (!next.battle?.isBoss) sfx('encounter', { muted: !sound.on }); },
  });

  if (debug && debugRng) {
    attachDebug({
      store,
      write: (name, value) => storage.write(name, value),
      useSeed: (seed) => debugRng.useSeed(seed),
      setDelay: (ms) => { delayMs = ms; },
      debugDungeon: () => api.debugDungeon(),
    });
  }

  // 画面：更新の帯はタイトル・宿屋の画面のときだけ。画面が替わったら BGM の曲も決め直す
  prepareInstall();
  const banner = updateBanner();
  let bgm: { update(): void } | null = null;
  const router = createRouter({
    root: app,
    store,
    api,
    command,
    queue,
    sound,
    screens: { title: mountTitle, new: mountNameEntry, credits: mountCredits, inn: mountInn, dungeon: mountDungeon, battle: mountBattle, clear: mountClear, swap: mountSwap },
    onScreenChange: (name) => {
      banner.setAllowed(name === 'title' || name === 'inn');
      bgm?.update();
    },
  });
  router.start();
  // BGM の監督はルーターの外（エラーの画面でも止めない）。ルーターより後に購読するので、画面が替わってから曲を決める
  bgm = createBgmDirector({ store, queue, sound, path: () => pathOf(router.current) });
  lowHpFrame(app, store);
  effectLayer({ queue, reducedMotion: prefersReducedMotion, app });
  void Promise.all([store.refetchGame(), store.refetchSave()]);

  registerPwa();
  window.__appStarted = true;
}
