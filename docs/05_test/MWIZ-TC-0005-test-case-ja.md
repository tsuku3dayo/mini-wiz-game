---
id: MWIZ-TC-0005
type: Test Case
title: 起動に失敗しても直る
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0005（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0001（v1.0）
  - MWIZ-TD-0005（v1.0）
  - MWIZ-GUI-0007（v1.0）
  - docs/specification-ja.md (v1.2) §11.12、§16.6、§21.2、§27.1、§28、§30.4
verified: null
---

# TC-0005 起動に失敗しても直る

- 対象：[US-0005](../02_requirements/MWIZ-US-0005-user-story-ja.md)（受け入れ条件 3 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0005-01 | 1 | ふつうに起動したとき（`window.__appStarted` が true）は、見張りの時間がたっても読み込み直さず、`#boot-error` も出ない | E2E | `e2e/boot.spec.ts` |
| TC-0005-02 | 1 | 起動を失敗させると、見張りの時間のあとに 1 回だけ自動で読み込み直す。`sessionStorage` の `mini-wiz-game:boot-repair-at` に時刻が書かれ、名前にこのアプリの範囲を含むキャッシュが消える。読み込み直したあとに起動できれば、タイトル画面が出て `#boot-error` は出ない | E2E | `e2e/boot.spec.ts` |
| TC-0005-03 | 2 | 前の復旧から 2 分以内にまた失敗すると、読み込み直さずに `#boot-error` が見え、「うまく起動できませんでした。」「なおす」（`#boot-repair`）「きろくは消えません。」が出る。「なおす」の高さが 48px 以上 | E2E | `e2e/boot.spec.ts` |
| TC-0005-04 | 2 | `mini-wiz-game:boot-repair-at` が 2 分より前（今 − 121,000ms）のときに失敗すると、`#boot-error` を出さずに自動で読み込み直す | E2E | `e2e/boot.spec.ts` |
| TC-0005-05 | 3 | TC-0005-02・03 のどちらのあとも、`localStorage` の `mini-wiz-game-game`・`mini-wiz-game-save`・`mini-wiz-game-sound` の値が失敗の前と同じ文字列 | E2E | `e2e/boot.spec.ts` |

## 2. 準備

- `addInitScript` で `window.__bootWaitMs = 500` にする（見張りの待ち時間を短くする。仕様書 §28）。
- 起動の失敗：`page.route` でビルドの入口の `.js`（`index.html` が `type="module"` で読むもの）を `abort` し、`main.ts` が動かないようにする。TC-0005-02 で「読み込み直したあとに起動できる」ときは、1 回目だけ止めて 2 回目は通す。
- 保存の値：`?debug=1` で先に開き、`__wiz.writeState`（宿屋）・`writeSave` と、`mini-wiz-game-sound` を `on` にしておく。
- キャッシュ：先に名前にこのアプリの範囲（`new URL('./', location.href).href`）を含むキャッシュを `caches.open` で作っておく。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0005-01 | 止めずに開く → 1,500ms 待つ → `framenavigated` の数が 1（最初の読み込みだけ）、`#boot-error` が見えない |
| TC-0005-02 | 入口の `.js` を止めて開く → 読み込み直しを待つ（`framenavigated` が 2）→ `boot-repair-at` があり、範囲を含むキャッシュがない → 2 回目は通し、`body[data-screen="title"]` |
| TC-0005-03 | 入口の `.js` をずっと止める → 開く → 自動の読み込み直し（1 回）→ もう一度失敗 → `#boot-error` が見え、そのあと 1,500ms 待っても `framenavigated` が増えない。文と「なおす」の `getBoundingClientRect().height` を確かめる |
| TC-0005-04 | `addInitScript` で、最初の読み込みのときだけ（テスト用の印が `sessionStorage` になければ）`sessionStorage.setItem('mini-wiz-game:boot-repair-at', String(Date.now() - 121000))` → 入口の `.js` を止めて開く → `#boot-error` が出ずに読み込み直し（`framenavigated` が 2）、`boot-repair-at` が新しい時刻に書き替わる |

## 4. 手動の手順

なし。
