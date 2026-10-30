---
id: MWIZ-TC-0025
type: Test Case
title: 次の周へ進む
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0025（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0005（v1.1）
  - docs/specification-ja.md (v1.2) §9.3、§11.5、§16.1
verified: null
---

# TC-0025 次の周へ進む

- 対象：[US-0025](../02_requirements/MWIZ-US-0025-user-story-ja.md)（受け入れ条件 3 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0025-01 | 1 | CLEARED で `continueGame()` を送ると、場所 INN・`dungeon` が null・HP・MP・レベル・経験値・装備・所持品・実績が送る前と同じ。メッセージ「ゆうしゃは 宿屋に もどった」（normal）。乱数を引かない。もう一度送ると 409 `invalid_state`「その操作は いまは できない」で、周回数は増えない | 単体 | `tests/api/game-api.test.ts` |
| TC-0025-02 | 1 | クリア画面で「宿屋へ」を選ぶと宿屋（`#/inn`）に移り、メッセージ欄に「ゆうしゃは 宿屋に もどった」が出る。ステータスの HP・MP はクリア画面に入る前と同じ | E2E | `e2e/clear.spec.ts` |
| TC-0025-03 | 2 | 自動プレイヤーで 2 周（`laps: 2`）遊ぶと、2 周目の出発で新しい 5 階層が作られ（1F の入口に北向き）、5F のボスとまた戦って倒せる。終わったときの実績が `laps` 3・`bossKills` 2 | 単体 | `tests/api/playthrough.test.ts` |
| TC-0025-04 | 3 | 周回数 9 の状態で 5F のボスのマスに入ると、戦闘の敵（保存の中の状態）の HP が 260。`ENEMIES` の能力値・経験値は周回数によって変わらない | 単体 | `tests/domain/explore.test.ts` |

## 2. 準備

- 単体：ゲーム API は `fake-storage.ts` と `SwappableRng`。CLEARED の状態は `tests/helpers/fixtures.ts` で作る。TC-0025-04 は `tests/helpers/maps.ts` の `openMap(player, extra, 5)` で、ボスのマスの手前に立ち、実績の `laps` を 9 にした状態。
- 通しプレイ：`tests/helpers/autoplayer.ts` の `play(name, { laps: 2 })`。時間切れ 120 秒。
- E2E：`?debug=1` で開き、`startAt('CLEARED', …)` でクリア画面から始める。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0025-02 | 「宿屋へ」を選ぶ → `#/inn` になり、メッセージ欄の最後の行が「ゆうしゃは 宿屋に もどった」であること |

## 4. 手動の手順

なし。
