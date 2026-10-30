---
id: MWIZ-TC-0018
type: Test Case
title: 敵と遭遇する
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0018（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - docs/specification-ja.md (v1.2) §4.3、§5.1、§6、§11.8、§16.1、§16.2、§16.4、§23
verified: null
---

# TC-0018 敵と遭遇する

- 対象：[US-0018](../02_requirements/MWIZ-US-0018-user-story-ja.md)（受け入れ条件 6 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0018-01 | 1 | 何もないマスへ前進・後退したとき：`SequenceRng([20, n])` で遭遇（場所 `BATTLE`、`records.battles` が +1、メッセージ「{敵の名前}が あらわれた！」normal）。`SequenceRng([21])` で遭遇せず、乱数を 1 個だけ使う（`assertExhausted()`）。例：3F で [20, 31] → スケルトン | 単体 | `tests/domain/explore.test.ts` |
| TC-0018-02 | 1 | 回転・壁にぶつかる・階段で着く・宿屋へ戻る・上り階段／下り階段／入口のマスへ歩いて入る、では乱数を引かず（呼ぶと例外になる Rng）、遭遇しない | 単体 | `tests/domain/explore.test.ts` |
| TC-0018-03 | 2 | `SeededRng` の固定シードで遭遇判定を 10,000 回すると、遭遇の割合が 18%〜22%。各階で遭遇した敵の割合が出現表（1F スライム 70・ゴブリン 30、2F スライム 30・ゴブリン 50・スケルトン 20、3F ゴブリン 30・スケルトン 50・オーク 20、4F スケルトン 30・オーク 50・ダークナイト 20、5F オーク 40・ダークナイト 60）の ±2.5 ポイントに入る | 単体 | `tests/domain/explore.test.ts` |
| TC-0018-04 | 2 | `pickEnemy` の境目：1F は 70 → スライム・71 → ゴブリン。2F〜4F は 30・31・80・81 の境目、5F は 40 → オーク・41 → ダークナイト | 単体 | `tests/domain/explore.test.ts` |
| TC-0018-05 | 3 | `arrival` の遭遇の判定：前の状態がない、または前の場所が BATTLE でなく、新しい場所が BATTLE のとき真。BATTLE → BATTLE（ターンの続き）・DUNGEON → DUNGEON では偽 | 単体 | `tests/logic/arrival.test.ts` |
| TC-0018-06 | 3 | 画面で：メッセージ欄に行がある状態で前進して遭遇すると、それまでの行が消え、メッセージ欄が「スライムが あらわれた！」の 1 行だけになり、戦闘の画面（`body[data-screen="battle"]`）になる | E2E | `e2e/battle.spec.ts` |
| TC-0018-07 | 4 | `ENEMIES` の 6 種が仕様書 §6.1 の表のとおり：スライム（HP 12・攻 4・防 2・速 3・経験値 4）、ゴブリン（18・6・3・6・10）、スケルトン（26・9・6・5・18）、オーク（48・16・10・5・30）、ダークナイト（70・24・16・10・50）、暗黒のネクロマンサー（260・34・20・14・1000）。出現表に出る階が表のとおり（スライム 1F・2F、ゴブリン 1F〜3F、スケルトン 2F〜4F、オーク 3F〜5F、ダークナイト 4F・5F、ネクロマンサーはどの出現表にもない）。各階の出現表の合計が 100 | 単体 | `tests/domain/constants.test.ts` |
| TC-0018-08 | 5 | `SeededRng(1)` の `int(1,100)` を 10 回引くと 63, 1, 53, 99, 97, 29, 62, 73, 43, 100 | 単体 | `tests/domain/rng.test.ts` |
| TC-0018-09 | 6 | `chance(0.1)` は、`int` が 10 を返すと真、11 を返すと偽（`SequenceRng`）。`chance` を 1 回呼ぶと乱数を 1 個だけ使う | 単体 | `tests/domain/rng.test.ts` |

## 2. 準備

- 単体：`tests/helpers/maps.ts` の `openMap(player, extra, floor)`（上り (0,9)、下り (9,0)）と `dungeonState`。乱数の列は `SequenceRng`、使わないことは呼ぶと例外になる Rng で確かめる。統計は `SeededRng` の固定シード。
- E2E：`?debug=1` で開き、`startAt('DUNGEON', …)` で 1F の何もないマス（正面が壁のマスの隣）から始める。次の前進で遭遇してスライムが出るシードを `useSeed` で使う（`e2e/helpers.ts` に置く）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0018-06 | 正面が壁の向きで ↑ →「かべだ」が出る → → で通路の向きにする → `useSeed` → ↑ → メッセージ欄の行が「スライムが あらわれた！」の 1 つだけ（「かべだ」がない）。`body[data-screen]` が `battle` |

## 4. 手動の手順

なし。
