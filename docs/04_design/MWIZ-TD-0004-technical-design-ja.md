---
id: MWIZ-TD-0004
type: Technical Design
title: 詳細設計 各画面の作り（画面設計との対応）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-TD-0003（v1.0）
  - MWIZ-GUI-0001（v1.1）
  - MWIZ-GUI-0002（v1.0）
  - MWIZ-GUI-0003（v1.0）
  - MWIZ-GUI-0004（v1.0）
  - MWIZ-GUI-0005（v1.1）
  - MWIZ-GUI-0006（v1.0）
  - MWIZ-GUI-0007（v1.0）
  - docs/specification-ja.md (v1.2) §11.2、§11.4〜§11.9、§11.12、§13.2
verified: null
---

# TD-0004 各画面の作り

各画面の部品・並び・操作。文言と振る舞いは仕様書 §11.5〜§11.7、配置は GUI-0002〜0007 を正とする。共通の仕組み（狭い／広い画面、`fit`、メッセージ欄の行数）は TD-0003。

## 1. タイトル（`ui/screens/title.ts`、`#/`）

- 部品：飾り線・「WIZ」・副題・`commandMenu`（タイトル）・［`install` ボタン｜版］。**メッセージ欄は作らない**。
- 「つづきから」が無効のとき、`onDisabledSelect` を渡さない（選んでも何も出さない）。
- 「おと」は `sound.toggle()` のあと、項目の文字だけを変える（`commandMenu.update`）。メッセージは出さない。
- エラー：メニューを無効にし、メニューの下に `errorPanel`。
- 外枠は `title-main`（縦の中央。GameFrame を使わない）。

## 2. 名前入力（`ui/screens/name-entry.ts`、`#/new`）

- 部品：`gameFrame`（なまえ）→ `gameWindow`［案内・`textInput`・`commandMenu`（もどる／決定）］→ `messageLog({ rows: 5 })`。
- 入力欄と「決定」を上に置き、ソフトウェアキーボードで隠れないようにする（下端に寄せない）。
- エラー：400 は `textInput` のエラー、500 はメッセージ欄の場所に `errorPanel`。

## 3. 宿屋（`ui/screens/inn.ts`、`#/inn`）

| 画面 | 並び |
| --- | --- |
| 狭い画面 | `statusPanel(full, 見出し=名前)` → `messageLog(5)` → 操作の場所 |
| 広い画面 | 2 段×2 カラム（各段で高さをそろえる）。上：`statusPanel(full, 見出し=ステータス＋なまえ行)`｜`recordsWindow`。下：`messageLog(5)`｜操作の場所 |

- **操作の場所** は 1 つの入れ物で、中身を替える：宿屋の `commandMenu` ／ `gameMenu`（宿屋）／ `confirmMenu`（タイトルへ戻る）／ `errorPanel`。
- そうび・もちもの・ステータス（狭い画面だけ）は、画面全体の中身を差し替える（§7）。閉じたら作り直し、カーソルを「メニュー」に戻す。

## 4. ダンジョン（`ui/screens/dungeon.ts`、`#/dungeon`）

| 画面 | 並び |
| --- | --- |
| 狭い画面 | `gameFrame(hideNameOnNarrow)` → `locationLabel` → `firstPersonView` → `messageLog(5)` → `statusPanel(compact)` → ［`autoMap`｜`movePad`］→ 操作の行［`stairsButton`｜`gameMenuButton`］ |
| 広い画面 | 上：［`locationLabel`・`firstPersonView`］｜`autoMap`。下：`messageLog(6)`｜［`statusPanel(compact)`・［`movePad`｜［`stairsButton`／`gameMenuButton`］］］ |

- **操作の場所**（狭い画面：地図と移動ボタン・操作の行／広い画面：右下のボタン）は、メニューを開くと `gameMenu`（ダンジョン）に替える。広い画面では地図を残す。
- 矢印キーは `window` で受ける（TD-0003 §7）。操作できないとき・メニューを開いているときは捨てる。
- 描いたあと・大きさが変わったとき・メッセージ欄を替えたときに `fitDungeon`（TD-0003 §6）。
- 遷移の保留中は、直前の視界と地図を出し続ける（画面が最後の値を持つ）。
- 壁にぶつかったら `ui/effects.ts` で段 0 の正面の壁を 200ms 点滅。

## 5. 戦闘（`ui/screens/battle.ts`、`#/battle`）

| 画面 | 並び |
| --- | --- |
| 狭い画面 | `gameFrame(hideNameOnNarrow)` → 敵のウィンドウ［`enemyImage`（256px）・敵の名前］→ `messageLog(5)` → `statusPanel(compact)` → `gameWindow`（コマンド）［`commandMenu`］ |
| 広い画面 | 敵のウィンドウ、下：`messageLog(7)`｜［`statusPanel(compact)`・コマンド］ |

- 敵の種類が変わったら `enemyImage` を作り直す。遷移の保留中は直前の敵を出し続ける。
- ダメージの行で HP の値を 200ms 点滅（`ui/effects.ts`）。
- iPhone 11 の Safari（414 × 715）で 1 画面に収まる高さ（714px）は、敵の絵と名前の間 0・名前の行の高さ 1.1・1 行のステータスの余白（上 8・下 6）で作る（GUI-0001 §7.4）。

## 6. ゲームクリア・入れ替え

