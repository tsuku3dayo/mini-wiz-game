---
id: MWIZ-TASK-0020
type: Implementation Task
title: BGM の監督（場面と曲）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0009（v1.0）
  - MWIZ-TC-0032（v1.0）
  - MWIZ-TC-0034（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0005（v1.0）
verified: null
---

# TASK-0020 BGM の監督（場面と曲）

- WS：[WS-0009](MWIZ-WS-0009-workstream-ja.md)
- ブランチ：`feat/TASK-0020-bgm-director`
- 実施記録：AC-0020（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0019

## やること

- `logic/bgm-scene.ts`・`audio/bgm-director.ts`、`app:bgm` イベント

## 対象の確認 ID（18 個：自動 14・手動 4）

| 置き場所 | 確認 ID |
| --- | --- |
| 実機（手動） | TC-0032-18、TC-0034-04、TC-0034-18、TC-0034-23 |
| `tests/logic/bgm-scene.test.ts` | TC-0034-01、TC-0034-05、TC-0034-12、TC-0034-14 |
| `e2e/sound.spec.ts` | TC-0034-03、TC-0034-06、TC-0034-08、TC-0034-11、TC-0034-13、TC-0034-15、TC-0034-16、TC-0034-20、TC-0034-21 |
| `e2e/debug.spec.ts` | TC-0038-08 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0020（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
