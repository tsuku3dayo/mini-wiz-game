---
id: MWIZ-AC-0008
type: Attested Computation
title: ダンジョンのルールとゲーム API の実施記録
status: stable
version: 1.0
updated: 2026-11-02
sources:
  - MWIZ-TASK-0008（v1.0）
  - MWIZ-TC-0012（v1.2）
  - MWIZ-TC-0013（v1.0）
  - MWIZ-TC-0014（v1.0）
  - MWIZ-TC-0015（v1.0）
  - MWIZ-TC-0016（v1.0）
  - MWIZ-TC-0017（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0002（v1.8）
verified: { by: "tsuku3dayo", at: "2026-11-02T14:23:27+09:00" }
---

# AC-0008 ダンジョンのルールとゲーム API の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0008](../06_plan/MWIZ-TASK-0008-implementation-task-ja.md) ダンジョンのルールとゲーム API |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0008-dungeon-rules` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの（画面は変えていない。ダンジョンの画面は TASK-0009）：

- ルール（`src/domain/`）
  - `dungeon.ts`：1 階分の壁（全壁 → 再帰バックトラッカーの完全迷路 → 内部の壁の 10% を消してループ）、最短歩数、壁の違反の列挙、移動と回転、座標の補助
  - `floors.ts`：5 階層の生成（1 階 110 個・計 550 個の乱数）、1 階分の不変条件の違反の列挙
  - `explore.ts`：出発・移動（踏破記録 → 遭遇判定）・敵の選択・階段・帰還・`visitCurrent`
  - `view.ts`：視界（最大 4 段）・地図（今の階、未踏破は null）・階段の種類
  - `battle.ts` の `startBattle`（前倒し）：移動で遭遇すると戦闘が始まるため。戦闘の中身は TASK-0010
- ゲーム API：`enterDungeon`・`move`・`stairs`・`returnToInn`・`debugDungeon`。`move`・`stairs` の引数の検査。GameView の `dungeon` に視界と地図を入れた
- テストの道具：`tests/helpers/maps.ts` に `dungeonState`・`constantRng`・`noRng`・`addWall`

設計の直し（TD-0002 v1.4）：

- 仕様書に文言のなかった、`move`・`stairs` の引数の違反の文を、v1.0 の DTO（class-validator）の既定の文と同じにした（§1.5）
- `startBattle` を作る順を前倒しした（§5）
- 参照する成果物の版の表記を直した。承認済みの AC-0004〜0006 は、版の表記だけを直した（CLAUDE.md の決まり。オーナーの了承：2026-11-02）

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0013-01 | 単体（`tests/domain/explore.test.ts`） | OK。INN から出発すると DUNGEON・戦闘 null・5 階（壁 100 個ずつ）・1F の入口に北向き。踏破は 1F の入口だけ。HP 10・MP 4 のまま。「ダンジョンに ふみこんだ」 |
| TC-0013-02 | 単体（同上） | OK。DUNGEON・BATTLE・SWAP・CLEARED では 409「その操作は いまは できない」 |
| TC-0014-01 | 単体（同上） | OK。前進・後退は向きを変えず、回転は位置を変えない。外周と内側の壁で「かべだ」、状態・踏破記録は変わらず、乱数を引かない |
| TC-0016-01 | 単体（同上） | OK。1F の下り階段（東向き）で降りると 2F の上り階段に東向き、踏破済み、「2F に おりた」。上ると 1F の下り階段、「1F に のぼった」。乱数を引くと例外になる Rng で通り、HP・MP・経験値・壁・ほかの階の記録は同じ |
| TC-0016-02 | 単体（同上） | OK。階段でないマス・5F で下り →「ここには くだり階段は ない」、1F の入口・上り階段でないマスで上り →「ここには のぼり階段は ない」、場所が違う →「その操作は いまは できない」 |
| TC-0017-01 | 単体（同上） | OK。1F の入口で戻ると INN・ダンジョンと戦闘は null・「宿屋に もどった」 |
| TC-0017-02 | 単体（同上） | OK。入口でないマス・2F の上り階段 →「入口に いないため もどれません」、INN・BATTLE →「その操作は いまは できない」 |
| TC-0017-03 | 単体（同上） | OK。HP 10・MP 4・経験値 15・所持品 3 個・装備・実績が戻る前と同じ |
| TC-0013-04 | 単体（`tests/domain/floors.test.ts`） | OK。シード 1〜1,000 の全 5,000 階で違反なし |
| TC-0013-05 | 単体（同上） | OK。同じシードで同じ。シード 1〜100 の 1F はすべて違い、各出撃の 5 階も互いに違う |
| TC-0013-06 | 単体（同上） | OK。1 回の最大（50ms 未満）も、1,000 回の合計（10 秒未満）も基準の内（このテストファイル全体で約 1 秒） |
| TC-0013-07 | 単体（同上） | OK。`SeededRng(2026)` で初期位置 (9,1) 北向き、続けて 696131、SHA-256 の先頭 `18a58bdf4b596269`（仕様書の参考値と一致） |
| TC-0014-06 | 単体（`tests/domain/view.test.ts`） | OK。1 段・4 段・3 段の例。シード 1〜50 × 全マス × 4 方向で、段は 1〜4、正面の壁で止まる、視界の外のマスの壁をすべて反転しても同じ、キーは 4 つだけ |
| TC-0015-02 | 単体（同上） | OK。cells 100 個、未踏破は null、踏破済みは四方の壁（隣が未踏破でもその境界の壁）と階段（1F の up は entrance、2F の up は up、down は down）。player は x・y だけ |
| TC-0012-03 | 単体（`tests/api/game-api.test.ts`） | OK。書く直前の読み直しで revision が進んでいると、move は 409 conflict「他の操作と競合しました」、保存はほかのタブの値のまま |
| TC-0012-05 | 単体（同上） | OK。game に書けないと move は 500 storage_error「保存できませんでした」で保存は同じ。save に書けないとセーブは前のまま |
| TC-0013-03 | 単体（同上） | OK。出発 → 戻る → 出発で、2 回目の walls・up・down が 1 回目と違う |
| TC-0038-03 | 単体（同上） | OK。5F で debugDungeon は今の階の壁 100 個・up・down（null）・boss・visited・player を返す。move の結果には壁の配列・boss・up・down・visited・floors・revision などがなく、dungeon のキーは 5 つ。ゲームなしは 404、宿屋では 409「ダンジョンに いません」 |

