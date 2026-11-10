---
id: MWIZ-AC-0025
type: Attested Computation
title: タイトル画像と名前「WIZミニ」の実施記録
status: stable
version: 1.0
updated: 2026-11-06
sources:
  - MWIZ-TASK-0025（v1.0）
  - MWIZ-TC-0001（v1.1）
  - MWIZ-TC-0002（v1.1）
  - MWIZ-TC-0006（v1.3）
  - MWIZ-TD-0004（v1.3）
  - MWIZ-TD-0005（v1.12）
verified: { by: "tsuku3dayo", at: "2026-11-06T09:24:04+09:00" }
---

# AC-0025 タイトル画像と名前「WIZミニ」の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0025](../06_plan/MWIZ-TASK-0025-implementation-task-ja.md) タイトル画像と名前「WIZミニ」（変更の依頼 `docs/requests/2026-11-05-spec-1.3-title-image.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0025-title-image` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.0.5、Playwright 1.64.1 の Chromium |

作ったもの：

- `public/title/title.png`：`docs/requests/title/wiz_mini_title.png` を名前を付け替えて置いた（中身は同じ。MD5 `b7bdabf36d32d509c17da90df9e73120`）
- `src/logic/title-image.ts`：画像の URL・大きさ・読み上げの名前・読めないときの文字
- `src/ui/screens/title.ts`：飾り線・「WIZ」・副題をなくし、`<h1 class="title-logo">` の中に `<img>`（`alt`「WIZミニ ～死霊術師の迷宮～」、`width` 1080・`height` 720）。`error` で画像を消し、`<h1>` を文字の「WIZミニ」（`.logo`）にして、下に副題（`.subtitle`）を足す
- `src/ui/style.css`：`.title-image`（横幅いっぱい・最大 450px・3：2）。使わなくなった飾り線（`.deco`）のスタイルを消した（blood 色の CSS 変数は残す）
- 名前「WIZミニ」：`index.html`（`<title>`・`apple-mobile-web-app-title`）、`vite.config.ts`（manifest の `name`・`short_name`）
- `scripts/check-dist.mjs`：manifest の `name` が「WIZミニ」、`title/title.png` が 1080 × 720 で事前キャッシュにある
- 文書：`README.md`（名前とクレジット）、`CLAUDE.md`（1 行目の説明）、`docs/reproduction-specification.md`（第 1 部を仕様書 v1.3 に置き換え、第 2 部の §19.2・§20.1・§29.4・§30.1 を直した。第 1 部は、頭の版の行と改訂履歴の「再現」の 2 行のほかは仕様書と同じことを行ごとに比べて確かめた）

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0001-02 | E2E（`e2e/title.spec.ts`） | OK。ページの題名が「WIZミニ ～死霊術師の迷宮～」、`lang` が ja |
| TC-0002-06 | E2E（`e2e/pwa.spec.ts`） | OK。manifest の `name`・`short_name` が「WIZミニ」、`apple-mobile-web-app-title` が「WIZミニ」 |
| TC-0006-01 | E2E（`e2e/title.spec.ts`） | OK。見出しの中の画像（`src` が `title/title.png`）、メニュー（はじめから・つづきから・おと：オフ）、インストール、v1.0。メッセージ欄なし |
| TC-0006-09 | E2E（同上） | OK。`alt` と見出しの名前が「WIZミニ ～死霊術師の迷宮～」、`width` 1080・`height` 720、`naturalWidth` 1080。飾り線・副題の文字はない |
| TC-0006-10 | E2E（同上） | OK。375 × 667 で 359 × 239.3、414 × 715 で 398 × 265.3、1280 × 800 で 450 × 300。左右の余白の差 1px 以内 |
| TC-0006-11 | E2E（同上。Service Worker を止めて） | OK。画像を止めると画像が消え、見出しが「WIZミニ」、副題が出る。エラーの枠は出ない |
| TC-0006-12 | 単体（`tests/assets/title-image.test.ts`） | OK。PNG・1080 × 720・8 ビット RGB、MD5 が仕様書 §13.6 と同じ |
| TC-0002-07 | 手動（iPhone 11 のホーム画面。2026-11-06、オーナー） | OK（下の「WS-0011 の終わりの手動テスト」） |
| TC-0006-13 | 手動（iPhone 11 の Safari・PC のブラウザ。同上） | OK（同上） |

あわせて確かめたこと：

- 画面の大きさのテスト（`e2e/layout.spec.ts` のタイトルの場面）と axe の検査（`e2e/a11y.spec.ts`）は、そのまま通った。
- 撮影用の一時のテストで、タイトル画面の縦のはみ出しを測った：375 × 667・414 × 715・1366 × 657・1280 × 800 のどれも、エラーの枠を出しても 0（依頼 §2.3 の見込みのとおり）。
- スクリーンショット：375 × 667（エラーの枠ありも）と 1280 × 800 で、画像・メニュー・版の表記が重ならないことを見た。

手元で通したもの（2026-11-05）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：手動の TC-0006-13 がまだ記録にない。テストにある確認 ID は 306 → 310 で、この TASK の新しい自動の 4 個の分だけ増えた。TC-0001-02・TC-0002-06・TC-0006-01 はすでにあったテストの期待する値を直した）、単体 180 件、build、check:dist OK
- `npm run test:e2e`：460 件通った・44 件はその端末の対象外で飛ばした

CI の結果（PR #75、2026-11-05）：`check`（verify）OK 1 分 0 秒、`e2e` OK 4 分 8 秒。マージのあと、main の test（5 分 33 秒）・pages（1 分 27 秒）も成功し、公開 URL でページの題名「WIZミニ ～死霊術師の迷宮～」と `title/title.png` が返ることを確かめた。

### WS-0011 の終わりの手動テスト（2026-11-06、オーナー）

PR #75 の公開のあと、確かめること・見るところ・返事のひな形をオーナーに渡して確かめてもらった（2026-11-05 に渡し、2026-11-06 に返事「1 OK 2 OK 3 OK」）。

| # | 確認 ID | 確かめたこと | 結果 |
| --- | --- | --- | --- |
| 1 | TC-0006-13 | iPhone 11 の Safari で公開 URL のタイトル画面を開く。画像が出て、題名が「WIZミニ ～死霊術師の迷宮～」と読め、画像が切れたりメニューと重なったりしない | OK |
| 2 | TC-0002-07 | iPhone 11 のホーム画面で、アプリ名が「WIZミニ」になっている（古いアイコンは消して追加し直す） | OK |
| 3 | TC-0006-13 | PC のブラウザで公開 URL のタイトル画面を開く。画像が出て、タブの題名が「WIZミニ ～死霊術師の迷宮～」 | OK |

## 3. 確認できなかったこと

- 実機では、オーナーの返事（項目ごとの OK）で結果を記録した。画像の大きさの数値は E2E で測り、実機では目で見て確かめた（数値では測っていない）。
- 実機では、セーブのある状態のタイトル画面と、追加し直したアプリからダンジョンまで遊ぶところ（TC-0002-07 の手順の後半）は、確かめることとして個別に頼んでいない（前の WS で同じ手順を確かめ、今回は名前と画像だけを変えたため）。
- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。撮影用の一時ファイルは作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（設計どおり）
- [x] AC-0025（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #75）
- [x] マージされた（マージ = 公開。PR #75、2026-11-05）
- [x] WS の終わりの手動テスト（TC-0002-07・TC-0006-13）の結果を書いた
