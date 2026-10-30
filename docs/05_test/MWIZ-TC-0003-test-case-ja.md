---
id: MWIZ-TC-0003
type: Test Case
title: 通信なしで遊ぶ
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0003（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0005（v1.2）
  - docs/specification-ja.md (v1.2) §1.3、§11.12、§13.1、§14、§16.6、§30.1
verified: null
---

# TC-0003 通信なしで遊ぶ

- 対象：[US-0003](../02_requirements/MWIZ-US-0003-user-story-ja.md)（受け入れ条件 2 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0003-01 | 1 | 一度開いて Service Worker が動き出したあと、通信を切って読み込み直すと、タイトル画面が出る。はじめから → 宿屋で「セーブ」（「セーブしました」）→ 「ダンジョンへ」→ 戦闘でスライムの絵（`naturalWidth` が 256）が出る → 読み込み直してもその画面のまま → 宿屋で「タイトルへ戻る」→「つづきから」で宿屋に戻る（「{名前}は 宿屋で めをさました」） | E2E | `e2e/pwa.spec.ts` |
| TC-0003-02 | 2 | 一度開いたあと、Service Worker の事前キャッシュ（`caches`）に `index.html`・`manifest.webmanifest`・ビルドの `.js`・`.css` と、`enemies/` の 6 枚（`slime.png`・`goblin.png`・`skeleton.png`・`orc.png`・`darkKnight.png`・`necromancer.png`）が入っている | E2E | `e2e/pwa.spec.ts` |
| TC-0003-03 | 1 | iPhone 11 のホーム画面のアプリと Safari の両方で、機内モードにして起動・ダンジョンの探索・戦闘（敵の絵が出る）・宿屋でセーブ・つづきから ができる | 手動 | 実機（iPhone 11） |

## 2. 準備

- E2E：本番のビルドを `vite preview` で出す。`?debug=1` で開き、`navigator.serviceWorker.ready` と `navigator.serviceWorker.controller` があることを待ってから `context.setOffline(true)` にする。
- 戦闘の場面は `__wiz.writeState` で作る（敵はスライム）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0003-01 | 開く → SW が動くまで待つ → `context.setOffline(true)` → `page.reload()` → `body[data-screen="title"]` → 上の順に遊ぶ。最後まで `pageerror` が 0 件 |
| TC-0003-02 | SW が動くまで待つ → `page.evaluate` で `caches.keys()` の各キャッシュの `keys()` を集め、URL の末尾で上のファイルがそろっていることを確かめる |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0003-03 | 通信のある状態で公開 URL（またはホーム画面のアプリ）を一度開いて閉じる → 機内モードにする → もう一度開く → はじめから → ダンジョンで戦闘になるまで歩く → 宿屋に戻って「セーブ」→「タイトルへ戻る」→「つづきから」 | どの画面も通信のエラーにならず出る。戦闘で敵の絵が出る。つづきからで宿屋に戻る。Android の実機はないので、AC の「確認できなかったこと」に書く |
