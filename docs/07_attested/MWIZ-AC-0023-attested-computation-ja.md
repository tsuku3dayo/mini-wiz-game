---
id: MWIZ-AC-0023
type: Attested Computation
title: 速さの実施記録
status: stable
version: 1.0
updated: 2026-11-05
sources:
  - MWIZ-TASK-0023（v1.0）
  - MWIZ-TC-0037（v1.0）
verified: { by: "tsuku3dayo", at: "2026-11-05T14:57:34+09:00" }
---

# AC-0023 速さの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0023](../06_plan/MWIZ-TASK-0023-implementation-task-ja.md) 速さ |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0023-performance` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.0.5、Playwright 1.64.1 の Chromium |

作ったもの（テストだけ。アプリのコードは変えていない）：

- `tests/api/game-api.test.ts`：ゲーム API の 18 の操作を、重い状態（所持品 50 個・装備 2 つ・Lv15、5F はボスのマスを除いて全部踏破済み）で測る。操作ごとに新しい保存から 2 回呼び、1 回目は JIT の準備として捨てる。load・getSave のセーブは、重い宿屋の状態から本物の `save` で作った
- `tests/domain/floors.test.ts`：`generateFloors` をシード 1〜100 で測る（シード 0 で 1 回準備運転）
- `tests/audio/sound.test.ts`：偽の AudioContext で `playSfx('encounter')` の予約を見る
- `e2e/dungeon.spec.ts`：押してから DOM が変わるまでを、ページの中で `performance.now()` と `MutationObserver` で測る（偽の時計なし）
- `e2e/sound.spec.ts`：操作の直前の時刻と、`app:sound`（encounter）の受け手の時刻の差を測る

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0037-01 | 単体（`tests/api/game-api.test.ts`） | OK。18 の操作すべて 300ms 未満。手元の値（ms）：startGame 0.06・getGame 0.27・getSave 0.03・rest 0.18・save 0.22・load 0.19・enterDungeon 2.99（迷路を作る）・move 0.33・stairs 0.38・returnToInn 0.2・heal 0.39・battle 0.32・equip 0.22・unequip 0.13・discard 0.13・lootTake 0.22・lootAbandon 0.2・continueGame 0.13 |
| TC-0037-02 | E2E（`e2e/dungeon.spec.ts`。pixel7・small・desktop） | OK。前進 → 疑似3D の変化 3.2〜5.1ms、右を向く → 階と向きの表示の変化 2.6〜3.8ms、「たたかう」→ 最初の行 5.4〜7.3ms |
| TC-0037-04 | 単体（`tests/audio/sound.test.ts`） | OK。currentTime 3.25 で鳴らすと、最初の発振器の start が 3.25（遅れ 0）、頭の音は休符でない。最後の stop は 3.25 + 0.68 |
| TC-0037-05 | E2E（`e2e/sound.spec.ts`。pixel7・small はタップ、desktop は ↑ キー） | OK。操作の直前から遭遇の音まで 16〜70ms（Playwright が操作を送る時間を含む） |
| TC-0037-07 | 単体（`tests/domain/floors.test.ts`） | OK。シード 1〜100 のどれも 150ms 未満。手元で平均 0.60ms・最大 3.82ms |
| TC-0037-03 | 手動（iPhone 11 のホーム画面のアプリと Safari。2026-11-05、オーナー） | OK（下の「WS-0010 の終わりの手動テスト」） |
| TC-0037-06 | 手動（iPhone 11 の Safari。同上） | OK（同上） |

手元で通したもの（2026-11-05）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだ結果のない手動の確認 ID 2 個。テストにある確認 ID は 301 → 306 で、この TASK の自動の 5 個の分だけ増えた）、単体 179 件、build、check:dist OK
- `npm run test:e2e`：451 件通った・44 件はその端末の対象外で飛ばした
- スクリーンショット：撮っていない（画面を変えていない）

CI の結果（PR #68、2026-11-05）：`check`（verify）OK 1 分 14 秒、`e2e` OK 4 分 55 秒。マージのあと、main の test・pages も成功した。

### WS-0010 の終わりの手動テスト（2026-11-05、オーナー）

PR #68 の公開のあと、手順・「見ること」・返事のひな形をオーナーに渡して確かめてもらった。iPhone 11 で、Safari（公開 URL）とホーム画面のアプリの両方を使った（2・6 は両方で見た）。ゲームクリア・入れ替え（満杯）・HP 3 桁のステータスは実機ですぐに行けないので、探さなくてよいと先に伝えた（E2E とスクリーンショットで確かめた）。
| 確認 ID | 手順 | 結果 |
| --- | --- | --- |
| TC-0037-03 | 一度開いてから完全に閉じ、もう一度開いて、タイトルのメニューが出るまでを数える（ホーム画面のアプリと Safari） | OK（両方。1 秒以内） |
| TC-0037-06 | 音をオンにしてダンジョンを歩き、遭遇を 5 回起こす | OK（戦闘の画面と同時に音が始まり、1 秒以内に終わる） |

## 3. 確認できなかったこと

- 時間の数値は手元の PC と CI で測ったもの。iPhone 11 では、起動（TC-0037-03）と遭遇の音（TC-0037-06）を目と耳で確かめ、数値では測っていない。
- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面の変更なし）
- [x] 設計と違う作りにしたら、TD・GUI を直した（作りは変えていない）
- [x] AC-0023（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #68）
- [x] マージされた（マージ = 公開。2026-11-05、公開の実行が成功したことを確かめた）
