---
id: MWIZ-TASK-0010
type: Implementation Task
title: 戦闘のルールとゲーム API
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
  - MWIZ-TD-0002（v1.0）
verified: null
---

# TASK-0010 戦闘のルールとゲーム API

- WS：[WS-0004](MWIZ-WS-0004-workstream-ja.md)
- ブランチ：`feat/TASK-0010-battle-rules`
- 実施記録：AC-0010（`docs/07_attested/MWIZ-AC-0010-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0008

## やること

- `domain/battle.ts`・`heal.ts`、遭遇判定・敵の選択（`explore.ts`）、経験値とレベルアップ・死亡
- ゲーム API：battle・heal

## 対象の確認 ID（31 個：自動 31・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/explore.test.ts` | TC-0018-01、TC-0018-02、TC-0018-03、TC-0018-04 |
| `tests/domain/constants.test.ts` | TC-0018-07 |
| `tests/domain/rng.test.ts` | TC-0018-08、TC-0018-09 |
| `tests/domain/battle.test.ts` | TC-0019-02、TC-0019-03、TC-0019-04、TC-0019-05、TC-0019-06、TC-0019-07、TC-0019-08、TC-0020-01、TC-0020-02、TC-0020-04、TC-0020-05、TC-0022-01、TC-0023-01 |
| `tests/api/game-api.test.ts` | TC-0020-06、TC-0021-02、TC-0023-02 |
| `tests/domain/heal.test.ts` | TC-0021-01、TC-0021-05 |
| `tests/domain/character.test.ts` | TC-0022-02、TC-0022-03、TC-0022-04、TC-0022-05、TC-0022-06、TC-0022-07 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0010（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
