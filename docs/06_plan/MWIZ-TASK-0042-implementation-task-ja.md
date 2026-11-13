---
id: MWIZ-TASK-0042
type: Implementation Task
title: 敵の数字・装備のマスタと補正値・保存の移行・釣り合いのテスト（仕様書 v1.21）
status: stable
version: 1.0
updated: 2026-11-13
sources:
  - MWIZ-WS-0024（v1.0）
  - MWIZ-TD-0002（v1.10）
  - MWIZ-TC-0008（v1.2）
  - MWIZ-TC-0009（v1.2）
  - MWIZ-TC-0018（v1.4）
  - MWIZ-TC-0022（v1.4）
  - MWIZ-TC-0023（v1.3）
  - MWIZ-TC-0024（v1.3）
  - MWIZ-TC-0026（v1.4）
  - MWIZ-TC-0027（v1.2）
  - MWIZ-TC-0028（v1.3）
  - MWIZ-TC-0029（v1.2）
verified: null
---

# TASK-0042 敵の数字・装備のマスタと補正値・保存の移行・釣り合いのテスト

- WS：[WS-0024](MWIZ-WS-0024-workstream-ja.md)
- ブランチ：`feat/TASK-0042-enemy-equipment`
- 実施記録：AC-0042（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0041

## やること

TD-0002 §1.9 のとおりに作る。04 で仮に当てたコードの差分（作業用の一時フォルダの `v121-draft-src.patch`）があれば当ててから始めてよい（なければ TD-0002 §1.9 から作る）。

- `src/domain/constants.ts`：`ENEMIES` を仕様書 §6.1（v1.21）の表に
- `src/domain/items.ts`：`ItemMaster` を `rarities`・`ranges` の形に、32 種を §8.2 の表に（ガードリングは R／SR、ウィンドブーツは `evasion`、ソロモンのゆびわは 3 つ）。`valueRange`・`conformItem` を §8.3 の新しい決まりに。`RARITY_MULTIPLIER`・`RARITY_BY_TIER` をなくす
- `src/domain/loot.ts`：`rollDrop` のレアリティは種類の `rarities`、補正値は `rng.int(lo, hi)`
- `src/domain/game-state.ts`：版 7・4、`remapAccessoryIds`、`migrateGameState`（版 6 以下）・`migrateSave`（版 3 以下で付け替え、版 4 を受け付ける）
- テストの道具：`tests/api/game-api.test.ts` の `storedGame`・`storedSave`、`e2e/helpers.ts` の保存の版の既定を 7・4（`GAME_SCHEMA_VERSION`・`SAVE_SCHEMA_VERSION`）に
- `tests/domain/balance.test.ts`（TC-0024-08）：基準を「weapon7［SR］+26・armor7［SR］+22・shield7［SR］+14・accessory7［SR］+21 の Lv38 ≥ 80%、同じ装備の Lv32 ≤ 20%、装備なしの Lv45 ≤ 20%、引き分け 0」に
- 新しい確認 ID：TC-0009-13（アクセの ID の付け替え）のテストを `tests/domain/game-state.test.ts` に足す
- 落ちるテストを直す（下の表）。乱数の列（`SequenceRng`）・シードで場面を作るテストは、確かめることを変えずに、列・シード・場面（敵の HP・プレイヤーの能力値・装備の値）を直す。装備の値は、新しい範囲で出る値にする（範囲の外だと読み込みの補正で値が変わる）
- E2E のシード（`e2e/helpers.ts` の `SEEDS`。とくにボスを先攻で倒す `bossWin`、ドロップの `darkKnightDropUR`・`darkKnightDropLG`・`goblinDropN` など）を、`tests/domain/loot.test.ts` の「E2E のシード」で確かめながら選び直す
- 古い値でも探す（ふりかえり ws-20・ws-23）：`+15`（さいだいHP）、`+20`（ソロモンのゆびわ）、`［SR］` のバトルアックス、`60〜78`・`78`、`speed: 30`（ボスより先に動く場面）、スライムの `12`・経験値 `4`、`schemaVersion: 6`・`3`
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.21 に合わせ、第 2 部の §21・§24 を実装に合わせる
- 依頼書の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` を入れない）。一括の置き換えは、置き換える文字があるファイルだけにかける（ふりかえり ws-23）

## 対象の確認 ID

テストケースの中身が変わったもの（v1.21 で直した）：

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/domain/constants.test.ts` | TC-0018-07 |
| `tests/domain/items.test.ts` | TC-0027-01・TC-0027-02・TC-0029-10 |
| `tests/domain/loot.test.ts` | TC-0027-03・TC-0027-08 |
| `tests/domain/battle.test.ts` | TC-0022-01・TC-0023-01・TC-0027-07 |
| `tests/domain/character.test.ts` | TC-0008-02 |
| `tests/domain/equipment.test.ts` | TC-0028-07・TC-0028-12・TC-0028-15 |
| `tests/logic/item-text.test.ts` | TC-0028-13 |
| `tests/domain/game-state.test.ts` | TC-0009-09・TC-0009-13（新しい） |
| `tests/api/game-api.test.ts` | TC-0009-01・TC-0009-10 |
| `tests/domain/balance.test.ts` | TC-0024-08 |
| `e2e/equipment.spec.ts` | TC-0028-14 |
| E2E の準備（TC-0026 の装備） | `e2e/inn.spec.ts`・`e2e/status.spec.ts`（TC-0026-04・TC-0026-06） |

