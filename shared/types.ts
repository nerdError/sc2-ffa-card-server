export const VERSION = 3

export type Direction = 'left' | 'right' | 'top' | 'bottom' | 'fade';

export type ImageInfo = { file: string; title: string; version: number };

export type ServerMsg =
  | { type: 'list'; images: ImageInfo[] }
  | { type: 'show'; file: string; duration: number; version: number; autoHide: boolean; direction: Direction }
  | { type: 'hide' };

export type ClientMsg =
  | { type: 'show'; file: string; duration: number; direction: Direction };