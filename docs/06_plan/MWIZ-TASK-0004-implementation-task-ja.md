---
id: MWIZ-TASK-0004
type: Implementation Task
title: ルールの基本（乱数・定数・状態・キャラクター）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0002（v1.0）
  - MWIZ-TC-0007（v1.0）
  - MWIZ-TC-0008（v1.0）
  - MWIZ-TC-0009（v1.0）
  - MWIZ-TC-0012（v1.0）
  - MWIZ-TD-0002（v1.0）
verified: null
---

# TASK-0004 ルールの基本（乱数・定数・状態・キャラクター）

- WS：[WS-0002](MWIZ-WS-0002-workstream-ja.md)
- ブランチ：`feat/TASK-0004-domain-basics`
- 実施記録：AC-0004（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0001

## やること

- `domain/rng.ts`・`constants.ts`・`errors.ts`・`game-state.ts`（型・`assertLocation`・移行・セーブの変換）
- `domain/character.ts`（名前・作成・経験値・やすむ）・`records.ts`（初期値・補正）
- `tests/helpers/`（`deepFreeze`・`fake-storage`・`fixtures`）

## 対象の確認 ID（6 個：自動 6・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/character.test.ts` | TC-0007-01、TC-0007-02、TC-0007-04、TC-0008-04 |
| `tests/domain/game-state.test.ts` | TC-0009-09、TC-0012-01 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0004（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
