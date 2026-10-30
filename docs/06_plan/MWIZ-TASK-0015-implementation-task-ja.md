---
id: MWIZ-TASK-0015
type: Implementation Task
title: そうび・もちもの・入れ替えの画面
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0006（v1.0）
  - MWIZ-TC-0004（v1.0）
  - MWIZ-TC-0006（v1.0）
  - MWIZ-TC-0009（v1.0）
  - MWIZ-TC-0012（v1.0）
  - MWIZ-TC-0028（v1.0）
  - MWIZ-TC-0029（v1.0）
  - MWIZ-TC-0030（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
verified: null
---

# TASK-0015 そうび・もちもの・入れ替えの画面

- WS：[WS-0006](MWIZ-WS-0006-workstream-ja.md)
- ブランチ：`feat/TASK-0015-items-screens`
- 実施記録：AC-0015（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0013、TASK-0014

## やること

- 部品：equipment-panel・inventory-panel・item-list（`maxHeight`）・item-label
- `screens/swap.ts`、`fitItemList`、メッセージ欄を置かない画面の結果の文をキューに入れる
- `logic/item-text.ts`・`sort-items.ts`・`stat-diff.ts`

## 対象の確認 ID（25 個：自動 24・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/pwa.spec.ts` | TC-0004-02 |
| 実機（手動） | TC-0004-04 |
| `e2e/title.spec.ts` | TC-0006-07 |
| `e2e/boot.spec.ts` | TC-0009-07、TC-0009-08 |
| `e2e/error.spec.ts` | TC-0012-08 |
| `tests/logic/stat-diff.test.ts` | TC-0028-01、TC-0028-10 |
| `e2e/equipment.spec.ts` | TC-0028-02、TC-0028-04、TC-0028-09、TC-0028-11、TC-0028-14 |
| `tests/logic/sort-items.test.ts` | TC-0028-08、TC-0029-02 |
| `tests/logic/item-text.test.ts` | TC-0028-13 |
| `e2e/inventory.spec.ts` | TC-0029-01、TC-0029-03、TC-0029-04、TC-0029-05、TC-0029-06 |
| `e2e/swap.spec.ts` | TC-0030-03、TC-0030-04、TC-0030-06 |
| `e2e/debug.spec.ts` | TC-0038-07 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0015（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
