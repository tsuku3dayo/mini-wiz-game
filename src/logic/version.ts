/** 画面の版の表記：package.json の version の先頭 2 つに v を付ける（1.0.0 → v1.0。仕様書 §19.1） */
export function versionLabel(version: string): string {
  const [major = '0', minor = '0'] = version.split('.');
  return `v${major}.${minor}`;
}
