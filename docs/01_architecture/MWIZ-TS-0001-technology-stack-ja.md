---
id: MWIZ-TS-0001
type: Technology Stack
title: WIZ 技術スタック
status: review
version: 1.1
updated: 2026-10-30
sources:
  - MWIZ-PB-0001（v1.1）
  - MWIZ-SA-0001（v1.0）
  - docs/specification-ja.md (v1.2) §18、§19、§29、§30
  - mini-blockbreaking-game package.json (v1.0.0)、doc/01_architecture/MBRK-TS-0001（v1.0）
verified: null
---

# 技術スタック（technology-stack）

`mini-blockbreaking-game`（v1.0.0）と同じ技術・版をそろえる（[ADR-0002](MWIZ-ADR-0002-architecture-decision-ja.md)）。版は 2026-10-26 時点の `mini-blockbreaking-game` の `package.json` に合わせ、07 の土台の WS で入れるときに最新の版を確かめる。

## 1. アプリ

| 分野 | 使うもの | 版 | 備考 |
| --- | --- | --- | --- |
| 言語 | TypeScript | ~6.0 | `strict`。UI フレームワークなし（DOM を直接組み立てる。[ADR-0005](MWIZ-ADR-0005-architecture-decision-ja.md)） |
| ビルド | Vite | ^8.3 | `base: './'`（GitHub Pages のサブパス配信） |
| PWA | vite-plugin-pwa + workbox-window | ^2.0 / ^7.4 | `registerType: 'prompt'`（「更新」で切り替え。[ADR-0009](MWIZ-ADR-0009-architecture-decision-ja.md)） |
| 画面 | DOM（`createElement`・`textContent`）、CSS（変数・メディアクエリ・アニメーション） | — | `innerHTML` は使わない |
| 疑似3D・自動地図 | SVG（ブラウザ標準） | — | [ADR-0005](MWIZ-ADR-0005-architecture-decision-ja.md) |
| 画面の切替え | `location.hash`・`hashchange`・`history.replaceState`（ブラウザ標準） | — | ルーターのライブラリは使わない |
| 入力 | Pointer / Click イベント・KeyboardEvent（ブラウザ標準） | — | タップとクリックは同じ動き。キーは `key`／`code` で判定 |
| 効果音・BGM | Web Audio API（ブラウザ標準） | — | 音声ファイル・音のライブラリなし。[ADR-0008](MWIZ-ADR-0008-architecture-decision-ja.md) |
| 保存 | localStorage（ブラウザ標準）、`navigator.storage.persist()` | — | [ADR-0006](MWIZ-ADR-0006-architecture-decision-ja.md) |
| フォント | 端末のフォント | — | 同梱しない。[ADR-0010](MWIZ-ADR-0010-architecture-decision-ja.md) |
| 画像 | 敵の絵 6 枚（PNG、256×256。オーナーが用意した）、アイコン（スクリプトで作る） | — | 仕様書 §13・§30.5 |

**実行時の依存はない**（`dependencies` は空）。外部のライブラリ（UI フレームワーク・状態管理・ルーター・ゲームエンジン・3D・音・アニメーション・乱数・Web フォント）は使わない。

## 2. 開発・テスト

| 分野 | 使うもの | 版 | 備考 |
| --- | --- | --- | --- |
| 実行環境 | Node.js（npm） | 24 | CI と同じメジャー。手元は v24.0.0（npm 11.3.0）をインストール済み |
| 単体テスト | Vitest | ^5.0 | Node 環境。`tests/**/*.test.ts`。ルール・表示の計算・ゲーム API（偽の保存）・音（偽の Web Audio）・敵の絵のファイルを対象。[ADR-0011](MWIZ-ADR-0011-architecture-decision-ja.md) |
| 画面テスト（E2E） | Playwright（Chromium） | ^1.64 | build 済みの成果物を `vite preview` で配信してテスト。端末は Pixel 7、375 × 667（タッチあり）、Desktop Chrome（1280 × 800）の 3 つ。[ADR-0011](MWIZ-ADR-0011-architecture-decision-ja.md) |
| アクセシビリティの検査 | @axe-core/playwright | ^4.10 | 各画面と主な状態を E2E から検査（`mini-blockbreaking-game` にはない追加） |
| Lint | ESLint + typescript-eslint | ^10.12 / ^8.71 | `innerHTML` / `outerHTML` への代入の禁止、層の決まり（[ADR-0003](MWIZ-ADR-0003-architecture-decision-ja.md)）。フォーマッタは入れない |
| 成果物の検査 | `scripts/check-dist.mjs`（`mini-blockbreaking-game` から流用） | — | manifest・アイコン・`boot.js`・アプリ識別子・敵の絵・Web フォントがないこと |
| 成果物の整合性の検査 | `scripts/check-docs.mjs`（同上。接頭辞 `MWIZ`・置き場所 `docs/` に合わせる） | — | `docs/SDD-PROCESS_v3.md` §7.2「自動化」 |
| アイコン生成 | `scripts/make-icons.mjs`（同上。図柄だけ変える） | — | 192 / 512 / maskable / apple-touch-icon / SVG |

