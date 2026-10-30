---
id: MWIZ-AC-0003
type: Attested Computation
title: 更新の帯と起動の復旧 の実施記録
status: review
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-TASK-0003（v1.0）
  - MWIZ-TC-0001（v1.0）
  - MWIZ-TC-0005（v1.0）
verified: null
---

# AC-0003 更新の帯と起動の復旧 の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0003](../06_plan/MWIZ-TASK-0003-implementation-task-ja.md) 更新の帯と起動の復旧 |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0003-update-boot` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `public/boot.js`（起動の見張り。8 秒・`__bootWaitMs`、このアプリの範囲の Service Worker とキャッシュだけ消して読み込み直す、2 分以内の 2 回目は「なおす」。ES5 相当）と、`index.html` の読み込みと `#boot-error`
- 「なおす」を押したあとの動き（自動の復旧と同じことをすぐ行う）を決めて TD-0005 に書いた（仕様書 §30.4 に書かれていなかった。TD-0005 を v1.2 にした）
- `src/platform/pwa.ts`（本番のビルドだけ Service Worker を登録、新しい版は待機させ「更新」で切り替える）
- `src/ui/components/update-banner.ts`（画面の上端に固定の帯。いまはタイトルの画面で出してよい。宿屋は TASK-0007）
- `src/ui/debug.ts` の骨組みと `__wiz.showUpdateBanner()`（`?debug=1` のときだけ）
- `scripts/check-dist.mjs` に `boot.js`・`#boot-error` の確かめを足した

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0005-01 | E2E（`e2e/boot.spec.ts`） | OK。ふつうに起動したときは、見張りの時間の 3 倍待っても読み込み直さず、`#boot-error` も出ない |
| TC-0005-03 | E2E | OK。入口の JS を止め続けると、1 回だけ自動で読み込み直し、2 回目の失敗で「うまく起動できませんでした。」「なおす」「きろくは消えません。」が出る。「なおす」は高さ 48px 以上。そのあと読み込み直さない |
| TC-0005-04 | E2E | OK。前の復旧が 121 秒前なら、「なおす」を出さずに自動で読み込み直し、復旧の時刻が新しくなる |
| TC-0001-05 | E2E | OK。復旧で消えるのは、名前にこのアプリの範囲を含むキャッシュだけ。`other-app-cache` と `localStorage` の `mini-blockbreaking-game-save` は残る |

- E2E は、Service Worker が配るファイルは `page.route` で止められないので、`boot.spec.ts` だけ Service Worker を使わない設定にした（`serviceWorkers: 'block'`）。キャッシュの API はそのまま使える。

手元で通したもの（2026-10-30）：

- `npm run verify`：lint エラー 0、check:docs エラー 0、単体 1 件、build、check:dist OK
- `npm run test:e2e`：36 件通った（3 件は決まりどおりのスキップ）
- スクリーンショット（375 × 667・1280 × 800）：タイトルの上端の更新の帯、起動の失敗の画面

CI の結果（PR #29、2026-10-30）：`check`（verify）OK 17 秒、`e2e` OK 42 秒。

### WS-0001 の終わりの手動テスト（2026-10-30、オーナー）

WS-0001 には手動の確認 ID がない（作業計画の点検で、あとの TASK に移した）。そのため、公開 URL を実機で開き、この WS で作ったものが動くことだけを確かめた。

| # | 確かめたこと | 端末 | 結果 |
| --- | --- | --- | --- |
| 1 | 公開 URL（https://tsuku3dayo.github.io/mini-wiz-game/ ）が開く | iPhone 11 の Safari | OK |
| 2 | タイトル画面（WIZ・はじめから・インストール・v1.0）が出る | iPhone 11 の Safari | OK |
| 3 | 「インストール」で案内が開き、iPhone の手順が開いている | iPhone 11 の Safari | OK |
| 4 | 1〜3 と同じように開く | PC のブラウザ | OK |

## 3. 確認できなかったこと

- Android の実機はないので、Android での確認はしていない（E2E の pixel7 で代わりに確かめた。TST-0001 §6）。
- 実際に新しい版を公開して「更新」で切り替わることは、まだ確かめていない（TC-0004 の確認 ID は、作業計画の点検で TASK-0007・TASK-0015 に移した。実機の更新は TASK-0015 の時点の手動の確認）。
- 「なおす」を押したあとの動き（すぐ復旧して読み込み直す）は、テストケースに確認 ID がなく（TC-0005 は押す前の表示まで）、今回は確かめていない。TC-0005 に確認 ID を足すかは、オーナーに相談する。

## 4. 後片付け

- 手元の `vite preview`（スクリーンショット用）を止めた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（「なおす」の動きを TD-0005 に足した）
- [x] AC-0003（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #29）
- [x] マージされた（マージ = 公開。公開 URL で開けることを WS の終わりの手動テストで確かめた）
