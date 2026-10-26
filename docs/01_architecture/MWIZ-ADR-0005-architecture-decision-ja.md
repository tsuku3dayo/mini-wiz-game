---
id: MWIZ-ADR-0005
type: Architecture Decision
title: 画面は DOM で組み立て、疑似3D と地図は SVG、画面の切替えはハッシュにする
status: stable
version: 1.0
updated: 2026-10-26
sources:
  - MWIZ-PB-0001（v1.0）§4.2、§5
  - docs/specification-ja.md (v1.1) §11.2、§11.5、§11.11、§27
verified: { by: "tsuku3dayo", at: "2026-10-26T17:16:59+09:00" }
---

# ADR-0005 画面は DOM で組み立て、疑似3D と地図は SVG、画面の切替えはハッシュにする

## 状況

元の WIZ の画面は React + MUI + React Router + TanStack Query で作られていた。UI フレームワークは使わない（ADR-0002、仕様書 §1.1 の「作らない」）。画面はターン制で、毎フレーム描き直す必要はない。疑似3D と地図は、元の WIZ でも SVG（WIZ-AD-0005・0007）で、読み上げ（`role="img"`・`aria-label`）とテストがしやすい。GitHub Pages では、サーバー側でパスを振り分けられない。

## 決定

- 画面は **DOM を TypeScript で組み立てる**（`createElement`・`textContent`。`innerHTML` は禁止）。部品は関数で、`{ el, update(next), destroy() }` を返す。部品の名前と振る舞い（`GameWindow`・`CommandMenu`・`MessageLog` など）は仕様書 §11 のまま。
- **疑似3D と自動地図は SVG** で描く。線分・図形は純粋関数（`viewToSegments`・`mapToShapes`）で作る。Canvas は使わない。
- **画面の切替えはハッシュ**（`#/`・`#/inn` など）。ハッシュと LocationGuard の規則（ゲームの状態の場所と違う画面を出さない）は小さなルーター（`src/ui/router.ts`）で作る。
- ゲームの状態は小さなストア（GameView とセーブの有無、変化を知らせる）で持つ。
- 色は CSS 変数（`--wiz-color-*`）、配置は CSS（グリッド・メディアクエリ）で決める。

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **A. DOM + SVG + ハッシュ（採用）** | 依存がない。読み上げ・フォーカス・axe の検査がそのまま効く。GitHub Pages で再読み込みしても画面が出る | メニューのカーソル・フォーカスの閉じ込めなどを自分で作る |
| B. Canvas に全部描く | 見た目を自由に作れる | 読み上げ・フォーカス・タップ領域を自分で作ることになり、E2E で中身を読めない |
| C. 履歴 API のパス（`/inn`） | URL が見やすい | GitHub Pages ではサブパスの直打ち・再読み込みで 404 になる。Service Worker の振り分けが要る |

## 結果

- 部品の振る舞いのうち純粋に決められるもの（カーソルの動き・メッセージの進め方）は `src/logic/` に出して単体テストし、DOM の振る舞いは E2E で確かめる（ADR-0011）。
- 細かいファイル分け・部品の設定は 04 詳細設計で決める。
