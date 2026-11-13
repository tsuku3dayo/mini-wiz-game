---
id: MWIZ-TASK-0038
type: Implementation Task
title: かいひ（すばやさ＋たて）と、狭い画面の戦闘のボタン（枠なし・88px）
status: stable
version: 1.0
updated: 2026-11-11
sources:
  - MWIZ-WS-0020（v1.0）
  - MWIZ-TC-0019（v1.5）
  - MWIZ-TC-0022（v1.4）
  - MWIZ-TC-0026（v1.4）
  - MWIZ-TC-0028（v1.3）
  - MWIZ-TC-0035（v1.3）
  - MWIZ-TD-0002（v1.10）
  - MWIZ-TD-0003（v1.7）
  - MWIZ-TD-0004（v1.9）
verified: null
---

# TASK-0038 かいひ（すばやさ＋たて）と、狭い画面の戦闘のボタン（枠なし・88px）

- WS：[WS-0020](MWIZ-WS-0020-workstream-ja.md)
- ブランチ：`feat/TASK-0038-evasion-battle-buttons`
- 実施記録：AC-0038（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0037

## やること

- `src/domain/equipment.ts`：`effectiveStats` の `evasion` ＝ 素早さの実効値 ＋ たての補正（TD-0002 §1.8）
- `src/domain/battle.ts`：`evadeChance(defenderEvasion, attackerSpeed)` ＝ `clamp(かいひ − 速, 0, 90)`。`attack` は `evadeChance(defender.evasion, attacker.speed)`。敵の `Combatant` は `evasion: その敵の speed`
- `src/api/game-view.ts`：`base.evasion` ＝ 素早さの基礎値、`bonus.evasion` ＝ 素早さの補正 ＋ たての補正
- `src/logic/stat-diff.ts`：`statDiff` で、`speed` を上げる個体は `evasion` にも同じ値を足し引きする
- `src/ui/components/status-panel.ts`：かいひ の行に ` (+n)`（ほかの能力と同じ）
- `src/ui/screens/battle.ts`・`style.css`：狭い画面は `commandButtons` を `gameWindow`（コマンド）で包まず、`.battle-command-buttons` の箱に置く。ボタンの高さ 88px。広い画面はいまのまま
- テスト：下の表。かいひ の値（いままでは 0 やたての値）・戦闘の「コマンド」の見出しに頼っている単体・E2E のテストを探して直す（ふりかえり ws-19 の T：`かいひ`・`evasion`・`battle-command`・`コマンド` で grep する）
- スクリーンショット：375 × 667・414 × 715・1280 × 800 で、戦闘（ふつう・MP 2・ボス）・宿屋（たて あり）・装備画面（たて・ウィンドブーツの候補）。戦闘画面の高さを測り、TD-0004 の仮の値（634px）と比べる
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.16 に合わせ、第 2 部を実装に合わせる
- 依頼書の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` を入れない）

## 対象の確認 ID（11 個：直す 11）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/battle.test.ts` | TC-0019-05・08・16 |
| `tests/domain/equipment.test.ts` | TC-0028-15 |
| `e2e/battle.spec.ts` | TC-0019-01・14 |
| `e2e/inn.spec.ts` | TC-0022-09・TC-0026-06 |
| `e2e/status.spec.ts` | TC-0026-04 |
| `e2e/equipment.spec.ts` | TC-0028-02 |
| `e2e/layout.spec.ts` | TC-0035-13 |

- TC-0019-15（ボタンの操作）・TC-0024-08（釣り合い）・TC-0035-02〜04・12（はみ出し）・TC-0036-10（読み上げの検査）は、テストの名前・中身を変えずに通ることを確かめる。

## 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0038（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
