// 起動（仕様書 §27.2、TD-0001 §3）。組み立てだけを行い、判断を持たない
// 音・BGM・体力わずかの枠・演出の層は、その TASK で足す。画面はタイトルだけ（名前入力・宿屋は TASK-0007）
import './ui/theme.css';
import './ui/style.css';
import { createGameApi } from './api/game-api';
import { nowIso } from './platform/clock';
import { prepareInstall } from './platform/install';
import { createDebugRng, MathRandomRng } from './platform/math-rng';
import { registerPwa } from './platform/pwa';
import { createLocalStorage } from './platform/storage';
import { createCommand } from './ui/command';
import { updateBanner } from './ui/components/update-banner';
import { attachDebug } from './ui/debug';
import { attachSkipKeys, createMessageQueue } from './ui/message-queue';
import { createRouter } from './ui/router';
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
  const queue = createMessageQueue({ reducedMotion: prefersReducedMotion });
  attachSkipKeys(queue);
  const command = createCommand({ store, queue });

  if (debug && debugRng) {
    attachDebug({
      store,
      write: (name, value) => storage.write(name, value),
      useSeed: (seed) => debugRng.useSeed(seed),
      setDelay: (ms) => { delayMs = ms; },
    });
  }

  // 画面：更新の帯はタイトル・宿屋の画面のときだけ
  prepareInstall();
  const banner = updateBanner();
  const router = createRouter({
    root: app,
    store,
    api,
    command,
    queue,
    screens: { title: mountTitle },
    onScreenChange: (name) => banner.setAllowed(name === 'title' || name === 'inn'),
  });
  router.start();
  void Promise.all([store.refetchGame(), store.refetchSave()]);

  registerPwa();
  window.__appStarted = true;
}