04 で仮に当てて落ちた、テストのコードだけを直すもの（確かめることは変わらない）：

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/api/game-api.test.ts` | TC-0007-09・TC-0023-02・TC-0024-04・TC-0024-06・TC-0024-09・TC-0025-01・TC-0026-01・TC-0029-08・TC-0029-09・TC-0030-07（多くは保存の版の既定とテストの装備の値） |
| `tests/domain/battle.test.ts` | TC-0019-04・TC-0019-06・TC-0022-12・TC-0024-02・TC-0024-03、ID なし 2 件（「勝ったときにドロップを引き…」「ボスに勝つと…」） |
| `tests/domain/character.test.ts` | TC-0008-04 |
| `tests/domain/equipment.test.ts` | TC-0028-05 |
| `tests/domain/explore.test.ts` | TC-0025-04、ID なし 1 件（「3F で [20, 31] はスケルトン」） |
| `tests/domain/loot.test.ts` | TC-0027-05・TC-0027-06・TC-0030-01、ID なし 1 件（「E2E のシード」） |
| `tests/domain/records.test.ts` | TC-0026-02 |
| `tests/domain/game-state.test.ts` | ID なし 3 件（normalizeInventory・conformItem・toSaveData） |
| `e2e/battle.spec.ts` | TC-0022-08 |
| `e2e/effects.spec.ts` | TC-0031-04・TC-0031-11・TC-0031-12（ボスを倒すシード） |
| `e2e/sound.spec.ts` | TC-0032-11（同じ） |
| `e2e/equipment.spec.ts` | TC-0028-02・TC-0028-04・TC-0028-09・TC-0028-11（場面の装備の値） |
| `e2e/inn.spec.ts` | TC-0022-09 |

- 04 の時点（2026-11-13）で、単体 45 件（確認 ID 38 個と ID なし 7 件）、E2E 13 個のテスト（3 つの画面幅で 36 件）が落ちた。表はその全部。
- TC-0024-05・TC-0025-03（通しプレイ）は、仮に当てたコードで通った。直さずに通ることをもう一度確かめる。
- 狭い画面で、ソロモンのゆびわの補正 3 つ（装備画面のアクセの行・もちもの・入れ替え・ドロップの行）が枠からはみ出さないかを、スクリーンショットで見る（GUI-0006 v1.3）。

## 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（装備画面・もちもの・ドロップの行のソロモンのゆびわ、戦闘画面）
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0042（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
