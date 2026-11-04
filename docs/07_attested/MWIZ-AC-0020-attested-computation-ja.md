---
id: MWIZ-AC-0020
type: Attested Computation
title: BGM の監督（場面と曲）の実施記録
status: draft
version: 1.0
updated: 2026-11-04
sources:
  - MWIZ-TASK-0020（v1.0）
  - MWIZ-TC-0032（v1.0）
  - MWIZ-TC-0034（v1.0）
  - MWIZ-TC-0038（v1.0）
  - MWIZ-TD-0005（v1.4）
verified: null
---

# AC-0020 BGM の監督（場面と曲）の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0020](../06_plan/MWIZ-TASK-0020-implementation-task-ja.md) BGM の監督（場面と曲） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0020-bgm-director` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの：

- `logic/bgm-scene.ts`：`sceneBgm(pathname, state, active)`（仕様書 §26.7 のとおり。ボスの出現・撃破の演出中と、ボスを倒したあと宿屋に戻るまでは null）
- `audio/bgm-director.ts`：ストア・メッセージキュー・音の設定の変化と、画面の切替えのたびに曲を決め直し、変わったら `playBgm(曲, 効果音の残り秒)` か `stopBgm()`、そして `app:bgm`（`{ name }`）を出す。音がオフなら null
- つなぎ（`main.ts`）：ルーターの `onScreenChange` から監督の `update()` を呼ぶ（画面のパスは `pathOf(router.current)`）。監督はルーターより後に購読するので、画面が替わってから曲を決める。エラーの画面でも、ルーターが同じ画面の名前のままなので曲は止まらない
- `audio/sound-setting.ts`：オンにしたとき、確認音（toggle）を鳴らしてから設定の変化を知らせる順に替えた（監督が、確認音の残りのあとでタイトルの曲を始められるように。TC-0034-11）
- `e2e/helpers.ts`：`app:sound`・`app:bgm` を時刻と画面つきで記録する `recordAudio` など

設計との違い：TD-0005 §1 は監督が「ルーターを購読する」と書くが、ルーターには購読の口がないので、ルーターの `onScreenChange` から呼ぶ形にした（働きは同じ）。TD は直していない。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0034-01 | 単体（`tests/logic/bgm-scene.test.ts`） | OK。`/`・`/new` → title、`/inn` → inn、`/dungeon`・`/swap` → dungeon、`/battle` → battle（状態なし・勝利のメッセージ中も）、ボス戦 → boss。ほかのパスは null |
| TC-0034-05 | 単体（同上） | OK。`/clear`、場所が CLEARED ならどのパスも null |
| TC-0034-12 | 単体（同上） | OK。bossAppear・bossDefeat の演出中はどのパスも null、levelUp・rareDrop では止めない |
| TC-0034-14 | 単体（同上） | OK。SWAP でダンジョンなしは null、ダンジョンありの `/swap` は dungeon |
| TC-0034-03 | E2E（`e2e/sound.spec.ts`。pixel7・small・desktop） | OK。タイトル → 名前入力（そのまま）→ 宿屋 → ダンジョン → 戦闘で title・inn・dungeon・battle、ボスの手前から前進して dungeon・null・boss |
| TC-0034-06 | E2E（同上） | OK。ボスを倒してクリア画面まで進め、さらに 5 秒進めても null のまま |
| TC-0034-08 | E2E（同上） | OK。宿屋のメニュー → ステータス（desktop はそうび）→ もどる → 閉じる、通常の入れ替え → あきらめる → ダンジョンで、イベントなし |
| TC-0034-11 | E2E（同上） | OK。遭遇で sound:encounter → bgm:battle の順。音がオフのタイトルでオンにすると sound:toggle → bgm:title の順 |
| TC-0034-13 | E2E（同上） | OK。ボスの演出が立つと null、1199ms ではそのまま、1200ms で boss。演出をクリックで飛ばすとすぐ boss |
| TC-0034-15 | E2E（同上） | OK。ボスを倒すと null だけで、クリア画面の「宿屋へ」で inn。所持品 50 個では入れ替え画面でも null のまま、再読み込みしてもイベントなし |
| TC-0034-16 | E2E（同上） | OK。通常の敵に勝つと、戦闘の画面のあいだイベントなし、ダンジョンの画面で dungeon。倒れると宿屋で inn |
| TC-0034-20 | E2E（同上） | OK。ダンジョンの「メニュー → おと」でオフにすると null |
| TC-0034-21 | E2E（同上） | OK。書き込みに失敗して ErrorPanel が出ても、イベントなし（dungeon のまま） |
| TC-0038-08 | E2E（`e2e/debug.spec.ts`） | OK。音がオフの遭遇で `{ name: 'encounter', muted: true }`、BGM のイベントなし。オンで宿屋 → ダンジョンへで dungeon、オフで null、もう一度オンで `{ name: 'dungeon' }` |
| TC-0032-18 | 手動（iPhone 11） | （WS の終わりにオーナーが確かめて書く） |
| TC-0034-04 | 手動（iPhone 11・PC） | （同上） |
| TC-0034-18 | 手動（iPhone 11・PC） | （同上） |
| TC-0034-23 | 手動（iPhone 11・PC） | （同上） |

手元で通したもの（2026-11-04）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID。テストにある確認 ID は 270 → 284 で、この TASK の自動の 14 個の分だけ増えた）、単体 175 件、build、check:dist OK
- `npm run test:e2e`：410 件通った・31 件はその端末の対象外で飛ばした
- スクリーンショット：撮っていない（画面を変えていない。音だけ）

CI の結果：（PR を出したあとに書く）

## 3. 確認できなかったこと

- 曲の聞こえ方（つなぎ目・音量の下がり方・曲の印象）は E2E ではわからない。WS の終わりに TC-0032-18・TC-0034-04・18・23 で、オーナーに iPhone 11 と PC で聴いてもらう。
- Android の実機はない（WS-0009 のとおり、E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面の変更なし）
- [x] 設計と違う作りにしたら、TD・GUI を直した（ルーターのつなぎ方の書き方だけで、働きは同じ。上に書き、TD は直していない）
- [x] AC-0020（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑
- [ ] マージされた（マージ = 公開）
