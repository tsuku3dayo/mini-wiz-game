---
id: MWIZ-TD-0001
type: Technical Design
title: 詳細設計 全体（層・モジュール・依存・起動・エラーの流れ）
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-SA-0001（v1.0）
  - MWIZ-TS-0001（v1.1）
  - MWIZ-ADR-0003（v1.0）
  - MWIZ-ADR-0004（v1.0）
  - MWIZ-ADR-0005（v1.0）
  - MWIZ-ADR-0011（v1.0）
  - docs/specification-ja.md (v1.2) §11.1、§19.4、§20、§22.3、§27.2
verified: null
---

# TD-0001 詳細設計 全体

詳細設計は 5 つに分ける。仕様書 v1.2 の第 2 部（§17〜§32）がファイル名・関数名・設定の値まで決めているので、ここでは **どのモジュールが何を受け持つか** と、**仕様書が決めていないことの決定**、**v1.2 の画面の配置の作り方** だけを書く。値・文言・乱数の順は仕様書を正とし、ここに写さない。

| ID | 範囲 |
| --- | --- |
| TD-0001（これ） | 層・モジュール・依存の向き・起動・エラーの流れ・決まり |
| [TD-0002](MWIZ-TD-0002-technical-design-ja.md) | ルール（`src/domain/`）・表示の計算（`src/logic/`）・ゲーム API（`src/api/`）・保存（`src/platform/storage.ts`） |
| [TD-0003](MWIZ-TD-0003-technical-design-ja.md) | 画面の共通の仕組み（ストア・ルーター・操作の流れ・メッセージ・演出・共通部品・画面の大きさへの合わせ方） |
| [TD-0004](MWIZ-TD-0004-technical-design-ja.md) | 各画面の作り（タイトル〜入れ替え、そうび・もちもの・ステータス）と、画面設計（GUI）との対応 |
| [TD-0005](MWIZ-TD-0005-technical-design-ja.md) | 音（効果音・BGM）・PWA・テスト用の入口・ビルドと CI |

## 1. 層と依存の向き

仕様書 §20.2 のとおり。ESLint の `no-restricted-imports` で強制する（仕様書 §19.4、ADR-0003）。

```
src/main.ts ──▶ src/ui ──▶ src/api ──▶ src/domain
                  │  │         │            ▲
                  │  │         └──▶ src/platform/storage（作るときに渡される）
                  │  └──▶ src/logic ──────────┘（domain と api/types だけ）
                  └──▶ src/audio ──▶ src/logic（bgm-scene・bgm-tracks）
```

| 層 | import してよいもの | してはいけないもの |
| --- | --- | --- |
| `src/domain/` | `src/domain/` | ほかのすべて。DOM・`Math.random`・`Date`・`localStorage` |
| `src/logic/` | `src/domain/`、`src/api/types.ts` | `src/ui`・`src/audio`・`src/platform`・`src/api`（types 以外） |
| `src/api/` | `src/domain/`、`src/api/` | `src/ui`・`src/audio`・DOM。保存・乱数・時刻は `createGameApi(deps)` で受け取る |
| `src/ui/` | `src/api/`（`createGameApi` を除く。型と `GameApi` の型だけ）、`src/logic/`、`src/audio/`、`src/platform/`（pwa・install） | `src/domain/` |
| `src/audio/` | `src/logic/`（bgm-scene・bgm-notation・bgm-tracks）、`src/platform/storage.ts` | `src/domain/`、`src/ui/` |
| `src/platform/` | `src/domain/rng.ts`（`MathRandomRng` が `Rng` を満たすため） | `src/ui/`・`src/api/` |
| `src/main.ts` | すべて（組み立てる所） | — |

- **画面層はゲームの値を計算しない**（ADR-0004、仕様書 §11.1）。例外は仕様書が許す装備画面の変化の足し算（`logic/stat-diff.ts`）だけ。
- `src/ui/` が `src/domain/` を使いたくなったら、`src/logic/` に表示の計算として置く（例：名前の規則は `logic/name.ts` が `domain/character.ts` を包む）。

## 2. モジュール

ファイルの一覧と役割は仕様書 §20.1・§20.3 のとおり（このリポジトリで新しく足すファイルはない）。v1.2 の画面の配置のために、次の関数を既存のファイルに足す（TD-0003・TD-0004）。

