---
id: MWIZ-TC-0014
type: Test Case
title: 迷宮を一人称で歩く
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0014（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - docs/specification-ja.md (v1.2) §4.1、§4.2、§4.8、§4.10、§11.5、§16.2、§16.4
verified: null
---

# TC-0014 迷宮を一人称で歩く

- 対象：[US-0014](../02_requirements/MWIZ-US-0014-user-story-ja.md)（受け入れ条件 6 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0014-01 | 1 | `moveInDungeon` の前進・後退は向きを変えず、回転は位置を変えない。壁の方向へ進むと位置が変わらず、メッセージ「かべだ」が 1 行返る | 単体 | `tests/domain/explore.test.ts` |
| TC-0014-02 | 2 | 移動ボタン（↑ 前進・← 左・右 →・↓ 後退）をタップすると、階と向きの表示・疑似3D が変わる（`aria-label` は 前進・左を向く・右を向く・後退） | E2E（タッチ） | `e2e/dungeon.spec.ts` |
| TC-0014-03 | 3 | 矢印キーが、フォーカスがどこにあっても効く。ページはスクロールしない。応答待ち（`setDelay`）・逐次表示中・メニュー表示中に押したキーは捨てられ、あとで動かない | E2E（キー、`desktop`） | `e2e/dungeon.spec.ts` |
| TC-0014-04 | 4 | `viewToSegments` が枠の座標（x = 0,40,80,110,130／y = 0,30,60,82,97）の線分を返す | 単体 | `tests/logic/view-to-segments.test.ts` |
| TC-0014-05 | 4 | 壁にぶつかると、段 0 の正面の壁の線（`front`・depth 0）だけが 200ms 点滅し、そのあと消えない | E2E | `e2e/dungeon.spec.ts` |
| TC-0014-06 | 5 | `toFirstPersonView` の視界は最大 4 段、正面の壁で止まり、視界の外のマスを変えても結果が同じ。キーは `floor`・`facing`・`underfoot`・`depths` だけ | 単体 | `tests/domain/view.test.ts` |
| TC-0014-07 | 6 | 疑似3D の上に「{階}F　{向き}」（例「3F　北」、間は全角スペース）が出て、座標の数字は出ない | E2E | `e2e/dungeon.spec.ts` |
| TC-0014-08 | 2 | iPhone 11 で移動ボタンを親指で押しやすく、押したとき指で疑似3D・メッセージ欄・ステータスが隠れない | 手動 | 実機（iPhone 11） |

## 2. 準備

- 単体：`tests/helpers/maps.ts` の `openMap(player, extra, floor)`（外周だけが壁の 10×10）と `constantRng`。
- E2E：`?debug=1` で開き、`__wiz.writeState` で 3F・北向き・足元が下り階段の手前、の状態から始める（`e2e/helpers.ts` の `startAt('DUNGEON', …)`）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0014-02 | 「↑ 前進」をタップ → 位置が 1 マス進んだこと（`__wiz.debugDungeon()` の `player`）と疑似3D の線が変わったことを確かめる。「← 左」で「3F　西」になる |
| TC-0014-03 | メッセージ欄をクリックしてフォーカスを移してから ↑ を押す → 進む。`window.scrollY` が 0 のまま。`setDelay(1000)` にして ↑ を 2 回押し、応答のあとで 1 マスだけ進んだことを確かめる |
| TC-0014-05 | 正面が壁の位置で ↑ → メッセージ「かべだ」。`front` の線の `animation` が 200ms 付いて外れる（偽の時計で進める） |
| TC-0014-07 | `[data-testid="location-label"]` の文字が `3F　北` に等しく、数字が階の 1 つだけ |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0014-08 | iPhone 11 の Safari で公開 URL を開き、ダンジョンに入る。右手の親指で 前進・左・右・後退を 10 回ずつ押す | 押し間違えない。押している間、疑似3D・メッセージ欄・ステータスが指で隠れない |
