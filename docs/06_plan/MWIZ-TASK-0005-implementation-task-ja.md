---
id: MWIZ-TASK-0005
type: Implementation Task
title: 保存とゲーム API の骨組み
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0002（v1.0）
  - MWIZ-TC-0007（v1.0）
  - MWIZ-TC-0009（v1.0）
  - MWIZ-TC-0012（v1.0）
  - MWIZ-TD-0002（v1.0）
verified: null
---

# TASK-0005 保存とゲーム API の骨組み

- WS：[WS-0002](MWIZ-WS-0002-workstream-ja.md)
- ブランチ：`feat/TASK-0005-storage-api`
- 実施記録：AC-0005（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0004

## やること

- `platform/storage.ts`（`writeAll` でまとめて書き、失敗したら戻す）・`math-rng.ts`・`clock.ts`
- `api/repository.ts`・`game-view.ts`・`validate.ts`・`types.ts`
- `api/game-api.ts` の `run` と、getGame・getSave・startGame・quitGame・rest・save・load

## 対象の確認 ID（6 個：自動 6・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/api/game-api.test.ts` | TC-0007-03、TC-0007-09、TC-0009-01、TC-0009-03、TC-0009-10、TC-0012-09 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0005（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
