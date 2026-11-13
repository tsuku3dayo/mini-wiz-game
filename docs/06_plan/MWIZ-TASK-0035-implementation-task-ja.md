---
id: MWIZ-TASK-0035
type: Implementation Task
title: ルール：レベルアップは やすむ だけ・回避の式・たての かいひ・オークロード
status: stable
version: 1.0
updated: 2026-11-11
sources:
  - MWIZ-WS-0019（v1.0）
  - MWIZ-TC-0008（v1.2）
  - MWIZ-TC-0018（v1.5）
  - MWIZ-TC-0019（v1.5）
  - MWIZ-TC-0022（v1.4）
  - MWIZ-TC-0024（v1.3）
  - MWIZ-TC-0026（v1.4）
  - MWIZ-TC-0027（v1.2）
  - MWIZ-TC-0028（v1.3）
  - MWIZ-TD-0002（v1.11）
  - MWIZ-TD-0004（v1.9）
verified: null
---

# TASK-0035 ルール：レベルアップは やすむ だけ・回避の式・たての かいひ・オークロード

- WS：[WS-0019](MWIZ-WS-0019-workstream-ja.md)
- ブランチ：`feat/TASK-0035-rules-v114`
- 実施記録：AC-0035（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0034（WS-0018）

## やること

- `src/domain/constants.ts`：`EVASION = { min: 0, max: 90 }`、`ENEMIES.orc.name` を「オークロード」に（TD-0002 §1.7）
- `src/domain/items.ts`・`src/api/types.ts`：`StatKey` に `'evasion'`、たて 8 種の `stats` を `['evasion']` に
- `src/domain/equipment.ts`：`equipmentBonus`・`effectiveStats` に evasion（基礎値 0）
- `src/domain/battle.ts`：`evadeChance(防御側の速, 攻撃側の速, 防御側のかいひ)`、`Combatant` に evasion、敵は 0。勝利は `gainExp` だけ（成長の乱数を引かない）
- `src/domain/character.ts`：`applyExp` を `gainExp`・`levelUp` に分ける。`rest(state, rng)`（全回復 → `levelUp`）
- `src/api/game-api.ts`：`rest` に rng を渡す。`src/api/game-view.ts`：`expToNext = max(0, …)`、`character.evasion`
- `src/logic/item-text.ts`：`STAT_NAMES.evasion = 'かいひ'`、`STAT_ORDER` に かいひ。`src/logic/stat-diff.ts` が 6 つの能力を扱うこと
- `src/ui/components/status-panel.ts`・`status-screen.ts`：かいひ の行（` (+n)` なし）、EXP の「（やどで レベルアップ）」。`equipment-panel` の のうりょく 6 行
- `tests/helpers/autoplayer.ts`：宿屋に戻ったら やすむ（レベルが上がるように）。通しプレイ（TC-0024-05）が時間内に終わること
- `tests/domain/balance.test.ts`：装備ありを Lv11 に（TC-0024-08）
- テスト：下の表。既存のテストで、レベルアップや回避の乱数の列・敵の名前「オーク」に頼っているものを直す（同じシードでも結果が変わる。E2E の `SEEDS` も見直す）
- スクリーンショット：375 × 667 と 1280 × 800 で、宿屋（かいひ の行・やどで レベルアップ）・装備画面（のうりょく 6 行）を見る。375 × 667 の装備画面が 1 画面に収まるかを測る
- `docs/reproduction-specification.md`：ここでは直さない（TASK-0037 でまとめて直す）

## 対象の確認 ID（25 個：新しく 6・直す 19）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/character.test.ts` | TC-0008-06（新しく）・TC-0022-03・04・05・07 |
| `tests/domain/battle.test.ts` | TC-0019-05・08・16（新しく）・TC-0022-01・12（新しく）・TC-0024-02・03・TC-0027-07 |
| `tests/domain/loot.test.ts` | TC-0027-08 |
| `tests/domain/equipment.test.ts` | TC-0028-15（新しく） |
| `tests/domain/explore.test.ts`・`constants.test.ts` | TC-0018-04・07 |
| `tests/domain/balance.test.ts` | TC-0024-08 |
| `tests/api/playthrough.test.ts` | TC-0024-05 |
| `e2e/inn.spec.ts` | TC-0008-07（新しく）・TC-0022-09・11（新しく）・TC-0026-06 |
| `e2e/status.spec.ts` | TC-0026-04 |
| `e2e/equipment.spec.ts` | TC-0028-02 |

## 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0035（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
