---
id: MWIZ-WS-0014
type: Workstream
title: 文書だけの変更では CI のテストを飛ばす（変更の依頼 v1.8）
status: stable
version: 1.0
updated: 2026-11-09
sources:
  - MWIZ-TS-0001（v1.4）
  - MWIZ-TST-0001（v1.2）
  - MWIZ-TC-0039（v1.0）
  - docs/specification-ja.md (v1.18) §30.6
verified: null
---

# WS-0014 文書だけの変更では CI のテストを飛ばす

- 実施の順：14 / 14（完了のあとの変更の依頼 `docs/requests/2026-11-09-spec-1.8-ci-skip-docs.md` の修正用の WS）
- ユーザーストーリー：なし（開発の道具。TC-0039）

## 目的

変わったファイルが文書（`docs/` の中と、いちばん上の `.md`）だけのときは、CI で成果物の整合性の検査（check:docs）だけを動かし、lint・単体テスト・build・成果物の検査・E2E を飛ばす（仕様書 v1.8 §30.6）。文書だけの PR とマージの待ち時間を、約 5 分から 1 分以内にする。

## TASK（確認 ID 6 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0030](MWIZ-TASK-0030-implementation-task-ja.md) | 文書だけの判定と CI の設定 | 6 | `feat/TASK-0030-ci-skip-docs` |

## WS の終わりの手動テスト

GitHub の画面で次の確認 ID を行い、AC-0030 に結果を書く：TC-0039-03（TASK-0030 の PR）、TC-0039-04・TC-0039-06（文書だけの PR）、TC-0039-05（`main` の実行）。

- 実機の確認はない。オーナーにお願いすることはなく、Claude Code が GitHub の画面（`gh run view` など）で確かめて、結果を AC に書く。オーナーは AC を見て承認する。
- 文書だけの PR は、WS-0013 の終わりの AC・ふりかえりの PR か、この WS の終わりの AC・ふりかえりの PR を使う（先に出すほう）。TC-0039-06 の一時的なコミットは、その PR の中で足して戻す。

## 完了の条件

- [ ] TASK-0030 がマージされた
- [ ] 手動テストの結果を AC-0030 に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-14.md`）を書いた
- [ ] 依頼の影響の一覧の「結果」がすべて埋まった
