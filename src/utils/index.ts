import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const PATH_ROOT = 'public';
export const PATH_ROOT_VIDEOS = `${PATH_ROOT}/video`;
export const PATH_ROOT_TEMP = `${PATH_ROOT_VIDEOS}/temp`;

export const FULL_PATH_ROOT_VIDEOS = join(process.cwd(), PATH_ROOT_VIDEOS);
export const FULL_PATH_TEMP_VIDEOS = join(process.cwd(), PATH_ROOT_TEMP);

export const relativePath = (file: string, path: string) => {
  const videoPart = path.split('/')[1];
  const link = file.slice(file.indexOf(`/${videoPart}/`));
  return link;
};

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
