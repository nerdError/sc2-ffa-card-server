export type ImageInfo = { file: string; title: string };

export type ServerMsg =
  | { type: 'list'; images: ImageInfo[] }
  | { type: 'show'; file: string; duration: number }
  | { type: 'hide' };

export type ClientMsg =
  | { type: 'show'; file: string; duration: number };