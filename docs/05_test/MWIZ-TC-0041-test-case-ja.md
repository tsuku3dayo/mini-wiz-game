---
id: MWIZ-TC-0041
type: Test Case
title: 扉を開けて、宝箱や強い敵に出会う
status: stable
version: 1.0
updated: 2026-11-27
sources:
  - MWIZ-US-0040（v1.0）
  - MWIZ-TST-0001（v1.2）
  - MWIZ-TD-0002（v1.12）
  - MWIZ-TD-0004（v1.10）
  - MWIZ-GUI-0004（v1.1）
  - docs/specification-ja.md (v1.25) §3.4〜§3.6、§4.1、§4.2、§4.9〜§4.11、§8.4、§11.5、§16.2〜§16.4、§21.4
verified: null
---

# TC-0041 扉を開けて、宝箱や強い敵に出会う

- 対象：[US-0040](../02_requirements/MWIZ-US-0040-user-story-ja.md)（受け入れ条件 10）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0041-01 | 1 | `deadEnds`：開いた辺が 1 つのマスだけを番号の小さい順に返し、`up` のマスは除く。`doorSide` はその開いた辺 | 単体 | `tests/domain/doors.test.ts` |
| TC-0041-02 | 1 | `placeDoors`：行き止まりが 6 つ以上なら扉 5 つ（1F〜4F は 下り階段・敵・宝箱・敵・宝箱、5F は ボス・宝箱 ×4 の順）。目標は行き止まりのうち最遠（同じ遠さが 2 つなら `SequenceRng` の値で選ぶ）。乱数は目標で 1 個 ＋ ほかの扉の数。行き止まりが 3 つなら扉 3 つ（下り階段・敵・宝箱）。行き止まりがない・どれも 5 歩未満なら、目標は全マスの最遠で扉なし（ほかの扉は行き止まりの数だけ） | 単体 | `tests/domain/doors.test.ts` |
| TC-0041-03 | 1 | シード 1〜1,000 の `generateFloors` で、扉の決まり（行き止まりの入口だけ・`up` でない・重ならない・`side` が開いた辺・中身の数・閉じている・目標の扉は `down`／`boss` と同じマス）を `floorViolations` が見て、違反がない。扉が 5 つの階が 99% 以上 | 単体 | `tests/domain/floors.test.ts` |
| TC-0041-04 | 2 | 閉じた扉へ前進すると移動せず「とびらが しまっている」、残っている宝箱のマスへ前進・後退すると移動せず「たからばこが ある」。どちらも乱数を引かず（`SequenceRng([])`）、踏破記録も変わらない。扉のマスの反対の辺（扉でない辺）から入ることはない（行き止まりなので）。扉が `gone` なら入れて、ふつうの遭遇判定をする | 単体 | `tests/domain/explore.test.ts` |
| TC-0041-05 | 3 | 視界：扉の前で扉を向くと `ahead: 'door'`・段 0 の `front: 'door'`・段は 1 つ。宝箱の扉を開けたあとは `ahead: 'chest'`・段 1 に `chest: true`。横を向くと `ahead: null`。視界のキーは `floor`・`facing`・`underfoot`・`ahead`・`depths` | 単体 | `tests/domain/view.test.ts` |
| TC-0041-06 | 3 | 画面：扉の前で扉を向くと、操作の行の階段・帰還ボタンの場所に「扉をあける」が出る（入口のマスで扉を向いても「扉をあける」）。向きを変えると「宿屋へ戻る」（入口）・なし に戻る。メニューボタンの位置が変わらない | E2E | `e2e/dungeon.spec.ts` |
| TC-0041-07 | 4 | 下り階段の扉の `openDoor`：「とびらを あけた！」「おくに くだり階段が ある」、扉が `gone`、位置・向き・乱数は変わらない。そのあと前進すると下り階段のマスに入れ、`stairs('down')` で下りられる | 単体 | `tests/domain/doors.test.ts` |
| TC-0041-08 | 5 | 宝箱の扉の `openDoor`：「とびらを あけた！」「たからばこを みつけた！」、扉が `chest`。`openChest`：「たからばこを あけた！」「たからばこから 名前［R］（能力 +n）を てにいれた！」（`rarity`。UR・LG は `rareDrop`）、扉が `gone`、所持品の末尾に 1 個。乱数は 部位 → 段階 → レアリティ → 補正値 の 4 個（`SequenceRng` で列を決めて確かめる。1F は段階 1、2F・3F は 1〜2、4F は 2〜3、5F は 3〜5） | 単体 | `tests/domain/doors.test.ts` |
| TC-0041-09 | 5 | 所持品 50 個で `openChest` すると `SWAP`（`pending.thenClear` false）。入れ替えをあきらめると `DUNGEON`、宝箱は `gone` のまま | 単体 | `tests/domain/doors.test.ts` |
| TC-0041-10 | 2・5 | 正面が扉でないときの `openDoor` は 409「ここには とびらは ない」、正面が宝箱でないときの `openChest` は 409「ここには たからばこは ない」、DUNGEON 以外では 409「その操作は いまは できない」。どれも状態が変わらない | 単体 | `tests/domain/doors.test.ts` |
| TC-0041-11 | 5・6 | 画面：宝箱の扉を開けると「たからばこを みつけた！」が出て、ボタンが「宝箱をあける」に変わる。押すと「たからばこから 〜を てにいれた！」（行の色はレアリティの色）が出てボタンが消える。宝箱を開けずに向きを変えて戻ると、また「宝箱をあける」が出る | E2E | `e2e/dungeon.spec.ts` |
| TC-0041-12 | 7 | 敵の扉の `openDoor`：「とびらを あけた！」「{その階の扉の敵}が あらわれた！」で `BATTLE`、`battle.door` が扉のマス、`battles` +1、扉は `closed` のまま。1F ゴブリン・2F スケルトン・3F オークロード・4F ダークナイト | 単体 | `tests/domain/doors.test.ts` |
| TC-0041-13 | 7 | 扉の敵に勝つと、経験値・ドロップはふつうの勝利と同じで、扉が `gone`。にげると扉は `closed` のまま、もう一度 `openDoor` すると同じ敵。扉でない戦闘のデータには `door` のキーがない | 単体 | `tests/domain/battle.test.ts` |
| TC-0041-14 | 7 | 画面：敵の扉を開けると、メッセージ欄が消えて「とびらを あけた！」「〇〇が あらわれた！」が出て、戦闘画面に移る。遭遇の音（`app:sound` の `encounter`）が鳴り、1000ms は戦闘のボタンが押せない | E2E | `e2e/dungeon.spec.ts` |
| TC-0041-15 | 8 | 5F のボスの扉の `openDoor`：「とびらを あけた！」「暗黒のネクロマンサーが あらわれた！」（`bossAppear`）でボス戦（`isBoss`・にげられない）。乱数を引かない | 単体 | `tests/domain/doors.test.ts` |
| TC-0041-16 | 9 | 疑似3D の線：正面の扉は枠 k+1 の矩形に加えて扉の 3 辺と取っ手（仕様書 §11.5 の式の座標）、左右の扉は壁の 3 本に加えて縦線 2 本と上の線、宝箱は「□ たからばこ」の文字。扉の線の種類は `door` | 単体 | `tests/logic/view-to-segments.test.ts` |
| TC-0041-17 | 9 | 地図：閉じた扉の辺は `doors` に入り（両端 3px 空ける）、`walls` に入らない。ゲーム API の地図は、閉じた扉の辺で `doors` と `walls` が true。扉が `gone` なら両方 false | 単体 | `tests/logic/map-to-shapes.test.ts`・`tests/domain/view.test.ts` |
| TC-0041-18 | 9 | 説明文：「前方は とびら。」「前方 2 マス先は とびら。」「左に とびら。」「1 マス先に たからばこ。」 | 単体 | `tests/logic/describe-view.test.ts` |
| TC-0041-19 | 9 | 画面：扉の前で、疑似3D に扉の線（`data-kind="door"`）が出る。扉にぶつかると段 0 の正面の壁の線が 200ms 点滅し、扉の線は点滅しない。地図に `wiz-map-door` の線が出る | E2E | `e2e/dungeon.spec.ts` |
| TC-0041-20 | 10 | ゲーム API：扉を開けて宿屋へ戻り、また出発すると、扉の状態（`gone`・`chest`）が同じ。敗北のあとの出発では、新しいマップで扉がすべて `closed`（`debugDungeon().doors`） | 単体 | `tests/api/game-api.test.ts` |
| TC-0041-21 | 1・10 | 結果に扉の中身が入らない：GameView の `dungeon` に `doors` のキーがなく、`ahead` は 'door'・'chest'・null だけ。`debugDungeon` だけが中身と状態を返す | 単体 | `tests/api/game-api.test.ts` |
| TC-0041-22 | 10 | 読み込み（仕様書 §21.4）：版 7 のプレイ中の状態（`doors` のないマップ）は、各階 `doors: []` で読め、ボスのマスに入るとボス戦。形の違う扉の要素は捨てる。`battle.door` が 0〜99 の整数でなければキーを消す | 単体 | `tests/domain/game-state.test.ts` |
| TC-0041-23 | 3・6 | 画面の大きさ：「扉をあける」「宝箱をあける」が 1 行で出て、操作の行の左の列からはみ出さない（375 × 667・414 × 715・1280 × 800） | E2E | `e2e/layout.spec.ts` |
| TC-0041-24 | 1〜10 | 実機：扉のボタンの出方・扉と宝箱の見え方・宝箱と扉の敵・遊んだ手ごたえ（WS-0027 の手動テスト） | 手動 | AC-0045 |

