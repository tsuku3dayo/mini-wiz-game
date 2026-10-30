---
id: MWIZ-TASK-0006
type: Implementation Task
title: 画面の共通の仕組み
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0002（v1.0）
  - MWIZ-TC-0006（v1.0）
  - MWIZ-TC-0007（v1.0）
  - MWIZ-TC-0010（v1.0）
  - MWIZ-TC-0011（v1.0）
  - MWIZ-TC-0012（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0003（v1.0）
verified: null
---

# TASK-0006 画面の共通の仕組み

- WS：[WS-0002](MWIZ-WS-0002-workstream-ja.md)
- ブランチ：`feat/TASK-0006-ui-core`
- 実施記録：AC-0006（`docs/07_attested/MWIZ-AC-0006-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0005

## やること

- `ui/store.ts`・`router.ts`・`command.ts`・`message-queue.ts`・`effects.ts`・`dom.ts`（`isWide`・`onWideChange`）
- 部品：game-frame・game-window・command-menu・confirm-menu・game-menu・message-log（`rows`）・error-panel・text-input・status-panel
- `logic/menu-model.ts`・`message-plan.ts`・`name.ts`・`version.ts`
- `ui/debug.ts` の `writeState`・`writeSave`・`useSeed`・`setDelay`（`SwappableRng`）

## 対象の確認 ID（28 個：自動 28・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/logic/version.test.ts` | TC-0006-02 |
| `tests/logic/name.test.ts` | TC-0007-05 |
| `tests/logic/menu-model.test.ts` | TC-0010-01、TC-0010-09 |
| `e2e/menu.spec.ts` | TC-0010-02、TC-0010-03、TC-0010-04、TC-0010-05、TC-0010-06、TC-0010-07、TC-0010-08、TC-0010-10、TC-0010-11 |
| `tests/logic/message-plan.test.ts` | TC-0011-01 |
| `e2e/message.spec.ts` | TC-0011-02、TC-0011-03、TC-0011-04、TC-0011-05、TC-0011-06、TC-0011-07、TC-0011-08、TC-0011-09、TC-0011-10 |
| `e2e/error.spec.ts` | TC-0012-06、TC-0012-07、TC-0012-08、TC-0012-10 |
| `e2e/debug.spec.ts` | TC-0038-01 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0006（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
