---
id: MWIZ-TC-0035
type: Test Case
title: スマートフォンの画面で快適に遊ぶ
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0035（v1.1）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0001（v1.1）
  - docs/specification-ja.md (v1.2) §1.3、§11.1、§11.3、§11.11、§11.12、§14、§15.4、§16.4、§16.6
verified: null
---

# TC-0035 スマートフォンの画面で快適に遊ぶ

- 対象：[US-0035](../02_requirements/MWIZ-US-0035-user-story-ja.md)（受け入れ条件 6 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。
- 「どの画面も」は、タイトル・名前入力・宿屋・ダンジョン・戦闘・ゲームクリア・入れ替え・そうび・もちもの・ステータスの 10 画面と、宿屋・ダンジョンのメニュー（GameMenu）・確認（ConfirmMenu）・ErrorPanel を出した状態をいう。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0035-01 | 1 | タップ（`page.tap`）だけで、タイトル →「はじめから」→ 名前入力 → 宿屋（やすむ・セーブ・メニュー・そうび・もちもの・ステータス）→ ダンジョン（移動ボタン・階段・宿屋へ戻る・ヒール）→ 戦闘（たたかう・ヒール・にげる）→ 入れ替え → ゲームクリア →「宿屋へ」まで進められる。逐次表示の途中はメッセージ欄のタップで残りが出る。キー操作を 1 回も使わない | E2E（タッチ） | `e2e/layout.spec.ts` |
| TC-0035-02 | 1 | `pixel7`（412×839）・`small`（375×667）で、どの画面も `documentElement.scrollWidth − innerWidth` が 0 以下（横にはみ出さない） | E2E（タッチ） | `e2e/layout.spec.ts` |
| TC-0035-03 | 1 | `pixel7`・`small` で、どの画面も、見えているボタン（`.wiz-button`・移動ボタン・メニューボタン）の `getBoundingClientRect` が幅・高さとも 48px 以上、メニューの行（`role="menuitem"`）の高さが 44px 以上。`desktop`（マウス）では、メニューの行の高さが 25.6px | E2E | `e2e/layout.spec.ts` |
| TC-0035-04 | 1 | `setViewportSize({ width: 414, height: 715 })` にして、どの画面も `documentElement.scrollHeight − innerHeight` が 0 以下（1 画面に収まる）、横のはみ出しも 0 以下 | E2E（タッチ） | `e2e/layout.spec.ts` |
| TC-0035-05 | 1 | iPhone 11 の Safari（ツールバーあり）で、どの画面も縦にスクロールせずに全部が見える | 手動 | 実機（iPhone 11） |
| TC-0035-06 | 2 | `meta[name="viewport"]` の `content` に `viewport-fit=cover` がある。画面の外枠（GameFrame の `<main>`・タイトルとクリアの `<main>`）と更新の帯（`#update-banner`）のスタイルに `env(safe-area-inset-top)`・`-bottom`・`-left`・`-right` を使った値が入っている（`document.styleSheets` の規則の文字で確かめる）。安全領域がない Chromium では、外枠の余白が 8px | E2E | `e2e/layout.spec.ts` |
| TC-0035-07 | 2 | iPhone 11 のホーム画面のアプリとして開いたときと Safari で開いたときに、どの画面も、ノッチ・ステータスバー・ホームバーに文字・ボタン・線が入り込まない（更新の帯を含む） | 手動 | 実機（iPhone 11） |
| TC-0035-08 | 3 | 操作するとき、指で疑似3D・メッセージ欄・ステータスなど大事な表示が隠れない | 手動 | 実機（iPhone 11） |
| TC-0035-09 | 4 | `meta[name="viewport"]` の `content` が `width=device-width, initial-scale=1, viewport-fit=cover` で、`user-scalable=no`・`maximum-scale` を含まない。`html`・`body` の `touch-action` が `none` でない | E2E | `e2e/layout.spec.ts` |
| TC-0035-10 | 5 | `body` の `font-size` が 16px・`line-height` が 1.6 倍（25.6px）・文字色 `rgb(232, 220, 192)`（`#E8DCC0`）・背景 `rgb(11, 10, 15)`（`#0B0A0F`）。`font-family` の先頭が `"MS Gothic"` で、Web フォント（`.woff`・`.woff2`・`.ttf`・`.otf`）の通信が 1 つもない。StatusPanel の数字の要素の `font-variant-numeric` が `tabular-nums` で、値が 3 桁右揃え（例「HP 25/ 46」「MP 10/ 16」） | E2E | `e2e/layout.spec.ts` |
| TC-0035-11 | 5 | iPhone 11 で、どの画面の文字も読める大きさ・色で出て、ステータス（宿屋の full・ダンジョンと戦闘の 1 行）の数字の桁がそろって見える | 手動 | 実機（iPhone 11） |
| TC-0035-12 | 6 | `desktop`（1280×800）と、`setViewportSize` で 1366×657 にしたとき、どの画面も横・縦のはみ出しが 0 以下。外枠の幅が 800px 以下で中央にある（左右の余白の差が 1px 以内）。宿屋・ダンジョン・戦闘で `[data-testid="column-left"]` と `"column-right"` が横に並ぶ（右の列の `left` が左の列の `right` 以上、上端がそろう） | E2E | `e2e/layout.spec.ts` |

