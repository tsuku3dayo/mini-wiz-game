---
id: MWIZ-AC-0031
type: Attested Computation
title: タイトル・宿屋・ボス戦の BGM の入れ替えの実施記録
status: draft
version: 1.0
updated: 2026-11-09
sources:
  - MWIZ-TASK-0031（v1.0）
  - MWIZ-TC-0032（v1.2）
  - MWIZ-TC-0034（v1.3）
  - MWIZ-TD-0005（v1.11）
verified: null
---

# AC-0031 タイトル・宿屋・ボス戦の BGM の入れ替えの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0031](../06_plan/MWIZ-TASK-0031-implementation-task-ja.md) タイトル・宿屋・ボス戦の BGM の入れ替え（変更の依頼 `docs/requests/2026-11-09-spec-1.9-bgm-swap.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0031-bgm-swap` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `src/logic/bgm-tracks.ts`：仕様書 §26.9 のコードを、そのまま抜き出して置き換えた（`title` ← カタコンベ、`inn` ← ローエングリン、`boss` ← モーツァルト「怒りの日」。グリーンスリーヴスを消した）。`bgm-scene.ts`・`bgm.ts`・`bgm-director.ts` は変えていない
- `tests/logic/bgm-tracks.test.ts`：TC-0034-22 の諸元（title・inn・boss の行）
- `README.md`：BGM の曲名と出典（クレジット）
- `docs/reproduction-specification.md`：仕様書 v1.8 → v1.9 の差分を当てた（頭の版の行と改訂履歴は手で直した）。§26.9 の `bgm-tracks.ts` の全文が実装と一字一句同じことを確かめた

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0034-22 | 単体（`tests/logic/bgm-tracks.test.ts`） | OK。6 曲の諸元（title 60・3・16・48.00、inn 52・4・16・73.85、boss 144・4・16・26.67 ほか）・パート・拍数・打楽器・音色 20 種・音域 24〜96 |
| TC-0034-01 | 単体（`tests/logic/bgm-scene.test.ts`） | OK（そのまま通った） |
| TC-0034-03 | E2E（`e2e/sound.spec.ts`） | OK（そのまま通った） |
| TC-0032-20 | 手動（iPhone 11・PC） | AC-0032 に引き継いだ（オーナーが「この後で再検討する」とし、仕様書 v1.10 で効果音を替えることになったため。2026-11-10） |
| TC-0034-04 | 手動（iPhone 11・PC） | OK（オーナー、2026-11-10。iPhone・PC の両方。6 曲とも 1 周の終わりで途切れずにつながり、ボス戦の曲も途切れない） |
| TC-0034-18 | 手動（iPhone 11・PC） | OK（オーナー、2026-11-10。効果音のあいだ曲が小さくなり、終わると戻る）。v1.10 で効果音が長くなるので、AC-0032 でもう一度確かめる |
| TC-0034-23 | 手動（iPhone 11・PC） | OK（オーナー、2026-11-10。iPhone・PC の両方。タイトル＝カタコンベ、宿屋＝ローエングリン、ボス戦＝怒りの日ほか 6 曲が、試聴ページで選んだとおりに聞こえる） |

あわせて確かめたこと：

- 試聴ページの値との突き合わせ（一度だけ。テストには残していない）：`boss` は `docs/requests/bgm-listen-v19/tracks-v19.ts` の `boss_mozart`（オーナーが選んだ候補 B）と同じ。`title`・`inn` は `docs/requests/bgm-listen/tracks-v17.ts` の `boss`・`title` と同じ（v1.7 の試聴ページだけにある空の `motif` の欄を除く）。
- 音のほかのテスト（TC-0032・TC-0034 の残り・`tests/audio/bgm.test.ts`）は、直さずに通った。
- 画面は変えていないので、スクリーンショットは撮っていない。

手元で通したもの（2026-11-09）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 0（成果物 190、確認 ID 335、テストのコードに 312 のまま）、単体 182 件、build、check:dist OK
- `npm run test:e2e`：460 件通った・44 件はその端末の対象外で飛ばした

## 3. 確認できなかったこと

- 実機（iPhone 11・PC）での曲と効果音の聞こえ方は、WS-0015 の終わりに確かめる。とくに、ボス戦の曲は 1 周に作る音が多い（約 1,300）ので、古い端末で途切れないか。
  - 2026-11-10 追記：v1.9 の公開（PR #99。pages の公開は GitHub 側の一時的な失敗のあと、オーナーが再実行して成功）のあと、オーナーが実機で聴いた。BGM は上の表のとおり OK（TC-0034-04 の「ボス戦の曲が途切れない」を含めて OK の返事。iPhone の機種までは聞いていない）。効果音（TC-0032-20）はオーナーが再検討することになり、仕様書 v1.10 で 5 つの効果音を替えた（`docs/requests/2026-11-10-spec-1.10-se-jingle.md`）。そのため TC-0032-20 は AC-0032 に引き継いだ。AC-0031 は AC-0029・AC-0032 と一緒に review にして承認を受ける。
  - 返事は「BGM はすべて OK」と、端末と項目ごとの確認（iPhone と PC の両方、効果音のあいだ曲が小さくなるのも OK）。聴いた細かな箇所（何周聴いたかなど）までは聞いていない。
- 曲の旋律は、楽譜を見ずに書いた（試聴ページのとおり）。原曲にどれだけ似ているかは、オーナーが試聴して決めた（2026-11-09）。
- Android の実機はない。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。突き合わせのテストと、差分を当てたときの記録（`.rej`）は、プロジェクトの外の作業用の一時フォルダに移した。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面は変えていない）
- [x] 設計と違う作りにしたら、TD を直した（設計どおり）
- [x] AC-0031（draft）に自動テストの結果を書き、同じ PR に入れた（PR #99）
- [ ] PR の CI が緑
- [ ] マージされた（マージ = 公開）
