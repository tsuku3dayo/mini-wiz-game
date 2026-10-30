// 開発の成果物（docs/ の MWIZ-*.md）の整合性を確かめる（仕様書 §29.5、SDD-PROCESS_v3.md §7.2）
// 使い方: node scripts/check-docs.mjs [--strict]
//   エラー（1 つでもあれば終了コード 1）：ID・ファイル名・フォルダ、frontmatter、実在しない ID、sources の版の違い、
//     stable なのに sources が review、承認のある種類の stable に verified がない、テストの確認 ID が TC にない
//   注意（--strict のときはエラー）：TC の確認 ID がテストのコード（自動）か AC（手動）にない、sources に版がない
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const PREFIX = 'MWIZ';

// 種類 → [種類名, フォルダ, 承認があるか]（CLAUDE.md の表）
const KINDS = {
  PB: ['project-brief', '00_brief', true],
  SA: ['system-architecture', '01_architecture', true],
  TS: ['technology-stack', '01_architecture', true],
  ADR: ['architecture-decision', '01_architecture', true],
  EP: ['epic', '02_requirements', true],
  US: ['user-story', '02_requirements', true],
  GUI: ['gui-design', '03_gui', true],
  TD: ['technical-design', '04_design', false],
  TST: ['test-strategy', '05_test', false],
  TC: ['test-case', '05_test', false],
  WS: ['workstream', '06_plan', false],
  TASK: ['implementation-task', '06_plan', false],
  AC: ['attested-computation', '07_attested', true],
};
const FIELDS = ['id', 'type', 'title', 'status', 'version', 'updated', 'sources', 'verified'];

const errors = [];
const warnings = [];
const rel = (p) => path.relative(root, p).replaceAll('\\', '/');

function walk(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === 'node_modules' ? [] : walk(p, filter);
    return filter(d.name) ? [p] : [];
  });
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z]+):\s*(.*)$/);
    if (kv) { key = kv[1]; fm[key] = kv[2].trim(); if (key === 'sources') fm.sources = []; continue; }
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && key === 'sources') fm.sources.push(item[1].trim());
  }
  return fm;
}

// 1. 成果物を集める
const docs = new Map();
for (const file of walk(path.join(root, 'docs'), (n) => n.startsWith(`${PREFIX}-`) && n.endsWith('.md'))) {
  const name = path.basename(file);
  const m = name.match(new RegExp(`^(${PREFIX}-([A-Z]+)-(\\d{4}))-([a-z-]+)-ja\\.md$`));
  if (!m) { errors.push(`${rel(file)}: ファイル名が <ID>-<種類名>-ja.md でない`); continue; }
  const [, id, kind, , kindName] = m;
  const def = KINDS[kind];
  if (!def) { errors.push(`${rel(file)}: 知らない種類 ${kind}`); continue; }
  if (def[0] !== kindName) errors.push(`${rel(file)}: 種類名は ${def[0]}`);
  if (path.basename(path.dirname(file)) !== def[1]) errors.push(`${rel(file)}: フォルダは docs/${def[1]}/`);
  const text = fs.readFileSync(file, 'utf8');
  const fm = frontmatter(text);
  if (!fm) { errors.push(`${rel(file)}: frontmatter がない`); continue; }
  for (const f of FIELDS) if (!(f in fm)) errors.push(`${rel(file)}: frontmatter に ${f} がない`);
  if (fm.id !== id) errors.push(`${rel(file)}: id が ${fm.id}（ファイル名は ${id}）`);
  if (docs.has(id)) errors.push(`${rel(file)}: ID ${id} が重複`);
  docs.set(id, { id, kind, file, text, fm, approval: def[2] });
}

// 仕様書の版
const specText = fs.readFileSync(path.join(root, 'docs/specification-ja.md'), 'utf8');
const specVersion = (specText.match(/^- 版：([\d.]+)/m) || [])[1];

