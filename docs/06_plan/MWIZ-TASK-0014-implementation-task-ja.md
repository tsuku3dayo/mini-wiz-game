---
id: MWIZ-TASK-0014
type: Implementation Task
title: 装備のルールとゲーム API
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0006（v1.0）
  - MWIZ-TC-0008（v1.0）
  - MWIZ-TC-0011（v1.0）
  - MWIZ-TC-0012（v1.0）
  - MWIZ-TC-0022（v1.0）
  - MWIZ-TC-0023（v1.0）
  - MWIZ-TC-0024（v1.0）
  - MWIZ-TC-0026（v1.0）
  - MWIZ-TC-0027（v1.0）
  - MWIZ-TC-0028（v1.0）
  - MWIZ-TC-0029（v1.0）
  - MWIZ-TC-0030（v1.0）
  - MWIZ-TD-0002（v1.0）
verified: null
---

# TASK-0014 装備のルールとゲーム API

- WS：[WS-0006](MWIZ-WS-0006-workstream-ja.md)
- ブランチ：`feat/TASK-0014-items-rules`
- 実施記録：AC-0014（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0010

## やること

- `domain/items.ts`・`loot.ts`・`equipment.ts`（ドロップ・所持品・付け替え・捨てる・入れ替え・実効値）
- ゲーム API：equip・unequip・discard・lootTake・lootAbandon

## 対象の確認 ID（34 個：自動 34・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/character.test.ts` | TC-0008-02 |
| `e2e/message.spec.ts` | TC-0011-09 |
| `tests/api/game-api.test.ts` | TC-0012-02、TC-0012-04、TC-0024-04、TC-0024-06、TC-0028-06、TC-0029-08、TC-0029-09、TC-0029-11、TC-0030-02、TC-0030-07 |
| `e2e/inn.spec.ts` | TC-0022-09 |
| `tests/domain/battle.test.ts` | TC-0023-01、TC-0024-03、TC-0027-07 |
| `tests/domain/balance.test.ts` | TC-0024-08 |
| `e2e/status.spec.ts` | TC-0026-04 |
| `tests/domain/items.test.ts` | TC-0027-01、TC-0027-02、TC-0029-10 |
| `tests/domain/loot.test.ts` | TC-0027-03、TC-0027-04、TC-0027-05、TC-0027-06、TC-0027-08、TC-0027-10、TC-0030-01、TC-0030-05 |
| `tests/domain/equipment.test.ts` | TC-0028-03、TC-0028-05、TC-0028-07、TC-0028-12、TC-0029-07 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0014（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
