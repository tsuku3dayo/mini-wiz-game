---
id: MWIZ-AC-0035
type: Attested Computation
title: ルール（やすむでレベルアップ・回避の式・たての かいひ・オークロード）の実施記録
status: draft
version: 1.0
updated: 2026-11-11
sources:
  - MWIZ-TASK-0035（v1.0）
  - MWIZ-TC-0008（v1.1）
  - MWIZ-TC-0018（v1.1）
  - MWIZ-TC-0019（v1.2）
  - MWIZ-TC-0022（v1.2）
  - MWIZ-TC-0024（v1.1）
  - MWIZ-TC-0026（v1.1）
  - MWIZ-TC-0027（v1.1）
  - MWIZ-TC-0028（v1.1）
  - MWIZ-TC-0031（v1.2）
  - MWIZ-TC-0032（v1.3）
  - MWIZ-TC-0034（v1.5）
  - MWIZ-GUI-0003（v1.3）
verified: null
---

# AC-0035 ルール（やすむでレベルアップ・回避の式・たての かいひ・オークロード）の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0035](../06_plan/MWIZ-TASK-0035-implementation-task-ja.md) ルール：レベルアップは やすむ だけ・回避の式・たての かいひ・オークロード（変更の依頼 `docs/requests/2026-11-11-spec-1.14-slots-levelup-evade.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0035-rules-v114` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `src/domain/constants.ts`：`EVASION = { min: 0, max: 90 }`（`base`・`perSpeed` をなくした）、`ENEMIES.orc.name` を「オークロード」に
- `src/domain/items.ts`・`src/api/types.ts`：`StatKey` に `'evasion'`。たて 8 種の `stats` を `['evasion']` に。`statName('evasion')` は「かいひ」
- `src/domain/equipment.ts`：`equipmentBonus` は 6 つの能力。`effectiveStats` の `evasion` は 0 ＋ たての補正
- `src/domain/battle.ts`：`evadeChance(受ける側の速, 攻撃側の速, 受ける側のかいひ)` = `clamp(差 + かいひ, 0, 90)`。`Combatant` に `evasion`（敵は 0）。勝利は `gainExp` だけ（成長の乱数を引かない）
- `src/domain/character.ts`：`applyExp` を `gainExp`（経験値を足すだけ）と `levelUp(state, rng)` に分けた。`rest(state, rng)` は全回復 → `levelUp`
- `src/api/game-api.ts`：`rest` に乱数を渡す。`src/api/game-view.ts`：`expToNext = max(0, …)`、`character.evasion`・`base.evasion`（0）
- `src/logic/item-text.ts`：`STAT_NAMES.evasion`、`STAT_ORDER` に かいひ（こうげき → ぼうぎょ → すばやさ → かいひ → さいだいHP → さいだいMP）
- `src/ui/components/status-panel.ts`：かいひ の行（` (+n)` なし）、EXP の「（やどで レベルアップ）」。ステータス画面は同じ部品を使う。`equipment-panel.ts`：のうりょく 6 行
- `src/ui/style.css`：狭い画面の StatusPanel(full) の内側の余白を 上 8px・下 6px に（下の「設計を直したこと」）
- `tests/helpers/autoplayer.ts`：経験値がたまったら（`expToNext` 0）宿屋へ帰って やすむ
- `e2e/helpers.ts`：E2E のシードを見直した（下）。宿屋で やすむ と 3 回レベルアップする状態 `innLevelUp()` を足した
- テスト：下の表の確認 ID。ほかに、勝利でのレベルアップ・回避の乱数の列・敵の名前「オーク」に頼っていた単体・E2E のテストを直した

E2E のシード（`tests/domain/loot.test.ts` で確かめている）：

