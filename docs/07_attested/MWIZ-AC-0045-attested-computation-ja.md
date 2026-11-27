---
id: MWIZ-AC-0045
type: Attested Computation
title: 扉と宝箱・通路の出現表・保存の版 8（仕様書 v1.25）の実施記録
status: draft
version: 1.0
updated: 2026-11-27
sources:
  - MWIZ-TASK-0045（v1.0）
  - MWIZ-TC-0013（v1.2）
  - MWIZ-TC-0014（v1.1）
  - MWIZ-TC-0015（v1.1）
  - MWIZ-TC-0018（v1.6）
  - MWIZ-TC-0024（v1.4）
  - MWIZ-TC-0038（v1.1）
  - MWIZ-TC-0041（v1.0）
verified: null
---

# AC-0045 扉と宝箱・通路の出現表・保存の版 8（仕様書 v1.25）の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0045](../06_plan/MWIZ-TASK-0045-implementation-task-ja.md) 扉と宝箱・通路の出現表・保存の版 8（変更の依頼 `docs/requests/2026-11-27-spec-1.25-doors-drop-se.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0045-doors` |
| 環境 | Windows 11・PowerShell／Git Bash、Node.js v24.0.0。Vitest 5.1.1、Playwright 1.65.1 の Chromium |

作ったもの（TD-0002 v1.12 §1.11・TD-0004 v1.10 §4.1 のとおり）：

- 04 で仮に当てた差分（`v125-draft-src.patch`）のうち、効果音の分（`src/audio/sound.ts`・`src/main.ts`・`src/ui/message-queue.ts`・`src/logic/message-plan.ts`・`tests/audio/`）を除いて当て、TD に書いた 2 点を直した：宝箱の行の文を `dropMessage` と共通の関数（`itemPhrase`・`itemLine`）で作る（仮に作ったときは文を置き換えていた）。`floorViolations` に扉の決まりを足した
- ルール：`src/domain/constants.ts`（出現表・`DOOR_ENEMY`・`CHEST_SOURCE`）、`game-state.ts`（扉の型・版 8・`normalizeDoors`）、新しい `doors.ts`、`floors.ts`、`dungeon.ts`（`move` の `blocked`）、`explore.ts`、`battle.ts`（`door`・勝ったら扉を消す）、`loot.ts`（`rollChest`・`chestMessage`・`applyChest`）、`view.ts`
- ゲーム API：`openDoor`・`openChest`・`debugDungeon.doors`、型
- 画面：`stairs-button.ts`（「扉をあける」「宝箱をあける」）、`dungeon.ts`（押したときの操作・扉にぶつかったときの点滅）、`view-to-segments.ts`（扉の形・宝箱の文字）、`map-to-shapes.ts`・`auto-map.ts`・`style.css`（地図の扉の線）、`describe-view.ts`
- テストの道具：`tests/helpers/maps.ts`（`doors: []`・`withDoor`）、`tests/helpers/autoplayer.ts`、`e2e/helpers.ts`（版 8・`dungeonMap` の扉・`doorMap`）
- `docs/reproduction-specification.md`：仕様書 v1.24 → v1.25 の差分を当てた。当たらなかった版の行・改訂履歴・第 2 部（§20.1・§21.1・§21.4・§24.2・§28・§29.2）のうち、扉の分を手で直した。効果音の分（§25.4・§29 の音のテスト）は TASK-0046 で直す。第 1 部が仕様書と 1 行も違わないことを比べた
- 依頼書 v1.25 の影響の一覧に結果を書いた

直す前に、古い値（`70`・`30` の出現表、`[20, 31]`、`696131`・`18a58bdf`、`550`、`schemaVersion: 7`、「ボスのマス」「いちばん遠い」）を `tests/`・`e2e/`・`src/` で探し、04 の表に挙げたもの以外に直すところがないことを確かめた。

## 2. 確認結果

