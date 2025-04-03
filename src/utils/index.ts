import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const PATH_ROOT = 'public/video';
export const PATH_ROOT_VIDEOS = join(process.cwd(), PATH_ROOT);
export const PATH_TEMP_VIDEOS = join(PATH_ROOT_VIDEOS, '/temp');

export const checkAndCreatePath = (path: string) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
};

export const randStr: () => string = () => {
  const length = 10;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const removeSuffix: (str: string, suffix: string) => string = (str, suffix) => {
  return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
};