## 2. 準備

- 単体：`tests/helpers/maps.ts` の `openMap` に扉を足した場面（行き止まりは壁で作る。例：(3,3) の三方を壁にして南だけ開け、扉 `{ cell: 33, side: 'S' }`、扉の前のマスは (3,4)）。入力は `deepFreeze`。乱数は `SequenceRng`（列の数まで確かめる）。
- E2E：`?debug=1` の `__wiz.writeState` で、扉の前に立った場面を書く（`e2e/helpers.ts` に扉つきの地図を作る道具を足す）。保存の版は `GAME_SCHEMA_VERSION`（8）。

## 3. 手順（E2E）

1. 扉つきの場面（入口の隣に扉、少し先に宝箱の扉・敵の扉）を書き、`#/dungeon` を開く。
2. 扉の方を向く → 「扉をあける」を見る（TC-0041-06）。前進して点滅を見る（TC-0041-19）。
3. 宝箱の扉を開ける → 「宝箱をあける」→ 開ける（TC-0041-11）。
4. 敵の扉を開ける → 戦闘画面（TC-0041-14）。
5. 3 つの画面の大きさで、ボタンがはみ出さないことを見る（TC-0041-23）。

## 4. 手動の手順

WS-0027 の「WS の終わりの手動テスト」のとおり。結果は AC-0045 に書く。
