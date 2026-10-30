---
id: MWIZ-TC-0037
type: Test Case
title: すばやく反応する
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0037（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0005（v1.2）
  - docs/specification-ja.md (v1.2) §14、§16.2
verified: null
---

# TC-0037 すばやく反応する

- 対象：[US-0037](../02_requirements/MWIZ-US-0037-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。時間の測り方は TST-0001 §7（単体テストで測り、CI の余裕をみて目標の 3 倍まで許す）。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0037-01 | 1 | ゲーム API の各操作（startGame・rest・save・load・enterDungeon・move・stairs・returnToInn・heal・battle・equip・unequip・discard・lootTake・lootAbandon・continueGame・getGame・getSave）の呼び出しから結果が返るまでを `performance.now()` で測り、どれも 300ms 未満（目標 100ms 未満の 3 倍）。所持品 50 個・踏破済みの多い 5F など重い状態で測る | 単体 | `tests/api/game-api.test.ts` |
| TC-0037-02 | 1 | 画面の更新まで：ダンジョンで「↑ 前進」を押してから、階と向きの表示・疑似3D の線が変わるまで、戦闘で「たたかう」を押してから最初の行がメッセージ欄に出るまでが、どちらも 300ms 未満（目標 100ms の 3 倍。`page.evaluate` の中で `performance.now()` と `MutationObserver` で測る） | E2E | `e2e/dungeon.spec.ts` |
| TC-0037-03 | 2 | iPhone 11 のホーム画面のアプリと Safari で、2 回目以降の起動から、タイトル画面のメニューが見えるまでが 1 秒以内 | 手動 | 実機（iPhone 11） |
| TC-0037-04 | 3 | 偽の `AudioContext` で `playSfx('encounter')` を呼ぶと、最初の発振器の `start` が `currentTime` と同じ時刻（遅れ 0）で、頭は休符でない。最後の `stop` は `currentTime + 0.68`（1 秒以内） | 単体 | `tests/audio/sound.test.ts` |
| TC-0037-05 | 3 | 音がオンで、前進のタップ（または ↑ キー）から `app:sound`（`encounter`）が出るまでが 300ms 未満（目標 0.1 秒の 3 倍。`performance.now()` で測る） | E2E | `e2e/sound.spec.ts` |
| TC-0037-06 | 3 | iPhone 11 で、遭遇したときに、画面が戦闘に変わるのとほぼ同時に遭遇の音が聞こえ始め、1 秒以内に鳴り終わる | 手動 | 実機（iPhone 11） |
| TC-0037-07 | 4 | `generateFloors(new SeededRng(seed))` をシード 1〜100 で 1 回ずつ測り、どれも 150ms 未満（目標 50ms 未満の 3 倍）。平均も記録する | 単体 | `tests/domain/floors.test.ts` |

## 2. 準備

- 単体：ゲーム API に `tests/helpers/fake-storage.ts` と `SeededRng` を渡す。重い状態は `tests/helpers/fixtures.ts` で作る。時間は 1 回目を除いて（JIT の準備のため）測る。`sound.ts` は `tests/helpers/fake-audio.ts` の偽物で確かめる。
- E2E：`?debug=1` で開き、`__wiz.writeState`・`useSeed` で場面を作る。時間を測るテストでは偽の時計を入れない（本物の時間で測る）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0037-02 | ダンジョン（前方が通路）で、`page.evaluate` の中で `MutationObserver` を `[data-testid="location-label"]` と疑似3D に付け、`performance.now()` を記録してから前進ボタンを `click()` する → 変化までの時間を返す。戦闘でも同じように「たたかう」からメッセージ欄の最初の行まで |
| TC-0037-05 | 音をオンにし、次の前進で遭遇するシードにして、`app:sound` の受け手で `performance.now()` を記録 → 前進の操作の直前の時刻との差を見る |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0037-03 | iPhone 11 で一度アプリを開いて閉じる（アプリの切り替え画面から上に払って終わらせる）。もう一度ホーム画面のアイコンを押し、画面を動画で撮るか目で数える。Safari でも同じ | 押してからタイトル画面のメニューが出るまで 1 秒以内 |
| TC-0037-06 | 音をオンにしてダンジョンを歩き、遭遇を 5 回起こす | 戦闘の画面に変わるのと同時に遭遇の音が始まり、遅れて聞こえない。音は 1 秒以内に終わる |
