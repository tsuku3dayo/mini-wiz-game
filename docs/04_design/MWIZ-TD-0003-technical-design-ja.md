---
id: MWIZ-TD-0003
type: Technical Design
title: 詳細設計 画面の共通の仕組み（ストア・ルーター・操作の流れ・メッセージ・部品・画面の大きさへの合わせ方）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-TD-0001（v1.0）
  - MWIZ-GUI-0001（v1.1）
  - MWIZ-ADR-0005（v1.0）
  - MWIZ-ADR-0012（v1.1）
  - docs/specification-ja.md (v1.2) §11.1〜§11.11、§27
verified: null
---

# TD-0003 画面の共通の仕組み

振る舞いの細部（文言・時間・色）は仕様書 §11 を正とする。ここでは、画面層のモジュールの分担と、仕様書 v1.2 で決めた配置（GUI-0001〜0007）の作り方を決める。

## 1. ストア・ルーター・操作の流れ

| モジュール | 持つもの | 決まり |
| --- | --- | --- |
| `ui/store.ts` | `game`・`save`（仕様書 §27.3）、`subscribe(listener)` | メッセージは持たない。値が変わったら購読者に知らせる |
| `ui/router.ts` | 今の画面・LocationGuard・`hashchange` | 画面を替える手順は仕様書 §27.4 の 1〜5。遷移の保留中（`queue.holdNavigation`）は替えない。替えるときは前の画面の `destroy()` を呼ぶ |
| `ui/command.ts` | `run`・`isPending`・`locked`・`fatal`・`retry` | 仕様書 §11.10。成功時の扱い（遭遇なら `queue.clear()` と遭遇の音 → 足元の案内を足して enqueue → `store.setGame`）。失敗時は TD-0001 §4 |

- `body[data-screen]`・`body[data-location]`・`body[data-busy]` はルーターと `command` が書く（仕様書 §28）。

## 2. 画面の作り

- 各画面（`ui/screens/*.ts`）は `mount(root, ctx)` で作り、`{ destroy() }` を返す。`ctx` は `{ store, api, command, queue, sound, router }`。
- 画面に固有の状態（カーソル・確認の開閉・メニュー／そうび／もちもの／ステータスのどれを出しているか・しぼりこみ・入れ替えの段階）は、画面のモジュールの中の変数に持つ（仕様書 §27.5）。
- ストアが変わったら、画面は **変わった部品だけ** `update()` する（作り直すのは、そうび／もちもの／ステータスの切り替えと、狭い画面⇔広い画面の切り替えのとき）。

## 3. メッセージ（`ui/message-queue.ts`・`components/message-log.ts`）

- キューは `lines`（最新 7 行。`logic/message-plan.ts` の `MAX_LINES`）・`pending`・`busy`・`holdNavigation`・`activeEffect` を持つ（仕様書 §11.8）。
- メッセージ欄は `messageLog({ rows })` で作る。**`rows` はメッセージ欄が出す行数**で、画面が渡す：

| 画面 | 狭い画面 | 広い画面 |
| --- | --- | --- |
| ダンジョン | 5 | 6 |
| 戦闘 | 5 | 7 |
| 名前入力・宿屋・ゲームクリア・入れ替え | 5 | 5 |

- メッセージ欄は `lines` の最新 `rows` 行を出す。高さは CSS で固定（`height: calc(var(--rows) * 1.6em); overflow: hidden`。`--rows` を部品の style に入れる）。
- 折り返しで枠に入りきらないときは、描いたあとに `scrollHeight > clientHeight` の間、いちばん古い行の要素を消す（新しい行をいつも見せる。GUI-0001 §4.2）。
- メッセージ欄のない画面（タイトル・そうび・もちもの・ステータス）でも、キューは動く。結果の文は `lines` にたまり、メッセージ欄のある画面に戻ったときに出る（仕様書 §11.7）。

## 4. 共通部品（`ui/components/`）

仕様書 §27.5 の形（`{ el, update, destroy }`）。v1.2 で設定を足すものだけ書く。

| 部品 | 設定（v1.2 で足すもの） | 仕様書 |
| --- | --- | --- |
| `game-frame` | `hideNameOnNarrow`（ダンジョン・戦闘。画面名の `<h1>` に visuallyHidden の class を、狭い画面でだけ効かせる） | §11.3、§11.11 |
| `game-window` | `compact`（1 行のステータス用。狭い画面で見出しの下の余白を上 8px・下 6px にする class） | §11.3、§11.6 |
| `command-menu` | なし（行の高さは CSS。§5） | §11.4 |
| `message-log` | `rows` | §11.8 |
| `status-panel` | `variant: 'full' \| 'compact'`、`title`（full の見出し。狭い画面は名前、広い画面は「ステータス」と「なまえ」の行）。compact は常に見出し「ステータス」の 1 行 | §11.6 |
| `status-screen` | `recordsWindow(records)` を export（宿屋の広い画面でも使う） | §11.7 |
| `first-person-view` | `setWidth(px)` | §11.5 |
| `auto-map` | `setSize(px)`（正方形。狭い画面では呼ばない） | §11.5 |
| `move-pad` | なし（大きさは置かれた場所の CSS で決まる） | §11.5 |
| `item-list` | `maxHeight`（狭い画面で、画面に合わせて画面が渡す） | §11.7 |
| `enemy-image` | なし（256×256 を 256px で出す。読めなければ消す） | §13.2 |
| `error-panel` | なし（置き場所は画面が決める。TD-0004） | §11.9 |

