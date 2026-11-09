---
id: MWIZ-TC-0039
type: Test Case
title: 文書だけの変更では CI のテストを飛ばす
status: stable
version: 1.0
updated: 2026-11-09
sources:
  - MWIZ-TS-0001（v1.4）
  - MWIZ-TST-0001（v1.1）
  - MWIZ-TD-0005（v1.9）
  - docs/specification-ja.md (v1.8) §30.6
verified: null
---

# TC-0039 文書だけの変更では CI のテストを飛ばす

- 対象：仕様書 §30.6「文書だけの決め方」（v1.8）。開発の道具の確認なので、結びつく US はない（[TST-0001](MWIZ-TST-0001-test-strategy-ja.md) §2「開発の道具のテストケース」）。下の「条件」の列は、§30.6 の表の行（1 文書とみなすファイル、2 比べる相手、3 文書だけ、4 それ以外）と、ジョブの表（5）を指す。
- 判定は `scripts/docs-only.mjs`（[TD-0005](../04_design/MWIZ-TD-0005-technical-design-ja.md) §4「文書だけの判定」）。単体テストで判定を、GitHub の画面で実際に動いたジョブを確かめる。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0039-01 | 1、3 | `isDocFile`：`docs/a.md`・`docs/requests/bgm-listen/main.ts`・`docs/requests/monster/x.png`・`README.md`・`CLAUDE.md` は `true`。`src/main.ts`・`.github/workflows/test.yml`・`package.json`・`e2e/notes.md`（いちばん上でない `.md`）・`docs.md.ts`・`documents/a.md` は `false`。`isDocsOnly`：文書だけの一覧は `true`、文書と文書でないものが混ざると `false`、空の一覧は `false` | 単体 | `tests/scripts/docs-only.test.ts` |
| TC-0039-02 | 2、4 | `diffArgs`：PR は `['<base>...<head>']`、push は `['<before>', '<sha>']`。push の `before` が空・`0000000000000000000000000000000000000000`、値が足りない、知らないイベントは `null`。`decide`：`diffArgs` が `null` なら一覧を取らずに `false`、一覧を取る関数が例外を投げたら `false`、取れた一覧には `isDocsOnly` の結果を返す | 単体 | `tests/scripts/docs-only.test.ts` |
| TC-0039-03 | 4、5 | 文書と文書でないファイル（`.github/workflows/test.yml` など）を変えた PR で、`changes` の出力が `docs_only=false`、`check` が `npm ci` → `npm run verify` を動かし、`e2e` が動く。どちらも成功 | 手動 | GitHub の画面（TASK-0030 の PR） |
| TC-0039-04 | 3、5 | 文書だけを変えた PR で、`changes` の出力が `docs_only=true`、`check` が `node scripts/check-docs.mjs` だけを動かし（`npm ci` のステップは飛ばしたと出る）、`e2e` が「スキップ」と出る。PR の画面のチェックは緑 | 手動 | GitHub の画面（文書だけの PR） |
| TC-0039-05 | 3、5 | TC-0039-04 の PR のマージのあと、`main` への push の実行でも `docs_only=true` で `e2e` がスキップ、`pages` はいつもどおり成功する。TASK-0030 のマージのあと（文書でないファイルを含む）の実行は、全部動いて成功する | 手動 | GitHub の画面（`main` の実行） |
| TC-0039-06 | 3、5 | 文書だけの PR に、整合性の誤り（`sources` の版の食い違いなど）を入れた一時的なコミットを足すと、`check` の `check-docs.mjs` が失敗して PR のチェックが赤になる。そのコミットを戻すと緑に戻る | 手動 | GitHub の画面（文書だけの PR） |

## 2. 準備

- 単体：`scripts/docs-only.mjs` の関数を読み込む（型は `scripts/docs-only.d.mts`）。`decide` の一覧を取る関数は、テストの中で偽の関数を渡す（git は動かさない）。
- 手動：GitHub の PR の「Checks」と、Actions の実行の画面（ジョブとステップの一覧、`changes` のログの判定の行）を見る。

## 3. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0039-03 | TASK-0030 の PR（`test.yml`・`scripts/`・`tests/`・文書を変える）を出し、Actions の実行を開く | `changes` のログに `docs_only=false`。`check` に `npm ci`・`npm run verify` のステップがあって成功。`e2e` が動いて成功 |
| TC-0039-04 | TASK-0030 のマージのあと、文書だけの PR（WS-0014 の終わりの AC・ふりかえりの PR など）を出し、Actions の実行を開く | `changes` のログに `docs_only=true`。`check` は `check-docs.mjs` のステップだけが動いて成功（`npm ci`・`verify` は飛ばしたと出る）。`e2e` はスキップ。PR のチェックは緑。`check` は 1 分以内に終わる |
| TC-0039-05 | TC-0039-04 の PR と TASK-0030 の PR のマージのあと、`main` の `test` と `pages` の実行を開く | 文書だけのマージ：`docs_only=true`、`e2e` スキップ、`pages` 成功。TASK-0030 のマージ：全部動いて成功、`pages` 成功 |
| TC-0039-06 | TC-0039-04 の PR に、成果物の `sources` の版を 1 つだけ古い版にした一時的なコミットを足して push → 結果を見たら、そのコミットを戻すコミットを push | 一時的なコミットでは `check` が失敗（赤）、ログに check-docs のエラーの行。戻したあとは緑 |
