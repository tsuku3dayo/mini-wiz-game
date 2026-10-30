---
id: MWIZ-ADR-0002
type: Architecture Decision
title: mini-blockbreaking-game と同じ技術構成とルールを使う
status: stable
version: 1.0
updated: 2026-10-26
sources:
  - MWIZ-PB-0001（v1.1）§5
  - docs/specification-ja.md (v1.2) §18、§19、§30
  - mini-blockbreaking-game package.json (v1.0.0)、CLAUDE.md、doc/01_architecture/MBRK-ADR-0002（v1.0）
verified: { by: "tsuku3dayo", at: "2026-10-26T17:16:59+09:00" }
---

# ADR-0002 mini-blockbreaking-game と同じ技術構成とルールを使う

## 状況

オーナーは、システム構成と技術スタックを `mini-blockbreaking-game` に合わせたいとしている（MWIZ-PB-0001 §5）。同じ作者・同じサイト（`tsuku3dayo.github.io`）のアプリで、道具・手順・CI・PWA の仕組み（更新・起動の復旧）がすでに動いている。

## 決定

`mini-blockbreaking-game`（v1.0.0）と同じ技術構成とルールを使う。

- 技術：TypeScript（strict）+ Vite + vite-plugin-pwa（workbox-window）、Vitest、Playwright（Chromium）、ESLint + typescript-eslint（flat config）、Node.js 24。版は同じにする（MWIZ-TS-0001）。
- UI フレームワークを使わず、DOM を直接組み立てる（ADR-0005）。
- `package.json` の scripts（`dev`・`build`・`lint`・`test`・`test:e2e`・`check:dist`・`check:docs`・`icons`・`verify`）、`vite.config.ts`（`base: './'`・`__APP_VERSION__`・`__APP_ID__`・`app-id-meta`）、`tsconfig.json`、CI（`test.yml`・`pages.yml`・`dependabot.yml`）、`scripts/`（`check-dist`・`check-docs`・`make-icons`）、`public/boot.js` を流用し、このアプリに合わせて値だけ変える。
- 開発のルール（`CLAUDE.md`：成果物の書式・Git の運用・`innerHTML` の禁止・テスト名の確認 ID）も同じにする。

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **A. mini-blockbreaking-game と同じ（採用）** | 動いている設定・CI・PWA の仕組みを流用できる。手順が同じなのでオーナーが迷わない | UI フレームワークがないので、画面の部品（メニュー・ウィンドウなど）を自分で組む量が多い |
| B. 仕様書 v1.0 と同じ React + MUI を使う | 元の WIZ の部品の分け方をそのまま写せる | 参照プロジェクトと構成が分かれる。実行時の依存が増え、事前キャッシュも大きくなる |

## 結果

- 違うところ（DOM + SVG・ターン制・乱数・層・保存の形・BGM・E2E の端末・axe-core）は MWIZ-TS-0001 §5 にまとめる。
- 新しく足す開発用の依存は `@axe-core/playwright` だけ（ADR-0011）。
