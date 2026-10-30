---
id: MWIZ-ADR-0010
type: Architecture Decision
title: フォントは端末のものを使い、同梱しない
status: stable
version: 1.0
updated: 2026-10-26
sources:
  - MWIZ-PB-0001（v1.1）§4.2、§5、§9
  - docs/specification-ja.md (v1.2) §11.3、§14、§18.1
  - docs/requests/2026-10-26-serverless-pwa.md §4（オーナーの回答）
verified: { by: "tsuku3dayo", at: "2026-10-26T17:16:59+09:00" }
---

# ADR-0010 フォントは端末のものを使い、同梱しない

## 状況

元の WIZ は、ドット風の日本語フォント DotGothic16（OFL）を npm パッケージで同梱していた。同梱すると、日本語の字を含むフォントのファイル（分割されたもの）を事前キャッシュに入れることになり、実行時の依存も 1 つ増える。オーナーは、端末のフォントを使うと決めた（2026-10-26）。

## 決定

- フォントは **端末のものを使う**。Web フォントのファイルを同梱しない・外部から読み込まない。
- 文字の指定（全体で共通、CSS 変数 `--wiz-font`）：`"MS Gothic", "Osaka-Mono", "Noto Sans Mono CJK JP", ui-monospace, "SF Mono", Menlo, Consolas, monospace`。
- 数字には `font-variant-numeric: tabular-nums` を付け、3 桁右揃えの桁をそろえる。
- 成果物の検査（`check-dist`）で、Web フォントのファイル（`.woff`・`.woff2`・`.ttf`・`.otf`）が `dist/` にないことを確かめる。

## 検討した選択肢

| 選択肢 | 良い点 | 悪い点 |
| --- | --- | --- |
| **A. 端末のフォント（採用。オーナーの決定）** | 実行時の依存がない（参照プロジェクトと同じ）。事前キャッシュが小さい | 端末で字形が変わる。iPhone には日本語の等幅フォントがなく、かな・漢字はヒラギノ（等幅でない）で出る |
| B. DotGothic16 を同梱（元の WIZ） | どの端末でも同じ、ドット風の見た目 | 依存とキャッシュが増える |

## 結果

- 字の幅に頼った配置（全角の字数で枠を合わせるなど）をしない。ステータスの桁そろえは数字と半角スペースだけで行う。
- 見え方（読みやすさ・桁・ウィンドウの見出し）は、03 の試作で iPhone・Android の実機で確かめる。
- E2E でも字の幅に頼るテストは書かない。
