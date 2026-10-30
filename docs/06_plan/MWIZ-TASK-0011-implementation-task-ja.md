---
id: MWIZ-TASK-0011
type: Implementation Task
title: 戦闘の画面
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0004（v1.0）
  - MWIZ-TC-0018（v1.0）
  - MWIZ-TC-0019（v1.0）
  - MWIZ-TC-0020（v1.0）
  - MWIZ-TC-0021（v1.0）
  - MWIZ-TC-0022（v1.0）
  - MWIZ-TC-0023（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
verified: null
---

# TASK-0011 戦闘の画面

- WS：[WS-0004](MWIZ-WS-0004-workstream-ja.md)
- ブランチ：`feat/TASK-0011-battle-screen`
- 実施記録：AC-0011（`docs/07_attested/MWIZ-AC-0011-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0009、TASK-0010

## やること

- `screens/battle.ts`（狭い：敵 → メッセージ欄 → ステータス → コマンド、広い：下を 2 カラム）
- 敵の名前（絵は WS-0008）、ダメージの点滅、体力わずかの枠（`low-hp-frame`・`logic/low-hp.ts`）
- 遭遇でメッセージ欄を消す、遷移の保留

## 対象の確認 ID（16 個：自動 16・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/logic/arrival.test.ts` | TC-0018-05 |
| `e2e/battle.spec.ts` | TC-0018-06、TC-0019-01、TC-0019-09、TC-0019-11、TC-0019-13、TC-0020-03、TC-0022-08、TC-0022-10、TC-0023-03 |
| `tests/logic/low-hp.test.ts` | TC-0019-10、TC-0019-12 |
| `e2e/menu.spec.ts` | TC-0021-03、TC-0021-04 |
| `e2e/inn.spec.ts` | TC-0022-09 |
| `e2e/debug.spec.ts` | TC-0038-05 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0011（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
