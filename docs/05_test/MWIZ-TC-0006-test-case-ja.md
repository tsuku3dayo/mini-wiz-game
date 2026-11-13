---
id: MWIZ-TC-0006
type: Test Case
title: タイトル画面から始める
status: stable
version: 1.5
updated: 2026-11-11
sources:
  - MWIZ-US-0006（v1.4）
  - MWIZ-TST-0001（v1.2）
  - MWIZ-TD-0002（v1.10）
  - MWIZ-TD-0003（v1.7）
  - MWIZ-TD-0004（v1.9）
  - MWIZ-GUI-0002（v1.5）
  - docs/specification-ja.md (v1.21) §10.1、§11.2、§11.4、§11.5、§16.4、§19.1、§27.4
verified: null
---

# TC-0006 タイトル画面から始める

- 対象：[US-0006](../02_requirements/MWIZ-US-0006-user-story-ja.md)（受け入れ条件 5 つ。v1.1 でタイトル画像の確認 TC-0006-09〜13 を足した）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0006-01 | 1 | タイトル画面に、`<h1>` の中のタイトル画像（`<img>`、`src` が `title/title.png`）、メニュー（`role="menu"`、`aria-label="タイトル"`）の項目が上から「はじめから」「つづきから」「おと：オフ」「クレジット」（v1.3。仕様書 v1.12）、「インストール」のボタン、「v1.0」が出る。メッセージ欄（`role="log"`）がない | E2E | `e2e/title.spec.ts` |
| TC-0006-02 | 1 | 版の表記の関数が、`package.json` の `version` の先頭 2 つに「v」を付けて返す（`"1.0.0"` → `"v1.0"`、`"1.2.3"` → `"v1.2"`） | 単体 | `tests/logic/version.test.ts` |
| TC-0006-03 | 2 | どれかのスロットにセーブ（名前「ゆうしゃ」・Lv12）があるとき、「つづきから」の行に ▶ があってフォーカスされる。行の文字は「つづきから」だけ（v1.4 で右の「ゆうしゃ Lv12」をなくした） | E2E | `e2e/title.spec.ts` |
| TC-0006-04 | 2 | セーブがないとき、カーソルは「はじめから」。「つづきから」の行は `aria-disabled="true"` で、文字の色が disabled（`#8C857A`。`rgb(140, 133, 122)`）。選んでも画面は `title` のまま、ハッシュは `#/` のまま、`body[data-busy]` が `true` にならず、何も出ない | E2E | `e2e/title.spec.ts` |
| TC-0006-05 | 3 | 「はじめから」を決定すると、ハッシュが `#/new`、`body[data-screen="new"]` になる | E2E | `e2e/title.spec.ts` |
| TC-0006-06 | 4 | プレイ中のゲームがないとき、`#/inn`・`#/dungeon`・`#/battle`・`#/clear`・`#/swap`・`#/nothing`・ハッシュなし を開くと、ハッシュが `#/`、`body[data-screen="title"]` になる。`#/new` を開くと名前入力のまま、`#/credits` を開くとクレジットのまま（v1.3）。置き換えなので `history.length` が増えない | E2E | `e2e/title.spec.ts` |
| TC-0006-07 | 5 | プレイ中のゲームの場所が INN・DUNGEON・BATTLE・CLEARED・SWAP のとき、`#/`・`#/new`・`#/credits`（v1.3）・ほかの画面のハッシュのどれを開いても、それぞれ `#/inn`・`#/dungeon`・`#/battle`・`#/clear`・`#/swap` になる | E2E | `e2e/title.spec.ts` |
| TC-0006-09 | 1 | タイトル画像の `alt` が「WIZミニ ～死霊術師の迷宮～」で、見出し（`role="heading"`、レベル 1）の名前も同じ。`<img>` に `width="1080"`・`height="720"` がある。画像が読み込まれている（`naturalWidth` が 1080）。飾り線（`.deco`）・副題の文字は出ていない | E2E | `e2e/title.spec.ts` |
| TC-0006-10 | 1 | 画像の表示の大きさ：375 × 667 で横 359 × 縦 239.3、414 × 715 で 398 × 265.3、1280 × 800 で 450 × 300（横：縦が 3：2、横は最大 450）。中央にある（左右の余白の差 1px 以内） | E2E | `e2e/title.spec.ts` |
| TC-0006-11 | 1 | 画像を読めなくすると（`page.route` で `title/title.png` を止める）、`<img>` が消え、`<h1>` の文字が「WIZミニ」、その下に「～ 死霊術師の迷宮 ～」が出る。エラーの表示は出ない | E2E | `e2e/title.spec.ts` |
| TC-0006-12 | 1 | `public/title/title.png` があり、PNG の署名・`IHDR`・幅 1080・高さ 720、MD5 が仕様書 §13.6 の値（`36dd93edda255751560af6e4bcfb1aab`。v1.2 で v2 の画像に）と同じ | 単体 | `tests/assets/title-image.test.ts` |
| TC-0006-13 | 1 | iPhone 11 で、タイトル画像がぼやけず、文字（「WIZミニ」「～死霊術師の迷宮～」）が読め、メニューと重ならずに 1 画面に収まる。PC でも同じ | 手動 | 実機（iPhone 11・PC） |
| TC-0006-14 | 2 | 「つづきから」のスロットの一覧（見出し「つづきから」）を出しても、375 × 667・414 × 715（`pixel7`・`small`）、1366 × 657（`desktop`）のどれでも縦にはみ出さない。書き込みを失敗させてスロットを選ぶと、一覧が閉じてタイトルのメニュー（カーソルは「つづきから」）に戻り、その下に ErrorPanel が出て、やはりはみ出さない（`documentElement.scrollHeight − innerHeight` が 0 以下。v1.5：仕様書 v1.15） | E2E | `e2e/title.spec.ts` |
| TC-0006-08 | 5 | プレイ中のゲームがある（INN）とき、`#/nothing` を開くと `#/` を経て `#/inn` になり、宿屋の画面が出る | E2E | `e2e/title.spec.ts` |

