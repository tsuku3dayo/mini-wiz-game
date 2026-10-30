---
id: MWIZ-TC-0027
type: Test Case
title: 敵が装備を落とす
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0027（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-GUI-0007（v1.0）
  - docs/specification-ja.md (v1.2) §8.1、§8.2、§8.3、§8.4、§8.7、§15.3、§16.3
verified: null
---

# TC-0027 敵が装備を落とす

- 対象：[US-0027](../02_requirements/MWIZ-US-0027-user-story-ja.md)（受け入れ条件 9 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0027-01 | 1 | 装備のマスタが 32 種で、各種類の ID・名前・部位・段階・上がる能力・幅（min〜max）が仕様書 §8.2 の 4 つの表と一致する（例：`weapon8` エクスカリバー・ぶき・段階 8・こうげき・20〜26、`accessory4` ライフアミュレット・さいだいHP・10〜20）。ID はどれも `${slot}${tier}`。`accessory8`（ソロモンのゆびわ）だけ能力が `['attack', 'defense']` の 2 つ | 単体 | `tests/domain/items.test.ts` |
| TC-0027-02 | 2 | 補正値が `floor(v × 倍率×10 ÷ 10)`（N 10・R 12・SR 15・UR 20・LG 30）。エクスカリバー［LG］は v=20 で 60、v=26 で 78。ロングソード［SR］は v=7〜10 で 10・12・13・15。32 種の取りうる範囲が §8.3 の「種類ごとに取りうる補正値」の表と一致する | 単体 | `tests/domain/items.test.ts` |
| TC-0027-03 | 3 | 出るレアリティが段階 1〜3 は N/R、4〜5 は R/SR、6〜7 は SR/UR、8 は LG。レアリティの乱数 80 で低い方、81 で高い方。段階 8 は乱数 81 でも LG で、レアリティの乱数を 1 個引く | 単体 | `tests/domain/loot.test.ts` |
| TC-0027-04 | 4 | スライムはドロップ判定の乱数 15 で落とす。16 では落とさず、それ以降の乱数を引かない（`SequenceRng` の残りが減らない） | 単体 | `tests/domain/loot.test.ts` |
| TC-0027-05 | 5 | ダークナイトは特例の乱数 5 で段階 8・LG になり、段階の乱数を引かない。6 では段階を `int(5,7)` で引き、5〜7 のどれかになる | 単体 | `tests/domain/loot.test.ts` |
| TC-0027-06 | 6 | ボスはドロップ判定の乱数が 100 でも落とし、必ず段階 8・LG。段階の乱数（`int(8,8)`）も 1 個引く | 単体 | `tests/domain/loot.test.ts` |
| TC-0027-07 | 7 | 乱数を引く順が ドロップ判定 `int(1,100)` →（ダークナイトだけ）特例 `int(1,100)` → 部位 `int(0,3)` → 段階 → レアリティ `int(1,100)` → 補正値 `int(min,max)`（引いた引数の列を記録する `Rng` で確かめる）。レベルアップする勝利では、成長の 5 個の後にドロップの乱数を引く | 単体 | `tests/domain/battle.test.ts` |
| TC-0027-08 | 8 | ドロップの行が「スライムは ウッドシールド［R］（ぼうぎょ +1）を おとした！」の形（括弧は全角、「は」の後に半角スペース）。ソロモンのゆびわは「暗黒のネクロマンサーは ソロモンのゆびわ［LG］（こうげき +20 ぼうぎょ +20）を おとした！」。行は `tone: 'normal'`・`rarity` 付きで、UR・LG のときだけ `effect: 'rareDrop'` | 単体 | `tests/domain/loot.test.ts` |
| TC-0027-09 | 8 | メッセージ欄で、ドロップの行の文字色がレアリティの色（R なら `rgb(91, 140, 255)`、LG なら `rgb(255, 77, 109)`）。UR の行は 400ms の step-end の点滅を 2 回、LG は 3 回して、次の行は UR で 800ms、LG で 1200ms あとに出る。N・R・SR は点滅しない。動きを減らす設定では点滅しない | E2E | `e2e/message.spec.ts` |
| TC-0027-10 | 9 | 個体の ID が `nextId` から振られ、`nextId` が 1 増える。捨てたあとに拾った個体は、捨てた ID を使わず次の番号。満杯で入れ替え待ちになる個体にも ID が振られ、あきらめても `nextId` は戻らない | 単体 | `tests/domain/loot.test.ts` |

## 2. 準備

- 単体：乱数は `SequenceRng`（境界の値を並べる）と、引いた `int(a, b)` の引数を記録する `Rng`（`tests/helpers/` に置く）。状態は `tests/helpers/fixtures.ts`。入力は `deepFreeze` して、変わらないことも確かめる。
- E2E：`?debug=1` で開き、`startAt('BATTLE', …)` で残り HP 1 の敵との戦闘から始め、`useSeed` で目的のレアリティを落とすシードにする（R：スライム、UR・LG：ダークナイト。シードは `e2e/helpers.ts` に定数で持つ）。偽の時計を入れる。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0027-09 | 「たたかう」→ 400ms ずつ進め、ドロップの行の `getComputedStyle().color` を見る。UR・LG では行の `animation` が 400ms・step-end・回数 2（LG は 3）で、次の行が出るまでの時間を偽の時計で確かめる。`page.emulateMedia({ reducedMotion: 'reduce' })` にして同じ場面で、行に `animation` が付かないこと |

## 4. 手動の手順

なし。
