---
id: MWIZ-TASK-0001
type: Implementation Task
title: 開発の土台と公開
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0001（v1.0）
  - MWIZ-TC-0001（v1.0）
  - MWIZ-TC-0006（v1.0）
  - MWIZ-TD-0001（v1.0）
  - MWIZ-TD-0005（v1.0）
verified: null
---

# TASK-0001 開発の土台と公開

- WS：[WS-0001](MWIZ-WS-0001-workstream-ja.md)
- ブランチ：`feat/TASK-0001-foundation`
- 実施記録：AC-0001（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：なし（最初）

## やること

- `package.json`・`vite.config.ts`・`tsconfig.json`・`eslint.config.js`（層の決まり）・`playwright.config.ts`（仕様書 §19）
- Vitest・Playwright の骨組み、`npm run verify`・`test:e2e`
- `scripts/check-dist.mjs`・`scripts/check-docs.mjs`（MWIZ・docs/ に合わせる）
- `index.html`・`src/main.ts`・`ui/theme.css`・`ui/style.css` の最小（タイトルの仮の画面と版の表記）
- `.github/workflows/test.yml`（PR と main への push で verify と E2E）
- `.github/workflows/pages.yml` を本物（`dist/` を公開）に置き換える。試作の公開はやめる
- アプリ識別子 `mini-wiz-game`（保存のキー・キャッシュを分ける）

## 対象の確認 ID（2 個：自動 2・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/title.spec.ts` | TC-0001-02 |
| `tests/logic/version.test.ts` | TC-0006-02 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0001（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
