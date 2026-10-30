---
id: MWIZ-TC-0022
type: Test Case
title: 敵を倒して強くなる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0022（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0001（v1.1）
  - docs/specification-ja.md (v1.2) §2.2、§2.3、§5.5、§11.2、§11.6、§16.1、§16.4
verified: null
---

# TC-0022 敵を倒して強くなる

- 対象：[US-0022](../02_requirements/MWIZ-US-0022-user-story-ja.md)（受け入れ条件 9 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0022-01 | 1 | スライムを倒すターンの結果で、メッセージが「スライムを たおした！」（success）→「経験値 4 を かくとく」（success）の順に出る。場所 DUNGEON・x と y が戦闘前と同じ・`battle` が null・経験値が 4 増える・HP は戦闘中に減った値のまま（回復しない）・討伐数が 1 増える | 単体 | `tests/domain/battle.test.ts` |
| TC-0022-02 | 2 | `expForLevel` が Lv2：24、Lv3：72、Lv4：144、Lv5：240、Lv10：1080、Lv100：118800 を返す | 単体 | `tests/domain/character.test.ts` |
| TC-0022-03 | 3 | Lv1・経験値 0 に `applyExp` で 23 を加えると Lv1 のまま・乱数 0 個・メッセージ 0 行。24 を加えると Lv2 になり、乱数をちょうど 5 個引く（引いた数を数える `Rng` で確かめる） | 単体 | `tests/domain/character.test.ts` |
| TC-0022-04 | 4 | Lv1・経験値 0 に 72 を加えると Lv3・メッセージ 4 行（「レベルが あがった！ Lv2」「HP +8 MP +2 こうげき +1 ぼうぎょ +1 すばやさ +1」「レベルが あがった！ Lv3」「HP +8 MP +2 こうげき +1 ぼうぎょ +1 すばやさ +1」）。成長最小（8,2,1,1,1 × 2）で最大 HP 46 | 単体 | `tests/domain/character.test.ts` |
| TC-0022-05 | 5 | `SequenceRng` に 12, 4, 2, 1, 2 を入れて Lv2 に上げると、最大 HP +12・最大 MP +4・こうげき +2・ぼうぎょ +1・すばやさ +2 になる（maxHp → maxMp → attack → defense → speed の順に引く）。2 行目が「HP +12 MP +4 こうげき +2 ぼうぎょ +1 すばやさ +2」 | 単体 | `tests/domain/character.test.ts` |
| TC-0022-06 | 6 | HP 20/30・MP 5/10 で Lv2 に上がり成長が 8, 2, 1, 1, 1 なら、HP 28/38・MP 7/12（増えた最大値の分だけ増え、全回復しない） | 単体 | `tests/domain/character.test.ts` |
| TC-0022-07 | 7 | `SeededRng`（固定シード）で 10,000 回レベルアップすると、成長値がすべて HP 8〜12・MP 2〜4・こうげき／ぼうぎょ／すばやさ 1〜2 に入り、それぞれの両端（8 と 12、2 と 4、1 と 2）が 1 回以上出る | 単体 | `tests/domain/character.test.ts` |
| TC-0022-08 | 8 | 戦闘で勝つと、メッセージを 400ms ごとに出しているあいだは URL が `#/battle` のままで、直前の敵の名前が出たまま。最後の行を出したあとでダンジョン（`#/dungeon`）に移る。メッセージ欄をクリックすると残りがすぐ出て、ダンジョンへ移る | E2E | `e2e/battle.spec.ts` |
| TC-0022-09 | 9 | 宿屋の StatusPanel(full)（狭い画面）の見出しが名前「ゆうしゃ」で、Lv「  3」、EXP「 80（つぎまで 64）」、HP「 25/ 46」、MP「 10/ 16」、こうげき・ぼうぎょ・すばやさ「  7」が出る（`padStart(3, ' ')`）。補正があるときだけ「 (+n)」が付く（さいだいHP +15 なら HP「 25/ 61 (+15)」）。広い画面の full は見出し「ステータス」で、1 行目が「なまえ」と名前 | E2E | `e2e/inn.spec.ts` |
| TC-0022-10 | 9 | ダンジョン・戦闘の StatusPanel(compact) は見出し「ステータス」の 1 行で、名前・「Lv  3」・「HP 25/ 46」・「MP 10/ 16」が出る（EXP・こうげき などは出ない）。レベルが上がると Lv の表示が新しい値に変わる | E2E | `e2e/battle.spec.ts` |

## 2. 準備

- 単体：`tests/helpers/fixtures.ts` の Lv1 の初期キャラクターと、`tests/helpers/maps.ts` の `dungeonState` で作った戦闘中の状態（スライム、残り HP 1）。乱数は `SequenceRng`（値を決めて渡す）と、引いた数を数える `Rng` を使う。
- E2E：`?debug=1` で開く。TC-0022-08・10 は `startAt('BATTLE', …)` でスライム（残り HP 1）との戦闘から始め、`useSeed` で先攻のプレイヤーの攻撃が当たるシードにする。TC-0022-09 は `startAt('INN', …)` で Lv3・経験値 80・HP 25/46・MP 10/16・能力値 7 の状態にする（補正の確かめは さいだいHP +15 のアクセを装備した状態）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0022-08 | 偽の時計を入れる →「たたかう」を選ぶ → 1 行目が出た時点で `#/battle`・敵の名前「スライム」が出ていること → 400ms ずつ進め、最後の行の前までは `#/battle` のまま → 最後の行のあとで `#/dungeon` になる。もう一度同じ場面から始め、1 行目が出たらメッセージ欄（`[data-testid="message-window"]`）をクリック → すぐに `#/dungeon` になる |
| TC-0022-09 | 狭い画面（`pixel7`・`small`）で宿屋を開き、`<dl>` の各 `dd` の文字を見る。`desktop` では見出しが「ステータス」で 1 行目に「なまえ」があること |
| TC-0022-10 | ダンジョンと戦闘の画面で、ステータスのウィンドウの見出しと 1 行の中身を見る。経験値 23 の状態でスライムを倒し、Lv が「  2」に変わること |

## 4. 手動の手順

なし。
