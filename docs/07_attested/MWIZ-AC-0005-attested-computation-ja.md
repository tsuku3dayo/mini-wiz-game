---
id: MWIZ-AC-0005
type: Attested Computation
title: 保存とゲーム API の骨組み の実施記録
status: stable
version: 1.0
updated: 2026-11-02
sources:
  - MWIZ-TASK-0005（v1.0）
  - MWIZ-TC-0007（v1.1）
  - MWIZ-TC-0009（v1.1）
  - MWIZ-TC-0012（v1.2）
  - MWIZ-TD-0002（v1.9）
verified: { by: "tsuku3dayo", at: "2026-11-02T11:55:40+09:00" }
---

# AC-0005 保存とゲーム API の骨組み の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0005](../06_plan/MWIZ-TASK-0005-implementation-task-ja.md) 保存とゲーム API の骨組み |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0005-storage-api` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの（画面は変えていない。`main.ts` へのつなぎ込みは TASK-0006・0007）：

- 基盤：`platform/storage.ts`（キーに `mini-wiz-game-` を付ける、例外を外に出さない、`writeAll` は途中で失敗したら戻す、`migrateStorage`）・`math-rng.ts`・`clock.ts`
- ゲーム API：`api/types.ts`（画面に渡す型・`GameError`・`GameApi`）、`repository.ts`（`KeyValueStore`、読み込み時の移行、revision の確かめ、まとめて書く）、`game-view.ts`（`toGameView`・`toInventoryView`・`toItemView`）、`validate.ts`（startGame の名前）、`game-api.ts`（`run` と getGame・getSave・startGame・quitGame・rest・save・load）
- ルール：`domain/battle.ts` の `toBattleView`（GameView が使うので前倒し。戦闘の中身は TASK-0010）
- テストの道具：`tests/helpers/fake-storage.ts`（指定した名前の書き込みを失敗させる・読むたびに呼ぶ関数・読み書きの記録・壊れた文字列を置ける。TASK-0004 から移した）

設計の直し：TD-0002 v1.2 §3.1（引数の名前を仕様書どおり `store` に、`KeyValueStore` の置き場所、`delayMs` は TASK-0006、GameView の `dungeon` は TASK-0008 まで null）。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0007-03 | 単体（`tests/api/game-api.test.ts`） | OK。空・空白のみ・9 文字・絵文字で 400 `validation_error`、`details: [{ field: 'name', message }]`。保存は変わらない |
| TC-0007-09 | 単体（同上） | OK。前の状態（revision 4）を上書きして revision 5。セーブのキーは読みも書きもしない（記録で確かめた）。前がなければ revision 0。メッセージは 1 行 |
| TC-0009-01 | 単体（同上） | OK。INN で版 3・キャラクター 10 項目・所持品（入れ替え待ち null）・実績・`savedAt` を書き、プレイ中の状態の文字列は同じ。ほかの 4 つの場所では 409 `invalid_state` でセーブは同じ |
| TC-0009-03 | 単体（同上） | OK。5 つの場所それぞれから、宿屋・ダンジョンと戦闘は null で始まる。メッセージ「アルドは 宿屋で めをさました」。セーブがなければ 404 `save_not_found` |
| TC-0009-10 | 単体（同上） | OK。版 1（ダンジョンの中）・版 2 のゲーム状態は移した GameView。版 1・2 のセーブは宿屋から。版 4 のセーブは 500 `internal_error` |
| TC-0012-09 | 単体（同上） | OK。壊れた JSON・`42`・名前の欠けた値で `getGame()` は `{ state: null }`、`console.warn` は 1 回、値は残る。壊れたセーブで `getSave()` は「なし」 |

確認 ID のないテストも足した：getGame・getSave の中身（装備込みの能力値・新しい順）、rest の revision と保存の失敗、quitGame、`platform/storage.ts` の読み書きと `writeAll` の戻し。

手元で通したもの（2026-11-02）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID）、単体 29 件、build、check:dist OK
- `npm run test:e2e`：36 件通った・3 件はその端末の対象外で飛ばした（33.3 秒）
- スクリーンショット：画面を変えていないので撮っていない

CI の結果（PR #33、2026-11-02）：`check`（verify）OK 57 秒、`e2e` OK 1 分 23 秒。

### WS-0002 の終わりの手動テスト（2026-11-02、オーナー）

この TASK に手動の確認 ID はない。ここで作った保存とゲーム API（startGame）は、WS-0002 の手動テスト（TC-0007-11、iPhone 11 の Safari で名前を入れて宿屋に移る。AC-0007）で使われ、OK だった。本物の localStorage での読み書きは、TASK-0007 の E2E（セーブ・つづきから・タイトルへ戻る）で確かめた。

## 3. 確認できなかったこと

- 手動の確認 ID はこの TASK にない。
- 本物の localStorage での読み書きは、この TASK では画面につないでいないので確かめていない（メモリの Storage で確かめた）。→ TASK-0007 の E2E で確かめた（上の手動テストの節）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面の変更なし）
- [x] 設計と違う作りにしたら、TD・GUI を直した（TD-0002 v1.2）
- [x] AC-0005（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #33）
- [x] マージされた（マージ = 公開。2026-11-02、公開の実行が成功したことを確かめた）
