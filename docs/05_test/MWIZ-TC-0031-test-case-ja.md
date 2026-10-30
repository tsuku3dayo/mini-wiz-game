---
id: MWIZ-TC-0031
type: Test Case
title: 演出でできごとを感じる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0031（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
  - docs/specification-ja.md (v1.2) §8.4、§11.5、§11.8、§16.3、§16.4
verified: null
---

# TC-0031 演出でできごとを感じる

- 対象：[US-0031](../02_requirements/MWIZ-US-0031-user-story-ja.md)（受け入れ条件 5 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0031-01 | 1 | levelUp の行（「レベルが あがった！ Lv{n}」）が出た瞬間に、StatusPanel の外側に光るアニメーション（1000ms、`box-shadow: 0 0 12px 3px currentColor` を 25%・75% で、secondary 色）が付き、その行が secondary・太字で 600ms ease-out の拡大（1→1.2→1 倍、左端基準）をする | E2E | `e2e/effects.spec.ts` |
| TC-0031-02 | 1 | rareDrop の行（UR）が出た瞬間に、`#effect-layer` に `data-effect="rareDrop"` が付き、層の色が UR の色（`#FF8C1A`）で 400ms ease-in-out の光りが 2 回。行は 400ms step-end の点滅（opacity 0 を 50% で）を 2 回。LG（`#FF4D6D`）では光り・点滅とも 3 回 | E2E | `e2e/effects.spec.ts` |
| TC-0031-03 | 1 | bossAppear の行（「暗黒のネクロマンサーが あらわれた！」）が出た瞬間に、層に `data-effect="bossAppear"` が付き、1200ms linear 1 回の背景色のアニメーションが付く。層の中央に h1 の大きさ・error 色で「暗黒のネクロマンサー」（行の文から「が あらわれた！」を取ったもの）が出る | E2E | `e2e/effects.spec.ts` |
| TC-0031-04 | 1 | bossDefeat の行（「暗黒のネクロマンサーを たおした！」）が出た瞬間に、層に `data-effect="bossDefeat"` が付き、600ms linear 1 回のアニメーション（`rgba(232,220,192,α)`）が付く | E2E | `e2e/effects.spec.ts` |
| TC-0031-05 | 1 | clear の行（「ダンジョンに 平和が もどった」）がクリア画面で出た瞬間に、見出し「暗黒のネクロマンサーを たおした」に 1500ms ease-out 1 回の浮かび上がり（不透明度 0・下 8px → 不透明度 1・元の位置）が付く。再読み込みでクリア画面に入ったときは付かない | E2E | `e2e/effects.spec.ts` |
| TC-0031-06 | 2 | `EFFECT_MS` が levelUp 1000・rareDrop 800・rareDrop（LG）1200・bossAppear 1200・bossDefeat 600・clear 1500。演出のない行のあとは 400ms、演出のある行のあとはその演出の長さだけ待って次の行を出す計画になる | 単体 | `tests/logic/message-plan.test.ts` |
| TC-0031-07 | 2 | 1 つの応答に bossDefeat・levelUp・rareDrop（LG）の行があるとき、演出は行の順に 1 つずつ立つ（前の演出の長さが過ぎるまで次の行が出ない。同時に 2 つの演出が立たない）。長さは偽の時計で進めて確かめる | E2E | `e2e/effects.spec.ts` |
| TC-0031-08 | 3 | 演出中にメッセージ欄をクリックすると、残りの行がすべて出て、`#effect-layer` の `data-effect` が消え、`body[data-busy]` が `true` でなくなる。`desktop` では Enter でも同じになり、キーはメニューに届かない（カーソルが動かない・決定しない） | E2E | `e2e/effects.spec.ts` |
| TC-0031-09 | 4 | 動きを減らす設定（`page.emulateMedia({ reducedMotion: 'reduce' })`）では、受け取った行がすべて一度に出て、最後の演出だけが立つ（層の `data-motion="reduced"`）。メッセージの行・StatusPanel・層・クリアの見出しに animation が付かない（`getAnimations()` が空） | E2E | `e2e/effects.spec.ts` |
| TC-0031-10 | 4 | 動きを減らす設定の計画では、行をすべて一度に出し、立てる演出は最後の 1 つだけ（待ち時間はその演出の長さ）。遷移の保留はしない | 単体 | `tests/logic/message-plan.test.ts` |
| TC-0031-11 | 5 | 各演出のアニメーション（`getAnimations()` のキーフレームと長さ・回数）から明るさの山の時刻を出し、どの 1 秒の区間でも 3 回以下（rareDrop UR 2 回／800ms、LG 3 回／1200ms、bossAppear 2 回／1200ms、bossDefeat 2 回／600ms、levelUp 2 回／1000ms） | E2E | `e2e/effects.spec.ts` |

## 2. 準備

- 単体：`message-plan` の関数にメッセージの配列（`effect` 付きの行を含む）を渡す。
- E2E：`?debug=1` で開き、`__wiz.writeState` で、敵の HP が 1 の戦闘（勝つとレベルアップする経験値、ドロップが UR または LG になるシード）から始める。ボスは 5F のボスの手前、または HP 1 のボス戦の状態を書く（`e2e/helpers.ts` の `startAt`）。乱数は `__wiz.useSeed` で決める。時間は偽の時計（`page.clock.install` → `pauseAt` → `runFor`）で進める。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0031-01 | HP 1 の敵の戦闘で「たたかう」→ 偽の時計で 400ms ずつ進め、「レベルが あがった！」の行が出たときに StatusPanel の外側と、その行の `getAnimations()` を見る |
| TC-0031-02 | UR を落とすシードで勝つ → ドロップの行が出たときに層の `data-effect`・`color` と、層・行のアニメーションの長さと回数を見る。LG を落とすシード（ダークナイトの特例、またはボス）でもう一度 |
| TC-0031-03 | 5F のボスのマスの手前で ↑ → 層の `data-effect`、中央の文字、アニメーションの長さを見る |
| TC-0031-04 | HP 1 のボス戦で「たたかう」→ 最初の行が出たときに層を見る |
| TC-0031-05 | TC-0031-04 のあと、偽の時計でクリア画面まで進め、clear の行が出たときに見出しのアニメーションを見る。そのあと再読み込みして、見出しにアニメーションがないことを確かめる |
| TC-0031-07 | TC-0031-04 と同じ（レベルアップと LG のドロップが出る状態にしておく）。偽の時計で 100ms ずつ進め、`data-effect` が bossDefeat → なし → levelUp → なし → rareDrop の順に変わり、2 つ同時に立たないことを確かめる |
| TC-0031-08 | levelUp の演出が立った直後にメッセージ欄をクリック → すぐに残りの行が出て、`data-effect` がなくなる。`desktop` では Enter で同じことを確かめ、メニューのカーソル位置が変わらないことを見る |
| TC-0031-09 | 動きを減らす設定にして TC-0031-07 と同じ操作 → 応答のすぐあとに全部の行が出ていて、演出は最後の rareDrop だけ |
| TC-0031-11 | TC-0031-02〜04・01 の演出が立ったときに `getAnimations()` の `effect.getKeyframes()`・`getTiming()` を読み、山の時刻を数える |

## 4. 手動の手順

なし。
