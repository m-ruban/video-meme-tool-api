import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { fromFile } from 'file-type';
import { MIME_TYPES } from 'src/upload/upload.module';
import { unlink } from 'fs/promises';

export type UploadedFileWithType = Express.Multer.File & {
  detectedMime: string;
  detectedExt: string;
};

@Injectable()
export class FileTypePipe implements PipeTransform {
  async transform(file: Express.Multer.File): Promise<UploadedFileWithType> {
    if (!file?.path) {
      throw new BadRequestException('File missing');
    }

    const type = await fromFile(file.path);

    if (!type || !MIME_TYPES.includes(type.mime)) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Invalid file type');
    }

    return {
      ...file,
      detectedMime: type.mime,
      detectedExt: type.ext,
    };
  }
}
