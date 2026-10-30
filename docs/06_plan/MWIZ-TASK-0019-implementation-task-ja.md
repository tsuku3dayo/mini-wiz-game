---
id: MWIZ-TASK-0019
type: Implementation Task
title: BGM の再生エンジンと曲データ
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0009（v1.0）
  - MWIZ-TC-0034（v1.0）
  - MWIZ-TD-0005（v1.0）
verified: null
---

# TASK-0019 BGM の再生エンジンと曲データ

- WS：[WS-0009](MWIZ-WS-0009-workstream-ja.md)
- ブランチ：`feat/TASK-0019-bgm-engine`
- 実施記録：AC-0019（`docs/07_attested/MWIZ-AC-0019-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0017

## やること

- `logic/bgm-notation.ts`・`bgm-tracks.ts`（曲データ 5 曲）
- `audio/bgm.ts`（FM 合成・予約・ループ・フェード・ダッキング）

## 対象の確認 ID（7 個：自動 7・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/audio/bgm.test.ts` | TC-0034-02、TC-0034-07、TC-0034-09、TC-0034-10、TC-0034-17、TC-0034-19 |
| `tests/logic/bgm-tracks.test.ts` | TC-0034-22 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0019（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
