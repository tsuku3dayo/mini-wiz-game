---
id: MWIZ-ADR-0011
type: Architecture Decision
title: ロジックとゲーム API は Vitest、画面は Playwright の 3 つの画面で確かめ、iPhone は実機で確かめる
status: review
version: 1.0
updated: 2026-10-26
sources:
  - MWIZ-PB-0001（v1.0）§4.1、§6
  - docs/specification-ja.md (v1.1) §16、§19.5、§28、§29
  - mini-blockbreaking-game doc/01_architecture/MBRK-ADR-0008（v1.0）
verified: null
---

# ADR-0011 ロジックとゲーム API は Vitest、画面は Playwright の 3 つの画面で確かめ、iPhone は実機で確かめる

## 状況

元の WIZ は、Jest で backend の単体テスト・API の統合テスト（DB を使う）・frontend の画面テスト（jsdom + Testing Library + jest-axe）を持っていた。このプロジェクトは参照プロジェクトと同じ Vitest（node）と Playwright（Chromium）を使う（ADR-0002）。対象はスマートフォンの縦画面を基準に PC も含む。iPhone の Safari は CI では動かせない。画面の中身（メニュー・疑似3D・地図）は DOM と SVG なので E2E から読める（ADR-0005）が、乱数で決まる場面（遭遇・ドロップ）を E2E で作るには入口が要る。

## 決定

**単体テスト（Vitest、node）**

- `tests/domain/`：ルール（元の backend の単体テストと同じ内容）。`SequenceRng`・`SeededRng` で乱数を固定する。
- `tests/api/`：ゲーム API に偽の保存と乱数を渡し、操作・保存の中身・エラー・楽観ロック・自動セーブ・移行・保存の失敗を確かめる（元の API の統合テストの代わり）。通しプレイ（固定シードでボス撃破まで・装備を拾ってクリア・2 周）を自動プレイヤーで確かめる。
- `tests/logic/`：表示の計算。`tests/audio/`：偽の `AudioContext` で効果音・BGM。`tests/assets/`：敵の絵のファイル。

**E2E（Playwright、Chromium）**

- build 済みの成果物を `vite preview` で配信して試す（Service Worker も本物）。
- 3 つのプロジェクト：`pixel7`（Pixel 7）、`small`（375 × 667、タッチあり）、`desktop`（Desktop Chrome、1280 × 800）。スマートフォンの 2 つを主にし、キーボードだけの操作と広い画面の配置は `desktop` で確かめる。
- アクセシビリティは `@axe-core/playwright` で各画面と主な状態を検査する（jest-axe の代わり）。
- 決まった場面は **テスト用の入口**（URL に `?debug=1` のときだけ `window.__wiz`：地図の全体・乱数の固定・保存への直接の書き込み・応答の遅延・更新の帯）で作る。公開版でも `?debug=1` で使える（1 人用で、競う相手がいないため受け入れる）。
- 字の幅に頼るテストは書かない。

**手動テスト**

- iPhone の Safari・Android の Chrome・PC の Chrome / Edge の実機で、タッチ・画面の大きさ・音と BGM・インストール・通信なしの起動・更新を確かめる。持っていない端末は attested-computation の「確認できなかったこと」に書く。

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **A. Vitest（node）+ Playwright 3 画面 + axe-core（採用）** | 参照プロジェクトと同じ道具。画面は本物のブラウザで確かめられる。PC のキーボード操作も CI で確かめられる | E2E が増えて CI の時間が長くなる |
| B. 元の WIZ と同じく jsdom + Testing Library で画面の単体テスト | 速い | 依存が増え、参照プロジェクトと道具が分かれる。本物のブラウザの動き（フォーカス・SVG・Service Worker）は分からない |
| C. E2E はスマートフォンの 2 画面だけ（参照プロジェクトと同じ） | CI が短い | PC のキーボード操作・広い画面の配置（仕様書 §14・§16.4）を手動でしか確かめられない |

## 結果

- テストの名前の先頭に確認 ID を付け、`check:docs` で test-case と突き合わせる。テストケースの番号の決め方は 05 で決める。
- E2E の時間が長くなったら、プロジェクトごとに試す spec を絞る（04・05 で決める）。
