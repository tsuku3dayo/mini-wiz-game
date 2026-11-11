---
id: MWIZ-TASK-0036
type: Implementation Task
title: 画面：宿屋のメニューの並び・狭い画面の戦闘のボタン
status: stable
version: 1.0
updated: 2026-11-11
sources:
  - MWIZ-WS-0019（v1.0）
  - MWIZ-TC-0008（v1.1）
  - MWIZ-TC-0010（v1.1）
  - MWIZ-TC-0019（v1.2）
  - MWIZ-TC-0035（v1.2）
  - MWIZ-TD-0003（v1.5）
  - MWIZ-TD-0004（v1.6）
verified: null
---

# TASK-0036 画面：宿屋のメニューの並び・狭い画面の戦闘のボタン

- WS：[WS-0019](MWIZ-WS-0019-workstream-ja.md)
- ブランチ：`feat/TASK-0036-inn-order-battle-buttons`
- 実施記録：AC-0036（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0035

## やること

- `src/ui/screens/inn.ts`：宿屋の項目を やすむ／メニュー／ダンジョンへ／セーブ／タイトルへ戻る の順に。閉じたあとのカーソル（メニュー 1・タイトルへ戻る 4）。この TASK では「セーブ」はいまの動き（`api.save()`）のまま（TASK-0037 でスロットの一覧に替える）
- `src/ui/components/command-buttons.ts`（新しく）：狭い画面の戦闘のボタン（TD-0003 §4）。カーソルの動きは `logic/menu-model.ts` を使う
- `src/ui/screens/battle.ts`：狭い画面は `commandButtons`、広い画面は `commandMenu`。`onWideChange` で作り直す（TD-0004 §5）
- `src/ui/style.css`：`.command-buttons`（`grid-template-columns: 2fr 1fr 1fr`、間 8px、高さ 56px、選んでいるボタンは secondary の枠と文字）
- テスト：下の表。宿屋の並び・戦闘のメニューの形に頼っている E2E（`e2e/helpers.ts` の操作の道具を含む）を直す
- スクリーンショット：375 × 667・414 × 715・1280 × 800 で宿屋と戦闘（MP 不足・ボス戦の無効のボタンも）。戦闘画面の高さを測り、GUI-0005 §1.1 の「画面の高さ」の行を直す（測った値を書くだけなので版は上げない。値が設計の見込みと大きく違えば相談する）

## 対象の確認 ID（7 個：新しく 3・直す 4）

| 置き場所 | 確認 ID |
| --- | --- |
| `e2e/inn.spec.ts` | TC-0008-01 |
| `e2e/menu.spec.ts` | TC-0010-02・03 |
| `e2e/battle.spec.ts` | TC-0019-01・14（新しく）・15（新しく） |
| `e2e/layout.spec.ts` | TC-0035-13（新しく） |

- TC-0011-07（逐次表示の間の二重押し）・TC-0037-02（「たたかう」からの時間）・TC-0035-02〜04・12（はみ出し）は、テストの名前・中身を変えずに、ボタンの形でも通ることを確かめる。

## 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0036（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
