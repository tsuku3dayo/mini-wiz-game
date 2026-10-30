// ESLint の決まり（仕様書 §19.4、ADR-0003、TD-0001 §1）
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// ロジック層とゲーム API で使ってはいけないグローバル（時刻・乱数・保存・DOM は引数で受け取る）
const browserOnly = ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'performance', 'requestAnimationFrame', 'setTimeout', 'setInterval', 'Date']
  .map((name) => ({ name, message: 'ロジック層・ゲーム API では使わない（引数で受け取る）' }));
const noMathRandom = { object: 'Math', property: 'random', message: '乱数は Rng を引数で受け取る' };
const noInnerHtml = [
  { selector: "AssignmentExpression[left.property.name='innerHTML']", message: 'DOM は createElement と textContent で組み立てる' },
  { selector: "AssignmentExpression[left.property.name='outerHTML']", message: 'DOM は createElement と textContent で組み立てる' },
];
const layer = (patterns, message) => ({ patterns: patterns.map((group) => ({ group: [group], message })) });

export default tseslint.config(
  // prototype/（03 の試作）と docs/（記録のスクリプト）はアプリのコードではないので調べない
  { ignores: ['dist', 'dev-dist', 'node_modules', 'playwright-report', 'test-results', 'prototype', 'docs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
  // 名前・装備名を HTML として解釈させない
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: { 'no-restricted-syntax': ['error', ...noInnerHtml] },
  },
  // ロジック層（ルール）
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...browserOnly],
      'no-restricted-properties': ['error', noMathRandom],
      'no-restricted-imports': ['error', layer(['**/api/**', '**/ui/**', '**/audio/**', '**/platform/**', '**/logic/**'], 'src/domain/ は src/domain/ の外を import しない')],
    },
  },
  // ロジック層（表示の計算）：src/domain/ と src/api/types.ts だけ
  {
    files: ['src/logic/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...browserOnly],
      'no-restricted-properties': ['error', noMathRandom],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/ui/**', '**/audio/**', '**/platform/**'], message: 'src/logic/ は src/domain/ と src/api/types.ts だけ import する' },
          { group: ['**/api/*', '!**/api/types', '!**/api/types.js'], message: 'src/logic/ は src/api/types.ts だけ import する' },
        ],
      }],
    },
  },
  // ゲーム API
  {
    files: ['src/api/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...browserOnly],
      'no-restricted-properties': ['error', noMathRandom],
      'no-restricted-imports': ['error', layer(['**/ui/**', '**/audio/**', '**/platform/**'], 'src/api/ は画面層・音・基盤を import しない（作るときに受け取る）')],
    },
  },
  // 画面層・音：ゲームの値は GameView から取り、計算は src/logic/ を使う
  {
    files: ['src/ui/**/*.ts', 'src/audio/**/*.ts', 'src/main.ts'],
    rules: {
      'no-restricted-imports': ['error', layer(['**/domain/**'], '画面層は src/domain/ を import しない')],
    },
  },
  // ビルドを通らない普通のスクリプト
  {
    files: ['public/**/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
    // ES5 相当で書くので catch の引数を省けない（使わなくてよい）
    rules: { '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }] },
  },
  {
    files: ['tests/**/*.ts', 'scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