## 3. 道具とプラットフォーム

| 用途 | 使うもの | 備考 |
| --- | --- | --- |
| ソースコードの管理 | Git + GitHub（`tsuku3dayo/mini-wiz-game`、公開） | 手元の Git は 2.51.0、GitHub CLI あり。作業ブランチ → PR → main（マージはオーナー） |
| 公開 | GitHub Pages | https://tsuku3dayo.github.io/mini-wiz-game/ 。最初の公開の前に Settings → Pages の Source を「GitHub Actions」にする |
| CI | GitHub Actions `test.yml` | main への push と全 PR で `verify`（lint → check:docs → 単体テスト → build → check:dist）と E2E |
| 公開の自動化 | GitHub Actions `pages.yml` | main への push で build・check:dist をし、通ったときだけ `dist/` を公開 |
| 依存の更新 | Dependabot | npm と github-actions を週 1 回。開発用の依存は 1 つの PR にまとめる |
| 開発支援 | Claude Code | ルールは `CLAUDE.md` |

## 4. コマンド

`mini-blockbreaking-game` と同じ。

| やりたいこと | コマンド |
| --- | --- |
| 開発サーバー | `npm run dev`（同じネットワークの実機からも開ける） |
| 型チェック + ビルド | `npm run build`（成果物は `dist/`） |
| Lint | `npm run lint` |
| 単体テスト | `npm test` |
| 画面テスト | `npm run test:e2e`（初回は `npx playwright install chromium`） |
| 成果物の検査 | `npm run check:dist`（build のあと） |
| 成果物の整合性 | `npm run check:docs` |
| まとめて確認 | `npm run verify`（lint → check:docs → test → build → check:dist） |
| アイコン再生成 | `npm run icons` |

## 5. mini-blockbreaking-game との違い

| 項目 | mini-blockbreaking-game | このアプリ | 理由 |
| --- | --- | --- | --- |
| 画面の描き方 | ゲーム領域は Canvas 2D、それ以外は DOM | すべて DOM。疑似3D・地図は SVG | ターン制で毎フレーム描く必要がない。読み上げとテストがしやすい（ADR-0005） |
| 時間の扱い | 固定タイムステップのゲームループ | ターン制（操作 1 回 = 1 回の計算）。時間はメッセージの逐次表示・演出・BGM だけ | 仕様書 §5・§11.8 |
| 乱数 | なし | ルールの乱数は `Rng` を引数で受け取る | 仕様書 §23（ADR-0003） |
| 層 | ロジック層・画面層・基盤 | ルール・表示の計算・ゲーム API・画面・音・基盤 | 元の WIZ の「サーバーが正」の分け方を保つ（ADR-0004） |
| 保存 | 記録の一覧（上位 10 件） | プレイ中の状態とセーブ（各 1 件）、revision、まとめて書く | 仕様書 §21（ADR-0006） |
| バックアップ | 書き出し・読み込みあり | なし | 範囲外（MWIZ-PB-0001 §4.2） |
| 音 | 効果音だけ | 効果音 + BGM（FM 合成） | 仕様書 §12（ADR-0008） |
| E2E の端末 | Pixel 7 + 375 × 667 | Pixel 7 + 375 × 667 + Desktop Chrome | PC のキーボード操作と広い画面の配置も確かめる（ADR-0011） |
| アクセシビリティの検査 | E2E の個別の確かめ | 加えて axe-core | 仕様書 §16.4 の受け入れ基準 |
| 更新の帯を出す画面 | タイトル・ランキング | タイトル・宿屋 | 遊んでいる途中に出さない（ADR-0009） |
| テスト用の入口 | `window.__breakout` | `window.__wiz`（地図・乱数・状態の書き込み・遅延） | 仕様書 §28（ADR-0011） |
