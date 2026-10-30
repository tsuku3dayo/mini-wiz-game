# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

ブラウザで遊ぶ 1 人用のダンジョン探索 RPG「WIZ ～死霊術師の迷宮～」（PWA、サーバーなし）。仕様は `docs/specification-ja.md`、目的・範囲は `docs/00_brief/MWIZ-PB-0001-project-brief-ja.md`。

## 基本方針

- ユーザー向けの文言・説明・成果物は日本語。
- 技術構成と共通ルールは `C:\Users\はる\Documents\Git\mini-blockbreaking-game` と同じにする（詳細は 01 システム構成の成果物で決める）。
- 画面はスマートフォンの縦画面での表示を最優先する（仕様書 §1.3・§11.1）。

## 開発フロー

`docs/SDD-PROCESS_v2.md` に沿って進める（2026-10-30 に `docs/workflow.txt` から切り替えた。workflow.txt は、それを根拠にした承認済みの成果物のために残す）。**「承認」の地点では、オーナーが承認するまで次の段階に進まない。** 成果物を作ったら、承認を求めて止まる。

SDD-PROCESS_v2.md は汎用の書き方なので、このリポジトリでは次のように読み替える。食い違うときは CLAUDE.md の決まりを優先する。

- `doc/` → `docs/`、仕様書 `doc/specification.md` → `docs/specification-ja.md`、`<PREFIX>` → `MWIZ`
- 成果物のフォルダ（§3.1 の表）→ 下の「成果物の書式」の表（例：`doc/00-project-brief` → `docs/00_brief/`）
- frontmatter の `type`（§3.2 の `user-story`）→ 下の書式どおり英語の見出し形（`User Story`）

00 project-brief（承認）→ 01 システム構成（承認）→ 02 要件・ユーザーストーリー（承認）→ 03 画面設計（承認）→ 04 詳細設計 → 05 テスト / 06 作業計画（並行）→ 07 実装・自動テスト → 手動テスト → attested-computation（承認）・ふりかえり。07〜attested-computation は WS ごとにくり返し、最後の WS のあとリリース（承認）。完了したら再現開発仕様書（`docs/reproduction-specification.md`）を最新にし、ふりかえりをまとめる。

- 工程ごとのチェックリストは SDD-PROCESS_v2.md §4、整合性チェックは §7、先に確かめておくことは §8。
- ふりかえり（YWT）は WS の終わり・リリース・完了ごとに `docs/retrospectives/` に書く（§9）。T は次の WS の前に SDD-PROCESS_v2.md に反映する。

途中で仕様を変えるときは、`docs/spec-<版>-<内容>` ブランチで依頼を `docs/requests/<日付>-spec-<版>-<内容>.md` に記録（影響の一覧つき）→ 進めるかの承認 → 仕様書の版を上げる → 影響する承認済みの成果物を版上げして再承認 → TD・TC・TST を直し修正用の WS・TASK を足す → 07、の順に進める（SDD-PROCESS_v2.md §2.2・§6）。

## Git の運用

- リポジトリ：https://github.com/tsuku3dayo/mini-wiz-game （公開）。デフォルトブランチは `main`。**`main` に直接コミットしない。**
- コミットメッセージは英語（命令形、1 コミット 1 目的）。
- **成果物は、承認を受けるたびに PR にする。**
  1. 段階ごとに作業ブランチを切る（例：`docs/03-gui-design`。07 の実装は `feat/<TASK 番号>-<内容>`）。
  2. 成果物を `status: review` で作ってコミットし、オーナーに承認を求める。
  3. 承認されたら `status: stable`・`verified` を記入してコミットし、push して PR を作る（本文に成果物の ID・版・承認日時を書く）。
  4. CI があるときは通ったことを確かめてから、オーナーにマージを頼む（マージはオーナーが行う）。
  5. マージされたら、main を pull し、作業ブランチを手元と GitHub から消し、公開の実行と公開 URL を確かめる。
- 公開リポジトリなので、ほかのプロジェクトの社内情報・個人の ID・機密を含むファイルをコミットしない。了承をとっていない人の名前を書かない。

## 成果物の書式

### ID とファイル名

- ID は `MWIZ-<種類>-<4 桁の通し番号>`（例：`MWIZ-US-0001`）。通し番号は種類ごとに 0001 から振り、欠番を再利用しない。
- ファイル名は `<ID>-<種類名>-ja.md`（例：`MWIZ-US-0001-user-story-ja.md`）。
- 仕様書の中に出てくる `WIZ-TC-0125` などは元の WIZ の成果物の番号で、このリポジトリの ID ではない。

| 種類名 | ID の種類 | フォルダ |
| --- | --- | --- |
| project-brief | PB | `docs/00_brief/` |
| system-architecture | SA | `docs/01_architecture/` |
| technology-stack | TS | `docs/01_architecture/` |
| architecture-decision | ADR | `docs/01_architecture/` |
| epic | EP | `docs/02_requirements/` |
| user-story | US | `docs/02_requirements/` |
| gui-design | GUI | `docs/03_gui/` |
| technical-design | TD | `docs/04_design/` |
| test-strategy | TST | `docs/05_test/` |
| test-case | TC | `docs/05_test/` |
| workstream | WS | `docs/06_plan/` |
| implementation-task | TASK | `docs/06_plan/` |
| attested-computation | AC | `docs/07_attested/` |

### frontmatter

```yaml
---
id: MWIZ-US-0001
type: User Story            # 種類名を英語の見出し形で
title: 〜                    # 日本語の短い名前
status: draft               # draft（作成中）→ review（承認待ち）→ stable（承認済み）
version: 1.0
updated: 2026-10-26
sources:                    # 根拠にした成果物の ID と版・資料
  - MWIZ-EP-0001（v1.0）
  - docs/specification-ja.md (v1.1) §2
verified: null              # 承認されたら { by: "tsuku3dayo", at: "<日時（ISO 8601、+09:00）>" }
---
```

- 承認を求めるときは `status: review` にする。オーナー（`tsuku3dayo`）がチャットで承認したら `status: stable` にし、`verified` に承認者 `tsuku3dayo` と承認日時を記入する。
- 承認後に中身を変えるときは `version` を上げ、`status` を `review` に戻して再承認を受ける。
- 承認のない段階（04・05・06）の成果物は、書き終えたら `status: stable`・`verified: null` にし、段階ごとに PR を作ってマージする。

### attested-computation

- implementation-task（何をやるか）・test-case（どう確かめるか）に対する「実際にやって確かめた結果」。
- 本文：実施概要（タスク・実施者・環境）／確認結果（テストケースの手順ごと）／**確認できなかったこと**（正直に書く）／後片付け／完了定義のチェックリスト。
- `sources` に対応する TASK と TC の ID を書く。
- AC の番号は TASK と同じにする（TASK-0004 の記録は AC-0004）。`draft` で作って自動テストの結果を書き、**タスクの PR に一緒に入れる**。WS の終わりに手動テストの結果を足して `review` にし、オーナーの承認を受ける。

## 07 実装の進め方

- 作業計画（`docs/06_plan/`）の TASK の順に進める。タスクごとに `feat/<TASK 番号>-<内容>` ブランチ → PR → CI が緑 → マージ（main へのマージ = 公開）。
- テストの名前の先頭にテストケースの確認 ID（例：`TC-0002-03`）を付ける。
- PR の前に `npm run verify` と `npm run test:e2e` を手元で通し、画面の変更は PC と一番小さいスマートフォンの幅でスクリーンショットを見て確かめる。
