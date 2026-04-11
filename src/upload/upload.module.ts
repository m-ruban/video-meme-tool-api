import { extname } from 'path';
import { Module, BadRequestException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Meme } from 'src/video/meme.entity';
import { UploadService } from 'src/upload/upload.service';
import { UploadController } from 'src/upload/upload.controller';
import { VideoService } from 'src/video/video.service';
import { FULL_PATH_TEMP_VIDEOS } from 'src/utils';

export const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];

@Module({
  imports: [
    TypeOrmModule.forFeature([Meme]),
    MulterModule.register({
      storage: diskStorage({
        destination: (_, __, callback) => {
          callback(null, FULL_PATH_TEMP_VIDEOS);
        },
        filename: (_, file, callback) => {
          const ext = extname(file.originalname);
          callback(null, `${Date.now()}${ext}`);
        },
      }),
      fileFilter: (_, file, callback) => {
        if (MIME_TYPES.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Only video or image are allowed'), false);
        }
      },
    }),
  ],
  providers: [VideoService, UploadService],
  exports: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
