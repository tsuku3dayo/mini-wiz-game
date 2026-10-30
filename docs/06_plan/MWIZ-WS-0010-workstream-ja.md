---
id: MWIZ-WS-0010
type: Workstream
title: スマートフォンで快適に、誰でも使える（品質）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0010（v1.0）
  - MWIZ-US-0035（v1.1）
  - MWIZ-US-0036（v1.0）
  - MWIZ-US-0037（v1.0）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0010 スマートフォンで快適に、誰でも使える（品質）

- 実施の順：10 / 10（エピックの段階 10。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0010](../02_requirements/MWIZ-EP-0010-epic-ja.md)
- ユーザーストーリー：US-0035、US-0036、US-0037
- US-0038 の確認 ID は WS-0002〜0007 の TASK に分けた（WS-0002 を参照）。

## 目的

全体を通して、画面の大きさ・タッチ・キーボード・読み上げ・速さを確かめて仕上げる。各 WS で守ってきた決まりを、全画面の通しのテストで確かめる。

## TASK（この順に進める。確認 ID 29 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0021](MWIZ-TASK-0021-implementation-task-ja.md) | 画面の大きさとタッチ（全画面の通し） | 12 | `feat/TASK-0021-layout` |
| [TASK-0022](MWIZ-TASK-0022-implementation-task-ja.md) | キーボードと読み上げ | 10 | `feat/TASK-0022-a11y` |
| [TASK-0023](MWIZ-TASK-0023-implementation-task-ja.md) | 速さ | 7 | `feat/TASK-0023-performance` |

## WS の終わりの手動テスト

実機（iPhone 11・PC）で次の確認 ID を行い、それぞれの TASK の AC に結果を書く：TC-0035-05、TC-0035-07、TC-0035-08、TC-0035-11、TC-0036-09、TC-0037-03、TC-0037-06。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-10.md`）を書いた