確認 ID のないテストも足した：1 階分で引く乱数の数（108 個）と残る内部の壁（73 本）、5 階層で 550 個・踏破は入口だけ、候補が 1 つでも `int(0,0)` を引く、遭遇（[21] で遭遇なし、3F の [20, 31] でスケルトン・battles +1、移動先は踏破済み）、`pickEnemy` の境界、階段・入口では遭遇しない、5F のボスのマスで必ずボス戦（bossAppear）・踏破済みにならない、`visitCurrent`、視界の leftFront・rightFront・階段、引数の 400。

手元で通したもの（2026-11-02）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID）、単体 62 件、build、check:dist OK
- `npm run test:e2e`：111 件通った・12 件はその端末の対象外で飛ばした
- スクリーンショット：画面を変えていないので撮っていない

CI の結果（PR #38、2026-11-02）：`check`（verify）OK 1 分 1 秒、`e2e` OK 1 分 40 秒。マージのあと、main の test・pages も成功した。

### WS-0003 の終わりの手動テスト（2026-11-02、オーナー）

この TASK に手動の確認 ID はない。ここで作った迷宮の生成と移動は、WS-0003 の手動テスト（TC-0002-07・TC-0014-08、iPhone 11 のホーム画面のアプリでダンジョンに入り、移動ボタンで歩く。AC-0009）で使われ、OK だった。

## 3. 確認できなかったこと

- 手動の確認 ID はこの TASK にない（WS-0003 の手動テスト TC-0002-07・TC-0014-08 は TASK-0009 の画面で行う）。
- 遭遇率・敵の比率の統計（TC-0018）と、戦闘の中身は TASK-0010 で確かめる。
- テスト用の入口 `window.__wiz.debugDungeon()`（画面の側）は TASK-0009 でつなぐ。→ つないで E2E で確かめた（AC-0009 の TC-0038-02）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。一時ファイルは作っていない。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面の変更なし）
- [x] 設計と違う作りにしたら、TD・GUI を直した（TD-0002 v1.4）
- [x] AC-0008（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #38）
- [x] マージされた（マージ = 公開。2026-11-02、公開の実行が成功したことを確かめた）
