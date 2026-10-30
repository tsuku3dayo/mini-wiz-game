---
id: MWIZ-TC-0019
type: Test Case
title: 敵とたたかう
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0019（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0005（v1.1）
  - docs/specification-ja.md (v1.2) §5.2、§5.3、§5.4、§5.7、§5.8、§11.5、§11.6、§11.8、§15.1、§16.1、§16.4
verified: null
---

# TC-0019 敵とたたかう

- 対象：[US-0019](../02_requirements/MWIZ-US-0019-user-story-ja.md)（受け入れ条件 9 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0019-01 | 1 | 戦闘の画面に、敵のウィンドウ（`[data-testid="enemy-window"]`）の敵の名前（例「ゴブリン」）、見出し「ステータス」の 1 行のステータス（名前・Lv・HP・MP）、見出し「コマンド」のメニュー（たたかう／ヒール／にげる の 3 つ）、メッセージ欄が出る。敵のウィンドウに数字がない（敵の HP を出さない） | E2E | `e2e/battle.spec.ts` |
| TC-0019-02 | 1 | `toBattleView` のキーが `enemyKind`・`enemyName`・`isBoss`・`canHeal`・`canFlee` だけで、敵の HP がない | 単体 | `tests/domain/battle.test.ts` |
| TC-0019-03 | 2 | `damage(5,2,0)` が 4、`damage(5,2,2)` が 6、`damage(5,3,0)` が 4、`damage(4,12,0)` が 1、`damage(2,10,2)` が 1 | 単体 | `tests/domain/battle.test.ts` |
| TC-0019-04 | 3 | `turnOrder` はプレイヤーの素早さ（実効値）＝敵の素早さのときプレイヤーが先、プレイヤーが 1 遅いと敵が先。素早さが同じ敵と「たたかう」の 1 ターンで、最初のメッセージがプレイヤーの攻撃の行 | 単体 | `tests/domain/battle.test.ts` |
| TC-0019-05 | 4 | `evadeChance(10,10)` が 5、`(11,10)` が 7、`(22,10)` が 29、`(23,10)` が 30、`(30,10)` が 30、`(5,10)` が 5 | 単体 | `tests/domain/battle.test.ts` |
| TC-0019-06 | 5 | プレイヤーの攻撃が回避されたとき（回避の乱数が回避率以下）：「{敵}は ひらりと みをかわした！」、敵の HP が変わらない。次に引く乱数は敵の攻撃の回避の `int(1,100)` で、プレイヤーの攻撃のダメージの `int(0,2)` は引かない（`SequenceRng` の値の数で確かめる） | 単体 | `tests/domain/battle.test.ts` |
| TC-0019-07 | 6 | プレイヤーが先攻で敵を倒すとき（例：HP 3 のスライム、`SequenceRng([100, 0, 16])`）：勝利し、敵の攻撃の行がない。使う乱数は回避・ダメージの 2 個とドロップ判定の 1 個だけ（`assertExhausted()`） | 単体 | `tests/domain/battle.test.ts` |
| TC-0019-08 | 7 | 回避率 15%（回避する側の速さ 10・攻撃する側の速さ 5）で、`SeededRng` の固定シードで攻撃 1 回を 10,000 回すると、回避の割合が 13.5%〜16.5% | 単体 | `tests/domain/battle.test.ts` |
| TC-0019-09 | 8 | 画面で：新しく出た行に「ダメージを うけた」があると、ステータスの HP の値に 200ms・`step-end`・1 回の点滅の `animation` が付き、200ms のあとに外れる。「ダメージを うけた」がない行（プレイヤーの攻撃だけ）では付かない | E2E | `e2e/battle.spec.ts` |
| TC-0019-10 | 8 | `low-hp` の HP の警告：HP ≦ 最大HP × 0.25 で真（最大 40 で HP 10 は真・11 は偽、最大 46 で HP 11 は真・12 は偽） | 単体 | `tests/logic/low-hp.test.ts` |
| TC-0019-11 | 8 | 画面で：HP が最大の 25% 以下のとき、ステータスの HP の値が `data-warning="true"`・色 `rgb(255, 167, 38)` で、末尾に「！」が付く。25% を超えると付かない | E2E | `e2e/battle.spec.ts` |
| TC-0019-12 | 9 | `low-hp` の体力わずか：HP × 5 ≦ 最大HP で真（最大 46 で HP 9 は真・10 は偽、最大 50 で HP 10 は真・11 は偽、HP 0 は真） | 単体 | `tests/logic/low-hp.test.ts` |
| TC-0019-13 | 9 | 画面で：HP × 5 ≦ 最大HP のあいだ、`#app` に `data-low-hp` が付き、画面のすべてのウィンドウの外側の線（`border-color`）と内側の線（`outline-color`）が `rgb(255, 90, 78)`。ウィンドウの見出しの文字は `rgb(201, 162, 39)` のまま。ダンジョンでヒールして条件から外れると、線が `rgb(255, 255, 255)` に戻り `data-low-hp` が外れる | E2E | `e2e/battle.spec.ts` |

## 2. 準備

- 単体：戦闘の状態は `tests/helpers/fixtures.ts`（敵の種類と残り HP、プレイヤーの能力値を指定できるもの）。乱数は `SequenceRng`（値の列と `assertExhausted()`）、統計は `SeededRng` の固定シード。
- E2E：`?debug=1` で開き、`startAt('BATTLE', …)` でゴブリンとの戦闘から始める。敵の攻撃が当たる・当たらないは、`useSeed` で決まった結果になるシードを使う（`e2e/helpers.ts` に置く）。時間は偽の時計で進める。
  - 体力わずかの場面：最大 HP 46・HP 9 の BATTLE と、同じ HP の DUNGEON（MP 10。ヒールで 39 になる）。HP の警告の場面：最大 HP 40・HP 10 と HP 11。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0019-01 | 戦闘の画面で、`enemy-window` の文字が「ゴブリン」で、`/[0-9]/` に当たらない。コマンドのメニューの項目が「たたかう」「ヒール」「にげる」の順 |
| TC-0019-09 | 敵の攻撃が当たるシードで「たたかう」→ 敵の攻撃の行が出た時点で HP の値に `animation` がある → `runFor(200)` でなくなる |
| TC-0019-13 | HP 9/46 の戦闘の画面で、すべての GameWindow の線の色を見る → HP 9/46 のダンジョンでメニューから ヒール →「…HP が 30 かいふくした」の行のあと、線が白に戻る |

## 4. 手動の手順

なし。
