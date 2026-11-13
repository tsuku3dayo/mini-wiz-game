---
id: MWIZ-TC-0002
type: Test Case
title: ホーム画面に追加する
status: stable
version: 1.2
updated: 2026-11-05
sources:
  - MWIZ-US-0002（v1.1）
  - MWIZ-TST-0001（v1.2）
  - MWIZ-TD-0004（v1.9）
  - MWIZ-TD-0005（v1.14）
  - MWIZ-GUI-0002（v1.5）
  - MWIZ-GUI-0007（v1.1）
  - docs/specification-ja.md (v1.22) §11.12、§16.6、§27.1、§30.1、§30.2
verified: null
---

# TC-0002 ホーム画面に追加する

- 対象：[US-0002](../02_requirements/MWIZ-US-0002-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0002-01 | 1 | タイトル画面に「インストール」のボタンがあり、押すと `dialog#install-dialog` がモーダルで開く。3 つの `details`（`data-platform` が `ios`・`android`・`pc`）のうち、今の端末のものだけが `open`：`desktop` は `pc`、`pixel7` は `android`、iPhone の userAgent のコンテキストは `ios` | E2E | `e2e/pwa.spec.ts` |
| TC-0002-02 | 2 | `beforeinstallprompt` を受けていないときは、案内に「今すぐインストール」が出ない。受けたあとに開くと「今すぐインストール」が出て、押すと受けたイベントの `prompt()` が 1 回呼ばれる | E2E | `e2e/pwa.spec.ts` |
| TC-0002-03 | 2 | 案内の「とじる」をタップすると閉じ（`dialog.open` が false）、フォーカスが「インストール」のボタンに戻る | E2E（タッチ） | `e2e/pwa.spec.ts` |
| TC-0002-04 | 2 | 案内を開いて Esc を押すと閉じ、フォーカスが「インストール」のボタンに戻る | E2E（キー、`desktop`） | `e2e/pwa.spec.ts` |
| TC-0002-05 | 3 | インストール済み（`matchMedia('(display-mode: standalone)').matches` が true、または `navigator.standalone === true`）のとき、タイトル画面に「インストール」のボタンがない。版の表記「v1.0」は右に残る | E2E | `e2e/pwa.spec.ts` |
| TC-0002-06 | 4 | `manifest.webmanifest` の `name`・`short_name` が「WIZミニ」、`display` が `standalone`、`start_url` が `./`、アイコン 192・512・512（maskable）がある。`index.html` の `apple-mobile-web-app-title` が `WIZミニ`、`apple-touch-icon` がある | E2E | `e2e/pwa.spec.ts` |
| TC-0002-07 | 4 | iPhone 11 の Safari でホーム画面に追加でき、アイコンの下のアプリ名が「WIZミニ」で切れない。追加したアプリから起動して、はじめから → 宿屋 → ダンジョンまで遊べる | 手動 | 実機（iPhone 11） |
| TC-0002-08 | 4 | アイコン（v1.2。仕様書 v1.22 §30.5）：`scripts/make-icons.mjs` の `renderIcons()` が作る 5 つのファイルが、`public/icons/` にコミットしたファイルとバイト単位で同じ。`icon-512.png` を読むと 512 × 512 で、点 `(x, y)` の色が `necromancer.png` の `(26 + floor(x × 198 / 512), −16 + floor(y × 198 / 512))` の点（絵の外は `#0B0A0F`）と同じ（いくつかの点：左上・上の端の行・中央・どくろのあたり・右下）。`icon-192.png` 192・`apple-touch-icon.png` 180 も同じ切り抜き。`icon-maskable-512.png` は、中央の一辺 358（左上 (77, 77)）の外が `#0B0A0F` で、中の点が同じ切り抜き。`icon.svg` は `icon-512.png` を `data:image/png;base64` で入れている | 単体 | `tests/scripts/icons.test.ts` |

## 2. 準備

- E2E：本番のビルドを `vite preview` で出す。iPhone の確かめは、`browser.newContext({ userAgent: <iPhone の Safari の userAgent> })` で開く。
- TC-0002-02：`page.evaluate` で `beforeinstallprompt` の名前の `Event` を作り、`prompt` を呼ばれた回数を数える関数を付けて `window` に送る。
- TC-0002-05：`addInitScript` で `window.matchMedia` を包み、`(display-mode: standalone)` のときだけ `matches: true` を返す。別のテストで `navigator.standalone` を `true` にした場合も確かめる。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0002-01 | タイトルを開く → 「インストール」を押す → `#install-dialog` が `open`、`details[data-platform]` の `open` を 3 つ読み、今の端末のものだけが true |
| TC-0002-02 | 案内を開いて「今すぐインストール」がないことを確かめて閉じる → イベントを送る → もう一度開いて「今すぐインストール」があることを確かめ、押す → `prompt` の回数が 1 |
| TC-0002-06 | `page.request.get('manifest.webmanifest')` で中身を読む。`index.html` の `<link rel="manifest">` からも同じファイルを指していることを確かめる |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0002-07 | iPhone 11 の Safari で公開 URL を開く → 共有 → 「ホーム画面に追加」→ 追加 → ホーム画面のアイコンから開き、「はじめから」で名前を付けて宿屋 →「ダンジョンへ」 | アプリ名が「WIZミニ」で、「…」で切れない（すでに追加してあったアプリは、名前が古いままのことがあるので、消してから追加し直す）。アドレスバーのない画面で開き、ダンジョンまで遊べる。Android の実機はないので、AC の「確認できなかったこと」に書く（TST-0001 §6） |
| TC-0002-09 | iPhone 11 で、前に追加したホーム画面のアイコンを消し、Safari で公開 URL を開いて「ホーム画面に追加」し直す。PC の Chrome でブラウザのタブを見る | ホーム画面のアイコンがボスの絵（フードの姿と、杖の先の緑に光るどくろ）で、四隅の丸みで大事なところ（顔・どくろ）が切れていない。PC のタブにも同じ絵の小さいアイコンが出る（暗いので見えにくくてもよい）。追加し直したアプリで、つづきから のセーブ・プレイ中の冒険が残っている（v1.2） |
