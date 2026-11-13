---
id: MWIZ-TC-0009
type: Test Case
title: セーブして、つづきから再開する
status: stable
version: 1.2
updated: 2026-11-13
sources:
  - MWIZ-US-0009（v1.2）
  - MWIZ-TST-0001（v1.2）
  - MWIZ-TD-0002（v1.11）
  - MWIZ-TD-0004（v1.9）
  - MWIZ-GUI-0003（v1.3）
  - docs/specification-ja.md (v1.22) §9.2、§11.4、§11.5、§16.2、§21.4、§21.6
verified: null
---

# TC-0009 セーブして、つづきから再開する

- 対象：[US-0009](../02_requirements/MWIZ-US-0009-user-story-ja.md)（受け入れ条件 6 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0009-01 | 1 | INN で `api.save({ slot: 2 })` すると、`mini-wiz-game-save-2` が版 4（v1.2。仕様書 v1.21。v1.1 までは版 3）・キャラクター 10 項目（今の HP・MP）・所持品（`pending` は null）・実績・`savedAt` で書かれ、プレイ中の状態は `saveSlot` が 2 になり `revision` が 1 増える（ほかの値は変わらない）。スロット 1・3 は変わらない。メッセージは「スロット2に セーブしました」（success）1 行。`slot` が 0・4・`'1'`・欠けのときは 400 `validation_error`（`details[0].message` が `slot must be one of the following values: 1, 2, 3`）。DUNGEON・BATTLE・SWAP・CLEARED では 409 `invalid_state` でセーブが変わらない（v1.1） | 単体 | `tests/api/game-api.test.ts` |
| TC-0009-02 | 1 | 宿屋で「セーブ」を選ぶと、メニューの場所が見出し「セーブ」のスロットの一覧（もどる／スロット1／スロット2／スロット3。中身のあるスロットは「スロット{n}　{名前} Lv{n}」、空きは「スロット{n}　－ なし －」）に替わる。初めのカーソルは最後に使ったスロット（なければ最初の空き、それもなければスロット1）。空きのスロットを選ぶと確認を出さずに「スロット{n}に セーブしました」が出て、宿屋のメニューに戻り、カーソルとフォーカスが「セーブ」にある（v1.1） | E2E | `e2e/inn.spec.ts` |
| TC-0009-03 | 2 | `api.load({ slot })` は、どの場所からでもプレイ中の状態をそのスロットのセーブの値で置き換え、場所 INN・ダンジョンと戦闘は null・`saveSlot` がそのスロット。メッセージは「{名前}は 宿屋で めをさました」。空きのスロットなら 404 `save_not_found`「セーブデータが ありません」、`slot` が 1〜3 でなければ 400。`api.getSaves()` は長さ 3 の `slots`（セーブがあれば `{ slot, name, level, savedAt }`、空き・読めない値は null）を返す（v1.1） | 単体 | `tests/api/game-api.test.ts` |
| TC-0009-04 | 2 | タイトルで「つづきから」を決定すると、メニューの場所が見出し「つづきから」のスロットの一覧（もどる／スロット1〜3）に替わる。空きのスロットは `aria-disabled="true"`。初めのカーソルは `savedAt` がいちばん新しいスロット。セーブのあるスロットを選ぶと宿屋の画面になり、メッセージ欄に「ゆうしゃは 宿屋で めをさました」が出る。もどる・Esc でタイトルのメニューに戻り、カーソルが「つづきから」（v1.1） | E2E | `e2e/inn.spec.ts` |
| TC-0009-05 | 4 | 宿屋で「タイトルへ戻る」を選ぶと、メニューの場所が確認（見出し「かくにん」、文「プレイ中の ぼうけんは きえます。よろしいですか？」、はい／いいえ、カーソルは いいえ）に替わる。「はい」でタイトル画面になり、`mini-wiz-game-game` がなくなる。「いいえ」で宿屋のメニューに戻り、カーソルは「タイトルへ戻る」 | E2E | `e2e/inn.spec.ts` |
| TC-0009-06 | 4 | 確認で Esc を押すと、宿屋のメニューに戻り、カーソルとフォーカスが「タイトルへ戻る」にある。プレイ中の状態は消えない | E2E（キー、`desktop`） | `e2e/inn.spec.ts` |
| TC-0009-07 | 5 | 戦闘中（敵の残り HP を減らした状態）・入れ替え待ち（落ちている装備あり）・宿屋のそれぞれで、`page.reload()` のあとも同じ画面になり、`mini-wiz-game-game`・`mini-wiz-game-save` の文字列が読み込み直す前と同じ。入れ替えの画面では同じ「おちている」装備の名前が出る | E2E | `e2e/boot.spec.ts` |
| TC-0009-08 | 5 | ページを閉じて（`page.close()`）同じコンテキストで新しいページを開いても、TC-0009-07 と同じ画面と保存の値になる | E2E | `e2e/boot.spec.ts` |
| TC-0009-09 | 6 | `migrateGameState`：版 2 で `dungeon` があるものは各階に長さ 100 の `visited` を補い、今の階の今の位置だけ true（ボスのマスなら記録しない）。版 1 で場所が DUNGEON・BATTLE なら INN に戻し、ダンジョンと戦闘を null。どの版も `inventory`・`records` を補う。`migrateSave`：版 1 は所持品を空・実績を初期値、版 2 は所持品を補い実績を初期値、版 3・4 は両方を補う、それ以外は例外 `Unsupported save schemaVersion: n`（v1.2：版 4 を足した） | 単体 | `tests/domain/game-state.test.ts` |
| TC-0009-10 | 6 | 保存に版 1〜6 のゲーム状態を置いて `api.getGame()` を呼ぶと、移したあとの GameView が返る（版 5 以下で `saveSlot` を持たないものは `saveSlot` が null、1〜3 を持つものはその値）。版 1〜3 のセーブを置いて `api.load({ slot: 1 })` を呼ぶと宿屋から始まる。版 5 のセーブでは 500 `internal_error`（v1.1。v1.2：仕様書 v1.21 で版を 7・4 に上げたので、範囲を 1 つずつ広げた） | 単体 | `tests/api/game-api.test.ts` |
| TC-0009-11 | 1 | 宿屋の「セーブ」で中身のあるスロットを選ぶと、確認（見出し「かくにん」、文「スロット{n}（{名前} Lv{n}）に うわがきしますか？」、カーソルは いいえ）が出る。いいえ・Esc でスロットの一覧に戻り、カーソルが同じスロット。はい で書き、「スロット{n}に セーブしました」が出る（v1.1） | E2E | `e2e/inn.spec.ts` |
| TC-0009-12 | 3 | `migrateStorage()`：版 1 の保存（`mini-wiz-game-save` とプレイ中の状態あり）を置いて呼ぶと、`mini-wiz-game-save-1` に同じ文字列が書かれ、プレイ中の状態に `saveSlot: 1` が足され（ほかの値・`revision` は同じ）、`mini-wiz-game-save` が消え、`mini-wiz-game-schema` が 2 になる。`mini-wiz-game-save` がなければプレイ中の状態に触れない。途中の書き込みを失敗させると、どのキーも前の値のままで版は 1（v1.1） | 単体 | `tests/platform/storage.test.ts` |
| TC-0009-13 | 6 | アクセの ID の付け替え（v1.2。仕様書 v1.21 §21.4）：版 6 のゲーム状態の装備中・所持品・入れ替え待ちに `accessory1`〜`accessory8` を 1 つずつ置いて `migrateGameState` を通すと、`accessory1`→`accessory3`（ガードリング）、`accessory2`→`accessory4`、`accessory3`→`accessory5`、`accessory4`→`accessory1`、`accessory5`→`accessory2`、`accessory6`〜`8` とほかの部位はそのまま。付け替えのあと §8.3 の補正がかかる（例：版 6 の `accessory4`［R］value 15 → `accessory1`［R］value 7、`accessory3`［N］value 3 → `accessory5`［R］value 4、`accessory1`［N］value 2 → `accessory3`［R］value 4）。版 7 の同じ値は付け替えない（`accessory4`［R］15 は パワーリング［R］12 になる）。版 3 のセーブを `migrateSave` に通すと同じく付け替わり、版 4 は付け替えない。付け替えたあとの値をもう一度通しても変わらない | 単体 | `tests/domain/game-state.test.ts` |

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