## 2. 準備

- E2E：`?debug=1` で開き、各画面の状態を `__wiz.writeState`・`writeSave` で作る（`e2e/helpers.ts` の `startAt`）。メニュー・確認は画面を開いてからボタンで出し、ErrorPanel は `Storage.prototype.setItem` を例外を投げるものに替えてから操作して出す。はみ出しは `page.evaluate` で `documentElement.scrollWidth − innerWidth`・`scrollHeight − innerHeight` を測る（TST-0001 §5）。
- 手動：iPhone 11 の Safari で公開 URL を開く。ホーム画面のアプリは「共有 → ホーム画面に追加」で作っておく。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0035-01 | 空の端末内保存で開き、`page.tap` だけで表の順に進める（戦闘・ドロップ・満杯・ボスは `useSeed` と `writeState` で途中の状態を作ってよいが、各画面の中の操作はタップで行う） |
| TC-0035-02 | 各画面・各状態を出すたびに横のはみ出しを測る |
| TC-0035-03 | 各画面・各状態で、見えているボタンとメニューの行をすべて集めて大きさを測る |
| TC-0035-04 | `setViewportSize({ width: 414, height: 715 })` にしてから、TC-0035-02 と同じ画面・状態を順に出して測る |
| TC-0035-10 | `page.on('request')` でフォントのファイルの通信を数えながら、タイトル → 宿屋 → ダンジョンを開く。宿屋で HP 25／46・MP 10／16 の状態にして StatusPanel の文字を見る |
| TC-0035-12 | `desktop` のまま全画面を測る → `setViewportSize({ width: 1366, height: 657 })` にしてもう一度測る |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0035-05 | iPhone 11 の Safari（下のツールバーが出ている状態）で、10 画面とメニュー・確認を順に出す | どれも縦にスクロールせずに全部が見える |
| TC-0035-07 | iPhone 11 のホーム画面のアプリと Safari で、タイトル・宿屋・ダンジョン・戦闘を出す。`?debug=1` の `__wiz.showUpdateBanner()` で更新の帯も出す（Safari で） | ノッチ・ステータスバーに上の文字・線が、ホームバーに下のボタン・線がかからない |
| TC-0035-08 | iPhone 11 の Safari で、右手の親指でダンジョンの移動ボタン・メニュー、戦闘のコマンド、宿屋のコマンドをそれぞれ 10 回押す | 押している間、疑似3D・メッセージ欄・ステータス・敵の名前が指で隠れない。押し間違えない |
| TC-0035-11 | iPhone 11 で、10 画面を腕を伸ばした距離で見る。HP・MP が 1 桁・2 桁・3 桁の状態を作ってステータスを見る | 文字が読める。暗い色の文字（版・補足・無効の項目）も読める。数字の桁（スラッシュの位置）がそろう |
