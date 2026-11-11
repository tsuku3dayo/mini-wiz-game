---
id: MWIZ-AC-0034
type: Attested Computation
title: クレジット画面の実施記録
status: stable
version: 1.0
updated: 2026-11-11
sources:
  - MWIZ-TASK-0034（v1.0）
  - MWIZ-TC-0040（v1.1）
  - MWIZ-TC-0006（v1.4）
  - MWIZ-TC-0034（v1.5）
  - MWIZ-TC-0035（v1.2）
  - MWIZ-TC-0036（v1.2）
verified: { by: "tsuku3dayo", at: "2026-11-11T11:07:13+09:00" }
---

# AC-0034 クレジット画面の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0034](../06_plan/MWIZ-TASK-0034-implementation-task-ja.md) クレジット画面（変更の依頼 `docs/requests/2026-11-10-spec-1.12-credits.md`・`docs/requests/2026-11-10-spec-1.13-title-padding.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0034-credits` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `src/logic/credits.ts`：`CREDITS`（6 組。凍らせた配列）
- `src/ui/screens/credits.ts`：クレジット画面（「← もどる」・Esc でタイトルへ。「←」は `aria-hidden`。`<dl>` に役割と名前）
- `src/ui/router.ts`：`'credits'`（`/credits`）と、プレイ中のゲームがないときの画面 `['title', 'new', 'credits']`。`src/main.ts` に画面を足した
- `src/ui/screens/title.ts`：メニューの 4 つ目に「クレジット」
- `src/ui/style.css`：クレジット画面の見た目。**画面の高さが 680px 以下のとき、タイトルの上下の余白を 16px**（仕様書 v1.13）
- `src/logic/bgm-scene.ts`：`'/credits'` → タイトルの曲
- テスト：`tests/logic/credits.test.ts`・`e2e/credits.spec.ts`（新しく）、`tests/logic/bgm-scene.test.ts`・`e2e/title.spec.ts`・`e2e/scenes.ts`（「タイトル・エラー」「クレジット」の場面を足した）・`e2e/menu.spec.ts`（TC-0010-02 のタイトルの下の端が「クレジット」に）
- `README.md`：「権利とクレジット」にゲームの中のクレジットを書いた
- `docs/reproduction-specification.md`：仕様書 v1.11 → v1.13 の差分を当てた（当たらなかった 3 か所（頭の版の行・改訂履歴・§29.3 の 1 行）は手で直した）。第 1 部が仕様書と 1 行も違わないことを、行ごとに比べて確かめた（2,759 行）

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0040-01 | E2E（3 端末） | OK |
| TC-0040-02 | E2E（3 端末。`desktop` はキー） | OK |
| TC-0040-03 | 単体 | OK |
| TC-0040-04 | E2E（3 端末） | OK |
| TC-0040-05 | E2E（3 端末。Enter・Esc は `desktop`） | OK |
| TC-0040-06 | E2E（3 端末） | OK |
| TC-0040-07 | E2E（3 端末） | OK（`app:bgm` は最初の `title` の 1 回だけ） |
| TC-0040-08 | E2E（3 端末） | OK |
| TC-0040-09 | E2E（3 端末） | OK（余白を詰めたあと。詰める前は 375 × 667 で 22px・1366 × 657 で 9px はみ出して失敗した → 変更の依頼 v1.13） |
| TC-0040-10 | 手動（iPhone・PC） | iPhone：OK（見え方・「← もどる」で戻れた・曲が途切れない。気になったことなし。2026-11-11 オーナー）。PC の Chrome：OK（見え方・「← もどる」と Esc で戻れた・曲が途切れない。気になったことなし。2026-11-11 オーナー） |
| TC-0006-01・06・07 | E2E（3 端末） | OK |
| TC-0034-01 | 単体 | OK |
| TC-0036-10 | E2E（3 端末。`e2e/scenes.ts` の全場面） | OK |

あわせて確かめたこと：

- TC-0035-02・03・04・12（`e2e/layout.spec.ts`）は、`e2e/scenes.ts` に「タイトル・エラー」「クレジット」を足したうえで、テストを変えずに通った。
- 画面：タイトル（ふつう・エラーの枠あり）とクレジット画面を、一番小さいスマートフォンの幅（375 × 667）と PC（1280 × 800）で撮って見た（作業用の一時フォルダ）。クレジットは例の画像と同じ並びで中央にそろい、タイトルはエラーの枠があっても 1 画面に収まった。

手元で通したもの（2026-11-10）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 1（AC-0024 の仕様書の版の表記。承認済みの記録なので変えない）、単体 185 件、build、check:dist OK
- `npm run test:e2e`：487 件通った・44 件はその端末の対象外で飛ばした（10.2 分）

## 3. 確認できなかったこと

- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。
- 安全領域（ノッチ）のある端末で、高さ 680px 以下のときの余白（`max(16px, 安全領域)`）が正しいかは、Chromium では安全領域が 0 なので確かめられない。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。測るためのプログラム・写真・差分を当てたときの記録（`.rej`）は、プロジェクトの外の作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（タイトルの余白は、変更の依頼 v1.13 で仕様書・GUI-0002 を直して再承認を受けてから作った）
- [x] AC-0034（draft）に自動テストの結果を書き、同じ PR に入れた（PR #111）
- [x] PR の CI が緑（PR #111：changes・check・e2e）
- [x] マージされた（マージ = 公開。2026-11-10 18:06。main の test・pages の build・deploy が緑。公開中の `index-BPauEpWr.js` に「クレジット」がある）
- [x] 公開したらすぐ実機の確認を案内し、結果を書いて review にした（iPhone・PC とも OK。2026-11-11）
