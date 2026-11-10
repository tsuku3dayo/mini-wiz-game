---
id: MWIZ-TASK-0033
type: Implementation Task
title: 敵の絵の v4 への差し替え
status: stable
version: 1.0
updated: 2026-11-10
sources:
  - MWIZ-WS-0017（v1.0）
  - MWIZ-TC-0033（v1.4）
verified: null
---

# TASK-0033 敵の絵の v4 への差し替え

- WS：[WS-0017](MWIZ-WS-0017-workstream-ja.md)
- ブランチ：`feat/TASK-0033-enemy-images-v4`
- 実施記録：AC-0033（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0032（WS-0016）

## やること

- 加工のプログラム `docs/requests/monster/make-transparent-v4.mjs` を置く（仕様書 §13.3 のとおり。Node.js の標準モジュールだけ）
- そのプログラムで、`docs/requests/monster/monster_*_pixel256_v4.png` の 6 枚から `public/enemies/<種類>.png` を作って上書きする。MD5 が仕様書 §13.1 の表と同じことを確かめる（`orc_lord` → `orc`、`dark_knight` → `darkKnight`）
- 加工した絵が、点ごとに「外側の黒だけが透明、ほかは元の色で不透明」になっていることを、別の方法（Windows の画像の機能など）で一度だけ確かめる（テストには残さない）
- 表示の作り・大きさ・説明の文は変えない（256×256 のまま）
- テスト：`tests/assets/enemy-images.test.ts` の MD5。直す前に、`e2e/`・`tests/`・`src/`・`scripts/` で v3 の MD5 を探し、直すところがほかにないことを確かめる
- スクリーンショット：375 × 667 と 1280 × 800 で、戦闘画面を見る（絵のまわりに黒い四角・縁の黒い線が見えないか）
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.11 に合わせる
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` などを入れない）

## 対象の確認 ID（2 個：自動 1・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/assets/enemy-images.test.ts` | TC-0033-05 |
| 実機（手動） | TC-0033-06 |

- TC-0033-01〜04（`e2e/battle.spec.ts`）と TC-0003-01・TC-0001-03（`e2e/pwa.spec.ts`）は、大きさが同じなので、直さずに通ることを確かめる。新しい確認 ID はない。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0033（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
