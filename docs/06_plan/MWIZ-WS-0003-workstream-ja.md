---
id: MWIZ-WS-0003
type: Workstream
title: 迷宮を探索する
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0003（v1.0）
  - MWIZ-US-0013（v1.0）
  - MWIZ-US-0014（v1.0）
  - MWIZ-US-0015（v1.0）
  - MWIZ-US-0016（v1.0）
  - MWIZ-US-0017（v1.0）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0003 迷宮を探索する

- 実施の順：3 / 10（エピックの段階 3。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0003](../02_requirements/MWIZ-EP-0003-epic-ja.md)
- ユーザーストーリー：US-0013、US-0014、US-0015、US-0016、US-0017

## 目的

5 階層のダンジョンを生成し、疑似3D と自動地図を見ながら歩き、階段で昇り降りし、宿屋に戻れるようにする。

## TASK（この順に進める。確認 ID 37 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0008](MWIZ-TASK-0008-implementation-task-ja.md) | ダンジョンのルールとゲーム API | 18 | `feat/TASK-0008-dungeon-rules` |
| [TASK-0009](MWIZ-TASK-0009-implementation-task-ja.md) | ダンジョンの画面 | 19 | `feat/TASK-0009-dungeon-screen` |

## WS の終わりの手動テスト

実機（iPhone 11・PC）で次の確認 ID を行い、それぞれの TASK の AC に結果を書く：TC-0002-07、TC-0014-08。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-03.md`）を書いた
