---
id: MWIZ-AC-0001
type: Attested Computation
title: 開発の土台と公開 の実施記録
status: review
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-TASK-0001（v1.0）
  - MWIZ-TC-0001（v1.0）
  - MWIZ-TC-0006（v1.0）
verified: null
---

# AC-0001 開発の土台と公開 の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0001](../06_plan/MWIZ-TASK-0001-implementation-task-ja.md) 開発の土台と公開 |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0001-foundation` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0、npm 11.3.0。Playwright 1.64.1 の Chromium |
| 主な依存の版 | typescript 6.0.3、vite 8.3.5、vite-plugin-pwa 2.0.0、vitest 5.0.5、@playwright/test 1.64.1、@axe-core/playwright 4.14.0、eslint 10.13.0、typescript-eslint 8.72.1 |

作ったもの：

- 設定：`package.json`・`vite.config.ts`（`base: './'`、`__APP_VERSION__`・`__APP_ID__`、`app-id-meta`、`VitePWA` の manifest と事前キャッシュ。Service Worker の登録は TASK-0002 以降で `src/platform/pwa.ts` から行うので `injectRegister: false`）・`tsconfig.json`・`eslint.config.js`（層の決まり・`innerHTML` の禁止）・`playwright.config.ts`（pixel7・small・desktop）・`.gitignore`
- 画面：`index.html`、`src/main.ts`、`src/ui/theme.css`・`style.css`、`src/ui/dom.ts`（`el()`）、`src/ui/screens/title.ts`（仮のタイトル：飾り線・WIZ・副題・はじめから・版）、`src/logic/version.ts`
- 検査：`scripts/check-docs.mjs`（SDD-PROCESS_v3 §7.2）、`scripts/check-dist.mjs`（今ある分。アイコン・boot.js・敵の絵は、その TASK で足す）
- CI と公開：`.github/workflows/test.yml`（verify と E2E）、`.github/workflows/pages.yml`（試作の公開をやめ、`dist/` を公開する）、`.github/dependabot.yml`

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0001-02 | E2E（`e2e/title.spec.ts`。pixel7・small・desktop） | OK（3 件とも通った）。題名「WIZ ～死霊術師の迷宮～」、`<html lang="ja">` |
| TC-0006-02 | 単体（`tests/logic/version.test.ts`） | OK。`1.0.0` → `v1.0`、`1.2.3` → `v1.2` |

手元で通したもの（2026-10-30）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID が 320 個。後の TASK で書く）、単体 1 件、build、check:dist OK
- `npm run test:e2e`：3 件とも通った（12.4 秒）
- スクリーンショット（本番のビルド）：375 × 667・414 × 715・1280 × 800 で、仮のタイトルの画面が縦・横ともはみ出さない

CI の結果（PR #25、2026-10-30）：`check`（verify）OK 16 秒、`e2e` OK 28 秒。

### WS-0001 の終わりの手動テスト（2026-10-30、オーナー）

WS-0001 には手動の確認 ID がない（作業計画の点検で、あとの TASK に移した）。そのため、公開 URL を実機で開き、この WS で作ったものが動くことだけを確かめた。

| # | 確かめたこと | 端末 | 結果 |
| --- | --- | --- | --- |
| 1 | 公開 URL（https://tsuku3dayo.github.io/mini-wiz-game/ ）が開く | iPhone 11 の Safari | OK |
| 2 | タイトル画面（WIZ・はじめから・インストール・v1.0）が出る | iPhone 11 の Safari | OK |
| 3 | 「インストール」で案内が開き、iPhone の手順が開いている | iPhone 11 の Safari | OK |
| 4 | 1〜3 と同じように開く | PC のブラウザ | OK |

## 3. 確認できなかったこと

- Android の実機はないので、Android での確認はしていない（E2E の pixel7 で代わりに確かめた。TST-0001 §6）。
- 手動の確認 ID はこの TASK にない。

## 4. 後片付け

- 手元の `vite preview`（スクリーンショット用）を止めた。
- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（違う作りはない）
- [x] AC-0001（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #25）
- [x] マージされた（マージ = 公開。公開 URL で開けることを WS の終わりの手動テストで確かめた）
