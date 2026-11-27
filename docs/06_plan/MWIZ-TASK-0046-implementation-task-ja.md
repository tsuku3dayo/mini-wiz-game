---
id: MWIZ-TASK-0046
type: Implementation Task
title: ドロップの効果音 5 つ（案 B）と LG の演出の長さ（仕様書 v1.25）
status: stable
version: 1.0
updated: 2026-11-27
sources:
  - MWIZ-WS-0027（v1.0）
  - MWIZ-TD-0003（v1.9）
  - MWIZ-TD-0005（v1.16）
  - MWIZ-TC-0011（v1.5）
  - MWIZ-TC-0031（v1.3）
  - MWIZ-TC-0032（v1.4）
verified: null
---

# TASK-0046 ドロップの効果音 5 つ（案 B）と LG の演出の長さ

- WS：[WS-0027](MWIZ-WS-0027-workstream-ja.md)
- ブランチ：`feat/TASK-0046-drop-se`
- 実施記録：AC-0046（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0045

## やること

TD-0003 §3・TD-0005「ドロップの音」のとおりに作る。04 で仮に当てたコードの差分（`v125-draft-src.patch`）のうち、`src/audio/sound.ts`・`src/main.ts`・`src/ui/message-queue.ts`・`src/logic/message-plan.ts`・`tests/audio/` の分を当ててから始めてよい。

- `src/audio/sound.ts`：`SfxName`（11 種）、`SFX_MS`・`SFX` を仕様書 §25.2 のコードからそのまま写す（`sparkle` を消し、`G5` を足す）。写したあと、仕様書・再現開発仕様書・実装のコードが一字一句同じか、小さなプログラムで比べる（いつもの手順）
- `src/logic/message-plan.ts`：`RARE_DROP_LG_MS = 1400`
- `src/ui/message-queue.ts`：`onRarityLine`（演出のない `rarity` 付きの行。動きを減らす設定の最後の行も）
- `src/main.ts`：`onEffectStart` の `rareDrop` → `dropUR`／`dropLG`、`onRarityLine` → `drop{N|R|SR}`
- 画面の光・行の点滅の CSS が「演出の長さ ÷ 回数」で決まっていないかを確かめる（決まっていれば 400ms に固定。TD-0003 §3）
- テスト：TC-0032-23（新しい）を `e2e/sound.spec.ts` に書く
- 古い値でも探す：`rareDrop`・`rareDropLG`（効果音の名前として。演出の名前 `rareDrop` は変えない）、`1200`・`1,200`・`360`・`1020`、`8 種`
- `docs/reproduction-specification.md`：第 2 部の §25 を実装に合わせる（第 1 部は TASK-0045 で合わせる）
- 依頼書の影響の一覧の「結果」を埋める

## 対象の確認 ID

テストケースの中身が変わったもの・新しいもの：

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/logic/message-plan.test.ts` | TC-0011-01・TC-0031-06 |
| `tests/audio/sound.test.ts` | TC-0032-19・TC-0032-21 |
| `e2e/sound.spec.ts` | TC-0032-11・TC-0032-23（新しい） |

04 で仮に当てて落ちた、テストのコードだけを直すもの（確かめることは変わらない）：

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/logic/message-plan.test.ts` | TC-0031-10（動きを減らす設定の計画の待ち） |
| `tests/audio/sound.test.ts` | TC-0032-09（テストの名前の「8 種類」と、全部の音を回すところ） |
| `tests/audio/bgm.test.ts` | TC-0034-17（`rareDrop` の 360ms で書いた時刻） |
| `e2e/sound.spec.ts` | TC-0032-14（音の名前）、TC-0032-16（TASK-0045 で直していなければ） |
| `e2e/message.spec.ts` | TC-0027-09（LG の点滅のあとの待ち 1400ms） |
| `e2e/a11y.spec.ts` | TC-0036-05（音の出来事の名前） |

- 04 の時点（2026-11-27）で、この TASK の分は単体 7 件、E2E 5 個のテスト（3 つの画面幅で 15 件）が落ちた（TC-0032-16 を含む。TASK-0045 の表の注を見る）。
- 実際の聞こえ方は、WS の終わりの手動テスト。

## 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 仕様書 §25.2 のコードと実装・再現開発仕様書のコードが同じ
- [ ] AC-0046（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
