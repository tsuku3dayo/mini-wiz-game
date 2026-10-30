---
id: MWIZ-WS-0004
type: Workstream
title: 敵と戦い、強くなる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0004（v1.0）
  - MWIZ-US-0018（v1.0）
  - MWIZ-US-0019（v1.0）
  - MWIZ-US-0020（v1.0）
  - MWIZ-US-0021（v1.0）
  - MWIZ-US-0022（v1.0）
  - MWIZ-US-0023（v1.0）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0004 敵と戦い、強くなる

- 実施の順：4 / 10（エピックの段階 4。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0004](../02_requirements/MWIZ-EP-0004-epic-ja.md)
- ユーザーストーリー：US-0018、US-0019、US-0020、US-0021、US-0022、US-0023

## 目的

遭遇・戦闘（たたかう・ヒール・にげる）・経験値とレベルアップ・死亡を作る。

## TASK（この順に進める。確認 ID 47 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0010](MWIZ-TASK-0010-implementation-task-ja.md) | 戦闘のルールとゲーム API | 31 | `feat/TASK-0010-battle-rules` |
| [TASK-0011](MWIZ-TASK-0011-implementation-task-ja.md) | 戦闘の画面 | 16 | `feat/TASK-0011-battle-screen` |

## WS の終わりの手動テスト

手動の確認 ID はない。公開 URL を実機で開き、この WS で作った画面が動くことだけを確かめる（AC に書く）。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-04.md`）を書いた
