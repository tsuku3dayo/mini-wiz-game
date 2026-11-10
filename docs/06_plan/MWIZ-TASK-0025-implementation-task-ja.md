---
id: MWIZ-TASK-0025
type: Implementation Task
title: タイトル画像と名前「WIZミニ」
status: stable
version: 1.0
updated: 2026-11-05
sources:
  - MWIZ-WS-0011（v1.0）
  - MWIZ-TC-0001（v1.1）
  - MWIZ-TC-0002（v1.1）
  - MWIZ-TC-0006（v1.3）
  - MWIZ-TD-0004（v1.3）
  - MWIZ-TD-0005（v1.12）
verified: null
---

# TASK-0025 タイトル画像と名前「WIZミニ」

- WS：[WS-0011](MWIZ-WS-0011-workstream-ja.md)
- ブランチ：`feat/TASK-0025-title-image`
- 実施記録：AC-0025（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0023（WS-0010）

## やること

- `docs/requests/title/wiz_mini_title.png` を `public/title/title.png` の名前で置く（中身は変えない。MD5 で確かめる）
- `src/logic/title-image.ts`（`TITLE_IMAGE_URL`）、`src/ui/screens/title.ts`（`<h1>` の中の `<img>`、読めないときは文字）、`src/ui/style.css`（`.title-logo`、最大 450px・3：2）
- 名前「WIZミニ」：`index.html`（`<title>`・`apple-mobile-web-app-title`）、`vite.config.ts`（manifest の `name`・`short_name`）
- `scripts/check-dist.mjs`：`title/title.png`（1080 × 720）が `dist/` と事前キャッシュにある、manifest の `name` が「WIZミニ」
- テスト：`e2e/title.spec.ts`・`e2e/pwa.spec.ts` を直し、`tests/assets/title-image.test.ts` を足す
- 画面の大きさのテスト（`e2e/layout.spec.ts` のタイトル）・axe の検査（`e2e/a11y.spec.ts`）がそのまま通ることを確かめる（エラーの枠を出した状態も）
- `README.md`・`CLAUDE.md`（1 行目の説明）・`docs/reproduction-specification.md`（第 1 部を仕様書 v1.3 に、第 2 部の §19.2・§20.1・§29.4・§30.1 を実装に）を直す

## 対象の確認 ID（9 個：自動 7・手動 2）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/title.spec.ts` | TC-0001-02、TC-0006-01、TC-0006-09、TC-0006-10、TC-0006-11 |
| `e2e/pwa.spec.ts` | TC-0002-06 |
| `tests/assets/title-image.test.ts` | TC-0006-12 |
| 実機（手動） | TC-0002-07、TC-0006-13 |

- TC-0001-02・TC-0002-06・TC-0006-01 は、すでにあるテストの期待する値を直す。TC-0002-07 は WS-0001 で確かめた手動の確認を、名前を変えたのでもう一度行う。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0025（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