## 5. 狭い画面と広い画面（CSS と `ui/dom.ts`）

| 区別 | 作り |
| --- | --- |
| 広い画面 | CSS は `@media (min-width: 600px)`。JS は `ui/dom.ts` の `isWide()`（`matchMedia('(min-width: 600px)')`） |
| マウスで操作する画面 | CSS だけ：`@media (min-width: 600px) and (pointer: fine)` でメニューの行を詰める（最小の高さなし・上下余白 0・フォーカスリングなし）。JS では使わない |

- **CSS で済むもの**（並び・余白・2 カラム・行の高さ・敵の絵の大きさ）は CSS だけで作る。
- **DOM の中身が変わるもの** は、画面が `isWide()` を見て作る：

| 画面 | 狭い画面 | 広い画面 |
| --- | --- | --- |
| 宿屋 | ステータス → メッセージ欄 → コマンド | 上：ステータス｜じっせき、下：メッセージ欄｜コマンド |
| ダンジョン | 階と向き → 疑似3D → メッセージ欄 → ステータス → ［地図｜移動ボタン］ → 操作の行 | 上：［階と向き・疑似3D］｜地図、下：メッセージ欄｜［ステータス・移動ボタンと階段・メニュー］ |
| 戦闘 | 敵 → メッセージ欄 → ステータス → コマンド | 敵、下：メッセージ欄｜［ステータス・コマンド］ |
| GameMenu | 「ステータス」あり | 「ステータス」なし |
| メッセージ欄の行数 | §3 の表 | §3 の表 |

- 画面は `onWideChange(cb)` で境目（600px）をまたいだことを受け、自分を作り直す（画面に固有の状態は残す）。ブラウザの幅を変えたときと、タブレットを回したときに起きる。
- 600px の境目をまたがない大きさの変化は、§6 の「合わせ方」だけをやり直す。

## 6. 画面の大きさへの合わせ方（`fit`）

ページが縦にはみ出すときに、縮めてよい部品を縮める。ダンジョンと、もちもの（狭い画面）だけで行う。

```
fitDungeon(screen)          … 描いた直後・resize（requestAnimationFrame で 1 回にまとめる）・メッセージ欄を差し替えたあと
  狭い画面：
    fpv.setWidth(min(320, 使える幅))
    over = documentElement.scrollHeight − innerHeight
    over > 0 なら fpv.setWidth(max(130, fpv の高さ − over) × 4/3)
  広い画面：
    map.setSize(176)
    fpv.setWidth(上の段の幅 − (176 + 地図の枠) − 8)
    over > 0 なら fpv を上と同じく縮める
    残り = min(上の段の幅 − fpv の幅 − 8, 上の段の左の高さ) − 地図の枠
    map.setSize(max(176, floor(残り × 0.9)))
    地図の下の余白 = max(0, floor((fpv の高さ − 地図の外の高さ) / 2))   … 縦の中心をそろえる
fitItemList(screen)         … 狭い画面だけ
  list.maxHeight = 9999 → over を測る → max(4 行分, 一覧の高さ − over)
```

- 値は GUI-0001 §7・GUI-0004 §1.3 で試作を測って決めたもの（仕様書 §11.5・§15.4）。
- `resize` は `window` で受け、画面の `destroy()` で外す。

## 7. キー・フォーカス・タッチ

- 矢印キー（ダンジョン）・Enter／Space のスキップ（メッセージ）は `window` で受ける（仕様書 §11.5・§11.8）。**入力欄（`input`・`textarea`）から来たキーと、IME の変換中（`isComposing`）のキーは捨てる**（名前入力で誤って動かないように）。
- 初めのフォーカスは各画面の CommandMenu の `autoFocus`（仕様書 §27.4 の 4）。
- 操作する場所（ボタン・メニュー・メッセージ欄）は `touch-action: manipulation` と `-webkit-tap-highlight-color: transparent`。長押しの選択は `user-select: none`。ページの拡大は禁止しない（仕様書 §11.11）。

## 8. 演出・体力わずかの枠・点滅

仕様書 §11.8 のとおり。`components/effect-layer.ts`（キューの `activeEffect` を見る）、`components/low-hp-frame.ts`（ストアの HP を見て `#app` に CSS 変数を入れる）、`ui/effects.ts`（200ms の点滅）。

## 9. テストのしかた

- 部品・画面は E2E（Playwright）で確かめる。単体テストは `src/logic/` だけ（DOM を使わない。ADR-0011）。
- 大きさの確かめ：E2E の各プロジェクト（`pixel7`・`small`・`desktop`）に加え、該当のテストの中で `page.setViewportSize` により **414 × 715（iPhone 11 の Safari）** と **1366 × 657** にして、`documentElement.scrollHeight − innerHeight` が 0 であること・横にはみ出さないことを確かめる（GUI-0001 §7 で測ったやり方）。
- 文字の幅に頼らない。行の高さ（25.6px／44px）と、ウィンドウの間（8px）は `getBoundingClientRect` で確かめる。
