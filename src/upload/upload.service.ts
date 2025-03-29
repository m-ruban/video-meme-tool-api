import { copyFileSync, unlinkSync } from 'fs';
import { parse, join } from 'path';
import { Injectable } from '@nestjs/common';
import { checkAndCreatePath, randStr, PATH_ROOT, PATH_ROOT_VIDEOS } from 'src/utils';

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

  async processUserFile(file: Express.Multer.File): Promise<ProcessedFile> {
    // prepare some info
    const danas = new Date().toISOString().slice(0, 10);
    const relativePath = join(`/${danas}`);
    const fullPath = join(PATH_ROOT_VIDEOS, relativePath);
    checkAndCreatePath(fullPath);

    // move video into new dir
    const parsedInfo = parse(file.filename);
    const newFileBase = `${randStr()}-${parsedInfo.name}`;
    const newFileName = `${newFileBase}${parsedInfo.ext}`;
    const newFilePath = join(fullPath, newFileName);
    copyFileSync(file.path, newFilePath);

    // create tmp dir
    const tmpPath = join(PATH_ROOT, relativePath, newFileBase);
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
