---
id: MWIZ-TASK-0034
type: Implementation Task
title: クレジット画面
status: stable
version: 1.0
updated: 2026-11-10
sources:
  - MWIZ-WS-0018（v1.0）
  - MWIZ-TC-0040（v1.1）
  - MWIZ-TC-0006（v1.3）
  - MWIZ-TC-0034（v1.4）
  - MWIZ-TC-0035（v1.1）
  - MWIZ-TC-0036（v1.1）
  - MWIZ-TD-0004（v1.4）
verified: null
---

# TASK-0034 クレジット画面

- WS：[WS-0018](MWIZ-WS-0018-workstream-ja.md)
- ブランチ：`feat/TASK-0034-credits`
- 実施記録：AC-0034（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0033（WS-0017）

## やること

- `src/logic/credits.ts`：`CREDITS`（仕様書 §11.5 の表の 6 組。TD-0002 §2）
- `src/ui/router.ts`：`ScreenName` に `'credits'`、`PATHS` に `/credits`、プレイ中のゲームがないときの画面を `['title', 'new', 'credits']` に（TD-0004 §10）
- `src/ui/screens/credits.ts`（新しく）・`src/main.ts`（`screens` に足す）：画面の作り・戻るボタン・Esc（TD-0004 §10）
- `src/ui/screens/title.ts`：メニューの 4 つ目に「クレジット」（TD-0004 §1）
- `src/ui/style.css`：`.credits-main`・`.credits-head`・`.credits-list`（TD-0004 §10）
- `src/logic/bgm-scene.ts`：`'/credits'` → `'title'`（TD-0005）
- テスト：下の表。`e2e/scenes.ts` に「クレジット」と「タイトル・エラー」の場面を足す（TC-0035・TC-0036-10 の「どの画面も」）
- スクリーンショット：375 × 667 と 1280 × 800 で、タイトル（エラーの枠ありも）とクレジット画面を見る。例の画像と並べて比べる
- `README.md`：画面の一覧などにタイトル・名前入力の画面の書き方があれば、クレジット画面を足す
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.12 に合わせ、第 2 部のファイル構成（`screens/credits.ts`・`logic/credits.ts`）を直す
- 依頼書の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` などを入れない）

## 対象の確認 ID（15 個：新しく 10（自動 9・手動 1）・直す 5）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/logic/credits.test.ts`（新しく） | TC-0040-03 |
| `e2e/credits.spec.ts`（新しく） | TC-0040-01・02・04・05・06・07・08・09 |
| 実機（手動） | TC-0040-10 |
| `tests/logic/bgm-scene.test.ts`（直す） | TC-0034-01 |
| `e2e/title.spec.ts`（直す） | TC-0006-01・06・07 |
| `e2e/a11y.spec.ts`（`e2e/scenes.ts` を足して通す） | TC-0036-10 |

- TC-0035-02・03・04・12（`e2e/layout.spec.ts`）は、`e2e/scenes.ts` に場面を足すだけで、テストの名前・中身は変えずに通ることを確かめる。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0034（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
