---
id: MWIZ-TD-0005
type: Technical Design
title: 詳細設計 音・PWA・テスト用の入口・ビルドと CI
status: stable
version: 1.13
updated: 2026-11-11
sources:
  - MWIZ-TD-0001（v1.2）
  - MWIZ-TS-0001（v1.4）
  - MWIZ-ADR-0008（v1.1）
  - MWIZ-ADR-0009（v1.1）
  - MWIZ-ADR-0011（v1.0）
  - docs/specification-ja.md (v1.22) §12、§19、§25、§26、§28〜§30
verified: null
---

# TD-0005 音・PWA・テスト用の入口・ビルドと CI

音色・曲データ・設定の値は仕様書 §25・§26・§19・§30 を正とする。ここでは、モジュールの分担と、画面層とのつなぎ方を決める。

## 1. 音（`src/audio/`）

| モジュール | 受け持ち | つなぎ方 |
| --- | --- | --- |
| `sound-setting.ts` | オン／オフ（`mini-wiz-game-sound`、初期オフ）、`toggle()`、`subscribe`、`soundLabel`。保存には文字列 `'on'`／`'off'` をそのまま書く（Web Storage の `getItem`・`setItem` を受け取る。ゲームの保存の `KeyValueStore` は JSON にするので使わない。v1.4） | タイトルのメニュー・GameMenu の「おと」が呼ぶ（画面には `ScreenContext.sound` で渡す）。オンにした瞬間に `toggle` の音（`main.ts` が `onTurnOn` でつなぐ） |
| `sound.ts` | 効果音 8 種の合成（仕様書 §25。v1.8 から FM 音源風：出来事（音・和音、頭・長さ、音色、高さの動き、v1.11 から音量の倍率）の並びを、音色ごとのローパスと、v1.11 から効果音の出口のコンプレッサーを通して鳴らす。長さは `SFX_MS`）、`playSfx(name)`・`stopSfx()`・`sfxRemainingSec()`・`onSfx`（仕様書 §25.3 の名前。v1.3 は `play`・`stop` と書いていた）、自動再生の制限への対処（入力のたびに `resume`）。`sfx(name, { muted })` が `app:sound` イベントを出し、muted でなければ `playSfx` を呼ぶ（v1.4） | `main.ts` が、`ui/command.ts` の `onEncounter`（遭遇）と `ui/message-queue.ts` の `onEffectStart`・`onEffectEnd`（演出の開始・終了）に `sfx`・`stopSfx` をつなぐ |
| `bgm.ts` | FM 合成の再生エンジン（仕様書 §26.2〜§26.6）、ダッキング・フェード | `bgm-director.ts` だけが呼ぶ |
| `bgm-director.ts` | 場面（パス・状態・演出）から曲を決め、変わったときだけ替える（仕様書 §26.7）。替えたら `app:bgm` イベント | ストア・ルーター・キュー・音の設定を購読する。LocationGuard の外に置き、エラーの画面でも止めない |

- 曲の選び方は `logic/bgm-scene.ts`、記譜と曲データは `logic/bgm-notation.ts`・`logic/bgm-tracks.ts`（純粋関数とデータ）。
- 仕様書 v1.12 のクレジット画面（`/credits`）は、`sceneBgm` の `'/'`・`'/new'` と同じ `case` に足して `'title'` にする。ほかは変えない（v1.12）。
- どの関数も例外を外に出さない（Web Audio がなくても遊べる）。
- テスト：`tests/audio/` で `tests/helpers/fake-audio.ts`（偽の `AudioContext`）を使い、予約した音の周波数・頭・止める時刻・音色（変調の深さ・ローパス）を確かめる（仕様書 §26.11。v1.8）。曲は 6 曲（v1.8）で、5/8 拍子（1 小節 2.5 拍）・5/4 拍子も同じ仕組みで鳴らす（1 周の秒 = 小節数 × 1 小節の拍数 × 60 ÷ bpm）。実際の聞こえ方は手動テスト。
- 仕様書 v1.9 の曲の入れ替え（タイトル←カタコンベ、宿屋←ローエングリン、ボス戦←モーツァルト「怒りの日」）は、`logic/bgm-tracks.ts` の曲データだけを替える。曲の名前（`BgmName`）・場面の選び方（`bgm-scene.ts`）・再生の仕組み（`bgm.ts`・`bgm-director.ts`）は変えない（v1.10）。
- ボス戦の曲は 1 周で予約する音が多い（16 分音符の刻みと 3 声の合唱。試聴ページで約 1,300 のオシレーター。カタコンベは約 190）。1 周分をまとめて予約する仕組み（仕様書 §26.5）は変えず、古い端末で音が途切れないかを実機で確かめる。途切れるときは、曲データ（刻みを 8 分音符にするなど）で減らす（変更の依頼を通す。v1.10）。

