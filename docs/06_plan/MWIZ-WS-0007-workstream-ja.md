---
id: MWIZ-WS-0007
type: Workstream
title: 演出と効果音で盛り上げる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0007（v1.0）
  - MWIZ-US-0031（v1.0）
  - MWIZ-US-0032（v1.1）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0007 演出と効果音で盛り上げる

- 実施の順：7 / 10（エピックの段階 7。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0007](../02_requirements/MWIZ-EP-0007-epic-ja.md)
- ユーザーストーリー：US-0031、US-0032

## 目的

演出（レベルアップ・レアドロップ・ボス）と効果音、音のオン／オフを作る。

## TASK（この順に進める。確認 ID 32 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0016](MWIZ-TASK-0016-implementation-task-ja.md) | 演出 | 11 | `feat/TASK-0016-effects` |
| [TASK-0017](MWIZ-TASK-0017-implementation-task-ja.md) | 効果音と音の設定 | 21 | `feat/TASK-0017-sound` |

## WS の終わりの手動テスト

実機（iPhone 11・PC）で次の確認 ID を行い、それぞれの TASK の AC に結果を書く：TC-0032-18、TC-0032-20。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-07.md`）を書いた
