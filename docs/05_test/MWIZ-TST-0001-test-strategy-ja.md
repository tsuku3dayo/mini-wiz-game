---
id: MWIZ-TST-0001
type: Test Strategy
title: テストの戦略
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-EP-0001（v1.0）
  - MWIZ-ADR-0011（v1.0）
  - MWIZ-TD-0001（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0005（v1.1）
  - MWIZ-GUI-0001（v1.1）
  - docs/specification-ja.md (v1.2) §14、§16、§29
verified: null
---

# TST-0001 テストの戦略

## 1. 目的と範囲

仕様書 v1.2 §16 の受け入れ基準と、ユーザーストーリー（US-0001〜0038）の受け入れ条件を、すべて確かめる。確かめ方は 3 つ：単体テスト（自動）・E2E（自動）・手動（実機）。

## 2. テストケースと確認 ID

| 決まり | 内容 |
| --- | --- |
| テストケースの番号 | **ユーザーストーリーと同じ**（US-0014 → TC-0014）。1 つの US に 1 つの TC |
| 非機能のテストケース | 非機能の要件も US（US-0035〜0038：スマートフォンの画面・キーボードと読み上げ・すばやさ・テスト用の入口）になっているので、同じ決まりで TC-0035〜0038。別の番号の付け方は持たない。あとで US を足しても番号はずれない。保存・オフライン・更新は US-0001〜0005・US-0012（TC-0001〜0005・TC-0012）で確かめる |
| 確認 ID | `TC-<4 桁>-<2 桁>`（例：`TC-0014-03`）。US の受け入れ条件 1 つに 1 つ以上。上から順に 01・02… と振る。1 つの条件を自動と手動に分けるときは、確認 ID を分ける |
| 書く場所 | テストの名前の先頭（`test('TC-0014-03 矢印キーが…')`）。手動は TC の「手動の手順」と AC（attested-computation）の結果の表 |
| 欠番 | 確認 ID を消したら、その番号を使い直さない |

## 3. 方法の分け方

| 方法 | 道具 | 置き場所 | 何を確かめるか |
| --- | --- | --- | --- |
| 単体 | Vitest（node） | `tests/domain/`・`tests/logic/`・`tests/api/`・`tests/audio/`・`tests/assets/` | ルール・表示の計算・ゲーム API・保存・音の予約・敵の絵のファイル（DOM を使わない。ADR-0011） |
| E2E | Playwright（本番のビルドを `vite preview` で） | `e2e/*.spec.ts` | 画面・部品の振る舞い、画面の切り替え、大きさ、PWA、起動の復旧、アクセシビリティ（axe-core） |
| 手動 | 実機 | TC の手順、結果は AC | 実機のタッチ・指で隠れないか・音を聴く・ホーム画面のアプリ・通信なし・更新・読み上げ |

- **できるだけ自動にする**。手動にするのは、実機でしか分からないもの（§6）だけ。
- 1 つの条件に、自動（形の確認）と手動（実機での見え方）の両方が要るときは、確認 ID を 2 つに分ける。

## 4. テストファイルの置き場所

| 区分 | ファイル（例） |
| --- | --- |
| `tests/domain/` | `rng`・`constants`・`errors`・`character`・`game-state`・`floors`・`explore`・`view`・`battle`・`items`・`loot`・`equipment`・`records`・`heal`・`balance` の `.test.ts`（仕様書 §29.2） |
| `tests/logic/` | `name`・`version`・`describe-view`・`view-to-segments`・`map-to-shapes`・`arrival`・`low-hp`・`item-text`・`sort-items`・`stat-diff`・`menu-model`・`message-plan`・`bgm-scene`・`bgm-tracks` の `.test.ts` |
| `tests/api/` | `game-api.test.ts`（操作・エラー・楽観ロック・自動セーブ・移行）、`playthrough.test.ts`（自動プレイヤーの通しプレイ） |
| `tests/audio/` | `sound.test.ts`・`bgm.test.ts`・`sound-setting.test.ts` |
| `tests/assets/` | `enemy-images.test.ts` |
| `e2e/` | `title`・`name-entry`・`inn`・`dungeon`・`battle`・`clear`・`swap`・`equipment`・`inventory`・`status`・`menu`・`message`・`effects`・`error`・`layout`・`a11y`・`pwa`・`boot`・`sound`・`debug` の `.spec.ts`（BGM の E2E も `sound`）、共通の操作は `e2e/helpers.ts` |

- TC には「置き場所」の列に、確認 ID ごとのファイルを書く。新しいファイルが要るときは、この表に足す（TST の版を上げる）。

## 5. E2E の決まり

