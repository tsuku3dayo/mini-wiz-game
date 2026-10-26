---
id: MWIZ-ADR-0007
type: Architecture Decision
title: アプリ識別子を mini-wiz-game にする
status: stable
version: 1.0
updated: 2026-10-26
sources:
  - MWIZ-PB-0001（v1.0）§5、§10
  - docs/specification-ja.md (v1.1) §19.1、§21.2、§30.4、§32
  - mini-blockbreaking-game doc/01_architecture/MBRK-ADR-0007（v1.1）
verified: { by: "tsuku3dayo", at: "2026-10-26T17:16:59+09:00" }
---

# ADR-0007 アプリ識別子を mini-wiz-game にする

## 状況

GitHub Pages では、同じアカウントのアプリはすべて同じサイト（`tsuku3dayo.github.io`）に載り、localStorage・sessionStorage・Service Worker・キャッシュを共有する。すでに `mini-blockbreaking-game` が載る。参照プロジェクトでは、アプリ識別子（`package.json` の `name`）を、保存のキーの接頭辞と、起動失敗時に消すキャッシュ・Service Worker の範囲に使って、ほかのアプリと混ざらないようにしている。識別子を後から変えると、プレイ中の状態とセーブが引き継がれない。

## 決定

アプリ識別子は `mini-wiz-game` とする。リポジトリ名（`tsuku3dayo/mini-wiz-game`）・公開 URL のパスと同じにする。

- `package.json` の `name`：`mini-wiz-game`
- 保存のキー：`mini-wiz-game-<名前>`（`game`・`save`・`sound`・`schema`）
- 起動の復旧の印：sessionStorage の `mini-wiz-game:boot-repair-at`
- `index.html` の `<meta name="app-id" content="mini-wiz-game">`（`boot.js` が読む）
- 表示名（manifest の `name`・`short_name`、`apple-mobile-web-app-title`）：「WIZ」。ページの題名：「WIZ ～死霊術師の迷宮～」。表示名は保存のキーに使わないので、変えても保存は引き継がれる

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **A. `mini-wiz-game`（採用）** | リポジトリ名・URL と一致して分かりやすい。`mini-blockbreaking-game` と同じ付け方 | 少し長い（使うのはコードの中だけ） |
| B. `wiz` | 短い | 元の WIZ のキー（`wiz.sound`）や、ほかの WIZ のアプリとぶつかりやすい |

## 結果

- 公開後は変えない。変える必要が出たら、保存データの移行と合わせて新しい ADR で決める。
- `scripts/check-dist.mjs` の `APP_ID` も `mini-wiz-game` にする。
