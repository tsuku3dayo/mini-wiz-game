---
id: MWIZ-TC-0017
type: Test Case
title: 宿屋へ戻る
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0017（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - docs/specification-ja.md (v1.2) §4.5、§7.3、§16.2
verified: null
---

# TC-0017 宿屋へ戻る

- 対象：[US-0017](../02_requirements/MWIZ-US-0017-user-story-ja.md)（受け入れ条件 2 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0017-01 | 1 | 1F の入口（1F の `up`）で `returnToInn` → 場所 `INN`、`dungeon` null、`battle` null、メッセージ「宿屋に もどった」（normal）の 1 行。乱数を引かない | 単体 | `tests/domain/explore.test.ts` |
| TC-0017-02 | 1 | 1F の入口でないマス・2F の上り階段のマスで `returnToInn` → 409 `invalid_state`「入口に いないため もどれません」。場所が DUNGEON でない（INN・BATTLE）→ 409 `invalid_state`「その操作は いまは できない」。どれも状態が変わらない | 単体 | `tests/domain/explore.test.ts` |
| TC-0017-03 | 2 | HP 10/30・MP 4/10・経験値 15・所持品 3 個・装備ありで戻ると、HP 10・MP 4・経験値 15・所持品と装備・実績が戻る前と同じ（回復しない） | 単体 | `tests/domain/explore.test.ts` |
| TC-0017-04 | 1、2 | 画面で：1F の入口で「宿屋へ戻る」を押すと宿屋の画面（`body[data-screen="inn"]`）になり、メッセージ欄に「宿屋に もどった」、ステータスの HP・MP が戻る前と同じ。もう一度出発すると、前と違う迷宮（`debugDungeon()` の `walls` が違う） | E2E | `e2e/dungeon.spec.ts` |

## 2. 準備

- 単体：`tests/helpers/maps.ts` の `openMap(player, extra, floor)` と `dungeonState`、`tests/helpers/fixtures.ts`（所持品・装備のある状態）。入力は `deepFreeze` して渡す。
- E2E：`?debug=1` で開き、`startAt('DUNGEON', …)` で 1F の入口に立ち、HP 10/30・MP 4/10 の状態から始める。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0017-04 | 「宿屋へ戻る」→ 宿屋の画面。ステータスの HP が「 10/ 30」、MP が「  4/ 10」。「ダンジョンへ」→ `debugDungeon()` の `walls` が戻る前に取った値と違う |

## 4. 手動の手順

なし。
