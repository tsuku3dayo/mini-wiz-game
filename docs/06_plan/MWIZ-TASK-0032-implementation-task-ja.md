---
id: MWIZ-TASK-0032
type: Implementation Task
title: 効果音のジングル化と演出の長さ
status: stable
version: 1.0
updated: 2026-11-10
sources:
  - MWIZ-WS-0016（v1.0）
  - MWIZ-TC-0011（v1.3）
  - MWIZ-TC-0031（v1.2）
  - MWIZ-TC-0032（v1.3）
  - MWIZ-TC-0034（v1.6）
  - MWIZ-TD-0005（v1.13）
verified: null
---

# TASK-0032 効果音のジングル化と演出の長さ

- WS：[WS-0016](MWIZ-WS-0016-workstream-ja.md)
- ブランチ：`feat/TASK-0032-se-jingle`
- 実施記録：AC-0032（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0031（WS-0015）

## やること

- `src/audio/sound.ts`：仕様書 §25.2 のコードのとおりに `SePatch`・`SfxEvent`（`gain`）・`SE_PATCHES`（9 種）・`SFX_MS`・`SFX` を書き替える。§25.1 のとおり、音量に `gain` を掛け、フェードを 0.03 秒にし、効果音の出口のコンプレッサー（作れなければ `destination`）を足す（TD-0005 v1.11）
- `src/logic/message-plan.ts`：`EFFECT_MS` を levelUp 1071・bossAppear 2906・bossDefeat 1000・clear 5833 にする
- `tests/helpers/fake-audio.ts`：コンプレッサーの偽物（`createDynamicsCompressor`）と、なくす・例外を投げる設定を足す
- テスト：下の確認 ID。直す前に、テストと E2E の中の演出の長さ・音の長さの値（`1000`・`1200`・`600`・`1500`・`510`・`680`・`2350` など）を探し、直す場所を全部挙げる（TC-0027-09 など、確認 ID が変わらなくても時刻を決め打ちしているテストがある）
- 試聴ページ（`docs/requests/jingle-listen/jingles.ts`）の選んだ 4 つと §25.2 の値が、丸めの差（1 ms・0.1 Hz 以内）だけで同じことを、写したあとに一度だけ突き合わせる（テストには残さない）
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.10 に、第 2 部を実装に合わせる
- AC-0029・AC-0031：BGM の実機の結果（2026-11-10、OK）と、「v1.10 で効果音を変えたので、TC-0032-20 は AC-0032 に引き継いだ」を書く（status は draft のまま）
- 画面のアニメーションは変えないが、演出が長くなるので、ボス出現の層が残る様子を PC と一番小さいスマートフォンの幅でスクリーンショットで見る
- コミットの前に `git status` で入るファイルを見る（オーナーの作業中のファイルを入れない）

## 対象の確認 ID（12 個：自動 10・手動 2）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/logic/message-plan.test.ts` | TC-0011-01、TC-0031-06 |
| `tests/audio/sound.test.ts` | TC-0032-09、TC-0032-19、TC-0032-21（新）、TC-0032-22（新） |
| `e2e/sound.spec.ts` | TC-0032-10、TC-0032-11、TC-0034-13 |
| `e2e/effects.spec.ts` | TC-0031-12（新） |
| 実機（手動） | TC-0032-20、TC-0034-18 |

- 新しい確認 ID は 3 つ（TC-0031-12・TC-0032-21・TC-0032-22）。
- ほかのテスト（TC-0031・TC-0032・TC-0034 の残り、TC-0027-09 など）は、時刻の値だけ直して通ることを確かめる。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（ボス出現の層が長く残る様子）
- [ ] 設計と違う作りにしたら、TD を直した
- [ ] AC-0032（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
