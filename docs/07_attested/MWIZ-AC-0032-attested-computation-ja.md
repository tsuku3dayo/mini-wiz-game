---
id: MWIZ-AC-0032
type: Attested Computation
title: 効果音のジングル化と演出の長さの実施記録
status: stable
version: 1.0
updated: 2026-11-10
sources:
  - MWIZ-TASK-0032（v1.0）
  - MWIZ-TC-0011（v1.2）
  - MWIZ-TC-0031（v1.1）
  - MWIZ-TC-0032（v1.2）
  - MWIZ-TC-0034（v1.3）
  - MWIZ-TD-0005（v1.11）
verified: { by: "tsuku3dayo", at: "2026-11-10T15:04:36+09:00" }
---

# AC-0032 効果音のジングル化と演出の長さの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0032](../06_plan/MWIZ-TASK-0032-implementation-task-ja.md) 効果音のジングル化と演出の長さ（変更の依頼 `docs/requests/2026-11-10-spec-1.10-se-jingle.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0032-se-jingle` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `src/audio/sound.ts`：`SePatch` から `SFX` までを、仕様書 §25.2 のコードから小さなプログラムで抜き出して置き換えた（手で打ち直さない）。仕様書・再現開発仕様書の §25.2 と一字一句同じことを確かめた。§25.1 のとおり、1 音の音量に `gain` を掛け、終わりのフェードを `min(0.03, 長さ / 3)` にし、効果音の出口のコンプレッサー（threshold −12・ratio 4。`AudioContext` ごとに 1 つ。作れなければ `destination`）を足した
- `src/logic/message-plan.ts`：`EFFECT_MS` を levelUp 1071・bossAppear 2906・bossDefeat 1000・clear 5833 にした（rareDrop は変えない）
- `tests/helpers/fake-audio.ts`：偽のコンプレッサー（`createDynamicsCompressor`。なくす・例外を投げる設定つき）
- 単体テスト：`tests/audio/sound.test.ts`（TC-0032-09・TC-0032-19 を新しい音に、TC-0032-21・TC-0032-22 を足した。TC-0032-12 と TC-0037-04 は 0.51 秒の音を `encounter` で確かめる形に）、`tests/audio/bgm.test.ts`（TC-0034-17 の 0.51 秒の音を `encounter` に）、`tests/logic/message-plan.test.ts`（TC-0011-01・TC-0031-06）
- E2E：`e2e/effects.spec.ts`（TC-0031-01・02・03・04・05・07・11 の時刻、TC-0031-12 を足した）、`e2e/sound.spec.ts`（TC-0032-11・TC-0034-13 の時刻）、`e2e/message.spec.ts`（TC-0027-09 の時刻）
- `docs/reproduction-specification.md`：仕様書 v1.9 → v1.10 の差分を当てた（`git apply --ignore-whitespace`。当たらなかった 3 か所（頭の版の行・改訂履歴・第 2 部のテストの表）は手で直した）

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0011-01 | 単体（`tests/logic/message-plan.test.ts`） | OK。演出のない行 400ms、演出の長さ levelUp 1071・rareDrop 800（LG 1200）・bossAppear 2906・bossDefeat 1000・clear 5833 |
| TC-0031-06 | 単体（同上） | OK。`EFFECT_MS` の 5 つと LG 1200、計画の待ちが 400・1000・1071・400・800・1200・2906・5833 |
| TC-0032-09 | 単体（`tests/audio/sound.test.ts`） | OK。encounter は 510 ms。8 種類とも `SFX_MS` が出来事の終わりのいちばん遅いものと一致し、6 秒以内・20〜2,000 Hz |
| TC-0032-19 | 単体（同上） | OK。8 種類の出来事（周波数・頭・長さ・音色・glide・ビブラート・音量の倍率）と音色 9 種の値が §25.2 と同じ。コンプレッサーが 1 つ（−12・4）で destination へ、ローパスはコンプレッサーへ、音量 vol × gain ÷ √音数、終わりのフェード min(0.03, 長さ/3) |
| TC-0032-21 | 単体（同上） | OK。levelUp・bossAppear・bossDefeat・clear の `SFX_MS` が `EFFECT_MS` と同じ。UR 360 ≦ 800、LG 1020 ≦ 1200 |
| TC-0032-22 | 単体（同上） | OK。`createDynamicsCompressor` がない・例外のどちらでも例外が出ず、ローパスが destination に直接つながって鳴る |
| TC-0032-10 | E2E（`e2e/sound.spec.ts`） | OK（そのまま通った） |
| TC-0032-11 | E2E（同上） | OK。UR・LG の戦闘はレベルアップ 1600ms・ドロップ 3071ms、ボス戦は bossDefeat 400・levelUp 1800・3271・4742・rareDropLG 6213・clear 7413ms に、行と音がそろって出る |
| TC-0034-13 | E2E（同上） | OK。演出が立つと null、2905ms ではそのまま、2906ms で boss。飛ばすとすぐ boss |
| TC-0031-12 | E2E（`e2e/effects.spec.ts`） | OK（pixel7・small・desktop）。層のアニメーションは 1.2s 1 回で、1200ms・2905ms では `bossAppear` と名前が残り、2906ms で消える。bossDefeat は 999ms で残り、1000ms で消えて次の行が出る |
| TC-0032-20 | 手動（iPhone・PC） | OK（オーナー、2026-11-10。iPhone・PC の両方。8 種類の効果音が選んだ音で鳴り、最後まで鳴り切る。飛ばすと止まる。演出が長くなって待たされる感じも問題なし）。WS-0013・WS-0015 から引き継いだ確認 |
| TC-0034-18 | 手動（iPhone・PC） | OK（オーナー、2026-11-10。iPhone・PC の両方。効果音のあいだ曲が小さくなり、終わると戻る） |

