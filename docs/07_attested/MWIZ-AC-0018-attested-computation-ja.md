---
id: MWIZ-AC-0018
type: Attested Computation
title: 敵の絵の実施記録
status: stable
version: 1.0
updated: 2026-11-04
sources:
  - MWIZ-TASK-0018（v1.0）
  - MWIZ-TC-0001（v1.1）
  - MWIZ-TC-0003（v1.0）
  - MWIZ-TC-0033（v1.2）
  - MWIZ-TD-0005（v1.7）
verified: { by: "tsuku3dayo", at: "2026-11-04T16:47:46+09:00" }
---

# AC-0018 敵の絵の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0018](../06_plan/MWIZ-TASK-0018-implementation-task-ja.md) 敵の絵 |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0018-enemy-images` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの：

- `public/enemies/<種類>.png`：オーナーが用意した `docs/requests/monster/monster_*_pixel256.png` 6 枚を、種類の名前に付け替えて置いた（加工なし）。置く前に、6 枚とも 256×256・ビット深度 8・RGBA で、バイト数と MD5 が仕様書 §13.1 の表と同じことを確かめた
- `logic/enemy-image.ts`（`enemyImageUrl`、256px）・`components/enemy-image.ts`（256×256、`image-rendering: pixelated`、alt は敵の名前、読めなければ枠ごと消す）。戦闘画面で敵の名前の上に置き、敵の種類が変わったら作り直す
- `tests/assets/enemy-images.test.ts`（ファイルのそろい）、`scripts/check-dist.mjs` に 6 枚（`dist/` にある・256×256・事前キャッシュにある）の検査を足した
- 事前キャッシュは、PWA の設定がもともと PNG をすべて入れるので、設定は変えていない

利用条件：仕様書 §13.3 のとおり、オーナーが確かめ済み（公開リポジトリ・公開 URL に置いてよい。2026-10-30）。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0033-05 | 単体（`tests/assets/enemy-images.test.ts`） | OK。`ENEMIES` の 6 種類それぞれの PNG があり、署名・IHDR・256×256・ビット深度 8・カラータイプ 6、MD5 が §13.1 と同じ。`public/enemies/` の PNG は 6 枚ちょうど |
| TC-0033-01 | E2E（`e2e/battle.spec.ts`。pixel7・small・desktop） | OK。6 体それぞれで `src` が `enemies/<種類>.png`、`naturalWidth` 256、枠の下端と名前の上端の差 0.5px 以内 |
| TC-0033-02 | E2E（同上） | OK。各プロジェクトの大きさと 414 × 715・1366 × 657 で、枠と絵が 256 × 256。`image-rendering: pixelated` |
| TC-0033-03 | E2E（同上） | OK。6 体それぞれで alt が敵の名前（「暗黒のネクロマンサー」「ダークナイト」など） |
| TC-0033-04 | E2E（同上。Service Worker を使わない） | OK。絵の読み込みを止めると枠がなく「スライム」だけ。`pageerror`・ErrorPanel なし。「たたかう」で次の行が出る |
| TC-0001-03 | E2E（`e2e/pwa.spec.ts`） | OK。タイトル → 名前入力 → 宿屋 → ダンジョン → 戦闘（スライムの絵）まで、通信はすべて同じオリジンの GET。フォント・音声ファイルの読み込みなし |
| TC-0001-04 | E2E（同上） | OK。セーブして「おと：オン」にしたあと、localStorage のキーは `mini-wiz-game-game`・`save`・`schema`・`sound` だけ。sessionStorage のキーはすべて `mini-wiz-game:` で始まる（このときは 0 個） |
| TC-0003-01 | E2E（同上） | OK。Service Worker が受け持ってから通信を切り、読み込み直してタイトル → はじめから → セーブ → ダンジョン → 戦闘（絵 256px）→ 読み込み直しても戦闘 → タイトルへ戻る → つづきから で「ゆうしゃは 宿屋で めをさました」。`pageerror` 0 件 |
| TC-0003-02 | E2E（同上） | OK。事前キャッシュに `index.html`・`manifest.webmanifest`・`assets/*.js`・`assets/*.css`・敵の絵 6 枚 |
| TC-0003-03 | 手動（iPhone 11。2026-11-04、オーナー） | OK（下の「WS-0008 の終わりの手動テスト」） |

手元で通したもの（2026-11-04）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID。テストにある確認 ID は 254 → 263 で、この TASK の自動の 9 個の分だけ増えた）、単体 164 件、build、check:dist OK（敵の絵 6 枚を含む）
- `npm run test:e2e`：380 件通った・31 件はその端末の対象外で飛ばした
- スクリーンショットとはみ出しの測定（ボスとスライムの戦闘）：414 × 715・1280 × 800・1366 × 657 は縦・横とも 0px。375 × 667 は縦に 47px スクロールする（GUI-0005 で試作を測った値と同じ。GUI-0001 は下限の大きさで少しのスクロールを許す）

途中で起きたこと：手元の E2E が 1 回、別のアプリ（同じ PC の別のプロジェクト）のプレビューの通信の受け口（ポート 4173）につながり、時間切れになった。そのアプリが止まってから動かし直して通った。CI には関係しない。

CI の結果（PR #59、2026-11-04）：`check`（verify）OK 1 分 5 秒、`e2e` OK 2 分 55 秒。マージのあと、main の test・pages も成功し、公開 URL の `enemies/slime.png` が 48,865 バイトで返ることを確かめた。

### WS-0008 の終わりの手動テスト（2026-11-04、オーナー）

PR #59 のマージ（公開）のあと、手順と「見ること」をオーナーに渡して確かめてもらった（ホーム画面のアプリと Safari の両方を頼んだ）。

手順：通信のある状態で開いて新しい版にし、閉じる → 機内モード（Wi-Fi も切る）→ 開く → タイトル → はじめから → 戦闘になるまで歩く → 宿屋でセーブ → タイトルへ戻る → つづきから。

| 見ること | 結果 |
| --- | --- |
| どの画面も通信のエラーにならずに出る | OK |
| 戦闘で敵の絵が出る | OK |
| つづきからで宿屋に戻る | OK |

オーナーの報告は「すべて OK」。

## 3. 確認できなかったこと

- TC-0003-03 は、オーナーの「すべて OK」の報告で記録した。アプリと Safari のそれぞれの結果を分けては聞いていない。
- Android の実機はない（WS-0008 のとおり、E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- 撮影用の設定・テスト・画像は作業用の一時フォルダに置いた。
- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（設計どおりで、直すところはなかった）
- [x] AC-0018（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #59）
- [x] マージされた（マージ = 公開。2026-11-04、公開 URL の敵の絵を確かめた）
