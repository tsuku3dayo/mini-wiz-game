---
id: MWIZ-WS-0009
type: Workstream
title: 場面ごとの BGM を流す
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0009（v1.0）
  - MWIZ-US-0034（v1.0）
  - MWIZ-TST-0001（v1.0）
verified: null
---

# WS-0009 場面ごとの BGM を流す

- 実施の順：9 / 10（エピックの段階 9。[EP-0001](../02_requirements/MWIZ-EP-0001-epic-ja.md) の優先順位）
- エピック：[EP-0009](../02_requirements/MWIZ-EP-0009-epic-ja.md)
- ユーザーストーリー：US-0034

## 目的

FM 音源風の BGM 5 曲の再生エンジン・曲データと、場面に合わせて曲を替える仕組みを作る。

## TASK（この順に進める。確認 ID 23 個）

| TASK | 内容 | 確認 ID の数 | ブランチ |
| --- | --- | --- | --- |
| [TASK-0019](MWIZ-TASK-0019-implementation-task-ja.md) | BGM の再生エンジンと曲データ | 7 | `feat/TASK-0019-bgm-engine` |
| [TASK-0020](MWIZ-TASK-0020-implementation-task-ja.md) | BGM の監督（場面と曲） | 16 | `feat/TASK-0020-bgm-director` |

## WS の終わりの手動テスト

実機（iPhone 11・PC）で次の確認 ID を行い、それぞれの TASK の AC に結果を書く：TC-0034-04、TC-0034-18、TC-0034-23。

Android の実機はないので、Android での確認は AC の「確認できなかったこと」に書く（E2E の `pixel7` で代わりに確かめる）。

## 完了の条件

- [ ] 上の TASK がすべてマージ・公開された
- [ ] 手動テストの結果を AC に書き、AC がオーナーに承認された
- [ ] ふりかえり（`docs/retrospectives/ws-09.md`）を書いた
