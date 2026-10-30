---
id: MWIZ-TC-0021
type: Test Case
title: ヒールで回復する
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0021（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0003（v1.0）
  - docs/specification-ja.md (v1.2) §5.2、§7.1、§11.4、§16.1
verified: null
---

# TC-0021 ヒールで回復する

- 対象：[US-0021](../02_requirements/MWIZ-US-0021-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0021-01 | 1 | `castHeal` で HP 10/46・MP 10 → HP 40・MP 7、メッセージ「ゆうしゃは ヒールを となえた！ HP が 30 かいふくした」（success）。HP 36/46 → HP 46・「HP が 10 かいふくした」。HP 46/46 → HP 46・MP 7・「HP が 0 かいふくした」。MP ちょうど 3 なら使えて MP 0。どれも乱数を引かない | 単体 | `tests/domain/heal.test.ts` |
| TC-0021-02 | 2 | 戦闘中に MP 2 で `battle({ command: 'heal' })`、ダンジョンで MP 2 で `heal()` を送ると、どちらも `{ status: 409, error: 'invalid_state', message: 'MP が たりない' }` で reject する。保存の中身が送る前と同じで、乱数を 1 個も引いていない | 単体 | `tests/api/game-api.test.ts` |
| TC-0021-03 | 3 | ダンジョンで「≡ メニュー」→「ヒール」（初めのカーソル）を選ぶと、メッセージ欄に「ゆうしゃは ヒールを となえた！ HP が 30 かいふくした」が出て、ステータスが「HP 40/ 46」「MP  7/ 16」になる。メニューは開いたままで、カーソルは「ヒール」のまま | E2E | `e2e/menu.spec.ts` |
| TC-0021-04 | 3 | MP 2 のとき、メニューの「ヒール」は `aria-disabled="true"` で、初めのカーソルは「ヒール」。選ぶとメッセージ欄に「MP が たりない」が通常の色で出て、HP・MP は変わらない（ゲーム API を呼ばない） | E2E | `e2e/menu.spec.ts` |
| TC-0021-05 | 4 | `fieldHeal` を場所 INN・BATTLE・SWAP・CLEARED で呼ぶと `InvalidStateError`（409「その操作は いまは できない」）。DUNGEON で使ったときは、位置・向き・踏破記録・歩数・実績が使う前と同じ。`GameView.canHeal` は DUNGEON かつ MP ≧ 3 のときだけ true | 単体 | `tests/domain/heal.test.ts` |

## 2. 準備

- 単体：`tests/helpers/fixtures.ts` の状態（Lv3・最大 HP 46・最大 MP 16 のキャラクター）を `deepFreeze` して渡す。乱数は値のない `SequenceRng`（引くとエラーになる）を渡し、引かないことを確かめる。ゲーム API は `tests/helpers/fake-storage.ts` と `SwappableRng` で作る。
- E2E：`?debug=1` で開き、`e2e/helpers.ts` の `startAt('DUNGEON', …)` で、Lv3・HP 10/46・MP 10/16 の状態から始める（TC-0021-04 は MP 2/16）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0021-03 | 「≡ メニュー」を押す → カーソルが「ヒール」にあることを確かめて決定 → メッセージ欄の最後の行とステータスの HP・MP を見る。`role="menu"` のメニュー（ダンジョン）がまだ出ていて、カーソル行（▶）が「ヒール」であること |
| TC-0021-04 | 「≡ メニュー」を押す → 「ヒール」の `aria-disabled` を見る → 決定 → メッセージ欄に「MP が たりない」が出て、ステータスが「HP 10/ 46」「MP  2/ 16」のままであること |

## 4. 手動の手順

なし。
