// ジングルの試聴ページ：いまの効果音と、ジングルの案を聴き比べる
// 1 音の鳴らし方はゲームの効果音（src/audio/sound.ts の fmTone）と同じ。ジングルは長さが自由なので、ここで予約する
import { audioContext, playSfx, stopSfx } from '../../../src/audio/sound.ts';
import { SECTIONS, jingleMs, type JEvent } from './jingles';

let nodes: AudioScheduledSourceNode[] = [];
let bus: AudioNode | null = null;
let timer = 0;

function out(ac: AudioContext): AudioNode {
  if (bus) return bus;
  // 和音や打楽器が重なっても割れないよう、最後に軽く抑える
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  comp.connect(ac.destination);
  bus = comp;
  return comp;
}

function track(n: AudioScheduledSourceNode, t: number, stop: number): void {
  n.start(t);
  n.stop(stop);
  nodes.push(n);
}

function stopJingle(): void {
  for (const n of nodes) {
    try { n.stop(); n.disconnect(); } catch { /* 止められなくてもよい */ }
  }
  nodes = [];
  clearTimeout(timer);
}

function fmTone(ac: AudioContext, dest: AudioNode, f: number, t: number, stop: number, e: JEvent, vol: number): void {
  const p = e.patch;
  const glide = e.glide ?? 1;
  const carrier = ac.createOscillator();
  const mod = ac.createOscillator();
  carrier.frequency.setValueAtTime(f, t);
  mod.frequency.setValueAtTime(f * p.ratio, t);
  if (glide !== 1) {
    carrier.frequency.exponentialRampToValueAtTime(f * glide, stop);
    mod.frequency.exponentialRampToValueAtTime(f * p.ratio * glide, stop);
  }
  const mg = ac.createGain();
  const dev = p.index * f * p.ratio;
  mg.gain.setValueAtTime(dev, t);
  mg.gain.setTargetAtTime(dev * p.sustain, t + 0.002, p.idecay);
  mod.connect(mg);
  mg.connect(carrier.frequency);
  const g = ac.createGain();
  const a = Math.min(p.attack, (stop - t) / 3);
  const fade = Math.min(0.03, (stop - t) / 3);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setTargetAtTime(vol * p.asus, t + a, p.adecay);
  g.gain.setTargetAtTime(0, stop - fade * 2, fade / 2);
  carrier.connect(g);
  g.connect(dest);
  if (e.vib) {
    const lfo = ac.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = ac.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * 0.008, t + Math.min(0.4, stop - t));
    lfo.connect(lg);
    lg.connect(carrier.frequency);
    track(lfo, t, stop);
  }
  track(carrier, t, stop);
  track(mod, t, stop);
}

function playJingle(ac: AudioContext, events: readonly JEvent[]): void {
  stopJingle();
  const start = ac.currentTime + 0.05;
  for (const e of events) {
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = e.patch.lowpass;
    lp.Q.value = 0.7;
    lp.connect(out(ac));
    const t = start + e.at / 1000;
    const stop = t + e.len / 1000;
    const vol = (e.patch.vol * (e.gain ?? 1)) / Math.sqrt(e.f.length);
    for (const f of e.f) fmTone(ac, lp, f, t, stop, e, vol);
  }
}

const list = document.getElementById('list')!;
const status = document.getElementById('status')!;

function unlock(): AudioContext | null {
  const ac = audioContext();
  if (ac && ac.state !== 'running') void ac.resume().catch(() => undefined);
  return ac;
}

function button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

for (const sec of SECTIONS) {
  const h = document.createElement('h2');
  h.className = 'sec';
  h.textContent = sec.title;
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = sec.note;
  const ul = document.createElement('ul');
  ul.className = 'cards';
  list.append(h, note, ul);
  for (const it of sec.items) {
  const li = document.createElement('li');
  li.className = 'card';
  li.innerHTML = `
    <p class="scene">${it.when}（${it.state}）</p>
    <h3>${it.label}</h3>`;
  const row = document.createElement('div');
  row.className = 'row';
  for (const j of it.jingles) {
    const sec = (jingleMs(j.events) / 1000).toFixed(1);
    const p = document.createElement('p');
    p.className = 'meta';
    p.innerHTML = `<b>${j.title}</b>（約 ${sec} 秒）：${j.desc}`;
    li.append(p);
    row.append(button(`▶ ${j.title}`, 'main', () => {
      const ac = unlock();
      if (!ac) return;
      stopSfx();
      playJingle(ac, j.events);
      status.textContent = `再生中：${it.label}・${j.title}（約 ${sec} 秒）`;
      timer = window.setTimeout(() => { status.textContent = '止まっています'; }, jingleMs(j.events) + 100);
    }));
  }
  row.append(button('いまの音', 'sub', () => {
    unlock();
    stopJingle();
    playSfx(it.name);
    status.textContent = `いまの音：${it.label}`;
  }));
  li.append(row);
  ul.append(li);
  }
}

document.getElementById('stop')!.addEventListener('click', () => {
  stopJingle();
  stopSfx();
  status.textContent = '止まっています';
});
status.textContent = 'ボタンを押すと鳴ります';
