---
id: MWIZ-TASK-0027
type: Implementation Task
title: 敵の絵の 256×256 の v2 への差し替え
status: stable
version: 1.0
updated: 2026-11-06
sources:
  - MWIZ-WS-0012（v1.2）
  - MWIZ-TC-0033（v1.4）
  - MWIZ-TD-0003（v1.4）
  - MWIZ-TD-0005（v1.12）
verified: null
---

# TASK-0027 敵の絵の 256×256 の v2 への差し替え

- WS：[WS-0012](MWIZ-WS-0012-workstream-ja.md)
- ブランチ：`feat/TASK-0027-enemy-images-256`
- 実施記録：AC-0027（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0026（同じ WS。v1.4 の差し替え）

## やること

- `docs/requests/monster/monster_*_pixel256-v2.png` の 6 枚を `public/enemies/<種類>.png` に、名前を付け替えて上書きで置く（中身は変えない。MD5 で確かめる。`orc_lord` → `orc`、`dark_knight` → `darkKnight`）
- 表示の作りは変えない（枠 256px・`image-rendering: pixelated`）。説明の文を「128×128 を 2 倍」→「256×256 をそのまま（拡大しない）」に直す：`src/logic/enemy-image.ts`・`src/ui/components/enemy-image.ts`・`src/ui/screens/battle.ts`・`src/ui/style.css`
- `scripts/check-dist.mjs`：敵の絵の幅・高さを 256 に
- テスト：`tests/assets/enemy-images.test.ts`（256×256・MD5）、`e2e/battle.spec.ts`（`naturalWidth`・`naturalHeight` 256、テストの名前）、`e2e/pwa.spec.ts`（敵の絵の読み込みの確かめを `naturalWidth` 256 に）。直す前に、`e2e/`・`tests/`・`src/`・`scripts/` で `128` を探して、直すところがほかにないことを確かめる（TASK-0026 で `e2e/pwa.spec.ts` を見落としたため）
- スクリーンショット：375 × 667 と 1280 × 800 で、6 体の戦闘画面を見る
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.5 に、第 2 部の敵の絵の大きさを実装に合わせる
- AC-0026：タイトル画像の実機の結果（TC-0006-13 OK）を書き、TC-0033-06 は AC-0027 で行うと書く（WS の終わりに review）

## 対象の確認 ID（5 個：自動 4・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/battle.spec.ts` | TC-0033-01、TC-0033-02 |
| `tests/assets/enemy-images.test.ts` | TC-0033-05 |
| `e2e/pwa.spec.ts` | TC-0003-01（通信なしで戦闘の敵の絵まで出る。敵の絵の読み込みの確かめを直す。TC-0001-03 も同じ確かめを使う） |
| 実機（手動） | TC-0033-06 |

- どれも、すでにあるテストの期待する値を直す。新しい確認 ID はない（確認 ID は 329、テストのコードに 310 のまま）。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0027（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
