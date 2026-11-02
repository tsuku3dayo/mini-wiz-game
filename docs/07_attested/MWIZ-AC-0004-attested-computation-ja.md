---
id: MWIZ-AC-0004
type: Attested Computation
title: ルールの基本（乱数・定数・状態・キャラクター） の実施記録
status: stable
version: 1.0
updated: 2026-11-02
sources:
  - MWIZ-TASK-0004（v1.0）
  - MWIZ-TC-0007（v1.0）
  - MWIZ-TC-0008（v1.0）
  - MWIZ-TC-0009（v1.0）
  - MWIZ-TC-0012（v1.0）
  - MWIZ-TD-0002（v1.5）
verified: { by: "tsuku3dayo", at: "2026-11-02T11:55:40+09:00" }
---

# AC-0004 ルールの基本（乱数・定数・状態・キャラクター） の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0004](../06_plan/MWIZ-TASK-0004-implementation-task-ja.md) ルールの基本（乱数・定数・状態・キャラクター） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0004-domain-basics` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの（すべて `src/domain/`。画面は変えていない）：

- `rng.ts`（`Rng`・`BaseRng`・`SeededRng`（mulberry32）・`SequenceRng`・`SwappableRng`）、`constants.ts`（敵 6 種・出現表・初期値・成長など）、`errors.ts`（`DomainError` と派生 6 つ）
- `game-state.ts`（型、`assertLocation`、`migrateGameState`・`normalizeInventory`、`toSaveData`・`fromSaveData`・`migrateSave`・`pickCharacter`）
- `character.ts`（`normalizeName`・`validateName`・`isValidName`・`createCharacter`・`expForLevel`・`applyExp`・`rest`・`continueToInn`）、`records.ts`（初期値・補正・数え方）
- **前倒しで作ったもの**：`items.ts`（装備のマスタ 32 種・レアリティ・`valueRange`・`conformItem`）、`equipment.ts`（`equipmentBonus`・`effectiveStats`）、`loot.ts`（`emptyInventory`）。「やすむ」は装備込みの最大値まで回復し、読み込み時の補正は装備のマスタを使うため。付け替え・ドロップ・入れ替えは予定どおり TASK-0014 で作る（TD-0002 v1.1 §5）
- テストの道具：`tests/helpers/deep-freeze.ts`・`fixtures.ts`（場所ごとの状態）・`maps.ts`（`openMap`）

設計の直し：

- 仕様書に決まりのなかった「装備中の枠に部位の合わない個体があったとき」を、形の違う値として捨てることに決め、TD-0002 に書いた（v1.1 §1.4）。作る順の前倒しも TD-0002 §5 に書いた。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0007-01 | 単体（`tests/domain/character.test.ts`） | OK。`" ゆうしゃ　"` → 名前「ゆうしゃ」、Lv1・HP 30/30・MP 10/10・能力値 5・INN・空の所持品・実績 `{0,0,0,1,0}` |
| TC-0007-02 | 単体（同上） | OK。仕様書 §2.1 の入力例の表の 14 件がすべて表どおり |
| TC-0007-04 | 単体（同上） | OK。「𠮷」8 文字（16 コード単位）は作成でき、9 文字は「名前は1〜8文字で入力してください」 |
| TC-0008-04 | 単体（同上） | OK。3 回続けて休んでも HP・MP 以外は変わらず（さいだいHP +15 の装備で HP 61）、乱数を引かない。DUNGEON・BATTLE・SWAP・CLEARED では 409 `invalid_state` |
| TC-0009-09 | 単体（`tests/domain/game-state.test.ts`） | OK。版 2 は踏破記録を補う（今の位置だけ true、ボスのマスは記録しない）、版 1 は宿屋に戻す、どの版も所持品・実績を補う。`migrateSave` は版 1〜3 を表どおりに移し、ほかは `Unsupported save schemaVersion: n` |
| TC-0012-01 | 単体（同上） | OK。5 つの場所それぞれで、許されないときだけ 409 `invalid_state`「その操作は いまは できない」 |

確認 ID のないテストも足した：必要経験値の表、「経験値 0 に 72 で Lv3・最大 HP 46」、レベルアップで全回復しない、周回、所持品・実績の補正、`conformItem`、セーブの変換、テスト用の乱数。

手元で通したもの（2026-11-02）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID。後の TASK で書く）、単体 17 件、build、check:dist OK
- `npm run test:e2e`：36 件通った・3 件はその端末の対象外で飛ばした（34.3 秒）
- スクリーンショット：画面を変えていないので撮っていない

CI の結果（PR #32、2026-11-02）：`check`（verify）OK 59 秒、`e2e` OK 1 分 27 秒。

### WS-0002 の終わりの手動テスト（2026-11-02、オーナー）

この TASK に手動の確認 ID はない。ここで作ったルール（名前の規則・キャラクターの作成・やすむ）は、TASK-0007 の画面から使われ、WS-0002 の手動テスト（TC-0007-11、iPhone 11 の Safari で名前を入れて宿屋に移る。AC-0007）で OK だった。

## 3. 確認できなかったこと

- 手動の確認 ID はこの TASK にない。
- `tests/helpers/fake-storage.ts` は、使う形（`KeyValueStore`）を TASK-0005 で `platform/storage.ts` と一緒に決めるので、TASK-0005 で作る。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面の変更なし）
- [x] 設計と違う作りにしたら、TD・GUI を直した（TD-0002 v1.1）
- [x] AC-0004（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #32）
- [x] マージされた（マージ = 公開。2026-11-02、公開 URL が開くことを確かめた）
