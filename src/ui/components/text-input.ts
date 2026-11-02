// TextInput：名前の入力欄（仕様書 §11.5「名前入力」）
import { el } from '../dom';

export interface TextInputOptions {
  label: string;
  maxLength: number;
  autoFocus?: boolean;
  onInput: (value: string) => void;
  /** IME の変換中でない Enter */
  onEnter: () => void;
  onEscape: () => void;
}

export interface TextInput {
  el: HTMLElement;
  input: HTMLInputElement;
  readonly value: string;
  /** 下の文（エラー）。null なら半角スペース 1 つで高さを保つ */
  setError(text: string | null): void;
  setCount(n: number): void;
  setDisabled(disabled: boolean): void;
  destroy(): void;
}

let inputSeq = 0;

export function textInput(opts: TextInputOptions): TextInput {
  const id = `wiz-input-${++inputSeq}`;
  const input = el('input', {
    id,
    class: 'wiz-input',
    type: 'text',
    maxlength: opts.maxLength,
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': `${id}-help`,
  });
  const help = el('p', { id: `${id}-help`, class: 'wiz-input-help' }, ' ');
  const count = el('p', { class: 'wiz-input-count' }, `0/${opts.maxLength}`);
  const root = el('div', { class: 'wiz-text-input' },
    el('label', { for: id, class: 'wiz-input-label' }, opts.label),
    input,
    el('div', { class: 'wiz-input-foot' }, help, count));

  input.addEventListener('input', () => opts.onInput(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      opts.onEnter();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      opts.onEscape();
    }
  });
  if (opts.autoFocus) queueMicrotask(() => input.focus());

  return {
    el: root,
    input,
    get value() { return input.value; },
    setError(text) {
      help.textContent = text ?? ' ';
      root.classList.toggle('has-error', text !== null);
      input.setAttribute('aria-invalid', String(text !== null));
    },
    setCount: (n) => { count.textContent = `${n}/${opts.maxLength}`; },
    setDisabled: (disabled) => { input.disabled = disabled; },
    destroy: () => root.remove(),
  };
}
