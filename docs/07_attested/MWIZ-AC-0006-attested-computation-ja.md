---
id: MWIZ-AC-0006
type: Attested Computation
title: 画面の共通の仕組み の実施記録
status: stable
version: 1.0
updated: 2026-11-02
sources:
  - MWIZ-TASK-0006（v1.1）
  - MWIZ-TC-0005（v1.1）
  - MWIZ-TC-0007（v1.0）
  - MWIZ-TC-0010（v1.0）
  - MWIZ-TC-0011（v1.1）
  - MWIZ-TD-0001（v1.1）
  - MWIZ-TD-0002（v1.6）
  - MWIZ-TD-0003（v1.4）
  - MWIZ-TD-0005（v1.9）
verified: { by: "tsuku3dayo", at: "2026-11-02T11:55:40+09:00" }
---

# AC-0006 画面の共通の仕組み の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0006](../06_plan/MWIZ-TASK-0006-implementation-task-ja.md) 画面の共通の仕組み |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0006-ui-core` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの：

- 画面の仕組み：`ui/store.ts`（ゲームの状態とセーブの有無。取得の失敗は 1 回だけやり直す）、`router.ts`（ハッシュと LocationGuard。遷移の保留中は替えない。まだない画面は空で出す）、`command.ts`（応答待ち・二重送信の防止・`body[data-busy]`・エラーの扱い・再試行）、`message-queue.ts`（400ms ごとの逐次表示・演出の長さ・保留・スキップ・動きを減らす設定）、`effects.ts`（200ms の点滅）、`dom.ts`（`isWide`・`onWideChange` ほか）
- 共通部品：game-frame（2 カラムを含む）・game-window・command-menu・confirm-menu・game-menu・message-log（`rows`・応答待ちの ▼）・error-panel・text-input・status-panel（full／compact）と、そのスタイル
- 表示の計算：`logic/name.ts`・`menu-model.ts`・`message-plan.ts`、`low-hp.ts`（ステータスの HP の警告に使うので前倒し。テストは TASK-0011）
- テスト用の入口：`writeState`・`writeSave`・`useSeed`・`setDelay`
- 起動：`main.ts` を仕様書 §27.2 の順に組み立て直した（保存 → ゲーム API → ストア → キュー → ルーター）。画面はまだタイトルだけ
- E2E の道具：`e2e/helpers.ts`（宿屋の状態とセーブの見本、`?debug=1` で開く、場面を書く、保存の 3 つの値を読む）

設計の直し：

- 画面層は `src/domain/` を import しない（仕様書 §19.4）ので、テスト用の乱数は基盤の `platform/math-rng.ts` の `createDebugRng()` で組み立てる（TD-0001 v1.1）。
- ゲーム API の中ではタイマーを使えない（仕様書 §19.4）ので、応答の遅れは「待つ関数」`delay` を渡す形にした（TD-0002 v1.3、TD-0005 v1.3）。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0005-05 | E2E（`e2e/boot.spec.ts`。pixel7・small・desktop） | OK。宿屋の状態・セーブ・音の設定を置いてから、1 回だけ失敗（自動で直る）でも、失敗が続いて「なおす」が出たときも、3 つの値の文字列が失敗の前と同じ |
| TC-0005-06 | E2E（同上） | OK。「なおす」を押すと読み込み直し（3 回目の読み込み）、タイトルが出て `#boot-error` は消える。復旧の時刻が押す前より新しく、このアプリの範囲のキャッシュが消え、保存の値は押す前と同じ。※プレイ中の状態を置くと宿屋の画面（TASK-0007）に移るので、この確認ではプレイ中の状態は「なし」のまま比べた |
| TC-0007-05 | 単体（`tests/logic/name.test.ts`） | OK。空はエラーなし・決定は無効（理由「名前を入力してください」）、9 文字・記号は §2.1 の文言、規則に合えば有効。「𠮷𠮷」は 2 文字 |
| TC-0010-01 | 単体（`tests/logic/menu-model.test.ts`） | OK。端で止まる・無効の項目にも止まる・初めのカーソル・範囲の外は最後へ |
| TC-0010-09 | 単体（同上） | OK。閉じ込めありで Tab＝↓・Shift+Tab＝↑、端で止まる。閉じ込めなしはブラウザに任せる |
| TC-0011-01 | 単体（`tests/logic/message-plan.test.ts`） | OK。演出なし 400ms、演出の長さ（levelUp 1000・rareDrop 800／LG 1200・bossAppear 1200・bossDefeat 600・clear 1500）、7 行を超えると古い行が消える |

確認 ID のないテストも足した：遷移の保留の件数。

手元で通したもの（2026-11-02）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID）、単体 34 件、build、check:dist OK
- `npm run test:e2e`：42 件通った・3 件はその端末の対象外で飛ばした（39.6 秒）
- スクリーンショット（本番のビルド）：375 × 667・1280 × 800 で、タイトルの画面が前と同じに出る（起動の流れを替えたため確かめた）

CI の結果：PR #34 で check（1 分 2 秒）・e2e（1 分 25 秒）とも通った。2026-11-02 にマージ、main の test・pages も成功し公開された。

あとで分かったこと（TASK-0007 で直した）：

- command-menu は、行がフォーカスを受けたときに行の要素を全部作り直していた。押し始めでフォーカスが移ると押し終わりが別の要素になり、カーソルのない行をクリック・タップしても決まらなかった（使う画面がなかったので、この TASK の E2E では見つからなかった）。TASK-0007 で、カーソルの移動と無効・有効の切り替えでは行を作り直さないように直した（AC-0007）。
- ルーターは、ハッシュなしで開いたときに `#/` へ置き換えていなかった（TC-0006-06）。TASK-0007 で直した。

### WS-0002 の終わりの手動テスト（2026-11-02、オーナー）

この TASK に手動の確認 ID はない。ここで作った部品（入力欄・メニュー・メッセージ欄）は、WS-0002 の手動テスト（TC-0007-11、iPhone 11 の Safari でソフトウェアキーボードを出して名前を入れる。AC-0007）で使われ、OK だった。

## 3. 確認できなかったこと

- 手動の確認 ID はこの TASK にない。
- 部品（メニュー・メッセージ欄・ステータス・確認・入力欄など）とストア・ルーター・操作の流れの画面での動きは、使う画面がまだない（名前入力・宿屋は TASK-0007）ので、E2E で確かめていない。→ TASK-0007 の確認 ID（TC-0007・0008・0009・0010 などの E2E）で確かめた（AC-0007）。演出のある行（TC-0011）の画面での確かめは、演出を出す TASK で行う。
- 演出・体力わずかの枠・音は、その TASK（TASK-0011 以降）でつなぐ。今はキューに演出の始まり・終わりを知らせる口だけがある。

## 4. 後片付け

- スクリーンショット用の `vite preview` を止めた。
- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（TD-0001 v1.1、TD-0002 v1.3、TD-0005 v1.3）
- [x] AC-0006（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑
- [x] マージされた（マージ = 公開）
