---
id: MWIZ-TASK-0009
type: Implementation Task
title: ダンジョンの画面
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0003（v1.0）
  - MWIZ-TC-0014（v1.0）
  - MWIZ-TC-0015（v1.0）
  - MWIZ-TC-0016（v1.0）
  - MWIZ-TC-0017（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
verified: null
---

# TASK-0009 ダンジョンの画面

- WS：[WS-0003](MWIZ-WS-0003-workstream-ja.md)
- ブランチ：`feat/TASK-0009-dungeon-screen`
- 実施記録：AC-0009（`docs/07_attested/MWIZ-AC-0009-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0007、TASK-0008

## やること

- `screens/dungeon.ts`（狭い・広い画面の並び、メニューを操作の場所に出す）
- 部品：location-label・first-person-view（`setWidth`）・auto-map（`setSize`）・move-pad・stairs-button
- `fitDungeon`（TD-0003 §6）、矢印キー（入力欄・IME 変換中のキーは捨てる）
- `logic/view-to-segments.ts`・`map-to-shapes.ts`・`describe-view.ts`・`arrival.ts`
- `__wiz.debugDungeon()`

## 対象の確認 ID（15 個：自動 14・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/dungeon.spec.ts` | TC-0014-02、TC-0014-03、TC-0014-05、TC-0014-07、TC-0015-04、TC-0016-03、TC-0016-04、TC-0016-06、TC-0017-04 |
| `tests/logic/view-to-segments.test.ts` | TC-0014-04 |
| 実機（手動） | TC-0014-08 |
| `tests/logic/map-to-shapes.test.ts` | TC-0015-03 |
| `tests/logic/arrival.test.ts` | TC-0016-05 |
| `e2e/debug.spec.ts` | TC-0038-02、TC-0038-04 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0009（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
