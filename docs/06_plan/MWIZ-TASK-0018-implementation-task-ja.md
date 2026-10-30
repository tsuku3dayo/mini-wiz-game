---
id: MWIZ-TASK-0018
type: Implementation Task
title: 敵の絵
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0008（v1.0）
  - MWIZ-TC-0001（v1.0）
  - MWIZ-TC-0003（v1.0）
  - MWIZ-TC-0033（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0005（v1.2）
verified: null
---

# TASK-0018 敵の絵

- WS：[WS-0008](MWIZ-WS-0008-workstream-ja.md)
- ブランチ：`feat/TASK-0018-enemy-images`
- 実施記録：AC-0018（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0011

## やること

- `docs/requests/monster/monster_*_pixel256.png` を `public/enemies/<種類>.png` に置く
- `components/enemy-image.ts`・`logic/enemy-image.ts`（256px、読めなければ消す）
- `tests/assets/enemy-images.test.ts`、`check-dist` で 6 枚を確かめる

## 対象の確認 ID（10 個：自動 9・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/pwa.spec.ts` | TC-0001-03、TC-0001-04、TC-0003-01、TC-0003-02 |
| 実機（手動） | TC-0003-03 |
| `e2e/battle.spec.ts` | TC-0033-01、TC-0033-02、TC-0033-03、TC-0033-04 |
| `tests/assets/enemy-images.test.ts` | TC-0033-05 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0018（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
