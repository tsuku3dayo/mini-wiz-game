---
id: MWIZ-AC-0030
type: Attested Computation
title: 文書だけの判定と CI の設定の実施記録
status: draft
version: 1.0
updated: 2026-11-09
sources:
  - MWIZ-TASK-0030（v1.0）
  - MWIZ-TC-0039（v1.0）
  - MWIZ-TD-0005（v1.9）
verified: null
---

# AC-0030 文書だけの判定と CI の設定の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0030](../06_plan/MWIZ-TASK-0030-implementation-task-ja.md) 文書だけの判定と CI の設定（変更の依頼 `docs/requests/2026-11-09-spec-1.8-ci-skip-docs.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0030-ci-skip-docs` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium。CI は GitHub Actions（ubuntu-latest、Node 24） |

作ったもの：

- `scripts/docs-only.mjs`：TD-0005 §4「文書だけの判定」のとおり（`isDocFile`・`isDocsOnly`・`diffArgs`・`decide`、コマンドとして動かすと `GITHUB_OUTPUT` に `docs_only` を書く）。Node の標準だけ
- `scripts/docs-only.d.mts`：4 つの関数の型
- `tests/scripts/docs-only.test.ts`：TC-0039-01・TC-0039-02
- `.github/workflows/test.yml`：`changes` ジョブ（`fetch-depth: 0`）を足し、`check` のステップを `docs_only` で分け、`e2e` に `needs: changes` と `if` を足した
- `docs/reproduction-specification.md`：頭の版の行・改訂履歴の 1.8 の行・§30.6 を仕様書 v1.8 に合わせ、第 2 部のファイル構成に `docs-only.mjs` を、§30.6 に実装の行を足した

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0039-01 | 単体（`tests/scripts/docs-only.test.ts`） | OK。`docs/` の中（`.md`・`.ts`・`.png`）と `README.md`・`CLAUDE.md` は文書、`src/main.ts`・`.github/workflows/test.yml`・`package.json`・`e2e/notes.md`・`docs.md.ts`・`documents/a.md` は文書でない。混ざると・空だと文書だけにならない |
| TC-0039-02 | 単体（同上） | OK。PR は `base...head`、push は `before`・`sha`。`before` が空・すべて 0、値が足りない、`workflow_dispatch` は `null`。`null` のときは一覧を取らずに `false`、一覧を取る関数が例外なら `false` |
| TC-0039-03 | 手動（GitHub の画面、PR #94） | OK。実行 42546999249：`changes` のログに `docs_only=false（イベント pull_request、変わったファイル 6）`。`check` は `npm ci`・`npm run verify` が動いて成功（文書だけのときのステップは飛ばした）、`e2e` が動いて成功。時間：changes 7 秒・check 29 秒・e2e 4 分 48 秒 |
| TC-0039-04 | 手動（GitHub の画面、文書だけの PR） | WS の終わりに確かめる |
| TC-0039-05 | 手動（GitHub の画面、`main` の実行） | WS の終わりに確かめる |
| TC-0039-06 | 手動（GitHub の画面、文書だけの PR） | WS の終わりに確かめる |

あわせて確かめたこと：

- 手元の git で `node scripts/docs-only.mjs` を動かした（`GITHUB_OUTPUT` は作業用の一時フォルダのファイル）：この枝を PR とみなす（`EVENT=pull_request`・`BASE=origin/main`・`HEAD=HEAD`）と `docs_only=false`（変わったファイル 4）。文書だけだった PR #93 のマージ（`EVENT=push`・`BEFORE=73dde61~1`・`SHA=73dde61`）は `docs_only=true`（78）。`BEFORE` がすべて 0 なら `docs_only=false`（一覧を取らない）。`GITHUB_OUTPUT` に 3 行とも書かれた。
- 画面は変えていないので、スクリーンショットは撮っていない。

手元で通したもの（2026-11-09）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（確認 ID 335、テストのコードに 312）、単体 182 件、build、check:dist OK
- `npm run test:e2e`：460 件通った・44 件はその端末の対象外で飛ばした

## 3. 確認できなかったこと

- TC-0039-04〜06（文書だけの PR と `main` の実行で、スキップと失敗が思ったとおりになるか）は、この PR のマージのあとでないと確かめられない。WS-0014 の終わりに確かめる。
- ブランチを新しく作った最初の push（`before` がすべて 0）は、いまの CI では `main` への push だけが対象なので、GitHub の上では起きない。判定は単体テストと手元で確かめた。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。判定を動かしたときの `GITHUB_OUTPUT` のファイルは、作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面は変えていない）
- [x] 設計と違う作りにしたら、TD を直した（設計どおりに作った）
- [x] AC-0030（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #94）
- [ ] マージされた（マージ = 公開。ゲームの中身は変わらない）
