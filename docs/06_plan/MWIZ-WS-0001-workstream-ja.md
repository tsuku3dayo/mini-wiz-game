---
id: MWIZ-WS-0001
type: Workstream
title: 土台（公開・CI・PWA・更新・起動の復旧）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0001（v1.0）
  - MWIZ-US-0001（v1.0）
  - MWIZ-US-0002（v1.0）
  - MWIZ-US-0003（v1.0）
  - MWIZ-US-0004（v1.0）
  - MWIZ-US-0005（v1.0）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0001 土台（公開・CI・PWA・更新・起動の復旧）

- 実施の順：1 / 10（エピックの段階 1。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md)
- ユーザーストーリー：US-0001、US-0002、US-0003、US-0004、US-0005

## 目的

公開 URL を開くだけで動き、ホーム画面に追加でき、通信なしでも起動し、新しい版に安全に切り替えられる土台を作る。CI・GitHub Pages への公開・成果物の検査を最初に用意し、以降の WS を公開 URL と実機で確かめられるようにする。

## TASK（この順に進める。確認 ID 24 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0001](MWIZ-TASK-0001-implementation-task-ja.md) | 開発の土台と公開 | 5 | `feat/TASK-0001-foundation` |
| [TASK-0002](MWIZ-TASK-0002-implementation-task-ja.md) | PWA（manifest・アイコン・オフライン・インストールの案内） | 10 | `feat/TASK-0002-pwa` |
| [TASK-0003](MWIZ-TASK-0003-implementation-task-ja.md) | 更新の帯と起動の復旧 | 9 | `feat/TASK-0003-update-boot` |

## WS の終わりの手動テスト

実機（iPhone 11・PC）で次の確認 ID を行い、それぞれの TASK の AC に結果を書く：TC-0002-07、TC-0003-03、TC-0004-04。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-01.md`）を書いた
