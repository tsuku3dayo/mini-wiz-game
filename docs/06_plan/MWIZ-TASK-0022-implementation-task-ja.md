---
id: MWIZ-TASK-0022
type: Implementation Task
title: キーボードと読み上げ
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0010（v1.0）
  - MWIZ-TC-0036（v1.0）
  - MWIZ-TD-0003（v1.0）
verified: null
---

# TASK-0022 キーボードと読み上げ

- WS：[WS-0010](MWIZ-WS-0010-workstream-ja.md)
- ブランチ：`feat/TASK-0022-a11y`
- 実施記録：AC-0022（`docs/07_attested/MWIZ-AC-0022-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0021

## やること

- `e2e/a11y.spec.ts`（axe-core）、キーボードだけの通しプレイ、フォーカスの閉じ込めと戻し先
- 見つかった違反を直す

## 対象の確認 ID（10 個：自動 9・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/a11y.spec.ts` | TC-0036-01、TC-0036-02、TC-0036-05、TC-0036-06、TC-0036-10 |
| `e2e/menu.spec.ts` | TC-0036-03、TC-0036-04 |
| `tests/logic/describe-view.test.ts` | TC-0036-07 |
| `e2e/dungeon.spec.ts` | TC-0036-08 |
| 実機（手動） | TC-0036-09 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0022（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
