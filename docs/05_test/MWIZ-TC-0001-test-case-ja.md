---
id: MWIZ-TC-0001
type: Test Case
title: 公開 URL を開いて遊び始める
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0001（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0005（v1.0）
  - docs/specification-ja.md (v1.2) §1.3、§11.11、§11.12、§14、§16.6、§21.2、§27.1、§30.4
verified: null
---

# TC-0001 公開 URL を開いて遊び始める

- 対象：[US-0001](../02_requirements/MWIZ-US-0001-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0001-01 | 1 | 保存もキャッシュもない新しいブラウザで `/`（本番のビルド）を開くと、登録・インストールの手順なしで `body[data-screen="title"]` になり、「はじめから」が押せる | E2E | `e2e/title.spec.ts` |
| TC-0001-02 | 2 | `document.title` が「WIZ ～死霊術師の迷宮～」に等しく、`<html lang="ja">` | E2E | `e2e/title.spec.ts` |
| TC-0001-03 | 3 | タイトル → 名前入力 → 宿屋 → ダンジョン → 戦闘（敵の絵を出す）まで遊ぶあいだの、すべての通信（`page.on('request')`）がページと同じオリジン。`GET` 以外の通信がない。`.woff`・`.woff2`・`.ttf`・`.otf` と音声ファイル（`.mp3`・`.ogg`・`.wav`・`.m4a`）の読み込みがない | E2E | `e2e/pwa.spec.ts` |
| TC-0001-04 | 4 | 遊んで、音を「おと：オン」にしたあと、`localStorage` のキーがすべて `mini-wiz-game-` で始まり（`schema`・`game`・`save`・`sound`）、`sessionStorage` のキーがすべて `mini-wiz-game:` で始まる | E2E | `e2e/pwa.spec.ts` |
| TC-0001-05 | 4 | ほかのアプリのデータ（`localStorage` の `mini-blockbreaking-game-save`、範囲を含まない名前のキャッシュ）を置いてから起動の復旧を起こしても、それらが残る（このアプリの範囲の名前を含むキャッシュだけが消える） | E2E | `e2e/boot.spec.ts` |

## 2. 準備

- E2E：本番のビルドを `vite preview` で出す（TST-0001 §3）。TC-0001-01・02 は保存のない新しいブラウザのコンテキストで開く。
- TC-0001-03：`?debug=1` で開き、`__wiz.writeState` で戦闘中（敵はスライム）の状態を作って敵の絵を読ませる。
- TC-0001-05：起動を失敗させる方法は TC-0005 の準備と同じ。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0001-03 | `page.on('request')` で URL とメソッドを集める → タイトルを開く → 「はじめから」→ 名前「ゆうしゃ」で決定 → 宿屋で「ダンジョンへ」→ `writeState` で戦闘の状態にして `[data-testid="enemy-image-frame"] img` が読めるまで待つ → 集めた URL の `origin` がすべて `location.origin` に等しいことを確かめる |
| TC-0001-04 | TC-0001-03 のあとで「タイトルへ戻る」以外の状態のまま、`Object.keys(localStorage)`・`Object.keys(sessionStorage)` を取って、始まりの文字を確かめる |
| TC-0001-05 | `addInitScript` で `localStorage.setItem('mini-blockbreaking-game-save', 'x')` を入れ、`caches.open('other-app-cache')` と、名前にこのアプリの範囲（`new URL('./', location.href).href`）を含むキャッシュを作る → 起動を 1 回失敗させて自動の読み込み直しを待つ → `localStorage` の `mini-blockbreaking-game-save` が `x` のまま、`caches.keys()` に `other-app-cache` があり、範囲を含む名前のキャッシュがない |

## 4. 手動の手順

なし。
