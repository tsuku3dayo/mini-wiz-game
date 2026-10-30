---
id: MWIZ-AC-0002
type: Attested Computation
title: PWA（manifest・アイコン・オフライン・インストールの案内）の実施記録
status: review
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-TASK-0002（v1.0）
  - MWIZ-TC-0002（v1.0）
verified: null
---

# AC-0002 PWA（manifest・アイコン・オフライン・インストールの案内）の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0002](../06_plan/MWIZ-TASK-0002-implementation-task-ja.md) PWA（manifest・アイコン・オフライン・インストールの案内） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0002-pwa` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `scripts/make-icons.mjs` と `public/icons/`（`icon.svg`・`icon-192.png`・`icon-512.png`・`icon-maskable-512.png`・`apple-touch-icon.png`）。図柄の値は TD-0005 §2.1 に書いた（仕様書 §30.5 で 03 に任せていた値。TD-0005 を v1.1 にした）
- `src/platform/install.ts`（インストール済みの判定・端末の判定・`beforeinstallprompt` を持っておく・「今すぐインストール」）
- `src/ui/components/install-dialog.ts`（`<dialog>` のモーダル。今の端末の手順だけ開く。「とじる」・Esc で閉じてフォーカスを戻す）
- タイトルの仮の画面に「インストール」（インストール済みなら出さない）、`index.html` に SVG の favicon と `apple-touch-icon`
- `scripts/check-dist.mjs` にアイコンの確かめを足した

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0002-01 | E2E（`e2e/pwa.spec.ts`） | OK。モーダルで開き、desktop は `pc`、pixel7・small は `android`、iPhone の userAgent は `ios` だけが開いている |
| TC-0002-02 | E2E | OK。イベントを受ける前は「今すぐインストール」が出ず、受けたあとは出て、押すと `prompt()` が 1 回 |
| TC-0002-03 | E2E（タッチ。pixel7・small） | OK。「とじる」で閉じ、フォーカスが「インストール」に戻る |
| TC-0002-04 | E2E（キー。desktop） | OK。Esc で閉じ、フォーカスが「インストール」に戻る |
| TC-0002-05 | E2E | OK。`display-mode: standalone`・`navigator.standalone` のどちらでも「インストール」が出ない。版の表記は行の右端に残る |
| TC-0002-06 | E2E | OK。manifest の名前・短い名前「WIZ」、`standalone`、`./`、アイコン 192・512・512（maskable）、`apple-mobile-web-app-title`、`apple-touch-icon` |

手元で通したもの（2026-10-30）：

- `npm run verify`：lint エラー 0、check:docs エラー 0、単体 1 件、build、check:dist OK
- `npm run test:e2e`：24 件通った（3 件は決まりどおりのスキップ：タッチのテストを desktop で、キーのテストをスマートフォンで動かさない）
- スクリーンショット（375 × 667・1280 × 800）：タイトルの「インストール」と版の行、案内のダイアログ（幅 92%・最大 480px、開閉の印 ▶／▼）

CI の結果（PR #28、2026-10-30）：`check`（verify）OK 14 秒、`e2e` OK 32 秒。

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
- 手動の確認 ID はこの TASK にない（ホーム画面への追加の実機の確認 TC-0002-07 は、作業計画の点検で TASK-0009 に移した）。
- 「今すぐインストール」で、ブラウザの本物のインストールの確認が出ることは、E2E では作れない（偽のイベントで `prompt()` が呼ばれることまで確かめた）。

## 4. 後片付け

- 手元の `vite preview`（スクリーンショット用）を止めた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（アイコンの値を TD-0005 §2.1 に足した）
- [x] AC-0002（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #28）
- [x] マージされた（マージ = 公開。公開 URL で開けることを WS の終わりの手動テストで確かめた）
