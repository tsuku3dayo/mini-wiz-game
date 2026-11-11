---
id: MWIZ-TC-0040
type: Test Case
title: クレジットを見る
status: stable
version: 1.1
updated: 2026-11-10
sources:
  - MWIZ-US-0039（v1.0）
  - MWIZ-TST-0001（v1.2）
  - MWIZ-TD-0002（v1.7）
  - MWIZ-TD-0004（v1.4）
  - MWIZ-TD-0005（v1.12）
  - MWIZ-GUI-0002（v1.4）
  - docs/specification-ja.md (v1.14) §11.2、§11.4、§11.5、§11.11、§12.2、§16.4、§27.4
verified: null
---

# TC-0040 クレジットを見る

- 対象：[US-0039](../02_requirements/MWIZ-US-0039-user-story-ja.md)（受け入れ条件 8 つ）
- 番号：テストケースの番号は user-story と同じにする決まりだが、TC-0039 は CI のテストケースに使ったので、US-0039 の確認は TC-0040 にした（欠番を再利用しない）。
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。
- `/credits` の曲の選び方は TC-0034-01、axe-core の検査は TC-0036-10、どの画面も横にはみ出さない・ボタンの大きさは TC-0035-02・03・04・12（`e2e/scenes.ts` にクレジットとタイトルの ErrorPanel を足す）で確かめる。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0040-01 | 1 | タイトルのメニュー（`aria-label="タイトル"`）の 4 つ目の項目が「クレジット」で、高さが「おと」の行と同じ（`getBoundingClientRect` の差 0.5px 以内）。セーブがないとき初めのカーソル（▶）は「はじめから」、セーブがあるとき「つづきから」 | E2E | `e2e/credits.spec.ts` |
| TC-0040-02 | 2 | 「クレジット」を選ぶ（`desktop`：↓ で動かして Enter、`pixel7`・`small`：タップ）と、ハッシュが `#/credits`、`body[data-screen="credits"]` になる。見出し（`role="heading"`、レベル 1）が「クレジット」。「もどる」のボタンがフォーカスされていて、見出しより左にある（ボタンの `right` ≦ 見出しの `left`）。見出しは画面の横の中央（中心の差 1px 以内） | E2E | `e2e/credits.spec.ts` |
| TC-0040-03 | 3 | `CREDITS` が、上から PRODUCER／DIRECTOR／GAME DESIGNER（つくだ よしはる）、GRAPHIC DESIGNER／SOUND CREATOR／PROGRAMMER（CLAUDE CODE）の 6 組と、文字まで同じ（「つくだ」と「よしはる」の間は半角スペース 1 つ）。凍っていて書き換えられない（`Object.isFrozen`） | 単体 | `tests/logic/credits.test.ts` |
| TC-0040-04 | 3 | 画面の `<dl>` の中に `<dt>`・`<dd>` の組が 6 つ、`CREDITS` と同じ順・同じ文字で出る。見出しの色が `rgb(201, 162, 39)`（frame）・24px。`<dt>` の色が `rgb(163, 155, 139)`（textSub）・13px・字間 1.3px（0.1em）。`<dd>` の色が `rgb(232, 220, 192)`（primary）・20px・太字（`font-weight` 700）。組がどれも画面の横の中央にある（中心の差 1px 以内）。メッセージ欄（`role="log"`）がない | E2E | `e2e/credits.spec.ts` |
| TC-0040-05 | 4 | 「もどる」をクリック（`desktop`）／タップ（`pixel7`・`small`）すると、ハッシュが `#/`、`body[data-screen="title"]` になり、タイトルのメニューが出る。もう一度開いて、フォーカスのある「もどる」で Enter、また開いて Esc でも同じ（キーは `desktop`） | E2E | `e2e/credits.spec.ts` |
| TC-0040-06 | 5 | 「もどる」のボタンの読み上げの名前（`getByRole('button', { name: 'もどる', exact: true })` で見つかる）が「もどる」で、「←」は `aria-hidden="true"` の中にある。`<dt>` と `<dd>` が同じ `<dl>` の中にある | E2E | `e2e/credits.spec.ts` |
| TC-0040-07 | 6 | 音をオンにしてタイトルを開き、`app:bgm` の記録（`e2e/helpers.ts`）を取りながら、タイトル → クレジット → タイトルと移る。`app:bgm` は最初のタイトルの曲（`title`）の 1 回だけで、クレジットに移ったとき・戻ったときには出ない（曲を替えない＝止まらず頭に戻らない） | E2E | `e2e/credits.spec.ts` |
| TC-0040-08 | 7 | プレイ中のゲーム（INN）があるとき `#/credits` を開くと、ハッシュが `#/inn`、`body[data-screen="inn"]` になる | E2E | `e2e/credits.spec.ts` |
| TC-0040-09 | 8 | セーブのあるタイトルで書き込みを失敗させて ErrorPanel を出した状態で、375 × 667・414 × 715（`pixel7`・`small`）、1366 × 657（`desktop`）にしたとき、`documentElement.scrollHeight − innerHeight` が 0 以下（4 行のメニューとエラーの枠があっても縦に収まる）。`.title-main` の上下の `padding` が、375 × 667・1366 × 657 で 16px、414 × 715 で 32px（v1.1。仕様書 v1.13 §11.3） | E2E | `e2e/credits.spec.ts` |
| TC-0040-10 | 3、4、6 | iPhone 11 と PC で、タイトルのメニューに「クレジット」が「おと」と同じ見た目で出て、クレジット画面の文字が読め、中央にそろって見え、例の画像の並び方と同じに見える。「← もどる」でタイトルに戻れる。音をオンにしていれば、タイトルの曲が途切れない | 手動 | 実機（iPhone 11・PC） |

## 2. 準備

- E2E：`?debug=1` で開き、ゲームのない状態はプレイ中の状態を消した新しいコンテキストで開く。セーブは `__wiz.writeSave`（`e2e/helpers.ts` の `writeScene`）で置く。書き込みの失敗は `e2e/scenes.ts` の `failWrites`（TC-0012-07 と同じ）。
- 単体：`logic/credits.ts` の `CREDITS` を直接読む。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0040-01 | セーブなし・ありの 2 通りで開き、メニューの項目の文字・▶ の位置・行の高さを見る |
| TC-0040-04 | `getComputedStyle` で色・大きさ・字間・太さを見る。中心は `getBoundingClientRect` の `left + width / 2` と `innerWidth / 2` を比べる |
| TC-0040-07 | 音の設定 `mini-wiz-game-sound` を `on` にして開く → 最初の `app:bgm`（`title`）を待つ → クレジットへ → 「もどる」→ タイトルのメニューが出てから 1 秒待ち、記録の `bgm` の数が 1 のまま |
| TC-0040-09 | `pixel7`・`small` では `setViewportSize` で 375 × 667 と 414 × 715、`desktop` では 1366 × 657 にして開き直し、TC-0012-07 と同じ手順で ErrorPanel を出してから測る |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0040-10 | iPhone 11 の Safari（またはホーム画面のアプリ）と PC の Chrome で公開 URL を開き、音をオンにする。タイトルのメニューの「クレジット」を選び、画面を見て、「← もどる」で戻る。PC では Esc でも戻る | 「クレジット」の行が「おと」と同じ見た目。クレジット画面の 6 組が読め、中央にそろい、例の画像（`docs/requests/credits/credits-example.png`）と同じ並び。タイトルに戻れる。曲が途切れない |
