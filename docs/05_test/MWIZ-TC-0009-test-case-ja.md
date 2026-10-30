---
id: MWIZ-TC-0009
type: Test Case
title: セーブして、つづきから再開する
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0009（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0003（v1.0）
  - docs/specification-ja.md (v1.2) §9.2、§11.4、§11.5、§16.2、§21.4、§21.6
verified: null
---

# TC-0009 セーブして、つづきから再開する

- 対象：[US-0009](../02_requirements/MWIZ-US-0009-user-story-ja.md)（受け入れ条件 5 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0009-01 | 1 | INN で `api.save()` すると、`mini-wiz-game-save` が版 3・キャラクター 10 項目（今の HP・MP）・所持品（`pending` は null）・実績・`savedAt` で書かれ、`mini-wiz-game-game` の文字列は変わらない。メッセージは「セーブしました」（success）1 行。DUNGEON・BATTLE・SWAP・CLEARED では 409 `invalid_state` でセーブが変わらない | 単体 | `tests/api/game-api.test.ts` |
| TC-0009-02 | 1 | 宿屋で「セーブ」を 2 回選ぶと、どちらも確認（見出し「かくにん」）を出さずに、メッセージ欄に「セーブしました」が出る | E2E | `e2e/inn.spec.ts` |
| TC-0009-03 | 2 | `api.load()` は、どの場所からでもプレイ中の状態をセーブの値で置き換え、場所 INN・ダンジョンと戦闘は null。メッセージは「{名前}は 宿屋で めをさました」。セーブがなければ 404 `save_not_found`「セーブデータが ありません」 | 単体 | `tests/api/game-api.test.ts` |
| TC-0009-04 | 2 | タイトルで「つづきから」を決定すると宿屋の画面になり、メッセージ欄に「ゆうしゃは 宿屋で めをさました」が出る | E2E | `e2e/inn.spec.ts` |
| TC-0009-05 | 3 | 宿屋で「タイトルへ戻る」を選ぶと、メニューの場所が確認（見出し「かくにん」、文「プレイ中の ぼうけんは きえます。よろしいですか？」、はい／いいえ、カーソルは いいえ）に替わる。「はい」でタイトル画面になり、`mini-wiz-game-game` がなくなる。「いいえ」で宿屋のメニューに戻り、カーソルは「タイトルへ戻る」 | E2E | `e2e/inn.spec.ts` |
| TC-0009-06 | 3 | 確認で Esc を押すと、宿屋のメニューに戻り、カーソルとフォーカスが「タイトルへ戻る」にある。プレイ中の状態は消えない | E2E（キー、`desktop`） | `e2e/inn.spec.ts` |
| TC-0009-07 | 4 | 戦闘中（敵の残り HP を減らした状態）・入れ替え待ち（落ちている装備あり）・宿屋のそれぞれで、`page.reload()` のあとも同じ画面になり、`mini-wiz-game-game`・`mini-wiz-game-save` の文字列が読み込み直す前と同じ。入れ替えの画面では同じ「おちている」装備の名前が出る | E2E | `e2e/boot.spec.ts` |
| TC-0009-08 | 4 | ページを閉じて（`page.close()`）同じコンテキストで新しいページを開いても、TC-0009-07 と同じ画面と保存の値になる | E2E | `e2e/boot.spec.ts` |
| TC-0009-09 | 5 | `migrateGameState`：版 2 で `dungeon` があるものは各階に長さ 100 の `visited` を補い、今の階の今の位置だけ true（ボスのマスなら記録しない）。版 1 で場所が DUNGEON・BATTLE なら INN に戻し、ダンジョンと戦闘を null。どの版も `inventory`・`records` を補う。`migrateSave`：版 1 は所持品を空・実績を初期値、版 2 は所持品を補い実績を初期値、版 3 は両方を補う、それ以外は例外 `Unsupported save schemaVersion: n` | 単体 | `tests/domain/game-state.test.ts` |
| TC-0009-10 | 5 | 保存に版 1・2 のゲーム状態を置いて `api.getGame()` を呼ぶと、移したあとの GameView が返る。版 1・2 のセーブを置いて `api.load()` を呼ぶと宿屋から始まる。版 4 のセーブでは 500 `internal_error` | 単体 | `tests/api/game-api.test.ts` |

## 2. 準備

- 単体：`tests/helpers/fake-storage.ts` に、版ごとの保存の値（`tests/helpers/fixtures.ts`）を置いてからゲーム API を作る。
- E2E：`?debug=1` で開き、`__wiz.writeState`・`writeSave` で、宿屋（名前「ゆうしゃ」）・戦闘（敵の `hp` を最大より減らした値）・入れ替え待ち（`inventory.pending` あり）の状態とセーブを作る。
- 「アプリを更新したあとも残る」の実機の確かめは TC-0004-04 で行う。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0009-05 | 「タイトルへ戻る」を決定 → 確認の文と ▶ の行（いいえ）→「いいえ」→ メニューのカーソル → もう一度開いて「はい」→ `body[data-screen="title"]`、`localStorage.getItem('mini-wiz-game-game')` が null |
| TC-0009-07 | 場面を作る → 保存の 2 つの値を読む → `page.reload()` → `body[data-screen]` と保存の値を比べる |
| TC-0009-08 | 場面を作る → `page.close()` → `context.newPage()` で `/?debug=1` を開く → 同じく比べる |

## 4. 手動の手順

なし。