あわせて確かめたこと：

- 試聴ページの値との突き合わせ（一度だけ。テストには残していない）：`docs/requests/jingle-listen/jingles.ts` の選ばれた 4 つ（小さなファンファーレ・暗い鐘のきらめき・オルガンの不協和音・暗い案）と `SFX` の levelUp・bossDefeat・bossAppear・clear は、出来事の数・音色・glide・ビブラート・音量の倍率が同じで、頭と終わりの時刻は ±1 ms、音の高さは ±0.1 Hz の中（丸めの差）。`encounter` は v1.9 の `levelUp` と同じコード。
- 試聴ページは音の頭を `currentTime + 0.05` から鳴らすが、ゲームは `currentTime` から（v1.7 からの決まりのまま）。
- 時刻を決め打ちしていた E2E を新しい演出の長さで直した：TC-0031-01（光る枠は 1070ms ではまだ付いていて 1071ms で消える）・TC-0031-02・TC-0027-09（ドロップの行が 3071ms）・TC-0031-03（2906ms で消える）・TC-0031-04（1000ms）・TC-0031-05・TC-0031-07（クリアの演出の終わりまで 14 秒見る）・TC-0031-11、実時間で待つ TC-0036-01（「宿屋へ」にフォーカスが来るまでの待ちの上限を 15 秒に）。
- 最初の E2E で、足した TC-0031-12 が失敗した：CSS のアニメーションは偽の時計では進まないので、「1200ms 進めたらアニメーションが終わっている」は確かめられない。アニメーションの長さ（1.2s）を読む形に直した。TC-0036-01 は、クリアの演出が延びて 5 秒の待ちを超えたため。
- 画面：ボス出現の場面を、一番小さいスマートフォンの幅（375×667）と PC（1280×800）で、0.6 秒・1.8 秒・3.3 秒に撮った（作業用の一時フォルダ）。1.8 秒では背景の色のアニメーションは終わっていて、画面の中央に赤い「暗黒のネクロマンサー」の文字が残り、メッセージ欄（PC ではステータス欄）の文字に重なって見える。3.3 秒では消えている。仕様書 v1.10（§11.8）のとおりの動き。気になるかどうかは実機で見ていただく（変更の依頼 v1.10 §2.3）。

手元で通したもの（2026-11-10）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 1（AC-0024 の仕様書の版の表記。承認済みの記録なので変えない）（成果物 194、確認 ID 338、テストのコードに 315）、単体 184 件、build、check:dist OK
- `npm run test:e2e`：463 件通った・44 件はその端末の対象外で飛ばした（7.1 分）

## 3. 確認できなかったこと

- 実機の確認は、オーナーの返事「すべて OK」と、端末（iPhone と PC の両方）だけを聞いた。返事のひな形の項目（効果音・待たされる感じ・曲が小さくなる・ボス出現の文字）はすべて OK として書いた。聴いた細かな箇所（どの場面を何回聴いたか、飛ばしたのはどの演出か）や、iPhone の機種までは聞いていない。
- ボス出現の文字が約 2.9 秒残り、下の文字に重なること（スクリーンショットで気づいた点）も「OK」に含まれる（気にならない）として扱った。
- Android の実機はない。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。突き合わせのプログラムと、差分を当てたときの記録（`.rej`）は、プロジェクトの外の作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（ボス出現の層が長く残る様子）
- [x] 設計と違う作りにしたら、TD を直した（設計どおり）
- [x] AC-0032（draft）に自動テストの結果を書き、同じ PR に入れた（PR #102）
- [x] PR の CI が緑（PR #102：changes 6s・check 1m25s・e2e 5m56s）
- [x] マージされた（マージ = 公開。2026-11-10、main の pages：build 1m4s・deploy 11s。公開中の JS に新しい音色「ひびくオルガン」と演出の長さ 5833・2906 が入っていることを確かめた）
- [x] 手動テストの結果を書き、review にした（2026-11-10）