| ファイル | 足すもの | 理由 |
| --- | --- | --- |
| `ui/dom.ts` | `isWide()`・`isFinePointer()`・`onWideChange(cb)`（`matchMedia` の薄い包み） | 狭い画面と広い画面で、DOM の中身（部品の有無・並び）が変わる所があるため（TD-0003 §5） |
| `ui/components/first-person-view.ts` | `setWidth(px)` | 疑似3D を画面の高さに合わせて縮める（TD-0003 §6） |
| `ui/components/auto-map.ts` | `setSize(px)` | 広い画面で地図を大きくする（TD-0003 §6） |
| `ui/components/status-screen.ts` | `recordsWindow(records)` を export | 広い画面の宿屋とステータス画面で同じ「じっせき」のウィンドウを使う（TD-0004 §3） |
| `ui/components/message-log.ts` | 設定 `rows`（5／6／7） | メッセージ欄の行数が画面で変わる（TD-0003 §3） |
| `ui/components/game-frame.ts` | 設定 `hideNameOnNarrow` | ダンジョン・戦闘の狭い画面で画面名を隠す（仕様書 §11.3） |

## 3. 起動

仕様書 §27.2 の 1〜9 の順。`main.ts` は組み立てだけを行い、判断を持たない。

```ts
// main.ts の骨組み（説明用）
import './ui/theme.css'; import './ui/style.css';
const storage = createLocalStorage(APP_ID);          // platform/storage
storage.migrateStorage(); requestPersist();
const debug = new URLSearchParams(location.search).has('debug');
const rng = debug ? new SwappableRng(new MathRandomRng()) : new MathRandomRng();
const api = createGameApi({ storage, rng, now: clock.nowIso });
const sound = createSoundSetting(storage);           // audio/sound-setting
const store = createStore(api);                       // ui/store（getGame・getSave を読み始める）
const queue = createMessageQueue({ reducedMotion, sound });
mountLowHpFrame(store); mountEffectLayer(queue); createBgmDirector({ store, queue, sound, router });
const router = createRouter({ store, queue, api, sound });
router.start();
registerPwa(); prepareInstall();                      // 本番のビルドだけ（import.meta.env.PROD）
if (debug) attachDebug({ api, rng, store, storage });  // ui/debug（仕様書 §28）
window.__appStarted = true;
```

- 例外が起動の途中で出たら、`__appStarted` を立てない（`public/boot.js` が 8 秒後に復旧する。仕様書 §30.4）。

## 4. エラーの流れ

| どこで | 何が起きる | どう返す・どう見せる |
| --- | --- | --- |
| `src/domain/` | ルール違反（場所が違う・MP 不足など） | `DomainError` の派生（`code`・`status`）を投げる（仕様書 §24.1） |
| `src/api/validate.ts` | 引数の違反 | `ValidationError`（400） |
| `src/api/game-api.ts` の外側 | 上の 2 つ | `GameError { status, error, message, details? }` で reject（仕様書 §22.3） |
| 同上 | 保存の失敗 | `storage_error`（500） |
| 同上 | それ以外の例外 | `internal_error`（500） |
| `src/ui/command.ts` | `GameError` を受ける | 400（名前入力）→ TextInput、409 `rule_violation` → メッセージ欄（danger）、ほかの 4xx → メッセージ欄と取り直し、500 → ErrorPanel（仕様書 §11.9） |
| `src/audio/`・`src/platform/` | どんな失敗でも | 外に投げない（`try/catch` で握る。戻り値で失敗を返す） |

## 5. 書き方の決まり

- TypeScript の `strict`。`any` を使わない（`unknown` で受けて絞る）。
- DOM は `ui/dom.ts` の `el()` で作り、文字は `textContent` だけで入れる（`innerHTML` を使わない）。
- 部品は `{ el, update(next), destroy() }` を返す関数（仕様書 §27.5）。`destroy()` でタイマー・イベントの受け手を外す。
- 時刻・乱数・保存は引数で受け取る（テストで偽物を渡すため）。
- 色は CSS 変数（`--wiz-color-*`）で指定する。部品に Hex を書かない。
- テストの名前の先頭に確認 ID（`TC-0000-00`）を付ける（仕様書 §29.7）。確認 ID は 05 テストで決める。

## 6. 上流との整合（03 → 04）

| 確かめること | 結果 |
| --- | --- |
| GUI の部品・状態・メッセージを、どのモジュールで作るか決まっている | TD-0004 §9 の表 |
| ADR の決定に反する設計がない | 層（ADR-0003）・ゲーム API が正（ADR-0004）・DOM と SVG（ADR-0005）・保存（ADR-0006・0007）・音（ADR-0008）・更新と復旧（ADR-0009）・端末のフォント（ADR-0010）・テストの置き場所（ADR-0011）・スマートフォン最優先（ADR-0012）のとおり。反するものはない |
| 仕様書の第 2 部と違う作り | ない（§2 の関数を既存のファイルに足すだけ） |