| 画面 | モジュール | 並び |
| --- | --- | --- |
| ゲームクリア（`#/clear`） | `ui/screens/clear.ts` | 縦の中央。見出し → クリアの文のウィンドウ → `messageLog(5)` → `commandMenu`（宿屋へ） |
| 入れ替え（`#/swap`） | `ui/screens/swap.ts` | `gameFrame`（いれかえ）→ ウィンドウ（もちものが いっぱいだ）［おちている：ItemLabel・段階ごとの中身（2 択／`itemList`／確認）］→ `messageLog(5)`（ドロップの行を読むので残す） |

## 7. そうび・もちもの・ステータス（宿屋・ダンジョンの中）

| 画面 | 部品 | 並び |
| --- | --- | --- |
| そうび | `equipmentPanel`（枠の一覧／候補の一覧 と のうりょく） | 広い画面は 2 カラム、狭い画面は縦。**メッセージ欄なし** |
| もちもの | `inventoryPanel`（`itemList`・捨てる確認） | 狭い画面は `fitItemList`（TD-0003 §6）。**メッセージ欄なし** |
| ステータス（狭い画面だけ） | `statusPanel(full)`・`recordsWindow`・`commandMenu`（もどる） | 縦。**メッセージ欄なし** |

- 付け替え・はずす・捨てるの結果の文は `queue.enqueue` する（元の画面に戻ると見える。仕様書 §11.7）。
- エラー：その画面の一番下に `errorPanel`（仕様書 §11.9）。
- 広い画面へ切り替わったときにステータス画面を出していたら、宿屋（またはダンジョン）の画面に戻す。

## 8. PWA の画面部品

| 部品 | 置き場所 | 仕様書 |
| --- | --- | --- |
| `update-banner` | `#update-banner`、画面の上端に固定。タイトル・宿屋の画面のときだけ出す | §11.12、§30.3 |
| `install-dialog` | `dialog#install-dialog`。タイトルの「インストール」で開く | §11.12、§30.2 |
| 起動の失敗 | `#boot-error`（`public/boot.js` が出す） | §30.4 |

## 9. 画面設計（GUI）との対応（03 → 04 の確かめ）

| GUI | 部品・状態・メッセージ | モジュール |
| --- | --- | --- |
| GUI-0001 §2 配置の決まり | 上から詰める・ウィンドウの間 8px・最大幅 800px・安全領域 | `ui/style.css`（GameFrame・`.cols`） |
| GUI-0001 §3 デザイン | 色・文字・二重線・ボタン・フォーカスリング | `ui/theme.css`・`ui/style.css`・`game-window` |
| GUI-0001 §4.1 コマンドメニュー | 1 行 44px／マウスの画面 25.6px・カーソル・無効の理由 | `command-menu`・`logic/menu-model.ts`・`ui/style.css` |
| GUI-0001 §4.2 メッセージ欄 | 行数 5／6／7・高さ固定・古い行を消す・▼ | `message-log`・`ui/message-queue.ts`・`logic/message-plan.ts` |
| GUI-0001 §4.3 確認 | かくにん・いいえが初め・Esc | `confirm-menu` |
| GUI-0001 §4.4 ステータス | full／1 行・見出し「ステータス」・HP の警告 | `status-panel`・`logic/low-hp.ts` |
| GUI-0001 §4.5 ErrorPanel | きろくを よみかき できません・再試行 | `error-panel`・`ui/command.ts` |
| GUI-0001 §5 画面遷移 | ハッシュ・LocationGuard | `ui/router.ts` |
| GUI-0002 §1 タイトル | メニュー・インストール・版・メッセージ欄なし | `screens/title.ts`・`install-dialog`・`logic/version.ts` |
| GUI-0002 §2 名前入力 | 入力欄・文字数・規則の文 | `screens/name-entry.ts`・`text-input`・`logic/name.ts` |
| GUI-0003 §1 宿屋 | 狭い／広い（実績つき）・タイトルへ戻るの確認 | `screens/inn.ts`・`status-screen`（`recordsWindow`） |
| GUI-0003 §2 メニュー | 操作の場所に出す・広い画面は「ステータス」なし | `game-menu` |
| GUI-0003 §3 ステータス画面 | 狭い画面だけ・メッセージ欄なし | `status-screen` |
| GUI-0004 ダンジョン | 階と向き・疑似3D（縮める）・地図（広い画面で大きく・中心をそろえる）・移動ボタン・階段・メニュー | `screens/dungeon.ts`・`location-label`・`first-person-view`・`auto-map`・`move-pad`・`stairs-button`・`logic/view-to-segments.ts`・`logic/map-to-shapes.ts`・`logic/describe-view.ts`・`logic/arrival.ts` |
| GUI-0005 §1 戦闘 | 敵の絵 256px・並び・コマンド・ダメージの点滅 | `screens/battle.ts`・`enemy-image`・`logic/enemy-image.ts`・`ui/effects.ts` |
| GUI-0005 §2 ゲームクリア | 見出しの演出・クリアの文 | `screens/clear.ts`・`effect-layer` |
| GUI-0006 そうび・もちもの・入れ替え | 一覧・並び順・変化・しぼりこみ・確認 | `equipment-panel`・`inventory-panel`・`item-list`・`item-label`・`screens/swap.ts`・`logic/item-text.ts`・`logic/sort-items.ts`・`logic/stat-diff.ts` |
| GUI-0007 §1 演出 | levelUp・rareDrop・bossAppear・bossDefeat・clear・体力わずかの枠 | `effect-layer`・`low-hp-frame`・`ui/message-queue.ts` |
| GUI-0007 §2〜§5 | 更新の帯・インストールの案内・ErrorPanel・起動の失敗 | `update-banner`・`install-dialog`・`error-panel`・`public/boot.js` |

GUI の要素で、受け持つモジュールのないものはない。
