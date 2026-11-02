// DOM を組み立てる小さな関数。文字は textContent だけで入れる（仕様書 §20.3・§19.4）

type Attrs = Record<string, string | number | boolean | null | undefined>;
type Child = Node | string | null | undefined | false;

const WIDE = '(min-width: 600px)';

/** 広い画面（600px 以上）か（TD-0003 §5） */
export function isWide(): boolean {
  return window.matchMedia(WIDE).matches;
}

/** マウスで操作する広い画面か（CSS と同じ条件。JS では使わない予定だが、テストと調べ物のために持つ） */
export function isFinePointer(): boolean {
  return window.matchMedia(`${WIDE} and (pointer: fine)`).matches;
}

/** 600px の境目をまたいだら呼ぶ。戻り値で外す */
export function onWideChange(cb: (wide: boolean) => void): () => void {
  const mq = window.matchMedia(WIDE);
  const listener = (e: MediaQueryListEvent) => cb(e.matches);
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}

/** 動きを減らす設定か */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 入力欄から来たキー・IME の変換中のキーか（画面全体で受けるキーでは捨てる。TD-0003 §7） */
export function isTypingKey(e: KeyboardEvent): boolean {
  const t = e.target;
  return e.isComposing || (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** SVG の要素を作る（attrs の扱いは el と同じ） */
export function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** 要素を作る。attrs の値が false・null・undefined の属性は付けない。true は空の値で付ける */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}
