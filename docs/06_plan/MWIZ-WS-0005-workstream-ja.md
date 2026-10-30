---
id: MWIZ-WS-0005
type: Workstream
title: ボスを倒し、周回して記録を残す
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0005（v1.0）
  - MWIZ-US-0024（v1.0）
  - MWIZ-US-0025（v1.0）
  - MWIZ-US-0026（v1.1）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0005 ボスを倒し、周回して記録を残す

- 実施の順：5 / 10（エピックの段階 5。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0005](../02_requirements/MWIZ-EP-0005-epic-ja.md)
- ユーザーストーリー：US-0024、US-0025、US-0026

## 目的

ボス撃破・ゲームクリア・自動セーブ・周回・実績と、ステータス画面（広い画面では宿屋の実績）を作る。

## TASK（この順に進める。確認 ID 16 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0012](MWIZ-TASK-0012-implementation-task-ja.md) | ボス・ゲームクリア・周回 | 10 | `feat/TASK-0012-boss-clear` |
| [TASK-0013](MWIZ-TASK-0013-implementation-task-ja.md) | 実績とステータス画面 | 6 | `feat/TASK-0013-records-status` |

## WS の終わりの手動テスト

手動の確認 ID はない。公開 URL を実機で開き、この WS で作った画面が動くことだけを確かめる（AC に書く）。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-05.md`）を書いた
