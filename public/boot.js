/* 起動の見張りと復旧（仕様書 §30.4、ADR-0009、TD-0005 §2）
 * ビルドを通さない普通のスクリプト（ES5 相当）。main.ts が読めなくても動く。
 * 1. <meta name="app-id"> からアプリ識別子を読む。範囲は new URL('./', location.href).href
 * 2. load から 8 秒（window.__bootWaitMs があればその値）たっても window.__appStarted が true でなければ、起動の失敗とみなす
 * 3. 前の復旧から 2 分以内なら、自動で直さず「うまく起動できませんでした。」と「なおす」を出す
 * 4. それ以外は、このアプリの範囲の Service Worker とキャッシュだけを消して読み込み直す。localStorage は消さない
 */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="app-id"]');
  var appId = (meta && meta.getAttribute('content')) || 'app';
  var scope = new URL('./', location.href).href;
  var key = appId + ':boot-repair-at';
  var LIMIT_MS = 120000;

  function readRepairAt() {
    try { return Number(sessionStorage.getItem(key)) || 0; } catch (e) { return 0; }
  }
  function writeRepairAt() {
    try { sessionStorage.setItem(key, String(Date.now())); } catch (e) { /* 書けなくても直す */ }
  }

  // このアプリの範囲の Service Worker と、名前に範囲を含むキャッシュだけを消して、読み込み直す
  function repair() {
    writeRepairAt();
    var jobs = [];
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(navigator.serviceWorker.getRegistrations().then(function (list) {
        return Promise.all(list.filter(function (r) { return r.scope === scope; }).map(function (r) { return r.unregister(); }));
      }));
    }
    if (window.caches && caches.keys) {
      jobs.push(caches.keys().then(function (names) {
        return Promise.all(names.filter(function (n) { return n.indexOf(scope) !== -1; }).map(function (n) { return caches.delete(n); }));
      }));
    }
    Promise.all(jobs).then(reload, reload);
  }
  function reload() { location.reload(); }

  // CSS が読めない場合に備えて、色はここに直接書く（仕様書 §30.4）
  function showError() {
    var box = document.getElementById('boot-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'boot-error';
      document.body.appendChild(box);
    }
    box.setAttribute('role', 'alert');
    box.style.cssText = 'position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:16px;background:#0B0A0F;color:#E8DCC0;text-align:center;font-size:16px;line-height:1.6';
    box.textContent = '';
    var lead = document.createElement('p');
    lead.style.margin = '0';
    lead.textContent = 'うまく起動できませんでした。';
    var button = document.createElement('button');
    button.id = 'boot-repair';
    button.type = 'button';
    button.textContent = 'なおす';
    button.style.cssText = 'min-height:48px;min-width:96px;padding:0 16px;font:inherit;background:transparent;color:#FFC845;border:2px solid #FFC845;border-radius:0;cursor:pointer';
    // 「なおす」は 2 分の制限を待たずに、自動の復旧と同じことをすぐ行う（TD-0005 §2）
    button.addEventListener('click', repair);
    var note = document.createElement('p');
    note.style.margin = '0';
    note.textContent = 'きろくは消えません。';
    box.appendChild(lead);
    box.appendChild(button);
    box.appendChild(note);
    box.hidden = false;
    box.style.border = '2px solid #FFFFFF';
    button.focus();
  }

  function check() {
    if (window.__appStarted === true) return;
    var last = readRepairAt();
    if (last && Date.now() - last < LIMIT_MS) showError();
    else repair();
  }

  window.addEventListener('load', function () {
    var wait = typeof window.__bootWaitMs === 'number' ? window.__bootWaitMs : 8000;
    setTimeout(check, wait);
  });
})();
