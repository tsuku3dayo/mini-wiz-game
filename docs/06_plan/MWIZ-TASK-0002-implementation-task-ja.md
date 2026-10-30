---
id: MWIZ-TASK-0002
type: Implementation Task
title: PWA（manifest・アイコン・オフライン・インストールの案内）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0001（v1.0）
  - MWIZ-TC-0002（v1.0）
  - MWIZ-TD-0005（v1.0）
verified: null
---

# TASK-0002 PWA（manifest・アイコン・オフライン・インストールの案内）

- WS：[WS-0001](MWIZ-WS-0001-workstream-ja.md)
- ブランチ：`feat/TASK-0002-pwa`
- 実施記録：AC-0002（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0001

## やること

- `vite.config.ts` の `VitePWA`（manifest・事前キャッシュ・`registerType: prompt`）
- `scripts/make-icons.mjs` とアイコン
- `platform/install.ts`・`components/install-dialog.ts`（タイトルの仮の画面に「インストール」）

## 対象の確認 ID（6 個：自動 6・手動 0）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/pwa.spec.ts` | TC-0002-01、TC-0002-02、TC-0002-03、TC-0002-04、TC-0002-05、TC-0002-06 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0002（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
