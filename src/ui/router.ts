// 画面切替え（仕様書 §11.2「LocationGuard」、§27.4）。ハッシュとゲームの状態の場所で、出す画面を決める
import type { GameApi, Location } from '../api/types';
import type { Command } from './command';
import { errorPanel } from './components/error-panel';
import { gameFrame } from './components/game-frame';
import type { MessageQueue } from './message-queue';
import type { Store } from './store';

export type ScreenName = 'title' | 'new' | 'inn' | 'dungeon' | 'battle' | 'clear' | 'swap';

const PATHS: Readonly<Record<ScreenName, string>> = {
  title: '/', new: '/new', inn: '/inn', dungeon: '/dungeon', battle: '/battle', clear: '/clear', swap: '/swap',
};
const BY_LOCATION: Readonly<Record<Location, ScreenName>> = {
  INN: 'inn', DUNGEON: 'dungeon', BATTLE: 'battle', CLEARED: 'clear', SWAP: 'swap',
};

export interface Router {
  readonly current: ScreenName | null;
  /** 履歴に積んで移る（「はじめから」と名前入力の「もどる」だけが使う） */
  navigate(name: ScreenName): void;
  start(): void;
  destroy(): void;
}

export interface ScreenContext {
  store: Store;
  api: GameApi;
  command: Command;
  queue: MessageQueue;
  router: Router;
}

export type MountScreen = (root: HTMLElement, ctx: ScreenContext) => { destroy(): void };

export interface RouterDeps {
  root: HTMLElement;
  store: Store;
  api: GameApi;
  command: Command;
  queue: MessageQueue;
  /** 画面ごとの作り方。まだない画面は、空の画面を出す（作る TASK で足す） */
  screens: Partial<Record<ScreenName, MountScreen>>;
  /** 画面が替わったとき（更新の帯の出し入れなど） */
  onScreenChange?: (name: ScreenName | null) => void;
}

function nameOfHash(hash: string): ScreenName | null {
  const path = hash.replace(/^#/, '') || '/';
  const found = (Object.keys(PATHS) as ScreenName[]).find((n) => PATHS[n] === path);
  return found ?? null;
}

function hashOf(name: ScreenName): string {
  return `#${PATHS[name]}`;
}

export function createRouter(deps: RouterDeps): Router {
  const { root, store, queue, command } = deps;
  let current: ScreenName | null = null;
  let mounted: { destroy(): void } | null = null;
  /** 画面全体の ErrorPanel を出しているか */
  let showingError = false;
  const offs: (() => void)[] = [];

  function replaceHash(name: ScreenName) {
    history.replaceState(history.state, '', hashOf(name));
  }

  function mount(name: ScreenName | null, error = false) {
    mounted?.destroy();
    mounted = null;
    root.replaceChildren();
    current = name;
    showingError = error;
    document.body.dataset.screen = name ?? '';
    if (name) {
      window.scrollTo(0, 0);
      if (error) {
        const panel = errorPanel({ onRetry: () => void command.retry() });
        const frame = gameFrame({ name: 'エラー' }, panel.el);
        root.append(frame.el);
        mounted = { destroy: () => { panel.destroy(); frame.destroy(); } };
      } else {
        const screen = deps.screens[name];
        mounted = screen ? screen(root, ctx) : null;
      }
    }
    deps.onScreenChange?.(name);
  }

  /** LocationGuard：今のハッシュとゲームの状態から、出す画面を決める */
  function evaluate() {
    const game = store.game;
    document.body.dataset.location = game.state?.location ?? 'none';
    let name = nameOfHash(location.hash);
    if (name === null) {
      replaceHash('title');
      name = 'title';
    } else if (location.hash !== hashOf(name)) {
      // ハッシュなし・「#」だけのときも「#/」にそろえる（TC-0006-06）
      replaceHash(name);
    }
    if (game.status === 'loading') {
      if (current !== null) mount(null);
      return;
    }
    if (game.status === 'error') {
      // タイトルは自前で ErrorPanel を出す。ほかは画面全体を ErrorPanel にする
      if (name === 'title') {
        if (current !== 'title' || showingError) mount('title');
      } else if (current !== name || !showingError) {
        mount(name, true);
      }
      return;
    }
    const allowed: ScreenName[] = game.state === null ? ['title', 'new'] : [BY_LOCATION[game.state.location]];
    if (!allowed.includes(name)) {
      if (queue.holdNavigation && current !== null) return;
      name = allowed[0];
      replaceHash(name);
    }
    if (name !== current || showingError) mount(name);
  }

  const ctx: ScreenContext = {
    store: deps.store,
    api: deps.api,
    command,
    queue,
    get router() { return router; },
  };

  const router: Router = {
    get current() { return current; },
    navigate(name) {
      location.hash = hashOf(name);
    },
    start() {
      offs.push(store.subscribe(evaluate), queue.subscribe(() => {
        if (!queue.holdNavigation) evaluate();
      }));
      window.addEventListener('hashchange', evaluate);
      offs.push(() => window.removeEventListener('hashchange', evaluate));
      evaluate();
    },
    destroy() {
      offs.forEach((off) => off());
      mounted?.destroy();
    },
  };
  return router;
}
