import { copyFileSync, unlinkSync } from 'fs';
import { parse, join, dirname } from 'path';
import { Injectable } from '@nestjs/common';
import { unlink } from 'fs/promises';
import * as sharp from 'sharp';
import {
  checkAndCreatePath,
  randStr,
  PATH_ROOT_VIDEOS,
  FULL_PATH_ROOT_VIDEOS,
  PATH_ROOT_TEMP,
  relativePath,
} from 'src/utils';

export interface ProcessedFile {
  uploadedFile: {
    ext: string;
    base: string;
    name: string;
    link: string;
  };
  info: {
    fullName: string;
    fullPath: string;
  };
}

@Injectable()
export class UploadService {
  constructor() {}

  async processImageFile(file: Express.Multer.File): Promise<ProcessedFile> {
    const dir = dirname(file.path);
    const ext = '.webp';
    const newFileBase = Date.now().toString();
    const newFileName = `${newFileBase}${ext}`;
    const newFilePath = join(dir, newFileName);

    await sharp(file.path)
      .rotate()
      .resize({
        width: 350,
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
      })
      .toFile(newFilePath);

    await unlink(file.path).catch(() => undefined);

    return {
      uploadedFile: {
        base: newFileBase,
        ext: ext,
        name: newFileName,
        link: relativePath(newFilePath, PATH_ROOT_TEMP),
      },
      info: {
        fullName: newFileName,
        fullPath: newFilePath,
      },
    };
  }

  async processVideoFile(file: Express.Multer.File): Promise<ProcessedFile> {
    // prepare some info
    const danas = new Date().toISOString().slice(0, 10);
    const relativePath = join(`/${danas}`);
    const fullPath = join(FULL_PATH_ROOT_VIDEOS, relativePath);
    checkAndCreatePath(fullPath);

    // move video into new dir
    const parsedInfo = parse(file.filename);
    const newFileBase = `${randStr()}-${parsedInfo.name}`;
    const newFileName = `${newFileBase}${parsedInfo.ext}`;
    const newFilePath = join(fullPath, newFileName);
    copyFileSync(file.path, newFilePath);

    // create tmp dir
    const tmpPath = join(PATH_ROOT_VIDEOS, relativePath, newFileBase);
    checkAndCreatePath(tmpPath);

    // clear tmp files
    unlinkSync(file.path);

    return {
      uploadedFile: {
        base: newFileBase,
        ext: parsedInfo.ext,
        name: newFileName,
        link: join('/video', relativePath, newFileName),
      },
      info: {
        fullName: newFilePath,
        fullPath: join(fullPath, newFileBase),
      },
    };
  }
}
