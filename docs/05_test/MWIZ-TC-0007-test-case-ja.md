---
id: MWIZ-TC-0007
type: Test Case
title: 名前を付けてキャラクターを作る
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0007（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0002（v1.0）
  - docs/specification-ja.md (v1.2) §2.1、§11.5、§16.1、§16.4、§21.6、§22.3
verified: null
---

# TC-0007 名前を付けてキャラクターを作る

- 対象：[US-0007](../02_requirements/MWIZ-US-0007-user-story-ja.md)（受け入れ条件 6 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0007-01 | 1 | 名前 `" ゆうしゃ　"` で作ると、名前 `"ゆうしゃ"`、レベル 1・経験値 0・HP 30/30・MP 10/10・こうげき 5・ぼうぎょ 5・すばやさ 5・場所 `INN`、所持品は空（装備なし・持ち物なし・`nextId` 1）、実績 `{ battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 0 }`。乱数を引かない | 単体 | `tests/domain/character.test.ts` |
| TC-0007-02 | 2 | `validateName` が仕様書 §2.1 の入力例の表どおりに返す：`""`・`"   "`・`"　　"` →「名前を入力してください」、`"ゆうしゃアルド12"`（9 文字）→「名前は1〜8文字で入力してください」、`"ゆうしゃ😀"`・`"a<b"`・`"a\nb"`・`"a\u0007b"` →「つかえない もじが ふくまれています」、`"あ"`・`"ゆうしゃアルド1"`・`"Al do"`・`"ゆう　しゃ"`・`"ルー・Ａ１勇"` は可 | 単体 | `tests/domain/character.test.ts` |
| TC-0007-03 | 2 | `api.startGame({ name })` が、空・空白のみ・9 文字・`"ゆうしゃ😀"` のとき `GameError { status: 400, error: 'validation_error', message: '入力が正しくありません', details: [{ field: 'name', message: <上の文言> }] }` で reject し、保存の中身が変わらない | 単体 | `tests/api/game-api.test.ts` |
| TC-0007-04 | 3 | `"𠮷𠮷𠮷𠮷𠮷𠮷𠮷𠮷"`（8 文字・16 コード単位）は作成でき、名前がそのまま。`"𠮷"` 9 文字は「名前は1〜8文字で入力してください」 | 単体 | `tests/domain/character.test.ts` |
| TC-0007-05 | 4 | 画面の名前の規則（`logic/name.ts`）：空は「エラーを出さない・決定は無効・理由は「名前を入力してください」」、9 文字以上・記号を含むものは、エラーの文と決定の無効の理由が §2.1 の文言、規則に合うものは決定が有効。文字数をコードポイントで数える（`"𠮷𠮷"` は 2） | 単体 | `tests/logic/name.test.ts` |
| TC-0007-06 | 4 | 名前入力の画面：表示した時点で入力欄にフォーカスがある。空のとき「決定」が `aria-disabled="true"` でエラーの文は出ない。`a<b` を入れると「決定」が無効になり、入力欄の下に「つかえない もじが ふくまれています」。9 文字を入れると「名前は1〜8文字で入力してください」。無効の「決定」を選ぶと、その文がメッセージ欄に出る。右下の文字数が「{文字数}/8」 | E2E | `e2e/name-entry.spec.ts` |
| TC-0007-07 | 4 | 入力欄で、`isComposing: true` の Enter では画面が変わらない。変換していない Enter で決定して宿屋に移る。Esc でハッシュが `#/`、タイトル画面になる | E2E（キー、`desktop`） | `e2e/name-entry.spec.ts` |
| TC-0007-08 | 5 | 「ゆうしゃ」で決定すると `body[data-screen="inn"]` になり、メッセージ欄に「ゆうしゃの ぼうけんが はじまった」が出る。前から置いたセーブ（`mini-wiz-game-save`）の文字列が変わらない | E2E | `e2e/name-entry.spec.ts` |
| TC-0007-09 | 5 | `api.startGame` は、前のプレイ中の状態を上書きし（前があれば `revision` は前の値 + 1）、セーブのキーを読みも書きもしない。メッセージは「{名前}の ぼうけんが はじまった」（normal） 1 行 | 単体 | `tests/api/game-api.test.ts` |
| TC-0007-10 | 6 | ソフトウェアキーボードが出たときの高さを模して `setViewportSize` を 414 × 400 にしても、入力欄と「決定」が画面の中に見え（`getBoundingClientRect` の下端 ≦ 400）、横にはみ出さない（`scrollWidth − innerWidth` が 0）。入力欄の文字が 16px 以上 | E2E | `e2e/name-entry.spec.ts` |
| TC-0007-11 | 6 | iPhone 11 の Safari で名前の入力欄をタップしてソフトウェアキーボードを出しても、画面が崩れず、入力欄と「決定」が隠れない。入力欄をタップしても画面が拡大しない | 手動 | 実機（iPhone 11） |

## 2. 準備

- 単体：ルールは `character.ts` を直接、ゲーム API は `tests/helpers/fake-storage.ts` と `SwappableRng` を渡して作る。乱数を引かないことは、空の `SequenceRng`（引くと例外）で確かめる。
- E2E：`?debug=1` で開き、ゲームのない状態で `#/new` を開く。TC-0007-08 は先に `__wiz.writeSave` でセーブを置く。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0007-06 | 開いた直後の `document.activeElement` が入力欄 → `a<b` を入れて文を確かめる → 入力を消して `ゆうしゃアルド12` を `evaluate` で `value` に入れ、`input` イベントを送る（`maxLength=8` は手入力を止めるため）→ 文を確かめる →「決定」をタップ／クリック → メッセージ欄の最後の行 |
| TC-0007-07 | 入力欄に `ゆうしゃ` → 入力欄に `new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })` を送る → 500ms 待って画面が `new` のまま → `page.keyboard.press('Enter')` → `inn`。別のテストで Esc → `title` |
| TC-0007-08 | セーブの文字列を読む → 名前を入れて決定 → メッセージの逐次表示を待つ（偽の時計）→ メッセージと、セーブの文字列が同じことを確かめる |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0007-11 | iPhone 11 の Safari で「はじめから」→ 入力欄をタップ → ひらがなで「ゆうしゃ」と入れ、変換の確定に Enter（改行）を押す → もう一度 Enter | ソフトウェアキーボードを出しても入力欄・文字数・「決定」が見えたまま、画面が横にずれない・拡大しない。変換の確定の Enter では宿屋に移らず、次の Enter で移る |
