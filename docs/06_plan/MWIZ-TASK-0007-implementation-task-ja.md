---
id: MWIZ-TASK-0007
type: Implementation Task
title: タイトル・名前入力・宿屋の画面
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0002（v1.0）
  - MWIZ-TC-0006（v1.0）
  - MWIZ-TC-0007（v1.0）
  - MWIZ-TC-0008（v1.0）
  - MWIZ-TC-0009（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
verified: null
---

# TASK-0007 タイトル・名前入力・宿屋の画面

- WS：[WS-0002](MWIZ-WS-0002-workstream-ja.md)
- ブランチ：`feat/TASK-0007-title-inn`
- 実施記録：AC-0007（`docs/07_attested/MWIZ-AC-0007-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0006

## やること

- `screens/title.ts`（メッセージ欄なし・インストール・版）
- `screens/name-entry.ts`
- `screens/inn.ts`（狭い：縦、広い：2 カラム。広い画面の実績は WS-0005 で足す）・メニュー・タイトルへ戻るの確認

## 対象の確認 ID（21 個：自動 20・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/title.spec.ts` | TC-0006-01、TC-0006-03、TC-0006-04、TC-0006-05、TC-0006-06、TC-0006-07、TC-0006-08 |
| `e2e/name-entry.spec.ts` | TC-0007-06、TC-0007-07、TC-0007-08、TC-0007-10 |
| 実機（手動） | TC-0007-11 |
| `e2e/inn.spec.ts` | TC-0008-01、TC-0008-03、TC-0009-02、TC-0009-04、TC-0009-05、TC-0009-06 |
| `e2e/boot.spec.ts` | TC-0009-07、TC-0009-08 |
| `e2e/debug.spec.ts` | TC-0038-06 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0007（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
