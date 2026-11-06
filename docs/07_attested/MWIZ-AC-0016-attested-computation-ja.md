---
id: MWIZ-AC-0016
type: Attested Computation
title: 演出の実施記録
status: stable
version: 1.0
updated: 2026-11-04
sources:
  - MWIZ-TASK-0016（v1.0）
  - MWIZ-TC-0027（v1.0）
  - MWIZ-TC-0031（v1.0）
  - MWIZ-TD-0003（v1.3）
verified: { by: "tsuku3dayo", at: "2026-11-04T15:56:00+09:00" }
---

# AC-0016 演出の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0016](../06_plan/MWIZ-TASK-0016-implementation-task-ja.md) 演出 |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0016-effects` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの：

- `components/effect-layer.ts`：画面全体の層 `#effect-layer`（rareDrop・bossAppear・bossDefeat のときだけ出す。`data-effect`・`data-motion`、bossAppear は中央に敵の名前）。levelUp のあいだ StatusPanel の外側を光らせる（画面を作り直しても付け直す）。`main.ts` でつないだ
- `ui/style.css`：層の 3 つのアニメーション、StatusPanel の光り。動きを減らす設定では層を動かさず、色の強調だけ
- `logic/message-plan.ts`：`EFFECT_MS`・`RARE_DROP_LG_MS` を外に出し、ふつうの計画 `planSteps` と、動きを減らす設定の計画 `planReduced` を足した。キュー（`ui/message-queue.ts`）は `planReduced` を使う
- `e2e/helpers.ts`：シード `darkKnightDropUR`（2）・`darkKnightDropSR`（5）・`goblinDropN`（5）・`bossWin`（1）、ボス戦の場面 `bossBattle()`。狙いどおりに落とすことを単体テスト（`tests/domain/loot.test.ts`）でも確かめる

この TASK より前にできていたもの：メッセージの行の拡大・点滅の CSS、クリア画面の見出しの浮かび上がり（TASK-0012）、キューの `activeEffect`（TASK-0005）

設計との違い：StatusPanel の光りの色は、仕様書の「`currentColor`（secondary）」の代わりに secondary の色を直接書いた（StatusPanel の文字の色を変えずに光りだけ secondary にするため。見た目は同じ）。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0031-06 | 単体（`tests/logic/message-plan.test.ts`） | OK。`EFFECT_MS` の 5 つと LG 1200、計画の待ちが 400・600・1000・400・800・1200・1200・1500 |
| TC-0031-10 | 単体（同上） | OK。全部の行を一度に出し、演出は最後の 1 つ（LG で待ち 1200）、保留 0。演出がなければ待ち 0 |
| TC-0031-01 | E2E（`e2e/effects.spec.ts`。pixel7・small・desktop） | OK。「レベルが あがった！ Lv2」で StatusPanel に 1s のアニメーション、25%・75% に `rgb(255, 200, 69) 0px 0px 12px 3px`。行は `rgb(255, 200, 69)`・太字・0.6s ease-out・50% で `scale(1.2)`・左端基準。1000ms で消える |
| TC-0031-02 | E2E（同上） | OK。UR：層 `rareDrop`・`rgb(255, 140, 26)`・0.4s ease-in-out 2 回（50% に光り）、行 0.4s steps(1) 2 回（50% で opacity 0）。LG：`rgb(255, 77, 109)` で 3 回 |
| TC-0031-03 | E2E（同上） | OK。5F のボスのマスに入ると層 `bossAppear`・1.2s linear 1 回、中央に「暗黒のネクロマンサー」（`rgb(255, 90, 78)`・24px）。層は fixed・`pointer-events: none`・`aria-hidden`。1200ms で消える |
| TC-0031-04 | E2E（同上） | OK。「たおした！」で層 `bossDefeat`・0.6s linear 1 回、16%・83% に `rgba(232, 220, 192, 0.55)`。600ms で消える |
| TC-0031-05 | E2E（同上） | OK。clear の行で見出しに 1.5s ease-out 1 回（opacity 0 → 1、translateY(8px) → none）。再読み込みで入ると付かない |
| TC-0031-07 | E2E（同上） | OK。100ms ごとに 9 秒見て、なし → bossDefeat → なし →（levelUp → なし）× 3 → rareDrop → clear → なし。2 つ同時に立った時刻はない |
| TC-0031-08 | E2E（同上） | OK。levelUp の演出中にメッセージ欄を押す（desktop はクリックと Enter の両方）と、最後の行まで出て、演出が終わり、`data-busy` が true でない。ターンは進まない（Enter はメニューに届かない） |
| TC-0031-09 | E2E（同上） | OK。動きを減らす設定で、時計を進めなくても最後の行まで出る。層は `rareDrop`・`data-motion="reduced"`。行・StatusPanel・層の `getAnimations()` は空。ボスを倒したクリア画面の見出しも空 |
| TC-0031-11 | E2E（同上） | OK。山の数は levelUp 2・rareDrop UR 2・LG 3・bossAppear 2・bossDefeat 2。どの 1 秒の区間も 3 回以下 |
| TC-0027-09 | E2E（`e2e/message.spec.ts`） | OK。UR：0.4s steps(1) 2 回、次の行（足元の案内）は 799ms で出ず 800ms で出る。LG：3 回、1199ms／1200ms。N（`rgb(255, 255, 255)`）・R・SR（`rgb(199, 146, 234)`）は点滅しない。動きを減らす設定では UR も点滅しない |

確認 ID のないテストも足した：E2E で使うシード（2・5・5・1）が狙いどおりの行を出すこと。

手元で通したもの（2026-11-04）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID。テストにある確認 ID は 220 → 232 で、この TASK の 12 個の分だけ増えた）、単体 156 件、build、check:dist OK
- `npm run test:e2e`：314 件通った・28 件はその端末の対象外で飛ばした
- スクリーンショット（375 × 667 と 1280 × 800）：ボスの出現（中央の名前）、レベルアップ、レアドロップのあとの画面。偽の時計を止めて撮ったので、アニメーションそのものは写真では終わっている（動きは E2E のアニメーションの値で確かめた）

CI の結果（PR #54、2026-11-04）：`check`（verify）OK 1 分 6 秒、`e2e` OK 2 分 24 秒。マージのあと、main の test・pages も成功した。

### WS-0007 の終わりの実機の確認（2026-11-04、オーナー）

この TASK に手動の確認 ID はない。TC-0032-20（AC-0017）で効果音を聴いてもらうときに、演出（レベルアップ・UR／LG のドロップ・ボス出現・ボス撃破・クリア）を iPhone 11 と PC の Chrome で一緒に見てもらった。オーナーの報告：すべて OK。PC では `?debug=1` の場面（コンソールで書いた戦闘・ボスの場面）で出した。

## 3. 確認できなかったこと

- 手動の確認 ID はこの TASK にない。演出の見え方は、WS の終わりの実機の確認で一緒に見てもらい OK だった（上）。光り・点滅の強さを数字で比べてはいない。
- 演出の効果音は TASK-0017 でつなぐ（キューの `onEffectStart`・`onEffectEnd` の口は空のまま）。

## 4. 後片付け

- シードを探すテストと撮影用の設定・テスト・画像は作業用の一時フォルダに置いた。
- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（光りの色の書き方だけで、見た目は同じなので TD・GUI は変えていない。上の「設計との違い」に書いた）
- [x] AC-0016（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #54）
- [x] マージされた（マージ = 公開。2026-11-04、公開の実行が成功したことを確かめた）