## 2. 準備

- E2E：`?debug=1` で開き、`__wiz.writeState`・`writeSave` で状態とセーブを作る（`e2e/helpers.ts`）。ゲームがない場面は、`mini-wiz-game-game` のない新しいコンテキストで開く。
- 単体：`version.ts` に `version` の文字列を渡して呼ぶ。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0006-10 | 3 つの大きさで `setViewportSize` して開き直し、`getBoundingClientRect` で幅・高さ・左右の余白を測る（0.5px まで許す） |
| TC-0006-11 | `test.use({ serviceWorkers: 'block' })` で、`page.route('**/title/title.png', r => r.abort())` にしてから開く（Service Worker が保存したファイルを先に出さないように。SDD-PROCESS §8「05 テスト」） |
| TC-0006-04 | セーブなしで開く → ↓ で「つづきから」へ動かして Enter（`desktop`）／タップ（`pixel7`・`small`）→ 500ms 待って、画面・ハッシュ・`data-busy` が変わらない |
| TC-0006-06 | `page.goto('/?debug=1#/inn')` などで開き直し、`waitForURL(/#\/$/)` を待つ。`history.length` を前後で比べる |
| TC-0006-07 | 場所ごとに `writeState` で状態を作り、ハッシュを替えて開き直す。`body[data-screen]` とハッシュを確かめる |
| TC-0006-08 | 宿屋の状態で `#/nothing` を開く → ハッシュが `#/inn`、`body[data-screen="inn"]`。どちらも置き換えなので `history.length` が増えない（`#/` を経たことは画面に出ないので、行き先と履歴だけを見る） |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0006-13 | iPhone 11 の Safari と PC の Chrome で公開 URL のタイトル画面を開き、腕を伸ばした距離で見る。セーブのある状態でも見る | 画像がぼやけず、文字が読める。画像とメニュー・版の表記が重ならず、縦にスクロールせずに全部見える |