| 名前 | 前 | 今 | 理由 |
| --- | --- | --- | --- |
| `darkKnightDropLG` | 66 | 12 | 勝利で成長の乱数（5 個）を引かなくなり、ドロップの乱数がずれた |
| `darkKnightDropUR` | 2 | 5 | 同じ。行は 7 行 → 5 行（levelUp の行がなくなった） |
| `darkKnightDropSR` | 5 | 4 | 同じ |
| `slimeDropR`・`goblinDropN`・`bossWin`・`hits` | 131・5・1・1 | 同じ | 結果が変わらなかった（`bossWin` は 11 行 → 5 行） |

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0008-06 | 単体 | OK |
| TC-0008-07 | E2E（3 端末） | OK |
| TC-0018-04・07 | 単体 | OK |
| TC-0019-05・08・16 | 単体 | OK |
| TC-0022-01・03・04・05・07・12 | 単体 | OK |
| TC-0022-09・11 | E2E（3 端末。ステータス画面は狭い画面だけ） | OK |
| TC-0024-02・03 | 単体 | OK |
| TC-0024-05 | 単体（通しプレイ） | OK（自動プレイヤーは Lv9 以上でボスを倒した。時間内） |
| TC-0024-08 | 単体（模擬戦） | OK（装備あり Lv11 は 80% 以上、装備なし Lv12 は 20% 以下） |
| TC-0026-04・06 | E2E（04 は狭い画面、06 は `desktop`） | OK |
| TC-0027-07・08 | 単体 | OK |
| TC-0028-02 | E2E（3 端末） | OK |
| TC-0028-15 | 単体 | OK |

設計・テストケースを直したこと：

- **GUI-0003 v1.2（再承認 2026-11-11T14:31:36+09:00）**：かいひ の行が増え、414 × 715 で宿屋の「メニュー」を開くと 1px はみ出した（TC-0035-04 が落ちた。メニューを開かなければちょうど収まっていた）。オーナーの決定（2026-11-11）で、狭い画面の StatusPanel(full) の内側の余白を 上 12→8px・下 8→6px に詰めた（戦闘の 1 行のステータスと同じ詰め方）。直したあと TC-0035-04 は 3 端末で通った。
- **TC-0022 v1.2・TC-0031 v1.2・TC-0032 v1.3・TC-0034 v1.5**：仕様書 v1.14 で勝利ではレベルが上がらなくなったのに、「戦闘でレベルアップする」前提の書き方が残っていた（04〜06 で見落とした）。TC-0022-10（勝っても Lv は変わらない）、TC-0031-01・07・08・09 と TC-0032-11・13・16 の手順（レベルアップは経験値のたまった宿屋の やすむ で出す）、TC-0034-18 の手動の手順を直した。特に TC-0031-07 は「1 つの応答に bossDefeat・levelUp・rareDrop」がもう起こらないので、ボス撃破（bossDefeat・rareDrop・clear）と やすむ（levelUp × 3）の 2 つの場面で確かめる形にした。
- TC-0019-06 は、敵の かいひ が 0 になり「プレイヤーが先に攻撃して敵が回避する」場面が作れなくなったので、敵の方が速い場面（敵が先）で回避を作り、次のターンの最初の乱数が敵の攻撃の回避であることを確かめる形にした（テストケースの文は変えていない）。
- 根拠に書いた版の表記だけを、31 の文書で新しい版に直した（中身は変えていない）。

あわせて確かめたこと：

- 画面：宿屋（かいひ の行・「（やどで レベルアップ）」）・宿屋のメニュー・ステータス画面・装備画面（のうりょく 6 行、たて）を、375 × 667 と 1280 × 800 で撮って見た（作業用の一時フォルダ）。**375 × 667 の装備画面とステータス画面は 1 画面に収まった**（GUI-0006・GUI-0003 のとおり）。375 × 667 の宿屋は 27px（メニューを開くと 43px）縦にはみ出してスクロールする。宿屋が 1 画面に収まる決まりは 414 × 715 だけ（TC-0035-04）なので、変えていない。PC はどの画面もはみ出さない。
- 宿屋のメニューの並びはまだ v1.13 のまま（TASK-0036 で直す）。

手元で通したもの（2026-11-11）：

- `npm run lint`：エラー 0。単体 189 件。build、check:dist OK
- `npm run check:docs`：GUI-0003 の承認を記入したあと、エラー 0・注意 2（AC-0024 の仕様書の版の表記＝承認済みの記録なので変えない、テストのコードがまだない確認 ID 7 個＝TASK-0036・0037 の分）
- `npm run test:e2e`：全部を 2 回動かし、2 回目に落ちた 4 件（メッセージ欄が折り返しで古い行を消すのに、行の数で確かめていた）を直して、そのファイル（effects・inn・sound）をもう一度動かした（119 件通った）。そのあと全部をもう一度動かし、493 件通った・44 件はその端末の対象外で飛ばした（7.3 分）

## 3. 確認できなかったこと

- 手動の確認は WS-0019 の終わりにまとめて行う（このタスクの手動の確認 ID はない）。

## 4. 後片付け

- 測るためのプログラム（シード探し・画面の高さの測定・撮影）と写真は、プロジェクトの外の作業用の一時フォルダに置いた。

## 5. 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [x] AC-0035（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
