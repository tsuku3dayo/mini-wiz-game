---
id: MWIZ-WS-0006
type: Workstream
title: 装備を集めて強くする
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0006（v1.0）
  - MWIZ-US-0027（v1.0）
  - MWIZ-US-0028（v1.0）
  - MWIZ-US-0029（v1.0）
  - MWIZ-US-0030（v1.0）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0006 装備を集めて強くする

- 実施の順：6 / 10（エピックの段階 6。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0006](../02_requirements/MWIZ-EP-0006-epic-ja.md)
- ユーザーストーリー：US-0027、US-0028、US-0029、US-0030

## 目的

ドロップ・所持品・付け替え・捨てる・入れ替えと、そうび・もちもの・入れ替えの画面を作る。

## TASK（この順に進める。確認 ID 43 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0014](MWIZ-TASK-0014-implementation-task-ja.md) | 装備のルールとゲーム API | 23 | `feat/TASK-0014-items-rules` |
| [TASK-0015](MWIZ-TASK-0015-implementation-task-ja.md) | そうび・もちもの・入れ替えの画面 | 20 | `feat/TASK-0015-items-screens` |

## WS の終わりの手動テスト

手動の確認 ID はない。公開 URL を実機で開き、この WS で作った画面が動くことだけを確かめる（AC に書く）。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-06.md`）を書いた
