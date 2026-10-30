---
id: MWIZ-TC-0012
type: Test Case
title: できない操作・保存の失敗が分かる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0012（v1.1）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0007（v1.0）
  - docs/specification-ja.md (v1.2) §10.3、§11.9、§16.2、§16.4、§21、§22.3
verified: null
---

# TC-0012 できない操作・保存の失敗が分かる

- 対象：[US-0012](../02_requirements/MWIZ-US-0012-user-story-ja.md)（受け入れ条件 6 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0012-01 | 1 | `assertLocation(state, ...allowed)` は、場所が `allowed` にないとき `InvalidStateError`（status 409、code `invalid_state`、「その操作は いまは できない」）を投げ、あるときは投げない。入力の状態は変わらない | 単体 | `tests/domain/game-state.test.ts` |
| TC-0012-02 | 1 | ゲーム API で、仕様書 §10.3 の表の操作ごとに、許されない場所（INN・DUNGEON・BATTLE・SWAP・CLEARED のうち表にないもの）の状態から呼ぶと 409 `invalid_state` で reject する（例：INN で `move`、DUNGEON で `battle`、BATTLE で `enterDungeon`、SWAP で `save`）。保存の中身（`mini-wiz-game-game`・`mini-wiz-game-save`。revision を含む）が操作の前と同じ | 単体 | `tests/api/game-api.test.ts` |
| TC-0012-03 | 2 | 偽の保存で、書く直前の revision の読み直しのときだけ revision を 1 つ進めておく（ほかのタブが先に書いた）と、`move` が 409 `conflict`「他の操作と競合しました」で reject し、保存の中身はほかのタブが書いた値のまま | 単体 | `tests/api/game-api.test.ts` |
| TC-0012-04 | 3 | 次のどのエラーも `GameError` のインスタンスで、`status`・`error`・`message` を持つ。`details` は 400 `validation_error` で違反が 1 件以上のときだけあり、各要素が `{ field, message }`：400 `validation_error`（`move({ action: 'jump' })`）、404 `game_not_found`（ゲームなしで `move`）、404 `save_not_found`（セーブなしで `load`）、409 `invalid_state`、409 `conflict`、409 `rule_violation`（空き枠を `unequip`。「なにも そうびしていない」）、500 `storage_error`、500 `internal_error`（セーブの `schemaVersion` が 9 で `load`） | 単体 | `tests/api/game-api.test.ts` |
| TC-0012-05 | 4 | 偽の保存で `mini-wiz-game-game` への書き込みを失敗させると、`move` が 500 `storage_error`「保存できませんでした」で reject し、保存の中身が操作の前と同じ。`mini-wiz-game-save` への書き込みを失敗させると `save` が 500 `storage_error` で、前のセーブが残る | 単体 | `tests/api/game-api.test.ts` |
| TC-0012-06 | 5 | メッセージ欄のある画面（宿屋・ダンジョン・戦闘・名前入力）で書き込みに失敗すると、メッセージ欄の場所に ErrorPanel（見出し「エラー」、`data-variant="danger"`、`role="alert"` の「きろくを よみかき できません」、メニューの「再試行」）が出る。メッセージ欄は出ず、ErrorPanel の上の端がメッセージ欄のあった位置（±1px）と同じ。「再試行」にフォーカスがある | E2E | `e2e/error.spec.ts` |
| TC-0012-07 | 5 | タイトルで書き込みに失敗すると（「つづきから」）、ErrorPanel がメニューの下に出る（ErrorPanel の上の端がメニューの下の端より下） | E2E | `e2e/error.spec.ts` |
| TC-0012-08 | 5 | 装備画面・もちもの画面で書き込みに失敗すると（付け替え・捨てる）、ErrorPanel がその画面の一番下に出る（画面の中で ErrorPanel より下に部品がない） | E2E | `e2e/error.spec.ts` |
| TC-0012-09 | 6 | `mini-wiz-game-game` の値が「壊れた JSON」「オブジェクトでない値（`42`）」「キャラクターの項目が欠けたもの」のとき、`getGame()` が `{ state: null }` を返し、`console.warn` が 1 回出て、保存の値は消えずに残る。`mini-wiz-game-save` が壊れているときは `getSave()` が `{ exists: false, summary: null }` | 単体 | `tests/api/game-api.test.ts` |
| TC-0012-10 | 6 | `mini-wiz-game-game` に壊れた値を入れてから `#/inn` を開くと、エラーを出さずにタイトル（`body[data-screen="title"]`・`body[data-location="none"]`）が出る | E2E | `e2e/error.spec.ts` |

## 2. 準備

- 単体：`tests/helpers/fake-storage.ts`（指定したキーで書き込みを失敗させられる。読み直しのときに値を差し替えられるようにする）、`SwappableRng`、`tests/helpers/fixtures.ts` の状態（INN・DUNGEON・BATTLE・SWAP・CLEARED）。`console.warn` は `vi.spyOn` で見る。
- E2E：`?debug=1` で開き、`startAt` で場面を作ってから、`page.evaluate` で `Storage.prototype.setItem` を例外を投げる関数に替える（書き込みの失敗）。壊れた値は `page.addInitScript` で読み込みの前に `localStorage.setItem('mini-wiz-game-game', '{broken')` とする。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0012-06 | 各画面で、先にメッセージ欄（`[data-testid="message-window"]`）の位置を測る → `setItem` を失敗させる → 操作する（宿屋：やすむ、ダンジョン：↑、戦闘：たたかう、名前入力：名前を入れて決定）→ ErrorPanel の位置と中身を確かめる |
| TC-0012-07 | セーブがある状態でタイトルを開く → `setItem` を失敗させる → 「つづきから」 |
| TC-0012-08 | 宿屋のメニューから そうび を開いて候補を付ける／もちもの を開いて捨てる（はい）→ その画面の一番下に ErrorPanel |
| TC-0012-10 | `#/inn` を開く → タイトルが出て、ErrorPanel がない |

## 4. 手動の手順

なし。