### 効果音のジングル化（v1.11、仕様書 v1.10）

- `sound.ts` の `SFX`・`SFX_MS`・`SE_PATCHES` を、仕様書 §25.2 のコードのとおりに書き替える（遭遇・レベルアップ・ボス出現・ボス撃破・クリアの 5 つ、音色「ひびくオルガン」を足して 9 種）。`SfxEvent` に `gain?`（音量の倍率）を足し、1 音の音量を `patch.vol × (gain ?? 1) / √音数` にする。音の終わりのフェードを `min(0.03, 長さ / 3)` にする。
- 効果音の出口：`sound.ts` の中に、`AudioContext` ごとに 1 つのコンプレッサーを持つ（最初に鳴らすときに作り、`WeakMap<AudioContext, AudioNode>` または「作った ctx と組」で覚える。`audioContext()` は 1 つしか作らないので、実際は 1 つ）。`createDynamicsCompressor` がない・例外のときは `ac.destination` を出口にする。出来事ごとのローパスは出口につなぐ。BGM（`bgm.ts`）の音のつながりは変えない（効果音だけがコンプレッサーを通る）。
- 演出の長さ：`logic/message-plan.ts` の `EFFECT_MS` を levelUp 1071・bossAppear 2906・bossDefeat 1000・clear 5833 にする（rareDrop 800・`RARE_DROP_LG_MS` 1200 はそのまま）。`message-queue.ts`・`effects.ts`・`style.css` のアニメーション・`main.ts` の `onEffectEnd` での `stopSfx` は変えない（演出の長さ＝音の長さなので、時間どおりの終わりで止めても音は鳴り切っている）。
- 演出の長さと音の長さの関係は、テストで縛る（`SFX_MS` の 4 つ ＝ `EFFECT_MS`。TC-0032-21）。`sound.ts`（音）から `logic/message-plan.ts` を import はしない（層の向きを変えない）。テストの中で両方を読んで比べる。
- BGM：`bgm-director.ts` は、演出（`activeEffect`）がある間ボスの曲・クリアの曲を待つので、演出が延びれば自動で遅れる（コードは変えない）。遭遇の音が 510 ms になるので、戦闘の曲は `sfxRemainingSec()` のぶん早く始まる（コードは変えない）。
- E2E で、行の出る時刻・`app:bgm` の時刻を決め打ちしているところ（`e2e/sound.spec.ts`・`e2e/effects.spec.ts`・`e2e/message.spec.ts`）は、新しい演出の長さで直す。直す前に、`1000`・`1200`・`600`・`1500` などの値をテストの中で探し、演出の長さに関係するものを全部挙げる。

## 2. PWA（`src/platform/pwa.ts`・`install.ts`・`public/boot.js`）

仕様書 §30・ADR-0009 のとおり。`mini-blockbreaking-game` の同じファイルを、アプリ識別子 `mini-wiz-game` に合わせて使う。

| モジュール | 受け持ち |
| --- | --- |
| `vite.config.ts` の `VitePWA` | manifest（名前「WIZミニ」・`standalone`・`portrait`・アイコン）、Workbox の事前キャッシュ（`enemies/*.png`・`title/title.png` を含む全ファイル）、`registerType: 'prompt'` |
| `platform/pwa.ts` | Service Worker の登録（本番のビルドだけ）。新しい版を受け取ったら `update-banner` を出せる状態にし、ルーターがタイトル・宿屋のときだけ出す。「更新」で切り替えて読み込み直す |
| `platform/install.ts` | 端末の判定（iPhone／Android／PC）、`beforeinstallprompt` を持っておき「今すぐインストール」に使う、インストール済みの判定（`display-mode: standalone`） |
| `public/boot.js` | 起動の見張り（8 秒）。失敗したらこのアプリのキャッシュと Service Worker だけを消して 1 回読み込み直す。2 分以内に続けて失敗したら `#boot-error`。**「なおす」を押したら、2 分の制限を待たずに、自動の復旧と同じこと（時刻を書く・このアプリの Service Worker とキャッシュだけ消す・読み込み直す）をすぐ行う**（仕様書 §30.4 に書かれていなかったので TASK-0003 で決めた。v1.2） |

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
| `window.__wiz.useSeed(seed)` | `SwappableRng` の中身を `SeededRng(seed)` に替える（組み立ては `platform/math-rng.ts` の `createDebugRng()`。v1.3） |
| `window.__wiz.writeState(stored)`・`writeSave(stored, slot = 1)` | `storage.write` で直接書き（セーブは `save-{slot}`。v1.13）、`store.refresh()` |
| `window.__wiz.setDelay(ms)` | ゲーム API に渡す待つ関数 `delay` の待ち時間を替える（TD-0002 §3.1。v1.3） |
| `window.__wiz.showUpdateBanner()` | `update-banner` を出す |

