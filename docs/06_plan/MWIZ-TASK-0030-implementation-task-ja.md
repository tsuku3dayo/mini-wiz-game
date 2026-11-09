---
id: MWIZ-TASK-0030
type: Implementation Task
title: 文書だけの判定と CI の設定
status: stable
version: 1.0
updated: 2026-11-09
sources:
  - MWIZ-WS-0014（v1.0）
  - MWIZ-TC-0039（v1.0）
  - MWIZ-TD-0005（v1.9）
verified: null
---

# TASK-0030 文書だけの判定と CI の設定

- WS：[WS-0014](MWIZ-WS-0014-workstream-ja.md)
- ブランチ：`feat/TASK-0030-ci-skip-docs`
- 実施記録：AC-0030（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0029（WS-0013）

## やること

- `scripts/docs-only.mjs`：TD-0005 §4「文書だけの判定」のとおり（`isDocFile`・`isDocsOnly`・`diffArgs`・`decide`、コマンドとして動かしたときの `GITHUB_OUTPUT`）。Node の標準だけを使う
- `scripts/docs-only.d.mts`：上の 4 つの関数の型
- `tests/scripts/docs-only.test.ts`：TC-0039-01・TC-0039-02
- `.github/workflows/test.yml`：`changes` ジョブを足し、`check` のステップを `docs_only` で分け、`e2e` に `needs`・`if` を足す（TD-0005 §4）。冒頭のコメントも直す
- `eslint.config`：`scripts/` の `.mjs`・`.d.mts` が lint で通ることを確かめる（直しが要れば直す）
- `docs/reproduction-specification.md`：第 1 部の §30.6 と改訂履歴を仕様書 v1.8 に合わせる。第 2 部にファイル構成があれば `scripts/docs-only.mjs` を足す
- 手元の確かめ：`node scripts/docs-only.mjs` を、`EVENT=pull_request`・`BASE=origin/main`・`HEAD=HEAD` で動かし、`docs_only=false`（この枝は文書でないファイルを含む）が出ること。`GITHUB_OUTPUT` を scratchpad のファイルにして中身を見る
- コミットの前に `git status` で入るファイルを見る

## 対象の確認 ID（6 個：自動 2・手動 4）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/scripts/docs-only.test.ts` | TC-0039-01、TC-0039-02 |
| GitHub の画面（手動） | TC-0039-03、TC-0039-04、TC-0039-05、TC-0039-06 |

- 確認 ID は 329 → 335、テストのコードに 310 → 312 になる。
- TC-0039-03 はこの TASK の PR で確かめる。TC-0039-04〜06 は、マージのあとの文書だけの PR と `main` の実行で確かめる（WS-0014 の終わり）。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面は変えないので、撮らない）
- [ ] 設計と違う作りにしたら、TD を直した
- [ ] AC-0030（draft）に自動テストの結果と TC-0039-03 の結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開。ゲームの中身は変わらない）