// 2. 中身の確かめ
for (const d of docs.values()) {
  const where = rel(d.file);
  const { fm } = d;
  if (!['draft', 'review', 'stable'].includes(fm.status)) errors.push(`${where}: status は draft・review・stable のどれか`);
  if (d.approval && fm.status === 'stable' && (!fm.verified || fm.verified === 'null')) errors.push(`${where}: 承認のある種類で stable なのに verified がない`);
  for (const src of fm.sources || []) {
    const ref = src.match(new RegExp(`^(${PREFIX}-[A-Z]+-\\d{4})（v([\\d.]+)）`));
    if (ref) {
      const target = docs.get(ref[1]);
      if (!target) { errors.push(`${where}: sources の ${ref[1]} がない`); continue; }
      if (target.fm.version !== ref[2]) errors.push(`${where}: sources の ${ref[1]} は v${ref[2]} と書いたが、今は v${target.fm.version}`);
      if (fm.status === 'stable' && target.fm.status !== 'stable') errors.push(`${where}: stable なのに sources の ${ref[1]} が ${target.fm.status}`);
      continue;
    }
    if (src.startsWith(`${PREFIX}-`)) warnings.push(`${where}: sources の ${src} に版がない`);
    const spec = src.match(/^docs\/specification-ja\.md \(v([\d.]+)\)/);
    if (spec && spec[1] !== specVersion) warnings.push(`${where}: 仕様書を v${spec[1]} と書いたが、今は v${specVersion}（引用した章が変わっていないか確かめる）`);
  }
  // 本文から参照している ID
  for (const m of d.text.matchAll(new RegExp(`${PREFIX}-[A-Z]+-\\d{4}`, 'g'))) if (!docs.has(m[0])) errors.push(`${where}: ${m[0]} がない`);
}

// 3. 確認 ID（TC の表 ⇔ テストのコード・AC）
const tcIds = new Map(); // 確認 ID → 手動か
for (const d of docs.values()) {
  if (d.kind !== 'TC') continue;
  for (const m of d.text.matchAll(/^\| (TC-\d{4}-\d{2}) \|[^|]*\|[^|]*\| ([^|]+) \|/gm)) tcIds.set(m[1], m[2].trim().startsWith('手動'));
}
const codeFiles = [...walk(path.join(root, 'tests'), (n) => n.endsWith('.ts')), ...walk(path.join(root, 'e2e'), (n) => n.endsWith('.ts')), ...walk(path.join(root, 'scripts'), (n) => /\.(m?js|ts)$/.test(n))]
  .filter((f) => !f.endsWith('check-docs.mjs'));
const inCode = new Set();
for (const f of codeFiles) {
  const text = fs.readFileSync(f, 'utf8');
  // テストの名前の先頭の確認 ID：test('TC-0000-00 …') / it("TC-…")
  for (const m of text.matchAll(/\b(?:test|it)(?:\.\w+)?\(\s*['"`](TC-\d{4}-\d{2})\b/g)) {
    inCode.add(m[1]);
    if (!tcIds.has(m[1])) errors.push(`${rel(f)}: テストの確認 ID ${m[1]} が TC にない`);
  }
}
const inAc = new Set();
for (const d of docs.values()) if (d.kind === 'AC') for (const m of d.text.matchAll(/TC-\d{4}-\d{2}/g)) inAc.add(m[0]);
const missing = [...tcIds].filter(([id, manual]) => (manual ? !inAc.has(id) : !inCode.has(id))).map(([id]) => id);
if (missing.length) (strict ? errors : warnings).push(`TC の確認 ID のうち、テストのコード（自動）か AC（手動）にないもの：${missing.length} 個（${missing.slice(0, 8).join('、')}${missing.length > 8 ? '…' : ''}）`);

for (const w of warnings) console.log(`注意: ${w}`);
for (const e of errors) console.error(`エラー: ${e}`);
console.log(`成果物 ${docs.size}、確認 ID ${tcIds.size}（テストのコードに ${inCode.size}）、エラー ${errors.length}、注意 ${warnings.length}${strict ? '（厳しいモード）' : ''}`);
process.exit(errors.length ? 1 : 0);
