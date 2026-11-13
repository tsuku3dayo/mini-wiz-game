---
id: MWIZ-TASK-0037
type: Implementation Task
title: セーブ 3 つ
status: stable
version: 1.0
updated: 2026-11-11
sources:
  - MWIZ-WS-0019（v1.0）
  - MWIZ-TC-0003（v1.1）
  - MWIZ-TC-0004（v1.1）
  - MWIZ-TC-0006（v1.5）
  - MWIZ-TC-0007（v1.1）
  - MWIZ-TC-0009（v1.2）
  - MWIZ-TC-0012（v1.2）
  - MWIZ-TC-0023（v1.3）
  - MWIZ-TC-0024（v1.3）
  - MWIZ-TC-0029（v1.2）
  - MWIZ-TC-0035（v1.3）
  - MWIZ-TC-0036（v1.3）
  - MWIZ-TC-0037（v1.1）
  - MWIZ-TD-0002（v1.10）
  - MWIZ-TD-0003（v1.7）
  - MWIZ-TD-0004（v1.9）
  - MWIZ-TD-0005（v1.13）
verified: null
---

# TASK-0037 セーブ 3 つ

- WS：[WS-0019](MWIZ-WS-0019-workstream-ja.md)
- ブランチ：`feat/TASK-0037-save-slots`
- 実施記録：AC-0037（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0036

## やること

- `src/platform/storage.ts`：`migrateStorage` の版 1 → 2（`save` → `save-1`、プレイ中の状態に `saveSlot: 1`、まとめて書けたら `save` を消す。TD-0002 §4）
- `src/domain/game-state.ts`：`SaveSlot`・`SAVE_SLOTS`・`saveSlot`（版 6）、`fromSaveData(save, slot)`、移行
- `src/api/repository.ts`：`findSave(slot)`・`listSaves()`・`writeGameAndSave(state, revision, slot, save)`
- `src/api/game-api.ts`・`validate.ts`：`getSaves()`、`save({ slot })`、`load({ slot })`、`run` の自動セーブのスロット（TD-0002 §3.1）
- `src/api/game-view.ts`：`saveSlot`、`clear.autoSaved`
- `src/logic/save-slots.ts`（新しく）：行の文・初めのカーソル（TD-0002 §2）
- `src/ui/store.ts`：`save` を `{ status, slots }` に
- `src/ui/components/save-slot-menu.ts`（新しく）、`src/ui/screens/title.ts`（つづきから）、`inn.ts`（セーブ・上書きの確認）、`clear.ts`（自動セーブしなかったときの文）
- `src/ui/debug.ts`：`writeSave(stored, slot = 1)`（TD-0005）
- テスト：下の表。`e2e/helpers.ts` の `writeSave` の呼び方、セーブのキー名に頼るテストを直す。`e2e/scenes.ts` に「つづきから のスロットの一覧」「セーブのスロットの一覧」「上書きの確認」「狭い画面の戦闘のボタン」の場面を足す（TC-0035・TC-0036-10 の「どの画面も」）
- スクリーンショット：375 × 667 と 1280 × 800 で、タイトル（スロットの一覧・エラーの枠つき）・宿屋（セーブの一覧・上書きの確認）・クリア画面（自動セーブしなかった文）
- `README.md`：セーブの説明（1 つ → 3 つ）を直す
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.14 に合わせ、第 2 部のファイル構成（`save-slots.ts`・`command-buttons.ts`・`save-slot-menu.ts`）・保存のキー・ゲーム API を直す
- 依頼書の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` などを入れない）

## 対象の確認 ID（24 個：新しく 4（自動）・直す 20（自動 19・手動 1））

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/api/game-api.test.ts` | TC-0009-01・03・10・TC-0023-02・TC-0024-04・06・09（新しく）・TC-0029-08・TC-0037-01 |
| `tests/platform/storage.test.ts` | TC-0009-12（新しく） |
| `e2e/pwa.spec.ts` | TC-0003-01・TC-0004-03 |
| `e2e/title.spec.ts` | TC-0006-03・14（新しく） |
| `e2e/name-entry.spec.ts` | TC-0007-08 |
| `e2e/inn.spec.ts` | TC-0009-02・04・11（新しく） |
| `e2e/error.spec.ts` | TC-0012-07 |
| `e2e/clear.spec.ts` | TC-0024-07 |
| `e2e/layout.spec.ts` | TC-0035-01 |
| `e2e/a11y.spec.ts` | TC-0036-01・10 |
| 実機（手動） | TC-0004-04（いまのセーブがスロット 1 に移ること） |

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0037（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
