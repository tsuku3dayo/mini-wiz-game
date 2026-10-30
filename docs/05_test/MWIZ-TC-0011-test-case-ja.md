---
id: MWIZ-TC-0011
type: Test Case
title: メッセージを読む
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0011（v1.1）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-GUI-0001（v1.1）
  - docs/specification-ja.md (v1.2) §11.8、§11.10、§16.4
verified: null
---

# TC-0011 メッセージを読む

- 対象：[US-0011](../02_requirements/MWIZ-US-0011-user-story-ja.md)（受け入れ条件 4 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0011-01 | 1 | `message-plan` の決まり：演出のない行の次の行までの待ちが 400ms、演出のある行は演出の長さ（levelUp 1000・rareDrop 800（LG 1200）・bossAppear 1200・bossDefeat 600・clear 1500ms）。持つ行の数 `MAX_LINES` が 7 で、8 行目を足すといちばん古い行が消える | 単体 | `tests/logic/message-plan.test.ts` |
| TC-0011-02 | 1 | 3 行以上の結果のとき、1 行目は応答のすぐあとに出て、そのあと 400ms ごとに 1 行ずつ増える（399ms では増えず、400ms で増える） | E2E | `e2e/message.spec.ts` |
| TC-0011-03 | 1 | メッセージ欄に出る行は、狭い画面（`pixel7`・`small`）ではダンジョン・戦闘・宿屋とも最大 5 行。広い画面（`desktop`）ではダンジョン 6 行・戦闘 7 行・宿屋 5 行。行がそれより多くたまったときは、最新の行が出て古い行が消える | E2E | `e2e/message.spec.ts` |
| TC-0011-04 | 1 | メッセージ欄（`[data-testid="message-window"]` の `role="log"`）の高さが「行数 × 1.6em」（16px の文字で 5 行 128px・6 行 153.6px・7 行 179.2px、±1px）で、行が 0 行のときと最大までたまったときで変わらない | E2E | `e2e/message.spec.ts` |
| TC-0011-05 | 1 | 逐次表示の途中でメッセージ欄をクリック（タップ）すると、残りの行がすぐに全部出て、`body[data-busy]` が `true` でなくなる | E2E | `e2e/message.spec.ts` |
| TC-0011-06 | 1 | 逐次表示の途中で Enter を押すと、残りの行がすぐに全部出る。その Enter はメニューに届かない（カーソルのある項目が決定されない） | E2E（キー、`desktop`） | `e2e/message.spec.ts` |
| TC-0011-07 | 2 | 逐次表示の間は `body[data-busy="true"]` で、コマンドのメニュー・移動ボタン・メニューボタンが無効。その間に「たたかう」を押してもターンが進まない（表示が終わったあとに行が増えない）。`setDelay(1000)` の応答待ちの間に 2 回押しても、ターンは 1 回だけ進む | E2E | `e2e/message.spec.ts` |
| TC-0011-08 | 3 | `setDelay(1000)` で操作すると、300ms までは ▼（`aria-label="応答待ち"`）が出ず、300ms を超えるとメッセージ欄の右下に出る。▼ には 1 秒周期・`step-end` の点滅の `animation` が付く。応答が返ると消える | E2E | `e2e/message.spec.ts` |
| TC-0011-09 | 4 | 行の文字の色：tone normal は primary（`rgb(232, 220, 192)`）、success は `rgb(92, 214, 92)`、danger は `rgb(255, 90, 78)`、ドロップの行はそのレアリティの色（例：R は `rgb(91, 140, 255)`、LG は `rgb(255, 77, 109)`） | E2E | `e2e/message.spec.ts` |
| TC-0011-10 | 4 | 表示中の行に danger の行があると、メッセージ欄が `data-variant="danger"` になり外側の線（`border-color`）が `rgb(255, 90, 78)` になる。内側の線（`outline-color`）は `--wiz-window-line` のまま。danger の行が欄から消えると `default` に戻る | E2E | `e2e/message.spec.ts` |

## 2. 準備

- 単体：`logic/message-plan.ts` の関数に、行（tone・effect・rarity）の配列を渡す。時間は数値で比べる（時計は使わない）。
- E2E：`?debug=1` で開き、`e2e/helpers.ts` の `startAt` で場面を作る。時間は偽の時計（`page.clock.install` → `pauseAt` → `runFor`）で進める。
  - 行を何行も出す場面：ダンジョンで正面が壁の位置（「かべだ」が 1 回に 1 行）。戦闘は HP 999 のプレイヤーとオーク（1 ターンで 2 行）で、`useSeed` で決まった乱数にする。
  - 色の場面：ダンジョンのヒール（success）、死亡（danger。宿屋の画面に移ったあとのメッセージ欄で見る）、ドロップ（R と LG。`useSeed` で決まった結果になるシードを `e2e/helpers.ts` に置く）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0011-02 | 戦闘で「たたかう」を選ぶ → 応答の直後に 1 行。`runFor(399)` で 1 行のまま、`runFor(1)` で 2 行 |
| TC-0011-03 | ダンジョンで正面が壁の位置で ↑ を 8 回（毎回表示が終わってから）→ 狭い画面は 5 行、`desktop` は 6 行で、最後の行が「かべだ」。戦闘で「たたかう」を 4 回 → 狭い画面は 5 行、`desktop` は 7 行。宿屋で「やすむ」を 6 回 → どの画面も 5 行 |
| TC-0011-04 | 画面を開いた直後（0 行）と、TC-0011-03 の後（最大）で、`role="log"` の `getBoundingClientRect().height` を比べる |
| TC-0011-05 | 戦闘で「たたかう」→ 1 行目が出たらメッセージ欄をクリック（`pixel7`・`small` はタップ）→ 時計を進めずに、そのターンの行が全部出ている |
| TC-0011-06 | 戦闘で「たたかう」→ 1 行目が出たら Enter → 行が全部出る。場所が `BATTLE` のままで、次のターンの行が出ていない |
| TC-0011-07 | 戦闘で「たたかう」→ 逐次表示の間に「たたかう」をもう一度クリック → 表示が終わったあと、行の数がそのターンの分だけ。`setDelay(1000)` にして「たたかう」を 2 回続けてクリック → 応答と表示が終わったあと、ターン 1 回分の行だけ |
| TC-0011-08 | `setDelay(1000)` → ↑ → `runFor(300)` で ▼ がない → `runFor(1)` で ▼ がある → `runFor(700)` で応答が返り ▼ がない |
| TC-0011-10 | 死亡のあと宿屋のメッセージ欄が `danger`。そのあと「やすむ」を 5 回して danger の行が欄から消えると `default` |

## 4. 手動の手順

なし。
