---
id: MWIZ-TASK-0021
type: Implementation Task
title: 画面の大きさとタッチ（全画面の通し）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0010（v1.0）
  - MWIZ-TC-0035（v1.0）
  - MWIZ-TD-0003（v1.0）
verified: null
---

# TASK-0021 画面の大きさとタッチ（全画面の通し）

- WS：[WS-0010](MWIZ-WS-0010-workstream-ja.md)
- ブランチ：`feat/TASK-0021-layout`
- 実施記録：AC-0021（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0020、TASK-0018

## やること

- `e2e/layout.spec.ts`：全画面の大きさ（pixel7・small・desktop・414×715・1366×657）、ボタン・メニューの行の大きさ、タップだけで通しプレイ
- 見つかった食い違いを直す

## 対象の確認 ID（12 個：自動 8・手動 4）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/layout.spec.ts` | TC-0035-01、TC-0035-02、TC-0035-03、TC-0035-04、TC-0035-06、TC-0035-09、TC-0035-10、TC-0035-12 |
| 実機（手動） | TC-0035-05、TC-0035-07、TC-0035-08、TC-0035-11 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0021（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
