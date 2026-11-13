// ゲーム API（仕様書 §21.5、§21.6、§22、TD-0002 §3）
// 操作は作る TASK ごとに足す
import { resolveTurn } from '../domain/battle';
import { continueToInn, createCharacter, rest } from '../domain/character';
import { discard, equip, unequip } from '../domain/equipment';
import { fieldHeal } from '../domain/heal';
import { abandonLoot, takeLoot } from '../domain/loot';
import { DomainError, GameNotFoundError, InvalidStateError, SaveNotFoundError, ValidationError } from '../domain/errors';
import { enterDungeon, moveInDungeon, returnToInn, useStairs } from '../domain/explore';
import { assertLocation, fromSaveData, migrateSave, SAVE_SLOTS, toSaveData, type GameStateData, type SaveSlot, type StepResult } from '../domain/game-state';
import type { Rng } from '../domain/rng';
import { toGameView } from './game-view';
import { createRepository, StorageError, warnDropped, type KeyValueStore } from './repository';
import { GameError, type CommandResult, type GameApi } from './types';
import { validateBattle, validateDiscardId, validateItemId, validateMove, validateSaveSlot, validateSlot, validateStairs, validateStartGame } from './validate';

export interface GameApiDeps {
  store: KeyValueStore;
  rng: Rng;
  now: () => string;
  /** 応答を返す前に待つ（テスト用の入口の setDelay。§28）。api ではタイマーを使わないので、待つ関数を受け取る */
  delay?: () => Promise<void>;
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

export function createGameApi(deps: GameApiDeps): GameApi {
  const repo = createRepository(deps.store, deps.now);

  /** 中身は同期で動かし、結果はマイクロタスクで返す（delay があれば待ってから）。失敗は GameError で reject */
  function respond<T>(fn: () => T): Promise<T> {
    // 待つ間に reject のままの Promise を置かない（未処理の reject として報告されないように）
    let settle: () => T;
    try {
      const value = fn();
      settle = () => value;
    } catch (e) {
      const error = toGameError(e);
      settle = () => { throw error; };
    }
    const wait = deps.delay?.() ?? Promise.resolve();
    return wait.then(settle);
  }

  function requireGame() {
    const found = repo.findGame();
    if (!found) throw new GameNotFoundError();
    return found;
  }

  /** 最初の空きスロット（1→3）。なければ null */
  function firstEmptySlot(): SaveSlot | null {
    const index = repo.listSaves().findIndex((s) => s === null);
    return index === -1 ? null : SAVE_SLOTS[index];
  }

  /**
   * 読む → ルールの関数 → revision を確かめて書く → GameView。
   * CLEARED に入ったら、最後に使ったスロット（なければ最初の空き）へ自動セーブもまとめて書く。
   * 書くスロットがなければ自動セーブしない（saveSlot は null のまま。仕様書 §9.2・§21.6。v1.14）
   */
  function run(step: (state: GameStateData) => StepResult): Promise<CommandResult> {
    return respond(() => {
      const { state, revision } = requireGame();
      const result = step(state);
      let next = result.state;
      const slot = next.location === 'CLEARED' && state.location !== 'CLEARED' ? (next.saveSlot ?? firstEmptySlot()) : null;
      if (slot !== null) {
        next = { ...next, saveSlot: slot };
        repo.writeGameAndSave(next, revision, slot, toSaveData(next));
      } else {
        repo.updateGame(next, revision);
      }
      return { state: toGameView(next), messages: result.messages };
    });
  }

  return {
    getGame: () => respond(() => {
      const found = repo.findGame();
      // 版 2 以下は自動セーブ導入前のクリア。3 以上は最後に使ったスロットがあれば自動セーブした（v1.14）
      return { state: found ? toGameView(found.state, { autoSaved: found.storedVersion >= 3 && found.state.saveSlot !== null }) : null };
    }),

    getSaves: () => respond(() => ({
      slots: repo.listSaves().map((s, i) => (s ? { slot: SAVE_SLOTS[i], name: s.name, level: s.level, savedAt: s.savedAt } : null)),
    })),

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

    save: (input) => respond(() => {
      const slot = validateSaveSlot(input);
      const { state, revision } = requireGame();
      assertLocation(state, 'INN');
      // セーブとプレイ中の状態（最後に使ったスロット）をまとめて書く（仕様書 §21.6。v1.14）
      const next: GameStateData = { ...state, saveSlot: slot };
      repo.writeGameAndSave(next, revision, slot, toSaveData(next));
      return { state: toGameView(next), messages: [{ text: `スロット${slot}に セーブしました`, tone: 'success' }] };
    }),

    load: (input) => respond(() => {
      const slot = validateSaveSlot(input);
      const stored = repo.findSave(slot);
      if (!stored) throw new SaveNotFoundError();
      const state = fromSaveData(migrateSave(stored, warnDropped), slot);
      repo.replaceGame(state);
      return { state: toGameView(state), messages: [{ text: `${state.name}は 宿屋で めをさました`, tone: 'normal' }] };
    }),

    rest: () => run((state) => rest(state, deps.rng)),

    continueGame: () => run(continueToInn),

    enterDungeon: () => run((state) => enterDungeon(state, deps.rng)),

    move: (input) => run((state) => moveInDungeon(state, validateMove(input), deps.rng)),

    stairs: (input) => run((state) => useStairs(state, validateStairs(input))),

    returnToInn: () => run(returnToInn),

    heal: () => run(fieldHeal),

    battle: (input) => run((state) => resolveTurn(state, validateBattle(input), deps.rng)),

    equip: (input) => run((state) => equip(state, validateItemId(input))),

    unequip: (input) => run((state) => unequip(state, validateSlot(input))),

    discard: (input) => run((state) => discard(state, validateItemId(input))),

    lootTake: (input) => run((state) => takeLoot(state, validateDiscardId(input))),

    lootAbandon: () => run(abandonLoot),

    debugDungeon: () => respond(() => {
      const { state } = requireGame();
      const d = state.dungeon;
      if (!d || state.location === 'INN') throw new InvalidStateError('ダンジョンに いません');
      const f = d.floors[d.floor - 1];
      return {
        floor: d.floor,
        player: { ...d.player },
        walls: [...f.walls],
        up: { ...f.up },
        down: f.down ? { ...f.down } : null,
        boss: f.boss ? { ...f.boss } : null,
        visited: [...f.visited],
      };
    }),
  };
}
