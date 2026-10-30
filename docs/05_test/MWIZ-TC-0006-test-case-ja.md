---
id: MWIZ-TC-0006
type: Test Case
title: タイトル画面から始める
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0006（v1.1）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0002（v1.0）
  - docs/specification-ja.md (v1.2) §10.1、§11.2、§11.4、§11.5、§16.4、§19.1、§27.4
verified: null
---

# TC-0006 タイトル画面から始める

- 対象：[US-0006](../02_requirements/MWIZ-US-0006-user-story-ja.md)（受け入れ条件 5 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0006-01 | 1 | タイトル画面に、`aria-hidden` の飾り線 2 本、`<h1>`「WIZ」、「～ 死霊術師の迷宮 ～」、メニュー（`role="menu"`、`aria-label="タイトル"`）の項目が上から「はじめから」「つづきから」「おと：オフ」、「インストール」のボタン、「v1.0」が出る。メッセージ欄（`role="log"`）がない | E2E | `e2e/title.spec.ts` |
| TC-0006-02 | 1 | 版の表記の関数が、`package.json` の `version` の先頭 2 つに「v」を付けて返す（`"1.0.0"` → `"v1.0"`、`"1.2.3"` → `"v1.2"`） | 単体 | `tests/logic/version.test.ts` |
| TC-0006-03 | 2 | セーブ（名前「ゆうしゃ」・Lv12）があるとき、「つづきから」の行に ▶ があってフォーカスされ、右に「ゆうしゃ Lv12」が出る | E2E | `e2e/title.spec.ts` |
| TC-0006-04 | 2 | セーブがないとき、カーソルは「はじめから」。「つづきから」の行は `aria-disabled="true"` で、文字の色が disabled（`#8C857A`。`rgb(140, 133, 122)`）。選んでも画面は `title` のまま、ハッシュは `#/` のまま、`body[data-busy]` が `true` にならず、何も出ない | E2E | `e2e/title.spec.ts` |
| TC-0006-05 | 3 | 「はじめから」を決定すると、ハッシュが `#/new`、`body[data-screen="new"]` になる | E2E | `e2e/title.spec.ts` |
| TC-0006-06 | 4 | プレイ中のゲームがないとき、`#/inn`・`#/dungeon`・`#/battle`・`#/clear`・`#/swap`・`#/nothing`・ハッシュなし を開くと、ハッシュが `#/`、`body[data-screen="title"]` になる。`#/new` を開くと名前入力のまま。置き換えなので `history.length` が増えない | E2E | `e2e/title.spec.ts` |
| TC-0006-07 | 5 | プレイ中のゲームの場所が INN・DUNGEON・BATTLE・CLEARED・SWAP のとき、`#/`・`#/new`・ほかの画面のハッシュのどれを開いても、それぞれ `#/inn`・`#/dungeon`・`#/battle`・`#/clear`・`#/swap` になる | E2E | `e2e/title.spec.ts` |
| TC-0006-08 | 5 | プレイ中のゲームがある（INN）とき、`#/nothing` を開くと `#/` を経て `#/inn` になり、宿屋の画面が出る | E2E | `e2e/title.spec.ts` |

## 2. 準備

- E2E：`?debug=1` で開き、`__wiz.writeState`・`writeSave` で状態とセーブを作る（`e2e/helpers.ts`）。ゲームがない場面は、`mini-wiz-game-game` のない新しいコンテキストで開く。
- 単体：`version.ts` に `version` の文字列を渡して呼ぶ。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0006-04 | セーブなしで開く → ↓ で「つづきから」へ動かして Enter（`desktop`）／タップ（`pixel7`・`small`）→ 500ms 待って、画面・ハッシュ・`data-busy` が変わらない |
| TC-0006-06 | `page.goto('/?debug=1#/inn')` などで開き直し、`waitForURL(/#\/$/)` を待つ。`history.length` を前後で比べる |
| TC-0006-07 | 場所ごとに `writeState` で状態を作り、ハッシュを替えて開き直す。`body[data-screen]` とハッシュを確かめる |
| TC-0006-08 | 宿屋の状態で `#/nothing` を開く → ハッシュが `#/inn`、`body[data-screen="inn"]`。どちらも置き換えなので `history.length` が増えない（`#/` を経たことは画面に出ないので、行き先と履歴だけを見る） |

## 4. 手動の手順

なし。
