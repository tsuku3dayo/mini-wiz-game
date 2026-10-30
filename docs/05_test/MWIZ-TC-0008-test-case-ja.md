---
id: MWIZ-TC-0008
type: Test Case
title: 宿屋で休む
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0008（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0003（v1.0）
  - docs/specification-ja.md (v1.2) §7.2、§7.3、§9.3、§11.5、§11.6、§16.1
verified: null
---

# TC-0008 宿屋で休む

- 対象：[US-0008](../02_requirements/MWIZ-US-0008-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0008-01 | 1 | 宿屋の画面（狭い画面）に、上から StatusPanel(full)（見出しが名前、Lv・EXP・HP・MP・こうげき・ぼうぎょ・すばやさ の行）→ メッセージ欄（`role="log"`）→ メニュー（`aria-label="宿屋"`）が並ぶ。メニューの項目は上から「やすむ」「セーブ」「メニュー」「ダンジョンへ」「タイトルへ戻る」、初めのカーソルは「やすむ」 | E2E | `e2e/inn.spec.ts` |
| TC-0008-02 | 2 | `rest` で、HP・MP が装備込みの最大値（実効値）になる（例：さいだいHP +15 のアクセを付けた最大 HP 46 の HP 10 → 61）。HP・MP が最大のときも実行でき、値は変わらない。メッセージは「HP と MP が かいふくした」（success）1 行 | 単体 | `tests/domain/character.test.ts` |
| TC-0008-03 | 2 | 宿屋で「やすむ」を選ぶと、メッセージ欄に「HP と MP が かいふくした」が出て、ステータスの HP・MP が最大の値になる。HP・MP が最大のときも選べて、同じ行が出る | E2E | `e2e/inn.spec.ts` |
| TC-0008-04 | 3 | `rest` はレベル・経験値・こうげき・ぼうぎょ・すばやさ・所持品・実績を変えず、乱数を引かない。続けて 3 回呼んでもエラーにならない。INN 以外（DUNGEON・BATTLE・SWAP・CLEARED）では 409「その操作は いまは できない」 | 単体 | `tests/domain/character.test.ts` |
| TC-0008-05 | 4 | HP 10・MP 1 で 1F の入口から `returnToInn` で宿屋に戻っても HP 10・MP 1 のまま。CLEARED から `continueGame`（宿屋へ）でも HP・MP が変わらない | 単体 | `tests/api/game-api.test.ts` |

## 2. 準備

- 単体：ルールは状態を `tests/helpers/fixtures.ts` で作り、入力を `deepFreeze` して呼ぶ。乱数を引かないことは、空の `SequenceRng` で確かめる。ゲーム API は `fake-storage.ts` に状態を書いてから呼ぶ。
- E2E：`?debug=1` で開き、`__wiz.writeState` で宿屋・HP 10/46・MP 1/13 の状態から始める（`startAt('INN', …)`）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0008-01 | 414 × 715 で開く → 各ウィンドウの `getBoundingClientRect().top` の順で並びを確かめる → メニューの項目の文字とカーソルの ▶ の行 |
| TC-0008-03 | 「やすむ」を決定 → 逐次表示を待つ（偽の時計）→ メッセージ欄の最後の行とステータスの HP・MP の文字 → もう一度「やすむ」→ 同じ行がもう 1 行出る |

## 4. 手動の手順

なし。
