// scripts/docs-only.mjs の型（テストから読むため。TD-0005 §4）
export interface DiffEnv {
  event?: string;
  base?: string;
  head?: string;
  before?: string;
  sha?: string;
}

export function isDocFile(file: string): boolean;
export function isDocsOnly(files: readonly string[]): boolean;
export function diffArgs(env: DiffEnv): string[] | null;
export function decide(env: DiffEnv, listFiles: (args: string[]) => string[]): boolean;
