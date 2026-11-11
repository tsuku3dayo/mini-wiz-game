---
id: MWIZ-TASK-0029
type: Implementation Task
title: BGM と効果音の入れ替え
status: stable
version: 1.0
updated: 2026-11-06
sources:
  - MWIZ-WS-0013（v1.0）
  - MWIZ-TC-0032（v1.3）
  - MWIZ-TC-0034（v1.5）
  - MWIZ-TD-0005（v1.13）
verified: null
---

# TASK-0029 BGM と効果音の入れ替え

- WS：[WS-0013](MWIZ-WS-0013-workstream-ja.md)
- ブランチ：`feat/TASK-0029-bgm-se`
- 実施記録：AC-0029（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0028（WS-0012）

## やること

- `src/logic/bgm-tracks.ts`：仕様書 §26.9 のコードのとおりに書き替える（6 曲、`BgmName` に `'clear'`、音色 20 種、`motif` をなくす）
- `src/logic/bgm-scene.ts`：ボス撃破のあと（`afterBoss`）は `'clear'`（仕様書 §26.7）
- `src/audio/sound.ts`：仕様書 §25 のとおりに書き替える（出来事の並び `SfxEvent`、音色 `SE_PATCHES`、長さ `SFX_MS`、FM の 1 音・ローパス・glide・ビブラート）。公開する関数（`audioContext`・`playSfx`・`stopSfx`・`sfxRemainingSec`・`sfxDuration`・`onSfx`・`sfx`）の名前と動きは変えない
- `src/audio/bgm.ts`・`bgm-director.ts`：`clear` の曲が鳴ることを確かめる（直しは要らない見込み。5/8・5/4 拍子は 1 小節の拍数の小数でそのまま鳴る）
- テスト：`tests/audio/sound.test.ts`（作り直し）、`tests/logic/bgm-tracks.test.ts`（6 曲・20 種・諸元）、`tests/logic/bgm-scene.test.ts`（`clear`）、`tests/audio/bgm.test.ts`（必要なら）、`e2e/sound.spec.ts`（ボス撃破のあとの `clear`）。直す前に、古い曲名（鐘と祈りなど）・`motif`・`wave`・`square`・`'boss'` のあとの `null` をテスト・ソースで探し、直す場所を全部挙げる
- `README.md`：曲名と出典（クレジット）を書く
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.7 に、第 2 部を実装に合わせる
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/SDD-PROCESS_v4.md` などを入れない）

## 対象の確認 ID（14 個：自動 10・手動 4）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/audio/sound.test.ts` | TC-0032-09、TC-0032-19 |
| `tests/logic/bgm-scene.test.ts` | TC-0034-01、TC-0034-05、TC-0034-14 |
| `tests/logic/bgm-tracks.test.ts` | TC-0034-22 |
| `e2e/sound.spec.ts` | TC-0032-10、TC-0034-03、TC-0034-06、TC-0034-15 |
| 実機（手動） | TC-0032-20、TC-0034-04、TC-0034-18、TC-0034-23 |

- どれも、すでにあるテストの期待する値を直す。新しい確認 ID はない（確認 ID は 329、テストのコードに 310 のまま）。
- ほかの音のテスト（TC-0032 の残り・TC-0034 の残り）は、直さずに通ることを確かめる。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面は変えないので、撮らない見込み）
- [ ] 設計と違う作りにしたら、TD・GUI を直した
- [ ] AC-0029（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