- 画面の大きさの確かめには入口を足さない（E2E で `setViewportSize` と DOM の大きさを測る。TD-0003 §9）。

## 4. ビルドと CI

| 項目 | 作り |
| --- | --- |
| `package.json` のスクリプト | 仕様書 §19.1・§29.1（`dev`・`build`・`preview`・`test`・`test:e2e`・`lint`・`check:dist`・`check:docs`・`verify`） |
| `scripts/check-dist.mjs` | 仕様書 §29.4。`enemies/` の 6 枚（256×256。v1.7）と `title/title.png`（1080 × 720）が `dist/` と事前キャッシュにあること、manifest の `name` が「WIZミニ」であることも確かめる |
| `scripts/check-docs.mjs` | 仕様書 §29.5。`mini-blockbreaking-game` のものを接頭辞 `MWIZ`・置き場所 `docs/` に合わせる。SDD-PROCESS_v3 §7.2 のエラーを出す |
| `scripts/make-icons.mjs` | 仕様書 §30.5 |
| `.github/workflows/test.yml` | PR と main への push で `npm run verify` と E2E（仕様書 §30.6）。v1.9：先に `changes` ジョブで「文書だけ」かを決め、文書だけのときは `check` が `node scripts/check-docs.mjs` だけ、`e2e` はスキップ（下の「文書だけの判定」） |
| `scripts/docs-only.mjs` | v1.9。変わったファイルが文書だけかを決める（下の「文書だけの判定」）。型は `scripts/docs-only.d.mts` に書く（`tsconfig` は `scripts/` を含まず `allowJs` もないので、テストから読むために要る） |
| `.github/workflows/pages.yml` | 今の仮のもの（`prototype/` を公開）を、07 の土台の WS で `dist/` を公開する本物に置き換える（仕様書 §30.7）。試作は公開しなくなる |

### 文書だけの判定（v1.9、仕様書 §30.6）

`scripts/docs-only.mjs` は Node の標準だけで書く（`npm ci` なしで動かすため）。

| 名前 | 中身 |
| --- | --- |
| `isDocFile(file)` | `docs/` で始まる、または `/` を含まず `.md` で終わる（いちばん上の `.md`）なら `true`。区切りは `/`（`git diff --name-only` の出力） |
| `isDocsOnly(files)` | `files` が 1 つ以上あり、すべて `isDocFile` なら `true`。空なら `false` |
| `diffArgs(env)` | `env.event`（`pull_request` か `push`）ごとに `git diff --name-only` の引数を返す。PR：`[`${base}...${head}`]`（共通の祖先から）。push：`[before, sha]`。`before` が空・すべて `0`、または必要な値がないときは `null` |
| `decide(env, listFiles)` | `diffArgs` が `null` なら `false`。`listFiles(args)` でファイルの一覧を取り、`isDocsOnly` を返す。`listFiles` が例外を投げたら `false`（安全なほうに倒す） |
| コマンドとして動かしたとき | 環境変数 `EVENT`・`BASE`・`HEAD`・`BEFORE`・`SHA` から `env` を作り、`listFiles` は `git diff --name-only <args>`（`execFileSync`）。結果を `docs_only=true` / `false` として `GITHUB_OUTPUT` のファイルに足し、標準出力にも、判定と変わったファイルの数を書く。終了コードはいつも 0 |

`test.yml` の形：

- `changes`：`actions/checkout`（`fetch-depth: 0`。共通の祖先と `before` を読むため）→ `actions/setup-node`（Node 24。キャッシュなし）→ `node scripts/docs-only.mjs`（環境変数に `github.event_name`・`github.event.pull_request.base.sha`・`github.event.pull_request.head.sha`・`github.event.before`・`github.sha`）。出力 `docs_only`。5 分で打ち切り。
- `check`：`needs: changes`。`docs_only == 'true'` なら checkout → setup-node（キャッシュなし）→ `node scripts/check-docs.mjs`。それ以外はいまと同じ（npm のキャッシュ → `npm ci` → `npm run verify`）。ステップごとの `if` で分ける（ジョブは 1 つのまま。GitHub の画面の名前 `check` を変えない）。
- `e2e`：`needs: changes`、`if: needs.changes.outputs.docs_only != 'true'`。中身はいまと同じ。
- `changes` が失敗したら、`check`・`e2e` は動かず、実行全体が失敗になる（気づける）。

- `prototype/` は 07 では使わない（見た目の見本）。土台の WS で `pages.yml` を置き換えるときに、試作の公開をやめる。試作のファイルはリポジトリに残す（GUI-0001 の記録のため）。
