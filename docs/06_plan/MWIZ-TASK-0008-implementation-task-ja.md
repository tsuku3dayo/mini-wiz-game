---
id: MWIZ-TASK-0008
type: Implementation Task
title: ダンジョンのルールとゲーム API
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0003（v1.0）
  - MWIZ-TC-0013（v1.0）
  - MWIZ-TC-0014（v1.0）
  - MWIZ-TC-0015（v1.0）
  - MWIZ-TC-0016（v1.0）
  - MWIZ-TC-0017（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0002（v1.0）
verified: null
---

# TASK-0008 ダンジョンのルールとゲーム API

- WS：[WS-0003](MWIZ-WS-0003-workstream-ja.md)
- ブランチ：`feat/TASK-0008-dungeon-rules`
- 実施記録：AC-0008（`docs/07_attested/MWIZ-AC-0008-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0005

## やること

- `domain/dungeon.ts`・`floors.ts`・`explore.ts`・`view.ts`
- ゲーム API：enterDungeon・move・stairs・returnToInn・`debugDungeon`

## 対象の確認 ID（18 個：自動 18・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/explore.test.ts` | TC-0013-01、TC-0013-02、TC-0014-01、TC-0015-01、TC-0016-01、TC-0016-02、TC-0017-01、TC-0017-02、TC-0017-03 |
| `tests/api/game-api.test.ts` | TC-0013-03、TC-0015-05、TC-0038-03 |
| `tests/domain/floors.test.ts` | TC-0013-04、TC-0013-05、TC-0013-06、TC-0013-07 |
| `tests/domain/view.test.ts` | TC-0014-06、TC-0015-02 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0008（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
