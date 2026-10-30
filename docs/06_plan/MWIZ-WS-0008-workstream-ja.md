---
id: MWIZ-WS-0008
type: Workstream
title: 敵の姿を見る
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0008（v1.1）
  - MWIZ-US-0033（v1.1）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0008 敵の姿を見る

- 実施の順：8 / 10（エピックの段階 8。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0008](../02_requirements/MWIZ-EP-0008-epic-ja.md)
- ユーザーストーリー：US-0033

## 目的

オーナーが用意した 256×256 の敵の絵 6 枚を置き、戦闘画面に出す。

## TASK（この順に進める。確認 ID 5 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0018](MWIZ-TASK-0018-implementation-task-ja.md) | 敵の絵 | 5 | `feat/TASK-0018-enemy-images` |

## WS の終わりの手動テスト

手動の確認 ID はない。公開 URL を実機で開き、この WS で作った画面が動くことだけを確かめる（AC に書く）。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-08.md`）を書いた
