---
id: MWIZ-AC-0029
type: Attested Computation
title: BGM と効果音の入れ替えの実施記録
status: stable
version: 1.0
updated: 2026-11-10
sources:
  - MWIZ-TASK-0029（v1.0）
  - MWIZ-TC-0032（v1.3）
  - MWIZ-TC-0034（v1.6）
  - MWIZ-TD-0005（v1.13）
verified: { by: "tsuku3dayo", at: "2026-11-10T15:04:36+09:00" }
---

# AC-0029 BGM と効果音の入れ替えの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0029](../06_plan/MWIZ-TASK-0029-implementation-task-ja.md) BGM と効果音の入れ替え（変更の依頼 `docs/requests/2026-11-06-spec-1.7-bgm.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0029-bgm-se` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `src/logic/bgm-tracks.ts`：仕様書 §26.9 のコードのとおり（6 曲、`BgmName` に `'clear'`、音色 20 種、`motif` をなくした）。値は試聴ページ（`docs/requests/bgm-listen/tracks-v17.ts`）と同じ
- `src/audio/sound.ts`：仕様書 §25 のとおり（出来事の並び `SfxEvent`・音色 `SE_PATCHES` 8 種・長さ `SFX_MS`・FM の 1 音・出来事ごとのローパス・glide・ビブラート）。公開する関数の名前と動きは変えていない。値は試聴ページ（`docs/requests/se-listen/sfx-fm.ts`）でオーナーが選んだものと同じ
- `src/logic/bgm-scene.ts`：ボスのあと（`afterBoss`。export した）はクリアの曲。ただし戦闘の画面で撃破の行がまだのときは止める（4 番目の引数 `defeatShown`）
- `src/audio/bgm-director.ts`：撃破の行を出したかを、宿屋に戻るまで覚えておく（`defeatShown`）
- テスト：`tests/audio/sound.test.ts`（TC-0032-09・TC-0032-19 を出来事の並びの FM の予約を確かめる形に作り直し、TC-0032-12・TC-0037-04 を 1 音 = 搬送波と変調波の 2 つに合わせた）、`tests/helpers/fake-audio.ts`（偽のフィルターに `Q`）、`tests/logic/bgm-tracks.test.ts`（6 曲・20 種）、`tests/logic/bgm-scene.test.ts`（クリアの曲・`defeatShown`）、`e2e/sound.spec.ts`（TC-0034-06・TC-0034-15 を、撃破の演出のあとのクリアの曲に）
- `README.md`：BGM の曲名と出典（クレジット）
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.7 に置き換えた（頭の版の行と、改訂履歴の「再現」の 6 行のほかは仕様書と同じことを、`git diff --no-index` で確かめた）。第 2 部の §20.1・§25・§26.3・§26.7・§26.9〜§26.11 を仕様書 v1.7 と実装に合わせた

実装の途中で見つけたこと：

- 仕様書 v1.7 のとおりに作ると、E2E（TC-0034-06・TC-0034-15）で、`app:bgm` が `clear → null → clear` の順に出た。とどめの一撃でゲームの状態は CLEARED になるが、撃破の行（演出 `bossDefeat`）は攻撃・ダメージの行のあとに出るので、そのあいだにクリアの曲が一瞬鳴っていた（v1.6 までは、このあいだも無音だったので出なかった）。
- 「とどめの一撃のあと撃破の行が出るまでは止める」を足したが、次は `null → clear → null → clear` になった。クリア画面へ移る前にメッセージ欄が空になり、撃破の行を出したことが分からなくなるため。撃破の行を出したかを監督が宿屋に戻るまで覚えておくようにして、`null → clear` になった。
- 仕様書 §12.2・§26.7 に足し、依頼書の影響の一覧に「あとで見つけたもの」の行を足して、オーナーの再承認を受けた（2026-11-06T17:52:33+09:00）。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0032-09 | 単体（`tests/audio/sound.test.ts`） | OK。`SFX_MS` が v1.6 までと同じで、8 種類とも出来事の終わりのいちばん遅いものと一致。encounter は 680 ms |
| TC-0032-19 | 単体（同上） | OK。8 種類の出来事（周波数・頭・長さ・音色・glide・ビブラート）と音色 8 種の値が §25.2 と同じ。出来事ごとのローパス（Q 0.7 → destination）、搬送波・変調波の周波数・止める時刻・glide の予約・音量（vol ÷ √音数）・ビブラートの LFO が §25.1 のとおり |
| TC-0034-01 | 単体（`tests/logic/bgm-scene.test.ts`） | OK（そのまま通った） |
| TC-0034-05 | 単体（同上） | OK。CLEARED のときはどのパスでも `'clear'`、状態がない `/clear` は `null` |
| TC-0034-14 | 単体（同上） | OK。SWAP でダンジョンがないときは `'clear'`。戦闘の画面で撃破の行がまだ（`defeatShown` が false）なら `null`、入れ替え・クリアの画面では `'clear'` |
| TC-0034-22 | 単体（`tests/logic/bgm-tracks.test.ts`） | OK。6 曲の諸元（bpm・bpb・bars・1 周の秒）・パート・拍数・打楽器・音色 20 種・音域 24〜96 |
| TC-0032-10 | E2E（`e2e/sound.spec.ts`） | OK（そのまま通った） |
| TC-0034-03 | E2E（同上） | OK（そのまま通った） |
| TC-0034-06 | E2E（同上） | OK。クリア画面のあいだ、`app:bgm` は `null`（撃破の演出）→ `clear` のまま変わらない |
| TC-0034-15 | E2E（同上） | OK。撃破の演出のあと `clear`、クリア画面の「宿屋へ」で `inn`。所持品 50 個の入れ替え画面でも `clear`、再読み込みすると `clear` |
| TC-0032-20 | 手動（iPhone・PC） | v1.10 で効果音を替えたので AC-0032 に引き継いだ。v1.10 の音で OK（オーナー、2026-11-10。iPhone・PC の両方）。この WS で入れた FM 音源風の音のうち、v1.10 でも変えていない UR・LG・「コッ」も、このとき聴いている |
| TC-0034-04 | 手動（iPhone・PC） | OK（v1.9 の曲で。オーナー、2026-11-10。結果は AC-0031） |
| TC-0034-18 | 手動（iPhone・PC） | OK（オーナー、2026-11-10。AC-0031・AC-0032） |
| TC-0034-23 | 手動（iPhone・PC） | OK（v1.9 の曲で。オーナー、2026-11-10。結果は AC-0031） |

