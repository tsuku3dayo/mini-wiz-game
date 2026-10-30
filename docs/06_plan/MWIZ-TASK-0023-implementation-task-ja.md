---
id: MWIZ-TASK-0023
type: Implementation Task
title: 速さ
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0010（v1.0）
  - MWIZ-TC-0037（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
verified: null
---

# TASK-0023 速さ

- WS：[WS-0010](MWIZ-WS-0010-workstream-ja.md)
- ブランチ：`feat/TASK-0023-performance`
- 実施記録：AC-0023（`docs/07_attested/MWIZ-AC-0023-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0022

## やること

- 生成・操作の時間の単体テスト、画面の反応・遭遇の音の E2E
- 実機での初期表示の確認

## 対象の確認 ID（7 個：自動 5・手動 2）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/api/game-api.test.ts` | TC-0037-01 |
| `e2e/dungeon.spec.ts` | TC-0037-02 |
| 実機（手動） | TC-0037-03、TC-0037-06 |
| `tests/audio/sound.test.ts` | TC-0037-04 |
| `e2e/sound.spec.ts` | TC-0037-05 |
| `tests/domain/floors.test.ts` | TC-0037-07 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0023（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
