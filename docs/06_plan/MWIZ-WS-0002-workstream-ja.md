---
id: MWIZ-WS-0002
type: Workstream
title: キャラクターを作り、宿屋を拠点に遊ぶ
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0002（v1.0）
  - MWIZ-US-0006（v1.1）
  - MWIZ-US-0007（v1.0）
  - MWIZ-US-0008（v1.0）
  - MWIZ-US-0009（v1.0）
  - MWIZ-US-0010（v1.1）
  - MWIZ-US-0011（v1.1）
  - MWIZ-US-0012（v1.1）
  - MWIZ-US-0038（v1.0）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0002 キャラクターを作り、宿屋を拠点に遊ぶ

- 実施の順：2 / 10（エピックの段階 2。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0002](../02_requirements/MWIZ-EP-0002-epic-ja.md)
- ユーザーストーリー：US-0006、US-0007、US-0008、US-0009、US-0010、US-0011、US-0012、US-0038
- US-0038（テスト用の入口）は品質の段階（10）の US だが、E2E で場面を作るために最初に要るので、確認 ID は使う画面を作る TASK に分けた（TASK-0006・0007・0008・0009・0011・0015・0017）。

## 目的

ルールの基本・保存・ゲーム API・画面の共通の仕組みを作り、タイトル → 名前入力 → 宿屋（やすむ・セーブ・メニュー・タイトルへ戻る）まで遊べるようにする。E2E で場面を作るためのテスト用の入口（US-0038）もここで作り始める。

## TASK（この順に進める。確認 ID 67 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0004](MWIZ-TASK-0004-implementation-task-ja.md) | ルールの基本（乱数・定数・状態・キャラクター） | 7 | `feat/TASK-0004-domain-basics` |
| [TASK-0005](MWIZ-TASK-0005-implementation-task-ja.md) | 保存とゲーム API の骨組み | 11 | `feat/TASK-0005-storage-api` |
| [TASK-0006](MWIZ-TASK-0006-implementation-task-ja.md) | 画面の共通の仕組み | 28 | `feat/TASK-0006-ui-core` |
| [TASK-0007](MWIZ-TASK-0007-implementation-task-ja.md) | タイトル・名前入力・宿屋の画面 | 21 | `feat/TASK-0007-title-inn` |

## WS の終わりの手動テスト

実機（iPhone 11・PC）で次の確認 ID を行い、それぞれの TASK の AC に結果を書く：TC-0007-11。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-02.md`）を書いた
