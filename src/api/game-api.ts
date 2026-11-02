// ゲーム API（仕様書 §21.5、§21.6、§22、TD-0002 §3）
// 操作は作る TASK ごとに足す。応答の遅れ（delayMs、§28）は TASK-0006 で足す
import { createCharacter, rest } from '../domain/character';
import { DomainError, GameNotFoundError, SaveNotFoundError, ValidationError } from '../domain/errors';
import { assertLocation, fromSaveData, migrateSave, toSaveData, type GameStateData, type StepResult } from '../domain/game-state';
import type { Rng } from '../domain/rng';
import { toGameView } from './game-view';
import { createRepository, StorageError, warnDropped, type KeyValueStore } from './repository';
import { GameError, type CommandResult, type GameApi } from './types';
import { validateStartGame } from './validate';

export interface GameApiDeps {
  store: KeyValueStore;
  rng: Rng;
  now: () => string;
}

/** 例外を GameError に変える（TD-0001 §4） */
function toGameError(e: unknown): GameError {
  if (e instanceof GameError) return e;
  if (e instanceof DomainError) {
    const details = e instanceof ValidationError ? e.details : undefined;
    return new GameError({ status: e.status, error: e.code, message: e.message, details });
  }
  if (e instanceof StorageError) return new GameError({ status: 500, error: 'storage_error', message: '保存できませんでした' });
  console.error(e);
  return new GameError({ status: 500, error: 'internal_error', message: '内部エラー' });
}

/** 中身は同期で動かし、結果はマイクロタスクで返す。失敗は GameError で reject */
function respond<T>(fn: () => T): Promise<T> {
  try {
    return Promise.resolve(fn());
  } catch (e) {
    return Promise.reject(toGameError(e));
  }
}

export function createGameApi(deps: GameApiDeps): GameApi {
  const repo = createRepository(deps.store, deps.now);

  function requireGame() {
    const found = repo.findGame();
    if (!found) throw new GameNotFoundError();
    return found;
  }

  /** 読む → ルールの関数 → revision を確かめて書く（CLEARED に入ったらセーブもまとめて書く）→ GameView */
  function run(step: (state: GameStateData) => StepResult): Promise<CommandResult> {
    return respond(() => {
      const { state, revision } = requireGame();
      const result = step(state);
      const next = result.state;
      if (next.location === 'CLEARED' && state.location !== 'CLEARED') {
        repo.writeGameAndSave(next, revision, toSaveData(next));
      } else {
        repo.updateGame(next, revision);
      }
      return { state: toGameView(next), messages: result.messages };
    });
  }

  return {
    getGame: () => respond(() => {
      const found = repo.findGame();
      return { state: found ? toGameView(found.state, { autoSaved: found.storedVersion >= 3 }) : null };
    }),

    getSave: () => respond(() => {
      const save = repo.findSave();
      return save
        ? { exists: true, summary: { name: save.name, level: save.level, savedAt: save.savedAt } }
        : { exists: false, summary: null };
    }),

    startGame: (input) => respond(() => {
      const state = createCharacter(validateStartGame(input));
      repo.replaceGame(state);
      return { state: toGameView(state), messages: [{ text: `${state.name}の ぼうけんが はじまった`, tone: 'normal' }] };
    }),

    quitGame: () => respond(() => {
      const { state } = requireGame();
      assertLocation(state, 'INN', 'CLEARED');
      repo.deleteGame();
    }),

    save: () => respond(() => {
      const { state } = requireGame();
      assertLocation(state, 'INN');
      repo.writeSave(toSaveData(state));
      return { state: toGameView(state), messages: [{ text: 'セーブしました', tone: 'success' }] };
    }),

    load: () => respond(() => {
      const stored = repo.findSave();
      if (!stored) throw new SaveNotFoundError();
      const state = fromSaveData(migrateSave(stored, warnDropped));
      repo.replaceGame(state);
      return { state: toGameView(state), messages: [{ text: `${state.name}は 宿屋で めをさました`, tone: 'normal' }] };
    }),

    rest: () => run(rest),
  };
}
