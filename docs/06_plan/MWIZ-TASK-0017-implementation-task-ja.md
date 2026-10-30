---
id: MWIZ-TASK-0017
type: Implementation Task
title: 効果音と音の設定
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0007（v1.0）
  - MWIZ-TC-0006（v1.0）
  - MWIZ-TC-0010（v1.0）
  - MWIZ-TC-0026（v1.0）
  - MWIZ-TC-0032（v1.0）
  - MWIZ-TD-0005（v1.1）
verified: null
---

# TASK-0017 効果音と音の設定

- WS：[WS-0007](MWIZ-WS-0007-workstream-ja.md)
- ブランチ：`feat/TASK-0017-sound`
- 実施記録：AC-0017（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0016

## やること

- `audio/sound.ts`（8 種の合成・自動再生の制限への対処）・`sound-setting.ts`
- タイトル・メニューの「おと」、`app:sound` イベント
- `tests/helpers/fake-audio.ts`

## 対象の確認 ID（23 個：自動 22・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/title.spec.ts` | TC-0006-01 |
| `e2e/menu.spec.ts` | TC-0010-06、TC-0010-11 |
| `e2e/inn.spec.ts` | TC-0026-06 |
| `tests/audio/sound-setting.test.ts` | TC-0032-01、TC-0032-06 |
| `e2e/sound.spec.ts` | TC-0032-02、TC-0032-03、TC-0032-04、TC-0032-05、TC-0032-07、TC-0032-08、TC-0032-10、TC-0032-11、TC-0032-13、TC-0032-14、TC-0032-16 |
| `tests/audio/sound.test.ts` | TC-0032-09、TC-0032-12、TC-0032-15、TC-0032-17、TC-0032-19 |
| 実機（手動） | TC-0032-20 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0017（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
