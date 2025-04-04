import { extname } from 'path';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Meme } from 'src/video/meme.entity';
import { UploadService } from 'src/upload/upload.service';
import { UploadController } from 'src/upload/upload.controller';
import { VideoService } from 'src/video/video.service';
import { PATH_TEMP_VIDEOS } from 'src/utils';

const MIME_TYPES = ['video/mp4'];

@Module({
  imports: [
    TypeOrmModule.forFeature([Meme]),
    MulterModule.register({
      storage: diskStorage({
        destination: (_, __, callback) => {
          callback(null, PATH_TEMP_VIDEOS);
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
          callback(new Error('Only video are allowed...'), false);
        }
      },
    }),
  ],
  providers: [VideoService, UploadService],
  exports: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
