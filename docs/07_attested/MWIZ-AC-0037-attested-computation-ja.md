---
id: MWIZ-AC-0037
type: Attested Computation
title: セーブ 3 つの実施記録
status: stable
version: 1.0
updated: 2026-11-11
sources:
  - MWIZ-TASK-0037（v1.0）
  - MWIZ-TC-0003（v1.1）
  - MWIZ-TC-0004（v1.1）
  - MWIZ-TC-0006（v1.5）
  - MWIZ-TC-0007（v1.1）
  - MWIZ-TC-0009（v1.1）
  - MWIZ-TC-0012（v1.2）
  - MWIZ-TC-0023（v1.2）
  - MWIZ-TC-0024（v1.2）
  - MWIZ-TC-0029（v1.1）
  - MWIZ-TC-0035（v1.3）
  - MWIZ-TC-0036（v1.3）
  - MWIZ-TC-0037（v1.1）
  - MWIZ-TC-0038（v1.1）
verified: { by: "tsuku3dayo", at: "2026-11-11T17:34:34+09:00" }
---

# AC-0037 セーブ 3 つの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0037](../06_plan/MWIZ-TASK-0037-implementation-task-ja.md) セーブ 3 つ（変更の依頼 `docs/requests/2026-11-11-spec-1.14-slots-levelup-evade.md`・`docs/requests/2026-11-11-spec-1.15-title-slot-error.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0037-save-slots` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `src/platform/storage.ts`：`STORAGE_VERSION = 2`。`migrateStorage` の版 1 → 2（`save` を `save-1` に写し、プレイ中の状態に `saveSlot: 1` を足して `writeAll` でまとめて書き、書けたら `save` を消して版 2。書けなければ版 1 のまま）
- `src/domain/game-state.ts`：`SaveSlot`・`SAVE_SLOTS`・`isSaveSlot`、`GameStateData.saveSlot`、`GAME_SCHEMA_VERSION = 6`、`migrateGameState` は版を問わず 1〜3 なら `saveSlot` を採る、`fromSaveData(save, slot)`。`createCharacter` は `saveSlot: null`
- `src/api/repository.ts`：キー `save-{slot}`、`findSave(slot)`・`listSaves()`・`writeGameAndSave(state, revision, slot, save)`（`writeSave` はなくした）
- `src/api/game-api.ts`・`validate.ts`：`getSaves()`、`save({ slot })`（`slot` の検査 → INN → セーブとプレイ中の状態をまとめて書く・「スロット{n}に セーブしました」）、`load({ slot })`、`run` の自動セーブのスロット（最後に使ったスロット → 最初の空き → なければ書かない）、`getGame()` の `clear.autoSaved`
- `src/api/game-view.ts`・`types.ts`：`saveSlot`、`clear.autoSaved` は `saveSlot` があるとき true。`SaveSlotSummary`・`SaveList`
- `src/logic/save-slots.ts`（新しく）：`slotLabel`・`overwriteText`・`hasAnySave`・`latestSlot`・`defaultSaveSlot`
- `src/ui/store.ts`：`save` を `{ status, slots }` に
- `src/ui/components/save-slot-menu.ts`（新しく）：スロットの一覧（見出し付きのウィンドウ・もどる／スロット1〜3・`trapFocus`・Esc＝もどる。`load` では空きを無効）
- `src/ui/screens/title.ts`：「つづきから」でスロットの一覧（初めはいちばん新しいスロット）。もどる・Esc でメニューの「つづきから」へ。**続けられないエラーのときは一覧を閉じてメニューに戻し、その下にエラーの枠**（仕様書 v1.15）。右の「{名前} Lv{n}」はなくした
- `src/ui/screens/inn.ts`：「セーブ」でスロットの一覧（初めは最後に使ったスロット → 最初の空き → 1）。空きはすぐ書き、中身があれば上書きの確認（いいえ・Esc で一覧の同じスロットへ）。書き終えたらメニューの「セーブ」へ
- `src/ui/screens/clear.ts`・`style.css`：自動セーブしなかったとき「スロットが いっぱいなので セーブしなかった」（副文字色）
- `src/ui/debug.ts`：`writeSave(stored, slot = 1)`
- `e2e/helpers.ts`：`writeScene`・`startAt` に `saves`（スロットごと）、`readStorage` にスロット 2・3。`e2e/scenes.ts` に「タイトル・つづきから」「宿屋・セーブ」「宿屋・上書きの確認」「ゲームクリア（セーブなし）」の場面
- `README.md`：遊び方のセーブ（3 つ）・レベルアップ（やすむ）
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.15 に合わせ（仕様書と 1 行も違わないことを比べて確かめた）、第 2 部の §20.1・§21・§24・§25.4・§27・§28・§32 を実装に合わせた
- 依頼書 v1.14・v1.15 に結果を書いた

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0009-01・03・10 | 単体 | OK |
| TC-0023-02 | 単体 | OK |
| TC-0024-04・06・09 | 単体 | OK |
| TC-0029-08 | 単体 | OK |
| TC-0037-01 | 単体 | OK（3 スロットとも埋まった重い状態でも 300ms 未満） |
| TC-0009-12 | 単体（`tests/platform/storage.test.ts`） | OK |
| TC-0003-01・TC-0004-03 | E2E | OK |
| TC-0006-03・14 | E2E（3 端末） | OK |
| TC-0007-08 | E2E | OK |
| TC-0009-02・04・11 | E2E（3 端末。Esc は `desktop`） | OK |
| TC-0012-07 | E2E | OK |
| TC-0024-07 | E2E | OK |
| TC-0035-01 | E2E（`pixel7`・`small`。タップだけ） | OK |
| TC-0036-01・10 | E2E（01 は `desktop` のキーだけ、10 は 3 端末の axe） | OK |
| TC-0004-04 | 手動（iPhone 11 の Safari。2026-11-11 オーナー） | OK（いままでのセーブがスロット 1 に移った） |