| 確認 ID | 方法 | 結果 | 直したこと |
| --- | --- | --- | --- |
| TC-0041-01・02・07〜10・12・15 | 単体（`tests/domain/doors.test.ts`、新しい） | OK | 新しく書いた。宝箱の乱数の列は、段階の範囲の外の値で `SequenceRng` が止まることも確かめた |
| TC-0041-03 | 単体（`floors.test.ts`） | OK | 新しく書いた。シード 1〜1,000 の 5,000 階で扉の決まりの違反なし、扉が 5 つの階が 99% 以上。違反を挙げることも確かめた |
| TC-0041-04 | 単体（`explore.test.ts`） | OK | 新しく書いた（前進・後退とも） |
| TC-0041-05・17 | 単体（`view.test.ts`・`map-to-shapes.test.ts`） | OK | 新しく書いた |
| TC-0041-13 | 単体（`battle.test.ts`） | OK | 新しく書いた（プレイヤーのすばやさ 10 で先攻） |
| TC-0041-16・18 | 単体（`view-to-segments.test.ts`・`describe-view.test.ts`） | OK | 新しく書いた（扉の線の座標は仕様書 §11.5 の式で計算した値） |
| TC-0041-20・21 | 単体（`game-api.test.ts`） | OK | 新しく書いた |
| TC-0041-22 | 単体（`game-state.test.ts`） | OK | 新しく書いた |
| TC-0041-06・11・14・19 | E2E（`dungeon.spec.ts`。14 は desktop だけ） | OK | 新しく書いた。`e2e/helpers.ts` に扉の場面の `doorMap` を足した |
| TC-0041-23 | E2E（`layout.spec.ts`、desktop で 3 つの画面の大きさ） | OK | 新しく書いた |
| TC-0013-04・07 | 単体 | OK | 07：参考値を 284376・`49843f9097299880` に、形に `doors` を足した。扉は 5 階とも 5 つ。04 は `floorViolations` が扉の決まりも見るようになり、直さずに通った |
| TC-0014-06・TC-0015-02 | 単体 | OK | 視界のキーに `ahead`、最後の段の正面は壁か扉。地図のマスに `doors` |
| TC-0015-05・TC-0038-03 | 単体 | OK | `dungeon` のキーに `ahead`、隠す文字に `"doors":[`。`debugDungeon` に `doors: []`。5F のダークナイトの乱数を 50 → 51 に |
| TC-0018-01・04・07 | 単体 | OK | 新しい出現表の境目（1F は 1・100 ともスライム、2F〜5F は 50/51）、例を [20, 51] に。扉の敵・宝箱の元の敵の定数も確かめた |
| TC-0024-01 | 単体 | OK | 直さずに通った（`openMap` は扉なし） |
| ID なし 3 件 | 単体 | OK | 乱数の数を「550 ＋ ほかの扉の数」に、出現表の境目の例を新しい表に |
| TC-0038-02 | E2E（3 端末） | OK | `debugDungeon` のキーに `doors` |
| TC-0024-05・TC-0025-03（通しプレイ） | 単体 | OK | 自動プレイヤーを直して通った（直さずには「道が見つからない」で止まる） |

手元で通したもの（2026-11-27）：

- `npm run verify`：lint、check:docs（エラー 0・注意 2：AC-0024 の仕様書の版の表記＝承認済みの記録なので変えない／TC-0032-23 は TASK-0046、TC-0041-24 は手動）、単体 40 ファイル 217 件、build、check:dist OK
- `npm run test:e2e`：530 件通った・55 件はその端末の対象外で飛ばした・落ちたものはない（8.0 分）。04 で落ちた TC-0032-16 は、この TASK では落ちなかった（原因は効果音の名前の側。TASK-0046 で見る）

画面の確かめ：入口の北に宝箱の扉を置いた場面を `?debug=1` の `writeState` で書き、375 × 667・414 × 715・1280 × 800 で、閉じた扉と残っている宝箱を撮って見た。疑似3D の扉の形（3 辺と取っ手）・「□ たからばこ」の文字・地図・ボタンが重ならず、「扉をあける」「宝箱をあける」は 1 行（136 × 48px）で、横にも縦にもはみ出さない。

## 3. 確認できなかったこと

- 実機（iPhone 11・PC）での扉のボタン・扉の見え方・宝箱・扉の敵・遊んだ手ごたえ（TC-0041-24）は、WS-0027 の終わりに確かめる。
- Android の実機はない。
- 遊ぶ長さ・難しさは、04 の自動プレイヤーの見積もり（TD-0002 §1.11）しかない。人が遊んだ手ごたえは手動テストで見る。

## 4. 後片付け

- 作業用の一時フォルダの差分・見積もりの道具は、リポジトリに入れていない。
- 撮影用の確認用サーバーは止めた。

## 5. 完了の定義

- [x] 対象の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（設計どおりに作った。TD に書いた 2 点の直しは TD どおり）
- [x] AC-0045（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた
- [ ] WS の終わりの手動テストの結果を書いた
