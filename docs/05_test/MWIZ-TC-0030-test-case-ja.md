---
id: MWIZ-TC-0030
type: Test Case
title: もちものが満杯のとき入れ替える
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0030（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0006（v1.0）
  - docs/specification-ja.md (v1.2) §8.5、§8.7、§9.1、§11.5、§16.1、§16.3
verified: null
---

# TC-0030 もちものが満杯のとき入れ替える

- 対象：[US-0030](../02_requirements/MWIZ-US-0030-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0030-01 | 1 | 所持品 50 個で敵が落とすと、場所 SWAP・`pending = { item: 落とした個体, thenClear: false }`・所持品は変わらない。ドロップの行は出る。所持品 49 個＋装備中 4 個（装備中は数えない）なら SWAP にならず、所持品の末尾に入って 50 個・場所 DUNGEON | 単体 | `tests/domain/loot.test.ts` |
| TC-0030-02 | 1 | SWAP のあいだ、`move`・`heal`・`rest`・`equip`・`unequip`・`discard`・`stairs`・`returnToInn` を送ると、どれも 409 `invalid_state` で状態は変わらない。`getGame()` を何度呼んでも `pendingDrop` が同じ個体（同じ `id`）で、抽選し直さない | 単体 | `tests/api/game-api.test.ts` |
| TC-0030-03 | 1 | 場所 SWAP の状態で `#/inn`・`#/dungeon` などを開くと `#/swap` に移る。再読み込みしても `#/swap` の 2 択に戻り、「おちている：」の個体が前と同じ | E2E | `e2e/swap.spec.ts` |
| TC-0030-04 | 2 | 入れ替えの画面に、画面名「いれかえ」、ウィンドウの見出し「もちものが いっぱいだ」、「おちている：」と落ちている個体の ItemLabel（例「ミスリルソード［UR］」「こうげき +28」）、メニュー「ひろう（すてるものを えらぶ）」「あきらめる」（初めのカーソルは ひろう）が出る。メッセージ欄がある。2 択で Esc を押しても閉じない | E2E | `e2e/swap.spec.ts` |
| TC-0030-05 | 3 | `lootTake({ discardId })` で、指定した個体が消え、落ちていた個体が所持品の末尾に入り 50 個のまま。メッセージ「ショートソード［N］を すてて ミスリルソード［UR］を ひろった」。`lootAbandon()` では所持品が変わらず、メッセージ「ミスリルソード［UR］を あきらめた」。どちらも `pending` が null・場所 DUNGEON。`thenClear` が true のときは場所 CLEARED で、最後の行に「ダンジョンに 平和が もどった」（effect `clear`）が付き、自動セーブが書かれる。指定が所持品にない（装備中を含む）と 409 `rule_violation`「その もちものは ない」 | 単体 | `tests/domain/loot.test.ts` |
| TC-0030-06 | 3 | 「ひろう（すてるものを えらぶ）」→ 一覧（よわい じゅん）→ ショートソード［N］を選ぶ →「ショートソード［N］を すてて ミスリルソード［UR］を ひろいますか？」→ はい で `#/dungeon` に移る。「あきらめる」→「ミスリルソード［UR］を あきらめますか？」→ はい で `#/dungeon`。ひろう確認の いいえ・Esc で一覧へ、あきらめる確認の いいえ・Esc で 2 択へ、一覧の もどる・Esc で 2 択へ戻る。ボスの後（`thenClear`）なら はい で `#/clear` に移る | E2E | `e2e/swap.spec.ts` |
| TC-0030-07 | 4 | ゲーム API で所持品 50 個のままボスを倒すと、場所 SWAP・実績 `laps` が 2・`bossKills` が 1・メッセージに「ダンジョンに 平和が もどった」がない・セーブは書かれていない。続けて `lootAbandon()` を送ると場所 CLEARED・最後の行が「ダンジョンに 平和が もどった」・`laps` は 2 のまま（二重に増えない）・セーブがクリア時点の値（`pending` は null）で上書きされる | 単体 | `tests/api/game-api.test.ts` |

## 2. 準備

- 単体：`tests/helpers/fixtures.ts` で所持品 50 個（ショートソード［N］を含む）と 49 個の状態を作る。乱数は `SequenceRng`（ドロップする値・ミスリルソード［UR］になる値）。ゲーム API は `fake-storage.ts` と `SwappableRng`。ボスの場面は、残り HP 1 のボスとの戦闘中の状態を偽の保存に書く。
- E2E：`?debug=1` で開き、`startAt('SWAP', …)` で所持品 50 個（ショートソード［N］を含む）、落ちている個体 ミスリルソード［UR］（こうげき +28）、`thenClear: false` の状態から始める。ボスの後の確かめは `thenClear: true` の状態。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0030-03 | `page.goto('/#/inn')` → `#/swap` になること → `page.reload()` → `#/swap` で、「おちている：」の個体の名前が前と同じ |
| TC-0030-04 | 画面名・見出し・「おちている：」の行・`role="menuitem"` の文字を見る。Esc を押しても 2 択のままであること（Esc は `desktop` だけで押す） |
| TC-0030-06 | ひろう の流れと あきらめる の流れを、それぞれ はい・いいえ・Esc で進め（Esc は `desktop` だけで押す）、ウィンドウの中身と URL を見る。`thenClear: true` の状態では はい のあと `#/clear` |

## 4. 手動の手順

なし。
