// scripts/make-icons.mjs の型（テストから読むため。TD-0005 §2.1）
export interface DecodedPng {
  width: number;
  height: number;
  rgba: Buffer;
}

export const BG: number[];
export const CROP_X: number;
export const CROP_Y: number;
export const CROP_SIZE: number;
export const MASKABLE_SCALE: number;
export function decodePng(buf: Buffer): DecodedPng;
export function sourceRgb(src: DecodedPng, sx: number, sy: number): number[];
export function iconRgb(src: DecodedPng, size: number, art?: number): Buffer;
export function encodePng(size: number, rgb: Buffer): Buffer;
export function renderIcons(source?: Buffer): Record<string, Buffer>;
