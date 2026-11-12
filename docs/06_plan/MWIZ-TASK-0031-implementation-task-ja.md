---
id: MWIZ-TASK-0031
type: Implementation Task
title: タイトル・宿屋・ボス戦の BGM の入れ替え
status: stable
version: 1.0
updated: 2026-11-09
sources:
  - MWIZ-WS-0015（v1.0）
  - MWIZ-TC-0032（v1.3）
  - MWIZ-TC-0034（v1.6）
  - MWIZ-TD-0005（v1.13）
verified: null
---

# TASK-0031 タイトル・宿屋・ボス戦の BGM の入れ替え

- WS：[WS-0015](MWIZ-WS-0015-workstream-ja.md)
- ブランチ：`feat/TASK-0031-bgm-swap`
- 実施記録：AC-0031（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0030（WS-0014）

## やること

- `src/logic/bgm-tracks.ts`：仕様書 §26.9 のコードのとおりに書き替える（`title` ← カタコンベ、`inn` ← ローエングリン、`boss` ← 怒りの日。グリーンスリーヴスを消す）
- `src/logic/bgm-scene.ts`・`src/audio/bgm.ts`・`bgm-director.ts`：変えない（曲の名前と場面の選び方は同じ）
- テスト：`tests/logic/bgm-tracks.test.ts` の諸元（TC-0034-22）。直す前に、古い曲名（ローエングリン・グリーンスリーヴス・カタコンベ）をテスト・ソース・E2E で探し、直す場所を全部挙げる
- 試聴ページの曲データ（`docs/requests/bgm-listen-v19/tracks-v19.ts` の `boss_mozart`）と §26.9 の `boss` が同じことを、写したあとに一度だけ突き合わせる（テストには残さない。§26.10）
- `README.md`：曲名と出典（クレジット）を直す
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.9 に、第 2 部を実装に合わせる
- AC-0029：「v1.9 で曲を入れ替えたので、実機の確認は AC-0031 に引き継いだ」を書く（status は draft のまま）
- コミットの前に `git status` で入るファイルを見る（オーナーの作業中のファイルを入れない）

## 対象の確認 ID（7 個：自動 3・手動 4）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/logic/bgm-tracks.test.ts` | TC-0034-22 |
| `tests/logic/bgm-scene.test.ts` | TC-0034-01（直さずに通ることを確かめる） |
| `e2e/sound.spec.ts` | TC-0034-03（直さずに通ることを確かめる） |
| 実機（手動） | TC-0032-20、TC-0034-04、TC-0034-18、TC-0034-23 |

- 新しい確認 ID はない（確認 ID の数は変わらない）。
- ほかの音のテスト（TC-0032・TC-0034 の残り）は、直さずに通ることを確かめる。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面は変えないので、撮らない見込み）
- [ ] 設計と違う作りにしたら、TD を直した
- [ ] AC-0031（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
