---
id: MWIZ-TC-0024
type: Test Case
title: ボスを倒してクリアする
status: stable
version: 1.2
updated: 2026-11-12
sources:
  - MWIZ-US-0024（v1.3）
  - MWIZ-TST-0001（v1.2）
  - MWIZ-TD-0002（v1.9）
  - MWIZ-TD-0004（v1.9）
  - MWIZ-GUI-0005（v1.7）
  - docs/specification-ja.md (v1.21) §4.3、§6.3、§9.1、§9.2、§11.5、§16.1、§16.2
verified: null
---

# TC-0024 ボスを倒してクリアする

- 対象：[US-0024](../02_requirements/MWIZ-US-0024-user-story-ja.md)（受け入れ条件 7 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0024-01 | 1 | 5F でボスのマス（`openMap` の (9,0)）へ前進すると、乱数を 1 個も引かずに場所 BATTLE・敵が暗黒のネクロマンサー（`isBoss` true）になる。メッセージ「暗黒のネクロマンサーが あらわれた！」に effect `bossAppear` | 単体 | `tests/domain/explore.test.ts` |
| TC-0024-02 | 2 | ボスの経験値が 1000。Lv12・累計 1584 で撃破すると累計 2584 で Lv12 のまま（成長の乱数を引かない）。そのあと宿屋で `rest` すると Lv15 になる（v1.1） | 単体 | `tests/domain/battle.test.ts` |
| TC-0024-03 | 3 | 上の撃破のメッセージが「暗黒のネクロマンサーを たおした！」→「経験値 1000 を かくとく」→ ドロップの行 →「ダンジョンに 平和が もどった」の 4 行。effect の並びが `bossDefeat, rareDrop, clear`。場所 CLEARED、`dungeon` と `battle` が null（v1.1 でレベルアップの行がなくなった） | 単体 | `tests/domain/battle.test.ts` |
| TC-0024-04 | 4 | ゲーム API でボスを倒した操作のあと、最後に使ったスロット（`saveSlot` 2 の状態なら `mini-wiz-game-save-2`）がクリア時点の値で上書きされている：キャラクター（名前・Lv12・経験値 2584・HP/MP の現在値と最大値・基礎値）、所持品（段階 8・LG の個体が入り、`pending` は null）、実績（`laps` 2・`bossKills` 1）。ほかのスロットは変わらない。`getGame()` の `clear.autoSaved` が true（v1.1） | 単体 | `tests/api/game-api.test.ts` |
| TC-0024-05 | 4 | 自動プレイヤーでシード 2026 からボスを倒すまで遊ぶと、場所 CLEARED になり、自動セーブしたスロットの実績・Lv がプレイ中状態と同じ（自動プレイヤーは宿屋で やすむ ので育つ。v1.1） | 単体 | `tests/api/playthrough.test.ts` |
| TC-0024-06 | 5 | `fake-storage.ts` で書くスロットのキー（`mini-wiz-game-save-n`）の書き込みを失敗させてボスを倒す操作をすると、500 `storage_error` で reject し、プレイ中状態とセーブの両方が操作の前の値のまま。プレイ中状態のキーを失敗させても同じ。撃破後の入れ替え（`lootTake`・`lootAbandon`）で CLEARED になるときも同じ | 単体 | `tests/api/game-api.test.ts` |
| TC-0024-07 | 6 | クリア画面（`#/clear`）に、見出し「暗黒のネクロマンサーを たおした」、ウィンドウに「暗黒のネクロマンサーは ほろび、ダンジョンに 平和が もどった」「ゆうしゃ Lv12」「ぼうけんの きろくを セーブした」（success 色）「2 周目へ すすむ」（arcane 色）がこの順に出る。`clear.autoSaved` が false の状態（スロットが 3 つとも埋まっていて `saveSlot` が null のとき、または版 2 で保存されたクリア状態）では、代わりに「スロットが いっぱいなので セーブしなかった」（textSub 色）が出る（v1.1） | E2E | `e2e/clear.spec.ts` |
| TC-0024-08 | 7 | 平均成長・装備なしの Lv27 は、シード 1〜200 の模擬戦（HP が上限の 40% 以下で MP があればヒール、それ以外は攻撃）でボスに勝つ割合が 20% 以下。weapon7［SR］（+26）・armor7［SR］（+22）・shield7［SR］（かいひ +14）・accessory4［R］（さいだいHP +15）を装備した Lv25 は 80% 以上勝ち、同じ装備の Lv21 は 20% 以下（v1.2。仕様書 v1.20。v1.1 までは装備なしの Lv12 と、段階 5 の装備の Lv11。依頼のときの模擬戦では Lv25 96%・Lv21 1.5%・装備なし Lv27 0%） | 単体 | `tests/domain/balance.test.ts` |
| TC-0024-09 | 3 | クリアの自動セーブのスロット：`saveSlot` が 3 なら `save-3` に書く。`saveSlot` が null で スロット 1 が埋まり 2 が空きなら `save-2` に書き、プレイ中の状態の `saveSlot` が 2 になる。3 つとも埋まっていて `saveSlot` が null なら、どのスロットも変わらず、プレイ中の状態だけが書かれ（場所 CLEARED）、`clear.autoSaved` が false（v1.1） | 単体 | `tests/api/game-api.test.ts` |

## 2. 準備

- 単体：`tests/helpers/maps.ts` の `openMap(player, extra, 5)`（5F は (9,0) がボス）。撃破の場面は Lv12・累計 1584・所持品に空きがある状態で、残り HP 1 のボスとの戦闘中の状態から始め、`SequenceRng` で攻撃が当たる値・成長 15 個・ドロップの乱数を渡す。ゲーム API は `fake-storage.ts`（キーを指定して書き込みを失敗させられる）と `SwappableRng`。
- 通しプレイ：`tests/helpers/autoplayer.ts` の `play(name, { laps: 1 })`。時間切れ 120 秒。
- 模擬戦：`WIZ_BALANCE_BOSS` の任意の計測とは別に、この 2 つの割合は既定で動かす。
- E2E：`?debug=1` で開き、`startAt('CLEARED', …)`（ゆうしゃ・Lv15・実績 `laps` 2）でクリア画面を開く。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0024-07 | `#/clear` で見出しの `h1` の文字と、ウィンドウの各行の文字・並びを見る。続けて、3 スロットとも埋めて `saveSlot` null のクリア状態を `writeState` で書いて開き直し、「スロットが いっぱいなので セーブしなかった」が出て「ぼうけんの きろくを セーブした」がないこと |

## 4. 手動の手順

なし。
