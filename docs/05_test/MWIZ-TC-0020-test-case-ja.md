---
id: MWIZ-TC-0020
type: Test Case
title: にげる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0020（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - docs/specification-ja.md (v1.2) §5.2、§5.3、§16.1
verified: null
---

# TC-0020 にげる

- 対象：[US-0020](../02_requirements/MWIZ-US-0020-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0020-01 | 1 | `fleeChance(5,5)` が 50、`(13,5)` が 90、`(14,5)` が 90、`(5,13)` が 10、`(5,14)` が 10 | 単体 | `tests/domain/battle.test.ts` |
| TC-0020-02 | 2 | 速さ 5 のプレイヤーが速さ 5 の敵から `SequenceRng([50])` で逃げると成功：場所 `DUNGEON`、位置と向きが戦闘の前と同じ、`battle` null、メッセージ「うまく にげきれた」（normal）の 1 行。経験値・所持品・`records.kills` が変わらない。使う乱数は 1 個だけ（`assertExhausted()`。ドロップを引かない） | 単体 | `tests/domain/battle.test.ts` |
| TC-0020-03 | 2 | 画面で：「にげる」で逃げきると、メッセージ「うまく にげきれた」が出て、ダンジョンの画面（`body[data-screen="dungeon"]`）に戻る。`debugDungeon()` の `player` が戦闘の前と同じ | E2E | `e2e/battle.spec.ts` |
| TC-0020-04 | 3 | 速さ 20 のプレイヤーが速さ 3 の敵から `SequenceRng([100, 100, 0])` で逃げると失敗：メッセージが「にげられなかった！」「{敵}の こうげき！ {n} の ダメージを うけた！」の順の 2 行で、プレイヤーの攻撃の行がない。敵の HP が変わらず、場所は `BATTLE` のまま | 単体 | `tests/domain/battle.test.ts` |
| TC-0020-05 | 4 | ボス戦（`isBoss` 真）で `flee` → `InvalidStateError`（409、`invalid_state`、「にげられない！」）。入力の状態が変わらず（`deepFreeze`）、乱数を引かない（呼ぶと例外になる Rng） | 単体 | `tests/domain/battle.test.ts` |
| TC-0020-06 | 4 | ゲーム API でボス戦の `battle({ command: 'flee' })` → `GameError`（status 409、error `invalid_state`、message「にげられない！」）。保存の中身（revision を含む）が前と同じで、`SwappableRng` が進んでいない | 単体 | `tests/api/game-api.test.ts` |

## 2. 準備

- 単体：戦闘の状態は `tests/helpers/fixtures.ts`（敵の種類と残り HP、プレイヤーの素早さ、ボス戦かどうかを指定できるもの）。乱数は `SequenceRng`。ゲーム API は `tests/helpers/fake-storage.ts` と `SwappableRng`。
- E2E：`?debug=1` で開き、`startAt('BATTLE', …)` でスライムとの戦闘から始める（プレイヤーの速さ 13 で成功率 90%）。最初の `int(1,100)` が 90 以下になるシードを `useSeed` で使う（`e2e/helpers.ts` に置く）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0020-03 | 戦闘の前の `debugDungeon()` の `player` を取る →「にげる」→ メッセージ欄に「うまく にげきれた」→ 表示が終わるとダンジョンの画面。`player` が前と同じ |

## 4. 手動の手順

なし。
