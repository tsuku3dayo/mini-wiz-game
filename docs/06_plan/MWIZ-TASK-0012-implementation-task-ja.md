---
id: MWIZ-TASK-0012
type: Implementation Task
title: ボス・ゲームクリア・周回
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0005（v1.0）
  - MWIZ-TC-0024（v1.0）
  - MWIZ-TC-0025（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
verified: null
---

# TASK-0012 ボス・ゲームクリア・周回

- WS：[WS-0005](MWIZ-WS-0005-workstream-ja.md)
- ブランチ：`feat/TASK-0012-boss-clear`
- 実施記録：AC-0012（`docs/07_attested/MWIZ-AC-0012-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0011

## やること

- ボスの配置・撃破・クリア時の自動セーブ（まとめて書く）・周回（`continueToInn`）
- `screens/clear.ts`
- `tests/helpers/autoplayer.ts` と通しプレイ（`playthrough.test.ts`）

## 対象の確認 ID（12 個：自動 12・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/explore.test.ts` | TC-0024-01、TC-0025-04 |
| `tests/domain/battle.test.ts` | TC-0024-02、TC-0024-03 |
| `tests/api/game-api.test.ts` | TC-0024-04、TC-0024-06、TC-0025-01 |
| `tests/api/playthrough.test.ts` | TC-0024-05、TC-0025-03 |
| `e2e/clear.spec.ts` | TC-0024-07、TC-0025-02 |
| `tests/domain/balance.test.ts` | TC-0024-08 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0012（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
