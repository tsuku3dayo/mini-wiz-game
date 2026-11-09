// 変わったファイルが文書（docs/ の中と、いちばん上の .md）だけかを決める（仕様書 §30.6、TD-0005 §4「文書だけの判定」）
// CI の changes ジョブで `npm ci` なしに動かすので、Node の標準だけを使う。
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 文書とみなすファイルか（区切りは git の出力と同じ `/`） */
export function isDocFile(file) {
  return file.startsWith('docs/') || (!file.includes('/') && file.endsWith('.md'));
}

/** 1 つ以上あり、すべて文書なら true。空なら false */
export function isDocsOnly(files) {
  return files.length > 0 && files.every(isDocFile);
}

const isZero = (sha) => !sha || /^0+$/.test(sha);

/** `git diff --name-only` の引数。決められないときは null */
export function diffArgs(env) {
  if (env.event === 'pull_request') {
    return env.base && env.head ? [`${env.base}...${env.head}`] : null;
  }
  if (env.event === 'push') {
    return !isZero(env.before) && env.sha ? [env.before, env.sha] : null;
  }
  return null;
}

/** 文書だけなら true。分からないときは false（全部を動かす） */
export function decide(env, listFiles) {
  const args = diffArgs(env);
  if (!args) return false;
  try {
    return isDocsOnly(listFiles(args));
  } catch {
    return false;
  }
}

function gitDiff(args) {
  const out = execFileSync('git', ['diff', '--name-only', ...args], { encoding: 'utf8' });
  return out.split('\n').map((line) => line.trim()).filter(Boolean);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = {
    event: process.env.EVENT,
    base: process.env.BASE,
    head: process.env.HEAD,
    before: process.env.BEFORE,
    sha: process.env.SHA,
  };
  let count = '?';
  const docsOnly = decide(env, (args) => {
    const files = gitDiff(args);
    count = String(files.length);
    return files;
  });
  console.log(`docs_only=${docsOnly}（イベント ${env.event ?? '-'}、変わったファイル ${count}）`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `docs_only=${docsOnly}\n`);
}
