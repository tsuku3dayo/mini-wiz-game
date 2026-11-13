---
id: MWIZ-WS-0011
type: Workstream
title: タイトル画像と名前「WIZミニ」（変更の依頼 v1.3）
status: stable
version: 1.0
updated: 2026-11-05
sources:
  - MWIZ-US-0001（v1.1）
  - MWIZ-US-0002（v1.1）
  - MWIZ-US-0006（v1.4）
  - MWIZ-GUI-0002（v1.5）
  - MWIZ-TST-0001（v1.2）
  - docs/specification-ja.md (v1.22) §11.5、§11.11、§11.12、§13.6、§30.1
verified: null
---

# WS-0011 タイトル画像と名前「WIZミニ」

- 実施の順：11 / 11（完了のあとの変更の依頼 `docs/requests/2026-11-05-spec-1.3-title-image.md` の修正用の WS）
- ユーザーストーリー：US-0001（ページの題名）、US-0002（ホーム画面のアプリ名）、US-0006（タイトル画面）

## 目的

タイトル画面の飾り線・「WIZ」・副題を、オーナーが用意したタイトル画像に替え、ゲームの名前を「WIZミニ」にそろえる（仕様書 v1.3）。

## TASK（確認 ID 9 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0025](MWIZ-TASK-0025-implementation-task-ja.md) | タイトル画像と名前「WIZミニ」 | 9 | `feat/TASK-0025-title-image` |

- TASK-0024 は使わない（AC-0024 をリリースの記録に使ったので、TASK と AC の番号をそろえるため。依頼 §2.2 の 8）。

## WS の終わりの手動テスト

実機（iPhone 11・PC）で次の確認 ID を行い、AC-0025 に結果を書く：TC-0002-07（ホーム画面のアプリ名「WIZミニ」）、TC-0006-13（タイトル画像の見え方）。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] TASK-0025 がマージ・公開された
- [ ] 手動テストの結果を AC-0025 に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-11.md`）を書いた
- [ ] 依頼の影響の一覧の「結果」がすべて埋まった
