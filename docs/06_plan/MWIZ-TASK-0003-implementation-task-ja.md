---
id: MWIZ-TASK-0003
type: Implementation Task
title: 更新の帯と起動の復旧
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-WS-0001（v1.0）
  - MWIZ-TC-0004（v1.0）
  - MWIZ-TC-0005（v1.0）
  - MWIZ-TD-0005（v1.0）
verified: null
---

# TASK-0003 更新の帯と起動の復旧

- WS：[WS-0001](MWIZ-WS-0001-workstream-ja.md)
- ブランチ：`feat/TASK-0003-update-boot`
- 実施記録：AC-0003（`docs/07_attested/MWIZ-AC-0003-attested-computation-ja.md`。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0002

## やること

- `platform/pwa.ts`・`components/update-banner.ts`（勝手に切り替えない、「更新」で切り替える）
- `public/boot.js`（8 秒の見張り・このアプリのキャッシュだけ消す・2 分以内の 2 回目で「なおす」）
- `ui/debug.ts` の骨組みと `__wiz.showUpdateBanner()`

## 対象の確認 ID（9 個：自動 8・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/pwa.spec.ts` | TC-0004-01、TC-0004-02、TC-0004-03 |
| 実機（手動） | TC-0004-04 |
| `e2e/boot.spec.ts` | TC-0005-01、TC-0005-02、TC-0005-03、TC-0005-04、TC-0005-05 |

- 自動の確認 ID は、この TASK の PR でテストを書いて通す（テストの名前の先頭に確認 ID）。手動の確認 ID は WS の終わりに実機で確かめ、AC に書く。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0003（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