| 決まり | 内容 |
| --- | --- |
| プロジェクト | `pixel7`（412×839、タッチ）・`small`（375×667、タッチ）・`desktop`（1280×800、マウス）。仕様書 §29.3 |
| 大きさの確かめ | 該当のテストの中で `page.setViewportSize` により **414×715（iPhone 11 の Safari）** と **1366×657** にも変えて測る（TD-0003 §9）。はみ出し＝`documentElement.scrollHeight − innerHeight` と `scrollWidth − innerWidth` |
| 場面の作り方 | `?debug=1` の `__wiz.writeState`・`writeSave`・`useSeed`・`setDelay`（仕様書 §28）。`e2e/helpers.ts` に `startAt(location, 状態)` などをまとめる |
| 保存の失敗 | E2E では `page.evaluate` で `Storage.prototype.setItem` を例外を投げる関数に替えて起こす（テスト用の入口は足さない）。単体では `tests/helpers/fake-storage.ts` で指定したキーの書き込みを失敗させる。楽観ロック（ほかのタブが先に書いた）は、偽の保存に「書く直前の読み直しのときだけ revision を進める」働きを持たせて作る |
| 乱数で決まる場面 | 「次の前進で遭遇する」「逃げきれる」「ドロップが決まる」などのシードは、テストを書くときに探して `e2e/helpers.ts` に名前付きで置く |
| 時間 | 偽の時計（`page.clock.install` → `pauseAt` → `runFor`）で 400ms の逐次表示・演出の長さを進める。時間で変わる表示は、状態をそろえてから見る |
| 文字 | 文字の幅に頼らない（手元と CI でフォントが違う）。行の高さ・間隔は `getBoundingClientRect` で測る |
| タッチとキー | キーボードだけのテストは `desktop` だけ、タッチのテストは `pixel7`・`small` だけ（`test.skip` で分ける） |
| アクセシビリティ | `@axe-core/playwright` で各画面と、メニュー・確認・演出・エラーを出した状態（仕様書 §29.3） |

## 6. 手動テスト（実機）

| 端末 | 持っているか | 使い方 |
| --- | --- | --- |
| iPhone 11（Safari・ホーム画面のアプリ） | ある（オーナー） | 基準の端末。WS の終わりごとに手動の確認 ID を行う |
| PC（Chrome / Edge） | ある（オーナー） | 広い画面・マウスの確認 |
| Android | ない | 実機の確認はできない。E2E の `pixel7`（Chromium）で代わりに確かめ、AC の「確認できなかったこと」に書く |

手動にする項目（先に一覧にして、手順が実機でできるかを確かめた）：

| 項目 | 実機でできるか |
| --- | --- |
| タッチの押しやすさ・指で隠れないか・押し間違えないか | できる |
| iPhone 11 の Safari で 1 画面に収まるか（ツールバーの高さは端末で違う） | できる。E2E の 414×715 の結果と合わせて見る |
| 効果音・BGM を聴く（音色・音量・ループ・フェード・ダッキング） | できる（音をオンにして遊ぶ） |
| ホーム画面に追加・アプリ名が切れない・ノッチ・ホームバー | できる |
| 通信なしで起動・遊べる | できる（機内モード） |
| 新しい版の「更新」 | できる。ただし **ホーム画面のアプリは URL を変えられない**（`?debug=1` の入口を使えない）ので、実際に新しい版を公開して確かめる。リリースの前の WS で行う |
| 読み上げ（VoiceOver） | できる（任意。主な画面だけ） |
| 起動の復旧（壊れたキャッシュ） | 実機では作りにくい。E2E（`boot.spec.ts`）で確かめ、手動はしない |

- 手動の結果は、WS の終わりに AC に書く（OK／NG と様子）。結果を受けていない項目は、AC の「確認できなかったこと」に書く。

## 7. 速さ・バランス

- 速さ（仕様書 §14、US-0037）：5 階層の生成 50ms 未満・操作 100ms 未満は単体テストで時間を測る（CI の余裕をみて 3 倍まで許す）。初期表示 1 秒以内は実機の手動。
- バランス：任意の計測（`WIZ_BALANCE_SEEDS`・`WIZ_BALANCE_BOSS`）は既定で動かさない（仕様書 §29.2）。

## 8. CI と手元

- PR の前に、手元で `npm run verify`（lint・check:docs・単体・build・check:dist）と `npm run test:e2e` を通す。
- CI（`.github/workflows/test.yml`）は PR と main への push で同じものを動かす。
- `check:docs` で、テストの名前の確認 ID が TC にあること、TC の確認 ID がテストのコード（自動）か AC（手動）にあることを確かめる（SDD-PROCESS v3 §7.2）。
