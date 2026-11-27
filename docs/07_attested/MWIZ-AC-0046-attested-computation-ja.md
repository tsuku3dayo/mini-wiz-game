---
id: MWIZ-AC-0046
type: Attested Computation
title: ドロップの効果音 5 つ（案 B）と LG の演出の長さ（仕様書 v1.25）の実施記録
status: draft
version: 1.0
updated: 2026-11-27
sources:
  - MWIZ-TASK-0046（v1.0）
  - MWIZ-TC-0011（v1.5）
  - MWIZ-TC-0027（v1.2）
  - MWIZ-TC-0031（v1.3）
  - MWIZ-TC-0032（v1.4）
  - MWIZ-TC-0034（v1.6）
  - MWIZ-TC-0036（v1.3）
verified: null
---

# AC-0046 ドロップの効果音 5 つ（案 B）と LG の演出の長さ（仕様書 v1.25）の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0046](../06_plan/MWIZ-TASK-0046-implementation-task-ja.md) ドロップの効果音 5 つ（案 B）と LG の演出の長さ（変更の依頼 `docs/requests/2026-11-27-spec-1.25-doors-drop-se.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0046-drop-se` |
| 環境 | Windows 11・PowerShell／Git Bash、Node.js v24.0.0。Vitest 5.1.1、Playwright 1.65.1 の Chromium |

作ったもの（TD-0003 v1.9 §3・TD-0005 v1.16「ドロップの音」のとおり）：

- 04 で仮に当てた差分（`v125-draft-src.patch`）のうち、効果音の分（`src/audio/sound.ts`・`src/main.ts`・`src/ui/message-queue.ts`・`src/logic/message-plan.ts`・`tests/audio/`）を当てた
- `src/audio/sound.ts`：`SfxName` を 11 種に、`SFX_MS`・`SFX` を仕様書 §25.2 のコードから写した（`sparkle` を消し、`G5` を足した）。仕様書・再現開発仕様書の §25.2 のコードの 9 つのまとまりが、どれも実装にそのまま入っていることを小さなプログラムで比べた
- `src/logic/message-plan.ts`：`RARE_DROP_LG_MS = 1400`
- `src/ui/message-queue.ts`：`onRarityLine`（演出のない `rarity` 付きの行、動きを減らす設定の最後の行）
- `src/main.ts`：`rareDrop` の演出で `dropUR`・`dropLG`、`onRarityLine` で `drop{N|R|SR}`
- 画面の光・行の点滅の CSS は、もともと 400ms × 回数で書かれていて、演出の長さから計算していなかったので、直していない（`style.css` の `wiz-blink 400ms`・`wiz-rare-glow 400ms`）
- `docs/reproduction-specification.md`：第 2 部の §25.4（鳴らすタイミング）と §29（音のテスト）を実装に合わせた
- 依頼書 v1.25 の影響の一覧に結果を書いた

直す前に、古い値（効果音の名前の `rareDrop`・`rareDropLG`、`1200`、`360`・`1020`、「8 種類」）を `tests/`・`e2e/`・`src/` で探した。演出の名前の `rareDrop`（画面の光・行の点滅）は変えていない。

## 2. 確認結果

| 確認 ID | 方法 | 結果 | 直したこと |
| --- | --- | --- | --- |
| TC-0011-01・TC-0031-06・TC-0031-10 | 単体（`message-plan.test.ts`） | OK | LG の待ちを 1200 → 1400 |
| TC-0032-09・TC-0032-19 | 単体（`sound.test.ts`） | OK | 11 種類の長さと中身（案 B の 5 つの出来事）を §25.2 のとおりに |
| TC-0032-21 | 単体 | OK | 04 の差分のとおり（`dropUR` ≦ 800、`dropLG` ≦ 1400） |
| TC-0034-17 | 単体（`bgm.test.ts`） | OK | 「前の効果音の途中で短い効果音が鳴っても、遅いほうまで下げたまま」を確かめるので、短い音を `rareDrop`（0.36 秒）から `dropN`（0.14 秒）に替えた |
| TC-0032-11・TC-0032-14・TC-0032-16 | E2E（3 端末） | OK | 音の名前を `dropUR`・`dropLG` に。ボス撃破のあとのクリアの音は、LG の待ちが延びたので 3000 → 3200ms |
| TC-0027-09 | E2E（3 端末） | OK | LG の次の行までを 1200 → 1400ms |
| TC-0036-05 | E2E（3 端末） | OK | 音の名前を `dropUR`・`dropLG` に |
| TC-0032-23 | E2E（3 端末、新しい） | OK | N（ゴブリン）・R（スライム）・SR（ダークナイト）は演出なしで 1 回、UR・LG は 1 回だけ。動きを減らす設定の N も 1 回 |

手元で通したもの（2026-11-27）：

- `npm run verify`：lint、check:docs（エラー 0・注意 1：AC-0024 の仕様書の版の表記＝承認済みの記録なので変えない）、単体 40 ファイル 217 件、build、check:dist OK
- `npm run test:e2e`：536 件通った・55 件はその端末の対象外で飛ばした・落ちたものはない（8.5 分）

画面の形は変えていない（音と待ちの長さだけ）。

## 3. 確認できなかったこと

- 実際の聞こえ方（案 B と同じに聞こえるか、N・R が何度も鳴ってうるさくないか、LG が最後まで鳴り切るか）は、WS-0027 の終わりに実機（iPhone 11・PC）で確かめる（TC-0032-20）。
- Android の実機はない。

## 4. 後片付け

- 作業用の一時フォルダの差分は、リポジトリに入れていない。

## 5. 完了の定義

- [x] 対象の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 仕様書 §25.2 のコードと実装・再現開発仕様書のコードが同じ
- [x] AC-0046（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた
- [ ] WS の終わりの手動テストの結果を書いた
