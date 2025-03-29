import { existsSync, mkdirSync } from 'fs';

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
