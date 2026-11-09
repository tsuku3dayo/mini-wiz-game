---
id: MWIZ-TASK-0026
type: Implementation Task
title: タイトル画像と敵の絵の v2 への差し替え
status: stable
version: 1.0
updated: 2026-11-06
sources:
  - MWIZ-WS-0012（v1.2）
  - MWIZ-TC-0006（v1.2）
  - MWIZ-TC-0033（v1.3）
  - MWIZ-TD-0003（v1.4）
  - MWIZ-TD-0005（v1.10）
verified: null
---

# TASK-0026 タイトル画像と敵の絵の v2 への差し替え

- WS：[WS-0012](MWIZ-WS-0012-workstream-ja.md)
- ブランチ：`feat/TASK-0026-images-v2`
- 実施記録：AC-0026（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0025（WS-0011）

## やること

- `docs/requests/title/wiz_mini_title_v2.png` を `public/title/title.png` に、`docs/requests/monster/monster_*_pixel128-v2.png` の 6 枚を `public/enemies/<種類>.png` に、名前を付け替えて上書きで置く（中身は変えない。MD5 で確かめる。`orc_lord` → `orc`、`dark_knight` → `darkKnight`）
- 表示の作りは変えない（枠 256px・`image-rendering: pixelated` のまま）。`src/ui/components/enemy-image.ts`・`src/ui/screens/battle.ts`・`src/ui/style.css` の説明の文だけ、「256×256 をそのまま」→「128×128 を 2 倍」に直す
- `scripts/check-dist.mjs`：敵の絵の幅・高さを 128 に
- テスト：`tests/assets/enemy-images.test.ts`（幅・高さ 128、MD5）、`tests/assets/title-image.test.ts`（MD5）、`e2e/battle.spec.ts`（TC-0033-01 の `naturalWidth`・`naturalHeight` 128、TC-0033-02 の名前の「絵は 256×256」を直す）
- 画面の大きさのテスト（`e2e/layout.spec.ts`）・axe の検査（`e2e/a11y.spec.ts`）がそのまま通ることを確かめる
- スクリーンショット：375 × 667 と 1280 × 800 で、タイトル画面と戦闘画面（6 体）を見る
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.4 に、第 2 部の敵の絵の大きさを実装に合わせる

## 対象の確認 ID（8 個：自動 6・手動 2）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/battle.spec.ts` | TC-0033-01、TC-0033-02 |
| `tests/assets/enemy-images.test.ts` | TC-0033-05 |
| `tests/assets/title-image.test.ts` | TC-0006-12 |
| `e2e/title.spec.ts` | TC-0006-09、TC-0006-10（画像の大きさ・余白。画像を替えても通ることを確かめる） |
| 実機（手動） | TC-0006-13、TC-0033-06 |

- どれも、すでにあるテストの期待する値を直すか、そのまま通ることを確かめる。新しい確認 ID は手動の TC-0033-06 だけ（テストにある確認 ID の数は 310 のまま）。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0026（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