設計・仕様を直したこと：

- **仕様書 v1.15・GUI-0002 v1.5（PR #118。承認 2026-11-11T16:31:38+09:00）**：タイトルの「つづきから」のスロットの一覧の下にエラーの枠が出ると、414 × 715 で 36px・1366 × 657 で 21px 縦にはみ出した（一覧は見出し付きのウィンドウなので、タイトルのメニューより約 36px 高い。v1.14 の「縦の高さは変わらない」の見込みが外れた）。オーナーが選んだ案 A で、エラーのときは一覧を閉じてタイトルのメニューに戻し、その下に枠を出すようにした。TD-0004 v1.6・TC-0006 v1.5・TC-0012 v1.2 も直した。あわせて仕様書 §21.4 の `saveSlot` の食い違いと §10 の `api.load()` を直した（動きは変えない）
- **TC-0038 v1.1**：TC-0038-05 が「タイトルの右に{名前} Lv{n}」のままだった（v1.14 で見落とした）。スロットの一覧で確かめる形に直した

あわせて確かめたこと：

- 画面：タイトル（つづきから のスロットの一覧・書けないときのエラーの枠）、宿屋（セーブのスロットの一覧・上書きの確認）、クリア画面（セーブしなかった）を、375 × 667 と 1280 × 800 で撮って見た（作業用の一時フォルダ）。どれも縦にはみ出さない。エラーのときは一覧が閉じてタイトルのメニュー（カーソルは「つづきから」）の下に枠が出る。
- TC-0035-02〜04・12・TC-0036-10（`e2e/scenes.ts` の全場面。足した 4 場面を含む）は通った。

手元で通したもの（2026-11-11）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 1（AC-0024 の仕様書の版の表記＝承認済みの記録なので変えない）、単体 191 件、build、check:dist OK
- `npm run test:e2e`：1 回目は 12 件落ちた（タイトルのスロットの一覧＋エラーの枠のはみ出し＝仕様書 v1.15 で直した、テストの書き方 2 つ）。直したあとの全部で 506 件通った・46 件はその端末の対象外で飛ばした（7.9 分）

手動の確認（WS-0019 の終わり。公開中の版 `index-Dyp40HUq.js`）：

| 項目 | 方法 | 結果 |
| --- | --- | --- |
| セーブのスロットの一覧・上書きの確認 | 手動（iPhone 11 の Safari・PC の Chrome。2026-11-11 オーナー） | iPhone：OK。PC：OK |
| タイトルの「つづきから」（スロットを選んで再開） | 手動（iPhone 11 の Safari・PC の Chrome。2026-11-11 オーナー） | iPhone：OK。PC：OK |

## 3. 確認できなかったこと

- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- 測るためのプログラム・写真・差分を当てたときの記録（`.rej`）は、プロジェクトの外の作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（仕様書 v1.15・GUI-0002 v1.5 を再承認）
- [x] AC-0037（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑で、マージされた（PR #119。マージ = 公開。仕様書 v1.15 は PR #118）
- [x] WS の終わりに実機の確認を案内し、結果を書いて review にした（iPhone・PC とも OK。2026-11-11）
