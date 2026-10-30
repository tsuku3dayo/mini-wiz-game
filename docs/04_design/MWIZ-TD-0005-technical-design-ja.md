---
id: MWIZ-TD-0005
type: Technical Design
title: 詳細設計 音・PWA・テスト用の入口・ビルドと CI
status: stable
version: 1.1
updated: 2026-10-30
sources:
  - MWIZ-TD-0001（v1.0）
  - MWIZ-TS-0001（v1.1）
  - MWIZ-ADR-0008（v1.0）
  - MWIZ-ADR-0009（v1.1）
  - MWIZ-ADR-0011（v1.0）
  - docs/specification-ja.md (v1.2) §12、§19、§25、§26、§28〜§30
verified: null
---

# TD-0005 音・PWA・テスト用の入口・ビルドと CI

音色・曲データ・設定の値は仕様書 §25・§26・§19・§30 を正とする。ここでは、モジュールの分担と、画面層とのつなぎ方を決める。

## 1. 音（`src/audio/`）

| モジュール | 受け持ち | つなぎ方 |
| --- | --- | --- |
| `sound-setting.ts` | オン／オフ（`mini-wiz-game-sound`、初期オフ）、`toggle()`、`subscribe` | タイトルのメニュー・GameMenu の「おと」が呼ぶ。オンにした瞬間に `toggle` の音 |
| `sound.ts` | 効果音 8 種の合成（仕様書 §25）、`play(name)`・`stop()`、自動再生の制限への対処（最初の入力で `resume`） | `ui/command.ts`（遭遇）と `ui/message-queue.ts`（演出の開始・終了）が呼ぶ。鳴らす判断のたびに `app:sound` イベント |
| `bgm.ts` | FM 合成の再生エンジン（仕様書 §26.2〜§26.6）、ダッキング・フェード | `bgm-director.ts` だけが呼ぶ |
| `bgm-director.ts` | 場面（パス・状態・演出）から曲を決め、変わったときだけ替える（仕様書 §26.7）。替えたら `app:bgm` イベント | ストア・ルーター・キュー・音の設定を購読する。LocationGuard の外に置き、エラーの画面でも止めない |

- 曲の選び方は `logic/bgm-scene.ts`、記譜と曲データは `logic/bgm-notation.ts`・`logic/bgm-tracks.ts`（純粋関数とデータ）。
- どの関数も例外を外に出さない（Web Audio がなくても遊べる）。
- テスト：`tests/audio/` で `tests/helpers/fake-audio.ts`（偽の `AudioContext`）を使い、予約した音の波形・周波数・長さ・順を確かめる（仕様書 §26.11）。実際の聞こえ方は手動テスト。

## 2. PWA（`src/platform/pwa.ts`・`install.ts`・`public/boot.js`）

仕様書 §30・ADR-0009 のとおり。`mini-blockbreaking-game` の同じファイルを、アプリ識別子 `mini-wiz-game` に合わせて使う。

| モジュール | 受け持ち |
| --- | --- |
| `vite.config.ts` の `VitePWA` | manifest（名前「WIZ」・`standalone`・`portrait`・アイコン）、Workbox の事前キャッシュ（`enemies/*.png` を含む全ファイル）、`registerType: 'prompt'` |
| `platform/pwa.ts` | Service Worker の登録（本番のビルドだけ）。新しい版を受け取ったら `update-banner` を出せる状態にし、ルーターがタイトル・宿屋のときだけ出す。「更新」で切り替えて読み込み直す |
| `platform/install.ts` | 端末の判定（iPhone／Android／PC）、`beforeinstallprompt` を持っておき「今すぐインストール」に使う、インストール済みの判定（`display-mode: standalone`） |
| `public/boot.js` | 起動の見張り（8 秒）。失敗したらこのアプリのキャッシュと Service Worker だけを消して 1 回読み込み直す。2 分以内に続けて失敗したら `#boot-error` |

### 2.1 アイコンの図柄の値（`scripts/make-icons.mjs`）

仕様書 §30.5 で「03 画面設計で決める」とした細かい値。03 では決めなかったので、TASK-0002 で決めた（v1.1）。値は一辺に対する割合。

| 項目 | 値 |
| --- | --- |
| 外側の余白 | 0.08 |
| 入れ子の矩形 | 疑似3D の奥行きの枠 x = 0・40・80・110・130 を 320 で割った割合（0・0.125・0.25・0.344・0.406）を、余白の内側の正方形に当てはめる（5 つ） |
| 四隅を結ぶ線 | いちばん外の矩形の 4 つの角から、いちばん奥の矩形の角へ |
| 線 | 羊皮紙 `#E8DCC0`、太さ 1/48（512px で 10.7px）、端は丸 |
| ひし形 | くすんだ金 `#C9A227`、中心、半分の対角線 0.06 |
| 背景 | 夜の黒 `#0B0A0F`（透過なし） |
| maskable | 図柄を中心で 0.7 倍に縮める（背景は全面） |
| PNG | 8 ビット RGB、線の縁は画素の覆う割合でなめらかにする（アンチエイリアス） |

## 3. テスト用の入口（`src/ui/debug.ts`）

仕様書 §28 のとおり。`main.ts` が `?debug=1` のときだけ `attachDebug` を呼ぶ。

| 入口 | 作り |
| --- | --- |
| `body[data-screen]`・`[data-location]`・`[data-busy]` | ルーターと `ui/command.ts` が書く（常に） |
| `app:sound`・`app:bgm` イベント | `audio/sound.ts`・`audio/bgm-director.ts` が `window.dispatchEvent`（常に） |
| `window.__wiz.debugDungeon()` | `api.debugDungeon()`（ゲーム API の中で、保存の状態から今の階の全マスを返す） |
| `window.__wiz.useSeed(seed)` | `SwappableRng` の中身を `SeededRng(seed)` に替える |
| `window.__wiz.writeState(stored)`・`writeSave(stored)` | `storage.write` で直接書き、`store.refresh()` |
| `window.__wiz.setDelay(ms)` | ゲーム API の `delayMs` を替える（TD-0002 §3.1） |
| `window.__wiz.showUpdateBanner()` | `update-banner` を出す |

- 画面の大きさの確かめには入口を足さない（E2E で `setViewportSize` と DOM の大きさを測る。TD-0003 §9）。

## 4. ビルドと CI

| 項目 | 作り |
| --- | --- |
| `package.json` のスクリプト | 仕様書 §19.1・§29.1（`dev`・`build`・`preview`・`test`・`test:e2e`・`lint`・`check:dist`・`check:docs`・`verify`） |
| `scripts/check-dist.mjs` | 仕様書 §29.4。`enemies/` の 6 枚（256×256）が `dist/` と事前キャッシュにあることも確かめる |
| `scripts/check-docs.mjs` | 仕様書 §29.5。`mini-blockbreaking-game` のものを接頭辞 `MWIZ`・置き場所 `docs/` に合わせる。SDD-PROCESS_v3 §7.2 のエラーを出す |
| `scripts/make-icons.mjs` | 仕様書 §30.5 |
| `.github/workflows/test.yml` | PR と main への push で `npm run verify` と E2E（仕様書 §30.6） |
| `.github/workflows/pages.yml` | 今の仮のもの（`prototype/` を公開）を、07 の土台の WS で `dist/` を公開する本物に置き換える（仕様書 §30.7）。試作は公開しなくなる |

- `prototype/` は 07 では使わない（見た目の見本）。土台の WS で `pages.yml` を置き換えるときに、試作の公開をやめる。試作のファイルはリポジトリに残す（GUI-0001 の記録のため）。