あわせて確かめたこと：

- 音のほかのテスト（TC-0032 の残り・TC-0034 の残り・`tests/audio/bgm.test.ts`）は、直さずに通った。
- 試聴ページの値との突き合わせ：`src/logic/bgm-tracks.ts` の 6 曲は `tracks-v17.ts` と同じ値。`src/audio/sound.ts` の 8 種類は、試聴ページでオーナーが選んだ案（遭遇＝新しい音 3b、レベルアップ・ボス出現・おと：オン＝暗い案、ドロップ 2 種＝低い音 2、ボス撃破・ゲームクリア＝新しい音 1）と同じ値（頭の時刻だけ、試聴ページの +0.02 秒をなくした）。
- 画面は変えていないので、スクリーンショットは撮っていない。

手元で通したもの（2026-11-06）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 0（確認 ID 329、テストのコードに 310 のまま）、単体 180 件、build、check:dist OK
- `npm run test:e2e`：460 件通った・44 件はその端末の対象外で飛ばした

## 3. 確認できなかったこと

- 実機（iPhone 11・PC）での曲と効果音の聞こえ方は、WS-0013 の終わりに確かめる。
  - 2026-11-09 追記：結果を受け取る前に、仕様書 v1.9 でタイトル・宿屋・ボス戦の曲を入れ替えることになった（`docs/requests/2026-11-09-spec-1.9-bgm-swap.md`）。オーナーの判断で、上の 4 つの手動の確認（TC-0032-20・TC-0034-04・TC-0034-18・TC-0034-23）は WS-0015 の終わりにまとめて行い、結果は AC-0031 に書く。AC-0029 は AC-0031 と一緒に review にして承認を受ける。
  - 2026-11-10 追記：v1.9 の公開のあと、オーナーが実機で聴いた。BGM（TC-0034-04・TC-0034-23）は iPhone・PC とも OK、TC-0034-18 も OK（結果は AC-0031）。この WS で入れたダンジョン・戦闘・クリアの曲も、このとき聴いている。効果音（TC-0032-20）は、オーナーが「この後で再検討する」とし、仕様書 v1.10 で 5 つの効果音を替えることになった（`docs/requests/2026-11-10-spec-1.10-se-jingle.md`）。そのため TC-0032-20 は AC-0032 に引き継いだ。AC-0029 は AC-0031・AC-0032 と一緒に review にして承認を受ける（変更の依頼 v1.10 §2.2 の 5）。
- 曲の旋律は、楽譜を見ずに書いた（試聴ページのとおり）。原曲にどれだけ似ているかは、オーナーが試聴して決めた（2026-11-06）。
- Android の実機はない。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。下書きと確かめのための一時ファイルは作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面は変えていない）
- [x] 設計と違う作りにしたら、TD・GUI を直した（仕様書 §12.2・§26.7 に足して再承認を受け、TC-0034-14 に足した）
- [x] AC-0029（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #91：check 28s・e2e 4m43s）
- [x] マージされた（マージ = 公開。2026-11-06、main の test 3m49s・pages 48s）
- [x] 手動テストの結果を書き、review にした（2026-11-10。AC-0031・AC-0032 に引き継いだ結果で）
