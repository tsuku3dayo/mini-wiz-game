---
id: MWIZ-TASK-0016
type: Implementation Task
title: 演出
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0007（v1.0）
  - MWIZ-TC-0031（v1.0）
  - MWIZ-TD-0003（v1.0）
verified: null
---

# TASK-0016 演出

- WS：[WS-0007](MWIZ-WS-0007-workstream-ja.md)
- ブランチ：`feat/TASK-0016-effects`
- 実施記録：AC-0016（`docs/07_attested/MWIZ-AC-0016-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0015

## やること

- `components/effect-layer.ts`、levelUp・rareDrop・bossAppear・bossDefeat・clear
- 動きを減らす設定のときのまとめ方（`logic/message-plan.ts`）

## 対象の確認 ID（11 個：自動 11・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/effects.spec.ts` | TC-0031-01、TC-0031-02、TC-0031-03、TC-0031-04、TC-0031-05、TC-0031-07、TC-0031-08、TC-0031-09、TC-0031-11 |
| `tests/logic/message-plan.test.ts` | TC-0031-06、TC-0031-10 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0016（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
