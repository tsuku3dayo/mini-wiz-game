---
id: MWIZ-TC-0013
type: Test Case
title: ダンジョンに出発する
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0013（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - docs/specification-ja.md (v1.2) §3、§4.5、§15.2、§16.2、§23
verified: null
---

# TC-0013 ダンジョンに出発する

- 対象：[US-0013](../02_requirements/MWIZ-US-0013-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0013-01 | 1 | INN で `enterDungeon` すると、場所 `DUNGEON`・`battle` null・`dungeon.floors` が 5 階（各 `walls` の長さ 100）・`floor` 1・位置が 1F の `up`（入口）・向き `N`。踏破済みは 1F の入口のマスだけ。HP 10/30・MP 4/10 で出発しても 10・4 のまま。メッセージは「ダンジョンに ふみこんだ」（normal）の 1 行 | 単体 | `tests/domain/explore.test.ts` |
| TC-0013-02 | 1 | INN 以外（DUNGEON・BATTLE・SWAP・CLEARED）で `enterDungeon` すると 409 `invalid_state`「その操作は いまは できない」で、状態が変わらない | 単体 | `tests/domain/explore.test.ts` |
| TC-0013-03 | 1 | ゲーム API で 出発 → 宿屋へ戻る → もう一度出発 すると、2 回目の 5 階層（`debugDungeon()` の `walls`・`up`・`down`）が 1 回目と違う | 単体 | `tests/api/game-api.test.ts` |
| TC-0013-04 | 2 | シード 1〜1,000 の `generateFloors` で、どの階も `floorViolations(f, floor)` が空（外周がすべて壁・両側の壁が一致・`up` から 100 マスすべてに行ける・1F〜4F は `down` あり `boss` null、5F は `down` null `boss` あり・目標が `up` からいちばん遠いマスで歩数 5 以上） | 単体 | `tests/domain/floors.test.ts` |
| TC-0013-05 | 3 | 同じシードで 2 回作った 5 階層が同じ（`toEqual`）。シード 1〜100 の 1F はすべて違い、同じ出撃の 5 階も互いに違う | 単体 | `tests/domain/floors.test.ts` |
| TC-0013-06 | 3 | 5 階層の生成 1 回の時間が 50ms 未満、1,000 回の合計が 10 秒未満（CI では 3 倍まで許す。TST-0001 §7） | 単体 | `tests/domain/floors.test.ts` |
| TC-0013-07 | 4 | `SeededRng(2026)` で生成すると、初期位置が `{ x: 9, y: 1, facing: 'N' }`、そのあと `rng.int(1, 1000000)` が 696131、`floors` の `{ walls, up, down, boss }` を `JSON.stringify` した SHA-256 の先頭 16 桁が `18a58bdf4b596269` | 単体 | `tests/domain/floors.test.ts` |

## 2. 準備

- 単体：`SeededRng`（生成の不変条件・参考値）、`tests/helpers/fixtures.ts` の INN の状態。入力は `deepFreeze` して渡す。ゲーム API は `tests/helpers/fake-storage.ts` と `SwappableRng`（既定 `SeededRng(1)`）。
- SHA-256 は node の `crypto.createHash('sha256')` で求める。

## 3. 手順（E2E）

なし（すべて単体）。

## 4. 手動の手順

なし。
