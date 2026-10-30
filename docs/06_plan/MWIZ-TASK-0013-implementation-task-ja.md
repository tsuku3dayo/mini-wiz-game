---
id: MWIZ-TASK-0013
type: Implementation Task
title: 実績とステータス画面
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0005（v1.0）
  - MWIZ-TC-0026（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
verified: null
---

# TASK-0013 実績とステータス画面

- WS：[WS-0005](MWIZ-WS-0005-workstream-ja.md)
- ブランチ：`feat/TASK-0013-records-status`
- 実施記録：AC-0013（`docs/07_attested/MWIZ-AC-0013-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0012

## やること

- 実績の数え方（`records.ts`）
- `components/status-screen.ts`（`recordsWindow`）、狭い画面のステータス画面、広い画面の宿屋の実績

## 対象の確認 ID（7 個：自動 7・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/api/game-api.test.ts` | TC-0026-01 |
| `tests/domain/records.test.ts` | TC-0026-02、TC-0026-03 |
| `e2e/status.spec.ts` | TC-0026-04、TC-0026-05、TC-0026-07 |
| `e2e/inn.spec.ts` | TC-0026-06 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0013（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
