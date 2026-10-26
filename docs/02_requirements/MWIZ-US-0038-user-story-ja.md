---
id: MWIZ-US-0038
type: User Story
title: テストで決まった場面を作れる
status: review
version: 1.0
updated: 2026-10-26
sources:
  - MWIZ-EP-0010（v1.0）
  - docs/specification-ja.md (v1.1) §16.2、§22.2、§28
verified: null
---

# US-0038 テストで決まった場面を作れる

- エピック：[MWIZ-EP-0010](MWIZ-EP-0010-epic-ja.md)（スマートフォンで快適に、誰でも使える（品質））
- 優先順位：38 / 38（段階 10）

## ストーリー

**開発者として**、乱数で決まる場面（遭遇・ドロップ・ボス戦）や、地図の全体を、テストから決まった形で作りたい。**画面の動きを自動テストで確かめられる** ようにするため。

## 受け入れ条件

- [ ] URL に `?debug=1` があるときだけテスト用の入口（`window.__wiz`）ができ、`debugDungeon()` が現在の階の全情報を返す。ないときは `window.__wiz` がない（§16.2）
- [ ] `useSeed(seed)` で以後の乱数を固定でき、`writeState`・`writeSave` で決まった場面から始められ、`setDelay(ms)` で応答を遅らせられる（§28）
- [ ] `body[data-screen]`・`body[data-location]`・`body[data-busy]`、`app:sound`・`app:bgm` イベントで、画面の状態を外から確かめられる（§28）

## 確かめ方

自動（E2E）。
