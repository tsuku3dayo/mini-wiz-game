---
id: MWIZ-TC-0038
type: Test Case
title: テストで決まった場面を作れる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0038（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0005（v1.2）
  - docs/specification-ja.md (v1.2) §16.2、§22.2、§28
verified: null
---

# TC-0038 テストで決まった場面を作れる

- 対象：[US-0038](../02_requirements/MWIZ-US-0038-user-story-ja.md)（受け入れ条件 3 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。
- テスト用の入口そのものを確かめる E2E は、TST-0001 §4 の表にないので `e2e/debug.spec.ts` に置く（表に足す）。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0038-01 | 1 | `?debug=1` なしで開くと `window.__wiz` が `undefined`。`?debug=1` で開くと `window.__wiz` に `debugDungeon`・`useSeed`・`writeState`・`writeSave`・`setDelay`・`showUpdateBanner` の関数がある | E2E | `e2e/debug.spec.ts` |
| TC-0038-02 | 1 | ダンジョンにいるとき `__wiz.debugDungeon()` が `{ floor, player: { x, y, facing }, walls, up, down, boss, visited }` を返し、`walls` の長さが 100、`floor`・`player` が画面の「{階}F　{向き}」と合う。プレイ中のゲームがないときは 404、宿屋（ダンジョンなし）では 409「ダンジョンに いません」で reject する | E2E | `e2e/debug.spec.ts` |
| TC-0038-03 | 1 | ゲーム API の `debugDungeon()` が、保存の状態から今の階の全マス（未踏破のマス・ボスの位置を含む）を返し、ふつうの操作の結果（GameView）にはそれらが入らない | 単体 | `tests/api/game-api.test.ts` |
| TC-0038-04 | 2 | `useSeed(7)` のあと宿屋で「ダンジョンへ」を選ぶ → `debugDungeon()` の結果を記録。同じ状態に戻して `useSeed(7)` → 「ダンジョンへ」でもう一度 → 2 回の結果（`walls`・`up`・`down`・`boss`・`player`）が同じ。別のシードでは `walls` が違う | E2E | `e2e/debug.spec.ts` |
| TC-0038-05 | 2 | `writeState(stored)` で戦闘中の状態を書くと、ストアが取り直され、`body[data-screen]` が `battle`、`body[data-location]` が `BATTLE` になり、書いた敵の名前が出る。`writeSave(stored)` でセーブを書くと、タイトルで「つづきから」にカーソルがあり、右に「{名前} Lv{n}」が出る | E2E | `e2e/debug.spec.ts` |
| TC-0038-06 | 2 | `setDelay(1000)` のあと宿屋で「やすむ」を選ぶと、応答までの約 1000ms のあいだ `body[data-busy]` が `true` で、300ms を過ぎるとメッセージ欄の右下に「▼」（`aria-label="応答待ち"`）が出る。応答のあとで ▼ が消え、`data-busy` が `true` でなくなる。`setDelay(0)` で元に戻る | E2E | `e2e/debug.spec.ts` |
| TC-0038-07 | 3 | `body[data-screen]` が画面ごとに `title`・`new`・`inn`・`dungeon`・`battle`・`clear`・`swap`。`body[data-location]` がゲームの状態の場所（`INN`・`DUNGEON`・`BATTLE`・`SWAP`・`CLEARED`）で、プレイ中のゲームがないときは `none`。`body[data-busy]` が操作の受付を止めている間だけ `true` | E2E | `e2e/debug.spec.ts` |
| TC-0038-08 | 3 | 効果音を鳴らす判断のたびに `window` に `app:sound` が出て、`detail` が `{ name, muted }`（音がオフでも `muted: true` で出る）。曲を替えた・止めたときに `app:bgm` が出て、`detail` が `{ name }`（止めたときは `null`） | E2E | `e2e/debug.spec.ts` |

## 2. 準備

- 単体：ゲーム API に `tests/helpers/fake-storage.ts` と `SeededRng` を渡し、`tests/helpers/maps.ts` の `dungeonState` で状態を作る。
- E2E：`?debug=1` で開く（TC-0038-01 の前半だけ `?debug=1` なし）。書き込む状態は `e2e/helpers.ts` の `startAt` と同じ形（`StoredGameState`・`StoredSave`）。`app:sound`・`app:bgm` は `addInitScript` で記録する。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0038-01 | `page.goto('./')` → `window.__wiz` を見る → `page.goto('./?debug=1')` → もう一度見る |
| TC-0038-02 | 3F・北向きの状態を書いて `debugDungeon()` を呼ぶ → 形と値を見る。`localStorage` を空にして開き直して呼ぶ → 404 で reject。宿屋の状態を書いて呼ぶ → 409 で reject し、`message` が「ダンジョンに いません」 |
| TC-0038-04 | 宿屋の状態を書く → `useSeed(7)` → 「ダンジョンへ」→ `debugDungeon()`。宿屋の状態を書き直して同じことをもう一度。`useSeed(8)` でもう一度 |
| TC-0038-06 | 偽の時計を入れ、`setDelay(1000)` → 「やすむ」→ 299ms では ▼ がない → 301ms で ▼ がある → 1000ms で応答し ▼ が消える |
| TC-0038-07 | タイトル（ゲームなし）→ 名前入力 → 宿屋 → ダンジョン → 戦闘 → 入れ替え → クリアを順に作り、そのつど `body` の 3 つの属性を見る |
| TC-0038-08 | 音がオフのまま遭遇して `app:sound`（`muted: true`）を見る。音をオンにして宿屋 → ダンジョンへ移り `app:bgm`（`inn` → `dungeon`）を見る。「メニュー → おと」でオフにして `app:bgm`（`null`）を見る |

## 4. 手動の手順

なし。
