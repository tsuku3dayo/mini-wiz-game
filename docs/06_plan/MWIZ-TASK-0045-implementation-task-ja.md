---
id: MWIZ-TASK-0045
type: Implementation Task
title: 扉と宝箱・通路の出現表・保存の版 8（仕様書 v1.25）
status: stable
version: 1.0
updated: 2026-11-27
sources:
  - MWIZ-WS-0027（v1.0）
  - MWIZ-TD-0002（v1.12）
  - MWIZ-TD-0004（v1.10）
  - MWIZ-TC-0013（v1.2）
  - MWIZ-TC-0014（v1.1）
  - MWIZ-TC-0015（v1.1）
  - MWIZ-TC-0018（v1.6）
  - MWIZ-TC-0024（v1.4）
  - MWIZ-TC-0041（v1.0）
verified: null
---

# TASK-0045 扉と宝箱・通路の出現表・保存の版 8

- WS：[WS-0027](MWIZ-WS-0027-workstream-ja.md)
- ブランチ：`feat/TASK-0045-doors`
- 実施記録：AC-0045（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0044

## やること

TD-0002 §1.11・TD-0004 §4.1 のとおりに作る。04 で仮に当てたコードの差分（作業用の一時フォルダの `v125-draft-src.patch`。TASK-0046 の分も入っている）があれば、扉・出現表・保存・画面の分だけを当ててから始めてよい（効果音の `src/audio/sound.ts`・`src/main.ts`・`src/ui/message-queue.ts`・`src/logic/message-plan.ts`・`tests/audio/` は TASK-0046 で当てる）。なければ TD から作る。

- `src/domain/constants.ts`：`ENCOUNTER_TABLE`（§6.2）・`DOOR_ENEMY`・`CHEST_SOURCE`
- `src/domain/game-state.ts`：`DoorData`・`FloorData.doors`・`BattleData.door?`、`GAME_SCHEMA_VERSION = 8`、`normalizeDoors`、`migrateGameState`（扉・`battle.door` の補正）
- 新しい `src/domain/doors.ts`：`deadEnds`・`doorSide`・`placeDoors`・`aheadOf`・`setDoorState`・`openDoor`・`openChest`
- `src/domain/floors.ts`：`generateFloors`（`placeDoors`）・`floorViolations`（目標の最遠の決まり、扉の決まり）
- `src/domain/dungeon.ts`：`move` の `blocked`。`src/domain/explore.ts`：ぶつかったときの文
- `src/domain/battle.ts`：`startBattle(state, kind, { door })`、`onVictory` で扉を `gone`
- `src/domain/loot.ts`：`rollItem`・`rollChest`・`chestMessage`（文は `dropMessage` と共通の関数で作る）・`applyChest`
- `src/domain/view.ts`：`Side` の `door`・`chest`・`ahead`・地図の `doors`
- `src/api/game-api.ts`・`types.ts`：`openDoor`・`openChest`・`debugDungeon.doors`・型
- 画面：`components/stairs-button.ts`・`screens/dungeon.ts`・`logic/view-to-segments.ts`・`logic/map-to-shapes.ts`・`components/auto-map.ts`・`style.css`（`.wiz-map-door`）・`logic/describe-view.ts`
- テストの道具：`tests/helpers/maps.ts`（`doors: []`）、`tests/helpers/autoplayer.ts`（扉を避け、下り階段・ボスの扉を開ける。見積もり用の `openAll`）、`e2e/helpers.ts`（保存の版の既定を 8 に。扉つきの地図を作る道具。`dungeonMap` の各階に `doors: []`）
- テスト：TC-0041 の確認 ID（下の表）を新しく書く。`tests/domain/floors.test.ts` の `shape` に `doors` を足す
- 古い値でも探す（ふりかえり ws-20・ws-23）：`70`・`30`（1F の出現表）、`[20, 31]`、`696131`・`18a58bdf`、`550`（乱数の数）、`schemaVersion: 7`、「ボスのマス」「いちばん遠い」
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.25 に合わせ、第 2 部の §21・§22・§24 を実装に合わせる（TASK-0046 の分も、仕様書の差分はこの TASK でまとめて当ててよい）
- 依頼書の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` を入れない）

## 対象の確認 ID

テストケースの中身が変わったもの・新しいもの：

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/doors.test.ts`（新しい） | TC-0041-01・02・07・08・09・10・12・15 |
| `tests/domain/floors.test.ts` | TC-0013-04・TC-0013-07・TC-0041-03 |
| `tests/domain/explore.test.ts` | TC-0018-01・TC-0018-04・TC-0024-01・TC-0041-04 |
| `tests/domain/constants.test.ts` | TC-0018-07 |
| `tests/domain/view.test.ts` | TC-0014-06・TC-0015-02・TC-0041-05・TC-0041-17 |
| `tests/domain/battle.test.ts` | TC-0041-13 |
| `tests/domain/game-state.test.ts` | TC-0041-22 |
| `tests/api/game-api.test.ts` | TC-0015-05・TC-0041-20・TC-0041-21 |
| `tests/logic/view-to-segments.test.ts` | TC-0041-16 |
| `tests/logic/map-to-shapes.test.ts` | TC-0041-17 |
| `tests/logic/describe-view.test.ts` | TC-0041-18 |
| `e2e/dungeon.spec.ts` | TC-0041-06・TC-0041-11・TC-0041-14・TC-0041-19 |
| `e2e/layout.spec.ts` | TC-0041-23 |

04 で仮に当てて落ちた、テストのコードだけを直すもの（確かめることは変わらない）：

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/api/game-api.test.ts` | TC-0038-03（`debugDungeon` に `doors` が増えた） |
| `tests/domain/floors.test.ts` | ID なし 1 件（「5 階層で 550 個の乱数を引き…」→ 乱数の数は 550 ＋ ほかの扉の数） |
| `tests/domain/explore.test.ts` | ID なし 2 件（「3F で [20, 31] はスケルトン」「pickEnemy は表の順に累積して選ぶ（境界の値）」） |
| `e2e/debug.spec.ts` | TC-0038-02（`debugDungeon` のキー） |

- 04 の時点（2026-11-27）で、この TASK の分は単体 11 件（確認 ID 8 個と ID なし 3 件）、E2E 1 個のテスト（3 つの画面幅で 3 件）が落ちた。上の 2 つの表はその全部と、新しく書くもの。
- `e2e/sound.spec.ts` の TC-0032-16（音の機能がないブラウザで遭遇・戦闘・レベルアップまで遊ぶ）も 04 で落ちた。2 つの TASK の分をまとめて当てたので、原因（出現表が変わって遭遇する敵が変わったか、効果音の名前か）を 04 では分けていない。この TASK で動かして、落ちたらここで直し（場面・シードを直す）、落ちなければ TASK-0046 で見る。
- 通しプレイ（TC-0024-05・TC-0025-03）は、自動プレイヤーを直すと通った。
- 「宝箱をあける」が操作の行に 1 行で収まることは、04 で測った（TD-0004 §4.1）。TC-0041-23 で縛る。

## 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（扉の前・宝箱の前・扉にぶつかったとき・地図の扉の線）
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0045（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
